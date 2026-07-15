import { Router } from "express";
import { z } from "zod";
import { and, desc, eq, gte, ilike, lte, or, sql } from "drizzle-orm";
import {
  db,
  usersTable,
  sessionsTable,
  adminRolesTable,
  userRoleAssignmentsTable,
  userLoginHistoryTable,
  listingModerationsTable,
  disputesTable,
  transactionsTable,
  feedbackTable,
  advertisementsTable,
  userSubscriptionsTable,
  auditLogsTable,
  notificationsTable,
  bookingsTable,
  supportCasesTable,
} from "@workspace/db";
import { clientIp, createNotification, getBearerToken, requireUser } from "../lib/auth";
import {
  ensureAdminSeed,
  hasPermission,
  loadAdminContext,
  logAdminAction,
  requireAdmin,
} from "../lib/admin-rbac";
import { verifyPassword, generateSecureToken } from "../lib/password";

const router = Router();

/** Simple in-memory rate limit for admin login */
const loginAttempts = new Map<string, { count: number; resetAt: number }>();
const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const LOGIN_MAX = 10;

function checkRateLimit(key: string): boolean {
  const now = Date.now();
  const entry = loginAttempts.get(key);
  if (!entry || entry.resetAt < now) {
    loginAttempts.set(key, { count: 1, resetAt: now + LOGIN_WINDOW_MS });
    return true;
  }
  if (entry.count >= LOGIN_MAX) return false;
  entry.count += 1;
  return true;
}

const loginBody = z.object({
  email: z.string().email().max(255),
  password: z.string().min(1).max(200),
});

router.post("/admin/login", async (req, res) => {
  const ip = clientIp(req);
  if (!checkRateLimit(`admin-login:${ip}`)) {
    return res.status(429).json({ error: "Too many login attempts. Try again later." });
  }

  const parsed = loginBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid input" });

  await ensureAdminSeed();

  const [user] = await db.select().from(usersTable).where(eq(usersTable.email, parsed.data.email)).limit(1);
  const ua = typeof req.headers["user-agent"] === "string" ? req.headers["user-agent"] : null;

  if (!user || !verifyPassword(parsed.data.password, user.passwordHash).ok) {
    if (user) {
      await db.insert(userLoginHistoryTable).values({
        userId: user.id,
        ipAddress: ip,
        userAgent: ua,
        success: false,
      });
    }
    return res.status(401).json({ error: "Invalid credentials" });
  }

  if (user.status === "SUSPENDED" || user.status === "DEACTIVATED") {
    return res.status(403).json({ error: "Account suspended" });
  }

  const admin = await loadAdminContext({
    id: user.id,
    name: user.name,
    email: user.email,
    preferredLanguage: user.preferredLanguage,
    primaryRole: user.primaryRole ?? null,
    createdAt: user.createdAt,
  });

  if (!admin) {
    return res.status(403).json({ error: "Admin access required" });
  }

  const token = generateSecureToken();
  const expiresAt = new Date(Date.now() + 8 * 60 * 60 * 1000); // 8h admin session
  await db.insert(sessionsTable).values({ userId: user.id, token, expiresAt });
  await db.insert(userLoginHistoryTable).values({
    userId: user.id,
    ipAddress: ip,
    userAgent: ua,
    success: true,
  });

  await logAdminAction(admin, "ADMIN_LOGIN", "AdminSession", user.id, {}, req);

  return res.status(200).json({
    token,
    expiresAt: expiresAt.toISOString(),
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      preferredLanguage: user.preferredLanguage,
      primaryRole: user.primaryRole,
      adminRoles: admin.adminRoles,
      permissions: admin.permissions,
      isSuperAdmin: admin.isSuperAdmin,
    },
  });
});

router.post("/admin/logout", async (req, res) => {
  const user = await requireUser(req, res);
  if (!user) return;
  const admin = await loadAdminContext(user);
  const token = getBearerToken(req);
  if (token) await db.delete(sessionsTable).where(eq(sessionsTable.token, token));
  if (admin) await logAdminAction(admin, "ADMIN_LOGOUT", "AdminSession", user.id, {}, req);
  return res.status(200).json({ message: "Logged out" });
});

router.get("/admin/me", async (req, res) => {
  const admin = await requireAdmin(req, res);
  if (!admin) return;
  return res.status(200).json({
    id: admin.id,
    name: admin.name,
    email: admin.email,
    preferredLanguage: admin.preferredLanguage,
    primaryRole: admin.primaryRole,
    adminRoles: admin.adminRoles,
    permissions: admin.permissions,
    isSuperAdmin: admin.isSuperAdmin,
  });
});

router.get("/admin/roles", async (req, res) => {
  const admin = await requireAdmin(req, res, "roles", "read");
  if (!admin) return;
  await ensureAdminSeed();
  const roles = await db.select().from(adminRolesTable).orderBy(adminRolesTable.id);
  return res.json({
    items: roles.map((r) => ({
      ...r,
      permissions: (() => {
        try {
          return JSON.parse(r.permissions || "[]");
        } catch {
          return [];
        }
      })(),
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
    })),
  });
});

const assignRoleBody = z.object({
  adminRoleId: z.number().int().positive().optional(),
  roleName: z.string().min(2).max(64).optional(),
});

router.post("/admin/users/:id/roles", async (req, res) => {
  const admin = await requireAdmin(req, res, "roles", "manage");
  if (!admin) return;
  if (!admin.isSuperAdmin) {
    return res.status(403).json({ error: "Only Super Admin can assign roles" });
  }

  const userId = parseInt(req.params.id, 10);
  if (Number.isNaN(userId)) return res.status(400).json({ error: "Invalid user id" });

  const parsed = assignRoleBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid input" });

  await ensureAdminSeed();
  let roleId = parsed.data.adminRoleId;
  if (!roleId && parsed.data.roleName) {
    const [role] = await db
      .select()
      .from(adminRolesTable)
      .where(eq(adminRolesTable.name, parsed.data.roleName))
      .limit(1);
    if (!role) return res.status(404).json({ error: "Role not found" });
    roleId = role.id;
  }
  if (!roleId) return res.status(400).json({ error: "adminRoleId or roleName required" });

  const [target] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
  if (!target) return res.status(404).json({ error: "User not found" });

  try {
    const [assignment] = await db
      .insert(userRoleAssignmentsTable)
      .values({ userId, adminRoleId: roleId, assignedBy: admin.id })
      .returning();

    await logAdminAction(admin, "ADMIN_ROLE_ASSIGNED", "User", userId, { adminRoleId: roleId }, req);
    await createNotification({
      userId,
      eventType: "ADMIN_ROLE_ASSIGNED",
      title: "Admin role assigned",
      description: "You have been granted an administration role on X!Y.",
      relatedType: "User",
      relatedId: userId,
      category: "ADMIN",
    });

    return res.status(201).json(assignment);
  } catch {
    return res.status(409).json({ error: "Role already assigned" });
  }
});

router.delete("/admin/users/:id/roles/:roleId", async (req, res) => {
  const admin = await requireAdmin(req, res, "roles", "manage");
  if (!admin) return;
  if (!admin.isSuperAdmin) {
    return res.status(403).json({ error: "Only Super Admin can remove roles" });
  }

  const userId = parseInt(req.params.id, 10);
  const roleId = parseInt(req.params.roleId, 10);
  if (Number.isNaN(userId) || Number.isNaN(roleId)) {
    return res.status(400).json({ error: "Invalid ids" });
  }

  if (userId === admin.id && admin.isSuperAdmin) {
    const remaining = await db
      .select()
      .from(userRoleAssignmentsTable)
      .where(eq(userRoleAssignmentsTable.userId, userId));
    if (remaining.length <= 1 && admin.primaryRole !== "PLATFORM_ADMIN") {
      return res.status(400).json({ error: "Cannot remove your last Super Admin role" });
    }
  }

  await db
    .delete(userRoleAssignmentsTable)
    .where(
      and(eq(userRoleAssignmentsTable.userId, userId), eq(userRoleAssignmentsTable.adminRoleId, roleId)),
    );

  await logAdminAction(admin, "ADMIN_ROLE_REMOVED", "User", userId, { adminRoleId: roleId }, req);
  return res.json({ message: "Role removed" });
});

router.get("/admin/dashboard", async (req, res) => {
  const admin = await requireAdmin(req, res, "dashboard", "read");
  if (!admin) return;

  const [
    [{ totalUsers }],
    [{ activeUsers }],
    [{ pendingListings }],
    [{ pendingReviews }],
    [{ openDisputes }],
    [{ txnCount }],
    [{ revenue }],
    [{ activeSubs }],
    [{ activeAds }],
    [{ unreadNotifs }],
    recentActivity,
    recentUsers,
  ] = await Promise.all([
    db.select({ totalUsers: sql<number>`count(*)::int` }).from(usersTable),
    db
      .select({ activeUsers: sql<number>`count(*)::int` })
      .from(usersTable)
      .where(eq(usersTable.status, "ACTIVE")),
    db
      .select({ pendingListings: sql<number>`count(*)::int` })
      .from(listingModerationsTable)
      .where(eq(listingModerationsTable.status, "PENDING")),
    db
      .select({ pendingReviews: sql<number>`count(*)::int` })
      .from(feedbackTable)
      .where(eq(feedbackTable.moderationStatus, "PENDING")),
    db
      .select({ openDisputes: sql<number>`count(*)::int` })
      .from(disputesTable)
      .where(or(eq(disputesTable.status, "OPEN"), eq(disputesTable.status, "UNDER_REVIEW"))!),
    db.select({ txnCount: sql<number>`count(*)::int` }).from(transactionsTable),
    db
      .select({
        revenue: sql<string>`coalesce(sum(case when status = 'PAID' then amount::numeric else 0 end), 0)::text`,
      })
      .from(transactionsTable),
    db
      .select({ activeSubs: sql<number>`count(*)::int` })
      .from(userSubscriptionsTable)
      .where(eq(userSubscriptionsTable.status, "ACTIVE")),
    db
      .select({ activeAds: sql<number>`count(*)::int` })
      .from(advertisementsTable)
      .where(or(eq(advertisementsTable.status, "RUNNING"), eq(advertisementsTable.status, "APPROVED"))!),
    db
      .select({ unreadNotifs: sql<number>`count(*)::int` })
      .from(notificationsTable)
      .where(eq(notificationsTable.status, "UNREAD")),
    db.select().from(auditLogsTable).orderBy(desc(auditLogsTable.createdAt)).limit(15),
    db.select().from(usersTable).orderBy(desc(usersTable.createdAt)).limit(8),
  ]);

  return res.json({
    widgets: {
      totalUsers,
      activeUsers,
      pendingListings,
      pendingReviews,
      openDisputes,
      transactions: txnCount,
      revenue,
      subscriptions: activeSubs,
      advertisements: activeAds,
      notifications: unreadNotifs,
    },
    recentActivity: recentActivity.map((a) => ({
      ...a,
      createdAt: a.createdAt.toISOString(),
    })),
    recentRegistrations: recentUsers.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      primaryRole: u.primaryRole,
      status: u.status,
      createdAt: u.createdAt.toISOString(),
    })),
    quickActions: [
      { label: "Approve Listings", href: "/admin/listings", permission: "listings:approve" },
      { label: "Review Users", href: "/admin/users", permission: "users:read" },
      { label: "Open Disputes", href: "/admin/disputes", permission: "disputes:read" },
      { label: "Pending Payments", href: "/admin/transactions?status=PENDING", permission: "transactions:read" },
    ].filter((a) => {
      const [m, act] = a.permission.split(":");
      return hasPermission(admin, m!, act!);
    }),
  });
});

router.get("/admin/search", async (req, res) => {
  const admin = await requireAdmin(req, res, "search", "read");
  if (!admin) return;

  const q = String(req.query.q || "").trim();
  if (q.length < 2) return res.status(400).json({ error: "Query must be at least 2 characters" });
  const like = `%${q}%`;
  const limit = 8;

  const [users, bookings, transactions, listings, disputes, support, reviews] = await Promise.all([
    db
      .select({ id: usersTable.id, name: usersTable.name, email: usersTable.email })
      .from(usersTable)
      .where(or(ilike(usersTable.name, like), ilike(usersTable.email, like))!)
      .limit(limit),
    db
      .select({ id: bookingsTable.id, reference: bookingsTable.reference, status: bookingsTable.status })
      .from(bookingsTable)
      .where(or(ilike(bookingsTable.reference, like), sql`${bookingsTable.id}::text = ${q}`)!)
      .limit(limit),
    db
      .select({
        id: transactionsTable.id,
        status: transactionsTable.status,
        referenceNumber: transactionsTable.referenceNumber,
      })
      .from(transactionsTable)
      .where(
        or(
          ilike(transactionsTable.referenceNumber, like),
          sql`${transactionsTable.id}::text = ${q}`,
        )!,
      )
      .limit(limit),
    db
      .select({
        id: listingModerationsTable.id,
        listingType: listingModerationsTable.listingType,
        listingId: listingModerationsTable.listingId,
        title: listingModerationsTable.title,
        status: listingModerationsTable.status,
      })
      .from(listingModerationsTable)
      .where(or(ilike(listingModerationsTable.title, like), sql`${listingModerationsTable.listingId}::text = ${q}`)!)
      .limit(limit),
    db
      .select({ id: disputesTable.id, status: disputesTable.status, category: disputesTable.category })
      .from(disputesTable)
      .where(or(ilike(disputesTable.description, like), sql`${disputesTable.id}::text = ${q}`)!)
      .limit(limit),
    db
      .select({ id: supportCasesTable.id, subject: supportCasesTable.subject, status: supportCasesTable.status })
      .from(supportCasesTable)
      .where(or(ilike(supportCasesTable.subject, like), ilike(supportCasesTable.description, like))!)
      .limit(limit),
    db
      .select({
        id: feedbackTable.id,
        comment: feedbackTable.comment,
        status: feedbackTable.moderationStatus,
      })
      .from(feedbackTable)
      .where(or(ilike(feedbackTable.comment, like), sql`${feedbackTable.id}::text = ${q}`)!)
      .limit(limit),
  ]);

  return res.json({
    q,
    results: {
      users,
      bookings,
      transactions,
      listings,
      disputes,
      supportCases: support,
      reviews,
    },
  });
});

export default router;

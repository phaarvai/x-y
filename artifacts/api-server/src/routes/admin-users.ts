import { Router } from "express";
import { z } from "zod";
import { and, desc, eq, gte, ilike, inArray, lte, or, sql } from "drizzle-orm";
import {
  db,
  usersTable,
  userRoleAssignmentsTable,
  adminRolesTable,
  userLoginHistoryTable,
  feedbackTable,
  userSubscriptionsTable,
  auditLogsTable,
  bookingsTable,
  vendorMaterialsTable,
  laborListingsTable,
  logisticsServicesTable,
  marketOpportunitiesTable,
  legalServiceProvidersTable,
  advertisementsTable,
  serviceProviderProfilesTable,
} from "@workspace/db";
import { createNotification, escapeHtml } from "../lib/auth";
import { logAdminAction, requireAdmin } from "../lib/admin-rbac";

const router = Router();

function publicUser(u: typeof usersTable.$inferSelect) {
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    preferredLanguage: u.preferredLanguage,
    primaryRole: u.primaryRole,
    status: u.status,
    identityVerificationStatus: u.identityVerificationStatus,
    industry: u.industry,
    location: u.location,
    suspendedAt: u.suspendedAt?.toISOString() ?? null,
    suspendedReason: u.suspendedReason,
    createdAt: u.createdAt.toISOString(),
    updatedAt: u.updatedAt.toISOString(),
  };
}

router.get("/admin/users", async (req, res) => {
  const admin = await requireAdmin(req, res, "users", "read");
  if (!admin) return;

  const page = Math.max(1, parseInt(String(req.query.page || "1"), 10) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(String(req.query.limit || "20"), 10) || 20));
  const sort = String(req.query.sort || "createdAt");
  const order = String(req.query.order || "desc") === "asc" ? "asc" : "desc";

  const name = req.query.name ? String(req.query.name) : undefined;
  const email = req.query.email ? String(req.query.email) : undefined;
  const role = req.query.role ? String(req.query.role) : undefined;
  const status = req.query.status ? String(req.query.status) : undefined;
  const industry = req.query.industry ? String(req.query.industry) : undefined;
  const location = req.query.location ? String(req.query.location) : undefined;
  const verification = req.query.verification ? String(req.query.verification) : undefined;
  const q = req.query.q ? String(req.query.q) : undefined;
  const from = req.query.from ? new Date(String(req.query.from)) : undefined;
  const to = req.query.to ? new Date(String(req.query.to)) : undefined;

  const conditions = [];
  if (name) conditions.push(ilike(usersTable.name, `%${name}%`));
  if (email) conditions.push(ilike(usersTable.email, `%${email}%`));
  if (role) conditions.push(eq(usersTable.primaryRole, role));
  if (status) conditions.push(eq(usersTable.status, status));
  if (industry) conditions.push(ilike(usersTable.industry, `%${industry}%`));
  if (location) conditions.push(ilike(usersTable.location, `%${location}%`));
  if (verification) conditions.push(eq(usersTable.identityVerificationStatus, verification));
  if (from && !Number.isNaN(from.getTime())) conditions.push(gte(usersTable.createdAt, from));
  if (to && !Number.isNaN(to.getTime())) conditions.push(lte(usersTable.createdAt, to));
  if (q) {
    conditions.push(
      or(ilike(usersTable.name, `%${q}%`), ilike(usersTable.email, `%${q}%`), sql`${usersTable.id}::text = ${q}`)!,
    );
  }

  const where = conditions.length ? and(...conditions) : undefined;
  const orderCol =
    sort === "name"
      ? usersTable.name
      : sort === "email"
        ? usersTable.email
        : sort === "status"
          ? usersTable.status
          : usersTable.createdAt;

  const rows = await db
    .select()
    .from(usersTable)
    .where(where)
    .orderBy(order === "asc" ? orderCol : desc(orderCol))
    .limit(limit)
    .offset((page - 1) * limit);

  const [{ count }] = await db.select({ count: sql<number>`count(*)::int` }).from(usersTable).where(where);

  return res.json({
    items: rows.map(publicUser),
    total: count,
    page,
    limit,
  });
});

router.get("/admin/users/:id", async (req, res) => {
  const admin = await requireAdmin(req, res, "users", "read");
  if (!admin) return;

  const id = parseInt(req.params.id, 10);
  if (Number.isNaN(id)) return res.status(400).json({ error: "Invalid id" });

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, id)).limit(1);
  if (!user) return res.status(404).json({ error: "User not found" });

  const roles = await db
    .select({
      assignmentId: userRoleAssignmentsTable.id,
      adminRoleId: adminRolesTable.id,
      name: adminRolesTable.name,
      assignedAt: userRoleAssignmentsTable.assignedAt,
      assignedBy: userRoleAssignmentsTable.assignedBy,
    })
    .from(userRoleAssignmentsTable)
    .innerJoin(adminRolesTable, eq(userRoleAssignmentsTable.adminRoleId, adminRolesTable.id))
    .where(eq(userRoleAssignmentsTable.userId, id));

  const [bookings, reviews, subscriptions, logins, legal, ads] = await Promise.all([
    db
      .select()
      .from(bookingsTable)
      .where(or(eq(bookingsTable.visionaryUserId, id), eq(bookingsTable.manufacturerUserId, id))!)
      .limit(50),
    db
      .select()
      .from(feedbackTable)
      .where(or(eq(feedbackTable.reviewerUserId, id), eq(feedbackTable.reviewedUserId, id))!)
      .limit(50),
    db.select().from(userSubscriptionsTable).where(eq(userSubscriptionsTable.userId, id)).limit(20),
    db
      .select()
      .from(userLoginHistoryTable)
      .where(eq(userLoginHistoryTable.userId, id))
      .orderBy(desc(userLoginHistoryTable.createdAt))
      .limit(30),
    db.select().from(legalServiceProvidersTable).where(eq(legalServiceProvidersTable.userId, id)).limit(20),
    db.select().from(advertisementsTable).where(eq(advertisementsTable.ownerUserId, id)).limit(20),
  ]);

  const providers = await db
    .select()
    .from(serviceProviderProfilesTable)
    .where(eq(serviceProviderProfilesTable.userId, id));
  const providerIds = providers.map((p) => p.id);

  let vendorListings: (typeof vendorMaterialsTable.$inferSelect)[] = [];
  let laborListings: (typeof laborListingsTable.$inferSelect)[] = [];
  let logisticsListings: (typeof logisticsServicesTable.$inferSelect)[] = [];
  let marketListings: (typeof marketOpportunitiesTable.$inferSelect)[] = [];

  if (providerIds.length > 0) {
    [vendorListings, laborListings, logisticsListings, marketListings] = await Promise.all([
      db.select().from(vendorMaterialsTable).where(inArray(vendorMaterialsTable.providerId, providerIds)),
      db.select().from(laborListingsTable).where(inArray(laborListingsTable.providerId, providerIds)),
      db.select().from(logisticsServicesTable).where(inArray(logisticsServicesTable.providerId, providerIds)),
      db
        .select()
        .from(marketOpportunitiesTable)
        .where(inArray(marketOpportunitiesTable.providerId, providerIds)),
    ]);
  }

  return res.json({
    user: publicUser(user),
    adminRoles: roles.map((r) => ({
      ...r,
      assignedAt: r.assignedAt.toISOString(),
    })),
    listings: {
      vendor: vendorListings,
      labor: laborListings,
      logistics: logisticsListings,
      market: marketListings,
      legal,
      advertisements: ads,
    },
    bookings: bookings.map((b) => ({
      ...b,
      createdAt: b.createdAt.toISOString(),
      updatedAt: b.updatedAt.toISOString(),
    })),
    reviews,
    subscriptions,
    loginHistory: logins.map((l) => ({
      ...l,
      createdAt: l.createdAt.toISOString(),
    })),
  });
});

const statusBody = z.object({
  status: z.enum(["ACTIVE", "SUSPENDED", "DEACTIVATED"]),
  reason: z.string().max(2000).optional(),
});

router.patch("/admin/users/:id/status", async (req, res) => {
  const admin = await requireAdmin(req, res, "users", "suspend");
  if (!admin) return;

  const id = parseInt(req.params.id, 10);
  if (Number.isNaN(id)) return res.status(400).json({ error: "Invalid id" });
  if (id === admin.id) return res.status(400).json({ error: "Cannot change your own status" });

  const parsed = statusBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid input" });

  const [existing] = await db.select().from(usersTable).where(eq(usersTable.id, id)).limit(1);
  if (!existing) return res.status(404).json({ error: "User not found" });

  const reason = parsed.data.reason ? escapeHtml(parsed.data.reason) : null;
  const [updated] = await db
    .update(usersTable)
    .set({
      status: parsed.data.status,
      suspendedAt: parsed.data.status === "SUSPENDED" ? new Date() : null,
      suspendedReason: parsed.data.status === "SUSPENDED" ? reason : null,
      updatedAt: new Date(),
    })
    .where(eq(usersTable.id, id))
    .returning();

  const action =
    parsed.data.status === "SUSPENDED"
      ? "USER_SUSPENDED"
      : parsed.data.status === "ACTIVE"
        ? "USER_ACTIVATED"
        : "USER_DEACTIVATED";

  await logAdminAction(admin, action, "User", id, { status: parsed.data.status, reason }, req);
  await createNotification({
    userId: id,
    eventType: action,
    title: parsed.data.status === "SUSPENDED" ? "Account suspended" : "Account activated",
    description:
      parsed.data.status === "SUSPENDED"
        ? reason || "Your account has been suspended by an administrator."
        : "Your account has been reactivated.",
    relatedType: "User",
    relatedId: id,
    category: "ADMIN",
  });

  return res.json(publicUser(updated));
});

const verificationBody = z.object({
  identityVerificationStatus: z.enum(["UNVERIFIED", "PENDING", "VERIFIED", "REJECTED"]).optional(),
  reset: z.boolean().optional(),
});

router.patch("/admin/users/:id/verification", async (req, res) => {
  const admin = await requireAdmin(req, res, "users", "write");
  if (!admin) return;

  const id = parseInt(req.params.id, 10);
  if (Number.isNaN(id)) return res.status(400).json({ error: "Invalid id" });

  const parsed = verificationBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid input" });

  const nextStatus = parsed.data.reset
    ? "UNVERIFIED"
    : parsed.data.identityVerificationStatus || "UNVERIFIED";

  const [updated] = await db
    .update(usersTable)
    .set({ identityVerificationStatus: nextStatus, updatedAt: new Date() })
    .where(eq(usersTable.id, id))
    .returning();
  if (!updated) return res.status(404).json({ error: "User not found" });

  await logAdminAction(admin, "VERIFICATION_RESET", "User", id, { status: nextStatus }, req);
  await createNotification({
    userId: id,
    eventType: "VERIFICATION_RESET",
    title: "Verification reset",
    description: `Your identity verification status is now ${nextStatus}.`,
    relatedType: "User",
    relatedId: id,
    category: "ADMIN",
  });

  return res.json(publicUser(updated));
});

router.get("/admin/users/:id/activity", async (req, res) => {
  const admin = await requireAdmin(req, res, "users", "read");
  if (!admin) return;

  const id = parseInt(req.params.id, 10);
  if (Number.isNaN(id)) return res.status(400).json({ error: "Invalid id" });

  const logs = await db
    .select()
    .from(auditLogsTable)
    .where(or(eq(auditLogsTable.actorUserId, id), and(eq(auditLogsTable.entityType, "User"), eq(auditLogsTable.entityId, id)))!)
    .orderBy(desc(auditLogsTable.createdAt))
    .limit(100);

  const logins = await db
    .select()
    .from(userLoginHistoryTable)
    .where(eq(userLoginHistoryTable.userId, id))
    .orderBy(desc(userLoginHistoryTable.createdAt))
    .limit(50);

  const timeline = [
    ...logs.map((l) => ({
      type: "audit" as const,
      action: l.action,
      entityType: l.entityType,
      entityId: l.entityId,
      createdAt: l.createdAt.toISOString(),
      metadata: l.metadata,
    })),
    ...logins.map((l) => ({
      type: "login" as const,
      action: l.success ? "LOGIN_SUCCESS" : "LOGIN_FAILED",
      entityType: "Session",
      entityId: null as number | null,
      createdAt: l.createdAt.toISOString(),
      metadata: JSON.stringify({ ip: l.ipAddress }),
    })),
  ].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));

  return res.json({ items: timeline });
});

export default router;

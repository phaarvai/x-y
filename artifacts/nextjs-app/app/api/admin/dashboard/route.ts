import { NextRequest, NextResponse } from "next/server";
import { eq, and, or, sql, desc, gte, lte, ilike } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  usersTable,
  listingModerationsTable,
  disputesTable,
  transactionsTable,
  feedbackTable,
  advertisementsTable,
  userSubscriptionsTable,
  notificationsTable,
  auditLogsTable,
  bookingsTable,
  supportCasesTable,
  adminRolesTable,
} from "@/lib/schema";
import { requireAdmin, isAdminContext, ensureAdminSeed, hasPermission, logAdminAction } from "@/lib/admin-rbac";
import { z } from "zod";
import { createNotification } from "@/lib/legal-auth";

export async function GET(req: NextRequest) {
  try {
    const { pathname } = new URL(req.url);
    // This file is dashboard — keep dedicated files for other routes
    const admin = await requireAdmin(req, "dashboard", "read");
    if (!isAdminContext(admin)) return admin;

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
      db.select({ activeUsers: sql<number>`count(*)::int` }).from(usersTable).where(eq(usersTable.status, "ACTIVE")),
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

    return NextResponse.json({
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
        {
          label: "Pending Payments",
          href: "/admin/transactions?status=PENDING",
          permission: "transactions:read",
        },
      ].filter((a) => {
        const [m, act] = a.permission.split(":");
        return hasPermission(admin, m!, act!);
      }),
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

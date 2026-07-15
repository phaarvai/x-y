import { NextRequest, NextResponse } from "next/server";
import { and, desc, eq, or } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import {
  usersTable,
  userRoleAssignmentsTable,
  adminRolesTable,
  userLoginHistoryTable,
  feedbackTable,
  userSubscriptionsTable,
  bookingsTable,
  advertisementsTable,
  legalServiceProvidersTable,
} from "@/lib/schema";
import { requireAdmin, isAdminContext, logAdminAction } from "@/lib/admin-rbac";
import { createNotification, escapeHtml } from "@/lib/legal-auth";

type Ctx = { params: Promise<{ id: string }> };

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

export async function GET(req: NextRequest, ctx: Ctx) {
  try {
    const admin = await requireAdmin(req, "users", "read");
    if (!isAdminContext(admin)) return admin;
    const id = parseInt((await ctx.params).id, 10);
    if (Number.isNaN(id)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, id)).limit(1);
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

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

    return NextResponse.json({
      user: publicUser(user),
      adminRoles: roles.map((r) => ({ ...r, assignedAt: r.assignedAt.toISOString() })),
      listings: { legal, advertisements: ads },
      bookings: bookings.map((b) => ({
        ...b,
        createdAt: b.createdAt.toISOString(),
        updatedAt: b.updatedAt.toISOString(),
      })),
      reviews,
      subscriptions,
      loginHistory: logins.map((l) => ({ ...l, createdAt: l.createdAt.toISOString() })),
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

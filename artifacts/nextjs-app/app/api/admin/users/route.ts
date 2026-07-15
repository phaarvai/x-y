import { NextRequest, NextResponse } from "next/server";
import { and, desc, eq, gte, ilike, lte, or, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { usersTable } from "@/lib/schema";
import { requireAdmin, isAdminContext } from "@/lib/admin-rbac";

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

export async function GET(req: NextRequest) {
  try {
    const admin = await requireAdmin(req, "users", "read");
    if (!isAdminContext(admin)) return admin;

    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") || "20", 10) || 20));
    const conditions = [];
    const name = searchParams.get("name");
    const email = searchParams.get("email");
    const role = searchParams.get("role");
    const status = searchParams.get("status");
    const industry = searchParams.get("industry");
    const location = searchParams.get("location");
    const verification = searchParams.get("verification");
    const q = searchParams.get("q");
    const from = searchParams.get("from");
    const to = searchParams.get("to");

    if (name) conditions.push(ilike(usersTable.name, `%${name}%`));
    if (email) conditions.push(ilike(usersTable.email, `%${email}%`));
    if (role) conditions.push(eq(usersTable.primaryRole, role));
    if (status) conditions.push(eq(usersTable.status, status));
    if (industry) conditions.push(ilike(usersTable.industry, `%${industry}%`));
    if (location) conditions.push(ilike(usersTable.location, `%${location}%`));
    if (verification) conditions.push(eq(usersTable.identityVerificationStatus, verification));
    if (from) {
      const d = new Date(from);
      if (!Number.isNaN(d.getTime())) conditions.push(gte(usersTable.createdAt, d));
    }
    if (to) {
      const d = new Date(to);
      if (!Number.isNaN(d.getTime())) conditions.push(lte(usersTable.createdAt, d));
    }
    if (q) {
      conditions.push(
        or(ilike(usersTable.name, `%${q}%`), ilike(usersTable.email, `%${q}%`), sql`${usersTable.id}::text = ${q}`)!,
      );
    }

    const where = conditions.length ? and(...conditions) : undefined;
    const rows = await db
      .select()
      .from(usersTable)
      .where(where)
      .orderBy(desc(usersTable.createdAt))
      .limit(limit)
      .offset((page - 1) * limit);
    const [{ count }] = await db.select({ count: sql<number>`count(*)::int` }).from(usersTable).where(where);

    return NextResponse.json({ items: rows.map(publicUser), total: count, page, limit });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { and, desc, eq, ilike, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { supportCasesTable } from "@/lib/schema";
import { requireAdmin, isAdminContext, logAdminAction } from "@/lib/admin-rbac";
import { escapeHtml } from "@/lib/legal-auth";

function serialize(c: typeof supportCasesTable.$inferSelect) {
  return {
    ...c,
    closedAt: c.closedAt?.toISOString() ?? null,
    createdAt: c.createdAt.toISOString(),
    updatedAt: c.updatedAt.toISOString(),
  };
}

export async function GET(req: NextRequest) {
  try {
    const admin = await requireAdmin(req, "support", "read");
    if (!isAdminContext(admin)) return admin;

    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") || "20", 10) || 20));
    const status = searchParams.get("status");

    const conditions = [];
    if (status) conditions.push(eq(supportCasesTable.status, status));
    const where = conditions.length ? and(...conditions) : undefined;

    const rows = await db
      .select()
      .from(supportCasesTable)
      .where(where)
      .orderBy(desc(supportCasesTable.createdAt))
      .limit(limit)
      .offset((page - 1) * limit);
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(supportCasesTable)
      .where(where);

    return NextResponse.json({ items: rows.map(serialize), total: count, page, limit });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

const createBody = z.object({
  userId: z.number().int(),
  subject: z.string().min(1).max(255),
  description: z.string().min(1).max(10000),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional(),
  bookingId: z.number().int().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const admin = await requireAdmin(req, "support", "write");
    if (!isAdminContext(admin)) return admin;

    const parsed = createBody.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

    const [created] = await db
      .insert(supportCasesTable)
      .values({
        userId: parsed.data.userId,
        subject: escapeHtml(parsed.data.subject),
        description: escapeHtml(parsed.data.description),
        priority: parsed.data.priority ?? "MEDIUM",
        bookingId: parsed.data.bookingId ?? null,
        status: "OPEN",
        assignedAdmin: admin.id,
      })
      .returning();

    await logAdminAction(admin, "SUPPORT_CASE_CREATED", "SupportCase", created.id, {}, req);
    return NextResponse.json(serialize(created), { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

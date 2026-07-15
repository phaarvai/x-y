import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { contractTemplatesTable, contractTemplateVersionsTable } from "@/lib/schema";
import { and, desc, eq, ilike, or, sql } from "drizzle-orm";
import { z } from "zod";
import { requireUser, isAuthUser, isAdmin, writeAuditLog, clientIp, escapeHtml, CONTRACT_CATEGORIES } from "@/lib/legal-auth";

const createBody = z.object({
  title: z.string().min(2).max(255),
  category: z.enum(CONTRACT_CATEGORIES as unknown as [string, ...string[]]),
  description: z.string().max(2000).optional().nullable(),
  templateContent: z.string().min(10),
  language: z.string().max(10).optional(),
  changeLog: z.string().max(1000).optional().nullable(),
});

function serialize(t: typeof contractTemplatesTable.$inferSelect) {
  return { ...t, createdAt: t.createdAt.toISOString(), updatedAt: t.updatedAt.toISOString() };
}

export async function GET(req: NextRequest) {
  try {
    const user = await requireUser(req);
    if (!isAuthUser(user)) return user;
    if (!isAdmin(user)) return NextResponse.json({ error: "Admin only" }, { status: 403 });

    const { searchParams } = new URL(req.url);
    const category = searchParams.get("category");
    const status = searchParams.get("status");
    const q = searchParams.get("q");
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") || "20", 10) || 20));
    const conditions = [];
    if (category) conditions.push(eq(contractTemplatesTable.category, category));
    if (status) conditions.push(eq(contractTemplatesTable.status, status));
    if (q) conditions.push(or(ilike(contractTemplatesTable.title, `%${q}%`), ilike(contractTemplatesTable.description, `%${q}%`)));
    const where = conditions.length ? and(...conditions) : undefined;
    const rows = await db.select().from(contractTemplatesTable).where(where).orderBy(desc(contractTemplatesTable.updatedAt)).limit(limit).offset((page - 1) * limit);
    const [{ count }] = await db.select({ count: sql<number>`count(*)::int` }).from(contractTemplatesTable).where(where);
    return NextResponse.json({ items: rows.map(serialize), total: count, page, limit });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser(req);
    if (!isAuthUser(user)) return user;
    if (!isAdmin(user)) return NextResponse.json({ error: "Admin only" }, { status: 403 });

    const parsed = createBody.safeParse(await req.json());
    if (!parsed.success) return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
    const d = parsed.data;

    const [template] = await db.insert(contractTemplatesTable).values({
      title: escapeHtml(d.title),
      category: d.category,
      description: d.description ? escapeHtml(d.description) : null,
      version: 1,
      templateContent: d.templateContent,
      language: d.language ?? "en",
      status: "ACTIVE",
      isActive: true,
      createdBy: user.id,
      updatedBy: user.id,
    }).returning();

    await db.insert(contractTemplateVersionsTable).values({
      templateId: template.id,
      version: 1,
      content: d.templateContent,
      changeLog: d.changeLog ? escapeHtml(d.changeLog) : "Initial version",
      createdBy: user.id,
    });

    await writeAuditLog({ actorUserId: user.id, action: "TEMPLATE_CREATED", entityType: "ContractTemplate", entityId: template.id, ipAddress: clientIp(req) });
    return NextResponse.json(serialize(template), { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

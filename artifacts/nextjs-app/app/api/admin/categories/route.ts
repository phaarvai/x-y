import { NextRequest, NextResponse } from "next/server";
import { and, asc, desc, eq, ilike, or, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { categoriesTable } from "@/lib/schema";
import { requireAdmin, isAdminContext, logAdminAction, slugify } from "@/lib/admin-rbac";
import { escapeHtml } from "@/lib/legal-auth";

function serialize(c: typeof categoriesTable.$inferSelect) {
  return {
    ...c,
    createdAt: c.createdAt.toISOString(),
    updatedAt: c.updatedAt.toISOString(),
  };
}

function buildTree(items: ReturnType<typeof serialize>[]) {
  const map = new Map<number, ReturnType<typeof serialize> & { children: ReturnType<typeof serialize>[] }>();
  const roots: (ReturnType<typeof serialize> & { children: ReturnType<typeof serialize>[] })[] = [];

  for (const item of items) {
    map.set(item.id, { ...item, children: [] });
  }
  for (const item of items) {
    const node = map.get(item.id)!;
    if (item.parentId && map.has(item.parentId)) {
      map.get(item.parentId)!.children.push(node);
    } else {
      roots.push(node);
    }
  }
  return roots;
}

export async function GET(req: NextRequest) {
  try {
    const admin = await requireAdmin(req, "categories", "read");
    if (!isAdminContext(admin)) return admin;

    const { searchParams } = new URL(req.url);
    const flat = searchParams.get("flat") === "1";
    const categoryType = searchParams.get("categoryType");

    const conditions = [];
    if (categoryType) conditions.push(eq(categoriesTable.categoryType, categoryType));
    const where = conditions.length ? and(...conditions) : undefined;

    const rows = await db
      .select()
      .from(categoriesTable)
      .where(where)
      .orderBy(asc(categoriesTable.sortOrder), asc(categoriesTable.name));

    const items = rows.map(serialize);
    return NextResponse.json(flat ? { items } : { items: buildTree(items) });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

const createBody = z.object({
  name: z.string().min(1).max(255),
  slug: z.string().max(255).optional(),
  parentId: z.number().int().nullable().optional(),
  categoryType: z.string().min(1).max(64),
  description: z.string().max(5000).nullable().optional(),
  icon: z.string().max(128).optional(),
  sortOrder: z.number().int().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const admin = await requireAdmin(req, "categories", "write");
    if (!isAdminContext(admin)) return admin;

    const parsed = createBody.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

    const slug = parsed.data.slug || slugify(parsed.data.name);
    const [created] = await db
      .insert(categoriesTable)
      .values({
        name: escapeHtml(parsed.data.name),
        slug,
        parentId: parsed.data.parentId ?? null,
        categoryType: parsed.data.categoryType,
        description: parsed.data.description ? escapeHtml(parsed.data.description) : null,
        icon: parsed.data.icon ?? null,
        sortOrder: parsed.data.sortOrder ?? 0,
        status: "ACTIVE",
      })
      .returning();

    await logAdminAction(admin, "CATEGORY_CREATED", "Category", created.id, { name: created.name }, req);
    return NextResponse.json(serialize(created), { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

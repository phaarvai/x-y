import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { categoriesTable } from "@/lib/schema";
import { requireAdmin, isAdminContext, logAdminAction, slugify } from "@/lib/admin-rbac";
import { escapeHtml } from "@/lib/legal-auth";

type Ctx = { params: Promise<{ id: string }> };

function serialize(c: typeof categoriesTable.$inferSelect) {
  return {
    ...c,
    createdAt: c.createdAt.toISOString(),
    updatedAt: c.updatedAt.toISOString(),
  };
}

const updateBody = z.object({
  name: z.string().min(1).max(255).optional(),
  slug: z.string().max(255).optional(),
  parentId: z.number().int().nullable().optional(),
  categoryType: z.string().min(1).max(64).optional(),
  description: z.string().max(5000).nullable().optional(),
  icon: z.string().max(128).optional(),
  sortOrder: z.number().int().optional(),
});

export async function PUT(req: NextRequest, ctx: Ctx) {
  try {
    const admin = await requireAdmin(req, "categories", "write");
    if (!isAdminContext(admin)) return admin;
    const id = parseInt((await ctx.params).id, 10);
    if (Number.isNaN(id)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

    const parsed = updateBody.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

    const patch: Partial<typeof categoriesTable.$inferInsert> = { updatedAt: new Date() };
    if (parsed.data.name) patch.name = escapeHtml(parsed.data.name);
    if (parsed.data.slug) patch.slug = parsed.data.slug;
    else if (parsed.data.name) patch.slug = slugify(parsed.data.name);
    if (parsed.data.parentId !== undefined) patch.parentId = parsed.data.parentId;
    if (parsed.data.categoryType) patch.categoryType = parsed.data.categoryType;
    if (parsed.data.description !== undefined) {
      patch.description = parsed.data.description ? escapeHtml(parsed.data.description) : null;
    }
    if (parsed.data.icon !== undefined) patch.icon = parsed.data.icon;
    if (parsed.data.sortOrder !== undefined) patch.sortOrder = parsed.data.sortOrder;

    const [updated] = await db.update(categoriesTable).set(patch).where(eq(categoriesTable.id, id)).returning();
    if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });

    await logAdminAction(admin, "CATEGORY_UPDATED", "Category", id, {}, req);
    return NextResponse.json(serialize(updated));
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, ctx: Ctx) {
  try {
    const admin = await requireAdmin(req, "categories", "manage");
    if (!isAdminContext(admin)) return admin;
    const id = parseInt((await ctx.params).id, 10);
    if (Number.isNaN(id)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

    const { searchParams } = new URL(req.url);
    const action = searchParams.get("action");
    const restore = action === "restore";

    const [updated] = await db
      .update(categoriesTable)
      .set({ status: restore ? "ACTIVE" : "ARCHIVED", updatedAt: new Date() })
      .where(eq(categoriesTable.id, id))
      .returning();
    if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });

    await logAdminAction(
      admin,
      restore ? "CATEGORY_RESTORED" : "CATEGORY_ARCHIVED",
      "Category",
      id,
      {},
      req,
    );
    return NextResponse.json(serialize(updated));
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

import { Router } from "express";
import { z } from "zod";
import { and, asc, eq, ilike, or, sql } from "drizzle-orm";
import { db, categoriesTable } from "@workspace/db";
import { escapeHtml } from "../lib/auth";
import { logAdminAction, requireAdmin, slugify } from "../lib/admin-rbac";

const router = Router();

export const CATEGORY_TYPES = [
  "INDUSTRY",
  "SUBCATEGORY",
  "MACHINERY_TYPE",
  "RAW_MATERIAL",
  "SERVICE_CATEGORY",
  "VENDOR_CATEGORY",
  "LABOR_SKILL",
  "LOGISTICS_SERVICE",
  "LEGAL_SERVICE",
  "MARKET_CATEGORY",
] as const;

function serialize(c: typeof categoriesTable.$inferSelect) {
  return {
    ...c,
    createdAt: c.createdAt.toISOString(),
    updatedAt: c.updatedAt.toISOString(),
  };
}

router.get("/admin/categories", async (req, res) => {
  const admin = await requireAdmin(req, res, "categories", "read");
  if (!admin) return;

  const categoryType = req.query.categoryType ? String(req.query.categoryType) : undefined;
  const status = req.query.status ? String(req.query.status) : undefined;
  const q = req.query.q ? String(req.query.q) : undefined;
  const flat = String(req.query.flat || "") === "1";

  const conditions = [];
  if (categoryType) conditions.push(eq(categoriesTable.categoryType, categoryType));
  if (status) conditions.push(eq(categoriesTable.status, status));
  if (q) {
    conditions.push(or(ilike(categoriesTable.name, `%${q}%`), ilike(categoriesTable.slug, `%${q}%`))!);
  }

  const where = conditions.length ? and(...conditions) : undefined;
  const rows = await db
    .select()
    .from(categoriesTable)
    .where(where)
    .orderBy(asc(categoriesTable.sortOrder), asc(categoriesTable.name));

  if (flat) {
    return res.json({ items: rows.map(serialize) });
  }

  type Node = ReturnType<typeof serialize> & { children: Node[] };
  const map = new Map<number, Node>();
  const roots: Node[] = [];
  for (const r of rows) {
    map.set(r.id, { ...serialize(r), children: [] });
  }
  for (const r of rows) {
    const node = map.get(r.id)!;
    if (r.parentId && map.has(r.parentId)) {
      map.get(r.parentId)!.children.push(node);
    } else {
      roots.push(node);
    }
  }

  return res.json({ tree: roots, items: rows.map(serialize) });
});

const createBody = z.object({
  name: z.string().min(1).max(255),
  slug: z.string().min(1).max(255).optional(),
  parentId: z.number().int().positive().nullable().optional(),
  categoryType: z.enum(CATEGORY_TYPES),
  description: z.string().max(5000).optional(),
  icon: z.string().max(128).optional(),
  sortOrder: z.number().int().min(0).max(99999).optional(),
  status: z.enum(["ACTIVE", "ARCHIVED"]).optional(),
});

router.post("/admin/categories", async (req, res) => {
  const admin = await requireAdmin(req, res, "categories", "write");
  if (!admin) return;

  const parsed = createBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid input" });

  if (parsed.data.parentId) {
    const [parent] = await db
      .select()
      .from(categoriesTable)
      .where(eq(categoriesTable.id, parsed.data.parentId))
      .limit(1);
    if (!parent) return res.status(400).json({ error: "Parent category not found" });
  }

  const slug = parsed.data.slug ? slugify(parsed.data.slug) : slugify(parsed.data.name);

  try {
    const [row] = await db
      .insert(categoriesTable)
      .values({
        name: escapeHtml(parsed.data.name),
        slug,
        parentId: parsed.data.parentId ?? null,
        categoryType: parsed.data.categoryType,
        description: parsed.data.description ? escapeHtml(parsed.data.description) : null,
        icon: parsed.data.icon ?? null,
        sortOrder: parsed.data.sortOrder ?? 0,
        status: parsed.data.status ?? "ACTIVE",
      })
      .returning();

    await logAdminAction(admin, "CATEGORY_CREATED", "Category", row.id, { slug }, req);
    return res.status(201).json(serialize(row));
  } catch {
    return res.status(409).json({ error: "Category slug already exists for this type" });
  }
});

router.put("/admin/categories/:id", async (req, res) => {
  const admin = await requireAdmin(req, res, "categories", "write");
  if (!admin) return;

  const id = parseInt(req.params.id, 10);
  if (Number.isNaN(id)) return res.status(400).json({ error: "Invalid id" });

  const parsed = createBody.partial().safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid input" });

  if (parsed.data.parentId === id) {
    return res.status(400).json({ error: "Category cannot be its own parent" });
  }

  const patch: Record<string, unknown> = { updatedAt: new Date() };
  if (parsed.data.name) patch.name = escapeHtml(parsed.data.name);
  if (parsed.data.slug) patch.slug = slugify(parsed.data.slug);
  if (parsed.data.parentId !== undefined) patch.parentId = parsed.data.parentId;
  if (parsed.data.categoryType) patch.categoryType = parsed.data.categoryType;
  if (parsed.data.description !== undefined) {
    patch.description = parsed.data.description ? escapeHtml(parsed.data.description) : null;
  }
  if (parsed.data.icon !== undefined) patch.icon = parsed.data.icon;
  if (parsed.data.sortOrder !== undefined) patch.sortOrder = parsed.data.sortOrder;
  if (parsed.data.status) patch.status = parsed.data.status;

  const [updated] = await db
    .update(categoriesTable)
    .set(patch)
    .where(eq(categoriesTable.id, id))
    .returning();
  if (!updated) return res.status(404).json({ error: "Not found" });

  await logAdminAction(admin, "CATEGORY_UPDATED", "Category", id, patch, req);
  return res.json(serialize(updated));
});

router.patch("/admin/categories/:id/archive", async (req, res) => {
  const admin = await requireAdmin(req, res, "categories", "manage");
  if (!admin) return;
  const id = parseInt(req.params.id, 10);
  if (Number.isNaN(id)) return res.status(400).json({ error: "Invalid id" });

  const [updated] = await db
    .update(categoriesTable)
    .set({ status: "ARCHIVED", updatedAt: new Date() })
    .where(eq(categoriesTable.id, id))
    .returning();
  if (!updated) return res.status(404).json({ error: "Not found" });

  await logAdminAction(admin, "CATEGORY_ARCHIVED", "Category", id, {}, req);
  return res.json(serialize(updated));
});

router.patch("/admin/categories/:id/restore", async (req, res) => {
  const admin = await requireAdmin(req, res, "categories", "manage");
  if (!admin) return;
  const id = parseInt(req.params.id, 10);
  if (Number.isNaN(id)) return res.status(400).json({ error: "Invalid id" });

  const [updated] = await db
    .update(categoriesTable)
    .set({ status: "ACTIVE", updatedAt: new Date() })
    .where(eq(categoriesTable.id, id))
    .returning();
  if (!updated) return res.status(404).json({ error: "Not found" });

  await logAdminAction(admin, "CATEGORY_RESTORED", "Category", id, {}, req);
  return res.json(serialize(updated));
});

router.delete("/admin/categories/:id", async (req, res) => {
  const admin = await requireAdmin(req, res, "categories", "manage");
  if (!admin) return;
  const id = parseInt(req.params.id, 10);
  if (Number.isNaN(id)) return res.status(400).json({ error: "Invalid id" });

  const [{ children }] = await db
    .select({ children: sql<number>`count(*)::int` })
    .from(categoriesTable)
    .where(eq(categoriesTable.parentId, id));

  if (children > 0) {
    return res.status(400).json({ error: "Archive or reassign child categories first" });
  }

  // Soft-delete preferred: archive instead of hard delete to preserve history
  const [updated] = await db
    .update(categoriesTable)
    .set({ status: "ARCHIVED", updatedAt: new Date() })
    .where(eq(categoriesTable.id, id))
    .returning();
  if (!updated) return res.status(404).json({ error: "Not found" });

  await logAdminAction(admin, "CATEGORY_DELETED", "Category", id, { soft: true }, req);
  return res.json({ message: "Category archived", category: serialize(updated) });
});

/** Public active categories for user forms */
router.get("/categories", async (req, res) => {
  const categoryType = req.query.categoryType ? String(req.query.categoryType) : undefined;
  const conditions = [eq(categoriesTable.status, "ACTIVE")];
  if (categoryType) conditions.push(eq(categoriesTable.categoryType, categoryType));

  const rows = await db
    .select()
    .from(categoriesTable)
    .where(and(...conditions))
    .orderBy(asc(categoriesTable.sortOrder), asc(categoriesTable.name));

  return res.json({ items: rows.map(serialize) });
});

export default router;

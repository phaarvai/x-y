import { Router } from "express";
import {
  db,
  contractTemplatesTable,
  contractTemplateVersionsTable,
} from "@workspace/db";
import { and, desc, eq, ilike, or, sql } from "drizzle-orm";
import {
  requireUser,
  isAdmin,
  writeAuditLog,
  clientIp,
  escapeHtml,
  CONTRACT_CATEGORIES,
} from "../lib/auth";
import { createTemplateBody, updateTemplateBody } from "../lib/legal-schemas";

const router = Router();

function serializeTemplate(t: typeof contractTemplatesTable.$inferSelect) {
  return {
    id: t.id,
    title: t.title,
    category: t.category,
    description: t.description,
    version: t.version,
    templateContent: t.templateContent,
    language: t.language,
    status: t.status,
    isActive: t.isActive,
    createdBy: t.createdBy,
    updatedBy: t.updatedBy,
    createdAt: t.createdAt.toISOString(),
    updatedAt: t.updatedAt.toISOString(),
  };
}

router.get("/admin/contracts/categories", async (_req, res) => {
  return res.status(200).json({ categories: CONTRACT_CATEGORIES });
});

router.post("/admin/contracts/templates", async (req, res) => {
  const user = await requireUser(req, res);
  if (!user) return;
  if (!isAdmin(user)) return res.status(403).json({ error: "Admin only" });

  const parsed = createTemplateBody.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid input", details: parsed.error.flatten() });
  }

  const data = parsed.data;
  const [template] = await db
    .insert(contractTemplatesTable)
    .values({
      title: escapeHtml(data.title),
      category: data.category,
      description: data.description ? escapeHtml(data.description) : null,
      version: 1,
      templateContent: data.templateContent,
      language: data.language ?? "en",
      status: "ACTIVE",
      isActive: true,
      createdBy: user.id,
      updatedBy: user.id,
    })
    .returning();

  await db.insert(contractTemplateVersionsTable).values({
    templateId: template.id,
    version: 1,
    content: data.templateContent,
    changeLog: data.changeLog ? escapeHtml(data.changeLog) : "Initial version",
    createdBy: user.id,
  });

  await writeAuditLog({
    actorUserId: user.id,
    action: "TEMPLATE_CREATED",
    entityType: "ContractTemplate",
    entityId: template.id,
    ipAddress: clientIp(req),
  });

  return res.status(201).json(serializeTemplate(template));
});

router.get("/admin/contracts/templates", async (req, res) => {
  const user = await requireUser(req, res);
  if (!user) return;
  if (!isAdmin(user)) return res.status(403).json({ error: "Admin only" });

  const { category, status, q, page = "1", limit = "20" } = req.query as Record<
    string,
    string | undefined
  >;
  const pageNum = Math.max(1, parseInt(page || "1", 10) || 1);
  const limitNum = Math.min(50, Math.max(1, parseInt(limit || "20", 10) || 20));
  const offset = (pageNum - 1) * limitNum;

  const conditions = [];
  if (category) conditions.push(eq(contractTemplatesTable.category, category));
  if (status) conditions.push(eq(contractTemplatesTable.status, status));
  if (q) {
    conditions.push(
      or(
        ilike(contractTemplatesTable.title, `%${q}%`),
        ilike(contractTemplatesTable.description, `%${q}%`),
      ),
    );
  }
  const where = conditions.length ? and(...conditions) : undefined;

  const rows = await db
    .select()
    .from(contractTemplatesTable)
    .where(where)
    .orderBy(desc(contractTemplatesTable.updatedAt))
    .limit(limitNum)
    .offset(offset);

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(contractTemplatesTable)
    .where(where);

  return res.status(200).json({
    items: rows.map(serializeTemplate),
    total: count,
    page: pageNum,
    limit: limitNum,
  });
});

router.get("/admin/contracts/templates/:id", async (req, res) => {
  const user = await requireUser(req, res);
  if (!user) return;
  if (!isAdmin(user)) return res.status(403).json({ error: "Admin only" });

  const id = parseInt(req.params.id, 10);
  if (Number.isNaN(id)) return res.status(400).json({ error: "Invalid id" });

  const [template] = await db
    .select()
    .from(contractTemplatesTable)
    .where(eq(contractTemplatesTable.id, id))
    .limit(1);
  if (!template) return res.status(404).json({ error: "Template not found" });

  const versions = await db
    .select()
    .from(contractTemplateVersionsTable)
    .where(eq(contractTemplateVersionsTable.templateId, id))
    .orderBy(desc(contractTemplateVersionsTable.version));

  return res.status(200).json({
    ...serializeTemplate(template),
    versions: versions.map((v) => ({
      id: v.id,
      templateId: v.templateId,
      version: v.version,
      content: v.content,
      changeLog: v.changeLog,
      createdBy: v.createdBy,
      createdAt: v.createdAt.toISOString(),
    })),
  });
});

router.put("/admin/contracts/templates/:id", async (req, res) => {
  const user = await requireUser(req, res);
  if (!user) return;
  if (!isAdmin(user)) return res.status(403).json({ error: "Admin only" });

  const id = parseInt(req.params.id, 10);
  if (Number.isNaN(id)) return res.status(400).json({ error: "Invalid id" });

  const parsed = updateTemplateBody.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid input", details: parsed.error.flatten() });
  }

  const [existing] = await db
    .select()
    .from(contractTemplatesTable)
    .where(eq(contractTemplatesTable.id, id))
    .limit(1);
  if (!existing) return res.status(404).json({ error: "Template not found" });
  if (existing.status === "ARCHIVED") {
    return res.status(409).json({ error: "Archived templates cannot be edited; restore or duplicate" });
  }

  const data = parsed.data;
  const contentChanged =
    data.templateContent != null && data.templateContent !== existing.templateContent;
  const nextVersion = contentChanged ? existing.version + 1 : existing.version;

  const [updated] = await db
    .update(contractTemplatesTable)
    .set({
      ...(data.title != null ? { title: escapeHtml(data.title) } : {}),
      ...(data.category != null ? { category: data.category } : {}),
      ...(data.description !== undefined
        ? { description: data.description ? escapeHtml(data.description) : null }
        : {}),
      ...(data.templateContent != null ? { templateContent: data.templateContent } : {}),
      ...(data.language != null ? { language: data.language } : {}),
      ...(data.isActive != null ? { isActive: data.isActive } : {}),
      version: nextVersion,
      updatedBy: user.id,
      updatedAt: new Date(),
    })
    .where(eq(contractTemplatesTable.id, id))
    .returning();

  if (contentChanged) {
    await db.insert(contractTemplateVersionsTable).values({
      templateId: id,
      version: nextVersion,
      content: data.templateContent!,
      changeLog: data.changeLog ? escapeHtml(data.changeLog) : `Version ${nextVersion}`,
      createdBy: user.id,
    });
    await writeAuditLog({
      actorUserId: user.id,
      action: "TEMPLATE_VERSION_CREATED",
      entityType: "ContractTemplate",
      entityId: id,
      metadata: { version: nextVersion },
      ipAddress: clientIp(req),
    });
  }

  await writeAuditLog({
    actorUserId: user.id,
    action: "TEMPLATE_UPDATED",
    entityType: "ContractTemplate",
    entityId: id,
    ipAddress: clientIp(req),
  });

  return res.status(200).json(serializeTemplate(updated));
});

router.post("/admin/contracts/templates/:id/duplicate", async (req, res) => {
  const user = await requireUser(req, res);
  if (!user) return;
  if (!isAdmin(user)) return res.status(403).json({ error: "Admin only" });

  const id = parseInt(req.params.id, 10);
  if (Number.isNaN(id)) return res.status(400).json({ error: "Invalid id" });

  const [existing] = await db
    .select()
    .from(contractTemplatesTable)
    .where(eq(contractTemplatesTable.id, id))
    .limit(1);
  if (!existing) return res.status(404).json({ error: "Template not found" });

  const [clone] = await db
    .insert(contractTemplatesTable)
    .values({
      title: `${existing.title} (Copy)`,
      category: existing.category,
      description: existing.description,
      version: 1,
      templateContent: existing.templateContent,
      language: existing.language,
      status: "ACTIVE",
      isActive: true,
      createdBy: user.id,
      updatedBy: user.id,
    })
    .returning();

  await db.insert(contractTemplateVersionsTable).values({
    templateId: clone.id,
    version: 1,
    content: existing.templateContent,
    changeLog: `Duplicated from template #${existing.id}`,
    createdBy: user.id,
  });

  await writeAuditLog({
    actorUserId: user.id,
    action: "TEMPLATE_CREATED",
    entityType: "ContractTemplate",
    entityId: clone.id,
    metadata: { duplicatedFrom: existing.id },
    ipAddress: clientIp(req),
  });

  return res.status(201).json(serializeTemplate(clone));
});

router.patch("/admin/contracts/templates/:id/archive", async (req, res) => {
  const user = await requireUser(req, res);
  if (!user) return;
  if (!isAdmin(user)) return res.status(403).json({ error: "Admin only" });

  const id = parseInt(req.params.id, 10);
  if (Number.isNaN(id)) return res.status(400).json({ error: "Invalid id" });

  const [updated] = await db
    .update(contractTemplatesTable)
    .set({
      status: "ARCHIVED",
      isActive: false,
      updatedBy: user.id,
      updatedAt: new Date(),
    })
    .where(eq(contractTemplatesTable.id, id))
    .returning();

  if (!updated) return res.status(404).json({ error: "Template not found" });

  await writeAuditLog({
    actorUserId: user.id,
    action: "TEMPLATE_ARCHIVED",
    entityType: "ContractTemplate",
    entityId: id,
    ipAddress: clientIp(req),
  });

  return res.status(200).json(serializeTemplate(updated));
});

router.post("/admin/contracts/templates/:id/restore/:version", async (req, res) => {
  const user = await requireUser(req, res);
  if (!user) return;
  if (!isAdmin(user)) return res.status(403).json({ error: "Admin only" });

  const id = parseInt(req.params.id, 10);
  const version = parseInt(req.params.version, 10);
  if (Number.isNaN(id) || Number.isNaN(version)) {
    return res.status(400).json({ error: "Invalid id or version" });
  }

  const [existing] = await db
    .select()
    .from(contractTemplatesTable)
    .where(eq(contractTemplatesTable.id, id))
    .limit(1);
  if (!existing) return res.status(404).json({ error: "Template not found" });

  const [ver] = await db
    .select()
    .from(contractTemplateVersionsTable)
    .where(
      and(
        eq(contractTemplateVersionsTable.templateId, id),
        eq(contractTemplateVersionsTable.version, version),
      ),
    )
    .limit(1);
  if (!ver) return res.status(404).json({ error: "Version not found" });

  const nextVersion = existing.version + 1;
  const [updated] = await db
    .update(contractTemplatesTable)
    .set({
      templateContent: ver.content,
      version: nextVersion,
      status: "ACTIVE",
      isActive: true,
      updatedBy: user.id,
      updatedAt: new Date(),
    })
    .where(eq(contractTemplatesTable.id, id))
    .returning();

  await db.insert(contractTemplateVersionsTable).values({
    templateId: id,
    version: nextVersion,
    content: ver.content,
    changeLog: `Restored from version ${version}`,
    createdBy: user.id,
  });

  await writeAuditLog({
    actorUserId: user.id,
    action: "TEMPLATE_VERSION_CREATED",
    entityType: "ContractTemplate",
    entityId: id,
    metadata: { restoredFrom: version, version: nextVersion },
    ipAddress: clientIp(req),
  });

  return res.status(200).json(serializeTemplate(updated));
});

router.delete("/admin/contracts/templates/:id", async (req, res) => {
  const user = await requireUser(req, res);
  if (!user) return;
  if (!isAdmin(user)) return res.status(403).json({ error: "Admin only" });

  const id = parseInt(req.params.id, 10);
  if (Number.isNaN(id)) return res.status(400).json({ error: "Invalid id" });

  // Soft-delete via archive to preserve immutable history
  const [updated] = await db
    .update(contractTemplatesTable)
    .set({
      status: "DELETED",
      isActive: false,
      updatedBy: user.id,
      updatedAt: new Date(),
    })
    .where(eq(contractTemplatesTable.id, id))
    .returning();

  if (!updated) return res.status(404).json({ error: "Template not found" });

  await writeAuditLog({
    actorUserId: user.id,
    action: "TEMPLATE_DELETED",
    entityType: "ContractTemplate",
    entityId: id,
    ipAddress: clientIp(req),
  });

  return res.status(200).json({ message: "Template deleted (soft)", template: serializeTemplate(updated) });
});

/** Public list of active templates for attaching to bookings */
router.get("/contracts/templates", async (req, res) => {
  const user = await requireUser(req, res);
  if (!user) return;

  const rows = await db
    .select()
    .from(contractTemplatesTable)
    .where(and(eq(contractTemplatesTable.isActive, true), eq(contractTemplatesTable.status, "ACTIVE")))
    .orderBy(desc(contractTemplatesTable.updatedAt));

  return res.status(200).json({
    items: rows.map((t) => ({
      id: t.id,
      title: t.title,
      category: t.category,
      description: t.description,
      version: t.version,
      language: t.language,
    })),
  });
});

export default router;

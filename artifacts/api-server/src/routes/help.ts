import { Router } from "express";
import { z } from "zod";
import crypto from "crypto";
import { and, desc, eq, ilike, or, sql } from "drizzle-orm";
import {
  db,
  helpContentTable,
  listingTemplatesTable,
  helpArticlesTable,
  helpFaqsTable,
  onboardingProgressTable,
  chatbotSessionsTable,
  chatbotMessagesTable,
  supportCasesTable,
} from "@workspace/db";
import { requireUser, escapeHtml, createNotification, clientIp, writeAuditLog } from "../lib/auth";
import { requireAdmin, logAdminAction } from "../lib/admin-rbac";
import { ChatbotService } from "../lib/chatbot-service";
import {
  DEFAULT_HELP_CONTENT,
  DEFAULT_TEMPLATES,
  ONBOARDING_BY_ROLE,
  slugify,
} from "../lib/help-defaults";

const router = Router();

let seeded = false;
async function ensureSeed() {
  if (seeded) return;
  try {
    const [h] = await db.select().from(helpContentTable).limit(1);
    if (!h) {
      for (const row of DEFAULT_HELP_CONTENT) {
        await db.insert(helpContentTable).values({
          page: row.page,
          fieldKey: row.fieldKey,
          title: row.title,
          helpText: row.helpText,
          tooltipText: row.tooltipText,
          example: row.example ?? null,
          language: "en",
          status: "ACTIVE",
        });
      }
    }
    const [t] = await db.select().from(listingTemplatesTable).limit(1);
    if (!t) {
      for (const tpl of DEFAULT_TEMPLATES) {
        await db.insert(listingTemplatesTable).values({
          name: tpl.name,
          industry: tpl.industry,
          category: tpl.category,
          description: tpl.description,
          templateData: JSON.stringify(tpl.templateData),
          status: "ACTIVE",
        });
      }
    }
    seeded = true;
  } catch {
    /* */
  }
}

const chatbotRate = new Map<string, { count: number; resetAt: number }>();
function rateOk(key: string, max = 30) {
  const now = Date.now();
  const e = chatbotRate.get(key);
  if (!e || e.resetAt < now) {
    chatbotRate.set(key, { count: 1, resetAt: now + 60_000 });
    return true;
  }
  if (e.count >= max) return false;
  e.count += 1;
  return true;
}

function serializeHelp(r: typeof helpContentTable.$inferSelect) {
  return {
    ...r,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  };
}

router.get("/help-content", async (req, res) => {
  await ensureSeed();
  const page = req.query.page ? String(req.query.page) : undefined;
  const lang = String(req.query.language || "en");
  const conditions = [eq(helpContentTable.status, "ACTIVE"), eq(helpContentTable.language, lang)];
  if (page) conditions.push(eq(helpContentTable.page, page));
  const rows = await db
    .select()
    .from(helpContentTable)
    .where(and(...conditions));
  return res.json({ items: rows.map(serializeHelp) });
});

router.get("/help-content/:page", async (req, res) => {
  await ensureSeed();
  const page = String(req.params.page);
  const lang = String(req.query.language || "en");
  const rows = await db
    .select()
    .from(helpContentTable)
    .where(
      and(
        eq(helpContentTable.page, page),
        eq(helpContentTable.language, lang),
        eq(helpContentTable.status, "ACTIVE"),
      ),
    );
  const byField: Record<string, ReturnType<typeof serializeHelp>> = {};
  for (const r of rows) byField[r.fieldKey] = serializeHelp(r);
  return res.json({ page, fields: byField, items: rows.map(serializeHelp) });
});

router.get("/templates", async (req, res) => {
  await ensureSeed();
  const industry = req.query.industry ? String(req.query.industry) : undefined;
  const category = req.query.category ? String(req.query.category) : undefined;
  const conditions = [eq(listingTemplatesTable.status, "ACTIVE")];
  if (industry) conditions.push(eq(listingTemplatesTable.industry, industry));
  if (category) conditions.push(eq(listingTemplatesTable.category, category));
  const rows = await db
    .select()
    .from(listingTemplatesTable)
    .where(and(...conditions))
    .orderBy(desc(listingTemplatesTable.updatedAt));
  return res.json({
    items: rows.map((r) => ({
      ...r,
      templateData: JSON.parse(r.templateData || "{}"),
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
    })),
  });
});

router.get("/templates/:id", async (req, res) => {
  await ensureSeed();
  const id = parseInt(String(req.params.id), 10);
  if (Number.isNaN(id)) return res.status(400).json({ error: "Invalid id" });
  const [row] = await db.select().from(listingTemplatesTable).where(eq(listingTemplatesTable.id, id)).limit(1);
  if (!row || row.status !== "ACTIVE") return res.status(404).json({ error: "Not found" });
  return res.json({
    ...row,
    templateData: JSON.parse(row.templateData || "{}"),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  });
});

router.get("/help/articles", async (req, res) => {
  await ensureSeed();
  const role = req.query.role ? String(req.query.role) : undefined;
  const category = req.query.category ? String(req.query.category) : undefined;
  const page = Math.max(1, parseInt(String(req.query.page || "1"), 10) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(String(req.query.limit || "20"), 10) || 20));
  const conditions = [eq(helpArticlesTable.status, "PUBLISHED")];
  if (role) conditions.push(or(eq(helpArticlesTable.role, role), eq(helpArticlesTable.role, "GENERAL"))!);
  if (category) conditions.push(eq(helpArticlesTable.category, category));
  const where = and(...conditions);
  const rows = await db
    .select()
    .from(helpArticlesTable)
    .where(where)
    .orderBy(desc(helpArticlesTable.publishedAt))
    .limit(limit)
    .offset((page - 1) * limit);
  const [{ count }] = await db.select({ count: sql<number>`count(*)::int` }).from(helpArticlesTable).where(where);
  return res.json({
    items: rows.map((r) => ({
      id: r.id,
      title: r.title,
      slug: r.slug,
      role: r.role,
      category: r.category,
      summary: r.summary,
      tags: r.tags ? JSON.parse(r.tags) : [],
      publishedAt: r.publishedAt?.toISOString() ?? null,
      viewCount: r.viewCount,
    })),
    total: count,
    page,
    limit,
  });
});

router.get("/help/articles/:slug", async (req, res) => {
  await ensureSeed();
  const slug = String(req.params.slug);
  const [row] = await db.select().from(helpArticlesTable).where(eq(helpArticlesTable.slug, slug)).limit(1);
  if (!row || row.status !== "PUBLISHED") return res.status(404).json({ error: "Not found" });
  await db
    .update(helpArticlesTable)
    .set({ viewCount: (row.viewCount || 0) + 1 })
    .where(eq(helpArticlesTable.id, row.id));

  const related = await db
    .select()
    .from(helpArticlesTable)
    .where(
      and(
        eq(helpArticlesTable.status, "PUBLISHED"),
        eq(helpArticlesTable.category, row.category),
        sql`${helpArticlesTable.id} <> ${row.id}`,
      ),
    )
    .limit(5);

  return res.json({
    ...row,
    tags: row.tags ? JSON.parse(row.tags) : [],
    publishedAt: row.publishedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    related: related.map((r) => ({ title: r.title, slug: r.slug, summary: r.summary })),
  });
});

router.get("/help/search", async (req, res) => {
  await ensureSeed();
  const q = String(req.query.q || "").trim();
  if (q.length < 2) return res.status(400).json({ error: "Query too short" });
  const like = `%${q}%`;
  const [articles, templates, faqs] = await Promise.all([
    db
      .select()
      .from(helpArticlesTable)
      .where(
        and(
          eq(helpArticlesTable.status, "PUBLISHED"),
          or(ilike(helpArticlesTable.title, like), ilike(helpArticlesTable.summary, like), ilike(helpArticlesTable.content, like))!,
        ),
      )
      .limit(15),
    db
      .select()
      .from(listingTemplatesTable)
      .where(
        and(
          eq(listingTemplatesTable.status, "ACTIVE"),
          or(ilike(listingTemplatesTable.name, like), ilike(listingTemplatesTable.description, like))!,
        ),
      )
      .limit(10),
    db
      .select()
      .from(helpFaqsTable)
      .where(
        and(
          eq(helpFaqsTable.status, "ACTIVE"),
          or(ilike(helpFaqsTable.question, like), ilike(helpFaqsTable.answer, like))!,
        ),
      )
      .limit(10),
  ]);
  return res.json({
    q,
    articles: articles.map((a) => ({ title: a.title, slug: a.slug, summary: a.summary, category: a.category })),
    templates: templates.map((t) => ({ id: t.id, name: t.name, category: t.category, description: t.description })),
    faqs: faqs.map((f) => ({ id: f.id, question: f.question, answer: f.answer })),
    chatbotSuggestions: ChatbotService.getSuggestions(),
  });
});

router.get("/help/faqs", async (_req, res) => {
  await ensureSeed();
  const rows = await db
    .select()
    .from(helpFaqsTable)
    .where(eq(helpFaqsTable.status, "ACTIVE"))
    .orderBy(helpFaqsTable.sortOrder);
  return res.json({ items: rows });
});

router.get("/chatbot/suggestions", async (req, res) => {
  const role = req.query.role ? String(req.query.role) : null;
  return res.json({ suggestions: ChatbotService.getSuggestions(role) });
});

router.post("/chatbot/message", async (req, res) => {
  const ip = clientIp(req);
  if (!rateOk(`chatbot:${ip}`)) {
    return res.status(429).json({ error: "Too many chatbot requests. Please wait a moment." });
  }

  const parsed = z
    .object({
      message: z.string().min(1).max(2000),
      sessionKey: z.string().max(128).optional(),
      roleHint: z.string().max(64).optional(),
      escalate: z.boolean().optional(),
      escalateSubject: z.string().max(255).optional(),
      escalateDescription: z.string().max(5000).optional(),
    })
    .safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid input" });

  let userId: number | null = null;
  const auth = req.headers.authorization;
  if (auth?.startsWith("Bearer ")) {
    const user = await requireUser(req, res);
    if (!user) return;
    userId = user.id;
  }

  const sessionKey = parsed.data.sessionKey || crypto.randomBytes(16).toString("hex");
  let [session] = await db
    .select()
    .from(chatbotSessionsTable)
    .where(eq(chatbotSessionsTable.sessionKey, sessionKey))
    .limit(1);
  if (!session) {
    [session] = await db
      .insert(chatbotSessionsTable)
      .values({
        sessionKey,
        userId,
        roleHint: parsed.data.roleHint ?? null,
      })
      .returning();
  }

  const reply = ChatbotService.reply(parsed.data.message, parsed.data.roleHint || session.roleHint);

  await db.insert(chatbotMessagesTable).values({
    sessionId: session.id,
    role: "user",
    content: escapeHtml(parsed.data.message),
    intent: reply.intent,
  });
  await db.insert(chatbotMessagesTable).values({
    sessionId: session.id,
    role: "assistant",
    content: reply.message,
    intent: reply.intent,
  });

  await writeAuditLog({
    actorUserId: userId,
    action: "CHATBOT_INTERACTION",
    entityType: "ChatbotSession",
    entityId: session.id,
    metadata: { intent: reply.intent },
    ipAddress: ip,
  });

  let ticket = null;
  if (parsed.data.escalate && userId) {
    const subject = escapeHtml(parsed.data.escalateSubject || "Chatbot escalation");
    const description = escapeHtml(
      parsed.data.escalateDescription || `Escalated from chatbot. Last message: ${parsed.data.message}`,
    );
    const [caseRow] = await db
      .insert(supportCasesTable)
      .values({
        userId,
        subject,
        description,
        priority: "MEDIUM",
        status: "OPEN",
      })
      .returning();
    ticket = { id: caseRow.id, subject: caseRow.subject };
    await writeAuditLog({
      actorUserId: userId,
      action: "SUPPORT_ESCALATION",
      entityType: "SupportCase",
      entityId: caseRow.id,
      ipAddress: ip,
    });
    await createNotification({
      userId,
      eventType: "SUPPORT_ESCALATION_CREATED",
      title: "Support ticket created",
      description: `Ticket #${caseRow.id} was created from Help chat.`,
      relatedType: "SupportCase",
      relatedId: caseRow.id,
      category: "ADMIN",
    });
  }

  return res.json({
    sessionKey,
    ...reply,
    ticket,
  });
});

router.get("/onboarding", async (req, res) => {
  const user = await requireUser(req, res);
  if (!user) return;
  const role = user.primaryRole || "GENERAL";
  const steps = ONBOARDING_BY_ROLE[role] || ONBOARDING_BY_ROLE.MANUFACTURER?.slice(0, 0) || [];
  const [progress] = await db
    .select()
    .from(onboardingProgressTable)
    .where(and(eq(onboardingProgressTable.userId, user.id), eq(onboardingProgressTable.role, role)))
    .limit(1);
  const checklist = progress ? JSON.parse(progress.checklist || "{}") : {};
  return res.json({
    role,
    steps,
    checklist,
    completionPct: progress?.completionPct ?? 0,
    skipped: progress?.skipped ?? false,
    currentStep: progress?.currentStep ?? steps[0]?.id ?? null,
  });
});

router.patch("/onboarding", async (req, res) => {
  const user = await requireUser(req, res);
  if (!user) return;
  const role = user.primaryRole || "GENERAL";
  const steps = ONBOARDING_BY_ROLE[role] || [];
  const parsed = z
    .object({
      stepId: z.string().max(64).optional(),
      done: z.boolean().optional(),
      skip: z.boolean().optional(),
      currentStep: z.string().max(64).optional(),
    })
    .safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid input" });

  let [progress] = await db
    .select()
    .from(onboardingProgressTable)
    .where(and(eq(onboardingProgressTable.userId, user.id), eq(onboardingProgressTable.role, role)))
    .limit(1);

  const checklist = progress ? JSON.parse(progress.checklist || "{}") : {};
  if (parsed.data.stepId) checklist[parsed.data.stepId] = !!parsed.data.done;
  const doneCount = steps.filter((s) => checklist[s.id]).length;
  const completionPct = steps.length ? Math.round((doneCount / steps.length) * 100) : 0;
  const skipped = parsed.data.skip ?? progress?.skipped ?? false;
  const completedAt = completionPct >= 100 ? new Date() : null;

  if (progress) {
    [progress] = await db
      .update(onboardingProgressTable)
      .set({
        checklist: JSON.stringify(checklist),
        completionPct,
        skipped,
        currentStep: parsed.data.currentStep ?? progress.currentStep,
        completedAt,
        updatedAt: new Date(),
      })
      .where(eq(onboardingProgressTable.id, progress.id))
      .returning();
  } else {
    [progress] = await db
      .insert(onboardingProgressTable)
      .values({
        userId: user.id,
        role,
        checklist: JSON.stringify(checklist),
        completionPct,
        skipped,
        currentStep: parsed.data.currentStep ?? steps[0]?.id ?? null,
        completedAt,
      })
      .returning();
  }

  return res.json({
    role,
    steps,
    checklist,
    completionPct: progress.completionPct,
    skipped: progress.skipped,
    currentStep: progress.currentStep,
  });
});

// Admin content
router.get("/admin/templates", async (req, res) => {
  const admin = await requireAdmin(req, res, "content", "read");
  if (!admin) return;
  await ensureSeed();
  const rows = await db.select().from(listingTemplatesTable).orderBy(desc(listingTemplatesTable.updatedAt));
  return res.json({
    items: rows.map((r) => ({
      ...r,
      templateData: JSON.parse(r.templateData || "{}"),
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
    })),
  });
});

router.post("/admin/templates", async (req, res) => {
  const admin = await requireAdmin(req, res, "content", "write");
  if (!admin) return;
  const parsed = z
    .object({
      name: z.string().min(2).max(255),
      industry: z.string().max(128).optional(),
      category: z.string().min(2).max(128),
      description: z.string().max(5000).optional(),
      templateData: z.record(z.string(), z.unknown()),
      status: z.enum(["ACTIVE", "ARCHIVED"]).optional(),
    })
    .safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid input" });

  const [row] = await db
    .insert(listingTemplatesTable)
    .values({
      name: escapeHtml(parsed.data.name),
      industry: parsed.data.industry ?? null,
      category: parsed.data.category,
      description: parsed.data.description ? escapeHtml(parsed.data.description) : null,
      templateData: JSON.stringify(parsed.data.templateData),
      status: parsed.data.status ?? "ACTIVE",
      createdBy: admin.id,
      updatedBy: admin.id,
    })
    .returning();
  await logAdminAction(admin, "TEMPLATE_CREATED", "ListingTemplate", row.id, {}, req);
  return res.status(201).json({ ...row, templateData: parsed.data.templateData });
});

router.put("/admin/templates/:id", async (req, res) => {
  const admin = await requireAdmin(req, res, "content", "write");
  if (!admin) return;
  const id = parseInt(String(req.params.id), 10);
  if (Number.isNaN(id)) return res.status(400).json({ error: "Invalid id" });
  const parsed = z
    .object({
      name: z.string().min(2).max(255).optional(),
      industry: z.string().max(128).nullable().optional(),
      category: z.string().min(2).max(128).optional(),
      description: z.string().max(5000).nullable().optional(),
      templateData: z.record(z.string(), z.unknown()).optional(),
      status: z.enum(["ACTIVE", "ARCHIVED"]).optional(),
    })
    .safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid input" });

  const patch: Record<string, unknown> = { updatedBy: admin.id, updatedAt: new Date() };
  if (parsed.data.name) patch.name = escapeHtml(parsed.data.name);
  if (parsed.data.industry !== undefined) patch.industry = parsed.data.industry;
  if (parsed.data.category) patch.category = parsed.data.category;
  if (parsed.data.description !== undefined) {
    patch.description = parsed.data.description ? escapeHtml(parsed.data.description) : null;
  }
  if (parsed.data.templateData) patch.templateData = JSON.stringify(parsed.data.templateData);
  if (parsed.data.status) patch.status = parsed.data.status;

  const [row] = await db.update(listingTemplatesTable).set(patch).where(eq(listingTemplatesTable.id, id)).returning();
  if (!row) return res.status(404).json({ error: "Not found" });
  await logAdminAction(admin, "TEMPLATE_UPDATED", "ListingTemplate", id, {}, req);
  await createNotification({
    userId: admin.id,
    eventType: "TEMPLATE_UPDATED",
    title: "Template updated",
    description: `Template "${row.name}" was updated.`,
    relatedType: "ListingTemplate",
    relatedId: id,
    category: "ADMIN",
  }).catch(() => undefined);
  return res.json({ ...row, templateData: JSON.parse(row.templateData) });
});

router.delete("/admin/templates/:id", async (req, res) => {
  const admin = await requireAdmin(req, res, "content", "manage");
  if (!admin) return;
  const id = parseInt(String(req.params.id), 10);
  if (Number.isNaN(id)) return res.status(400).json({ error: "Invalid id" });
  const [row] = await db
    .update(listingTemplatesTable)
    .set({ status: "ARCHIVED", updatedBy: admin.id, updatedAt: new Date() })
    .where(eq(listingTemplatesTable.id, id))
    .returning();
  if (!row) return res.status(404).json({ error: "Not found" });
  await logAdminAction(admin, "TEMPLATE_DELETED", "ListingTemplate", id, { soft: true }, req);
  return res.json({ message: "Archived", id });
});

router.post("/admin/help/articles", async (req, res) => {
  const admin = await requireAdmin(req, res, "content", "write");
  if (!admin) return;
  const parsed = z
    .object({
      title: z.string().min(3).max(255),
      slug: z.string().max(255).optional(),
      role: z.string().max(64).default("GENERAL"),
      category: z.string().min(2).max(64),
      summary: z.string().max(2000).optional(),
      content: z.string().min(3).max(100000),
      tags: z.array(z.string()).optional(),
      status: z.enum(["DRAFT", "PUBLISHED"]).optional(),
    })
    .safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid input" });
  const s = parsed.data.slug ? slugify(parsed.data.slug) : slugify(parsed.data.title);
  try {
    const [row] = await db
      .insert(helpArticlesTable)
      .values({
        title: escapeHtml(parsed.data.title),
        slug: s,
        role: parsed.data.role,
        category: parsed.data.category,
        summary: parsed.data.summary ? escapeHtml(parsed.data.summary) : null,
        content: parsed.data.content,
        tags: JSON.stringify(parsed.data.tags || []),
        status: parsed.data.status || "DRAFT",
        publishedAt: parsed.data.status === "PUBLISHED" ? new Date() : null,
        createdBy: admin.id,
        updatedBy: admin.id,
      })
      .returning();
    await logAdminAction(admin, "HELP_ARTICLE_CREATED", "HelpArticle", row.id, {}, req);
    return res.status(201).json(row);
  } catch {
    return res.status(409).json({ error: "Slug already exists" });
  }
});

router.put("/admin/help/articles/:id", async (req, res) => {
  const admin = await requireAdmin(req, res, "content", "write");
  if (!admin) return;
  const id = parseInt(String(req.params.id), 10);
  if (Number.isNaN(id)) return res.status(400).json({ error: "Invalid id" });
  const parsed = z
    .object({
      title: z.string().min(3).max(255).optional(),
      role: z.string().max(64).optional(),
      category: z.string().max(64).optional(),
      summary: z.string().max(2000).nullable().optional(),
      content: z.string().min(3).max(100000).optional(),
      tags: z.array(z.string()).optional(),
      status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]).optional(),
    })
    .safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid input" });
  const patch: Record<string, unknown> = { updatedBy: admin.id, updatedAt: new Date() };
  if (parsed.data.title) patch.title = escapeHtml(parsed.data.title);
  if (parsed.data.role) patch.role = parsed.data.role;
  if (parsed.data.category) patch.category = parsed.data.category;
  if (parsed.data.summary !== undefined) {
    patch.summary = parsed.data.summary ? escapeHtml(parsed.data.summary) : null;
  }
  if (parsed.data.content) patch.content = parsed.data.content;
  if (parsed.data.tags) patch.tags = JSON.stringify(parsed.data.tags);
  if (parsed.data.status) {
    patch.status = parsed.data.status;
    if (parsed.data.status === "PUBLISHED") patch.publishedAt = new Date();
  }
  const [row] = await db.update(helpArticlesTable).set(patch).where(eq(helpArticlesTable.id, id)).returning();
  if (!row) return res.status(404).json({ error: "Not found" });
  await logAdminAction(admin, "HELP_ARTICLE_UPDATED", "HelpArticle", id, {}, req);
  return res.json(row);
});

router.delete("/admin/help/articles/:id", async (req, res) => {
  const admin = await requireAdmin(req, res, "content", "manage");
  if (!admin) return;
  const id = parseInt(String(req.params.id), 10);
  if (Number.isNaN(id)) return res.status(400).json({ error: "Invalid id" });
  const [row] = await db
    .update(helpArticlesTable)
    .set({ status: "ARCHIVED", updatedBy: admin.id, updatedAt: new Date() })
    .where(eq(helpArticlesTable.id, id))
    .returning();
  if (!row) return res.status(404).json({ error: "Not found" });
  await logAdminAction(admin, "HELP_ARTICLE_DELETED", "HelpArticle", id, {}, req);
  return res.json({ message: "Archived" });
});

router.patch("/admin/help/articles/:id/publish", async (req, res) => {
  const admin = await requireAdmin(req, res, "content", "write");
  if (!admin) return;
  const id = parseInt(String(req.params.id), 10);
  if (Number.isNaN(id)) return res.status(400).json({ error: "Invalid id" });
  const [row] = await db
    .update(helpArticlesTable)
    .set({ status: "PUBLISHED", publishedAt: new Date(), updatedBy: admin.id, updatedAt: new Date() })
    .where(eq(helpArticlesTable.id, id))
    .returning();
  if (!row) return res.status(404).json({ error: "Not found" });
  await logAdminAction(admin, "HELP_ARTICLE_PUBLISHED", "HelpArticle", id, {}, req);
  return res.json(row);
});

router.get("/admin/help-content", async (req, res) => {
  const admin = await requireAdmin(req, res, "content", "read");
  if (!admin) return;
  await ensureSeed();
  const rows = await db.select().from(helpContentTable).orderBy(helpContentTable.page, helpContentTable.fieldKey);
  return res.json({ items: rows.map(serializeHelp) });
});

router.put("/admin/help-content/:id", async (req, res) => {
  const admin = await requireAdmin(req, res, "content", "write");
  if (!admin) return;
  const id = parseInt(String(req.params.id), 10);
  if (Number.isNaN(id)) return res.status(400).json({ error: "Invalid id" });
  const parsed = z
    .object({
      title: z.string().max(255).optional(),
      helpText: z.string().max(10000).optional(),
      tooltipText: z.string().max(500).optional(),
      example: z.string().max(2000).nullable().optional(),
      status: z.enum(["ACTIVE", "ARCHIVED"]).optional(),
    })
    .safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid input" });
  const patch: Record<string, unknown> = { updatedBy: admin.id, updatedAt: new Date() };
  if (parsed.data.title !== undefined) patch.title = escapeHtml(parsed.data.title);
  if (parsed.data.helpText !== undefined) patch.helpText = escapeHtml(parsed.data.helpText);
  if (parsed.data.tooltipText !== undefined) patch.tooltipText = escapeHtml(parsed.data.tooltipText);
  if (parsed.data.example !== undefined) patch.example = parsed.data.example ? escapeHtml(parsed.data.example) : null;
  if (parsed.data.status) patch.status = parsed.data.status;
  const [row] = await db.update(helpContentTable).set(patch).where(eq(helpContentTable.id, id)).returning();
  if (!row) return res.status(404).json({ error: "Not found" });
  await logAdminAction(admin, "HELP_CONTENT_UPDATED", "HelpContent", id, {}, req);
  return res.json(serializeHelp(row));
});

export default router;

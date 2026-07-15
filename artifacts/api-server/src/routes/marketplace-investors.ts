import { Router } from "express";
import {
  db,
  serviceProviderProfilesTable,
  investorProfilesTable,
  projectInvestmentsTable,
  investorIntroductionsTable,
  marketOpportunitiesTable,
  marketInterestRequestsTable,
  vendorMaterialsTable,
  laborListingsTable,
  logisticsServicesTable,
} from "@workspace/db";
import { and, desc, eq, ilike, inArray, or, sql } from "drizzle-orm";
import {
  requireUser,
  isAdmin,
  writeAuditLog,
  createNotification,
  clientIp,
  escapeHtml,
} from "../lib/auth";
import {
  investorProfileBody,
  projectInvestmentBody,
  investmentInterestBody,
  investmentRequestPatchBody,
  marketOpportunityBody,
  interestBody,
} from "../lib/marketplace-schemas";

const router = Router();

async function getProvider(userId: number, type: string, admin: boolean) {
  const conditions = [eq(serviceProviderProfilesTable.providerType, type)];
  if (!admin) conditions.push(eq(serviceProviderProfilesTable.userId, userId));
  const [p] = await db.select().from(serviceProviderProfilesTable).where(and(...conditions)).limit(1);
  return p ?? null;
}

// —— Investors ——
router.post("/investors/profile", async (req, res) => {
  const user = await requireUser(req, res);
  if (!user) return;
  const provider = await getProvider(user.id, "INVESTOR", isAdmin(user));
  if (!provider) return res.status(403).json({ error: "Investor service provider profile required" });
  const parsed = investorProfileBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid input", details: parsed.error.flatten() });
  const d = parsed.data;

  const [existing] = await db
    .select()
    .from(investorProfilesTable)
    .where(eq(investorProfilesTable.providerId, provider.id))
    .limit(1);

  const values = {
    investmentInterests: d.investmentInterests ? escapeHtml(d.investmentInterests) : null,
    preferredIndustries: d.preferredIndustries ? escapeHtml(d.preferredIndustries) : null,
    ticketSizeMinimum: d.ticketSizeMinimum != null ? String(d.ticketSizeMinimum) : null,
    ticketSizeMaximum: d.ticketSizeMaximum != null ? String(d.ticketSizeMaximum) : null,
    preferredGeographies: d.preferredGeographies ?? null,
    investmentStages: d.investmentStages ?? null,
    portfolioWebsite: d.portfolioWebsite ?? null,
    bio: d.bio ? escapeHtml(d.bio) : null,
    updatedAt: new Date(),
  };

  let row;
  if (existing) {
    [row] = await db.update(investorProfilesTable).set(values).where(eq(investorProfilesTable.id, existing.id)).returning();
  } else {
    [row] = await db.insert(investorProfilesTable).values({ providerId: provider.id, ...values }).returning();
  }

  await writeAuditLog({
    actorUserId: user.id,
    action: "INVESTOR_PROFILE_UPDATED",
    entityType: "InvestorProfile",
    entityId: row.id,
    ipAddress: clientIp(req),
  });

  return res.status(existing ? 200 : 201).json({
    ...row,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  });
});

router.get("/investors", async (req, res) => {
  const page = Math.max(1, parseInt(String(req.query.page || "1"), 10) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(String(req.query.limit || "20"), 10) || 20));
  const rows = await db
    .select({
      investor: investorProfilesTable,
      provider: serviceProviderProfilesTable,
    })
    .from(investorProfilesTable)
    .innerJoin(
      serviceProviderProfilesTable,
      eq(investorProfilesTable.providerId, serviceProviderProfilesTable.id),
    )
    .where(eq(serviceProviderProfilesTable.isPublished, true))
    .orderBy(desc(investorProfilesTable.updatedAt))
    .limit(limit)
    .offset((page - 1) * limit);

  return res.status(200).json({
    items: rows.map((r) => ({
      id: r.investor.id,
      providerId: r.provider.id,
      displayName: r.provider.displayName,
      companyName: r.provider.companyName,
      city: r.provider.city,
      country: r.provider.country,
      verificationStatus: r.provider.verificationStatus,
      rating: r.provider.rating,
      investmentInterests: r.investor.investmentInterests,
      preferredIndustries: r.investor.preferredIndustries,
      ticketSizeMinimum: r.investor.ticketSizeMinimum,
      ticketSizeMaximum: r.investor.ticketSizeMaximum,
      preferredGeographies: r.investor.preferredGeographies,
      investmentStages: r.investor.investmentStages,
      portfolioWebsite: r.investor.portfolioWebsite,
      bio: r.investor.bio,
    })),
    page,
    limit,
  });
});

router.post("/projects/:id/investment", async (req, res) => {
  const user = await requireUser(req, res);
  if (!user) return;
  const projectId = parseInt(req.params.id, 10);
  if (Number.isNaN(projectId)) return res.status(400).json({ error: "Invalid project id" });
  const parsed = projectInvestmentBody.safeParse({ ...req.body, projectId });
  if (!parsed.success) return res.status(400).json({ error: "Invalid input", details: parsed.error.flatten() });
  const d = parsed.data;

  const [existing] = await db
    .select()
    .from(projectInvestmentsTable)
    .where(eq(projectInvestmentsTable.projectId, projectId))
    .limit(1);

  const values = {
    title: d.title ? escapeHtml(d.title) : null,
    isOpenForInvestment: d.isOpenForInvestment ?? true,
    minimumInvestment: d.minimumInvestment != null ? String(d.minimumInvestment) : null,
    maximumInvestment: d.maximumInvestment != null ? String(d.maximumInvestment) : null,
    equityOffered: d.equityOffered != null ? String(d.equityOffered) : null,
    fundingGoal: d.fundingGoal != null ? String(d.fundingGoal) : null,
    publicSummary: d.publicSummary ? escapeHtml(d.publicSummary) : null,
    confidentialNotes: d.confidentialNotes ? escapeHtml(d.confidentialNotes) : null,
    updatedAt: new Date(),
  };

  let row;
  if (existing) {
    if (existing.ownerUserId !== user.id && !isAdmin(user)) return res.status(403).json({ error: "Forbidden" });
    [row] = await db.update(projectInvestmentsTable).set(values).where(eq(projectInvestmentsTable.id, existing.id)).returning();
  } else {
    [row] = await db
      .insert(projectInvestmentsTable)
      .values({ projectId, ownerUserId: user.id, ...values })
      .returning();
  }

  await writeAuditLog({
    actorUserId: user.id,
    action: "PROJECT_INVESTMENT_UPDATED",
    entityType: "ProjectInvestment",
    entityId: row.id,
    ipAddress: clientIp(req),
  });

  return res.status(existing ? 200 : 201).json({
    ...row,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    // never expose confidential notes unless owner
    confidentialNotes: row.ownerUserId === user.id || isAdmin(user) ? row.confidentialNotes : null,
  });
});

router.get("/projects/:id/investment", async (req, res) => {
  const projectId = parseInt(req.params.id, 10);
  if (Number.isNaN(projectId)) return res.status(400).json({ error: "Invalid project id" });
  const [row] = await db
    .select()
    .from(projectInvestmentsTable)
    .where(eq(projectInvestmentsTable.projectId, projectId))
    .limit(1);
  if (!row || !row.isOpenForInvestment) return res.status(404).json({ error: "Not open for investment" });

  let showConfidential = false;
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith("Bearer ")) {
    const user = await requireUser(req, res);
    if (!user) return;
    if (row.ownerUserId === user.id || isAdmin(user)) showConfidential = true;
    else {
      const [intro] = await db
        .select()
        .from(investorIntroductionsTable)
        .where(
          and(
            eq(investorIntroductionsTable.projectId, projectId),
            eq(investorIntroductionsTable.investorId, user.id),
            eq(investorIntroductionsTable.status, "APPROVED"),
          ),
        )
        .limit(1);
      if (intro) showConfidential = true;
    }
  }

  return res.status(200).json({
    ...row,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    confidentialNotes: showConfidential ? row.confidentialNotes : null,
    confidentialLocked: !showConfidential,
  });
});

router.post("/projects/:id/investment-interest", async (req, res) => {
  const user = await requireUser(req, res);
  if (!user) return;
  const projectId = parseInt(req.params.id, 10);
  if (Number.isNaN(projectId)) return res.status(400).json({ error: "Invalid project id" });
  const parsed = investmentInterestBody.safeParse(req.body ?? {});
  if (!parsed.success) return res.status(400).json({ error: "Invalid input" });

  const [project] = await db
    .select()
    .from(projectInvestmentsTable)
    .where(and(eq(projectInvestmentsTable.projectId, projectId), eq(projectInvestmentsTable.isOpenForInvestment, true)))
    .limit(1);
  if (!project) return res.status(404).json({ error: "Project not open for investment" });
  if (project.ownerUserId === user.id) return res.status(400).json({ error: "Cannot invest in own project" });

  try {
    const [intro] = await db
      .insert(investorIntroductionsTable)
      .values({
        projectId,
        projectInvestmentId: project.id,
        investorId: user.id,
        status: "PENDING",
        notes: parsed.data.notes ? escapeHtml(parsed.data.notes) : null,
      })
      .returning();

    await createNotification({
      userId: project.ownerUserId,
      eventType: "INVESTMENT_REQUEST_RECEIVED",
      title: "Investment introduction request",
      description: "An investor requested access to your project.",
      relatedType: "InvestorIntroduction",
      relatedId: intro.id,
      category: "MARKETPLACE",
    });
    await writeAuditLog({
      actorUserId: user.id,
      action: "INVESTMENT_REQUEST_CREATED",
      entityType: "InvestorIntroduction",
      entityId: intro.id,
      ipAddress: clientIp(req),
    });

    return res.status(201).json({
      ...intro,
      createdAt: intro.createdAt.toISOString(),
      updatedAt: intro.updatedAt.toISOString(),
    });
  } catch {
    return res.status(409).json({ error: "Interest already submitted" });
  }
});

router.patch("/investment-requests/:id", async (req, res) => {
  const user = await requireUser(req, res);
  if (!user) return;
  const id = parseInt(req.params.id, 10);
  if (Number.isNaN(id)) return res.status(400).json({ error: "Invalid id" });
  const parsed = investmentRequestPatchBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid input" });

  const [intro] = await db.select().from(investorIntroductionsTable).where(eq(investorIntroductionsTable.id, id)).limit(1);
  if (!intro) return res.status(404).json({ error: "Not found" });

  const [project] = await db
    .select()
    .from(projectInvestmentsTable)
    .where(eq(projectInvestmentsTable.projectId, intro.projectId))
    .limit(1);

  // Owner approves/rejects; investor accepts after approval
  if (parsed.data.status === "ACCEPTED") {
    if (intro.investorId !== user.id) return res.status(403).json({ error: "Forbidden" });
    if (intro.status !== "APPROVED") return res.status(409).json({ error: "Must be approved first" });
  } else {
    if (!project || (project.ownerUserId !== user.id && !isAdmin(user))) {
      return res.status(403).json({ error: "Forbidden" });
    }
  }

  const [updated] = await db
    .update(investorIntroductionsTable)
    .set({
      status: parsed.data.status,
      ownerNotes: parsed.data.ownerNotes ? escapeHtml(parsed.data.ownerNotes) : intro.ownerNotes,
      updatedAt: new Date(),
    })
    .where(eq(investorIntroductionsTable.id, id))
    .returning();

  const event =
    parsed.data.status === "APPROVED"
      ? "INVESTMENT_REQUEST_APPROVED"
      : parsed.data.status === "REJECTED"
        ? "INVESTMENT_REQUEST_REJECTED"
        : "INVESTMENT_REQUEST_ACCEPTED";

  await createNotification({
    userId: parsed.data.status === "ACCEPTED" ? project!.ownerUserId : intro.investorId,
    eventType: event,
    title: `Investment request ${parsed.data.status.toLowerCase()}`,
    description: parsed.data.ownerNotes || undefined,
    relatedType: "InvestorIntroduction",
    relatedId: id,
    category: "MARKETPLACE",
  });

  await writeAuditLog({
    actorUserId: user.id,
    action: event,
    entityType: "InvestorIntroduction",
    entityId: id,
    ipAddress: clientIp(req),
  });

  return res.status(200).json({
    ...updated,
    createdAt: updated.createdAt.toISOString(),
    updatedAt: updated.updatedAt.toISOString(),
  });
});

router.get("/investment-requests", async (req, res) => {
  const user = await requireUser(req, res);
  if (!user) return;
  const as = String(req.query.as || "investor");
  let rows;
  if (as === "owner") {
    const projects = await db
      .select()
      .from(projectInvestmentsTable)
      .where(eq(projectInvestmentsTable.ownerUserId, user.id));
    const ids = projects.map((p) => p.projectId);
    if (!ids.length) return res.status(200).json({ items: [] });
    rows = await db
      .select()
      .from(investorIntroductionsTable)
      .where(inArray(investorIntroductionsTable.projectId, ids))
      .orderBy(desc(investorIntroductionsTable.createdAt));
  } else {
    rows = await db
      .select()
      .from(investorIntroductionsTable)
      .where(eq(investorIntroductionsTable.investorId, user.id))
      .orderBy(desc(investorIntroductionsTable.createdAt));
  }
  return res.status(200).json({
    items: rows.map((r) => ({
      ...r,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
    })),
  });
});

// —— Market opportunities ——
router.post("/market-opportunities", async (req, res) => {
  const user = await requireUser(req, res);
  if (!user) return;
  const provider = await getProvider(user.id, "MARKET_LEAD", isAdmin(user));
  if (!provider) return res.status(403).json({ error: "Market lead profile required" });
  const parsed = marketOpportunityBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid input", details: parsed.error.flatten() });
  const d = parsed.data;
  const [row] = await db
    .insert(marketOpportunitiesTable)
    .values({
      providerId: provider.id,
      title: escapeHtml(d.title),
      productCategory: d.productCategory,
      description: d.description ? escapeHtml(d.description) : null,
      demandVolume: d.demandVolume != null ? String(d.demandVolume) : null,
      unit: d.unit ?? null,
      geography: d.geography ?? null,
      timeline: d.timeline ?? null,
      targetPrice: d.targetPrice != null ? String(d.targetPrice) : null,
      currency: (d.currency || "INR").toUpperCase(),
      contactRules: d.contactRules ? escapeHtml(d.contactRules) : null,
      status: "PENDING_REVIEW",
      moderationStatus: "PENDING",
    })
    .returning();
  await writeAuditLog({
    actorUserId: user.id,
    action: "MARKET_OPPORTUNITY_CREATED",
    entityType: "MarketOpportunity",
    entityId: row.id,
    ipAddress: clientIp(req),
  });
  return res.status(201).json({
    ...row,
    moderatedAt: null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  });
});

router.get("/market-opportunities", async (req, res) => {
  const page = Math.max(1, parseInt(String(req.query.page || "1"), 10) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(String(req.query.limit || "20"), 10) || 20));
  const mine = req.query.mine === "true";
  const conditions = [];
  if (mine) {
    const user = await requireUser(req, res);
    if (!user) return;
    const provider = await getProvider(user.id, "MARKET_LEAD", isAdmin(user));
    if (!provider) return res.status(200).json({ items: [], total: 0, page, limit });
    conditions.push(eq(marketOpportunitiesTable.providerId, provider.id));
  } else {
    conditions.push(eq(marketOpportunitiesTable.status, "PUBLISHED"));
    conditions.push(eq(marketOpportunitiesTable.moderationStatus, "APPROVED"));
  }
  if (req.query.category) conditions.push(ilike(marketOpportunitiesTable.productCategory, `%${req.query.category}%`));
  if (req.query.geography) conditions.push(ilike(marketOpportunitiesTable.geography, `%${req.query.geography}%`));
  if (req.query.q) conditions.push(ilike(marketOpportunitiesTable.title, `%${req.query.q}%`));
  const where = and(...conditions);
  const rows = await db
    .select()
    .from(marketOpportunitiesTable)
    .where(where)
    .orderBy(desc(marketOpportunitiesTable.updatedAt))
    .limit(limit)
    .offset((page - 1) * limit);
  const [{ count }] = await db.select({ count: sql<number>`count(*)::int` }).from(marketOpportunitiesTable).where(where);
  return res.status(200).json({
    items: rows.map((r) => ({
      ...r,
      moderatedAt: r.moderatedAt?.toISOString() ?? null,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
    })),
    total: count,
    page,
    limit,
  });
});

router.get("/market-opportunities/:id", async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (Number.isNaN(id)) return res.status(400).json({ error: "Invalid id" });
  const [row] = await db.select().from(marketOpportunitiesTable).where(eq(marketOpportunitiesTable.id, id)).limit(1);
  if (!row) return res.status(404).json({ error: "Not found" });
  if (row.status !== "PUBLISHED") {
    const user = await requireUser(req, res);
    if (!user) return;
    const provider = await getProvider(user.id, "MARKET_LEAD", isAdmin(user));
    if ((!provider || provider.id !== row.providerId) && !isAdmin(user)) {
      return res.status(403).json({ error: "Forbidden" });
    }
  }
  return res.status(200).json({
    ...row,
    moderatedAt: row.moderatedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  });
});

router.put("/market-opportunities/:id", async (req, res) => {
  const user = await requireUser(req, res);
  if (!user) return;
  const id = parseInt(req.params.id, 10);
  if (Number.isNaN(id)) return res.status(400).json({ error: "Invalid id" });
  const [existing] = await db.select().from(marketOpportunitiesTable).where(eq(marketOpportunitiesTable.id, id)).limit(1);
  if (!existing) return res.status(404).json({ error: "Not found" });
  const provider = await getProvider(user.id, "MARKET_LEAD", isAdmin(user));
  if ((!provider || provider.id !== existing.providerId) && !isAdmin(user)) return res.status(403).json({ error: "Forbidden" });
  const parsed = marketOpportunityBody.partial().safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid input" });
  const d = parsed.data;
  const [updated] = await db
    .update(marketOpportunitiesTable)
    .set({
      ...(d.title != null ? { title: escapeHtml(d.title) } : {}),
      ...(d.productCategory != null ? { productCategory: d.productCategory } : {}),
      ...(d.description !== undefined ? { description: d.description ? escapeHtml(d.description) : null } : {}),
      ...(d.demandVolume !== undefined ? { demandVolume: d.demandVolume != null ? String(d.demandVolume) : null } : {}),
      ...(d.unit !== undefined ? { unit: d.unit } : {}),
      ...(d.geography !== undefined ? { geography: d.geography } : {}),
      ...(d.timeline !== undefined ? { timeline: d.timeline } : {}),
      ...(d.targetPrice !== undefined ? { targetPrice: d.targetPrice != null ? String(d.targetPrice) : null } : {}),
      ...(d.currency != null ? { currency: d.currency.toUpperCase() } : {}),
      ...(d.contactRules !== undefined ? { contactRules: d.contactRules ? escapeHtml(d.contactRules) : null } : {}),
      moderationStatus: "PENDING",
      status: "PENDING_REVIEW",
      updatedAt: new Date(),
    })
    .where(eq(marketOpportunitiesTable.id, id))
    .returning();
  await writeAuditLog({
    actorUserId: user.id,
    action: "MARKET_OPPORTUNITY_UPDATED",
    entityType: "MarketOpportunity",
    entityId: id,
    ipAddress: clientIp(req),
  });
  return res.status(200).json({
    ...updated,
    moderatedAt: updated.moderatedAt?.toISOString() ?? null,
    createdAt: updated.createdAt.toISOString(),
    updatedAt: updated.updatedAt.toISOString(),
  });
});

router.delete("/market-opportunities/:id", async (req, res) => {
  const user = await requireUser(req, res);
  if (!user) return;
  const id = parseInt(req.params.id, 10);
  if (Number.isNaN(id)) return res.status(400).json({ error: "Invalid id" });
  const [existing] = await db.select().from(marketOpportunitiesTable).where(eq(marketOpportunitiesTable.id, id)).limit(1);
  if (!existing) return res.status(404).json({ error: "Not found" });
  const provider = await getProvider(user.id, "MARKET_LEAD", isAdmin(user));
  if ((!provider || provider.id !== existing.providerId) && !isAdmin(user)) return res.status(403).json({ error: "Forbidden" });
  await db
    .update(marketOpportunitiesTable)
    .set({ status: "CLOSED", updatedAt: new Date() })
    .where(eq(marketOpportunitiesTable.id, id));
  await writeAuditLog({
    actorUserId: user.id,
    action: "MARKET_OPPORTUNITY_DELETED",
    entityType: "MarketOpportunity",
    entityId: id,
    ipAddress: clientIp(req),
  });
  return res.status(200).json({ message: "Closed" });
});

router.post("/market-opportunities/:id/interest", async (req, res) => {
  const user = await requireUser(req, res);
  if (!user) return;
  const id = parseInt(req.params.id, 10);
  if (Number.isNaN(id)) return res.status(400).json({ error: "Invalid id" });
  const parsed = interestBody.safeParse(req.body ?? {});
  if (!parsed.success) return res.status(400).json({ error: "Invalid input" });
  const [opp] = await db.select().from(marketOpportunitiesTable).where(eq(marketOpportunitiesTable.id, id)).limit(1);
  if (!opp || opp.status !== "PUBLISHED") return res.status(404).json({ error: "Opportunity not available" });
  try {
    const [interest] = await db
      .insert(marketInterestRequestsTable)
      .values({
        opportunityId: id,
        userId: user.id,
        message: parsed.data.message ? escapeHtml(parsed.data.message) : null,
        status: "PENDING",
      })
      .returning();
    const [provider] = await db
      .select()
      .from(serviceProviderProfilesTable)
      .where(eq(serviceProviderProfilesTable.id, opp.providerId))
      .limit(1);
    if (provider) {
      await createNotification({
        userId: provider.userId,
        eventType: "INTEREST_EXPRESSED",
        title: "Interest in market opportunity",
        description: opp.title,
        relatedType: "MarketInterestRequest",
        relatedId: interest.id,
        category: "MARKETPLACE",
      });
    }
    await writeAuditLog({
      actorUserId: user.id,
      action: "MARKET_INTEREST_SUBMITTED",
      entityType: "MarketInterestRequest",
      entityId: interest.id,
      ipAddress: clientIp(req),
    });
    return res.status(201).json({
      ...interest,
      createdAt: interest.createdAt.toISOString(),
      updatedAt: interest.updatedAt.toISOString(),
    });
  } catch {
    return res.status(409).json({ error: "Interest already submitted" });
  }
});

router.patch("/admin/market-opportunities/:id/approve", async (req, res) => {
  const user = await requireUser(req, res);
  if (!user) return;
  if (!isAdmin(user)) return res.status(403).json({ error: "Admin only" });
  const id = parseInt(req.params.id, 10);
  if (Number.isNaN(id)) return res.status(400).json({ error: "Invalid id" });
  const [updated] = await db
    .update(marketOpportunitiesTable)
    .set({
      status: "PUBLISHED",
      moderationStatus: "APPROVED",
      moderatedBy: user.id,
      moderatedAt: new Date(),
      moderationNotes: req.body?.notes ? escapeHtml(String(req.body.notes)) : null,
      updatedAt: new Date(),
    })
    .where(eq(marketOpportunitiesTable.id, id))
    .returning();
  if (!updated) return res.status(404).json({ error: "Not found" });
  const [provider] = await db
    .select()
    .from(serviceProviderProfilesTable)
    .where(eq(serviceProviderProfilesTable.id, updated.providerId))
    .limit(1);
  if (provider) {
    await createNotification({
      userId: provider.userId,
      eventType: "MARKET_OPPORTUNITY_APPROVED",
      title: "Market opportunity approved",
      description: updated.title,
      relatedType: "MarketOpportunity",
      relatedId: id,
      category: "MARKETPLACE",
    });
  }
  await writeAuditLog({
    actorUserId: user.id,
    action: "MARKET_OPPORTUNITY_APPROVED",
    entityType: "MarketOpportunity",
    entityId: id,
    ipAddress: clientIp(req),
  });
  return res.status(200).json({
    ...updated,
    moderatedAt: updated.moderatedAt?.toISOString() ?? null,
    createdAt: updated.createdAt.toISOString(),
    updatedAt: updated.updatedAt.toISOString(),
  });
});

router.patch("/admin/market-opportunities/:id/reject", async (req, res) => {
  const user = await requireUser(req, res);
  if (!user) return;
  if (!isAdmin(user)) return res.status(403).json({ error: "Admin only" });
  const id = parseInt(req.params.id, 10);
  if (Number.isNaN(id)) return res.status(400).json({ error: "Invalid id" });
  const [updated] = await db
    .update(marketOpportunitiesTable)
    .set({
      status: "REJECTED",
      moderationStatus: "REJECTED",
      moderatedBy: user.id,
      moderatedAt: new Date(),
      moderationNotes: req.body?.notes ? escapeHtml(String(req.body.notes)) : null,
      updatedAt: new Date(),
    })
    .where(eq(marketOpportunitiesTable.id, id))
    .returning();
  if (!updated) return res.status(404).json({ error: "Not found" });
  await writeAuditLog({
    actorUserId: user.id,
    action: "MARKET_OPPORTUNITY_REJECTED",
    entityType: "MarketOpportunity",
    entityId: id,
    ipAddress: clientIp(req),
  });
  return res.status(200).json({
    ...updated,
    moderatedAt: updated.moderatedAt?.toISOString() ?? null,
    createdAt: updated.createdAt.toISOString(),
    updatedAt: updated.updatedAt.toISOString(),
  });
});

/** Unified marketplace search across provider types + listings */
router.get("/marketplace/search", async (req, res) => {
  const type = String(req.query.type || "all");
  const q = req.query.q ? String(req.query.q) : undefined;
  const location = req.query.location ? String(req.query.location) : undefined;
  const limit = Math.min(20, Math.max(1, parseInt(String(req.query.limit || "10"), 10) || 10));

  const result: Record<string, unknown> = {};

  if (type === "all" || type === "providers") {
    const conditions = [eq(serviceProviderProfilesTable.isPublished, true)];
    if (q) {
      conditions.push(
        or(
          ilike(serviceProviderProfilesTable.displayName, `%${q}%`),
          ilike(serviceProviderProfilesTable.companyName, `%${q}%`),
        )!,
      );
    }
    if (location) {
      conditions.push(
        or(
          ilike(serviceProviderProfilesTable.city, `%${location}%`),
          ilike(serviceProviderProfilesTable.country, `%${location}%`),
        )!,
      );
    }
    result.providers = (
      await db
        .select()
        .from(serviceProviderProfilesTable)
        .where(and(...conditions))
        .limit(limit)
    ).map((p) => ({
      ...p,
      createdAt: p.createdAt.toISOString(),
      updatedAt: p.updatedAt.toISOString(),
    }));
  }

  if (type === "all" || type === "materials") {
    const conditions = [eq(vendorMaterialsTable.isPublished, true)];
    if (q) conditions.push(ilike(vendorMaterialsTable.materialName, `%${q}%`));
    if (location) conditions.push(ilike(vendorMaterialsTable.location, `%${location}%`));
    result.materials = (
      await db.select().from(vendorMaterialsTable).where(and(...conditions)).limit(limit)
    ).map((m) => ({ ...m, createdAt: m.createdAt.toISOString(), updatedAt: m.updatedAt.toISOString() }));
  }

  if (type === "all" || type === "labor") {
    const conditions = [eq(laborListingsTable.isPublished, true)];
    if (q) conditions.push(ilike(laborListingsTable.skillCategory, `%${q}%`));
    if (location) conditions.push(ilike(laborListingsTable.city, `%${location}%`));
    result.labor = (
      await db.select().from(laborListingsTable).where(and(...conditions)).limit(limit)
    ).map((m) => ({ ...m, createdAt: m.createdAt.toISOString(), updatedAt: m.updatedAt.toISOString() }));
  }

  if (type === "all" || type === "logistics") {
    const conditions = [eq(logisticsServicesTable.isPublished, true)];
    if (q) conditions.push(ilike(logisticsServicesTable.description, `%${q}%`));
    if (location) conditions.push(ilike(logisticsServicesTable.coverageAreas, `%${location}%`));
    result.logistics = (
      await db.select().from(logisticsServicesTable).where(and(...conditions)).limit(limit)
    ).map((m) => ({ ...m, createdAt: m.createdAt.toISOString(), updatedAt: m.updatedAt.toISOString() }));
  }

  if (type === "all" || type === "opportunities") {
    const conditions = [
      eq(marketOpportunitiesTable.status, "PUBLISHED"),
      eq(marketOpportunitiesTable.moderationStatus, "APPROVED"),
    ];
    if (q) conditions.push(ilike(marketOpportunitiesTable.title, `%${q}%`));
    if (location) conditions.push(ilike(marketOpportunitiesTable.geography, `%${location}%`));
    result.opportunities = (
      await db.select().from(marketOpportunitiesTable).where(and(...conditions)).limit(limit)
    ).map((m) => ({
      ...m,
      moderatedAt: m.moderatedAt?.toISOString() ?? null,
      createdAt: m.createdAt.toISOString(),
      updatedAt: m.updatedAt.toISOString(),
    }));
  }

  return res.status(200).json({ query: { type, q, location }, ...result });
});

export default router;

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { projectInvestmentsTable, investorIntroductionsTable } from "@/lib/schema";
import { and, eq } from "drizzle-orm";
import {
  requireUser,
  isAuthUser,
  isAdmin,
  writeAuditLog,
  clientIp,
  escapeHtml,
} from "@/lib/legal-auth";
import { projectInvestmentBody } from "@/lib/marketplace-constants";

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id: idStr } = await ctx.params;
    const projectId = parseInt(idStr, 10);
    if (Number.isNaN(projectId)) return NextResponse.json({ error: "Invalid project id" }, { status: 400 });

    const [row] = await db
      .select()
      .from(projectInvestmentsTable)
      .where(eq(projectInvestmentsTable.projectId, projectId))
      .limit(1);
    if (!row || !row.isOpenForInvestment) {
      return NextResponse.json({ error: "Not open for investment" }, { status: 404 });
    }

    let showConfidential = false;
    const authHeader = req.headers.get("authorization");
    if (authHeader?.startsWith("Bearer ")) {
      const user = await requireUser(req);
      if (!isAuthUser(user)) return user;
      if (row.ownerUserId === user.id || isAdmin(user)) {
        showConfidential = true;
      } else {
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

    return NextResponse.json({
      ...row,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
      confidentialNotes: showConfidential ? row.confidentialNotes : null,
      confidentialLocked: !showConfidential,
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser(req);
    if (!isAuthUser(user)) return user;
    const { id: idStr } = await ctx.params;
    const projectId = parseInt(idStr, 10);
    if (Number.isNaN(projectId)) return NextResponse.json({ error: "Invalid project id" }, { status: 400 });

    const body = await req.json();
    const parsed = projectInvestmentBody.safeParse({ ...body, projectId });
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
    }
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
      if (existing.ownerUserId !== user.id && !isAdmin(user)) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      [row] = await db
        .update(projectInvestmentsTable)
        .set(values)
        .where(eq(projectInvestmentsTable.id, existing.id))
        .returning();
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

    return NextResponse.json(
      {
        ...row,
        createdAt: row.createdAt.toISOString(),
        updatedAt: row.updatedAt.toISOString(),
        confidentialNotes: row.ownerUserId === user.id || isAdmin(user) ? row.confidentialNotes : null,
      },
      { status: existing ? 200 : 201 },
    );
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

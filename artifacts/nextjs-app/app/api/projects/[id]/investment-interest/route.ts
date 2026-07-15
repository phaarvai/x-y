import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { projectInvestmentsTable, investorIntroductionsTable } from "@/lib/schema";
import { and, eq } from "drizzle-orm";
import {
  requireUser,
  isAuthUser,
  writeAuditLog,
  createNotification,
  clientIp,
  escapeHtml,
} from "@/lib/legal-auth";
import { investmentInterestBody } from "@/lib/marketplace-constants";

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser(req);
    if (!isAuthUser(user)) return user;
    const { id: idStr } = await ctx.params;
    const projectId = parseInt(idStr, 10);
    if (Number.isNaN(projectId)) return NextResponse.json({ error: "Invalid project id" }, { status: 400 });

    const body = await req.json().catch(() => ({}));
    const parsed = investmentInterestBody.safeParse(body ?? {});
    if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

    const [project] = await db
      .select()
      .from(projectInvestmentsTable)
      .where(
        and(
          eq(projectInvestmentsTable.projectId, projectId),
          eq(projectInvestmentsTable.isOpenForInvestment, true),
        ),
      )
      .limit(1);
    if (!project) return NextResponse.json({ error: "Project not open for investment" }, { status: 404 });
    if (project.ownerUserId === user.id) {
      return NextResponse.json({ error: "Cannot invest in own project" }, { status: 400 });
    }

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

      return NextResponse.json(
        {
          ...intro,
          createdAt: intro.createdAt.toISOString(),
          updatedAt: intro.updatedAt.toISOString(),
        },
        { status: 201 },
      );
    } catch {
      return NextResponse.json({ error: "Interest already submitted" }, { status: 409 });
    }
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

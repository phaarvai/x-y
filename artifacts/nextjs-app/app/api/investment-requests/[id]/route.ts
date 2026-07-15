import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { projectInvestmentsTable, investorIntroductionsTable } from "@/lib/schema";
import { eq } from "drizzle-orm";
import {
  requireUser,
  isAuthUser,
  isAdmin,
  writeAuditLog,
  createNotification,
  clientIp,
  escapeHtml,
} from "@/lib/legal-auth";
import { investmentRequestPatchBody } from "@/lib/marketplace-constants";

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser(req);
    if (!isAuthUser(user)) return user;
    const { id: idStr } = await ctx.params;
    const id = parseInt(idStr, 10);
    if (Number.isNaN(id)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

    const body = await req.json();
    const parsed = investmentRequestPatchBody.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

    const [intro] = await db
      .select()
      .from(investorIntroductionsTable)
      .where(eq(investorIntroductionsTable.id, id))
      .limit(1);
    if (!intro) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const [project] = await db
      .select()
      .from(projectInvestmentsTable)
      .where(eq(projectInvestmentsTable.projectId, intro.projectId))
      .limit(1);

    if (parsed.data.status === "ACCEPTED") {
      if (intro.investorId !== user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      if (intro.status !== "APPROVED") {
        return NextResponse.json({ error: "Must be approved first" }, { status: 409 });
      }
    } else {
      if (!project || (project.ownerUserId !== user.id && !isAdmin(user))) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
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

    return NextResponse.json({
      ...updated,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

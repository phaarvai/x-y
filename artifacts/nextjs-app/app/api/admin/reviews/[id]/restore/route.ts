import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { feedbackTable } from "@/lib/schema";
import { eq } from "drizzle-orm";
import {
  requireUser,
  isAuthUser,
  isAdmin,
  writeAuditLog,
  clientIp,
} from "@/lib/legal-auth";
import { recalculateRatingSummary, serializeFeedback } from "@/lib/reviews";

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireUser(req);
    if (!isAuthUser(user)) return user;
    if (!isAdmin(user)) return NextResponse.json({ error: "Admin only" }, { status: 403 });

    const id = parseInt((await ctx.params).id, 10);
    if (Number.isNaN(id)) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }

    const [updated] = await db
      .update(feedbackTable)
      .set({
        status: "PUBLISHED",
        moderationStatus: "APPROVED",
        updatedAt: new Date(),
      })
      .where(eq(feedbackTable.id, id))
      .returning();
    if (!updated) return NextResponse.json({ error: "Review not found" }, { status: 404 });

    await recalculateRatingSummary("USER", updated.reviewedUserId);
    if (updated.facilityId) await recalculateRatingSummary("FACILITY", updated.facilityId);

    await writeAuditLog({
      actorUserId: user.id,
      action: "REVIEW_RESTORED",
      entityType: "Feedback",
      entityId: id,
      ipAddress: clientIp(req),
    });

    return NextResponse.json(serializeFeedback(updated));
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

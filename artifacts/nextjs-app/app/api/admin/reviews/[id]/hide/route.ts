import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { feedbackTable } from "@/lib/schema";
import { eq } from "drizzle-orm";
import {
  requireUser,
  isAuthUser,
  isAdmin,
  writeAuditLog,
  createNotification,
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

    const [existing] = await db
      .select()
      .from(feedbackTable)
      .where(eq(feedbackTable.id, id))
      .limit(1);
    if (!existing) return NextResponse.json({ error: "Review not found" }, { status: 404 });

    const [updated] = await db
      .update(feedbackTable)
      .set({
        status: "HIDDEN",
        updatedAt: new Date(),
        moderatedBy: user.id,
        moderatedAt: new Date(),
      })
      .where(eq(feedbackTable.id, id))
      .returning();

    await recalculateRatingSummary("USER", updated.reviewedUserId);
    if (updated.facilityId) await recalculateRatingSummary("FACILITY", updated.facilityId);

    await writeAuditLog({
      actorUserId: user.id,
      action: "REVIEW_HIDDEN",
      entityType: "Feedback",
      entityId: id,
      ipAddress: clientIp(req),
    });
    await createNotification({
      userId: updated.reviewerUserId,
      eventType: "REVIEW_HIDDEN",
      title: "Review hidden",
      description: "An admin hid your review.",
      relatedType: "Feedback",
      relatedId: id,
      category: "REVIEW",
    });

    return NextResponse.json(serializeFeedback(updated));
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

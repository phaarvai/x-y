import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verificationsTable, verificationHistoryTable } from "@/lib/schema";
import { desc, eq } from "drizzle-orm";
import { z } from "zod";
import {
  requireUser,
  isAuthUser,
  isAdmin,
  writeAuditLog,
  createNotification,
  clientIp,
  escapeHtml,
} from "@/lib/legal-auth";
import { serializeVerification } from "@/lib/reviews";

const updateVerificationBody = z.object({
  status: z.enum(["VERIFIED", "REJECTED", "REVOKED", "EXPIRED", "PENDING"]).optional(),
  notes: z.string().max(2000).optional().nullable(),
  verificationReason: z.string().max(1000).optional().nullable(),
  expiresAt: z.string().optional().nullable(),
  action: z.enum(["APPROVE", "REJECT", "REVOKE", "RENEW"]).optional(),
});

async function appendHistory(params: {
  verificationId: number;
  action: string;
  fromStatus: string | null;
  toStatus: string;
  performedBy?: number | null;
  notes?: string | null;
}) {
  await db.insert(verificationHistoryTable).values({
    verificationId: params.verificationId,
    action: params.action,
    fromStatus: params.fromStatus,
    toStatus: params.toStatus,
    performedBy: params.performedBy ?? null,
    notes: params.notes ?? null,
  });
}

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

    const parsed = updateVerificationBody.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const [existing] = await db
      .select()
      .from(verificationsTable)
      .where(eq(verificationsTable.id, id))
      .limit(1);
    if (!existing) {
      return NextResponse.json({ error: "Verification not found" }, { status: 404 });
    }

    let nextStatus = parsed.data.status ?? existing.status;
    let action = parsed.data.action ?? "UPDATED";
    if (parsed.data.action === "APPROVE") {
      nextStatus = "VERIFIED";
      action = "APPROVED";
    } else if (parsed.data.action === "REJECT") {
      nextStatus = "REJECTED";
      action = "REJECTED";
    } else if (parsed.data.action === "REVOKE") {
      nextStatus = "REVOKED";
      action = "REVOKED";
    } else if (parsed.data.action === "RENEW") {
      nextStatus = "VERIFIED";
      action = "RENEWED";
    }

    const expiresAt =
      parsed.data.expiresAt !== undefined
        ? parsed.data.expiresAt
          ? new Date(parsed.data.expiresAt)
          : null
        : action === "RENEW" && !parsed.data.expiresAt
          ? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
          : existing.expiresAt;

    const [updated] = await db
      .update(verificationsTable)
      .set({
        status: nextStatus,
        notes: parsed.data.notes != null ? escapeHtml(parsed.data.notes) : existing.notes,
        verificationReason:
          parsed.data.verificationReason != null
            ? escapeHtml(parsed.data.verificationReason)
            : existing.verificationReason,
        verifiedBy: nextStatus === "VERIFIED" ? user.id : existing.verifiedBy,
        verifiedAt: nextStatus === "VERIFIED" ? new Date() : existing.verifiedAt,
        expiresAt,
        updatedAt: new Date(),
      })
      .where(eq(verificationsTable.id, id))
      .returning();

    await appendHistory({
      verificationId: id,
      action,
      fromStatus: existing.status,
      toStatus: nextStatus,
      performedBy: user.id,
      notes: parsed.data.notes,
    });

    await writeAuditLog({
      actorUserId: user.id,
      action: `VERIFICATION_${action}`,
      entityType: "Verification",
      entityId: id,
      ipAddress: clientIp(req),
    });

    if (
      updated.entityType === "USER" ||
      updated.entityType === "MANUFACTURER" ||
      updated.entityType === "LEGAL_PROVIDER"
    ) {
      if (nextStatus === "VERIFIED") {
        await createNotification({
          userId: updated.entityId,
          eventType: "VERIFIED_BADGE_AWARDED",
          title: "Verified badge awarded",
          description: `Your ${updated.verificationType.toLowerCase()} verification was approved.`,
          relatedType: "Verification",
          relatedId: id,
          category: "TRUST",
        });
      } else if (nextStatus === "REVOKED") {
        await createNotification({
          userId: updated.entityId,
          eventType: "VERIFICATION_REVOKED",
          title: "Verification revoked",
          description: "Your verified badge has been revoked.",
          relatedType: "Verification",
          relatedId: id,
          category: "TRUST",
        });
      } else if (nextStatus === "EXPIRED") {
        await createNotification({
          userId: updated.entityId,
          eventType: "VERIFICATION_EXPIRED",
          title: "Verification expired",
          description: "Your verified badge has expired.",
          relatedType: "Verification",
          relatedId: id,
          category: "TRUST",
        });
      }
    }

    const history = await db
      .select()
      .from(verificationHistoryTable)
      .where(eq(verificationHistoryTable.verificationId, id))
      .orderBy(desc(verificationHistoryTable.createdAt));

    return NextResponse.json({
      ...serializeVerification(updated),
      history: history.map((h) => ({
        ...h,
        createdAt: h.createdAt.toISOString(),
      })),
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

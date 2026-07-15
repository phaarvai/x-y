import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { disputesTable, disputeEvidenceTable } from "@/lib/schema";
import { eq } from "drizzle-orm";
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

const evidenceBody = z.object({
  fileUrl: z.string().min(1).max(2000),
  fileName: z.string().min(1).max(255),
  fileType: z.string().min(1).max(128),
});

const BLOCKED = new Set(["exe", "bat", "cmd", "com", "msi", "scr", "js", "jar", "sh", "ps1", "dll"]);

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser(req);
    if (!isAuthUser(user)) return user;
    const id = parseInt((await ctx.params).id, 10);
    if (Number.isNaN(id)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

    const parsed = evidenceBody.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
    }

    const ext = parsed.data.fileName.split(".").pop()?.toLowerCase() ?? "";
    if (BLOCKED.has(ext)) {
      return NextResponse.json({ error: "File type not allowed" }, { status: 415 });
    }

    const [dispute] = await db.select().from(disputesTable).where(eq(disputesTable.id, id)).limit(1);
    if (!dispute) return NextResponse.json({ error: "Dispute not found" }, { status: 404 });
    if (!isAdmin(user) && dispute.openedBy !== user.id && dispute.againstUser !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const [evidence] = await db
      .insert(disputeEvidenceTable)
      .values({
        disputeId: id,
        fileUrl: parsed.data.fileUrl,
        fileName: escapeHtml(parsed.data.fileName),
        fileType: parsed.data.fileType,
        uploadedBy: user.id,
      })
      .returning();

    await writeAuditLog({
      actorUserId: user.id,
      action: "EVIDENCE_UPLOADED",
      entityType: "DisputeEvidence",
      entityId: evidence.id,
      metadata: { disputeId: id },
      ipAddress: clientIp(req),
    });

    for (const uid of [dispute.openedBy, dispute.againstUser]) {
      if (!uid || uid === user.id) continue;
      await createNotification({
        userId: uid,
        eventType: "EVIDENCE_UPLOADED",
        title: "Dispute evidence uploaded",
        description: `New evidence added to dispute #${id}`,
        relatedType: "Dispute",
        relatedId: id,
        category: "DISPUTE",
      });
    }

    return NextResponse.json(
      { ...evidence, createdAt: evidence.createdAt.toISOString() },
      { status: 201 },
    );
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

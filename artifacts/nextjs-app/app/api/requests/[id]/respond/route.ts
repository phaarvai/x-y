import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireUser, isAuthUser, writeAuditLog, clientIp } from "@/lib/legal-auth";
import { respondToRequest } from "@/lib/marketplace-service";

type Ctx = { params: Promise<{ id: string }> };

const schema = z.object({
  action: z.enum(["ACCEPT", "DECLINE"]),
  declineReason: z.string().max(500).optional(),
});

export async function POST(req: NextRequest, ctx: Ctx) {
  try {
    const user = await requireUser(req);
    if (!isAuthUser(user)) return user;
    const { id: raw } = await ctx.params;
    const requestId = Number(raw);
    if (!Number.isFinite(requestId)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    const parsed = schema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
    }
    const result = await respondToRequest(user.id, requestId, parsed.data.action, parsed.data.declineReason);
    if (!result) return NextResponse.json({ error: "Request not found or not pending" }, { status: 404 });
    await writeAuditLog({
      actorUserId: user.id,
      action: parsed.data.action === "ACCEPT" ? "REQUEST_ACCEPTED" : "REQUEST_DECLINED",
      entityType: "ManufacturingRequest",
      entityId: requestId,
      ipAddress: clientIp(req),
    });
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof Error && err.message === "CONFLICT_DOUBLE_ACCEPT") {
      return NextResponse.json({ error: "Request already processed", code: "CONFLICT" }, { status: 409 });
    }
    console.error(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

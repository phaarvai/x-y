import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireUser, isAuthUser, writeAuditLog, clientIp } from "@/lib/legal-auth";
import { respondToOffer } from "@/lib/marketplace-service";

type Ctx = { params: Promise<{ id: string }> };

const schema = z.object({
  action: z.enum(["ACCEPT", "REJECT"]),
});

export async function POST(req: NextRequest, ctx: Ctx) {
  try {
    const user = await requireUser(req);
    if (!isAuthUser(user)) return user;
    const { id: raw } = await ctx.params;
    const offerId = Number(raw);
    if (!Number.isFinite(offerId)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    const parsed = schema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
    }
    const result = await respondToOffer(user.id, offerId, parsed.data.action);
    if (!result) return NextResponse.json({ error: "Offer not found" }, { status: 404 });
    if (result === "FORBIDDEN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    await writeAuditLog({
      actorUserId: user.id,
      action: parsed.data.action === "ACCEPT" ? "COUNTER_OFFER_ACCEPTED" : "COUNTER_OFFER_REJECTED",
      entityType: "RequestOffer",
      entityId: offerId,
      ipAddress: clientIp(req),
    });
    return NextResponse.json(result);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

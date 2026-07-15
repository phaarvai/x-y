import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireUser, isAuthUser, writeAuditLog, clientIp } from "@/lib/legal-auth";
import { createCounterOffer, listOffers } from "@/lib/marketplace-service";

type Ctx = { params: Promise<{ id: string }> };

const schema = z.object({
  proposedPrice: z.union([z.string(), z.number()]).optional(),
  currency: z.string().length(3).optional(),
  proposedStartDate: z.string().optional(),
  proposedEndDate: z.string().optional(),
  proposedQuantity: z.number().int().positive().optional(),
  terms: z.string().max(2000).optional(),
  parentOfferId: z.number().int().positive().optional(),
});

export async function GET(req: NextRequest, ctx: Ctx) {
  try {
    const user = await requireUser(req);
    if (!isAuthUser(user)) return user;
    const { id: raw } = await ctx.params;
    const requestId = Number(raw);
    if (!Number.isFinite(requestId)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    const result = await listOffers(requestId, user.id);
    if (!result) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (result === "FORBIDDEN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    return NextResponse.json({
      items: result.offers.map((o) => ({
        ...o,
        proposedStartDate: o.proposedStartDate?.toISOString() ?? null,
        proposedEndDate: o.proposedEndDate?.toISOString() ?? null,
        createdAt: o.createdAt.toISOString(),
        updatedAt: o.updatedAt.toISOString(),
      })),
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

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
    const offer = await createCounterOffer(user.id, requestId, parsed.data);
    if (!offer) return NextResponse.json({ error: "Request not found" }, { status: 404 });
    if (offer === "FORBIDDEN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    await writeAuditLog({
      actorUserId: user.id,
      action: "COUNTER_OFFER_CREATED",
      entityType: "RequestOffer",
      entityId: offer.id,
      ipAddress: clientIp(req),
    });
    return NextResponse.json(offer, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

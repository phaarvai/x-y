import { NextRequest, NextResponse } from "next/server";
import { getFacilityDetail } from "@/lib/marketplace-service";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, ctx: Ctx) {
  try {
    const { id: raw } = await ctx.params;
    const id = Number(raw);
    if (!Number.isFinite(id)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    const detail = await getFacilityDetail(id);
    if (!detail) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({
      facility: detail.facility,
      machines: detail.machines,
      slots: detail.slots,
      rating: detail.rating,
      owner: detail.owner
        ? { id: detail.owner.id, name: detail.owner.name, identityVerificationStatus: detail.owner.identityVerificationStatus }
        : null,
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

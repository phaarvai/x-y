import { NextRequest, NextResponse } from "next/server";
import { requireUser, isAuthUser } from "@/lib/legal-auth";
import { publishFacility } from "@/lib/marketplace-service";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, ctx: Ctx) {
  try {
    const user = await requireUser(req);
    if (!isAuthUser(user)) return user;
    const { id: raw } = await ctx.params;
    const id = Number(raw);
    if (!Number.isFinite(id)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    const facility = await publishFacility(id, user.id);
    if (!facility) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(facility);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Publish failed";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}

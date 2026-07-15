import { NextRequest, NextResponse } from "next/server";
import { requireUser, isAuthUser } from "@/lib/legal-auth";
import { removeFavorite } from "@/lib/marketplace-service";

type Ctx = { params: Promise<{ id: string }> };

export async function DELETE(req: NextRequest, ctx: Ctx) {
  try {
    const user = await requireUser(req);
    if (!isAuthUser(user)) return user;
    const { id: raw } = await ctx.params;
    const favoriteId = Number(raw);
    if (!Number.isFinite(favoriteId)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    const row = await removeFavorite(user.id, favoriteId);
    if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

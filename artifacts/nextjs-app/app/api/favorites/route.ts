import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireUser, isAuthUser } from "@/lib/legal-auth";
import { addFavorite, listFavorites } from "@/lib/marketplace-service";

const schema = z.object({
  entityType: z.string().min(1).max(64),
  entityId: z.number().int().positive(),
  title: z.string().max(255).optional(),
});

export async function GET(req: NextRequest) {
  try {
    const user = await requireUser(req);
    if (!isAuthUser(user)) return user;
    const items = await listFavorites(user.id);
    return NextResponse.json({
      items: items.map((f) => ({ ...f, createdAt: f.createdAt.toISOString() })),
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser(req);
    if (!isAuthUser(user)) return user;
    const parsed = schema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
    }
    const row = await addFavorite(user.id, parsed.data);
    return NextResponse.json(row, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

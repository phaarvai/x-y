import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireUser, isAuthUser } from "@/lib/legal-auth";
import { listAvailability, upsertAvailabilitySlot } from "@/lib/marketplace-service";

const schema = z.object({
  id: z.number().int().positive().optional(),
  inventoryId: z.number().int().positive(),
  slotDate: z.string().min(1),
  startTime: z.string().min(1),
  endTime: z.string().min(1),
  priceOverride: z.string().optional(),
  status: z.enum(["AVAILABLE", "RESERVED", "BOOKED", "BLOCKED"]).optional(),
  isRecurring: z.boolean().optional(),
  recurrenceRule: z.string().max(128).optional(),
  notes: z.string().max(1000).optional(),
});

export async function GET(req: NextRequest) {
  try {
    const user = await requireUser(req);
    if (!isAuthUser(user)) return user;
    const inventoryId = req.nextUrl.searchParams.get("inventoryId");
    const items = await listAvailability(
      user.id,
      inventoryId ? Number(inventoryId) : undefined,
    );
    return NextResponse.json({ items });
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
    const row = await upsertAvailabilitySlot(user.id, parsed.data);
    if (!row) return NextResponse.json({ error: "Machine not found" }, { status: 404 });
    return NextResponse.json(row, { status: parsed.data.id ? 200 : 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

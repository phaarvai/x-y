import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireUser, isAuthUser } from "@/lib/legal-auth";
import { addMachinery } from "@/lib/marketplace-service";

type Ctx = { params: Promise<{ id: string }> };

const slotSchema = z.object({
  date: z.string(),
  startTime: z.string(),
  endTime: z.string(),
  price: z.string().optional(),
  isRecurring: z.boolean().optional(),
  recurrenceRule: z.string().optional(),
  notes: z.string().optional(),
});

const schema = z.object({
  name: z.string().min(1),
  machineType: z.string().min(1),
  description: z.string().optional(),
  quantity: z.number().int().positive().optional(),
  pricePerHour: z.union([z.string(), z.number()]).optional(),
  currency: z.string().length(3).optional(),
  pricingModel: z.enum(["HOURLY", "DAILY", "WEEKLY", "MONTHLY", "PER_UNIT", "PER_BATCH"]).optional(),
  pricePerDay: z.union([z.string(), z.number()]).optional(),
  pricePerWeek: z.union([z.string(), z.number()]).optional(),
  pricePerMonth: z.union([z.string(), z.number()]).optional(),
  pricePerUnit: z.union([z.string(), z.number()]).optional(),
  pricePerBatch: z.union([z.string(), z.number()]).optional(),
  extraServiceCharges: z.string().optional(),
  subcategory: z.string().optional(),
  condition: z.string().optional(),
  ageYears: z.number().int().nonnegative().optional(),
  technicalSpecs: z.string().optional(),
  serviceCostNotes: z.string().optional(),
  imageUrl: z.string().optional(),
  imageFileId: z.number().int().optional(),
  keywords: z.array(z.string()).optional(),
  capacityNotes: z.string().optional(),
  slots: z.array(slotSchema).optional(),
});

export async function POST(req: NextRequest, ctx: Ctx) {
  try {
    const user = await requireUser(req);
    if (!isAuthUser(user)) return user;
    const { id: raw } = await ctx.params;
    const facilityId = Number(raw);
    if (!Number.isFinite(facilityId)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    const parsed = schema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
    }
    try {
      const machine = await addMachinery(user.id, facilityId, parsed.data);
      return NextResponse.json(machine, { status: 201 });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed";
      if (msg.includes("not found")) return NextResponse.json({ error: msg }, { status: 404 });
      throw e;
    }
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireUser, isAuthUser } from "@/lib/legal-auth";
import { updateMachinery } from "@/lib/marketplace-service";

type Ctx = { params: Promise<{ id: string }> };

const schema = z.object({
  name: z.string().min(1).optional(),
  machineType: z.string().min(1).optional(),
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
});

export async function PATCH(req: NextRequest, ctx: Ctx) {
  try {
    const user = await requireUser(req);
    if (!isAuthUser(user)) return user;
    const { id: raw } = await ctx.params;
    const machineId = Number(raw);
    if (!Number.isFinite(machineId)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    const parsed = schema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
    }
    const row = await updateMachinery(user.id, machineId, parsed.data);
    if (!row) return NextResponse.json({ error: "Machine not found" }, { status: 404 });
    return NextResponse.json(row);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

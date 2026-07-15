import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  requireUser,
  isAuthUser,
} from "@/lib/legal-auth";
import { calculateCommission } from "@/lib/payments";

const bodySchema = z.object({
  amount: z.union([z.number(), z.string()]).transform((v) => Number(v)),
  userId: z.number().int().positive().optional(),
  overrideType: z.enum(["FLAT", "PERCENTAGE"]).optional(),
  overrideValue: z.union([z.number(), z.string()]).optional(),
}).refine((d) => d.amount > 0, { message: "Amount must be positive", path: ["amount"] });

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser(req);
    if (!isAuthUser(user)) return user;

    const parsed = bodySchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
    }

    const d = parsed.data;
    const result = await calculateCommission({
      amount: d.amount,
      userId: d.userId ?? user.id,
      overrideType: d.overrideType,
      overrideValue: d.overrideValue != null ? Number(d.overrideValue) : undefined,
    });

    return NextResponse.json({
      amount: d.amount,
      ...result,
    });
  } catch (err) {
    console.error(err);
    const message = err instanceof Error ? err.message : "Internal server error";
    if (message.includes("Amount")) {
      return NextResponse.json({ error: message }, { status: 400 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

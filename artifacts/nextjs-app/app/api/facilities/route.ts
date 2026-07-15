import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireUser, isAuthUser } from "@/lib/legal-auth";
import { upsertFacility } from "@/lib/marketplace-service";
import { db } from "@/lib/db";
import { manufacturingFacilitiesTable } from "@/lib/schema";
import { eq } from "drizzle-orm";

const bodySchema = z.object({
  id: z.number().int().positive().optional(),
  name: z.string().min(1).max(255),
  tagline: z.string().max(500).optional(),
  description: z.string().max(5000).optional(),
  location: z.string().max(255).optional(),
  contactEmail: z.string().email().optional(),
  contactPhone: z.string().max(32).optional(),
  website: z.string().max(255).optional(),
  industry: z.string().max(128).optional(),
  certifications: z.array(z.string()).optional(),
  ownerName: z.string().max(255).optional(),
  sezStatus: z.enum(["NONE", "SEZ", "EOU", "OTHER"]).optional(),
  serviceAreas: z.string().max(2000).optional(),
  infrastructure: z.string().max(5000).optional(),
  workingHours: z.string().max(500).optional(),
  images: z.array(z.string()).optional(),
  addressLine: z.string().max(500).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser(req);
    if (!isAuthUser(user)) return user;
    if (user.primaryRole !== "MANUFACTURER" && !user.isAdminUser) {
      return NextResponse.json({ error: "Manufacturer role required" }, { status: 403 });
    }
    const parsed = bodySchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
    }
    const row = await upsertFacility(user.id, parsed.data);
    if (!row) return NextResponse.json({ error: "Facility not found" }, { status: 404 });
    return NextResponse.json(row, { status: parsed.data.id ? 200 : 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const user = await requireUser(req);
    if (!isAuthUser(user)) return user;
    const rows = await db
      .select()
      .from(manufacturingFacilitiesTable)
      .where(eq(manufacturingFacilitiesTable.ownerUserId, user.id));
    return NextResponse.json({ items: rows });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

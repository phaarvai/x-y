import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireUser, isAuthUser } from "@/lib/legal-auth";
import { createRequirement } from "@/lib/marketplace-service";
import { db } from "@/lib/db";
import { manufacturingRequestsTable } from "@/lib/schema";
import { desc, eq } from "drizzle-orm";

const schema = z.object({
  title: z.string().min(1).max(255),
  description: z.string().max(5000).optional(),
  industry: z.string().max(128).optional(),
  category: z.string().max(128).optional(),
  city: z.string().max(100).optional(),
  state: z.string().max(100).optional(),
  country: z.string().max(100).optional(),
  budgetMin: z.string().optional(),
  budgetMax: z.string().optional(),
  materialSpecs: z.string().max(2000).optional(),
  status: z.enum(["DRAFT", "PUBLISHED"]).optional(),
  isConfidential: z.boolean().optional(),
  requiredMachinery: z.string().max(2000).optional(),
  requiredLabor: z.string().max(2000).optional(),
  requiredMaterials: z.string().max(2000).optional(),
  requiredLogistics: z.string().max(2000).optional(),
  requiredLegal: z.string().max(2000).optional(),
  timelineNotes: z.string().max(2000).optional(),
  attachmentFileIds: z.array(z.number().int().positive()).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser(req);
    if (!isAuthUser(user)) return user;
    const parsed = schema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
    }
    const row = await createRequirement(user.id, parsed.data);
    return NextResponse.json(row, { status: 201 });
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
      .from(manufacturingRequestsTable)
      .where(eq(manufacturingRequestsTable.visionaryUserId, user.id))
      .orderBy(desc(manufacturingRequestsTable.createdAt));
    return NextResponse.json({ items: rows });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

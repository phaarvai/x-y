import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireUser, isAuthUser, writeAuditLog, clientIp } from "@/lib/legal-auth";
import { submitListingRequest } from "@/lib/marketplace-service";
import { db } from "@/lib/db";
import { manufacturingRequestsTable } from "@/lib/schema";
import { and, desc, eq, or } from "drizzle-orm";

const submitSchema = z.object({
  facilityId: z.number().int().positive(),
  inventoryId: z.number().int().positive(),
  manufacturerUserId: z.number().int().positive(),
  title: z.string().min(1).max(255),
  message: z.string().max(2000).optional(),
  quantity: z.number().int().positive().optional(),
  preferredStartDate: z.string().optional(),
  preferredEndDate: z.string().optional(),
  slotIds: z.array(z.number().int().positive()).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser(req);
    if (!isAuthUser(user)) return user;
    const parsed = submitSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
    }
    const row = await submitListingRequest(user, parsed.data);
    await writeAuditLog({
      actorUserId: user.id,
      action: "REQUEST_SUBMITTED",
      entityType: "ManufacturingRequest",
      entityId: row.id,
      ipAddress: clientIp(req),
    });
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
    const inbox = req.nextUrl.searchParams.get("inbox") === "manufacturer";
    const rows = inbox
      ? await db
          .select()
          .from(manufacturingRequestsTable)
          .where(
            and(
              eq(manufacturingRequestsTable.manufacturerUserId, user.id),
              eq(manufacturingRequestsTable.requestType, "LISTING_REQUEST"),
            ),
          )
          .orderBy(desc(manufacturingRequestsTable.createdAt))
      : await db
          .select()
          .from(manufacturingRequestsTable)
          .where(
            or(
              eq(manufacturingRequestsTable.visionaryUserId, user.id),
              eq(manufacturingRequestsTable.manufacturerUserId, user.id),
            ),
          )
          .orderBy(desc(manufacturingRequestsTable.createdAt));
    return NextResponse.json({ items: rows });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { laborListingsTable } from "@/lib/schema";
import { and, desc, eq, ilike, sql } from "drizzle-orm";
import {
  requireUser,
  isAuthUser,
  isAdmin,
  writeAuditLog,
  clientIp,
  escapeHtml,
} from "@/lib/legal-auth";
import { createLaborBody } from "@/lib/marketplace-constants";
import { parsePageLimit } from "@/lib/marketplace-helpers";
import { getOwnedProvider, serLabor } from "@/lib/marketplace-owned";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const { page, limit, offset } = parsePageLimit(searchParams);
    const conditions = [eq(laborListingsTable.isPublished, true)];

    if (searchParams.get("city")) conditions.push(ilike(laborListingsTable.city, `%${searchParams.get("city")}%`));
    if (searchParams.get("skill")) {
      conditions.push(ilike(laborListingsTable.skillCategory, `%${searchParams.get("skill")}%`));
    }
    if (searchParams.get("availability")) {
      conditions.push(eq(laborListingsTable.availability, String(searchParams.get("availability"))));
    }
    if (searchParams.get("experience")) {
      conditions.push(ilike(laborListingsTable.experienceLevel, `%${searchParams.get("experience")}%`));
    }
    if (searchParams.get("maxDailyRate")) {
      conditions.push(sql`${laborListingsTable.dailyRate}::numeric <= ${searchParams.get("maxDailyRate")}`);
    }
    if (searchParams.get("mine") === "true") {
      const user = await requireUser(req);
      if (!isAuthUser(user)) return user;
      const provider = await getOwnedProvider(user.id, "LABOR_SUPPLIER", isAdmin(user));
      if (!provider) return NextResponse.json({ items: [], total: 0, page, limit });
      conditions.length = 0;
      conditions.push(eq(laborListingsTable.providerId, provider.id));
    }

    const where = and(...conditions);
    const rows = await db
      .select()
      .from(laborListingsTable)
      .where(where)
      .orderBy(desc(laborListingsTable.updatedAt))
      .limit(limit)
      .offset(offset);
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(laborListingsTable)
      .where(where);

    return NextResponse.json({ items: rows.map(serLabor), total: count, page, limit });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser(req);
    if (!isAuthUser(user)) return user;
    const provider = await getOwnedProvider(user.id, "LABOR_SUPPLIER", isAdmin(user));
    if (!provider) return NextResponse.json({ error: "Labor supplier profile required" }, { status: 403 });

    const body = await req.json();
    const parsed = createLaborBody.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
    }
    const d = parsed.data;
    const [row] = await db
      .insert(laborListingsTable)
      .values({
        providerId: provider.id,
        workerType: d.workerType,
        skillCategory: escapeHtml(d.skillCategory),
        experienceLevel: d.experienceLevel ?? null,
        workerCount: d.workerCount ?? 1,
        availability: d.availability ?? "AVAILABLE",
        availabilityCalendar: d.availabilityCalendar ?? null,
        city: d.city ?? null,
        state: d.state ?? null,
        country: d.country ?? null,
        dailyRate: d.dailyRate != null ? String(d.dailyRate) : null,
        monthlyRate: d.monthlyRate != null ? String(d.monthlyRate) : null,
        currency: (d.currency || "INR").toUpperCase(),
        description: d.description ? escapeHtml(d.description) : null,
      })
      .returning();

    await writeAuditLog({
      actorUserId: user.id,
      action: "LABOR_LISTING_CREATED",
      entityType: "LaborListing",
      entityId: row.id,
      ipAddress: clientIp(req),
    });

    return NextResponse.json(serLabor(row), { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

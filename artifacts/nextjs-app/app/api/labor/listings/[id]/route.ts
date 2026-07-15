import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { laborListingsTable } from "@/lib/schema";
import { eq } from "drizzle-orm";
import {
  requireUser,
  isAuthUser,
  isAdmin,
  writeAuditLog,
  clientIp,
  escapeHtml,
} from "@/lib/legal-auth";
import { createLaborBody } from "@/lib/marketplace-constants";
import { getOwnedProvider, serLabor } from "@/lib/marketplace-owned";

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id: idStr } = await ctx.params;
    const id = parseInt(idStr, 10);
    if (Number.isNaN(id)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

    const [row] = await db.select().from(laborListingsTable).where(eq(laborListingsTable.id, id)).limit(1);
    if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(serLabor(row));
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser(req);
    if (!isAuthUser(user)) return user;
    const { id: idStr } = await ctx.params;
    const id = parseInt(idStr, 10);
    if (Number.isNaN(id)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

    const [existing] = await db.select().from(laborListingsTable).where(eq(laborListingsTable.id, id)).limit(1);
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const provider = await getOwnedProvider(user.id, "LABOR_SUPPLIER", isAdmin(user), existing.providerId);
    if (!provider && !isAdmin(user)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const body = await req.json();
    const parsed = createLaborBody.partial().safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    const d = parsed.data;

    const [updated] = await db
      .update(laborListingsTable)
      .set({
        ...(d.workerType != null ? { workerType: d.workerType } : {}),
        ...(d.skillCategory != null ? { skillCategory: escapeHtml(d.skillCategory) } : {}),
        ...(d.experienceLevel !== undefined ? { experienceLevel: d.experienceLevel } : {}),
        ...(d.workerCount != null ? { workerCount: d.workerCount } : {}),
        ...(d.availability != null ? { availability: d.availability } : {}),
        ...(d.availabilityCalendar !== undefined ? { availabilityCalendar: d.availabilityCalendar } : {}),
        ...(d.city !== undefined ? { city: d.city } : {}),
        ...(d.state !== undefined ? { state: d.state } : {}),
        ...(d.country !== undefined ? { country: d.country } : {}),
        ...(d.dailyRate !== undefined ? { dailyRate: d.dailyRate != null ? String(d.dailyRate) : null } : {}),
        ...(d.monthlyRate !== undefined
          ? { monthlyRate: d.monthlyRate != null ? String(d.monthlyRate) : null }
          : {}),
        ...(d.currency != null ? { currency: d.currency.toUpperCase() } : {}),
        ...(d.description !== undefined
          ? { description: d.description ? escapeHtml(d.description) : null }
          : {}),
        updatedAt: new Date(),
      })
      .where(eq(laborListingsTable.id, id))
      .returning();

    await writeAuditLog({
      actorUserId: user.id,
      action: "LABOR_LISTING_UPDATED",
      entityType: "LaborListing",
      entityId: id,
      ipAddress: clientIp(req),
    });

    return NextResponse.json(serLabor(updated));
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser(req);
    if (!isAuthUser(user)) return user;
    const { id: idStr } = await ctx.params;
    const id = parseInt(idStr, 10);
    if (Number.isNaN(id)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

    const [existing] = await db.select().from(laborListingsTable).where(eq(laborListingsTable.id, id)).limit(1);
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const provider = await getOwnedProvider(user.id, "LABOR_SUPPLIER", isAdmin(user), existing.providerId);
    if (!provider && !isAdmin(user)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    await db
      .update(laborListingsTable)
      .set({ isPublished: false, updatedAt: new Date() })
      .where(eq(laborListingsTable.id, id));

    await writeAuditLog({
      actorUserId: user.id,
      action: "LABOR_LISTING_DELETED",
      entityType: "LaborListing",
      entityId: id,
      ipAddress: clientIp(req),
    });

    return NextResponse.json({ message: "Deleted" });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

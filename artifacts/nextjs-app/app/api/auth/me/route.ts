import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { usersTable, userLoginHistoryTable } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { requireUser, isAuthUser, clientIp } from "@/lib/legal-auth";
import { profileCompletion } from "@/lib/marketplace-service";

export async function GET(req: NextRequest) {
  try {
    const user = await requireUser(req);
    if (!isAuthUser(user)) return user;
    const [row] = await db.select().from(usersTable).where(eq(usersTable.id, user.id)).limit(1);
    if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({
      id: row.id,
      name: row.name,
      email: row.email,
      preferredLanguage: row.preferredLanguage,
      primaryRole: row.primaryRole,
      status: row.status ?? "ACTIVE",
      phone: row.phone,
      organization: row.organization,
      industry: row.industry,
      location: row.location,
      bio: row.bio,
      profileStatus: row.profileStatus ?? "PENDING_PROFILE",
      profileCompletion: profileCompletion(row),
      isAdminUser: !!user.isAdminUser,
      adminRoles: user.adminRoles ?? [],
      createdAt: row.createdAt.toISOString(),
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

const profileBody = z.object({
  name: z.string().min(1).max(255).optional(),
  phone: z.string().max(32).optional().nullable(),
  organization: z.string().max(255).optional().nullable(),
  industry: z.string().max(128).optional().nullable(),
  location: z.string().max(255).optional().nullable(),
  bio: z.string().max(2000).optional().nullable(),
  preferredLanguage: z.string().max(10).optional(),
});

export async function PATCH(req: NextRequest) {
  try {
    const user = await requireUser(req);
    if (!isAuthUser(user)) return user;
    const parsed = profileBody.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
    }

    const [current] = await db.select().from(usersTable).where(eq(usersTable.id, user.id)).limit(1);
    if (!current) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const merged = { ...current, ...parsed.data };
    const pct = profileCompletion(merged);
    const profileStatus = pct >= 85 && merged.primaryRole ? "ACTIVE" : "PENDING_PROFILE";

    const [updated] = await db
      .update(usersTable)
      .set({
        ...parsed.data,
        profileStatus,
        profileCompletedAt: profileStatus === "ACTIVE" && !current.profileCompletedAt ? new Date() : current.profileCompletedAt,
        updatedAt: new Date(),
      })
      .where(eq(usersTable.id, user.id))
      .returning();

    return NextResponse.json({
      id: updated.id,
      name: updated.name,
      email: updated.email,
      preferredLanguage: updated.preferredLanguage,
      primaryRole: updated.primaryRole,
      phone: updated.phone,
      organization: updated.organization,
      industry: updated.industry,
      location: updated.location,
      bio: updated.bio,
      profileStatus: updated.profileStatus,
      profileCompletion: profileCompletion(updated),
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

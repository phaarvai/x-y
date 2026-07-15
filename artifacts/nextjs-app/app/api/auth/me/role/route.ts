import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { usersTable } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { requireUser, isAuthUser, LEGAL_PROVIDER_ROLES } from "@/lib/legal-auth";

const ALLOWED = [
  "VISIONARY",
  "MANUFACTURER",
  "VENDOR",
  "LABOR_SUPPLIER",
  "LOGISTICS_PROVIDER",
  "INVESTOR",
  "MARKET_LEAD",
  ...LEGAL_PROVIDER_ROLES,
] as const;

export async function PATCH(req: NextRequest) {
  try {
    const user = await requireUser(req);
    if (!isAuthUser(user)) return user;
    const parsed = z.object({ primaryRole: z.string().min(2).max(64) }).safeParse(await req.json());
    if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    if (parsed.data.primaryRole === "PLATFORM_ADMIN") {
      return NextResponse.json({ error: "Cannot self-assign admin role" }, { status: 400 });
    }
    if (!(ALLOWED as readonly string[]).includes(parsed.data.primaryRole)) {
      return NextResponse.json({ error: "Invalid primaryRole" }, { status: 400 });
    }
    const [updated] = await db
      .update(usersTable)
      .set({ primaryRole: parsed.data.primaryRole, updatedAt: new Date() })
      .where(eq(usersTable.id, user.id))
      .returning();
    return NextResponse.json({
      id: updated.id,
      name: updated.name,
      email: updated.email,
      preferredLanguage: updated.preferredLanguage,
      primaryRole: updated.primaryRole,
      createdAt: updated.createdAt.toISOString(),
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

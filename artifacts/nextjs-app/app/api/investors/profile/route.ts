import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { investorProfilesTable } from "@/lib/schema";
import { eq } from "drizzle-orm";
import {
  requireUser,
  isAuthUser,
  isAdmin,
  writeAuditLog,
  clientIp,
  escapeHtml,
} from "@/lib/legal-auth";
import { investorProfileBody } from "@/lib/marketplace-constants";
import { getOwnedProvider } from "@/lib/marketplace-owned";

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser(req);
    if (!isAuthUser(user)) return user;
    const provider = await getOwnedProvider(user.id, "INVESTOR", isAdmin(user));
    if (!provider) {
      return NextResponse.json({ error: "Investor service provider profile required" }, { status: 403 });
    }

    const body = await req.json();
    const parsed = investorProfileBody.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
    }
    const d = parsed.data;

    const [existing] = await db
      .select()
      .from(investorProfilesTable)
      .where(eq(investorProfilesTable.providerId, provider.id))
      .limit(1);

    const values = {
      investmentInterests: d.investmentInterests ? escapeHtml(d.investmentInterests) : null,
      preferredIndustries: d.preferredIndustries ? escapeHtml(d.preferredIndustries) : null,
      ticketSizeMinimum: d.ticketSizeMinimum != null ? String(d.ticketSizeMinimum) : null,
      ticketSizeMaximum: d.ticketSizeMaximum != null ? String(d.ticketSizeMaximum) : null,
      preferredGeographies: d.preferredGeographies ?? null,
      investmentStages: d.investmentStages ?? null,
      portfolioWebsite: d.portfolioWebsite ?? null,
      bio: d.bio ? escapeHtml(d.bio) : null,
      updatedAt: new Date(),
    };

    let row;
    if (existing) {
      [row] = await db
        .update(investorProfilesTable)
        .set(values)
        .where(eq(investorProfilesTable.id, existing.id))
        .returning();
    } else {
      [row] = await db
        .insert(investorProfilesTable)
        .values({ providerId: provider.id, ...values })
        .returning();
    }

    await writeAuditLog({
      actorUserId: user.id,
      action: "INVESTOR_PROFILE_UPDATED",
      entityType: "InvestorProfile",
      entityId: row.id,
      ipAddress: clientIp(req),
    });

    return NextResponse.json(
      {
        ...row,
        createdAt: row.createdAt.toISOString(),
        updatedAt: row.updatedAt.toISOString(),
      },
      { status: existing ? 200 : 201 },
    );
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

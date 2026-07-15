import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { projectInvestmentsTable, investorIntroductionsTable } from "@/lib/schema";
import { desc, eq, inArray } from "drizzle-orm";
import { requireUser, isAuthUser } from "@/lib/legal-auth";

export async function GET(req: NextRequest) {
  try {
    const user = await requireUser(req);
    if (!isAuthUser(user)) return user;

    const { searchParams } = new URL(req.url);
    const as = String(searchParams.get("as") || "investor");
    let rows;

    if (as === "owner") {
      const projects = await db
        .select()
        .from(projectInvestmentsTable)
        .where(eq(projectInvestmentsTable.ownerUserId, user.id));
      const ids = projects.map((p) => p.projectId);
      if (!ids.length) return NextResponse.json({ items: [] });
      rows = await db
        .select()
        .from(investorIntroductionsTable)
        .where(inArray(investorIntroductionsTable.projectId, ids))
        .orderBy(desc(investorIntroductionsTable.createdAt));
    } else {
      rows = await db
        .select()
        .from(investorIntroductionsTable)
        .where(eq(investorIntroductionsTable.investorId, user.id))
        .orderBy(desc(investorIntroductionsTable.createdAt));
    }

    return NextResponse.json({
      items: rows.map((r) => ({
        ...r,
        createdAt: r.createdAt.toISOString(),
        updatedAt: r.updatedAt.toISOString(),
      })),
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

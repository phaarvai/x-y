import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { subscriptionPlansTable } from "@/lib/schema";
import { asc, eq } from "drizzle-orm";

function serializePlan(p: typeof subscriptionPlansTable.$inferSelect) {
  return {
    ...p,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
  };
}

export async function GET() {
  try {
    const rows = await db
      .select()
      .from(subscriptionPlansTable)
      .where(eq(subscriptionPlansTable.status, "ACTIVE"))
      .orderBy(asc(subscriptionPlansTable.sortOrder), asc(subscriptionPlansTable.price));

    return NextResponse.json({ items: rows.map(serializePlan) });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

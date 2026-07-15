import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verificationsTable } from "@/lib/schema";
import { and, desc, eq } from "drizzle-orm";
import {
  serializeVerification,
  expireStaleVerifications,
  getActiveVerification,
} from "@/lib/reviews";

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ entityType: string; entityId: string }> },
) {
  try {
    await expireStaleVerifications();

    const params = await ctx.params;
    const entityType = String(params.entityType).toUpperCase();
    const entityId = parseInt(params.entityId, 10);
    if (Number.isNaN(entityId)) {
      return NextResponse.json({ error: "Invalid entity id" }, { status: 400 });
    }

    const active = await getActiveVerification(entityType, entityId);
    const all = await db
      .select()
      .from(verificationsTable)
      .where(
        and(
          eq(verificationsTable.entityType, entityType),
          eq(verificationsTable.entityId, entityId),
        ),
      )
      .orderBy(desc(verificationsTable.createdAt));

    return NextResponse.json({
      isVerified: !!active,
      active: active ? serializeVerification(active) : null,
      items: all.map(serializeVerification),
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

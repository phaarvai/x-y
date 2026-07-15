import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sql } from "drizzle-orm";

export async function GET() {
  try {
    await db.execute(sql`SELECT 1`);
    return NextResponse.json({ status: "ready", checks: { database: "ok" } });
  } catch (err) {
    return NextResponse.json(
      {
        status: "not_ready",
        checks: { database: "fail" },
        error: err instanceof Error ? err.message : "db error",
      },
      { status: 503 },
    );
  }
}

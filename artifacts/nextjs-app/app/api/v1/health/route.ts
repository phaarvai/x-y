import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sql } from "drizzle-orm";

export async function GET() {
  let dbOk = false;
  try {
    await db.execute(sql`SELECT 1`);
    dbOk = true;
  } catch {
    dbOk = false;
  }
  return NextResponse.json(
    {
      status: dbOk ? "ok" : "degraded",
      version: "v1",
      env: process.env.APP_ENV ?? process.env.NODE_ENV ?? "development",
      checks: {
        database: dbOk ? "ok" : "fail",
        storage: process.env.STORAGE_PROVIDER ?? "local",
      },
      ts: new Date().toISOString(),
    },
    { status: dbOk ? 200 : 503 },
  );
}

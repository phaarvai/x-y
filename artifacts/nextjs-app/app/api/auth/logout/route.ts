import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sessionsTable } from "@/lib/schema";
import { eq } from "drizzle-orm";

export async function POST(req: NextRequest) {
  try {
    const token = req.headers.get("authorization")?.replace("Bearer ", "");
    if (token) {
      await db.delete(sessionsTable).where(eq(sessionsTable.token, token));
    }
    return NextResponse.json({ message: "Logged out" });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

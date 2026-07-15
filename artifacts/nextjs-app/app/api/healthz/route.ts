import { NextResponse } from "next/server";

/** Legacy health — preserved */
export async function GET() {
  return NextResponse.json({ status: "ok" });
}

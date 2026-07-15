import { NextRequest, NextResponse } from "next/server";
import { AnalyticsService } from "@/lib/analytics-service";
import { isServiceProviderRole } from "@/lib/analytics-utils";
import { requireUser, isAuthUser } from "@/lib/legal-auth";

export async function GET(req: NextRequest) {
  try {
    const user = await requireUser(req);
    if (!isAuthUser(user)) return user;
    if (!isServiceProviderRole(user.primaryRole)) {
      return NextResponse.json({ error: "Service provider access only" }, { status: 403 });
    }
    const data = await AnalyticsService.getServiceProviderActivity(user.id);
    return NextResponse.json(data);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

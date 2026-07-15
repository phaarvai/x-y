import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { sessionsTable } from "@/lib/schema";
import { loadAdminContext, logAdminAction } from "@/lib/admin-rbac";
import { requireUser, isAuthUser, getBearerTokenSafe } from "@/lib/admin-auth-helpers";

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser(req);
    if (!isAuthUser(user)) return user;

    const admin = await loadAdminContext(user);
    const token = getBearerTokenSafe(req);
    if (token) await db.delete(sessionsTable).where(eq(sessionsTable.token, token));
    if (admin) await logAdminAction(admin, "ADMIN_LOGOUT", "AdminSession", user.id, {}, req);

    return NextResponse.json({ message: "Logged out" });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

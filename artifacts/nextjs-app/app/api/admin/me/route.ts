import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, isAdminContext } from "@/lib/admin-rbac";

export async function GET(req: NextRequest) {
  try {
    const admin = await requireAdmin(req);
    if (!isAdminContext(admin)) return admin;
    return NextResponse.json({
      id: admin.id,
      name: admin.name,
      email: admin.email,
      preferredLanguage: admin.preferredLanguage,
      primaryRole: admin.primaryRole,
      adminRoles: admin.adminRoles,
      permissions: admin.permissions,
      isSuperAdmin: admin.isSuperAdmin,
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

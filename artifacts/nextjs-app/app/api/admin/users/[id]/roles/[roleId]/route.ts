import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { userRoleAssignmentsTable } from "@/lib/schema";
import { requireAdmin, isAdminContext, logAdminAction } from "@/lib/admin-rbac";

type Ctx = { params: Promise<{ id: string; roleId: string }> };

export async function DELETE(req: NextRequest, ctx: Ctx) {
  try {
    const admin = await requireAdmin(req, "roles", "manage");
    if (!isAdminContext(admin)) return admin;
    if (!admin.isSuperAdmin) {
      return NextResponse.json({ error: "Only Super Admin can remove roles" }, { status: 403 });
    }

    const { id, roleId } = await ctx.params;
    const userId = parseInt(id, 10);
    const adminRoleId = parseInt(roleId, 10);
    if (Number.isNaN(userId) || Number.isNaN(adminRoleId)) {
      return NextResponse.json({ error: "Invalid ids" }, { status: 400 });
    }

    await db
      .delete(userRoleAssignmentsTable)
      .where(
        and(
          eq(userRoleAssignmentsTable.userId, userId),
          eq(userRoleAssignmentsTable.adminRoleId, adminRoleId),
        ),
      );

    await logAdminAction(admin, "ADMIN_ROLE_REMOVED", "User", userId, { adminRoleId }, req);
    return NextResponse.json({ message: "Role removed" });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

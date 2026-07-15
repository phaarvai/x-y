import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { userRoleAssignmentsTable, adminRolesTable } from "@/lib/schema";
import { requireAdmin, isAdminContext, logAdminAction } from "@/lib/admin-rbac";
import { createNotification } from "@/lib/legal-auth";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, ctx: Ctx) {
  try {
    const admin = await requireAdmin(req, "roles", "manage");
    if (!isAdminContext(admin)) return admin;
    if (!admin.isSuperAdmin) {
      return NextResponse.json({ error: "Only Super Admin can assign roles" }, { status: 403 });
    }

    const userId = parseInt((await ctx.params).id, 10);
    if (Number.isNaN(userId)) return NextResponse.json({ error: "Invalid user id" }, { status: 400 });

    const parsed = z
      .object({
        adminRoleId: z.number().int().optional(),
        roleName: z.string().min(2).max(64).optional(),
      })
      .safeParse(await req.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

    let roleId = parsed.data.adminRoleId;
    if (!roleId && parsed.data.roleName) {
      const [role] = await db
        .select()
        .from(adminRolesTable)
        .where(eq(adminRolesTable.name, parsed.data.roleName))
        .limit(1);
      if (!role) return NextResponse.json({ error: "Role not found" }, { status: 404 });
      roleId = role.id;
    }
    if (!roleId) return NextResponse.json({ error: "adminRoleId or roleName required" }, { status: 400 });

    const [role] = await db.select().from(adminRolesTable).where(eq(adminRolesTable.id, roleId)).limit(1);
    if (!role) return NextResponse.json({ error: "Role not found" }, { status: 404 });

    const [existing] = await db
      .select()
      .from(userRoleAssignmentsTable)
      .where(
        and(
          eq(userRoleAssignmentsTable.userId, userId),
          eq(userRoleAssignmentsTable.adminRoleId, roleId),
        ),
      )
      .limit(1);
    if (existing) return NextResponse.json({ error: "Role already assigned" }, { status: 409 });

    const [created] = await db
      .insert(userRoleAssignmentsTable)
      .values({
        userId,
        adminRoleId: roleId,
        assignedBy: admin.id,
      })
      .returning();

    await logAdminAction(
      admin,
      "ADMIN_ROLE_ASSIGNED",
      "User",
      userId,
      { adminRoleId: roleId, roleName: role.name },
      req,
    );
    await createNotification({
      userId,
      eventType: "ADMIN_ROLE_ASSIGNED",
      title: "Admin role assigned",
      description: "You have been granted an administration role on X!Y.",
      relatedType: "User",
      relatedId: userId,
      category: "ADMIN",
    });

    return NextResponse.json(
      { ...created, assignedAt: created.assignedAt.toISOString() },
      { status: 201 },
    );
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, ctx: Ctx) {
  try {
    const admin = await requireAdmin(req, "roles", "manage");
    if (!isAdminContext(admin)) return admin;
    if (!admin.isSuperAdmin) {
      return NextResponse.json({ error: "Only Super Admin can remove roles" }, { status: 403 });
    }

    const userId = parseInt((await ctx.params).id, 10);
    if (Number.isNaN(userId)) return NextResponse.json({ error: "Invalid user id" }, { status: 400 });

    const { searchParams } = new URL(req.url);
    const adminRoleId = parseInt(searchParams.get("adminRoleId") || "", 10);
    if (Number.isNaN(adminRoleId)) {
      return NextResponse.json({ error: "adminRoleId query param required" }, { status: 400 });
    }

    const [deleted] = await db
      .delete(userRoleAssignmentsTable)
      .where(
        and(
          eq(userRoleAssignmentsTable.userId, userId),
          eq(userRoleAssignmentsTable.adminRoleId, adminRoleId),
        ),
      )
      .returning();
    if (!deleted) return NextResponse.json({ error: "Assignment not found" }, { status: 404 });

    await logAdminAction(admin, "ADMIN_ROLE_REMOVED", "User", userId, { adminRoleId }, req);
    return NextResponse.json({ message: "Role removed" });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

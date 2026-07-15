import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  adminRolesTable,
  adminPermissionsTable,
  adminRolePermissionsTable,
  userRoleAssignmentsTable,
  usersTable,
  sessionsTable,
  auditLogsTable,
  notificationsTable,
} from "@/lib/schema";
import { eq, and } from "drizzle-orm";
import type { AuthUser } from "@/lib/legal-auth";
import { isAdmin as isPlatformAdmin, requireUser, isAuthUser, writeAuditLog, clientIp } from "@/lib/legal-auth";

export const ADMIN_ROLE_NAMES = [
  "SUPER_ADMIN",
  "OPERATIONS_ADMIN",
  "FINANCE_ADMIN",
  "SUPPORT_ADMIN",
] as const;

export const ADMIN_MODULES = [
  "users",
  "listings",
  "categories",
  "transactions",
  "disputes",
  "support",
  "reviews",
  "verifications",
  "roles",
  "dashboard",
  "search",
  "content",
] as const;

export const ADMIN_ACTIONS = [
  "read",
  "write",
  "approve",
  "reject",
  "export",
  "assign",
  "suspend",
  "manage",
] as const;

const ROLE_PERMISSIONS: Record<string, string[]> = {
  SUPER_ADMIN: ["*:*"],
  OPERATIONS_ADMIN: [
    "users:read",
    "users:write",
    "users:suspend",
    "listings:read",
    "listings:write",
    "listings:approve",
    "listings:reject",
    "categories:read",
    "categories:write",
    "categories:manage",
    "reviews:read",
    "reviews:approve",
    "reviews:reject",
    "verifications:read",
    "verifications:approve",
    "verifications:reject",
    "dashboard:read",
    "search:read",
    "content:read",
    "content:write",
    "content:manage",
  ],
  FINANCE_ADMIN: [
    "transactions:read",
    "transactions:write",
    "transactions:export",
    "users:read",
    "dashboard:read",
    "search:read",
  ],
  SUPPORT_ADMIN: [
    "disputes:read",
    "disputes:write",
    "disputes:assign",
    "support:read",
    "support:write",
    "support:assign",
    "users:read",
    "dashboard:read",
    "search:read",
    "content:read",
  ],
};

export type AdminContext = AuthUser & {
  adminRoles: string[];
  permissions: string[];
  isSuperAdmin: boolean;
};

let seeded = false;

export async function ensureAdminSeed() {
  if (seeded) return;
  try {
    const [existing] = await db.select().from(adminRolesTable).limit(1);
    if (existing) {
      seeded = true;
      return;
    }
  } catch {
    return;
  }

  for (const module of ADMIN_MODULES) {
    for (const action of ADMIN_ACTIONS) {
      try {
        await db.insert(adminPermissionsTable).values({
          module,
          action,
          description: `${action} on ${module}`,
        });
      } catch {
        /* unique */
      }
    }
  }

  for (const name of ADMIN_ROLE_NAMES) {
    const [role] = await db
      .insert(adminRolesTable)
      .values({
        name,
        description: `${name.replaceAll("_", " ")} role`,
        permissions: JSON.stringify(ROLE_PERMISSIONS[name] || []),
        isSystem: true,
      })
      .returning();

    const perms = ROLE_PERMISSIONS[name] || [];
    if (perms.includes("*:*")) continue;
    for (const key of perms) {
      const [mod, act] = key.split(":");
      const [perm] = await db
        .select()
        .from(adminPermissionsTable)
        .where(and(eq(adminPermissionsTable.module, mod!), eq(adminPermissionsTable.action, act!)))
        .limit(1);
      if (perm) {
        try {
          await db.insert(adminRolePermissionsTable).values({
            adminRoleId: role.id,
            permissionId: perm.id,
          });
        } catch {
          /* */
        }
      }
    }
  }
  seeded = true;
}

export async function loadAdminContext(user: AuthUser): Promise<AdminContext | null> {
  await ensureAdminSeed();

  let assignments: { roleName: string; permissions: string | null }[] = [];
  try {
    assignments = await db
      .select({
        roleName: adminRolesTable.name,
        permissions: adminRolesTable.permissions,
      })
      .from(userRoleAssignmentsTable)
      .innerJoin(adminRolesTable, eq(userRoleAssignmentsTable.adminRoleId, adminRolesTable.id))
      .where(eq(userRoleAssignmentsTable.userId, user.id));
  } catch {
    assignments = [];
  }

  const adminRoles = assignments.map((a) => a.roleName);
  if (isPlatformAdmin(user) && !adminRoles.includes("SUPER_ADMIN")) {
    adminRoles.push("SUPER_ADMIN");
  }
  if (adminRoles.length === 0 && user.isAdminUser) {
    adminRoles.push("SUPER_ADMIN");
  }

  if (adminRoles.length === 0) return null;

  const isSuperAdmin =
    adminRoles.includes("SUPER_ADMIN") || isPlatformAdmin(user) || !!user.isAdminUser;
  const permissions = new Set<string>();
  if (isSuperAdmin) {
    permissions.add("*:*");
  } else {
    for (const a of assignments) {
      try {
        const list = JSON.parse(a.permissions || "[]") as string[];
        list.forEach((p) => permissions.add(p));
      } catch {
        /* */
      }
    }
  }

  return {
    ...user,
    adminRoles,
    permissions: [...permissions],
    isSuperAdmin,
  };
}

export function hasPermission(admin: AdminContext, module: string, action: string): boolean {
  if (admin.isSuperAdmin || admin.permissions.includes("*:*")) return true;
  return (
    admin.permissions.includes(`${module}:${action}`) ||
    admin.permissions.includes(`${module}:manage`) ||
    (action === "read" && admin.permissions.includes(`${module}:write`))
  );
}

export async function requireAdmin(
  req: NextRequest,
  module?: string,
  action?: string,
): Promise<AdminContext | NextResponse> {
  const user = await requireUser(req);
  if (!isAuthUser(user)) return user;

  const admin = await loadAdminContext(user);
  if (!admin) {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  if (module && action && !hasPermission(admin, module, action)) {
    return NextResponse.json(
      { error: "Insufficient permissions", required: `${module}:${action}` },
      { status: 403 },
    );
  }

  return admin;
}

export function isAdminContext(v: AdminContext | NextResponse): v is AdminContext {
  return typeof (v as AdminContext).id === "number" && Array.isArray((v as AdminContext).permissions);
}

export async function logAdminAction(
  admin: AdminContext,
  action: string,
  entityType: string,
  entityId?: number | null,
  metadata?: Record<string, unknown>,
  req?: NextRequest,
) {
  await writeAuditLog({
    actorUserId: admin.id,
    action,
    entityType,
    entityId: entityId ?? null,
    metadata: { ...metadata, adminRoles: admin.adminRoles },
    ipAddress: req ? clientIp(req) : undefined,
  });
}

export function slugify(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 200);
}

export function escapeCsv(value: unknown): string {
  const s = value == null ? "" : String(value);
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

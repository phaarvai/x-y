import {
  db,
  adminRolesTable,
  adminPermissionsTable,
  adminRolePermissionsTable,
  userRoleAssignmentsTable,
} from "@workspace/db";
import { eq, and, inArray } from "drizzle-orm";
import type { Request, Response } from "express";
import { requireUser, isAdmin as isPlatformAdmin, type AuthUser, writeAuditLog, clientIp } from "./auth";

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
  const [existing] = await db.select().from(adminRolesTable).limit(1);
  if (existing) {
    seeded = true;
    return;
  }

  const permKeys: { module: string; action: string; description: string }[] = [];
  for (const module of ADMIN_MODULES) {
    for (const action of ADMIN_ACTIONS) {
      permKeys.push({
        module,
        action,
        description: `${action} on ${module}`,
      });
    }
  }

  for (const p of permKeys) {
    try {
      await db.insert(adminPermissionsTable).values(p);
    } catch {
      /* unique */
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
        .where(and(eq(adminPermissionsTable.module, mod), eq(adminPermissionsTable.action, act)))
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

  const assignments = await db
    .select({
      roleName: adminRolesTable.name,
      permissions: adminRolesTable.permissions,
    })
    .from(userRoleAssignmentsTable)
    .innerJoin(adminRolesTable, eq(userRoleAssignmentsTable.adminRoleId, adminRolesTable.id))
    .where(eq(userRoleAssignmentsTable.userId, user.id));

  const adminRoles = assignments.map((a) => a.roleName);
  if (isPlatformAdmin(user) && !adminRoles.includes("SUPER_ADMIN")) {
    adminRoles.push("SUPER_ADMIN");
  }

  if (adminRoles.length === 0) return null;

  const isSuperAdmin = adminRoles.includes("SUPER_ADMIN") || isPlatformAdmin(user);
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
    admin.permissions.includes(`${module}:write`)
  );
}

export async function requireAdmin(
  req: Request,
  res: Response,
  module?: string,
  action?: string,
): Promise<AdminContext | null> {
  const user = await requireUser(req, res);
  if (!user) return null;

  const admin = await loadAdminContext(user);
  if (!admin) {
    res.status(403).json({ error: "Admin access required" });
    return null;
  }

  if (module && action && !hasPermission(admin, module, action)) {
    res.status(403).json({ error: "Insufficient permissions", required: `${module}:${action}` });
    return null;
  }

  return admin;
}

export async function logAdminAction(
  admin: AdminContext,
  action: string,
  entityType: string,
  entityId?: number | null,
  metadata?: Record<string, unknown>,
  req?: Request,
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

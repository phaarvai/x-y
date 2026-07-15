/**
 * EPIC 17 XFY-087 — Marketplace Role-Based Access Control
 *
 * Complements admin RBAC (admin-rbac.ts). Enforces:
 * - Permission checks by primaryRole
 * - Ownership validation
 * - Confidential resource authorization → HTTP 403
 */

import type { NextFunction, Request, Response } from "express";
import {
  db,
  platformRolesTable,
  platformPermissionsTable,
  platformRolePermissionsTable,
} from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireUser, isAdmin, type AuthUser, LEGAL_PROVIDER_ROLES } from "../lib/auth";
import { AppError } from "./error-handler";

export const PLATFORM_ROLES = [
  "PLATFORM_ADMIN",
  "MANUFACTURER",
  "VISIONARY",
  "VENDOR",
  "LABOR_SUPPLIER",
  "LOGISTICS_PROVIDER",
  "LEGAL_PROVIDER",
  "INVESTOR",
  "MARKET_LEAD",
  ...LEGAL_PROVIDER_ROLES,
] as const;

export const PERMISSIONS = [
  "view",
  "create",
  "update",
  "delete",
  "approve",
  "moderate",
  "export",
  "manage_users",
  "manage_payments",
  "manage_categories",
  "manage_reviews",
  "manage_disputes",
] as const;

export type PermissionCode = (typeof PERMISSIONS)[number];

/** Static fallback matrix when DB seed tables are empty */
const FALLBACK_ROLE_PERMISSIONS: Record<string, PermissionCode[]> = {
  PLATFORM_ADMIN: [...PERMISSIONS],
  MANUFACTURER: ["view", "create", "update", "delete", "export"],
  VISIONARY: ["view", "create", "update", "delete"],
  VENDOR: ["view", "create", "update", "delete"],
  LABOR_SUPPLIER: ["view", "create", "update", "delete"],
  LOGISTICS_PROVIDER: ["view", "create", "update", "delete"],
  LEGAL_PROVIDER: ["view", "create", "update", "delete", "approve"],
  INVESTOR: ["view", "create", "update"],
  MARKET_LEAD: ["view", "create", "update", "moderate"],
};

for (const legal of LEGAL_PROVIDER_ROLES) {
  FALLBACK_ROLE_PERMISSIONS[legal] = ["view", "create", "update", "delete", "approve"];
}

const permissionCache = new Map<string, { codes: Set<string>; at: number }>();
const CACHE_TTL_MS = 60_000;

export function normalizeRole(role: string | null | undefined): string | null {
  if (!role) return null;
  if ((LEGAL_PROVIDER_ROLES as readonly string[]).includes(role)) return "LEGAL_PROVIDER";
  return role;
}

export async function getPermissionsForRole(role: string | null | undefined): Promise<Set<string>> {
  const normalized = normalizeRole(role);
  if (!normalized) return new Set();
  if (normalized === "PLATFORM_ADMIN") return new Set(PERMISSIONS);

  const cached = permissionCache.get(normalized);
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) return cached.codes;

  try {
    const rows = await db
      .select({ code: platformPermissionsTable.code })
      .from(platformRolePermissionsTable)
      .innerJoin(platformRolesTable, eq(platformRolePermissionsTable.roleId, platformRolesTable.id))
      .innerJoin(
        platformPermissionsTable,
        eq(platformRolePermissionsTable.permissionId, platformPermissionsTable.id),
      )
      .where(eq(platformRolesTable.name, normalized));

    if (rows.length > 0) {
      const codes = new Set(rows.map((r) => r.code));
      permissionCache.set(normalized, { codes, at: Date.now() });
      return codes;
    }
  } catch {
    /* tables may not exist yet */
  }

  const fallback = new Set(FALLBACK_ROLE_PERMISSIONS[normalized] ?? ["view"]);
  permissionCache.set(normalized, { codes: fallback, at: Date.now() });
  return fallback;
}

export async function userHasPermission(
  user: AuthUser,
  permission: PermissionCode,
): Promise<boolean> {
  if (isAdmin(user)) return true;
  const perms = await getPermissionsForRole(user.primaryRole);
  return perms.has(permission);
}

/** Express middleware: require authenticated user with permission */
export function requirePermission(permission: PermissionCode) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = await requireUser(req, res);
      if (!user) return;
      const ok = await userHasPermission(user, permission);
      if (!ok) {
        return res.status(403).json({
          error: "Forbidden",
          code: "PERMISSION_DENIED",
          required: permission,
        });
      }
      (req as Request & { authUser?: AuthUser }).authUser = user;
      next();
    } catch (err) {
      next(err);
    }
  };
}

/** Require one of the listed platform roles (or admin) */
export function requirePlatformRoles(roles: string[]) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = await requireUser(req, res);
      if (!user) return;
      if (isAdmin(user)) {
        (req as Request & { authUser?: AuthUser }).authUser = user;
        return next();
      }
      const normalized = normalizeRole(user.primaryRole);
      const allowed = roles.map((r) => normalizeRole(r));
      if (!normalized || !allowed.includes(normalized)) {
        return res.status(403).json({
          error: "Forbidden — insufficient role",
          code: "ROLE_DENIED",
          requiredRoles: roles,
        });
      }
      (req as Request & { authUser?: AuthUser }).authUser = user;
      next();
    } catch (err) {
      next(err);
    }
  };
}

/**
 * Ownership validation: users cannot modify resources they do not own
 * unless they are admins or pass confidentialAuth.
 */
export function assertOwnership(opts: {
  user: AuthUser;
  ownerUserId: number | null | undefined;
  confidential?: boolean;
  explicitAuthorized?: boolean;
}): void {
  if (isAdmin(opts.user)) return;
  if (opts.confidential && !opts.explicitAuthorized) {
    throw new AppError(403, "Confidential resource requires explicit authorization", "CONFIDENTIAL");
  }
  if (opts.ownerUserId == null || opts.ownerUserId !== opts.user.id) {
    throw new AppError(403, "You do not own this resource", "NOT_OWNER");
  }
}

export function ownershipMiddleware(getOwnerId: (req: Request) => number | Promise<number | null>) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = (req as Request & { authUser?: AuthUser }).authUser ?? (await requireUser(req, res));
      if (!user) return;
      const ownerId = await getOwnerId(req);
      assertOwnership({ user, ownerUserId: ownerId });
      next();
    } catch (err) {
      if (err instanceof AppError) {
        return res.status(err.statusCode).json({ error: err.message, code: err.code });
      }
      next(err);
    }
  };
}

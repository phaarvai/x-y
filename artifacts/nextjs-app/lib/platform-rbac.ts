/**
 * EPIC 17 XFY-087 — Client/server-shared marketplace RBAC helpers for nextjs-app
 */

import type { AuthUser } from "@/lib/legal-auth";
import { isAdmin, LEGAL_PROVIDER_ROLES } from "@/lib/legal-auth";

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

const FALLBACK: Record<string, PermissionCode[]> = {
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

for (const r of LEGAL_PROVIDER_ROLES) {
  FALLBACK[r] = ["view", "create", "update", "delete", "approve"];
}

export function normalizeRole(role: string | null | undefined): string | null {
  if (!role) return null;
  if ((LEGAL_PROVIDER_ROLES as readonly string[]).includes(role)) return "LEGAL_PROVIDER";
  return role;
}

export function hasPlatformPermission(user: AuthUser, permission: PermissionCode): boolean {
  if (isAdmin(user)) return true;
  const role = normalizeRole(user.primaryRole);
  if (!role) return false;
  return (FALLBACK[role] ?? ["view"]).includes(permission);
}

export function assertResourceOwnership(opts: {
  user: AuthUser;
  ownerUserId: number | null | undefined;
  confidential?: boolean;
}): { ok: true } | { ok: false; status: 403; error: string } {
  if (isAdmin(opts.user)) return { ok: true };
  if (opts.confidential && opts.ownerUserId !== opts.user.id) {
    return { ok: false, status: 403, error: "Confidential resource requires authorization" };
  }
  if (opts.ownerUserId == null || opts.ownerUserId !== opts.user.id) {
    return { ok: false, status: 403, error: "You do not own this resource" };
  }
  return { ok: true };
}

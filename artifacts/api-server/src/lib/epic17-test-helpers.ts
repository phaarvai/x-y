/**
 * Pure helpers extracted for unit tests (mirrors middlewares/rbac ownership rules).
 * Intentionally does not import @workspace/db.
 */

import { AppError } from "../middlewares/error-handler";

const LEGAL = [
  "LEGAL_WRITER",
  "CORPORATE_LAWYER",
  "COMPLIANCE_CONSULTANT",
  "AUDITOR",
  "CHARTERED_ACCOUNTANT",
  "TAX_CONSULTANT",
  "COMPANY_SECRETARY",
  "INTELLECTUAL_PROPERTY_CONSULTANT",
] as const;

export type PermissionCode =
  | "view"
  | "create"
  | "update"
  | "delete"
  | "approve"
  | "moderate"
  | "export"
  | "manage_users"
  | "manage_payments"
  | "manage_categories"
  | "manage_reviews"
  | "manage_disputes";

export function normalizeRole(role: string | null | undefined): string | null {
  if (!role) return null;
  if ((LEGAL as readonly string[]).includes(role)) return "LEGAL_PROVIDER";
  return role;
}

export const FALLBACK_EXPORT: Record<string, PermissionCode[]> = {
  PLATFORM_ADMIN: [
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
  ],
  MANUFACTURER: ["view", "create", "update", "delete", "export"],
  VISIONARY: ["view", "create", "update", "delete"],
  VENDOR: ["view", "create", "update", "delete"],
  LABOR_SUPPLIER: ["view", "create", "update", "delete"],
  LOGISTICS_PROVIDER: ["view", "create", "update", "delete"],
  LEGAL_PROVIDER: ["view", "create", "update", "delete", "approve"],
  INVESTOR: ["view", "create", "update"],
  MARKET_LEAD: ["view", "create", "update", "moderate"],
};

export function assertOwnership(opts: {
  user: { id: number; isAdminUser?: boolean; primaryRole?: string | null };
  ownerUserId: number | null | undefined;
  confidential?: boolean;
  explicitAuthorized?: boolean;
}): void {
  if (opts.user.isAdminUser || opts.user.primaryRole === "PLATFORM_ADMIN") return;
  if (opts.confidential && !opts.explicitAuthorized) {
    throw new AppError(403, "Confidential resource requires explicit authorization", "CONFIDENTIAL");
  }
  if (opts.ownerUserId == null || opts.ownerUserId !== opts.user.id) {
    throw new AppError(403, "You do not own this resource", "NOT_OWNER");
  }
}

/**
 * Platform role definitions for X!Y.
 */

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
] as const;

export type PlatformRole = (typeof PLATFORM_ROLES)[number];

/** Legal suite sub-roles under LEGAL_PROVIDER */
export const LEGAL_SUITE_ROLES = [
  "LEGAL_WRITER",
  "CORPORATE_LAWYER",
  "COMPLIANCE_CONSULTANT",
  "AUDITOR",
  "CHARTERED_ACCOUNTANT",
  "TAX_CONSULTANT",
  "COMPANY_SECRETARY",
  "INTELLECTUAL_PROPERTY_CONSULTANT",
] as const;

export type LegalSuiteRole = (typeof LEGAL_SUITE_ROLES)[number];

/** Alias used in some legacy surfaces */
export const ADMIN_ROLE_ALIASES = ["PLATFORM_ADMIN", "ADMINISTRATOR", "ADMIN"] as const;

export const ALL_ROLES = [...PLATFORM_ROLES, ...LEGAL_SUITE_ROLES] as const;

export const ROLE_LABELS: Record<string, string> = {
  PLATFORM_ADMIN: "Platform Admin",
  MANUFACTURER: "Manufacturer",
  VISIONARY: "Visionary",
  VENDOR: "Vendor",
  LABOR_SUPPLIER: "Labor Supplier",
  LOGISTICS_PROVIDER: "Logistics Provider",
  LEGAL_PROVIDER: "Legal Provider",
  INVESTOR: "Investor",
  MARKET_LEAD: "Market Lead",
  LEGAL_WRITER: "Legal Writer",
  CORPORATE_LAWYER: "Corporate Lawyer",
  COMPLIANCE_CONSULTANT: "Compliance Consultant",
  AUDITOR: "Auditor",
  CHARTERED_ACCOUNTANT: "Chartered Accountant",
  TAX_CONSULTANT: "Tax Consultant",
  COMPANY_SECRETARY: "Company Secretary",
  INTELLECTUAL_PROPERTY_CONSULTANT: "IP Consultant",
};

export function isPlatformRole(role: string): role is PlatformRole {
  return (PLATFORM_ROLES as readonly string[]).includes(role);
}

export function isLegalSuiteRole(role: string): role is LegalSuiteRole {
  return (LEGAL_SUITE_ROLES as readonly string[]).includes(role);
}

export function isAdminRole(role: string | null | undefined): boolean {
  if (!role) return false;
  return (ADMIN_ROLE_ALIASES as readonly string[]).includes(role) || role === "PLATFORM_ADMIN";
}

export function normalizeRole(role: string | null | undefined): string | null {
  if (!role) return null;
  if (role === "ADMIN" || role === "ADMINISTRATOR") return "PLATFORM_ADMIN";
  return role;
}

export function roleLabel(role: string): string {
  return ROLE_LABELS[role] ?? role.replaceAll("_", " ");
}

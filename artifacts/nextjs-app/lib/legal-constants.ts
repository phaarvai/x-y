export const LEGAL_PROVIDER_ROLES = [
  "LEGAL_WRITER",
  "CORPORATE_LAWYER",
  "COMPLIANCE_CONSULTANT",
  "AUDITOR",
  "CHARTERED_ACCOUNTANT",
  "TAX_CONSULTANT",
  "COMPANY_SECRETARY",
  "INTELLECTUAL_PROPERTY_CONSULTANT",
] as const;

export const PROVIDER_TYPE_LABELS: Record<string, string> = {
  LEGAL_WRITER: "Legal Writer",
  CORPORATE_LAWYER: "Corporate Lawyer",
  COMPLIANCE_CONSULTANT: "Compliance Consultant",
  AUDITOR: "Auditor",
  CHARTERED_ACCOUNTANT: "Chartered Accountant",
  TAX_CONSULTANT: "Tax Consultant",
  COMPANY_SECRETARY: "Company Secretary",
  INTELLECTUAL_PROPERTY_CONSULTANT: "Intellectual Property Consultant",
};

export const CONTRACT_CATEGORIES = [
  "NDA",
  "MACHINERY_LEASE_AGREEMENT",
  "MANUFACTURING_AGREEMENT",
  "PRODUCTION_AGREEMENT",
  "SERVICE_AGREEMENT",
  "SUPPLY_AGREEMENT",
  "VENDOR_AGREEMENT",
  "PURCHASE_AGREEMENT",
  "MAINTENANCE_AGREEMENT",
  "CONSULTING_AGREEMENT",
  "LIABILITY_WAIVER",
  "QUALITY_ASSURANCE_AGREEMENT",
  "CUSTOM_AGREEMENT",
] as const;

export const DISPUTE_CATEGORIES = [
  "PAYMENT",
  "QUALITY",
  "DELAY",
  "DAMAGED_GOODS",
  "MISCOMMUNICATION",
  "LEGAL",
  "CONTRACT_VIOLATION",
  "OTHER",
] as const;

export const DISPUTE_STATUSES = [
  "OPEN",
  "UNDER_REVIEW",
  "AWAITING_RESPONSE",
  "RESOLVED",
  "REJECTED",
  "CLOSED",
] as const;

export function formatCategory(value: string) {
  return value
    .split("_")
    .map((w) => w.charAt(0) + w.slice(1).toLowerCase())
    .join(" ");
}

export function isLegalProviderRole(role: string | null | undefined): boolean {
  return !!role && (LEGAL_PROVIDER_ROLES as readonly string[]).includes(role);
}

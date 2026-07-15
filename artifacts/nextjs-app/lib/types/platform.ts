import type { PlatformRole, LegalSuiteRole } from "@/lib/config/roles";

export type Role = PlatformRole | LegalSuiteRole | "ADMINISTRATOR";

export type Permission =
  | "read"
  | "write"
  | "approve"
  | "reject"
  | "export"
  | "assign"
  | "suspend"
  | "manage";

export type PermissionKey = `${string}:${Permission}` | "*:*";

export interface PlatformUser {
  id: number;
  name: string;
  email: string;
  preferredLanguage: string;
  primaryRole?: Role | string | null;
  createdAt?: string;
  isAdminUser?: boolean;
  adminRoles?: string[];
}

export interface RoleContext {
  role: Role;
  permissions: PermissionKey[];
  homePath: string;
}

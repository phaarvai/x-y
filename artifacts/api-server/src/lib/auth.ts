import type { Request, Response } from "express";
import {
  db,
  usersTable,
  sessionsTable,
  auditLogsTable,
  notificationsTable,
  userRoleAssignmentsTable,
  adminRolesTable,
} from "@workspace/db";
import { eq } from "drizzle-orm";

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

export const PROVIDER_TYPES = LEGAL_PROVIDER_ROLES;

export const ADMIN_ROLE = "PLATFORM_ADMIN";

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

export const PRODUCTION_BLOCKED_STATUSES = ["PRODUCTION", "IN_PROGRESS", "IN_PRODUCTION", "COMPLETED"];

export type AuthUser = {
  id: number;
  name: string;
  email: string;
  preferredLanguage: string;
  primaryRole: string | null;
  createdAt: Date;
  status?: string;
  /** True when user has PLATFORM_ADMIN or any admin role assignment */
  isAdminUser?: boolean;
  adminRoles?: string[];
};

export function getBearerToken(req: Request): string | null {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) return null;
  return header.slice(7).trim() || null;
}

export function clientIp(req: Request): string {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded.length > 0) {
    return forwarded.split(",")[0].trim();
  }
  return req.socket.remoteAddress ?? "unknown";
}

export async function requireUser(req: Request, res: Response): Promise<AuthUser | null> {
  const token = getBearerToken(req);
  if (!token) {
    res.status(401).json({ error: "Not authenticated" });
    return null;
  }

  const [session] = await db.select().from(sessionsTable).where(eq(sessionsTable.token, token)).limit(1);
  if (!session || session.expiresAt < new Date()) {
    res.status(401).json({ error: "Session expired" });
    return null;
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, session.userId)).limit(1);
  if (!user) {
    res.status(401).json({ error: "User not found" });
    return null;
  }

  if (user.status === "SUSPENDED" || user.status === "DEACTIVATED") {
    res.status(403).json({ error: "Account suspended", status: user.status });
    return null;
  }

  let adminRoles: string[] = [];
  try {
    const assignments = await db
      .select({ name: adminRolesTable.name })
      .from(userRoleAssignmentsTable)
      .innerJoin(adminRolesTable, eq(userRoleAssignmentsTable.adminRoleId, adminRolesTable.id))
      .where(eq(userRoleAssignmentsTable.userId, user.id));
    adminRoles = assignments.map((a) => a.name);
  } catch {
    /* tables may not exist yet during migration */
  }

  const isAdminUser = user.primaryRole === ADMIN_ROLE || adminRoles.length > 0;

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    preferredLanguage: user.preferredLanguage,
    primaryRole: user.primaryRole ?? null,
    createdAt: user.createdAt,
    status: user.status ?? "ACTIVE",
    isAdminUser,
    adminRoles,
  };
}

export function requireRoles(user: AuthUser, roles: string[]): boolean {
  if (!user.primaryRole) return false;
  return roles.includes(user.primaryRole);
}

export function isLegalProviderRole(role: string | null | undefined): boolean {
  if (!role) return false;
  return (LEGAL_PROVIDER_ROLES as readonly string[]).includes(role);
}

export function isAdmin(user: AuthUser): boolean {
  return user.primaryRole === ADMIN_ROLE || !!user.isAdminUser;
}

export function escapeHtml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const BLOCKED_EXTENSIONS = new Set([
  "exe",
  "bat",
  "cmd",
  "com",
  "msi",
  "scr",
  "js",
  "jar",
  "sh",
  "ps1",
  "dll",
  "vbs",
]);

const ALLOWED_DOC_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
]);

export function isAllowedUpload(fileName: string, fileType: string): boolean {
  const ext = fileName.split(".").pop()?.toLowerCase() ?? "";
  if (BLOCKED_EXTENSIONS.has(ext)) return false;
  if (!ALLOWED_DOC_TYPES.has(fileType) && !fileType.startsWith("image/") && fileType !== "application/pdf") {
    return false;
  }
  return true;
}

export async function writeAuditLog(params: {
  actorUserId?: number | null;
  action: string;
  entityType: string;
  entityId?: number | null;
  metadata?: Record<string, unknown>;
  oldValue?: unknown;
  newValue?: unknown;
  ipAddress?: string;
  userAgent?: string;
}) {
  await db.insert(auditLogsTable).values({
    actorUserId: params.actorUserId ?? null,
    action: params.action,
    entityType: params.entityType,
    entityId: params.entityId ?? null,
    metadata: params.metadata ? JSON.stringify(params.metadata) : null,
    oldValue:
      params.oldValue === undefined
        ? null
        : typeof params.oldValue === "string"
          ? params.oldValue
          : JSON.stringify(params.oldValue),
    newValue:
      params.newValue === undefined
        ? null
        : typeof params.newValue === "string"
          ? params.newValue
          : JSON.stringify(params.newValue),
    ipAddress: params.ipAddress ?? null,
    userAgent: params.userAgent ?? null,
  });
}

export async function createNotification(params: {
  userId: number;
  eventType: string;
  title: string;
  description?: string;
  relatedType?: string;
  relatedId?: number;
  category?: string;
}) {
  await db.insert(notificationsTable).values({
    userId: params.userId,
    category: params.category ?? "LEGAL",
    eventType: params.eventType,
    title: params.title,
    description: params.description ?? null,
    relatedType: params.relatedType ?? null,
    relatedId: params.relatedId ?? null,
    status: "UNREAD",
  });
}

export function serializeUser(user: AuthUser) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    preferredLanguage: user.preferredLanguage,
    primaryRole: user.primaryRole,
    createdAt: user.createdAt.toISOString(),
  };
}

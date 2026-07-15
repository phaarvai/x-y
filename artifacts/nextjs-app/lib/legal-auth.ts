import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  usersTable,
  sessionsTable,
  auditLogsTable,
  notificationsTable,
  userRoleAssignmentsTable,
  adminRolesTable,
} from "@/lib/schema";
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

export type AuthUser = {
  id: number;
  name: string;
  email: string;
  preferredLanguage: string;
  primaryRole: string | null;
  status?: string;
  isAdminUser?: boolean;
  adminRoles?: string[];
};

export function escapeHtml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function clientIp(req: NextRequest): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
}

export async function requireUser(req: NextRequest): Promise<AuthUser | NextResponse> {
  const token = req.headers.get("authorization")?.replace("Bearer ", "");
  if (!token) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const [session] = await db.select().from(sessionsTable).where(eq(sessionsTable.token, token)).limit(1);
  if (!session || session.expiresAt < new Date()) {
    return NextResponse.json({ error: "Session expired" }, { status: 401 });
  }
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, session.userId)).limit(1);
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 401 });

  if (user.status === "SUSPENDED" || user.status === "DEACTIVATED") {
    return NextResponse.json({ error: "Account suspended", status: user.status }, { status: 403 });
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
    /* migration pending */
  }

  const isAdminUser = user.primaryRole === "PLATFORM_ADMIN" || adminRoles.length > 0;

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    preferredLanguage: user.preferredLanguage,
    primaryRole: user.primaryRole ?? null,
    status: user.status ?? "ACTIVE",
    isAdminUser,
    adminRoles,
  };
}

export function isAuthUser(v: AuthUser | NextResponse): v is AuthUser {
  return typeof (v as AuthUser).id === "number";
}

export function isLegalProviderRole(role: string | null): boolean {
  return !!role && (LEGAL_PROVIDER_ROLES as readonly string[]).includes(role);
}

export function isAdmin(user: AuthUser): boolean {
  return user.primaryRole === "PLATFORM_ADMIN" || !!user.isAdminUser;
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

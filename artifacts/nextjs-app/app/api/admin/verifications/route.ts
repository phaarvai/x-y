import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verificationsTable, verificationHistoryTable } from "@/lib/schema";
import { and, desc, eq, sql } from "drizzle-orm";
import { z } from "zod";
import {
  requireUser,
  isAuthUser,
  isAdmin,
  writeAuditLog,
  clientIp,
  escapeHtml,
} from "@/lib/legal-auth";
import { serializeVerification, expireStaleVerifications } from "@/lib/reviews";

const VERIFICATION_ENTITY_TYPES = [
  "USER",
  "MANUFACTURER",
  "MANUFACTURING_FACILITY",
  "VENDOR",
  "LEGAL_PROVIDER",
  "LOGISTICS_PROVIDER",
  "LABOR_SUPPLIER",
  "INVESTOR",
  "MARKET_LEAD",
] as const;

const VERIFICATION_TYPES = [
  "IDENTITY",
  "BUSINESS",
  "FACILITY",
  "CERTIFICATION",
  "COMPLIANCE",
] as const;

const createVerificationBody = z.object({
  entityType: z.enum(VERIFICATION_ENTITY_TYPES),
  entityId: z.number().int().positive(),
  verificationType: z.enum(VERIFICATION_TYPES),
  verificationReason: z.string().max(1000).optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
  expiresAt: z.string().optional().nullable(),
});

async function appendHistory(params: {
  verificationId: number;
  action: string;
  fromStatus: string | null;
  toStatus: string;
  performedBy?: number | null;
  notes?: string | null;
}) {
  await db.insert(verificationHistoryTable).values({
    verificationId: params.verificationId,
    action: params.action,
    fromStatus: params.fromStatus,
    toStatus: params.toStatus,
    performedBy: params.performedBy ?? null,
    notes: params.notes ?? null,
  });
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser(req);
    if (!isAuthUser(user)) return user;
    if (!isAdmin(user)) return NextResponse.json({ error: "Admin only" }, { status: 403 });

    const parsed = createVerificationBody.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const [row] = await db
      .insert(verificationsTable)
      .values({
        entityType: parsed.data.entityType,
        entityId: parsed.data.entityId,
        verificationType: parsed.data.verificationType,
        status: "PENDING",
        verificationReason: parsed.data.verificationReason
          ? escapeHtml(parsed.data.verificationReason)
          : null,
        notes: parsed.data.notes ? escapeHtml(parsed.data.notes) : null,
        expiresAt: parsed.data.expiresAt ? new Date(parsed.data.expiresAt) : null,
      })
      .returning();

    await appendHistory({
      verificationId: row.id,
      action: "CREATED",
      fromStatus: null,
      toStatus: "PENDING",
      performedBy: user.id,
    });

    await writeAuditLog({
      actorUserId: user.id,
      action: "VERIFICATION_CREATED",
      entityType: "Verification",
      entityId: row.id,
      ipAddress: clientIp(req),
    });

    return NextResponse.json(serializeVerification(row), { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const user = await requireUser(req);
    if (!isAuthUser(user)) return user;
    if (!isAdmin(user)) return NextResponse.json({ error: "Admin only" }, { status: 403 });

    await expireStaleVerifications();

    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") || "20", 10) || 20));
    const status = searchParams.get("status") || undefined;
    const entityType = searchParams.get("entityType") || undefined;
    const verificationType = searchParams.get("verificationType") || undefined;

    const conditions = [];
    if (status) conditions.push(eq(verificationsTable.status, status));
    if (entityType) conditions.push(eq(verificationsTable.entityType, entityType));
    if (verificationType) {
      conditions.push(eq(verificationsTable.verificationType, verificationType));
    }
    const where = conditions.length ? and(...conditions) : undefined;

    const rows = await db
      .select()
      .from(verificationsTable)
      .where(where)
      .orderBy(desc(verificationsTable.createdAt))
      .limit(limit)
      .offset((page - 1) * limit);
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(verificationsTable)
      .where(where);

    return NextResponse.json({
      items: rows.map(serializeVerification),
      total: count,
      page,
      limit,
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

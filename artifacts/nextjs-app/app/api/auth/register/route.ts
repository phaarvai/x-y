import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { usersTable, sessionsTable } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";
import {
  hashPassword,
  validatePasswordPolicy,
  generateSecureToken,
  hashToken,
} from "@/lib/password";
import { checkRateLimit, RATE_LIMITS, clientIpFromHeaders } from "@/lib/rate-limit";
import { rateLimited } from "@/lib/api-errors";
import { authTokensTable } from "@/lib/schema";
import { enqueueJob } from "@/lib/jobs";

const ALLOWED_SELF_ROLES = [
  "VISIONARY",
  "MANUFACTURER",
  "VENDOR",
  "LABOR_SUPPLIER",
  "LOGISTICS_PROVIDER",
  "INVESTOR",
  "MARKET_LEAD",
  "LEGAL_WRITER",
  "CORPORATE_LAWYER",
  "COMPLIANCE_CONSULTANT",
  "AUDITOR",
  "CHARTERED_ACCOUNTANT",
  "TAX_CONSULTANT",
  "COMPANY_SECRETARY",
  "INTELLECTUAL_PROPERTY_CONSULTANT",
] as const;

const RegisterBody = z.object({
  name: z.string().min(1).max(255),
  email: z.string().email().max(255),
  password: z.string().min(8).max(128),
  preferredLanguage: z.string().optional(),
  primaryRole: z.enum(ALLOWED_SELF_ROLES).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const ip = clientIpFromHeaders(req.headers);
    const rl = checkRateLimit("register", ip, RATE_LIMITS.register.limit, RATE_LIMITS.register.windowMs);
    if (!rl.allowed) return rateLimited(rl.resetAt, rl.limit, rl.remaining);

    const body = await req.json();
    const parsed = RegisterBody.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });

    const { name, email, password, preferredLanguage, primaryRole } = parsed.data;
    const policy = validatePasswordPolicy(password);
    if (!policy.ok) {
      return NextResponse.json({ error: "Password does not meet policy", details: policy.errors }, { status: 400 });
    }

    const existing = await db.select().from(usersTable).where(eq(usersTable.email, email)).limit(1);
    if (existing.length > 0) return NextResponse.json({ error: "User already exists" }, { status: 409 });

    const [user] = await db.insert(usersTable).values({
      name,
      email,
      passwordHash: hashPassword(password),
      preferredLanguage: preferredLanguage ?? "en",
      primaryRole: primaryRole ?? null,
      profileStatus: "PENDING_PROFILE",
    }).returning();

    const verifyToken = generateSecureToken();
    await db.insert(authTokensTable).values({
      userId: user.id,
      email: user.email,
      purpose: "EMAIL_VERIFY",
      tokenHash: hashToken(verifyToken),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    });
    await enqueueJob("SEND_EMAIL", {
      to: user.email,
      template: "EMAIL_VERIFY",
      token: verifyToken,
      userId: user.id,
    }, { idempotencyKey: `EMAIL_VERIFY:${user.id}:${Date.now()}` });

    const token = generateSecureToken();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await db.insert(sessionsTable).values({ userId: user.id, token, expiresAt });

    return NextResponse.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        preferredLanguage: user.preferredLanguage,
        primaryRole: user.primaryRole ?? null,
        createdAt: user.createdAt.toISOString(),
      },
      token,
      emailVerificationRequired: true,
    }, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { usersTable, authTokensTable } from "@/lib/schema";
import { and, eq, isNull, gt, desc } from "drizzle-orm";
import { z } from "zod";
import { hashToken, generateSecureToken, generateOtpCode } from "@/lib/password";
import { checkRateLimit, RATE_LIMITS, clientIpFromHeaders } from "@/lib/rate-limit";
import { rateLimited } from "@/lib/api-errors";
import { requireUser, isAuthUser } from "@/lib/legal-auth";
import { enqueueJob } from "@/lib/jobs";

const VerifyBody = z.object({ token: z.string().min(16) });
const OtpRequestBody = z.object({ purpose: z.enum(["LOGIN_OTP", "EMAIL_VERIFY"]).default("EMAIL_VERIFY") });
const OtpVerifyBody = z.object({
  purpose: z.enum(["LOGIN_OTP", "EMAIL_VERIFY"]),
  code: z.string().min(4).max(8),
});

/** Confirm email verification token */
export async function POST(req: NextRequest) {
  try {
    const parsed = VerifyBody.safeParse(await req.json());
    if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

    const tokenHash = hashToken(parsed.data.token);
    const [row] = await db
      .select()
      .from(authTokensTable)
      .where(
        and(
          eq(authTokensTable.tokenHash, tokenHash),
          eq(authTokensTable.purpose, "EMAIL_VERIFY"),
          isNull(authTokensTable.usedAt),
          gt(authTokensTable.expiresAt, new Date()),
        ),
      )
      .limit(1);

    if (!row?.userId) {
      return NextResponse.json({ error: "Invalid or expired verification token" }, { status: 400 });
    }

    await db
      .update(usersTable)
      .set({ emailVerifiedAt: new Date(), updatedAt: new Date() })
      .where(eq(usersTable.id, row.userId));
    await db.update(authTokensTable).set({ usedAt: new Date() }).where(eq(authTokensTable.id, row.id));

    return NextResponse.json({ ok: true, verified: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/** Request OTP (authenticated) */
export async function PUT(req: NextRequest) {
  try {
    const user = await requireUser(req);
    if (!isAuthUser(user)) return user;

    const ip = clientIpFromHeaders(req.headers);
    const rl = checkRateLimit("otp", `${ip}:${user.id}`, RATE_LIMITS.otp.limit, RATE_LIMITS.otp.windowMs);
    if (!rl.allowed) return rateLimited(rl.resetAt, rl.limit, rl.remaining);

    const parsed = OtpRequestBody.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

    const code = generateOtpCode(6);
    const token = generateSecureToken(16);
    await db.insert(authTokensTable).values({
      userId: user.id,
      email: user.email,
      purpose: parsed.data.purpose,
      tokenHash: hashToken(token),
      codeHash: hashToken(code),
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
    });
    await enqueueJob("SEND_EMAIL", {
      to: user.email,
      template: "OTP",
      code,
      purpose: parsed.data.purpose,
    });

    return NextResponse.json({
      ok: true,
      message: "OTP sent",
      // Dev helper — never return code in production
      ...(process.env.NODE_ENV !== "production" ? { devCode: code, challengeToken: token } : { challengeToken: token }),
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/** Verify OTP */
export async function PATCH(req: NextRequest) {
  try {
    const user = await requireUser(req);
    if (!isAuthUser(user)) return user;

    const parsed = OtpVerifyBody.safeParse(await req.json());
    if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

    const [row] = await db
      .select()
      .from(authTokensTable)
      .where(
        and(
          eq(authTokensTable.userId, user.id),
          eq(authTokensTable.purpose, parsed.data.purpose),
          isNull(authTokensTable.usedAt),
          gt(authTokensTable.expiresAt, new Date()),
        ),
      )
      .orderBy(desc(authTokensTable.id))
      .limit(1);

    if (!row?.codeHash) {
      return NextResponse.json({ error: "No active OTP" }, { status: 400 });
    }

    if (row.attempts >= 5) {
      return NextResponse.json({ error: "Too many OTP attempts" }, { status: 429 });
    }

    const ok = row.codeHash === hashToken(parsed.data.code);
    await db
      .update(authTokensTable)
      .set({ attempts: (row.attempts ?? 0) + 1, ...(ok ? { usedAt: new Date() } : {}) })
      .where(eq(authTokensTable.id, row.id));

    if (!ok) return NextResponse.json({ error: "Invalid OTP" }, { status: 400 });

    if (parsed.data.purpose === "EMAIL_VERIFY") {
      await db
        .update(usersTable)
        .set({ emailVerifiedAt: new Date(), updatedAt: new Date() })
        .where(eq(usersTable.id, user.id));
    }

    return NextResponse.json({ ok: true, verified: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

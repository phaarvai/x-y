import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { usersTable, authTokensTable, sessionsTable } from "@/lib/schema";
import { and, eq, isNull, gt } from "drizzle-orm";
import { z } from "zod";
import { hashPassword, validatePasswordPolicy, hashToken } from "@/lib/password";
import { checkRateLimit, RATE_LIMITS, clientIpFromHeaders } from "@/lib/rate-limit";
import { rateLimited } from "@/lib/api-errors";

const Body = z.object({
  token: z.string().min(16),
  password: z.string().min(8).max(128),
});

export async function POST(req: NextRequest) {
  try {
    const ip = clientIpFromHeaders(req.headers);
    const rl = checkRateLimit("passwordReset", `${ip}:consume`, RATE_LIMITS.passwordReset.limit, RATE_LIMITS.passwordReset.windowMs);
    if (!rl.allowed) return rateLimited(rl.resetAt, rl.limit, rl.remaining);

    const parsed = Body.safeParse(await req.json());
    if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

    const policy = validatePasswordPolicy(parsed.data.password);
    if (!policy.ok) {
      return NextResponse.json({ error: "Password does not meet policy", details: policy.errors }, { status: 400 });
    }

    const tokenHash = hashToken(parsed.data.token);
    const [row] = await db
      .select()
      .from(authTokensTable)
      .where(
        and(
          eq(authTokensTable.tokenHash, tokenHash),
          eq(authTokensTable.purpose, "PASSWORD_RESET"),
          isNull(authTokensTable.usedAt),
          gt(authTokensTable.expiresAt, new Date()),
        ),
      )
      .limit(1);

    if (!row?.userId) {
      return NextResponse.json({ error: "Invalid or expired reset token" }, { status: 400 });
    }

    await db
      .update(usersTable)
      .set({ passwordHash: hashPassword(parsed.data.password), updatedAt: new Date() })
      .where(eq(usersTable.id, row.userId));

    await db
      .update(authTokensTable)
      .set({ usedAt: new Date() })
      .where(eq(authTokensTable.id, row.id));

    // Invalidate existing sessions for account security
    await db.delete(sessionsTable).where(eq(sessionsTable.userId, row.userId));

    return NextResponse.json({ ok: true, message: "Password updated. Please sign in again." });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { usersTable, authTokensTable } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { generateSecureToken, hashToken } from "@/lib/password";
import { checkRateLimit, RATE_LIMITS, clientIpFromHeaders } from "@/lib/rate-limit";
import { rateLimited } from "@/lib/api-errors";
import { enqueueJob } from "@/lib/jobs";

const Body = z.object({ email: z.string().email() });

/**
 * Always returns 200 to avoid email enumeration.
 * Issues a single-use reset token (1 hour TTL).
 */
export async function POST(req: NextRequest) {
  try {
    const ip = clientIpFromHeaders(req.headers);
    const rl = checkRateLimit("passwordReset", ip, RATE_LIMITS.passwordReset.limit, RATE_LIMITS.passwordReset.windowMs);
    if (!rl.allowed) return rateLimited(rl.resetAt, rl.limit, rl.remaining);

    const parsed = Body.safeParse(await req.json());
    if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

    const [user] = await db.select().from(usersTable).where(eq(usersTable.email, parsed.data.email)).limit(1);
    if (user) {
      const token = generateSecureToken();
      await db.insert(authTokensTable).values({
        userId: user.id,
        email: user.email,
        purpose: "PASSWORD_RESET",
        tokenHash: hashToken(token),
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      });
      await enqueueJob("SEND_EMAIL", {
        to: user.email,
        template: "PASSWORD_RESET",
        token,
        userId: user.id,
      });
    }

    return NextResponse.json({
      ok: true,
      message: "If an account exists for that email, a reset link has been sent.",
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { usersTable, sessionsTable, userLoginHistoryTable } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { clientIp } from "@/lib/legal-auth";
import { verifyPassword, hashPassword, generateSecureToken } from "@/lib/password";
import { checkRateLimit, RATE_LIMITS, clientIpFromHeaders } from "@/lib/rate-limit";
import { rateLimited } from "@/lib/api-errors";

const LoginBody = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function POST(req: NextRequest) {
  try {
    const ip = clientIpFromHeaders(req.headers);
    const rl = checkRateLimit("login", ip, RATE_LIMITS.login.limit, RATE_LIMITS.login.windowMs);
    if (!rl.allowed) return rateLimited(rl.resetAt, rl.limit, rl.remaining);

    const body = await req.json();
    const parsed = LoginBody.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

    const { email, password } = parsed.data;
    const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email)).limit(1);
    const verified = user ? verifyPassword(password, user.passwordHash) : { ok: false, needsRehash: false };

    if (!user || !verified.ok) {
      try {
        if (user) {
          await db.insert(userLoginHistoryTable).values({
            userId: user.id,
            ipAddress: clientIp(req),
            userAgent: req.headers.get("user-agent") ?? undefined,
            success: false,
          });
        }
      } catch { /* */ }
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    if (user.status === "SUSPENDED" || user.status === "DEACTIVATED") {
      return NextResponse.json({ error: "Account suspended", status: user.status }, { status: 403 });
    }

    if (verified.needsRehash) {
      try {
        await db
          .update(usersTable)
          .set({ passwordHash: hashPassword(password), updatedAt: new Date() })
          .where(eq(usersTable.id, user.id));
      } catch { /* non-blocking */ }
    }

    const token = generateSecureToken();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await db.insert(sessionsTable).values({ userId: user.id, token, expiresAt });
    try {
      await db.insert(userLoginHistoryTable).values({
        userId: user.id,
        ipAddress: clientIp(req),
        userAgent: req.headers.get("user-agent") ?? undefined,
        success: true,
      });
    } catch { /* */ }

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
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

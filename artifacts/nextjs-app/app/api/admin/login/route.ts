import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { usersTable, sessionsTable, userLoginHistoryTable } from "@/lib/schema";
import {
  ensureAdminSeed,
  loadAdminContext,
  logAdminAction,
  requireAdmin,
  isAdminContext,
} from "@/lib/admin-rbac";
import { clientIp, requireUser, isAuthUser, getBearerTokenSafe } from "@/lib/admin-auth-helpers";
import { verifyPassword, hashPassword, generateSecureToken } from "@/lib/password";

const loginBody = z.object({
  email: z.string().email().max(255),
  password: z.string().min(1).max(200),
});

const attempts = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(key: string): boolean {
  const now = Date.now();
  const entry = attempts.get(key);
  if (!entry || entry.resetAt < now) {
    attempts.set(key, { count: 1, resetAt: now + 15 * 60 * 1000 });
    return true;
  }
  if (entry.count >= 10) return false;
  entry.count += 1;
  return true;
}

export async function POST(req: NextRequest) {
  try {
    const ip = clientIp(req);
    if (!checkRateLimit(`admin-login:${ip}`)) {
      return NextResponse.json({ error: "Too many login attempts. Try again later." }, { status: 429 });
    }

    const body = await req.json().catch(() => null);
    const parsed = loginBody.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

    await ensureAdminSeed();

    const [user] = await db.select().from(usersTable).where(eq(usersTable.email, parsed.data.email)).limit(1);
    const ua = req.headers.get("user-agent");

    if (!user || !verifyPassword(parsed.data.password, user.passwordHash).ok) {
      if (user) {
        await db.insert(userLoginHistoryTable).values({
          userId: user.id,
          ipAddress: ip,
          userAgent: ua,
          success: false,
        });
      }
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    const verified = verifyPassword(parsed.data.password, user.passwordHash);
    if (verified.needsRehash) {
      try {
        await db
          .update(usersTable)
          .set({ passwordHash: hashPassword(parsed.data.password), updatedAt: new Date() })
          .where(eq(usersTable.id, user.id));
      } catch { /* */ }
    }

    if (user.status === "SUSPENDED" || user.status === "DEACTIVATED") {
      return NextResponse.json({ error: "Account suspended" }, { status: 403 });
    }

    const admin = await loadAdminContext({
      id: user.id,
      name: user.name,
      email: user.email,
      preferredLanguage: user.preferredLanguage,
      primaryRole: user.primaryRole ?? null,
    });

    if (!admin) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const token = generateSecureToken();
    const expiresAt = new Date(Date.now() + 8 * 60 * 60 * 1000);
    await db.insert(sessionsTable).values({ userId: user.id, token, expiresAt });
    await db.insert(userLoginHistoryTable).values({
      userId: user.id,
      ipAddress: ip,
      userAgent: ua,
      success: true,
    });

    await logAdminAction(admin, "ADMIN_LOGIN", "AdminSession", user.id, {}, req);

    return NextResponse.json({
      token,
      expiresAt: expiresAt.toISOString(),
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        preferredLanguage: user.preferredLanguage,
        primaryRole: user.primaryRole,
        adminRoles: admin.adminRoles,
        permissions: admin.permissions,
        isSuperAdmin: admin.isSuperAdmin,
      },
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

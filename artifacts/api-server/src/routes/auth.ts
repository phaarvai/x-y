import { Router } from "express";
import { db } from "@workspace/db";
import { usersTable, sessionsTable } from "@workspace/db";
import { RegisterBody, LoginBody } from "@workspace/api-zod";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { requireUser, LEGAL_PROVIDER_ROLES, ADMIN_ROLE } from "../lib/auth";
import {
  hashPassword,
  verifyPassword,
  validatePasswordPolicy,
  generateSecureToken,
} from "../lib/password";
import { checkRateLimit, RATE_LIMITS, clientIpFromRequest } from "../lib/rate-limit";

const router = Router();

const ALLOWED_SELF_ROLES = [
  "VISIONARY",
  "MANUFACTURER",
  "VENDOR",
  "LABOR_SUPPLIER",
  "LOGISTICS_PROVIDER",
  "INVESTOR",
  "MARKET_LEAD",
  ...LEGAL_PROVIDER_ROLES,
] as const;

function publicUser(user: typeof usersTable.$inferSelect) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    preferredLanguage: user.preferredLanguage,
    primaryRole: user.primaryRole ?? null,
    createdAt: user.createdAt.toISOString(),
  };
}

router.post("/auth/register", async (req, res) => {
  const ip = clientIpFromRequest(req);
  const rl = checkRateLimit("register", ip, RATE_LIMITS.register.limit, RATE_LIMITS.register.windowMs);
  if (!rl.allowed) {
    return res.status(429).json({ error: "Too many requests", code: "RATE_LIMITED" });
  }

  const parsed = RegisterBody.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid input" });
  }
  const { name, email, password, preferredLanguage } = parsed.data;
  const policy = validatePasswordPolicy(password);
  if (!policy.ok) {
    return res.status(400).json({ error: "Password does not meet policy", details: policy.errors });
  }

  const optionalRole =
    typeof req.body?.primaryRole === "string" ? (req.body.primaryRole as string) : undefined;

  if (optionalRole === ADMIN_ROLE) {
    return res.status(400).json({ error: "Cannot self-assign admin role" });
  }
  if (optionalRole && !(ALLOWED_SELF_ROLES as readonly string[]).includes(optionalRole)) {
    return res.status(400).json({ error: "Invalid primaryRole" });
  }

  const existing = await db.select().from(usersTable).where(eq(usersTable.email, email)).limit(1);
  if (existing.length > 0) {
    return res.status(409).json({ error: "User already exists" });
  }

  const [user] = await db.insert(usersTable).values({
    name,
    email,
    passwordHash: hashPassword(password),
    preferredLanguage: preferredLanguage ?? "en",
    primaryRole: optionalRole ?? null,
  }).returning();

  const token = generateSecureToken();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  await db.insert(sessionsTable).values({ userId: user.id, token, expiresAt });

  return res.status(201).json({
    user: publicUser(user),
    token,
  });
});

router.post("/auth/login", async (req, res) => {
  const ip = clientIpFromRequest(req);
  const rl = checkRateLimit("login", ip, RATE_LIMITS.login.limit, RATE_LIMITS.login.windowMs);
  if (!rl.allowed) {
    return res.status(429).json({ error: "Too many requests", code: "RATE_LIMITED" });
  }

  const parsed = LoginBody.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid input" });
  }
  const { email, password } = parsed.data;

  const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email)).limit(1);
  const verified = user ? verifyPassword(password, user.passwordHash) : { ok: false, needsRehash: false };
  if (!user || !verified.ok) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  if (verified.needsRehash) {
    try {
      await db
        .update(usersTable)
        .set({ passwordHash: hashPassword(password), updatedAt: new Date() })
        .where(eq(usersTable.id, user.id));
    } catch { /* */ }
  }

  const token = generateSecureToken();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  await db.insert(sessionsTable).values({ userId: user.id, token, expiresAt });

  return res.status(200).json({
    user: publicUser(user),
    token,
  });
});

router.post("/auth/logout", async (req, res) => {
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (token) {
    await db.delete(sessionsTable).where(eq(sessionsTable.token, token));
  }
  return res.status(200).json({ message: "Logged out" });
});

router.get("/auth/me", async (req, res) => {
  const user = await requireUser(req, res);
  if (!user) return;
  return res.status(200).json(user.id ? {
    id: user.id,
    name: user.name,
    email: user.email,
    preferredLanguage: user.preferredLanguage,
    primaryRole: user.primaryRole,
    createdAt: user.createdAt.toISOString(),
  } : null);
});

router.patch("/auth/me/role", async (req, res) => {
  const user = await requireUser(req, res);
  if (!user) return;

  const parsed = z.object({ primaryRole: z.string().min(2).max(64) }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid input" });

  if (parsed.data.primaryRole === ADMIN_ROLE) {
    return res.status(400).json({ error: "Cannot self-assign admin role" });
  }
  if (!(ALLOWED_SELF_ROLES as readonly string[]).includes(parsed.data.primaryRole)) {
    return res.status(400).json({ error: "Invalid primaryRole" });
  }

  // Allow setting role when unset, or switching among non-admin self-service roles
  const [updated] = await db
    .update(usersTable)
    .set({ primaryRole: parsed.data.primaryRole, updatedAt: new Date() })
    .where(eq(usersTable.id, user.id))
    .returning();

  return res.status(200).json(publicUser(updated));
});

export default router;

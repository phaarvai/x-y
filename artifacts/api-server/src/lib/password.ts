/**
 * Password hashing — shared with Next.js app (keep in sync).
 * @see artifacts/nextjs-app/lib/password.ts
 */

import crypto from "node:crypto";

const SCRYPT_N = 16384;
const SCRYPT_R = 8;
const SCRYPT_P = 1;
const KEYLEN = 64;
const PREFIX = "scrypt";

function sessionPepper(): string {
  return process.env.SESSION_SECRET ?? "secret";
}

export function hashPasswordLegacy(password: string): string {
  return crypto.createHash("sha256").update(password + sessionPepper()).digest("hex");
}

export function isLegacyPasswordHash(hash: string): boolean {
  return /^[a-f0-9]{64}$/i.test(hash) && !hash.includes("$");
}

export function isModernPasswordHash(hash: string): boolean {
  return hash.startsWith(`${PREFIX}$`);
}

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16);
  const derived = crypto.scryptSync(password, Buffer.concat([salt, Buffer.from(sessionPepper())]), KEYLEN, {
    N: SCRYPT_N,
    r: SCRYPT_R,
    p: SCRYPT_P,
  });
  return `${PREFIX}$${SCRYPT_N}$${SCRYPT_R}$${SCRYPT_P}$${salt.toString("base64url")}$${derived.toString("base64url")}`;
}

export function verifyPassword(password: string, storedHash: string): { ok: boolean; needsRehash: boolean } {
  if (!storedHash) return { ok: false, needsRehash: false };

  if (isModernPasswordHash(storedHash)) {
    const parts = storedHash.split("$");
    if (parts.length !== 6) return { ok: false, needsRehash: false };
    const [, nStr, rStr, pStr, saltB64, hashB64] = parts;
    const N = Number(nStr);
    const r = Number(rStr);
    const p = Number(pStr);
    const salt = Buffer.from(saltB64, "base64url");
    const expected = Buffer.from(hashB64, "base64url");
    const derived = crypto.scryptSync(password, Buffer.concat([salt, Buffer.from(sessionPepper())]), expected.length, {
      N,
      r,
      p,
    });
    const ok = crypto.timingSafeEqual(derived, expected);
    const needsRehash = ok && (N < SCRYPT_N || r !== SCRYPT_R || p !== SCRYPT_P);
    return { ok, needsRehash };
  }

  if (isLegacyPasswordHash(storedHash)) {
    const legacy = hashPasswordLegacy(password);
    const a = Buffer.from(legacy, "hex");
    const b = Buffer.from(storedHash, "hex");
    if (a.length !== b.length) return { ok: false, needsRehash: false };
    const ok = crypto.timingSafeEqual(a, b);
    return { ok, needsRehash: ok };
  }

  return { ok: false, needsRehash: false };
}

export const PASSWORD_POLICY = {
  minLength: 8,
  maxLength: 128,
  requireUpper: true,
  requireLower: true,
  requireDigit: true,
  requireSpecial: false,
} as const;

export function validatePasswordPolicy(password: string): { ok: boolean; errors: string[] } {
  const errors: string[] = [];
  if (password.length < PASSWORD_POLICY.minLength) {
    errors.push(`Password must be at least ${PASSWORD_POLICY.minLength} characters`);
  }
  if (password.length > PASSWORD_POLICY.maxLength) {
    errors.push(`Password must be at most ${PASSWORD_POLICY.maxLength} characters`);
  }
  if (PASSWORD_POLICY.requireUpper && !/[A-Z]/.test(password)) {
    errors.push("Password must include an uppercase letter");
  }
  if (PASSWORD_POLICY.requireLower && !/[a-z]/.test(password)) {
    errors.push("Password must include a lowercase letter");
  }
  if (PASSWORD_POLICY.requireDigit && !/[0-9]/.test(password)) {
    errors.push("Password must include a digit");
  }
  return { ok: errors.length === 0, errors };
}

export function generateSecureToken(bytes = 32): string {
  return crypto.randomBytes(bytes).toString("hex");
}

export function generateOtpCode(digits = 6): string {
  const max = 10 ** digits;
  const n = crypto.randomInt(0, max);
  return String(n).padStart(digits, "0");
}

export function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token + sessionPepper()).digest("hex");
}

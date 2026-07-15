import { NextRequest } from "next/server";
import { clientIp as legalClientIp } from "@/lib/legal-auth";

export function clientIp(req: NextRequest): string {
  return legalClientIp(req);
}

export function getBearerTokenSafe(req: NextRequest): string | null {
  const header = req.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) return null;
  return header.slice(7).trim() || null;
}

export { requireUser, isAuthUser } from "@/lib/legal-auth";

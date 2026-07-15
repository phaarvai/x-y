import type { helpContentTable, listingTemplatesTable } from "@/lib/schema";

export function serializeHelp(r: typeof helpContentTable.$inferSelect) {
  return {
    ...r,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  };
}

export function serializeTemplate(r: typeof listingTemplatesTable.$inferSelect) {
  return {
    ...r,
    templateData: JSON.parse(r.templateData || "{}") as Record<string, unknown>,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  };
}

const chatbotRate = new Map<string, { count: number; resetAt: number }>();

export function chatbotRateOk(key: string, max = 30): boolean {
  const now = Date.now();
  const e = chatbotRate.get(key);
  if (!e || e.resetAt < now) {
    chatbotRate.set(key, { count: 1, resetAt: now + 60_000 });
    return true;
  }
  if (e.count >= max) return false;
  e.count += 1;
  return true;
}

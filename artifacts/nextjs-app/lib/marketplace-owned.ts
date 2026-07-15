/**
 * DB-backed marketplace ownership + serializers
 */

import { db } from "@/lib/db";
import {
  serviceProviderProfilesTable,
  vendorMaterialsTable,
  laborListingsTable,
  logisticsServicesTable,
  logisticsQuotesTable,
  marketOpportunitiesTable,
} from "@/lib/schema";
import { and, eq } from "drizzle-orm";

export async function getOwnedProvider(
  userId: number,
  type: string,
  admin: boolean,
  providerId?: number,
) {
  const conditions = [eq(serviceProviderProfilesTable.providerType, type)];
  if (!admin) conditions.push(eq(serviceProviderProfilesTable.userId, userId));
  if (providerId) conditions.push(eq(serviceProviderProfilesTable.id, providerId));
  const [p] = await db
    .select()
    .from(serviceProviderProfilesTable)
    .where(and(...conditions))
    .limit(1);
  return p ?? null;
}

export function serProvider(p: typeof serviceProviderProfilesTable.$inferSelect) {
  return {
    ...p,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
  };
}

export function serMaterial(m: typeof vendorMaterialsTable.$inferSelect) {
  return {
    ...m,
    createdAt: m.createdAt.toISOString(),
    updatedAt: m.updatedAt.toISOString(),
  };
}

export function serLabor(m: typeof laborListingsTable.$inferSelect) {
  return {
    ...m,
    createdAt: m.createdAt.toISOString(),
    updatedAt: m.updatedAt.toISOString(),
  };
}

export function serLog(m: typeof logisticsServicesTable.$inferSelect) {
  return {
    ...m,
    createdAt: m.createdAt.toISOString(),
    updatedAt: m.updatedAt.toISOString(),
  };
}

export function serQuote(q: typeof logisticsQuotesTable.$inferSelect) {
  return {
    ...q,
    requestedDate: q.requestedDate?.toISOString() ?? null,
    createdAt: q.createdAt.toISOString(),
    updatedAt: q.updatedAt.toISOString(),
  };
}

export function serOpportunity(o: typeof marketOpportunitiesTable.$inferSelect) {
  return {
    ...o,
    moderatedAt: o.moderatedAt?.toISOString() ?? null,
    createdAt: o.createdAt.toISOString(),
    updatedAt: o.updatedAt.toISOString(),
  };
}

import { NextRequest, NextResponse } from "next/server";
import { ilike, or, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  usersTable,
  listingModerationsTable,
  transactionsTable,
  supportCasesTable,
  disputesTable,
} from "@/lib/schema";
import { requireAdmin, isAdminContext } from "@/lib/admin-rbac";

export async function GET(req: NextRequest) {
  try {
    const admin = await requireAdmin(req, "search", "read");
    if (!isAdminContext(admin)) return admin;

    const q = new URL(req.url).searchParams.get("q")?.trim();
    if (!q || q.length < 2) {
      return NextResponse.json({ users: [], listings: [], transactions: [], support: [], disputes: [] });
    }

    const pattern = `%${q}%`;

    const [users, listings, transactions, support, disputes] = await Promise.all([
      db
        .select({ id: usersTable.id, name: usersTable.name, email: usersTable.email })
        .from(usersTable)
        .where(or(ilike(usersTable.name, pattern), ilike(usersTable.email, pattern), sql`${usersTable.id}::text = ${q}`)!)
        .limit(8),
      db
        .select({
          id: listingModerationsTable.id,
          title: listingModerationsTable.title,
          listingType: listingModerationsTable.listingType,
        })
        .from(listingModerationsTable)
        .where(or(ilike(listingModerationsTable.title, pattern), sql`${listingModerationsTable.listingId}::text = ${q}`)!)
        .limit(8),
      db
        .select({
          id: transactionsTable.id,
          referenceNumber: transactionsTable.referenceNumber,
          amount: transactionsTable.amount,
        })
        .from(transactionsTable)
        .where(
          or(
            ilike(transactionsTable.referenceNumber, pattern),
            sql`${transactionsTable.id}::text = ${q}`,
          )!,
        )
        .limit(8),
      db
        .select({ id: supportCasesTable.id, subject: supportCasesTable.subject, status: supportCasesTable.status })
        .from(supportCasesTable)
        .where(or(ilike(supportCasesTable.subject, pattern), sql`${supportCasesTable.id}::text = ${q}`)!)
        .limit(8),
      db
        .select({ id: disputesTable.id, reason: disputesTable.reason, status: disputesTable.status })
        .from(disputesTable)
        .where(or(ilike(disputesTable.reason, pattern), sql`${disputesTable.id}::text = ${q}`)!)
        .limit(8),
    ]);

    return NextResponse.json({
      users,
      listings,
      transactions: transactions.map((t) => ({ ...t, amount: String(t.amount) })),
      support,
      disputes,
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

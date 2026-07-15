import { NextRequest, NextResponse } from "next/server";
import { desc } from "drizzle-orm";
import { db } from "@/lib/db";
import { transactionsTable } from "@/lib/schema";
import { requireAdmin, isAdminContext, logAdminAction, escapeCsv } from "@/lib/admin-rbac";
import { serializeTxn } from "@/lib/payments";

export async function GET(req: NextRequest) {
  try {
    const admin = await requireAdmin(req, "transactions", "export");
    if (!isAdminContext(admin)) return admin;

    const rows = await db.select().from(transactionsTable).orderBy(desc(transactionsTable.createdAt)).limit(5000);
    const items = rows.map(serializeTxn);

    const headers = [
      "id",
      "amount",
      "currency",
      "status",
      "payerUserId",
      "payeeUserId",
      "bookingId",
      "referenceNumber",
      "transactionDate",
      "commissionAmount",
    ];

    const lines = [
      headers.join(","),
      ...items.map((t) =>
        headers.map((h) => escapeCsv((t as Record<string, unknown>)[h])).join(","),
      ),
    ];

    await logAdminAction(admin, "TRANSACTIONS_EXPORTED", "Transaction", null, { count: items.length }, req);

    return new NextResponse(lines.join("\n"), {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="transactions-export-${Date.now()}.csv"`,
      },
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

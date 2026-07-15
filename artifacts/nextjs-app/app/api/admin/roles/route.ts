import { NextRequest, NextResponse } from "next/server";
import { asc } from "drizzle-orm";
import { db } from "@/lib/db";
import { adminRolesTable } from "@/lib/schema";
import { requireAdmin, isAdminContext } from "@/lib/admin-rbac";

export async function GET(req: NextRequest) {
  try {
    const admin = await requireAdmin(req, "roles", "read");
    if (!isAdminContext(admin)) return admin;

    const rows = await db.select().from(adminRolesTable).orderBy(asc(adminRolesTable.name));

    return NextResponse.json({
      items: rows.map((r) => ({
        id: r.id,
        name: r.name,
        description: r.description,
        permissions: (() => {
          try {
            return JSON.parse(r.permissions || "[]") as string[];
          } catch {
            return [];
          }
        })(),
        isSystem: r.isSystem,
        createdAt: r.createdAt.toISOString(),
        updatedAt: r.updatedAt.toISOString(),
      })),
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

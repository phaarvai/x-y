/**
 * EPIC 17 — Seed data: roles, permissions, categories, sample admin.
 *
 *   pnpm --filter @workspace/db seed
 *
 * Safe to re-run (upsert / ON CONFLICT). Does not overwrite existing admin password
 * if sample admin already exists.
 */

import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import path from "node:path";
import pg from "pg";

const { Client } = pg;

const PLATFORM_ROLES = [
  { name: "PLATFORM_ADMIN", displayName: "Admin", description: "Platform administrator" },
  { name: "MANUFACTURER", displayName: "Manufacturer", description: "Facility & machinery provider" },
  { name: "VISIONARY", displayName: "Visionary", description: "Product innovator / buyer" },
  { name: "VENDOR", displayName: "Vendor", description: "Raw materials & supplies vendor" },
  { name: "LABOR_SUPPLIER", displayName: "Labor Supplier", description: "Workforce supplier" },
  {
    name: "LOGISTICS_PROVIDER",
    displayName: "Logistics Provider",
    description: "Shipping & logistics",
  },
  { name: "LEGAL_PROVIDER", displayName: "Legal Provider", description: "Legal & compliance services" },
  { name: "INVESTOR", displayName: "Investor", description: "Capital & investment partner" },
  { name: "MARKET_LEAD", displayName: "Market Lead", description: "Market opportunity lead" },
] as const;

const PERMISSIONS = [
  { code: "view", name: "View", description: "View resources" },
  { code: "create", name: "Create", description: "Create resources" },
  { code: "update", name: "Update", description: "Update resources" },
  { code: "delete", name: "Delete", description: "Delete resources" },
  { code: "approve", name: "Approve", description: "Approve submissions" },
  { code: "moderate", name: "Moderate", description: "Moderate content" },
  { code: "export", name: "Export", description: "Export data" },
  { code: "manage_users", name: "Manage Users", description: "Administer users" },
  { code: "manage_payments", name: "Manage Payments", description: "Administer payments" },
  { code: "manage_categories", name: "Manage Categories", description: "Administer categories" },
  { code: "manage_reviews", name: "Manage Reviews", description: "Administer reviews" },
  { code: "manage_disputes", name: "Manage Disputes", description: "Administer disputes" },
] as const;

/** Default role → permission codes */
const ROLE_PERMS: Record<string, string[]> = {
  PLATFORM_ADMIN: PERMISSIONS.map((p) => p.code),
  MANUFACTURER: ["view", "create", "update", "delete", "export"],
  VISIONARY: ["view", "create", "update", "delete"],
  VENDOR: ["view", "create", "update", "delete"],
  LABOR_SUPPLIER: ["view", "create", "update", "delete"],
  LOGISTICS_PROVIDER: ["view", "create", "update", "delete"],
  LEGAL_PROVIDER: ["view", "create", "update", "delete", "approve"],
  INVESTOR: ["view", "create", "update"],
  MARKET_LEAD: ["view", "create", "update", "moderate"],
};

const CATEGORIES = [
  { name: "Industries", slug: "industries", categoryType: "INDUSTRY" },
  { name: "Machinery", slug: "machinery", categoryType: "MACHINERY" },
  { name: "Services", slug: "services", categoryType: "SERVICE" },
  { name: "Raw Materials", slug: "raw-materials", categoryType: "RAW_MATERIAL" },
] as const;

function hashPassword(password: string): string {
  const secret = process.env.SESSION_SECRET ?? "dev-seed-secret-change-me";
  return crypto.createHash("sha256").update(password + secret).digest("hex");
}

export async function seed() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL must be set to run seeds");

  const client = new Client({ connectionString: url });
  await client.connect();
  try {
    console.log("Seeding platform roles…");
    for (const role of PLATFORM_ROLES) {
      await client.query(
        `INSERT INTO platform_roles (name, display_name, description, is_system)
         VALUES ($1, $2, $3, true)
         ON CONFLICT (name) DO UPDATE SET display_name = EXCLUDED.display_name, description = EXCLUDED.description`,
        [role.name, role.displayName, role.description],
      );
    }

    console.log("Seeding platform permissions…");
    for (const perm of PERMISSIONS) {
      await client.query(
        `INSERT INTO platform_permissions (code, name, description)
         VALUES ($1, $2, $3)
         ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description`,
        [perm.code, perm.name, perm.description],
      );
    }

    console.log("Linking role permissions…");
    for (const [roleName, codes] of Object.entries(ROLE_PERMS)) {
      const roleRes = await client.query<{ id: number }>(
        `SELECT id FROM platform_roles WHERE name = $1`,
        [roleName],
      );
      const roleId = roleRes.rows[0]?.id;
      if (!roleId) continue;
      for (const code of codes) {
        const permRes = await client.query<{ id: number }>(
          `SELECT id FROM platform_permissions WHERE code = $1`,
          [code],
        );
        const permId = permRes.rows[0]?.id;
        if (!permId) continue;
        await client.query(
          `INSERT INTO platform_role_permissions (role_id, permission_id)
           SELECT $1, $2
           WHERE NOT EXISTS (
             SELECT 1 FROM platform_role_permissions WHERE role_id = $1 AND permission_id = $2
           )`,
          [roleId, permId],
        );
      }
    }

    console.log("Seeding categories…");
    for (const [i, cat] of CATEGORIES.entries()) {
      await client.query(
        `INSERT INTO categories (name, slug, category_type, description, sort_order, status)
         VALUES ($1, $2, $3, $4, $5, 'ACTIVE')
         ON CONFLICT (slug, category_type) DO UPDATE SET name = EXCLUDED.name, status = 'ACTIVE'`,
        [cat.name, cat.slug, cat.categoryType, `${cat.name} category`, i],
      );
    }

    const adminEmail = process.env.SEED_ADMIN_EMAIL ?? "admin@explorerfactory.local";
    const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? "ChangeMeAdmin!17";
    const existing = await client.query(`SELECT id FROM users WHERE email = $1`, [adminEmail]);
    if (existing.rowCount === 0) {
      console.log(`Creating sample admin user (${adminEmail})…`);
      const userRes = await client.query<{ id: number }>(
        `INSERT INTO users (name, email, password_hash, preferred_language, primary_role, status)
         VALUES ($1, $2, $3, 'en', 'PLATFORM_ADMIN', 'ACTIVE')
         RETURNING id`,
        ["Platform Admin", adminEmail, hashPassword(adminPassword)],
      );
      const userId = userRes.rows[0]?.id;
      // Ensure SUPER_ADMIN admin role assignment if admin_roles exists
      try {
        const roleRes = await client.query<{ id: number }>(
          `SELECT id FROM admin_roles WHERE name = 'SUPER_ADMIN' LIMIT 1`,
        );
        const adminRoleId = roleRes.rows[0]?.id;
        if (userId && adminRoleId) {
          await client.query(
            `INSERT INTO user_role_assignments (user_id, admin_role_id)
             SELECT $1, $2
             WHERE NOT EXISTS (
               SELECT 1 FROM user_role_assignments WHERE user_id = $1 AND admin_role_id = $2
             )`,
            [userId, adminRoleId],
          );
        }
      } catch {
        /* admin tables may not exist in partial envs */
      }
      console.log(`Sample admin created. Password from SEED_ADMIN_PASSWORD (default documented in README).`);
    } else {
      console.log(`Sample admin already exists (${adminEmail}) — skipped.`);
    }

    console.log("Seed complete.");
  } finally {
    await client.end();
  }
}

const isDirect =
  process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isDirect) {
  seed().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}

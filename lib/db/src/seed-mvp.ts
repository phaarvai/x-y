/**
 * MVP demo seed — sample manufacturer with published listing
 *   pnpm --filter @workspace/db seed:mvp
 */
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import path from "node:path";
import pg from "pg";

const { Client } = pg;

function hashPassword(password: string): string {
  const secret = process.env.SESSION_SECRET ?? "dev-seed-secret-change-me";
  return crypto.createHash("sha256").update(password + secret).digest("hex");
}

export async function seedMvp() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL required");

  const client = new Client({ connectionString: url });
  await client.connect();
  try {
    const mfgEmail = process.env.SEED_MFG_EMAIL ?? "manufacturer@explorerfactory.local";
    const mfgPassword = process.env.SEED_MFG_PASSWORD ?? "ChangeMeMfg!17";

    let mfgId: number;
    const existing = await client.query(`SELECT id FROM users WHERE email = $1`, [mfgEmail]);
    if (existing.rowCount === 0) {
      const res = await client.query<{ id: number }>(
        `INSERT INTO users (name, email, password_hash, preferred_language, primary_role, profile_status, industry, location, status)
         VALUES ($1, $2, $3, 'en', 'MANUFACTURER', 'ACTIVE', 'Precision Engineering', 'San Francisco, CA, USA', 'ACTIVE')
         RETURNING id`,
        ["PrecisionTech Demo", mfgEmail, hashPassword(mfgPassword)],
      );
      mfgId = res.rows[0]!.id;
      console.log(`Created demo manufacturer: ${mfgEmail}`);
    } else {
      mfgId = existing.rows[0]!.id;
      console.log(`Demo manufacturer exists: ${mfgEmail}`);
    }

    const fac = await client.query<{ id: number }>(
      `INSERT INTO manufacturing_facilities (owner_user_id, name, tagline, description, location, city, state, country, contact_email, industry, status, published_at)
       SELECT $1, 'PrecisionTech Manufacturing', 'Precision Engineering for the Future', 'Demo CNC and prototyping facility.', 'San Francisco, CA, USA', 'San Francisco', 'CA', 'USA', $2, 'Aerospace', 'PUBLISHED', now()
       WHERE NOT EXISTS (SELECT 1 FROM manufacturing_facilities WHERE owner_user_id = $1 AND name = 'PrecisionTech Manufacturing')
       RETURNING id`,
      [mfgId, mfgEmail],
    );

    let facilityId = fac.rows[0]?.id;
    if (!facilityId) {
      const f = await client.query<{ id: number }>(
        `SELECT id FROM manufacturing_facilities WHERE owner_user_id = $1 LIMIT 1`,
        [mfgId],
      );
      facilityId = f.rows[0]?.id;
    }
    if (!facilityId) {
      console.log("Could not create facility — run migration 0018 first");
      return;
    }

    const mach = await client.query<{ id: number }>(
      `INSERT INTO machinery_inventory (facility_id, owner_user_id, name, machine_type, description, quantity, price_per_hour, currency, keywords, status, published_at)
       SELECT $1, $2, 'CNC Milling Machine', 'CNC Milling', '5-axis CNC milling', 3, 150, 'USD', 'cnc,milling,precision', 'PUBLISHED', now()
       WHERE NOT EXISTS (SELECT 1 FROM machinery_inventory WHERE facility_id = $1 AND name = 'CNC Milling Machine')
       RETURNING id`,
      [facilityId, mfgId],
    );
    const machineId = mach.rows[0]?.id;
    if (machineId) {
      await client.query(
        `INSERT INTO availability_slots (inventory_id, facility_id, owner_user_id, slot_date, start_time, end_time, status)
         SELECT $1, $2, $3, CURRENT_DATE + interval '1 day', '09:00', '17:00', 'AVAILABLE'
         WHERE NOT EXISTS (SELECT 1 FROM availability_slots WHERE inventory_id = $1 LIMIT 1)`,
        [machineId, facilityId, mfgId],
      );
    }

    console.log(`MVP seed complete. Facility ID: ${facilityId}, browse: /manufacturer/${facilityId}`);
  } finally {
    await client.end();
  }
}

const isDirect =
  process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isDirect) {
  seedMvp().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}

import "dotenv/config";
import pg from "pg";
import fs from "fs";
import path from "path";

const { Client } = pg;

async function syncDb() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error("DATABASE_URL is missing.");
    process.exit(1);
  }

  const client = new Client({
    connectionString: databaseUrl,
  });

  try {
    await client.connect();
    console.log("Connected to database.");

    // Path to the migration file #0009 which contains the hardening
    const migrationPath = path.join(process.cwd(), "drizzle", "0009_complete_ezekiel_stane.sql");
    const sql = fs.readFileSync(migrationPath, "utf-8");

    console.log("Applying Migration #0009...");
    await client.query(sql);
    console.log("Migration applied successfully.");

    // Also ensure the user table has active_team_id if #0009 didn't cover it (it should have)
    // But let's check or add if needed.
    await client.query(`
      ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "active_team_id" uuid;
    `);
    console.log("Schema sync complete.");

  } catch (err) {
    console.error("Sync failed:", err);
  } finally {
    await client.end();
  }
}

syncDb();

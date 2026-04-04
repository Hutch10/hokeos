import "dotenv/config";
import { neon } from "@neondatabase/serverless";
import { Pool } from "pg";

/**
 * Phase 51: Neon Connectivity Pre-flight
 * Validates that the database is reachable via both HTTP (Serverless) 
 * and persistent Pool (Background/Migrations) before deployment proceeds.
 */
async function validateConnectivity() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("❌ [PRE-FLIGHT-AUTO] DATABASE_URL is missing.");
    process.exit(1);
  }

  console.log("--- [HokeOS Neon Pre-flight Discovery] ---");

  // 1. Test Neon HTTP Driver (Serverless Native)
  try {
    console.log("Testing Neon HTTP Driver...");
    const sql = neon(url);
    const result = await sql`SELECT 1 as connected`;
    if (result[0].connected === 1) {
      console.log("✅ Neon HTTP Driver Connection: SUCCESS");
    }
  } catch (err) {
    console.error("❌ Neon HTTP Driver Connection: FAILED");
    console.error(err);
  }

  // 2. Test Node-Postgres Pool (Legacy/Background)
  try {
    console.log("Testing Node-Postgres Pool...");
    const pool = new Pool({ connectionString: url });
    const client = await pool.connect();
    const result = await client.query("SELECT 1 as connected");
    if (result.rows[0].connected === 1) {
      console.log("✅ Node-Postgres Pool Connection: SUCCESS");
    }
    client.release();
    await pool.end();
  } catch (err) {
    console.error("❌ Node-Postgres Pool Connection: FAILED");
    console.error(err);
  }

  console.log("------------------------------------------");
}

validateConnectivity().catch(console.error);

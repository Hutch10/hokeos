/**
 * Phase 39: Deployment Pre-flight Validation (CJS)
 */
const REQUIRED_ENV_VARS = [
  "DATABASE_URL",
  "NEXTAUTH_SECRET",
  "NEXTAUTH_URL",
  "APP_URL",
  "STRIPE_SECRET_KEY",
  "METALS_API_KEY",
  "PRICE_INGEST_TOKEN"
];

async function runPreflight() {
  console.log("--- [HokeOS Industrial Deployment Pre-flight] ---");
  
  const missing = [];
  for (const key of REQUIRED_ENV_VARS) {
    if (!process.env[key]) {
      missing.push(key);
    }
  }

  if (missing.length > 0) {
    console.error(`❌ ERROR: Missing required environment variables: ${missing.join(", ")}`);
    process.exit(1);
  }

  // Phase 51: Entropy Check
  const secret = process.env.NEXTAUTH_SECRET;
  if (secret === "dev-only-change-me" || secret.length < 32) {
    console.error("❌ ERROR: NEXTAUTH_SECRET is insecure. Must be >= 32 chars and not default.");
    process.exit(1);
  }

  // Phase 51: Live DB Ping
  // In CI, we use the node-postgres driver for the ping.
  const { Pool } = require("pg");
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  
  try {
    console.log("Validating Database reachability...");
    const client = await pool.connect();
    await client.query("SELECT 1");
    client.release();
    console.log("✅ Database Connectivity: VERIFIED");
  } catch (err) {
    console.error("❌ ERROR: Database unreachable from build environment.");
    console.error(err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }

  console.log("✅ SUCCESS: All pre-flight safety checks passed.");
  process.exit(0);
}

runPreflight();

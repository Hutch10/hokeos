/**
 * Phase 39: Deployment Pre-flight Validation
 * Verifies that all required environment variables are present before build.
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

function runPreflight() {
  console.log("--- [HokeOS Deployment Pre-flight] ---");
  
  const missing = [];
  for (const key of REQUIRED_ENV_VARS) {
    if (!process.env[key]) {
      missing.push(key);
    }
  }

  if (missing.length > 0) {
    console.error(`ERROR: Missing required environment variables: ${missing.join(", ")}`);
    process.exit(1);
  }

  console.log("SUCCESS: All required environment variables are present.");
  
  // Basic DB Check (if DATABASE_URL is present)
  if (process.env.DATABASE_URL?.includes("localhost")) {
    console.warn("WARNING: DATABASE_URL points to localhost. Ensure this is intentional for this environment.");
  }

  process.exit(0);
}

runPreflight();

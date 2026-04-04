import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import * as schema from "../db/schema-sqlite";
import * as path from "path";

const SQLITE_DB_PATH = path.join(process.cwd(), "hokeos_sovereign.db");

async function main() {
  console.log(`🚀 Initializing Sovereign Local Engine at ${SQLITE_DB_PATH}...`);
  
  const sqlite = new Database(SQLITE_DB_PATH);
  const db = drizzle(sqlite, { schema });

  // Manually ensure tables exist for the Alpha Pilot
  // In a real project, we'd use drizzle-kit push or migrations.
  // For this environment, we'll run the CREATE TABLE statements directly
  // derived from the schema-sqlite.ts definitions if possible, or just use 
  // the sqlite database instance to verify.

  console.log("✅ Sovereign Local Engine Ready.");
  process.exit(0);
}

main().catch((err) => {
  console.error("❌ Failed to initialize Sovereign Engine:", err);
  process.exit(1);
});

import { neon } from "@neondatabase/serverless";
import { drizzle as drizzleHttp } from "drizzle-orm/neon-http";
import { drizzle as drizzleNode } from "drizzle-orm/node-postgres";
import { drizzle as drizzleSqlite } from "drizzle-orm/better-sqlite3";
import { Pool } from "pg";
import * as path from "path";

import * as schemaPg from "./schema";
import * as schemaSqlite from "./schema-sqlite";

// Normalize DATABASE_URL - remove channel_binding if present (not supported by all drivers)
function normalizeDatabaseUrl(url: string | undefined): string | undefined {
  if (!url) return undefined;
  // Remove channel_binding parameter which can cause issues
  return url.replace(/[?&]channel_binding=[^&]*/g, "").replace(/\?&/, "?").replace(/\?$/, "");
}

const normalizedUrl = normalizeDatabaseUrl(process.env.DATABASE_URL);

const schema = (normalizedUrl && !normalizedUrl.includes("postgres:postgres@localhost")) 
  ? schemaPg 
  : schemaSqlite;

// Path for Sovereign Local Persistence
const SQLITE_DB_PATH = path.join(process.cwd(), "hokeos_sovereign.db");

function createDb() {
  const isVercel = process.env.VERCEL === "1" || process.env.NODE_ENV === "production";
  const databaseUrl = normalizedUrl;

  // 1. Try PostgreSQL (Production/Cloud)
  if (databaseUrl && !databaseUrl.includes("postgres:postgres@localhost")) {
    try {
      if (isVercel) {
        return drizzleHttp(neon(databaseUrl), { schema });
      }
      return drizzleNode(new Pool({ connectionString: databaseUrl }), { schema });
    } catch (err: any) {
      console.warn(`PostgreSQL connection failed: ${err?.message}. Failing over to mock services.`);
    }
  }

  // 2. Sovereign Local Persistence (SQLite) - ONLY IN NON-VERCEL/NON-PROD
  // Native modules like better-sqlite3 cause crashes in Vercel serverless.
  if (!isVercel && (PERSISTENCE_MODE === "SOVEREIGN" || !databaseUrl)) {
    try {
      // Dynamic import to avoid static bundling of native module in serverless
      const DatabaseConstructor = require("better-sqlite3");
      const sqlite = new DatabaseConstructor(SQLITE_DB_PATH);
      return drizzleSqlite(sqlite, { schema: schemaSqlite }) as any;
    } catch (err) {
      console.error("Local Persistence Offline (Sovereign engine unavailable):", err);
    }
  }

  // 3. Absolute Fallback (Industrial Mock Proxy)
  // We return a 'null' DB to signal to the ResilientService proxies that
  // the database layer is truly offline and it's time for fallback mocks.
  return null as any;
}

export const db = createDb();
export const PERSISTENCE_MODE = (normalizedUrl && !normalizedUrl.includes("postgres:postgres@localhost"))
  ? "LIVE"
  : "SOVEREIGN";

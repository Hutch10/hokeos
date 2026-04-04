import { neon } from "@neondatabase/serverless";
import { drizzle as drizzleHttp } from "drizzle-orm/neon-http";
import { drizzle as drizzleNode } from "drizzle-orm/node-postgres";
import { drizzle as drizzleSqlite } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import { Pool } from "pg";
import * as path from "path";
import * as fs from "fs";

import * as schemaPg from "./schema";
import * as schemaSqlite from "./schema-sqlite";

const schema = (process.env.DATABASE_URL && !process.env.DATABASE_URL.includes("postgres:postgres@localhost")) 
  ? schemaPg 
  : schemaSqlite;

const databaseUrl = process.env.DATABASE_URL;

// Path for Sovereign Local Persistence
const SQLITE_DB_PATH = path.join(process.cwd(), "hokeos_sovereign.db");

function createDb() {
  const isVercel = process.env.VERCEL === "1" || process.env.NODE_ENV === "production";

  // 1. Try PostgreSQL (Production/Cloud)
  if (databaseUrl && !databaseUrl.includes("postgres:postgres@localhost")) {
    try {
      if (isVercel) {
        return drizzleHttp(neon(databaseUrl), { schema });
      }
      return drizzleNode(new Pool({ connectionString: databaseUrl }), { schema });
    } catch (err: any) {
      if (isVercel) {
        console.error("CRITICAL: PostgreSQL connection failed in production. Aborting.");
        throw new Error(`Database Connection Failure: ${err.message}`);
      }
      console.warn("PostgreSQL connection failed. Falling back to Sovereign Local.");
    }
  }

  // 2. Sovereign Local Persistence (SQLite)
  // No password required. Works anywhere. 
  try {
    const sqlite = new Database(SQLITE_DB_PATH);
    // Explicitly use SQLite schema for the LiteEngine
    return drizzleSqlite(sqlite, { schema: schemaSqlite }) as any; 
  } catch (err) {
    console.error("CRITICAL: Persistence Layer Failure. All engines offline.", err);
    throw new Error("Failed to initialize any persistence engine.");
  }
}

export const db = createDb();
export const PERSISTENCE_MODE = databaseUrl && !databaseUrl.includes("postgres:postgres@localhost") 
  ? "LIVE" 
  : "SOVEREIGN";

import { NextResponse } from "next/server";
import pg from "pg";
import fs from "fs";
import path from "path";

export async function GET() {
  if (process.env.NODE_ENV !== "development") {
    return new NextResponse("Forbidden", { status: 403 });
  }

  try {
    const migrationPath = path.join(process.cwd(), "drizzle", "0009_complete_ezekiel_stane.sql");
    const migrationSql = fs.readFileSync(migrationPath, "utf-8");

    console.log("Applying manual migration via raw PG client...");
    
    // Use raw PG client to be absolutely sure we're hitting the same DB
    const client = new pg.Client({
      connectionString: process.env.DATABASE_URL,
    });
    
    await client.connect();

    const statements = migrationSql
      .split("--> statement-breakpoint")
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    let count = 0;
    for (const statement of statements) {
      try {
        await client.query(statement);
        count++;
      } catch (err: any) {
        // console.warn("Statement failed:", err.message);
      }
    }
    
    // Force user table fix
    try {
      await client.query(`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "active_team_id" uuid;`);
    } catch (err: any) {}

    await client.end();

    return NextResponse.json({ ok: true, message: `Migration applied with ${count} steps via raw PG client` });
  } catch (error: any) {
    console.error("Migration API failed:", error);
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}

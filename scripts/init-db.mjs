import { Client } from 'pg';
import 'dotenv/config';

async function checkDb() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL?.replace('/hokeos', '/postgres'),
  });

  try {
    await client.connect();
    const res = await client.query("SELECT datname FROM pg_database WHERE datname = 'hokeos'");
    if (res.rowCount === 0) {
      console.log("Database 'hokeos' does not exist. Creating it...");
      await client.query("CREATE DATABASE hokeos");
      console.log("Database 'hokeos' created successfully.");
    } else {
      console.log("Database 'hokeos' exists.");
    }
  } catch (err) {
    console.error("Failed to connect to postgres:", err);
  } finally {
    await client.end();
  }
}

checkDb();

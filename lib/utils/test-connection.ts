import "dotenv/config";
import pg from "pg";

const { Client } = pg;

async function checkConnection() {
  const configs = [
    process.env.DATABASE_URL,
    "postgresql://postgres@localhost:5432/hokeos",
    "postgresql://postgres:postgres@localhost:5432/postgres",
    "postgresql://localhost:5432/hokeos"
  ];

  for (const url of configs) {
    if (!url) continue;
    console.log(`Trying config: ${url}`);
    const client = new Client({ connectionString: url });
    try {
      await client.connect();
      console.log(`SUCCESS with ${url}`);
      await client.end();
      process.exit(0);
    } catch (err: any) {
      console.log(`FAILED with ${url}: ${err.message}`);
    }
  }
}

checkConnection();

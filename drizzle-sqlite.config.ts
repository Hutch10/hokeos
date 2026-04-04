import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./db/schema-sqlite.ts",
  out: "./drizzle-sqlite",
  dialect: "sqlite",
  dbCredentials: {
    url: "hokeos_sovereign.db",
  },
});

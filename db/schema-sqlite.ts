import {
  integer,
  real,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

// ─── Core ────────────────────────────────────────────────────────────────────

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  name: text("name"),
  passwordHash: text("password_hash"),
  activeTeamId: text("active_team_id"), 
  emailVerified: integer("email_verified", { mode: "timestamp" }),
  image: text("image"),
  failedAttempts: real("failed_attempts").default(0),
  lastLoginAt: integer("last_login_at", { mode: "timestamp" }),
  idVerifiedAt: integer("id_verified_at", { mode: "timestamp" }),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});

export const teams = sqliteTable("teams", {
  id: text("id").primaryKey(),
  ownerId: text("owner_id").notNull(),
  name: text("name").notNull(),
  feeConfig: text("fee_config"), // JSON string
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});

// ─── Metals ──────────────────────────────────────────────────────────────────

export const lots = sqliteTable("lots", {
  id: text("id").primaryKey(),
  lotNumber: text("lot_number").notNull().unique(),
  sourceName: text("source_name"),
  materialType: text("material_type").notNull(),
  grossWeight: real("gross_weight"),
  weightUnit: text("weight_unit").notNull().default("g"),
  intakeStatus: text("intake_status").notNull().default("received"),
  teamId: text("team_id").notNull(),
  userId: text("user_id").notNull(),
  refiningFeeSchedule: text("refining_fee_schedule"), // JSON string
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});

export const batches = sqliteTable("batches", {
  id: text("id").primaryKey(),
  teamId: text("team_id").notNull(),
  userId: text("user_id").notNull(),
  lotId: text("lot_id"),
  status: text("status").notNull().default("pending"),
  resultJson: text("result_json"), 
  calculatorInputJson: text("calculator_input_json"),
  calculatorOutputJson: text("calculator_output_json"),
  auditSnapshotJson: text("audit_snapshot_json"),
  certifiedAt: integer("certified_at", { mode: "timestamp" }),
  settlementHash: text("settlement_hash"),
  trustScore: real("trust_score").default(100),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});

export const batchItems = sqliteTable("batch_items", {
  id: text("id").primaryKey(),
  teamId: text("team_id").notNull(),
  userId: text("user_id").notNull(),
  batchId: text("batch_id").notNull(),
  metalType: text("metal_type").notNull(),
  weight: real("weight").notNull(),
  weightUnit: text("weight_unit").default("g"),
  purityPct: real("purity_pct"),
  calculatedValue: real("calculated_value"),
  economicOutputJson: text("economic_output_json"),
  auditSnapshotJson: text("audit_snapshot_json"),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});

export const auditTrace = sqliteTable("audit_trace", {
  id: text("id").primaryKey(),
  teamId: text("team_id").notNull(),
  userId: text("user_id"),
  action: text("action").notNull(),
  category: text("category").notNull(),
  resourceId: text("resource_id"),
  message: text("message").notNull(),
  metadataJson: text("metadata_json"),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});

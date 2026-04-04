import {
  boolean,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import type { AdapterAccount } from "next-auth/adapters";

export const users = pgTable(
  "users",
  {
    id: varchar("id", { length: 255 }).primaryKey(),
    email: varchar("email", { length: 255 }).notNull(),
    name: varchar("name", { length: 255 }),
    passwordHash: varchar("password_hash", { length: 255 }),
    activeTeamId: uuid("active_team_id"),
    emailVerified: timestamp("email_verified", { mode: "date" }),
    image: varchar("image", { length: 255 }),
    failedAttempts: numeric("failed_attempts").default("0"),
    lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
    idVerifiedAt: timestamp("id_verified_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("users_email_unique_idx").on(table.email)],
);

export const accounts = pgTable(
  "accounts",
  {
    userId: varchar("user_id", { length: 255 })
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: varchar("type", { length: 255 })
      .$type<AdapterAccount["type"]>()
      .notNull(),
    provider: varchar("provider", { length: 255 }).notNull(),
    providerAccountId: varchar("provider_account_id", { length: 255 }).notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: varchar("token_type", { length: 255 }),
    scope: varchar("scope", { length: 255 }),
    id_token: text("id_token"),
    session_state: varchar("session_state", { length: 255 }),
  },
  (account) => [
    primaryKey({ columns: [account.provider, account.providerAccountId] }),
    index("accounts_user_id_idx").on(account.userId),
  ],
);

export const sessions = pgTable(
  "sessions",
  {
    sessionToken: varchar("session_token", { length: 255 }).notNull().primaryKey(),
    userId: varchar("user_id", { length: 255 })
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    expires: timestamp("expires", { mode: "date" }).notNull(),
  },
  (session) => [index("sessions_user_id_idx").on(session.userId)],
);

export const verificationTokens = pgTable(
  "verification_tokens",
  {
    identifier: varchar("identifier", { length: 255 }).notNull(),
    token: varchar("token", { length: 255 }).notNull(),
    expires: timestamp("expires", { mode: "date" }).notNull(),
  },
  (vt) => [primaryKey({ columns: [vt.identifier, vt.token] })],
);

export const teams = pgTable(
  "teams",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    ownerId: varchar("owner_id", { length: 255 })
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 255 }).notNull(),
    /**
     * Phase 44: Refining Fee Configuration
     * Global team settings for tax rates and service charges.
     * Shape: { defaultTaxRate, defaultServiceFee, refiningOptions: { ... } }
     */
    feeConfig: jsonb("fee_config"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("teams_owner_id_idx").on(table.ownerId)],
);

export const teamMembers = pgTable(
  "team_members",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    teamId: uuid("team_id")
      .notNull()
      .references(() => teams.id, { onDelete: "cascade" }),
    userId: varchar("user_id", { length: 255 })
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: varchar("role", { length: 32 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("team_members_team_id_idx").on(table.teamId),
    index("team_members_user_id_idx").on(table.userId),
    uniqueIndex("team_members_team_user_unique_idx").on(table.teamId, table.userId),
  ],
);

export const teamInvites = pgTable(
  "team_invites",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    teamId: uuid("team_id")
      .notNull()
      .references(() => teams.id, { onDelete: "cascade" }),
    email: varchar("email", { length: 255 }).notNull(),
    invitedBy: varchar("invited_by", { length: 255 })
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("team_invites_team_id_idx").on(table.teamId),
    index("team_invites_email_idx").on(table.email),
    uniqueIndex("team_invites_team_email_unique_idx").on(table.teamId, table.email),
  ],
);

export const billing = pgTable(
  "billing",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    teamId: uuid("team_id")
      .notNull()
      .references(() => teams.id, { onDelete: "cascade" }),
    stripeCustomerId: varchar("stripe_customer_id", { length: 255 }),
    stripeSubscriptionId: varchar("stripe_subscription_id", { length: 255 }),
    plan: varchar("plan", { length: 32 }).notNull().default("free"),
    status: varchar("status", { length: 32 }).notNull().default("active"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("billing_team_id_unique_idx").on(table.teamId),
    uniqueIndex("billing_stripe_customer_id_unique_idx").on(table.stripeCustomerId),
    uniqueIndex("billing_stripe_subscription_id_unique_idx").on(table.stripeSubscriptionId),
  ],
);

// ─── Lots ────────────────────────────────────────────────────────────────────

export const lots = pgTable(
  "lots",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    lotNumber: varchar("lot_number", { length: 100 }).notNull(),
    sourceName: varchar("source_name", { length: 255 }),
    materialType: varchar("material_type", { length: 100 }).notNull(),
    grossWeight: numeric("gross_weight", { precision: 14, scale: 4 }),
    weightUnit: varchar("weight_unit", { length: 16 }).notNull().default("g"),
    intakeStatus: varchar("intake_status", { length: 50 }).notNull().default("received"),
    chainOfCustodyRef: varchar("chain_of_custody_ref", { length: 255 }),
    receivedAt: timestamp("received_at", { withTimezone: true }),
    teamId: uuid("team_id")
      .notNull()
      .references(() => teams.id, { onDelete: "cascade" }),
    userId: varchar("user_id", { length: 255 })
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    refiningFeeSchedule: jsonb("refining_fee_schedule"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("lots_lot_number_unique_idx").on(table.lotNumber),
    index("lots_team_id_idx").on(table.teamId),
    index("lots_user_id_idx").on(table.userId),
  ],
);

export const lotCosts = pgTable("lot_costs", {
  id: uuid("id").defaultRandom().primaryKey(),
  lotId: uuid("lot_id")
    .notNull()
    .references(() => lots.id, { onDelete: "cascade" }),
  teamId: uuid("team_id")
    .notNull()
    .references(() => teams.id, { onDelete: "cascade" }),
  userId: varchar("user_id", { length: 255 })
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  costCategory: varchar("cost_category", { length: 100 }).notNull(),
  amount: numeric("amount", { precision: 14, scale: 2 }).notNull(),
  currency: varchar("currency", { length: 3 }).notNull().default("USD"),
  notes: text("notes"),
  incurredAt: timestamp("incurred_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("lot_costs_lot_id_idx").on(table.lotId),
  index("lot_costs_team_id_idx").on(table.teamId),
  index("lot_costs_user_id_idx").on(table.userId),
]);

export const lotRecoveries = pgTable("lot_recoveries", {
  id: uuid("id").defaultRandom().primaryKey(),
  lotId: uuid("lot_id")
    .notNull()
    .references(() => lots.id, { onDelete: "cascade" }),
  teamId: uuid("team_id")
    .notNull()
    .references(() => teams.id, { onDelete: "cascade" }),
  userId: varchar("user_id", { length: 255 })
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  metalType: varchar("metal_type", { length: 100 }).notNull(),
  recoveredWeight: numeric("recovered_weight", { precision: 14, scale: 4 }).notNull(),
  weightUnit: varchar("weight_unit", { length: 16 }).notNull().default("g"),
  purityPct: numeric("purity_pct", { precision: 5, scale: 2 }),
  payableWeightPct: numeric("payable_weight_pct", { precision: 5, scale: 2 }).notNull().default("98.5"),
  refiningChargePerOz: numeric("refining_charge_per_oz", { precision: 14, scale: 2 }).notNull().default("0"),
  penaltyFees: numeric("penalty_fees", { precision: 14, scale: 2 }).notNull().default("0"),
  estimatedValue: numeric("estimated_value", { precision: 14, scale: 2 }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("lot_recoveries_lot_id_idx").on(table.lotId),
  index("lot_recoveries_team_id_idx").on(table.teamId),
  index("lot_recoveries_user_id_idx").on(table.userId),
]);

export const lotRoi = pgTable(
  "lot_roi",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    lotId: uuid("lot_id")
      .notNull()
      .references(() => lots.id, { onDelete: "cascade" }),
    teamId: uuid("team_id")
      .notNull()
      .references(() => teams.id, { onDelete: "cascade" }),
    userId: varchar("user_id", { length: 255 })
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    totalCost: numeric("total_cost", { precision: 14, scale: 2 }).notNull().default("0"),
    revenue: numeric("revenue", { precision: 14, scale: 2 }).notNull().default("0"),
    profit: numeric("profit", { precision: 14, scale: 2 }).notNull().default("0"),
    netSettlementValue: numeric("net_settlement_value", { precision: 14, scale: 2 }).notNull().default("0"),
    roiPct: numeric("roi_pct", { precision: 10, scale: 4 }).notNull().default("0"),
    marginPct: numeric("margin_pct", { precision: 10, scale: 4 }),
    recoveryEfficiencyPct: numeric("recovery_efficiency_pct", { precision: 5, scale: 2 }),
    calculatedAt: timestamp("calculated_at", { withTimezone: true }).notNull().defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("lot_roi_lot_id_unique_idx").on(table.lotId),
    index("lot_roi_team_id_idx").on(table.teamId),
    index("lot_roi_user_id_idx").on(table.userId),
  ],
);

// ─── Metals V1 ───────────────────────────────────────────────────────────────

export const priceSnapshots = pgTable("price_snapshots", {
  id: uuid("id").defaultRandom().primaryKey(),
  teamId: uuid("team_id")
    .notNull()
    .references(() => teams.id, { onDelete: "cascade" }),
  userId: varchar("user_id", { length: 255 })
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  source: varchar("source", { length: 50 }).notNull().default("fallback"),
  goldUsdPerOz: numeric("gold_usd_per_oz", { precision: 14, scale: 4 }),
  silverUsdPerOz: numeric("silver_usd_per_oz", { precision: 14, scale: 4 }),
  platinumUsdPerOz: numeric("platinum_usd_per_oz", { precision: 14, scale: 4 }),
  palladiumUsdPerOz: numeric("palladium_usd_per_oz", { precision: 14, scale: 4 }),
  fetchedAt: timestamp("fetched_at", { withTimezone: true }).notNull().defaultNow(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("price_snapshots_user_id_idx").on(table.userId),
  index("price_snapshots_team_id_idx").on(table.teamId),
]);

export const metalPrices = pgTable(
  "metal_prices",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    metalType: varchar("metal_type", { length: 32 }).notNull(),
    priceUsdPerUnit: numeric("price_usd_per_unit", { precision: 14, scale: 4 }).notNull(),
    timestamp: timestamp("timestamp", { withTimezone: true }).notNull(),
    source: varchar("source", { length: 120 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("metal_prices_metal_type_idx").on(table.metalType),
    index("metal_prices_timestamp_idx").on(table.timestamp),
    uniqueIndex("metal_prices_metal_timestamp_unique_idx").on(table.metalType, table.timestamp),
  ],
);

export const formulaVersions = pgTable("formula_versions", {
  id: uuid("id").defaultRandom().primaryKey(),
  version: varchar("version", { length: 50 }).notNull(),
  description: text("description"),
  formulaJson: jsonb("formula_json").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const batches = pgTable("batches", {
  id: uuid("id").defaultRandom().primaryKey(),
  teamId: uuid("team_id")
    .notNull()
    .references(() => teams.id, { onDelete: "cascade" }),
  userId: varchar("user_id", { length: 255 })
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  lotId: uuid("lot_id").references(() => lots.id, { onDelete: "set null" }),
  formulaVersionId: uuid("formula_version_id").references(() => formulaVersions.id),
  priceSnapshotId: uuid("price_snapshot_id").references(() => priceSnapshots.id),
  status: varchar("status", { length: 50 }).notNull().default("pending"),
  /**
   * Aggregate economic summary for the batch.
   * Shape: { totalGrossValue, totalNetValue, totalProfitLoss, totalAcquisitionCost, itemCount }
   */
  resultJson: jsonb("result_json"),
  /**
   * The validated CalculatorInput submitted by the UI for the reference calculation.
   * Stored as-is for auditability. Never used to re-derive output — see calculatorOutputJson.
   */
  calculatorInputJson: jsonb("calculator_input_json"),
  /**
   * The canonical CalculatorResult computed server-side from calculatorInputJson.
   * This is the authoritative output — client-supplied calculatorOutput is always discarded.
   */
  calculatorOutputJson: jsonb("calculator_output_json"),
  customerName: varchar("customer_name", { length: 255 }),
  customerEmail: varchar("customer_email", { length: 255 }),
  customerReference: varchar("customer_reference", { length: 255 }),
  /**
   * Immutable v1.3.0 Trust Snapshot for the entire batch.
   * Contains audit traces, engine versions, and collective trust scores.
   */
  auditSnapshotJson: jsonb("audit_snapshot_json"),
  /**
   * Phase 18: Settlement Lifecycle
   * certifiedAt: Timestamp when the batch was officially locked for settlement.
   * settlementHash: SHA-256 fingerprint of the audit snapshot at certification time.
   */
  certifiedAt: timestamp("certified_at", { withTimezone: true }),
  settlementHash: varchar("settlement_hash", { length: 64 }),
  /**
   * Phase 30: Multi-Tenancy Trust Score
   * Calculated aggregate from auditSnapshotJson (0-100).
   */
  trustScore: numeric("trust_score", { precision: 5, scale: 2 }).default("100"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("batches_user_id_idx").on(table.userId),
  index("batches_team_id_idx").on(table.teamId),
]);

export const reports = pgTable(
  "reports",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    teamId: uuid("team_id")
      .notNull()
      .references(() => teams.id, { onDelete: "cascade" }),
    userId: varchar("user_id", { length: 255 })
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    batchId: uuid("batch_id").references(() => batches.id, { onDelete: "cascade" }),
    type: varchar("type", { length: 32 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("reports_team_id_idx").on(table.teamId),
    index("reports_user_id_idx").on(table.userId),
    index("reports_batch_id_idx").on(table.batchId),
    index("reports_created_at_idx").on(table.createdAt),
  ],
);

export const reportSchedules = pgTable(
  "report_schedules",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    teamId: uuid("team_id")
      .notNull()
      .references(() => teams.id, { onDelete: "cascade" }),
    userId: varchar("user_id", { length: 255 })
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: varchar("type", { length: 32 }).notNull(),
    batchId: uuid("batch_id").references(() => batches.id, { onDelete: "cascade" }),
    cadence: varchar("cadence", { length: 32 }).notNull(),
    nextRunAt: timestamp("next_run_at", { withTimezone: true }).notNull(),
    isPaused: boolean("is_paused").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("report_schedules_team_id_idx").on(table.teamId),
    index("report_schedules_user_id_idx").on(table.userId),
    index("report_schedules_batch_id_idx").on(table.batchId),
    index("report_schedules_next_run_at_idx").on(table.nextRunAt),
    index("report_schedules_type_idx").on(table.type),
  ],
);

export const batchItems = pgTable("batch_items", {
  id: uuid("id").defaultRandom().primaryKey(),
  teamId: uuid("team_id")
    .notNull()
    .references(() => teams.id, { onDelete: "cascade" }),
  userId: varchar("user_id", { length: 255 })
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  batchId: uuid("batch_id")
    .notNull()
    .references(() => batches.id, { onDelete: "cascade" }),
  metalType: varchar("metal_type", { length: 100 }).notNull(),
  weight: numeric("weight", { precision: 14, scale: 4 }).notNull(),
  weightUnit: varchar("weight_unit", { length: 16 }).notNull().default("g"),
  purityPct: numeric("purity_pct", { precision: 5, scale: 2 }),
  /** netValue — kept as a scalar for SQL-level aggregation */
  calculatedValue: numeric("calculated_value", { precision: 14, scale: 2 }),
  /**
   * Full CalculatorResult stored as JSONB.
   * Contains all economic fields (grossValue, netValue, profitLoss, marginPct, etc.).
   * Use this for display and audit; use calculatedValue for SQL aggregation.
   */
  economicOutputJson: jsonb("economic_output_json"),
  isHardwareVerified: boolean("is_hardware_verified").default(false),
  hardwareDeviceId: text("hardware_device_id"),
  /**
   * Immutable v1.3.0 Trust Snapshot for this specific item.
   * Contains the item-level audit trace for settlement integrity.
   */
  auditSnapshotJson: jsonb("audit_snapshot_json"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("batch_items_user_id_idx").on(table.userId),
  index("batch_items_team_id_idx").on(table.teamId),
]);

export const tags = pgTable(
  "tags",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    teamId: uuid("team_id")
      .notNull()
      .references(() => teams.id, { onDelete: "cascade" }),
    userId: varchar("user_id", { length: 255 })
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 64 }).notNull(),
    color: varchar("color", { length: 32 }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("tags_team_id_idx").on(table.teamId),
    index("tags_user_id_idx").on(table.userId),
    uniqueIndex("tags_team_name_unique_idx").on(table.teamId, table.name),
  ],
);

export const batchTags = pgTable(
  "batch_tags",
  {
    teamId: uuid("team_id")
      .notNull()
      .references(() => teams.id, { onDelete: "cascade" }),
    batchId: uuid("batch_id")
      .notNull()
      .references(() => batches.id, { onDelete: "cascade" }),
    tagId: uuid("tag_id")
      .notNull()
      .references(() => tags.id, { onDelete: "cascade" }),
    userId: varchar("user_id", { length: 255 })
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("batch_tags_team_id_idx").on(table.teamId),
    index("batch_tags_user_id_idx").on(table.userId),
    index("batch_tags_batch_id_idx").on(table.batchId),
    uniqueIndex("batch_tags_team_batch_tag_unique_idx").on(table.teamId, table.batchId, table.tagId),
  ],
);

// ─── Phase 30: Investigations ────────────────────────────────────────────────

export const investigations = pgTable(
  "investigations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    teamId: uuid("team_id")
      .notNull()
      .references(() => teams.id, { onDelete: "cascade" }),
    userId: varchar("user_id", { length: 255 })
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    title: varchar("title", { length: 255 }).notNull(),
    summary: text("summary"),
    status: varchar("status", { length: 32 }).notNull().default("open"),
    severity: varchar("severity", { length: 32 }).notNull().default("medium"),
    resolution: varchar("resolution", { length: 32 }), // verified, adjusted, dismissed
    /** JSONB array of evidence (links, audit extracts, analysis) */
    evidenceJson: jsonb("evidence_json"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("investigations_team_id_idx").on(table.teamId),
    index("investigations_user_id_idx").on(table.userId),
    index("investigations_status_idx").on(table.status),
  ],
);

export const investigationBatches = pgTable(
  "investigation_batches",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    investigationId: uuid("investigation_id")
      .notNull()
      .references(() => investigations.id, { onDelete: "cascade" }),
    batchId: uuid("batch_id")
      .notNull()
      .references(() => batches.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("investigation_batches_investigation_id_idx").on(table.investigationId),
    index("investigation_batches_batch_id_idx").on(table.batchId),
    uniqueIndex("investigation_batches_unique_idx").on(table.investigationId, table.batchId),
  ],
);

export const notifications = pgTable(
  "notifications",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    teamId: uuid("team_id")
      .notNull()
      .references(() => teams.id, { onDelete: "cascade" }),
    userId: varchar("user_id", { length: 255 })
      .references(() => users.id, { onDelete: "cascade" }),
    type: varchar("type", { length: 64 }).notNull(), // investigation_created, trust_alert
    message: text("message").notNull(),
    metadataJson: jsonb("metadata_json"),
    readAt: timestamp("read_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("notifications_team_id_idx").on(table.teamId),
    index("notifications_user_id_idx").on(table.userId),
    index("notifications_created_at_idx").on(table.createdAt),
  ],
);

/**
 * Phase 41: Sovereign Audit Trace
 * Immutable system-wide audit ledger.
 * RECOMMENDATION: Apply DB trigger to abort UPDATE/DELETE on this table.
 */
export const auditTrace = pgTable(
  "audit_trace",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    teamId: uuid("team_id")
      .notNull()
      .references(() => teams.id, { onDelete: "cascade" }),
    userId: varchar("user_id", { length: 255 })
      .references(() => users.id, { onDelete: "set null" }),
    action: varchar("action", { length: 120 }).notNull(),
    category: varchar("category", { length: 64 }).notNull(),
    resourceId: varchar("resource_id", { length: 255 }),
    message: text("message").notNull(),
    metadataJson: jsonb("metadata_json"),
    ipAddress: varchar("ip_address", { length: 64 }),
    userAgent: text("user_agent"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("audit_trace_team_id_idx").on(table.teamId),
    index("audit_trace_category_idx").on(table.category),
    index("audit_trace_created_at_idx").on(table.createdAt),
  ],
);

/**
 * Phase 44: Sovereign Telemetry (Resilience Monitoring)
 * Records autonomous fallbacks to mock-data-gate for non-repudiable failure tracking.
 */
export const systemTelemetry = pgTable(
  "system_telemetry",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    teamId: uuid("team_id")
      .notNull()
      .references(() => teams.id, { onDelete: "cascade" }),
    serviceName: varchar("service_name", { length: 120 }).notNull(),
    methodName: varchar("method_name", { length: 120 }).notNull(),
    errorType: varchar("error_type", { length: 64 }),
    severity: varchar("severity", { length: 32 }).notNull().default("info"),
    traceId: varchar("trace_id", { length: 255 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("system_telemetry_team_id_idx").on(table.teamId),
    index("system_telemetry_created_at_idx").on(table.createdAt),
  ],
);

// ─── Phase 43: Field Operations (v1.8.0-YARD) ───────────────────────────────

export const tickets = pgTable(
  "tickets",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    teamId: uuid("team_id")
      .notNull()
      .references(() => teams.id, { onDelete: "cascade" }),
    userId: varchar("user_id", { length: 255 })
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: varchar("type", { length: 32 }).notNull().default("inbound"), // inbound, outbound, transfer
    status: varchar("status", { length: 32 }).notNull().default("pending"), // pending, weighted, captured, verified, closed
    grossWeight: numeric("gross_weight", { precision: 14, scale: 4 }),
    tareWeight: numeric("tare_weight", { precision: 14, scale: 4 }),
    netWeight: numeric("net_weight", { precision: 14, scale: 4 }),
    weightUnit: varchar("weight_unit", { length: 16 }).default("lbs"),
    photoUrl: text("photo_url"), // Scale snapshot URL
    idVerified: boolean("id_verified").default(false),
    isHardwareVerified: boolean("is_hardware_verified").default(false),
    hardwareDeviceId: text("hardware_device_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("tickets_team_id_idx").on(table.teamId),
    index("tickets_status_idx").on(table.status),
    index("tickets_created_at_idx").on(table.createdAt),
  ],
);

export const complianceRecords = pgTable(
  "compliance_records",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    ticketId: uuid("ticket_id")
      .notNull()
      .references(() => tickets.id, { onDelete: "cascade" }),
    teamId: uuid("team_id")
      .notNull()
      .references(() => teams.id, { onDelete: "cascade" }),
    // NMVTIS MANDATORY FIELDS (28 CFR 25.56)
    vin: varchar("vin", { length: 17 }),
    make: varchar("make", { length: 64 }),
    model: varchar("model", { length: 64 }),
    year: integer("year"),
    disposition: varchar("disposition", { length: 64 }), // crushed, disposed, sold, parts
    isExport: boolean("is_export").default(false),
    sellerName: varchar("seller_name", { length: 255 }),
    sellerAddress: text("seller_address"),
    sellerIdNumber: varchar("seller_id_number", { length: 120 }), // DL scan or similar
    sellerIdState: varchar("seller_id_state", { length: 2 }),
    sellerSignatureUrl: text("seller_signature_url"),
    thumbprintCaptured: boolean("thumbprint_captured").default(false),
    nmvtisSubmitted: boolean("nmvtis_submitted").default(false),
    nmvtisReference: varchar("nmvtis_reference", { length: 255 }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("compliance_records_ticket_id_idx").on(table.ticketId),
    index("compliance_records_vin_idx").on(table.vin),
    index("compliance_records_nmvtis_submitted_idx").on(table.nmvtisSubmitted),
  ],
);

// ─── Phase 44: Commercial Flow (v1.9.0-COMMERCIAL) ─────────────────────────

export const suppliers = pgTable(
  "suppliers",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    teamId: uuid("team_id")
      .notNull()
      .references(() => teams.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 255 }).notNull(),
    email: varchar("email", { length: 255 }).notNull(),
    phone: varchar("phone", { length: 32 }),
    address: text("address"),
    taxId: varchar("tax_id", { length: 50 }), // EIN / SSN
    status: varchar("status", { length: 32 }).notNull().default("active"),
    portalEnabled: boolean("portal_enabled").default(false),
    paymentPreference: varchar("payment_preference", { length: 32 }).default("check"), // check, ach, paypal
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("suppliers_team_id_idx").on(table.teamId),
    index("suppliers_email_idx").on(table.email),
  ],
);

export const settlements = pgTable(
  "settlements",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    teamId: uuid("team_id")
      .notNull()
      .references(() => teams.id, { onDelete: "cascade" }),
    userId: varchar("user_id", { length: 255 })
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    batchId: uuid("batch_id")
      .references(() => batches.id, { onDelete: "cascade" }),
    supplierId: uuid("supplier_id")
      .references(() => suppliers.id, { onDelete: "set null" }),
    status: varchar("status", { length: 32 }).notNull().default("draft"), // draft, approved, paid, void
    grossValue: numeric("gross_value", { precision: 14, scale: 2 }).notNull(),
    deductionsTotal: numeric("deductions_total", { precision: 14, scale: 2 }).default("0.00"),
    taxValue: numeric("tax_value", { precision: 14, scale: 2 }).default("0.00"),
    netPayout: numeric("net_payout", { precision: 14, scale: 2 }).notNull(),
    currency: varchar("currency", { length: 3 }).notNull().default("USD"),
    auditHash: varchar("audit_hash", { length: 64 }).notNull(), // Lock to original audit
    approvedAt: timestamp("approved_at", { withTimezone: true }),
    paidAt: timestamp("paid_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("settlements_team_id_idx").on(table.teamId),
    index("settlements_supplier_id_idx").on(table.supplierId),
    index("settlements_status_idx").on(table.status),
  ],
);

export const payouts = pgTable(
  "payouts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    settlementId: uuid("settlement_id")
      .notNull()
      .references(() => settlements.id, { onDelete: "cascade" }),
    method: varchar("method", { length: 32 }).notNull(), // stripe, ach, check, paypal
    reference: varchar("reference", { length: 255 }), // Check number, Stripe ID, etc.
    amount: numeric("amount", { precision: 14, scale: 2 }).notNull(),
    status: varchar("status", { length: 32 }).notNull().default("pending"),
    processedAt: timestamp("processed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("payouts_settlement_id_idx").on(table.settlementId),
    index("payouts_reference_idx").on(table.reference),
  ],
);

// ─── Phase 45: Global Compliance (v1.9.5) ──────────────────────────────────

export const currencies = pgTable(
  "currencies",
  {
    code: varchar("code", { length: 3 }).primaryKey(), // USD, EUR, GBP, CAD
    name: varchar("name", { length: 64 }).notNull(),
    symbol: varchar("symbol", { length: 8 }).notNull(),
    isBase: boolean("is_base").default(false),
    status: varchar("status", { length: 32 }).notNull().default("active"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  }
);

export const exchangeRates = pgTable(
  "exchange_rates",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    fromCurrency: varchar("from_currency", { length: 3 })
      .notNull()
      .references(() => currencies.code),
    toCurrency: varchar("to_currency", { length: 3 })
      .notNull()
      .references(() => currencies.code),
    rate: numeric("rate", { precision: 18, scale: 9 }).notNull(),
    provider: varchar("provider", { length: 64 }).notNull(), // Ex: "SovereignFX-Mock"
    timestamp: timestamp("timestamp", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("exchange_rates_to_currency_idx").on(table.toCurrency),
  ],
);

// ─── Phase 46: Enterprise Fleet & Logistics (v1.10.0) ──────────────────────

export const fleetAssets = pgTable(
  "fleet_assets",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    teamId: uuid("team_id")
      .notNull()
      .references(() => teams.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 255 }).notNull(),
    type: varchar("type", { length: 64 }).notNull(), // Truck, Van, Trailer
    plateNumber: varchar("plate_number", { length: 32 }),
    status: varchar("status", { length: 32 }).notNull().default("active"), // active, maintenance, inactive
    currentLocation: jsonb("current_location"), // { lat, lng, speed, heading }
    telemetryMetadata: jsonb("telemetry_metadata"), // { fuelLevel, odometer, weightValue }
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("fleet_assets_team_id_idx").on(table.teamId),
  ],
);

export const dispatches = pgTable(
  "dispatches",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    teamId: uuid("team_id")
      .notNull()
      .references(() => teams.id, { onDelete: "cascade" }),
    assetId: uuid("asset_id")
      .references(() => fleetAssets.id, { onDelete: "set null" }),
    batchId: uuid("batch_id")
      .references(() => batches.id, { onDelete: "set null" }),
    origin: text("origin").notNull(),
    destination: text("destination").notNull(),
    status: varchar("status", { length: 32 }).notNull().default("dispatched"), // dispatched, en_route, loading, returning, completed
    eta: timestamp("eta", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("dispatches_team_id_idx").on(table.teamId),
    index("dispatches_asset_id_idx").on(table.assetId),
  ],
);

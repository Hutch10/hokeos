CREATE TABLE "accounts" (
	"user_id" varchar(255) NOT NULL,
	"type" varchar(255) NOT NULL,
	"provider" varchar(255) NOT NULL,
	"provider_account_id" varchar(255) NOT NULL,
	"refresh_token" text,
	"access_token" text,
	"expires_at" integer,
	"token_type" varchar(255),
	"scope" varchar(255),
	"id_token" text,
	"session_state" varchar(255),
	CONSTRAINT "accounts_provider_provider_account_id_pk" PRIMARY KEY("provider","provider_account_id")
);
--> statement-breakpoint
CREATE TABLE "audit_trace" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"team_id" uuid NOT NULL,
	"user_id" varchar(255),
	"action" varchar(120) NOT NULL,
	"category" varchar(64) NOT NULL,
	"resource_id" varchar(255),
	"message" text NOT NULL,
	"metadata_json" jsonb,
	"ip_address" varchar(64),
	"user_agent" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "compliance_records" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ticket_id" uuid NOT NULL,
	"team_id" uuid NOT NULL,
	"vin" varchar(17),
	"make" varchar(64),
	"model" varchar(64),
	"year" integer,
	"disposition" varchar(64),
	"is_export" boolean DEFAULT false,
	"seller_name" varchar(255),
	"seller_address" text,
	"seller_id_number" varchar(120),
	"seller_id_state" varchar(2),
	"seller_signature_url" text,
	"thumbprint_captured" boolean DEFAULT false,
	"nmvtis_submitted" boolean DEFAULT false,
	"nmvtis_reference" varchar(255),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "currencies" (
	"code" varchar(3) PRIMARY KEY NOT NULL,
	"name" varchar(64) NOT NULL,
	"symbol" varchar(8) NOT NULL,
	"is_base" boolean DEFAULT false,
	"status" varchar(32) DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "dispatches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"team_id" uuid NOT NULL,
	"asset_id" uuid,
	"batch_id" uuid,
	"origin" text NOT NULL,
	"destination" text NOT NULL,
	"status" varchar(32) DEFAULT 'dispatched' NOT NULL,
	"eta" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "exchange_rates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"from_currency" varchar(3) NOT NULL,
	"to_currency" varchar(3) NOT NULL,
	"rate" numeric(18, 9) NOT NULL,
	"provider" varchar(64) NOT NULL,
	"timestamp" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "fleet_assets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"team_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"type" varchar(64) NOT NULL,
	"plate_number" varchar(32),
	"status" varchar(32) DEFAULT 'active' NOT NULL,
	"current_location" jsonb,
	"telemetry_metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "investigation_batches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"investigation_id" uuid NOT NULL,
	"batch_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "investigations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"team_id" uuid NOT NULL,
	"user_id" varchar(255) NOT NULL,
	"title" varchar(255) NOT NULL,
	"summary" text,
	"status" varchar(32) DEFAULT 'open' NOT NULL,
	"severity" varchar(32) DEFAULT 'medium' NOT NULL,
	"resolution" varchar(32),
	"evidence_json" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"team_id" uuid NOT NULL,
	"user_id" varchar(255),
	"type" varchar(64) NOT NULL,
	"message" text NOT NULL,
	"metadata_json" jsonb,
	"read_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payouts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"settlement_id" uuid NOT NULL,
	"method" varchar(32) NOT NULL,
	"reference" varchar(255),
	"amount" numeric(14, 2) NOT NULL,
	"status" varchar(32) DEFAULT 'pending' NOT NULL,
	"processed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"session_token" varchar(255) PRIMARY KEY NOT NULL,
	"user_id" varchar(255) NOT NULL,
	"expires" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "settlements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"team_id" uuid NOT NULL,
	"user_id" varchar(255) NOT NULL,
	"batch_id" uuid,
	"supplier_id" uuid,
	"status" varchar(32) DEFAULT 'draft' NOT NULL,
	"gross_value" numeric(14, 2) NOT NULL,
	"deductions_total" numeric(14, 2) DEFAULT '0.00',
	"tax_value" numeric(14, 2) DEFAULT '0.00',
	"net_payout" numeric(14, 2) NOT NULL,
	"currency" varchar(3) DEFAULT 'USD' NOT NULL,
	"audit_hash" varchar(64) NOT NULL,
	"approved_at" timestamp with time zone,
	"paid_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "suppliers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"team_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"email" varchar(255) NOT NULL,
	"phone" varchar(32),
	"address" text,
	"tax_id" varchar(50),
	"status" varchar(32) DEFAULT 'active' NOT NULL,
	"portal_enabled" boolean DEFAULT false,
	"payment_preference" varchar(32) DEFAULT 'check',
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "system_telemetry" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"team_id" uuid NOT NULL,
	"service_name" varchar(120) NOT NULL,
	"method_name" varchar(120) NOT NULL,
	"error_type" varchar(64),
	"severity" varchar(32) DEFAULT 'info' NOT NULL,
	"trace_id" varchar(255) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tickets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"team_id" uuid NOT NULL,
	"user_id" varchar(255) NOT NULL,
	"type" varchar(32) DEFAULT 'inbound' NOT NULL,
	"status" varchar(32) DEFAULT 'pending' NOT NULL,
	"gross_weight" numeric(14, 4),
	"tare_weight" numeric(14, 4),
	"net_weight" numeric(14, 4),
	"weight_unit" varchar(16) DEFAULT 'lbs',
	"photo_url" text,
	"id_verified" boolean DEFAULT false,
	"is_hardware_verified" boolean DEFAULT false,
	"hardware_device_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "verification_tokens" (
	"identifier" varchar(255) NOT NULL,
	"token" varchar(255) NOT NULL,
	"expires" timestamp NOT NULL,
	CONSTRAINT "verification_tokens_identifier_token_pk" PRIMARY KEY("identifier","token")
);
--> statement-breakpoint
ALTER TABLE "batch_items" ADD COLUMN "is_hardware_verified" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "batch_items" ADD COLUMN "hardware_device_id" text;--> statement-breakpoint
ALTER TABLE "batch_items" ADD COLUMN "audit_snapshot_json" jsonb;--> statement-breakpoint
ALTER TABLE "batches" ADD COLUMN "lot_id" uuid;--> statement-breakpoint
ALTER TABLE "batches" ADD COLUMN "audit_snapshot_json" jsonb;--> statement-breakpoint
ALTER TABLE "batches" ADD COLUMN "certified_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "batches" ADD COLUMN "settlement_hash" varchar(64);--> statement-breakpoint
ALTER TABLE "batches" ADD COLUMN "trust_score" numeric(5, 2) DEFAULT '100';--> statement-breakpoint
ALTER TABLE "lot_recoveries" ADD COLUMN "payable_weight_pct" numeric(5, 2) DEFAULT '98.5' NOT NULL;--> statement-breakpoint
ALTER TABLE "lot_recoveries" ADD COLUMN "refining_charge_per_oz" numeric(14, 2) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "lot_recoveries" ADD COLUMN "penalty_fees" numeric(14, 2) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "lot_roi" ADD COLUMN "net_settlement_value" numeric(14, 2) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "lot_roi" ADD COLUMN "recovery_efficiency_pct" numeric(5, 2);--> statement-breakpoint
ALTER TABLE "lots" ADD COLUMN "refining_fee_schedule" jsonb;--> statement-breakpoint
ALTER TABLE "teams" ADD COLUMN "fee_config" jsonb;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "email_verified" timestamp;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "image" varchar(255);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "failed_attempts" numeric DEFAULT '0';--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "last_login_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "id_verified_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_trace" ADD CONSTRAINT "audit_trace_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_trace" ADD CONSTRAINT "audit_trace_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "compliance_records" ADD CONSTRAINT "compliance_records_ticket_id_tickets_id_fk" FOREIGN KEY ("ticket_id") REFERENCES "public"."tickets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "compliance_records" ADD CONSTRAINT "compliance_records_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dispatches" ADD CONSTRAINT "dispatches_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dispatches" ADD CONSTRAINT "dispatches_asset_id_fleet_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."fleet_assets"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dispatches" ADD CONSTRAINT "dispatches_batch_id_batches_id_fk" FOREIGN KEY ("batch_id") REFERENCES "public"."batches"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exchange_rates" ADD CONSTRAINT "exchange_rates_from_currency_currencies_code_fk" FOREIGN KEY ("from_currency") REFERENCES "public"."currencies"("code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exchange_rates" ADD CONSTRAINT "exchange_rates_to_currency_currencies_code_fk" FOREIGN KEY ("to_currency") REFERENCES "public"."currencies"("code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fleet_assets" ADD CONSTRAINT "fleet_assets_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "investigation_batches" ADD CONSTRAINT "investigation_batches_investigation_id_investigations_id_fk" FOREIGN KEY ("investigation_id") REFERENCES "public"."investigations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "investigation_batches" ADD CONSTRAINT "investigation_batches_batch_id_batches_id_fk" FOREIGN KEY ("batch_id") REFERENCES "public"."batches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "investigations" ADD CONSTRAINT "investigations_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "investigations" ADD CONSTRAINT "investigations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payouts" ADD CONSTRAINT "payouts_settlement_id_settlements_id_fk" FOREIGN KEY ("settlement_id") REFERENCES "public"."settlements"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "settlements" ADD CONSTRAINT "settlements_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "settlements" ADD CONSTRAINT "settlements_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "settlements" ADD CONSTRAINT "settlements_batch_id_batches_id_fk" FOREIGN KEY ("batch_id") REFERENCES "public"."batches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "settlements" ADD CONSTRAINT "settlements_supplier_id_suppliers_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "suppliers" ADD CONSTRAINT "suppliers_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "system_telemetry" ADD CONSTRAINT "system_telemetry_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "accounts_user_id_idx" ON "accounts" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "audit_trace_team_id_idx" ON "audit_trace" USING btree ("team_id");--> statement-breakpoint
CREATE INDEX "audit_trace_category_idx" ON "audit_trace" USING btree ("category");--> statement-breakpoint
CREATE INDEX "audit_trace_created_at_idx" ON "audit_trace" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "compliance_records_ticket_id_idx" ON "compliance_records" USING btree ("ticket_id");--> statement-breakpoint
CREATE INDEX "compliance_records_vin_idx" ON "compliance_records" USING btree ("vin");--> statement-breakpoint
CREATE INDEX "compliance_records_nmvtis_submitted_idx" ON "compliance_records" USING btree ("nmvtis_submitted");--> statement-breakpoint
CREATE INDEX "dispatches_team_id_idx" ON "dispatches" USING btree ("team_id");--> statement-breakpoint
CREATE INDEX "dispatches_asset_id_idx" ON "dispatches" USING btree ("asset_id");--> statement-breakpoint
CREATE INDEX "exchange_rates_to_currency_idx" ON "exchange_rates" USING btree ("to_currency");--> statement-breakpoint
CREATE INDEX "fleet_assets_team_id_idx" ON "fleet_assets" USING btree ("team_id");--> statement-breakpoint
CREATE INDEX "investigation_batches_investigation_id_idx" ON "investigation_batches" USING btree ("investigation_id");--> statement-breakpoint
CREATE INDEX "investigation_batches_batch_id_idx" ON "investigation_batches" USING btree ("batch_id");--> statement-breakpoint
CREATE UNIQUE INDEX "investigation_batches_unique_idx" ON "investigation_batches" USING btree ("investigation_id","batch_id");--> statement-breakpoint
CREATE INDEX "investigations_team_id_idx" ON "investigations" USING btree ("team_id");--> statement-breakpoint
CREATE INDEX "investigations_user_id_idx" ON "investigations" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "investigations_status_idx" ON "investigations" USING btree ("status");--> statement-breakpoint
CREATE INDEX "notifications_team_id_idx" ON "notifications" USING btree ("team_id");--> statement-breakpoint
CREATE INDEX "notifications_user_id_idx" ON "notifications" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "notifications_created_at_idx" ON "notifications" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "payouts_settlement_id_idx" ON "payouts" USING btree ("settlement_id");--> statement-breakpoint
CREATE INDEX "payouts_reference_idx" ON "payouts" USING btree ("reference");--> statement-breakpoint
CREATE INDEX "sessions_user_id_idx" ON "sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "settlements_team_id_idx" ON "settlements" USING btree ("team_id");--> statement-breakpoint
CREATE INDEX "settlements_supplier_id_idx" ON "settlements" USING btree ("supplier_id");--> statement-breakpoint
CREATE INDEX "settlements_status_idx" ON "settlements" USING btree ("status");--> statement-breakpoint
CREATE INDEX "suppliers_team_id_idx" ON "suppliers" USING btree ("team_id");--> statement-breakpoint
CREATE INDEX "suppliers_email_idx" ON "suppliers" USING btree ("email");--> statement-breakpoint
CREATE INDEX "system_telemetry_team_id_idx" ON "system_telemetry" USING btree ("team_id");--> statement-breakpoint
CREATE INDEX "system_telemetry_created_at_idx" ON "system_telemetry" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "tickets_team_id_idx" ON "tickets" USING btree ("team_id");--> statement-breakpoint
CREATE INDEX "tickets_status_idx" ON "tickets" USING btree ("status");--> statement-breakpoint
CREATE INDEX "tickets_created_at_idx" ON "tickets" USING btree ("created_at");--> statement-breakpoint
ALTER TABLE "batches" ADD CONSTRAINT "batches_lot_id_lots_id_fk" FOREIGN KEY ("lot_id") REFERENCES "public"."lots"("id") ON DELETE set null ON UPDATE no action;

-- Phase 41: Sovereign Audit Trace Immutability Trigger
-- Prevents UPDATE and DELETE on the audit_trace table to ensure forensic integrity.

CREATE OR REPLACE FUNCTION abort_audit_mutation() RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'Audit trace is immutable. UPDATE and DELETE are prohibited.';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER lock_audit_trace
BEFORE UPDATE OR DELETE ON audit_trace
FOR EACH ROW EXECUTE FUNCTION abort_audit_mutation();
CREATE TABLE "batch_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"team_id" uuid NOT NULL,
	"user_id" varchar(255) NOT NULL,
	"batch_id" uuid NOT NULL,
	"metal_type" varchar(100) NOT NULL,
	"weight" numeric(14, 4) NOT NULL,
	"weight_unit" varchar(16) DEFAULT 'g' NOT NULL,
	"purity_pct" numeric(5, 2),
	"calculated_value" numeric(14, 2),
	"economic_output_json" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "batch_tags" (
	"team_id" uuid NOT NULL,
	"batch_id" uuid NOT NULL,
	"tag_id" uuid NOT NULL,
	"user_id" varchar(255) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "batches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"team_id" uuid NOT NULL,
	"user_id" varchar(255) NOT NULL,
	"formula_version_id" uuid,
	"price_snapshot_id" uuid,
	"status" varchar(50) DEFAULT 'pending' NOT NULL,
	"result_json" jsonb,
	"calculator_input_json" jsonb,
	"calculator_output_json" jsonb,
	"customer_name" varchar(255),
	"customer_email" varchar(255),
	"customer_reference" varchar(255),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "billing" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"team_id" uuid NOT NULL,
	"stripe_customer_id" varchar(255),
	"stripe_subscription_id" varchar(255),
	"plan" varchar(32) DEFAULT 'free' NOT NULL,
	"status" varchar(32) DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "formula_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"version" varchar(50) NOT NULL,
	"description" text,
	"formula_json" jsonb NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "metal_prices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"metal_type" varchar(32) NOT NULL,
	"price_usd_per_unit" numeric(14, 4) NOT NULL,
	"timestamp" timestamp with time zone NOT NULL,
	"source" varchar(120) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "price_snapshots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"team_id" uuid NOT NULL,
	"user_id" varchar(255) NOT NULL,
	"source" varchar(50) DEFAULT 'fallback' NOT NULL,
	"gold_usd_per_oz" numeric(14, 4),
	"silver_usd_per_oz" numeric(14, 4),
	"platinum_usd_per_oz" numeric(14, 4),
	"palladium_usd_per_oz" numeric(14, 4),
	"fetched_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "report_schedules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"team_id" uuid NOT NULL,
	"user_id" varchar(255) NOT NULL,
	"type" varchar(32) NOT NULL,
	"batch_id" uuid,
	"cadence" varchar(32) NOT NULL,
	"next_run_at" timestamp with time zone NOT NULL,
	"is_paused" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"team_id" uuid NOT NULL,
	"user_id" varchar(255) NOT NULL,
	"batch_id" uuid,
	"type" varchar(32) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tags" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"team_id" uuid NOT NULL,
	"user_id" varchar(255) NOT NULL,
	"name" varchar(64) NOT NULL,
	"color" varchar(32),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "team_invites" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"team_id" uuid NOT NULL,
	"email" varchar(255) NOT NULL,
	"invited_by" varchar(255) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "team_members" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"team_id" uuid NOT NULL,
	"user_id" varchar(255) NOT NULL,
	"role" varchar(32) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "teams" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_id" varchar(255) NOT NULL,
	"name" varchar(255) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"email" varchar(255) NOT NULL,
	"name" varchar(255),
	"password_hash" varchar(255),
	"active_team_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "lot_costs" ADD COLUMN "team_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "lot_costs" ADD COLUMN "user_id" varchar(255) NOT NULL;--> statement-breakpoint
ALTER TABLE "lot_recoveries" ADD COLUMN "team_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "lot_recoveries" ADD COLUMN "user_id" varchar(255) NOT NULL;--> statement-breakpoint
ALTER TABLE "lot_roi" ADD COLUMN "team_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "lot_roi" ADD COLUMN "user_id" varchar(255) NOT NULL;--> statement-breakpoint
ALTER TABLE "lots" ADD COLUMN "team_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "lots" ADD COLUMN "user_id" varchar(255) NOT NULL;--> statement-breakpoint
ALTER TABLE "batch_items" ADD CONSTRAINT "batch_items_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "batch_items" ADD CONSTRAINT "batch_items_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "batch_items" ADD CONSTRAINT "batch_items_batch_id_batches_id_fk" FOREIGN KEY ("batch_id") REFERENCES "public"."batches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "batch_tags" ADD CONSTRAINT "batch_tags_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "batch_tags" ADD CONSTRAINT "batch_tags_batch_id_batches_id_fk" FOREIGN KEY ("batch_id") REFERENCES "public"."batches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "batch_tags" ADD CONSTRAINT "batch_tags_tag_id_tags_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."tags"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "batch_tags" ADD CONSTRAINT "batch_tags_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "batches" ADD CONSTRAINT "batches_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "batches" ADD CONSTRAINT "batches_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "batches" ADD CONSTRAINT "batches_formula_version_id_formula_versions_id_fk" FOREIGN KEY ("formula_version_id") REFERENCES "public"."formula_versions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "batches" ADD CONSTRAINT "batches_price_snapshot_id_price_snapshots_id_fk" FOREIGN KEY ("price_snapshot_id") REFERENCES "public"."price_snapshots"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "billing" ADD CONSTRAINT "billing_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "price_snapshots" ADD CONSTRAINT "price_snapshots_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "price_snapshots" ADD CONSTRAINT "price_snapshots_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "report_schedules" ADD CONSTRAINT "report_schedules_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "report_schedules" ADD CONSTRAINT "report_schedules_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "report_schedules" ADD CONSTRAINT "report_schedules_batch_id_batches_id_fk" FOREIGN KEY ("batch_id") REFERENCES "public"."batches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reports" ADD CONSTRAINT "reports_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reports" ADD CONSTRAINT "reports_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reports" ADD CONSTRAINT "reports_batch_id_batches_id_fk" FOREIGN KEY ("batch_id") REFERENCES "public"."batches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tags" ADD CONSTRAINT "tags_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tags" ADD CONSTRAINT "tags_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_invites" ADD CONSTRAINT "team_invites_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_invites" ADD CONSTRAINT "team_invites_invited_by_users_id_fk" FOREIGN KEY ("invited_by") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_members" ADD CONSTRAINT "team_members_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_members" ADD CONSTRAINT "team_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "teams" ADD CONSTRAINT "teams_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "batch_items_user_id_idx" ON "batch_items" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "batch_items_team_id_idx" ON "batch_items" USING btree ("team_id");--> statement-breakpoint
CREATE INDEX "batch_tags_team_id_idx" ON "batch_tags" USING btree ("team_id");--> statement-breakpoint
CREATE INDEX "batch_tags_user_id_idx" ON "batch_tags" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "batch_tags_batch_id_idx" ON "batch_tags" USING btree ("batch_id");--> statement-breakpoint
CREATE UNIQUE INDEX "batch_tags_team_batch_tag_unique_idx" ON "batch_tags" USING btree ("team_id","batch_id","tag_id");--> statement-breakpoint
CREATE INDEX "batches_user_id_idx" ON "batches" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "batches_team_id_idx" ON "batches" USING btree ("team_id");--> statement-breakpoint
CREATE UNIQUE INDEX "billing_team_id_unique_idx" ON "billing" USING btree ("team_id");--> statement-breakpoint
CREATE UNIQUE INDEX "billing_stripe_customer_id_unique_idx" ON "billing" USING btree ("stripe_customer_id");--> statement-breakpoint
CREATE UNIQUE INDEX "billing_stripe_subscription_id_unique_idx" ON "billing" USING btree ("stripe_subscription_id");--> statement-breakpoint
CREATE INDEX "metal_prices_metal_type_idx" ON "metal_prices" USING btree ("metal_type");--> statement-breakpoint
CREATE INDEX "metal_prices_timestamp_idx" ON "metal_prices" USING btree ("timestamp");--> statement-breakpoint
CREATE UNIQUE INDEX "metal_prices_metal_timestamp_unique_idx" ON "metal_prices" USING btree ("metal_type","timestamp");--> statement-breakpoint
CREATE INDEX "price_snapshots_user_id_idx" ON "price_snapshots" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "price_snapshots_team_id_idx" ON "price_snapshots" USING btree ("team_id");--> statement-breakpoint
CREATE INDEX "report_schedules_team_id_idx" ON "report_schedules" USING btree ("team_id");--> statement-breakpoint
CREATE INDEX "report_schedules_user_id_idx" ON "report_schedules" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "report_schedules_batch_id_idx" ON "report_schedules" USING btree ("batch_id");--> statement-breakpoint
CREATE INDEX "report_schedules_next_run_at_idx" ON "report_schedules" USING btree ("next_run_at");--> statement-breakpoint
CREATE INDEX "report_schedules_type_idx" ON "report_schedules" USING btree ("type");--> statement-breakpoint
CREATE INDEX "reports_team_id_idx" ON "reports" USING btree ("team_id");--> statement-breakpoint
CREATE INDEX "reports_user_id_idx" ON "reports" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "reports_batch_id_idx" ON "reports" USING btree ("batch_id");--> statement-breakpoint
CREATE INDEX "reports_created_at_idx" ON "reports" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "tags_team_id_idx" ON "tags" USING btree ("team_id");--> statement-breakpoint
CREATE INDEX "tags_user_id_idx" ON "tags" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "tags_team_name_unique_idx" ON "tags" USING btree ("team_id","name");--> statement-breakpoint
CREATE INDEX "team_invites_team_id_idx" ON "team_invites" USING btree ("team_id");--> statement-breakpoint
CREATE INDEX "team_invites_email_idx" ON "team_invites" USING btree ("email");--> statement-breakpoint
CREATE UNIQUE INDEX "team_invites_team_email_unique_idx" ON "team_invites" USING btree ("team_id","email");--> statement-breakpoint
CREATE INDEX "team_members_team_id_idx" ON "team_members" USING btree ("team_id");--> statement-breakpoint
CREATE INDEX "team_members_user_id_idx" ON "team_members" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "team_members_team_user_unique_idx" ON "team_members" USING btree ("team_id","user_id");--> statement-breakpoint
CREATE INDEX "teams_owner_id_idx" ON "teams" USING btree ("owner_id");--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_unique_idx" ON "users" USING btree ("email");--> statement-breakpoint
ALTER TABLE "lot_costs" ADD CONSTRAINT "lot_costs_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lot_costs" ADD CONSTRAINT "lot_costs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lot_recoveries" ADD CONSTRAINT "lot_recoveries_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lot_recoveries" ADD CONSTRAINT "lot_recoveries_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lot_roi" ADD CONSTRAINT "lot_roi_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lot_roi" ADD CONSTRAINT "lot_roi_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lots" ADD CONSTRAINT "lots_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lots" ADD CONSTRAINT "lots_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "lot_costs_lot_id_idx" ON "lot_costs" USING btree ("lot_id");--> statement-breakpoint
CREATE INDEX "lot_costs_team_id_idx" ON "lot_costs" USING btree ("team_id");--> statement-breakpoint
CREATE INDEX "lot_costs_user_id_idx" ON "lot_costs" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "lot_recoveries_lot_id_idx" ON "lot_recoveries" USING btree ("lot_id");--> statement-breakpoint
CREATE INDEX "lot_recoveries_team_id_idx" ON "lot_recoveries" USING btree ("team_id");--> statement-breakpoint
CREATE INDEX "lot_recoveries_user_id_idx" ON "lot_recoveries" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "lot_roi_team_id_idx" ON "lot_roi" USING btree ("team_id");--> statement-breakpoint
CREATE INDEX "lot_roi_user_id_idx" ON "lot_roi" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "lots_team_id_idx" ON "lots" USING btree ("team_id");--> statement-breakpoint
CREATE INDEX "lots_user_id_idx" ON "lots" USING btree ("user_id");
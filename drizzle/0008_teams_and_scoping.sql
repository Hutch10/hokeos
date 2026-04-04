CREATE TABLE "teams" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "owner_id" varchar(255) NOT NULL,
  "name" varchar(255) NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "team_members" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "team_id" uuid NOT NULL,
  "user_id" varchar(255) NOT NULL,
  "role" varchar(32) NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "team_invites" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "team_id" uuid NOT NULL,
  "email" varchar(255) NOT NULL,
  "invited_by" varchar(255) NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE "teams" ADD CONSTRAINT "teams_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "team_members" ADD CONSTRAINT "team_members_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "team_members" ADD CONSTRAINT "team_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "team_invites" ADD CONSTRAINT "team_invites_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "team_invites" ADD CONSTRAINT "team_invites_invited_by_users_id_fk" FOREIGN KEY ("invited_by") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;

CREATE INDEX "teams_owner_id_idx" ON "teams" USING btree ("owner_id");
CREATE INDEX "team_members_team_id_idx" ON "team_members" USING btree ("team_id");
CREATE INDEX "team_members_user_id_idx" ON "team_members" USING btree ("user_id");
CREATE UNIQUE INDEX "team_members_team_user_unique_idx" ON "team_members" USING btree ("team_id", "user_id");
CREATE INDEX "team_invites_team_id_idx" ON "team_invites" USING btree ("team_id");
CREATE INDEX "team_invites_email_idx" ON "team_invites" USING btree ("email");
CREATE UNIQUE INDEX "team_invites_team_email_unique_idx" ON "team_invites" USING btree ("team_id", "email");

ALTER TABLE "users" ADD COLUMN "active_team_id" uuid;

ALTER TABLE "billing" ADD COLUMN "team_id" uuid;
ALTER TABLE "price_snapshots" ADD COLUMN "team_id" uuid;
ALTER TABLE "batches" ADD COLUMN "team_id" uuid;
ALTER TABLE "batch_items" ADD COLUMN "team_id" uuid;
ALTER TABLE "reports" ADD COLUMN "team_id" uuid;
ALTER TABLE "report_schedules" ADD COLUMN "team_id" uuid;
ALTER TABLE "tags" ADD COLUMN "team_id" uuid;
ALTER TABLE "batch_tags" ADD COLUMN "team_id" uuid;

ALTER TABLE "billing" ADD CONSTRAINT "billing_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "price_snapshots" ADD CONSTRAINT "price_snapshots_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "batches" ADD CONSTRAINT "batches_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "batch_items" ADD CONSTRAINT "batch_items_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "reports" ADD CONSTRAINT "reports_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "report_schedules" ADD CONSTRAINT "report_schedules_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "tags" ADD CONSTRAINT "tags_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "batch_tags" ADD CONSTRAINT "batch_tags_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;

CREATE UNIQUE INDEX "billing_team_id_unique_idx" ON "billing" USING btree ("team_id");
CREATE INDEX "price_snapshots_team_id_idx" ON "price_snapshots" USING btree ("team_id");
CREATE INDEX "batches_team_id_idx" ON "batches" USING btree ("team_id");
CREATE INDEX "batch_items_team_id_idx" ON "batch_items" USING btree ("team_id");
CREATE INDEX "reports_team_id_idx" ON "reports" USING btree ("team_id");
CREATE INDEX "report_schedules_team_id_idx" ON "report_schedules" USING btree ("team_id");
CREATE INDEX "tags_team_id_idx" ON "tags" USING btree ("team_id");
CREATE INDEX "batch_tags_team_id_idx" ON "batch_tags" USING btree ("team_id");
CREATE UNIQUE INDEX "tags_team_name_unique_idx" ON "tags" USING btree ("team_id", "name");
CREATE UNIQUE INDEX "batch_tags_team_batch_tag_unique_idx" ON "batch_tags" USING btree ("team_id", "batch_id", "tag_id");

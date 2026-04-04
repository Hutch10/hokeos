ALTER TABLE "reports" ALTER COLUMN "batch_id" DROP NOT NULL;

CREATE TABLE "report_schedules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar(255) NOT NULL,
	"type" varchar(32) NOT NULL,
	"batch_id" uuid,
	"cadence" varchar(32) NOT NULL,
	"next_run_at" timestamp with time zone NOT NULL,
	"is_paused" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE "report_schedules" ADD CONSTRAINT "report_schedules_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "report_schedules" ADD CONSTRAINT "report_schedules_batch_id_batches_id_fk" FOREIGN KEY ("batch_id") REFERENCES "public"."batches"("id") ON DELETE cascade ON UPDATE no action;

CREATE INDEX "report_schedules_user_id_idx" ON "report_schedules" USING btree ("user_id");
CREATE INDEX "report_schedules_batch_id_idx" ON "report_schedules" USING btree ("batch_id");
CREATE INDEX "report_schedules_next_run_at_idx" ON "report_schedules" USING btree ("next_run_at");
CREATE INDEX "report_schedules_type_idx" ON "report_schedules" USING btree ("type");

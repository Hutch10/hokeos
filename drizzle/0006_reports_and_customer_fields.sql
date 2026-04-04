ALTER TABLE "batches" ADD COLUMN "customer_name" varchar(255);
ALTER TABLE "batches" ADD COLUMN "customer_email" varchar(255);
ALTER TABLE "batches" ADD COLUMN "customer_reference" varchar(255);

CREATE TABLE "reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar(255) NOT NULL,
	"batch_id" uuid NOT NULL,
	"type" varchar(32) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE "reports" ADD CONSTRAINT "reports_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "reports" ADD CONSTRAINT "reports_batch_id_batches_id_fk" FOREIGN KEY ("batch_id") REFERENCES "public"."batches"("id") ON DELETE cascade ON UPDATE no action;

CREATE INDEX "reports_user_id_idx" ON "reports" USING btree ("user_id");
CREATE INDEX "reports_batch_id_idx" ON "reports" USING btree ("batch_id");
CREATE INDEX "reports_created_at_idx" ON "reports" USING btree ("created_at");

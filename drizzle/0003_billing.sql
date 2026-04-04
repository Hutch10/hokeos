CREATE TABLE "billing" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar(255) NOT NULL,
	"stripe_customer_id" varchar(255),
	"stripe_subscription_id" varchar(255),
	"plan" varchar(32) DEFAULT 'free' NOT NULL,
	"status" varchar(32) DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "billing" ADD CONSTRAINT "billing_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE UNIQUE INDEX "billing_user_id_unique_idx" ON "billing" USING btree ("user_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "billing_stripe_customer_id_unique_idx" ON "billing" USING btree ("stripe_customer_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "billing_stripe_subscription_id_unique_idx" ON "billing" USING btree ("stripe_subscription_id");
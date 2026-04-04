CREATE TABLE "lot_costs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"lot_id" uuid NOT NULL,
	"cost_category" varchar(100) NOT NULL,
	"amount" numeric(14, 2) NOT NULL,
	"currency" varchar(3) DEFAULT 'USD' NOT NULL,
	"notes" text,
	"incurred_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lot_recoveries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"lot_id" uuid NOT NULL,
	"metal_type" varchar(100) NOT NULL,
	"recovered_weight" numeric(14, 4) NOT NULL,
	"weight_unit" varchar(16) DEFAULT 'g' NOT NULL,
	"purity_pct" numeric(5, 2),
	"estimated_value" numeric(14, 2),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lot_roi" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"lot_id" uuid NOT NULL,
	"total_cost" numeric(14, 2) DEFAULT '0' NOT NULL,
	"revenue" numeric(14, 2) DEFAULT '0' NOT NULL,
	"profit" numeric(14, 2) DEFAULT '0' NOT NULL,
	"roi_pct" numeric(10, 4) DEFAULT '0' NOT NULL,
	"margin_pct" numeric(10, 4),
	"calculated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"lot_number" varchar(100) NOT NULL,
	"source_name" varchar(255),
	"material_type" varchar(100) NOT NULL,
	"gross_weight" numeric(14, 4),
	"weight_unit" varchar(16) DEFAULT 'g' NOT NULL,
	"intake_status" varchar(50) DEFAULT 'received' NOT NULL,
	"chain_of_custody_ref" varchar(255),
	"received_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "lot_costs" ADD CONSTRAINT "lot_costs_lot_id_lots_id_fk" FOREIGN KEY ("lot_id") REFERENCES "public"."lots"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lot_recoveries" ADD CONSTRAINT "lot_recoveries_lot_id_lots_id_fk" FOREIGN KEY ("lot_id") REFERENCES "public"."lots"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lot_roi" ADD CONSTRAINT "lot_roi_lot_id_lots_id_fk" FOREIGN KEY ("lot_id") REFERENCES "public"."lots"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "lot_roi_lot_id_unique_idx" ON "lot_roi" USING btree ("lot_id");--> statement-breakpoint
CREATE UNIQUE INDEX "lots_lot_number_unique_idx" ON "lots" USING btree ("lot_number");
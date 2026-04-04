CREATE TABLE "metal_prices" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "metal_type" varchar(32) NOT NULL,
  "price_usd_per_unit" numeric(14, 4) NOT NULL,
  "timestamp" timestamp with time zone NOT NULL,
  "source" varchar(120) NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX "metal_prices_metal_type_idx" ON "metal_prices" ("metal_type");
CREATE INDEX "metal_prices_timestamp_idx" ON "metal_prices" ("timestamp");
CREATE UNIQUE INDEX "metal_prices_metal_timestamp_unique_idx" ON "metal_prices" ("metal_type", "timestamp");

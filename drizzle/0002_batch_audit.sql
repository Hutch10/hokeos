-- Adds audit columns to batches and batch_items introduced in Metals V1 Phase 2.
--
-- batches:
--   calculator_input_json  — the validated CalculatorInput submitted by the UI
--   calculator_output_json — the canonical server-computed CalculatorResult
--
-- batch_items:
--   economic_output_json   — full CalculatorResult per item (all economic fields)

ALTER TABLE "batches"
  ADD COLUMN "calculator_input_json" jsonb,
  ADD COLUMN "calculator_output_json" jsonb;
--> statement-breakpoint

ALTER TABLE "batch_items"
  ADD COLUMN "economic_output_json" jsonb;

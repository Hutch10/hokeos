import { z } from "zod";

export const targetMetalOptions = ["gold", "silver", "platinum", "palladium"] as const;

// ─── UI form schema (used by CalculatorForm only) ────────────────────────────

export const calculatorInputSchema = z.object({
  materialType: z.string().trim().min(1, "Material type is required"),
  targetMetal: z.enum(targetMetalOptions, { message: "Select a target metal" }),
  startingWeightGrams: z.coerce.number().positive("Starting weight must be greater than 0"),
  estimatedPurityPercent: z.coerce
    .number()
    .min(0, "Purity must be at least 0")
    .max(100, "Purity cannot exceed 100"),
  processCostUsd: z.coerce.number().min(0, "Process cost cannot be negative"),
  /**
   * Optional process recovery rate override.
   * Empty string or missing = 100 (full recovery, no process loss).
   * When set, mapped to recoveryRatePct in the API request and affects
   * recoveredMetalWeight, recoveredMetalWeightOz, and netValue server-side.
   */
  recoveryRateOverride: z.preprocess(
    (value) => (value === "" || value === null || value === undefined ? undefined : value),
    z.coerce.number().min(0).max(100).optional(),
  ),
  customerName: z.string().trim().max(255).optional().default(""),
  customerEmail: z
    .union([z.literal(""), z.string().trim().email("Invalid email address").max(255)])
    .optional()
    .default(""),
  customerReference: z.string().trim().max(255).optional().default(""),
});

export type CalculatorInput = z.infer<typeof calculatorInputSchema>;

// ─── API request schema (sent to POST /api/calculator) ───────────────────────

export const calculatorApiRequestSchema = z.object({
  metalType: z.enum(targetMetalOptions),
  weight: z.number().positive(),
  weightUnit: z.enum(["g", "oz", "kg", "lb"]),
  purityPct: z.number().min(0).max(100),
  /**
   * Percentage of pure metal extractable during refining (0–100).
   * Maps from the UI's recoveryRateOverride field; defaults to 100.
   */
  recoveryRatePct: z.number().min(0).max(100).default(100),
  /**
   * Maps from the UI's processCostUsd field.
   * Sent to the backend so profitLoss and marginPct are computed server-side.
   */
  acquisitionCostUsd: z.number().min(0).default(0),
  formulaVersion: z.string().min(1),
  isHardwareVerified: z.boolean().optional().default(false),
  hardwareDeviceId: z.string().optional(),
});

export type CalculatorApiRequest = z.infer<typeof calculatorApiRequestSchema>;

// ─── Canonical calculator result schema ──────────────────────────────────────
//
// Mirrors lib/metals/calculator-service.ts CalculatorResult exactly.
// Used in the API response schema and the batch item/output schemas — zero duplication.

export const calculatorResultSchema = z.object({
  // Input echo
  metalType: z.string(),
  weight: z.number(),
  weightUnit: z.string(),
  purityPct: z.number(),
  recoveryRatePct: z.number(),
  acquisitionCostUsd: z.number(),
  formulaVersion: z.string(),
  // Weight metrics
  weightInOz: z.number(),
  recoveredMetalWeight: z.number(),
  recoveredMetalMetalWeightOz: z.number(), // Legacy field preserved for schema compatibility
  recoveredMetalWeightOz: z.number(),
  // Value metrics
  pricePerOz: z.number(),
  grossValue: z.number(),
  netValue: z.number(),
  profitLoss: z.number(),
  /** Null when acquisitionCostUsd is 0 (no cost basis) */
  marginPct: z.number().nullable(),
  currency: z.literal("USD"),
  teamId: z.string().optional(),
  userId: z.string().optional(),
  isHardwareVerified: z.boolean().optional().default(false),
  hardwareDeviceId: z.string().optional(),
  hasAnomaly: z.boolean().optional().default(false),
  confidenceBands: z.object({
    lower: z.number(),
    upper: z.number(),
  }).optional().nullable(),
});

export type CalculatorResult = z.infer<typeof calculatorResultSchema>;

// ─── API response schema (validated from POST /api/calculator) ───────────────
//
// Extends the canonical result with route-level metadata added by the route handler.

export const calculatorApiDataSchema = calculatorResultSchema.extend({
  snapshotId: z.string().optional(),
  priceFetchedAt: z.union([z.string(), z.date()]).optional(),
});

export type CalculatorApiData = z.infer<typeof calculatorApiDataSchema>;

export const calculatorApiResponseSchema = z.object({
  ok: z.boolean(),
  data: calculatorApiDataSchema.optional(),
  error: z.string().optional(),
});

export type CalculatorApiResponse = z.infer<typeof calculatorApiResponseSchema>;

// ─── Batch API response schemas ───────────────────────────────────────────────

export const batchTagApiSchema = z.object({
  id: z.string(),
  name: z.string(),
  color: z.string().nullable(),
});

export type BatchTagApiData = z.infer<typeof batchTagApiSchema>;

/** Price snapshot metadata returned inside a batch record */
const batchSnapshotSchema = z.object({
  goldUsdPerOz: z.number(),
  silverUsdPerOz: z.number(),
  platinumUsdPerOz: z.number(),
  palladiumUsdPerOz: z.number(),
  source: z.string(),
  fetchedAt: z.union([z.string(), z.date()]),
});

export type BatchSnapshotData = z.infer<typeof batchSnapshotSchema>;

export const batchPricePointApiSchema = z.object({
  timestamp: z.union([z.string(), z.date()]),
  priceUsdPerUnit: z.number(),
});

export const batchPriceContextApiSchema = z.object({
  metalType: z.enum(targetMetalOptions).nullable(),
  priceAtBatchTimestamp: z.number().nullable(),
  currentPrice: z.number().nullable(),
  deltaUsdPerUnit: z.number().nullable(),
  history: z.array(batchPricePointApiSchema),
  roiAtBatchPct: z.number().nullable(),
  roiTodayPct: z.number().nullable(),
});

export type BatchPriceContextApiData = z.infer<typeof batchPriceContextApiSchema>;

export const batchForecastPointApiSchema = z.object({
  timestamp: z.union([z.string(), z.date()]),
  actualPriceUsdPerUnit: z.number().nullable(),
  projectedPriceUsdPerUnit: z.number(),
});

export const batchForecastApiSchema = z.object({
  projectedPrice: z.number().nullable(),
  projectedNetValue: z.number(),
  projectedProfitLoss: z.number(),
  projectedROI: z.number().nullable(),
  method: z.enum(["sma", "ema", "regression"]),
  curve: z.array(batchForecastPointApiSchema),
  volatilityPct: z.number().nullable(),
  confidenceIndicator: z.enum(["high", "moderate", "low", "n/a"]),
  smaProjectedPrice: z.number().nullable(),
  emaProjectedPrice: z.number().nullable(),
  regressionProjectedPrice: z.number().nullable(),
});

export type BatchForecastApiData = z.infer<typeof batchForecastApiSchema>;

/** 
 * Phase 14 Audit: Trust-Layer Calculation Snapshot 
 * Structured schema to validate immutable calculation traces.
 */
export const confidenceResultSchema = z.object({
  score: z.number(),
  level: z.enum(["low", "medium", "high"]),
  reasons: z.array(z.string()),
  degradedMode: z.boolean(),
});

export const calculationTraceSchema = z.object({
  inputs: z.record(z.string(), z.unknown()),
  constantsUsed: z.record(z.string(), z.number()),
  defaultsApplied: z.array(z.string()),
  intermediateSteps: z.array(z.string()),
  warnings: z.array(z.string()),
});

export const calculationSnapshotSchema = z.object({
  roiEngineVersion: z.string(),
  constantsVersion: z.string(),
  confidence: confidenceResultSchema,
  trace: calculationTraceSchema,
  timestamp: z.string(),
  overrides: z.array(z.unknown()).optional(),
});

/**
 * Per-item economic record inside a batch response.
 * Mirrors BatchItemResult from batch-service — the canonical result plus a row id.
 */
export const batchItemApiSchema = calculatorResultSchema.extend({
  id: z.string(),
  auditSnapshot: calculationSnapshotSchema.nullable().optional(),
});

export type BatchItemApiData = z.infer<typeof batchItemApiSchema>;

/** Full enriched batch data returned from POST /api/batches and GET /api/batches/[batchId] */
export const batchApiDataSchema = z.object({
  id: z.string(),
  teamId: z.string(),
  userId: z.string(),
  status: z.string(),
  trustScore: z.union([z.string(), z.number()]).nullable().optional(),
  priceSnapshotId: z.string().optional(),
  formulaVersionId: z.string().nullable().optional(),
  tags: z.array(batchTagApiSchema).optional(),
  /** Price snapshot active at the time of batch creation */
  snapshot: batchSnapshotSchema.nullable().optional(),
  /** The validated CalculatorInput submitted by the UI for the reference calculation */
  calculatorInput: calculatorApiRequestSchema.nullable().optional(),
  /**
   * Server-computed canonical output for the reference calculation.
   * The client's calculatorOutput is discarded; this is always backend-authoritative.
   */
  calculatorOutput: calculatorResultSchema.nullable().optional(),
  /** Individual item results — each contains the full canonical economic output */
  items: z.array(batchItemApiSchema).optional(),
  /** Sum of netValue across all items */
  totalNetValue: z.number().optional(),
  /** Sum of grossValue across all items */
  totalGrossValue: z.number().optional(),
  /** Sum of profitLoss across all items */
  totalProfitLoss: z.number().optional(),
  historicalNetValue: z.number().optional(),
  historicalProfitLoss: z.number().optional(),
  deltaSinceBatch: z.number().optional(),
  priceContext: batchPriceContextApiSchema.optional(),
  forecast: batchForecastApiSchema.nullable().optional(),
  customerName: z.string().nullable().optional(),
  customerEmail: z.string().nullable().optional(),
  customerReference: z.string().nullable().optional(),
  /** Phase 14: Immutable audit for the entire batch */
  auditSnapshot: calculationSnapshotSchema.nullable().optional(),
  /** Phase 18: Settlement Lifecycle */
  certifiedAt: z.union([z.string(), z.date()]).nullable().optional(),
  settlementHash: z.string().nullable().optional(),
  createdAt: z.union([z.string(), z.date()]).optional(),
});

export type BatchApiData = z.infer<typeof batchApiDataSchema>;

export const batchApiResponseSchema = z.object({
  ok: z.boolean(),
  data: batchApiDataSchema.optional(),
  error: z.string().optional(),
});

export type BatchApiResponse = z.infer<typeof batchApiResponseSchema>;

// ─── UI display type ─────────────────────────────────────────────────────────

/**
 * Canonical calculator output used as UI state after a successful POST /api/calculator.
 *
 * All fields come directly from the server response — no client-side computation.
 */
export type CalculatorOutput = {
  // Weight
  recoveredMetalWeight: number;
  recoveredMetalWeightOz: number;
  // Value
  grossValue: number;
  netValue: number;
  profitLoss: number;
  /** Null when no acquisition cost was provided */
  marginPct: number | null;
  // Inputs echoed back
  recoveryRatePct: number;
  acquisitionCostUsd: number;
  // Metadata
  snapshotId: string | null;
  formulaVersionId: string | undefined;
  currency: "USD";
  isHardwareVerified?: boolean;
  hardwareDeviceId?: string;
  hasAnomaly?: boolean;
  confidenceBands?: { lower: number; upper: number } | null;
  fetchedAt?: Date | string | number | null;
};

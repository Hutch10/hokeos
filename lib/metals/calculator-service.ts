import { z } from "zod";
import { Decimal } from "decimal.js";
import { calculateLotRoi, type CalculationSnapshot } from "@/lib/roi";
import type { MetalPrices } from "./pricing-service";
import { DISPLAY_PRECISION, INTERNAL_PRECISION } from "../constants";

// Troy oz conversions preserved for legacy UI metadata
// The international troy ounce is precisely 31.1034768 grams.
const TROY_OZ_PRECISION = new Decimal("31.1034768");

const WEIGHT_TO_OZ: Record<string, string> = {
  oz: "1",
  g: TROY_OZ_PRECISION.pow(-1).toString(),
  kg: new Decimal(1000).div(TROY_OZ_PRECISION).toString(),
  lb: new Decimal("453.59237").div(TROY_OZ_PRECISION).toString(), // avoirdupois lb → troy oz (industrial-grade precision)
};

export const calculatorInputSchema = z.object({
  metalType: z.enum(["gold", "silver", "platinum", "palladium"]),
  weight: z.number().positive(),
  weightUnit: z.enum(["g", "oz", "kg", "lb"]).default("g"),
  purityPct: z.number().min(0).max(100).default(99.9),
  recoveryRatePct: z.number().min(0).max(100).default(100),
  acquisitionCostUsd: z.number().min(0).default(0),
  formulaVersion: z.string().default("v1"),
  isHardwareVerified: z.boolean().optional().default(false),
  hardwareDeviceId: z.string().optional(),
  lotId: z.string().optional(),
});

export type CalculatorInput = z.infer<typeof calculatorInputSchema>;

export type RefiningFeeSchedule = {
  fixedCharge?: number | string;
  percentageFee?: number | string;
  refiningChargePerOz?: number | string;
  penaltyFees?: number | string;
};

export type TeamFeeConfig = {
  defaultTaxRate?: number | string;
  defaultServiceFee?: number | string;
};

export type CalculatorResult = {
  // ── Input echo ──────────────────────────────────────────────────────────
  metalType: string;
  weight: number;
  weightUnit: string;
  purityPct: number;
  recoveryRatePct: number;
  acquisitionCostUsd: number;
  formulaVersion: string;

  // ── Weight metrics ───────────────────────────────────────────────────────
  weightInOz: number;
  recoveredMetalWeight: number;
  recoveredMetalMetalWeightOz: number; // Legacy naming preserved for schema compatibility
  recoveredMetalWeightOz: number;

  // ── Value metrics ────────────────────────────────────────────────────────
  pricePerOz: number;
  grossValue: number;
  netValue: number;
  profitLoss: number;
  marginPct: number | null;
  currency: "USD";

  // ── Metadata ────────────────────────────────────────────────────────────
  isHardwareVerified: boolean;
  hardwareDeviceId?: string | null;
  lotId?: string;

  // ── Phase 44: Audit Data ────────────────────────────────────────────────
  /** Immutable v1.4.0 Trust Snapshot for this specific item */
  auditSnapshot?: CalculationSnapshot;
  
  /** Phase 55: Anomaly Detection / Signal Analysis */
  hasAnomaly?: boolean;
  confidenceBands?: { lower: number; upper: number } | null;
};

/**
 * Unified HokeOS Calculator (v1.4.0-SOVEREIGN)
 * Wraps the Decimal-hardened ROI engine for consistent settlement logic.
 * Injects dynamic fee schedules to eliminate hardcoded zero-trust gaps.
 */
export function calculate(
  input: CalculatorInput, 
  prices: MetalPrices,
  feeSchedule?: RefiningFeeSchedule,
  _teamConfig?: TeamFeeConfig // Reserved for future tax calculation injection
): CalculatorResult {
  const dPrice = new Decimal(priceForMetal(input.metalType, prices));
  const dWeight = new Decimal(input.weight);
  const dConv = new Decimal(WEIGHT_TO_OZ[input.weightUnit] ?? "1");
  const dPurity = new Decimal(input.purityPct).div(100);
  const dRecovery = new Decimal(input.recoveryRatePct).div(100);

  // High-precision intermediate gross
  const dWeightInOz = dWeight.mul(dConv);
  const dGrossValue = dWeightInOz.mul(dPrice).mul(dPurity).mul(dRecovery);

  // Resolve dynamic fees
  const refiningChargePerOz = new Decimal(feeSchedule?.refiningChargePerOz ?? 0).toNumber();
  const penaltyFees = new Decimal(feeSchedule?.penaltyFees ?? 0).toNumber();

  // Map to common ROI engine input
  const roiResult = calculateLotRoi({
    costs: [{ amount: input.acquisitionCostUsd }],
    recoveries: [
      {
        metalType: input.metalType,
        recoveredWeight: input.weight,
        purityPct: input.purityPct,
        payableWeightPct: input.recoveryRatePct,
        refiningChargePerOz,
        penaltyFees,
        estimatedValue: dGrossValue.toDecimalPlaces(DISPLAY_PRECISION).toNumber(),
      },
    ],
    treatmentFees: 0,
  }, {
    hasProxyFallback: prices.source?.toLowerCase().includes("fallback"),
    isMocked: prices.source?.toLowerCase().includes("mock"),
  });

  const yieldFactor = dPurity.mul(dRecovery);

  return {
    metalType: input.metalType,
    weight: input.weight,
    weightUnit: input.weightUnit,
    purityPct: input.purityPct,
    recoveryRatePct: input.recoveryRatePct,
    acquisitionCostUsd: input.acquisitionCostUsd,
    formulaVersion: input.formulaVersion,
    
    weightInOz: dWeightInOz.toDecimalPlaces(INTERNAL_PRECISION).toNumber(),
    recoveredMetalWeight: dWeight.mul(yieldFactor).toDecimalPlaces(INTERNAL_PRECISION).toNumber(),
    recoveredMetalMetalWeightOz: dWeightInOz.mul(dPurity).toDecimalPlaces(INTERNAL_PRECISION).toNumber(),
    recoveredMetalWeightOz: dWeightInOz.mul(yieldFactor).toDecimalPlaces(INTERNAL_PRECISION).toNumber(),
    
    pricePerOz: dPrice.toNumber(),
    grossValue: dWeightInOz.mul(dPrice).toDecimalPlaces(DISPLAY_PRECISION).toNumber(),
    netValue: roiResult.netSettlementValue,
    profitLoss: roiResult.profit,
    marginPct: roiResult.marginPct,
    currency: "USD",
    
    isHardwareVerified: input.isHardwareVerified,
    hardwareDeviceId: input.hardwareDeviceId,
    lotId: input.lotId,
    auditSnapshot: roiResult.snapshot,
    hasAnomaly: false, // Baseline: Nominal
    confidenceBands: null, // Baseline: Standard Confidence
  };
}

function priceForMetal(metalType: string, prices: MetalPrices): number {
  const key = `${metalType}UsdPerOz` as keyof MetalPrices;
  const val = prices[key];
  if (typeof val === "number") return val;
  throw new Error(`Unknown or missing price for metal type: ${metalType}`);
}

import { Decimal } from "decimal.js";
import { 
  TROY_OZ_TO_GRAMS, 
  PERCENT_BASE, 
  INTERNAL_PRECISION,
  DISPLAY_PRECISION,
  DEFAULT_TREATMENT_FEE, 
  DEFAULT_PENALTY_FEE, 
  DEFAULT_REFINING_CHARGE,
  ROI_ENGINE_VERSION,
  PR_CONSTANTS_VERSION
} from "./constants";

import { 
  calculateConfidence, 
  type ConfidenceMetadata, 
  type ConfidenceResult 
} from "./analytics/confidence";

import { validateRoiInput, type ValidationResult } from "./validations/roi-safety";
import { Sentinel } from "./analytics/sentinel";

// Configure Decimal for industrial-grade precision
Decimal.set({ precision: 20, rounding: Decimal.ROUND_HALF_UP });

export type LotRecoveryInput = {
  metalType: string;
  recoveredWeight: number;
  purityPct: number;
  payableWeightPct: number;
  refiningChargePerOz: number;
  penaltyFees: number;
  estimatedValue?: number | null;
  // Phase 9: Override tracking
  isOverride?: boolean;
  originalValue?: number;
};

export type LotRoiInput = {
  costs: { amount: number }[];
  recoveries: LotRecoveryInput[];
  treatmentFees?: number;
};

export type CalculationTrace = {
  inputs: Record<string, unknown>;
  constantsUsed: Record<string, number>;
  defaultsApplied: string[];
  intermediateSteps: string[];
  warnings: string[];
};

export type ResultMode = "estimate" | "settlement_aligned" | "finalized";

// Phase 9: Override Log
export type OverrideLog = {
  field: string;
  previousValue: unknown;
  newValue: unknown;
  timestamp: string;
  reason: string;
};

export type CalculationSnapshot = {
  rawInputs: LotRoiInput;
  normalizedInputs: {
    costs: { amount: number }[];
    recoveries: LotRecoveryInput[];
    treatmentFees: number;
  };
  constantsVersion: string;
  roiEngineVersion: string;
  confidence: ConfidenceResult;
  trace: CalculationTrace;
  timestamp: string;
  overrides?: OverrideLog[];
  // Phase 1: High-Precision forensic markers
  highPrecision?: {
    totalCost: string;
    revenue: string;
    profit: string;
    roiPct: string;
    recoveryEfficiencyPct: string;
  };
};

export type LotRoiResult = {
  totalCost: number;
  revenue: number;
  profit: number;
  roiPct: number;
  marginPct: number | null;
  netSettlementValue: number;
  recoveryEfficiencyPct: number;
  calculationTrace: CalculationTrace; 
  confidence: ConfidenceResult;
  resultMode: ResultMode;
  snapshot: CalculationSnapshot;
  // Phase 8: Validation
  validation: ValidationResult;
};

/**
 * Standard rounding policy (Phase 1 Financial Hardening)
 * High dynamic range internal precision (8 DP), currency-based finalization (2 DP).
 */
function toDecimal(value: unknown): Decimal {
  if (value instanceof Decimal) return value;
  if (typeof value === "number" && !isNaN(value)) return new Decimal(value);
  if (typeof value === "string" && value.trim() !== "") return new Decimal(value);
  return new Decimal(0);
}

function roundToDisplay(value: Decimal): number {
  return value.toDecimalPlaces(DISPLAY_PRECISION).toNumber();
}

/**
 * Determines the result mode based on input completeness.
 */
function determineResultMode(input: LotRoiInput, confidence: ConfidenceResult): ResultMode {
  if (!Sentinel.isFeatureEnabled("CONFIDENCE_SCORING_ENABLED")) return "estimate";
  if (confidence.score < 60 || confidence.degradedMode) return "estimate";
  
  const hasIncompleteRecoveries = input.recoveries.some(r => 
    !r.recoveredWeight || !r.purityPct || !r.payableWeightPct
  );

  if (hasIncompleteRecoveries) return "estimate";
  
  return "settlement_aligned";
}

/**
 * Calculates the High-Precision ROI for a precious metals recovery lot.
 * Version 1.4.0: Sovereign Hardening (Decimal.js)
 */
export function calculateLotRoi(input: LotRoiInput, confidenceMeta?: ConfidenceMetadata): LotRoiResult {
  const timestamp = new Date().toISOString();
  
  // Phase 8: Validation (Guardian Layer)
  const validation = validateRoiInput(input);
  if (!validation.isValid) {
    Sentinel.trackEvent("validationErrorCount");
  }

  const trace: CalculationTrace = {
    inputs: { ...input },
    constantsUsed: {
      TROY_OZ_TO_GRAMS,
      PERCENT_BASE,
      INTERNAL_PRECISION,
    },
    defaultsApplied: [],
    intermediateSteps: [],
    warnings: [],
  };

  const costs = Array.isArray(input.costs) ? input.costs : [];
  const recoveries = Array.isArray(input.recoveries) ? input.recoveries : [];

  const totalAcquisitionCostRaw = costs.reduce(
    (sum, cost) => sum.plus(toDecimal(cost?.amount)), 
    new Decimal(0)
  );
  
  trace.intermediateSteps.push(`Total acquisition cost calculated from ${costs.length} items: $${totalAcquisitionCostRaw.toFixed(DISPLAY_PRECISION)}`);

  let totalGrossValueRaw = new Decimal(0);
  
  const treatmentFees = input.treatmentFees !== undefined 
    ? toDecimal(input.treatmentFees) 
    : new Decimal(DEFAULT_TREATMENT_FEE);

  if (input.treatmentFees === undefined) {
    trace.defaultsApplied.push("treatmentFees");
  }

  let totalDeductionsRaw = treatmentFees;
  trace.intermediateSteps.push(`Initial deductions set with treatment fees: $${treatmentFees.toFixed(DISPLAY_PRECISION)}`);

  let weightedActualYield = new Decimal(0);
  let weightedTheoreticalYield = new Decimal(0);

  const overrideLogs: OverrideLog[] = [];

  const normalizedRecoveries: LotRecoveryInput[] = recoveries.map((rec, index) => {
    const weight = toDecimal(rec.recoveredWeight);
    const purity = toDecimal(rec.purityPct ?? 0).div(PERCENT_BASE);
    const payable = toDecimal(rec.payableWeightPct ?? 0).div(PERCENT_BASE);
    const estValue = toDecimal(rec.estimatedValue);

    totalGrossValueRaw = totalGrossValueRaw.plus(estValue);

    // Phase 9: Override Detection
    if (rec.isOverride) {
      overrideLogs.push({
        field: `recoveries[${index}].estimatedValue`,
        previousValue: rec.originalValue,
        newValue: rec.estimatedValue,
        timestamp,
        reason: "Manual operator override"
      });
    }

    const refiningChargeRate = rec.refiningChargePerOz !== undefined 
      ? toDecimal(rec.refiningChargePerOz) 
      : new Decimal(DEFAULT_REFINING_CHARGE);
    
    const penaltyFees = rec.penaltyFees !== undefined 
      ? toDecimal(rec.penaltyFees) 
      : new Decimal(DEFAULT_PENALTY_FEE);
    
    if (rec.refiningChargePerOz === undefined) trace.defaultsApplied.push(`recovery[${index}].refiningChargePerOz`);
    if (rec.penaltyFees === undefined) trace.defaultsApplied.push(`recovery[${index}].penaltyFees`);

    const weightInOz = weight.div(TROY_OZ_TO_GRAMS);
    const refiningCharge = refiningChargeRate.mul(weightInOz);
    
    totalDeductionsRaw = totalDeductionsRaw.plus(refiningCharge).plus(penaltyFees);

    weightedActualYield = weightedActualYield.plus(weight.mul(purity));
    weightedTheoreticalYield = weightedTheoreticalYield.plus(weight);

    trace.intermediateSteps.push(
      `Recovery ${index + 1} (${rec.metalType}): Weight ${weight.toFixed(4)}g (${weightInOz.toFixed(INTERNAL_PRECISION)} oz), Purity ${rec.purityPct}%, ` +
      `Payable ${rec.payableWeightPct}% (equiv to ${payable.mul(PERCENT_BASE).toFixed(2)}%), Gross $${estValue.toFixed(DISPLAY_PRECISION)}, Refining $${refiningCharge.toFixed(4)}, Penalties $${penaltyFees.toFixed(DISPLAY_PRECISION)}`
    );

    return { ...rec };
  });

  const totalCost = totalAcquisitionCostRaw;
  const netSettlementValueRaw = totalGrossValueRaw.minus(totalDeductionsRaw);
  
  const revenue = netSettlementValueRaw; 
  const profit = revenue.minus(totalCost);

  const roiPct = totalCost.gt(0) 
    ? profit.div(totalCost).mul(PERCENT_BASE) 
    : new Decimal(0);
    
  const marginPct = revenue.gt(0) 
    ? profit.div(revenue).mul(PERCENT_BASE) 
    : null;
    
  const recoveryEfficiencyPct = weightedTheoreticalYield.gt(0) 
    ? weightedActualYield.div(weightedTheoreticalYield).mul(PERCENT_BASE) 
    : new Decimal(100);

  if (revenue.lte(0)) trace.warnings.push("Net settlement value is zero or negative.");
  if (totalCost.isZero()) trace.warnings.push("Total acquisition cost is zero.");

  trace.intermediateSteps.push(`Final Revenue (Net Settlement): $${revenue.toFixed(DISPLAY_PRECISION)}`);
  trace.intermediateSteps.push(`Final Profit: $${profit.toFixed(DISPLAY_PRECISION)}`);
  trace.intermediateSteps.push(`Final ROI: ${roiPct.toFixed(DISPLAY_PRECISION)}%`);

  // Final trust assessment
  const confidence = calculateConfidence({
    ...confidenceMeta,
    isDefaulted: trace.defaultsApplied.length > 0 || (confidenceMeta?.isDefaulted ?? false),
  });

  if (confidence.degradedMode) Sentinel.trackEvent("degradedModeCount");
  if (confidence.score < 40) Sentinel.trackEvent("lowConfidenceCount");

  const resultMode = determineResultMode(input, confidence);

  // Phase 3: Capture Immutable Snapshot
  const snapshot: CalculationSnapshot = {
    rawInputs: JSON.parse(JSON.stringify(input)),
    normalizedInputs: {
      costs,
      recoveries: normalizedRecoveries,
      treatmentFees: treatmentFees.toNumber()
    },
    constantsVersion: PR_CONSTANTS_VERSION,
    roiEngineVersion: ROI_ENGINE_VERSION,
    confidence,
    trace,
    timestamp,
    overrides: overrideLogs.length > 0 ? overrideLogs : undefined,
    highPrecision: {
      totalCost: totalCost.toFixed(INTERNAL_PRECISION),
      revenue: revenue.toFixed(INTERNAL_PRECISION),
      profit: profit.toFixed(INTERNAL_PRECISION),
      roiPct: roiPct.toFixed(INTERNAL_PRECISION),
      recoveryEfficiencyPct: recoveryEfficiencyPct.toFixed(INTERNAL_PRECISION)
    }
  };

  return {
    totalCost: roundToDisplay(totalCost),
    revenue: roundToDisplay(revenue),
    profit: roundToDisplay(profit),
    roiPct: roundToDisplay(roiPct),
    marginPct: marginPct ? roundToDisplay(marginPct) : null,
    netSettlementValue: roundToDisplay(revenue),
    recoveryEfficiencyPct: roundToDisplay(recoveryEfficiencyPct),
    calculationTrace: trace, 
    confidence,
    resultMode,
    snapshot,
    validation
  };
}

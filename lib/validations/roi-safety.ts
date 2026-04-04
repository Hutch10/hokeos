import { LotRoiInput } from "../roi";

export type ValidationError = {
  field: string;
  message: string;
  severity: "critical" | "warning";
};

export type ValidationResult = {
  isValid: boolean;
  errors: ValidationError[];
};

/**
 * HokeOS Input Guardian
 * 
 * Rejects or flags invalid inputs before they enter the ROI engine.
 * Ensures physical reality (weights > 0) and mathematical safety (purity <= 100%).
 */
export function validateRoiInput(input: LotRoiInput): ValidationResult {
  const errors: ValidationError[] = [];

  // 1. Costs Validation
  input.costs.forEach((cost, index) => {
    if (cost.amount < 0) {
      errors.push({
        field: `costs[${index}].amount`,
        message: "Cost amount cannot be negative.",
        severity: "critical"
      });
    }
  });

  // 2. Recoveries Validation
  input.recoveries.forEach((rec, index) => {
    const fld = `recoveries[${index}]`;

    // Weight/Purity Physical Checks
    if (rec.recoveredWeight < 0) {
      errors.push({ field: `${fld}.recoveredWeight`, message: "Recovered weight cannot be negative.", severity: "critical" });
    }
    if (rec.purityPct < 0 || rec.purityPct > 100) {
      errors.push({ field: `${fld}.purityPct`, message: "Purity must be between 0% and 100%.", severity: "critical" });
    }
    if (rec.payableWeightPct < 0 || rec.payableWeightPct > 150) { // Some contracts have > 100% bonus but > 150% is likely bug
      errors.push({ field: `${fld}.payableWeightPct`, message: "Unrealistic payable percentage detected.", severity: "warning" });
    }

    // Mathematical Reality (Expected recovery)
    if (rec.estimatedValue !== undefined && rec.estimatedValue !== null && rec.estimatedValue < 0) {
      errors.push({ field: `${fld}.estimatedValue`, message: "Estimated value cannot be negative.", severity: "critical" });
    }
  });

  // 3. Global Fees
  if (input.treatmentFees !== undefined && input.treatmentFees < 0) {
    errors.push({ field: "treatmentFees", message: "Treatment fees cannot be negative.", severity: "critical" });
  }

  return {
    isValid: !errors.some(e => e.severity === "critical"),
    errors
  };
}

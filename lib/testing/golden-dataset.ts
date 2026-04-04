import { LotRoiInput } from "../roi";
import { STALE_PRICE_THRESHOLD_SECONDS } from "../constants";

export type GoldenScenario = {
  name: string;
  input: LotRoiInput;
  confidenceMeta?: {
    isMocked?: boolean;
    isStale?: boolean;
    priceAgeSeconds?: number;
    hasProxyFallback?: boolean;
  };
  expected: {
    revenue: number;
    profit: number;
    roiPct: number;
    score: number;
    resultMode: string;
    degradedMode: boolean;
  };
};

/**
 * HokeOS v1.3.0 Golden Dataset
 * Deterministic baseline for high-precision verification.
 */
export const GOLDEN_DATASET: GoldenScenario[] = [
  {
    name: "Standard 1KG Gold Settlement",
    input: {
      costs: [{ amount: 50000 }],
      recoveries: [{
        metalType: "gold",
        recoveredWeight: 1000,
        purityPct: 99.99,
        payableWeightPct: 98.5,
        refiningChargePerOz: 5,
        penaltyFees: 10,
        estimatedValue: 65000
      }],
      treatmentFees: 0
    },
    expected: {
      revenue: 64829.25,
      profit: 14829.25,
      roiPct: 29.66,
      score: 100,
      resultMode: "settlement_aligned",
      degradedMode: false
    }
  },
  {
    name: "Stale Pricing Scenario",
    input: {
      costs: [{ amount: 1000 }],
      recoveries: [{
        metalType: "silver",
        recoveredWeight: 100,
        purityPct: 90,
        payableWeightPct: 95,
        refiningChargePerOz: 0.5,
        penaltyFees: 0,
        estimatedValue: 1200
      }],
      treatmentFees: 0
    },
    confidenceMeta: {
      priceAgeSeconds: STALE_PRICE_THRESHOLD_SECONDS + 1
    },
    expected: {
      revenue: 1198.39,
      profit: 198.39,
      roiPct: 19.84,
      score: 75, // 100 - 25 (Stale)
      resultMode: "estimate",
      degradedMode: true
    }
  },
  {
    name: "Fallback Resilience Mode",
    input: {
      costs: [{ amount: 100 }],
      recoveries: [{
        metalType: "platinum",
        recoveredWeight: 10,
        purityPct: 80,
        payableWeightPct: 90,
        refiningChargePerOz: 1,
        penaltyFees: 5,
        estimatedValue: 200
      }]
    },
    confidenceMeta: {
      hasProxyFallback: true
    },
    expected: {
      revenue: 194.68,
      profit: 94.68,
      roiPct: 94.68,
      score: 45, // 100 - 40 (Fallback) - 15 (Treatment Default)
      resultMode: "estimate",
      degradedMode: true
    }
  },
  {
    name: "High Penalty (Loss) Scenario",
    input: {
      costs: [{ amount: 10000 }],
      recoveries: [{
        metalType: "palladium",
        recoveredWeight: 100,
        purityPct: 50,
        payableWeightPct: 50,
        refiningChargePerOz: 50, // Massive fee
        penaltyFees: 500,
        estimatedValue: 500
      }],
      treatmentFees: 100
    },
    expected: {
      revenue: -260.75,
      profit: -10260.75,
      roiPct: -102.61,
      score: 100,
      resultMode: "settlement_aligned",
      degradedMode: false
    }
  }
];

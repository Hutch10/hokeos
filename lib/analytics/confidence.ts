/**
 * HokeOS Confidence & Reliability Module
 * 
 * Version 1.3.0: Trust-Layer Upgrade
 * Deterministically evaluates the reliability of a calculation based on data source quality.
 */

import { STALE_PRICE_THRESHOLD_SECONDS } from "../constants";

export type ConfidenceLevel = "high" | "medium" | "low";

export type ConfidenceMetadata = {
  isMocked?: boolean;
  isStale?: boolean;
  priceAgeSeconds?: number;
  missingInputs?: string[];
  isDefaulted?: boolean;
  hasProxyFallback?: boolean;
};

export type ConfidenceResult = {
  score: number;
  level: ConfidenceLevel;
  reasons: string[];
  // Phase 6: Degraded Mode Signaling
  degradedMode: boolean;
  degradedReasons: string[];
};

const PENALTIES = {
  MOCK_USAGE: 50,
  STALE_PRICES: 25,
  DEFAULTED_INPUTS: 15,
  MISSING_CRITICAL_INPUT: 30,
  PROXY_FALLBACK: 40,
};

/**
 * Calculates a deterministic confidence score (0-100) and degraded status.
 */
export function calculateConfidence(metadata: ConfidenceMetadata): ConfidenceResult {
  let score = 100;
  const reasons: string[] = [];
  const degradedReasons: string[] = [];

  if (metadata.isMocked) {
    score -= PENALTIES.MOCK_USAGE;
    reasons.push("Calculation uses high-fidelity mock data due to environment instability.");
    degradedReasons.push("System-level mock mode active.");
  }

  if (metadata.hasProxyFallback) {
    score -= PENALTIES.PROXY_FALLBACK;
    reasons.push("Calculation triggered an autonomous resilience fallback (Database unreachable).");
    degradedReasons.push("Autonomous proxy failover active.");
  }

  // Phase 1: Freshness provenance
  const isStale = metadata.isStale || (metadata.priceAgeSeconds !== undefined && metadata.priceAgeSeconds > STALE_PRICE_THRESHOLD_SECONDS);
  if (isStale) {
    score -= PENALTIES.STALE_PRICES;
    reasons.push(`Market prices are stale (> ${STALE_PRICE_THRESHOLD_SECONDS / 3600}h since last sync).`);
    degradedReasons.push("Stale pricing data detected.");
  }

  if (metadata.isDefaulted) {
    score -= PENALTIES.DEFAULTED_INPUTS;
    reasons.push("One or more financial constants (fees/penalties) used default values.");
  }

  if (metadata.missingInputs && metadata.missingInputs.length > 0) {
    const penalty = Math.min(metadata.missingInputs.length * 10, PENALTIES.MISSING_CRITICAL_INPUT);
    score -= penalty;
    reasons.push(`Missing specific recovery inputs: ${metadata.missingInputs.join(", ")}`);
    degradedReasons.push(`Missing inputs: ${metadata.missingInputs.length}`);
  }

  // Ensure bounds
  score = Math.max(0, Math.min(100, score));

  let level: ConfidenceLevel = "high";
  if (score < 40) level = "low";
  else if (score < 80) level = "medium";

  return {
    score,
    level,
    reasons,
    degradedMode: degradedReasons.length > 0,
    degradedReasons,
  };
}

/**
 * HokeOS Sentinel: Observability & Feature Governance
 * 
 * Version 1.3.0: Trust-Layer Upgrade
 * Provides lightweight tracking of system health and trust signals.
 */

// Phase 10: Observability Metrics (In-Memory Counters for Alpha)
const METRICS = {
  fallbackTriggerCount: 0,
  stalePriceUsage: 0,
  lowConfidenceCount: 0,
  degradedModeCount: 0,
  validationErrorCount: 0,
};

// Phase 12: Feature Flags
const FEATURE_FLAGS = {
  CONFIDENCE_SCORING_ENABLED: true,
  VERBOSE_TRACE_ENABLED: true,
  DEGRADED_MODE_SIGNALING: true,
  AUDIT_SNAPSHOTS_ENABLED: true,
  STRICT_INPUT_VALIDATION: true,
};

export const Sentinel = {
  /**
   * Records a trust-layer event.
   */
  trackEvent(metric: keyof typeof METRICS) {
    METRICS[metric]++;
    if (process.env.NODE_ENV === "development") {
      console.log(`\u001b[35m[Sentinel] Metric Increment: ${metric} -> ${METRICS[metric]}\u001b[0m`);
    }
  },

  /**
   * Records a system-level failure for diagnostic auditing.
   */
  recordFailure(error: any) {
    METRICS.fallbackTriggerCount++;
    (METRICS as any).lastError = error?.message || "Unknown Failure";
    (METRICS as any).lastErrorStack = error?.stack?.slice(0, 500) || "No Stack Trace";
    console.error(`\u001b[31m[Sentinel] System Failure Recorded: ${(METRICS as any).lastError}\u001b[0m`);
  },

  /**
   * Checks if a trust-layer feature is enabled.
   */
  isFeatureEnabled(flag: keyof typeof FEATURE_FLAGS): boolean {
    return FEATURE_FLAGS[flag] ?? false;
  },

  /**
   * Retrieves current trust metrics (Snapshot).
   */
  getSnapshot() {
    return { ...METRICS };
  }
};

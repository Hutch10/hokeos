/**
 * HokeOS Financial & Unit Constants
 * 
 * Standardized constants for high-precision precious metals recovery.
 * Version 1.3.3: Yield Strategy Heatmaps
 */

export const HOKE_OS_VERSION = "1.3.3";
export const PR_CONSTANTS_VERSION = "1.0.0";
export const ROI_ENGINE_VERSION = "1.3.0";

/**
 * The international troy ounce is precisely 31.1034768 grams.
 * Using this over the common 31.1035 for industrial-grade settlement accuracy.
 */
export const TROY_OZ_TO_GRAMS = 31.1034768;

/**
 * Standard rounding and percentage denominators
 */
export const PERCENT_BASE = 100;
export const CURRENCY_BASE = 100;

/**
 * Precision & Rounding Policy (Phase 7 & 11)
 * 
 * INTERNAL_PRECISION: High precision for intermediate math steps.
 * DISPLAY_PRECISION: Human-readable precision for UI and reports.
 */
export const INTERNAL_PRECISION = 8;
export const DISPLAY_PRECISION = 2;

/**
 * Price Provenance & Freshness (Phase 1)
 * 
 * STALE_PRICE_THRESHOLD_SECONDS: Defaulting to 24 hours (86400s) for alpha.
 * Calculations using prices older than this will be flagged as 'stale'.
 */
export const STALE_PRICE_THRESHOLD_SECONDS = 86400;

/**
 * Default Settlement Fees & Thresholds
 */
export const DEFAULT_TREATMENT_FEE = 0;
export const DEFAULT_PENALTY_FEE = 0;
export const DEFAULT_REFINING_CHARGE = 0;

/**
 * Display & Formatting Defaults
 */
export const DEFAULT_CURRENCY = "USD";
export const DEFAULT_WEIGHT_UNIT = "g";

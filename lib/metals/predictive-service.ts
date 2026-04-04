import { getHistoricalPrices, type MetalType } from "@/lib/prices";

export interface VolatilityForecast {
  currentPrice: number;
  expectedRangeLow: number;
  expectedRangeHigh: number;
  volatilityPct: number;
  riskRating: "low" | "moderate" | "high" | "extreme";
  projected7DayTrend: "stable" | "bullish" | "bearish";
  confidenceScore: number;
}

/**
 * Phase 38: Predictive Batch Performance
 * Calculates volatility and settlement risk based on 30-day historical market variance.
 */
export async function getBatchVolatilityForecast(
  batchId: string, 
  userId: string,
  metalType: MetalType = "gold"
): Promise<VolatilityForecast> {
  // 1. Fetch 30-day history
  const history = await getHistoricalPrices(metalType, { days: 30 });
  
  if (history.length < 2) {
    throw new Error("Insufficient price history for forecasting.");
  }

  const prices = history.map(p => p.priceUsdPerUnit);
  const currentPrice = prices[prices.length - 1];

  // 2. Simple Volatility Calculation (Standard Deviation)
  const mean = prices.reduce((a, b) => a + b) / prices.length;
  const variance = prices.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / prices.length;
  const stdDev = Math.sqrt(variance);
  const volatilityPct = (stdDev / mean) * 100;

  // 3. Settlement Risk Rating
  let riskRating: VolatilityForecast["riskRating"] = "low";
  if (volatilityPct > 5) riskRating = "extreme";
  else if (volatilityPct > 3) riskRating = "high";
  else if (volatilityPct > 1.5) riskRating = "moderate";

  // 4. Trend Projection (Last 5 days vs 30 days)
  const recentPrices = prices.slice(-5);
  const recentMean = recentPrices.reduce((a, b) => a + b) / recentPrices.length;
  const projected7DayTrend = recentMean > mean ? "bullish" : recentMean < (mean * 0.98) ? "bearish" : "stable";

  return {
    currentPrice: Math.round(currentPrice * 100) / 100,
    expectedRangeLow: Math.round((currentPrice - (stdDev * 1.5)) * 100) / 100,
    expectedRangeHigh: Math.round((currentPrice + (stdDev * 1.5)) * 100) / 100,
    volatilityPct: Math.round(volatilityPct * 100) / 100,
    riskRating,
    projected7DayTrend,
    confidenceScore: history.length / 30 * 100, // Normalized to 30 days data
  };
}

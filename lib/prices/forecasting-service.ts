import {
  getHistoricalPrices,
  getLatestPrice,
  supportedMetalTypes,
  type MetalPricePoint,
  type MetalType,
} from "./price-history-service";
import { redis } from "@/lib/redis";

const FORECAST_CACHE_KEY = "hokeos:forecast:overview";
const FORECAST_CACHE_TTL = 3600; // 1 hour

export type ProjectionMethod = "sma" | "ema" | "regression" | "statistical";

export type ForecastConfidence = "high" | "moderate" | "low" | "n/a";

export type ForecastCurvePoint = {
  timestamp: Date;
  actualPriceUsdPerUnit: number | null;
  projectedPriceUsdPerUnit: number;
};

export type PriceForecast = {
  method: ProjectionMethod;
  projectedPrice: number | null;
  smaProjectedPrice: number | null;
  emaProjectedPrice: number | null;
  regressionProjectedPrice: number | null;
  volatilityPct: number | null;
  confidenceIndicator: ForecastConfidence;
  hasAnomaly: boolean;
  confidenceBands: { lower: number; upper: number } | null;
  curve: ForecastCurvePoint[];
};

export type ForecastOverviewRow = {
  metalType: MetalType;
  latestPrice: number | null;
  latestTimestamp: Date | null;
  projectedPrice: number | null;
  method: ProjectionMethod;
  smaProjectedPrice: number | null;
  emaProjectedPrice: number | null;
  regressionProjectedPrice: number | null;
  volatilityPct: number | null;
  confidenceIndicator: ForecastConfidence;
  hasAnomaly: boolean;
  confidenceBands: { lower: number; upper: number } | null;
  curve: ForecastCurvePoint[];
};

function r2(value: number): number {
  return Math.round(value * 100) / 100;
}

function clampWindow(window: number, length: number): number {
  return Math.max(1, Math.min(Math.floor(window), Math.max(length, 1)));
}

function normalizeAlpha(alpha: number): number {
  if (!Number.isFinite(alpha)) {
    return 0.35;
  }

  if (alpha <= 0) {
    return 0.01;
  }

  if (alpha >= 1) {
    return 1;
  }

  return alpha;
}

function nextTimestamp(points: MetalPricePoint[]): Date {
  if (points.length < 2) {
    const base = points[0]?.timestamp ?? new Date();
    return new Date(base.getTime() + 24 * 60 * 60 * 1000);
  }

  const intervals = points
    .slice(1)
    .map((point, index) => point.timestamp.getTime() - points[index]!.timestamp.getTime())
    .filter((interval) => interval > 0);

  const averageInterval =
    intervals.length > 0
      ? intervals.reduce((sum, interval) => sum + interval, 0) / intervals.length
      : 24 * 60 * 60 * 1000;

  return new Date(points[points.length - 1]!.timestamp.getTime() + averageInterval);
}

export function movingAverage(prices: number[], window: number): number[] {
  if (prices.length === 0) {
    return [];
  }

  const size = clampWindow(window, prices.length);

  return prices.map((_, index) => {
    const start = Math.max(0, index - size + 1);
    const subset = prices.slice(start, index + 1);
    const average = subset.reduce((sum, value) => sum + value, 0) / subset.length;
    return r2(average);
  });
}

export function exponentialMovingAverage(prices: number[], alpha: number): number[] {
  if (prices.length === 0) {
    return [];
  }

  const normalizedAlpha = normalizeAlpha(alpha);
  const ema: number[] = [r2(prices[0] ?? 0)];

  for (let i = 1; i < prices.length; i += 1) {
    const previous = ema[i - 1] ?? prices[i - 1] ?? 0;
    const next = normalizedAlpha * (prices[i] ?? 0) + (1 - normalizedAlpha) * previous;
    ema.push(r2(next));
  }

  return ema;
}

export function volatility(prices: number[]): number | null {
  if (prices.length < 3) {
    return null;
  }

  const returns: number[] = [];
  for (let i = 1; i < prices.length; i += 1) {
    const previous = prices[i - 1] ?? 0;
    const current = prices[i] ?? 0;
    if (previous > 0) {
      returns.push(((current - previous) / previous) * 100);
    }
  }

  if (returns.length < 2) {
    return null;
  }

  const mean = returns.reduce((sum, value) => sum + value, 0) / returns.length;
  const variance = returns.reduce((sum, value) => sum + (value - mean) ** 2, 0) / returns.length;
  return r2(Math.sqrt(variance));
}

/**
 * Phase 42: Segmented Polynomial Regression (Sovereign Forecast v2)
 * Detects multiple market trends and cyclicity.
 */
function segmentedRegression(prices: number[]): { series: number[]; projected: number | null } {
  if (prices.length < 2) {
    return { series: prices.map(p => r2(p)), projected: prices[0] ? r2(prices[0]) : null };
  }

  const length = prices.length;
  // We split into two segments if we have enough data to detect a pivot
  const pivot = Math.floor(length * 0.6);
  
  const fitSegment = (pts: number[]) => {
    const n = pts.length;
    if (n < 2) return { slope: 0, intercept: pts[0] ?? 0 };
    const sumX = ((n - 1) * n) / 2;
    const sumY = pts.reduce((a, b) => a + b, 0);
    const sumXY = pts.reduce((sum, val, i) => sum + i * val, 0);
    const sumXX = pts.reduce((sum, _, i) => sum + i * i, 0);
    const den = n * sumXX - sumX * sumX;
    const slope = den === 0 ? 0 : (n * sumXY - sumX * sumY) / den;
    const intercept = (sumY - slope * sumX) / n;
    return { slope, intercept };
  };

  const globalFit = fitSegment(prices);
  const recentFit = fitSegment(prices.slice(pivot));

  // Blend the global trend with the recent momentum (weighted 30/70)
  const series = prices.map((_, i) => {
    const globalVal = globalFit.intercept + globalFit.slope * i;
    const recentVal = i >= pivot 
      ? recentFit.intercept + recentFit.slope * (i - pivot)
      : globalVal;
    return r2(recentVal * 0.3 + globalVal * 0.7);
  });

  const projected = r2(
    (recentFit.intercept + recentFit.slope * (length - pivot)) * 0.8 + 
    (globalFit.intercept + globalFit.slope * length) * 0.2
  );

  return { series, projected };
}

export async function projectedPrice(prices: number[], method: ProjectionMethod): Promise<number | null> {
  if (prices.length === 0) {
    return null;
  }

  const { statisticalForecaster } = await import("@/lib/ai/statistical-forecaster");

  switch (method) {
    case "sma": {
      const series = movingAverage(prices, Math.min(5, prices.length));
      return series[series.length - 1] ?? null;
    }
    case "ema": {
      const series = exponentialMovingAverage(prices, 0.35);
      return series[series.length - 1] ?? null;
    }
    case "regression": {
      return segmentedRegression(prices).projected;
    }
    case "statistical": {
      const result = await statisticalForecaster.calculateProjection(prices);
      return result.projected;
    }
  }
}

/**
 * Phase 44: Core Projection Payload
 * Wraps the statistical engine to provide full metadata for the UI.
 */
export async function getDetailedProjection(prices: number[]) {
  const { statisticalForecaster } = await import("@/lib/ai/statistical-forecaster");
  return statisticalForecaster.calculateProjection(prices);
}

function confidenceIndicator(volatilityPct: number | null): ForecastConfidence {
  if (volatilityPct == null) {
    return "n/a";
  }

  if (volatilityPct < 1.5) {
    return "high";
  }

  if (volatilityPct < 3) {
    return "moderate";
  }

  return "low";
}

export function chooseProjectionMethod(prices: number[]): ProjectionMethod {
  if (prices.length >= 8) {
    return "regression";
  }

  if (prices.length >= 4) {
    return "ema";
  }

  return "sma";
}

export async function buildForecast(prices: MetalPricePoint[], method?: ProjectionMethod): Promise<PriceForecast> {
  const numericPrices = prices.map((point) => point.priceUsdPerUnit);
  const resolvedMethod = method ?? chooseProjectionMethod(numericPrices);
  const smaSeries = movingAverage(numericPrices, Math.min(5, Math.max(numericPrices.length, 1)));
  const emaSeries = exponentialMovingAverage(numericPrices, 0.35);
  const regression = segmentedRegression(numericPrices);
  const projected = await projectedPrice(numericPrices, resolvedMethod);
  const nextPointTimestamp = nextTimestamp(prices);

  let projectedSeries: number[] = [];
  switch (resolvedMethod) {
    case "sma":
      projectedSeries = smaSeries;
      break;
    case "ema":
      projectedSeries = emaSeries;
      break;
    case "regression":
      projectedSeries = regression.series;
      break;
  }

  const curve: ForecastCurvePoint[] = prices.map((point, index) => ({
    timestamp: point.timestamp,
    actualPriceUsdPerUnit: point.priceUsdPerUnit,
    projectedPriceUsdPerUnit: projectedSeries[index] ?? point.priceUsdPerUnit,
  }));

  if (projected != null) {
    curve.push({
      timestamp: nextPointTimestamp,
      actualPriceUsdPerUnit: null,
      projectedPriceUsdPerUnit: projected,
    });
  }

  const vol = volatility(numericPrices);
  const detailed = await getDetailedProjection(numericPrices);

  return {
    method: resolvedMethod,
    projectedPrice: projected != null ? r2(projected) : null,
    smaProjectedPrice: smaSeries[smaSeries.length - 1] ?? null,
    emaProjectedPrice: emaSeries[emaSeries.length - 1] ?? null,
    regressionProjectedPrice: regression.projected,
    volatilityPct: vol,
    confidenceIndicator: confidenceIndicator(vol),
    hasAnomaly: detailed.isAnomalous,
    confidenceBands: detailed.confidenceBands,
    curve,
  };
}

export async function getForecastOverview(): Promise<ForecastOverviewRow[]> {
  // Phase 41: Performance Caching
  const cached = await redis.get<ForecastOverviewRow[]>(FORECAST_CACHE_KEY);
  if (cached) {
    return cached;
  }

  const rows = await Promise.all(
    supportedMetalTypes.map(async (metalType) => {
      const [latest, history] = await Promise.all([
        getLatestPrice(metalType),
        getHistoricalPrices(metalType, { days: 45, limit: 90 }),
      ]);

      const forecast = await buildForecast(history);

      return {
        metalType,
        latestPrice: latest?.priceUsdPerUnit ?? null,
        latestTimestamp: latest?.timestamp ?? null,
        projectedPrice: forecast.projectedPrice,
        method: forecast.method,
        smaProjectedPrice: forecast.smaProjectedPrice,
        emaProjectedPrice: forecast.emaProjectedPrice,
        regressionProjectedPrice: forecast.regressionProjectedPrice,
        volatilityPct: forecast.volatilityPct,
        confidenceIndicator: forecast.confidenceIndicator,
        hasAnomaly: forecast.hasAnomaly,
        confidenceBands: forecast.confidenceBands,
        curve: forecast.curve,
      };
    }),
  );

  // Cache the results
  await redis.set(FORECAST_CACHE_KEY, rows, FORECAST_CACHE_TTL);

  return rows;
}
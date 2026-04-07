import { 
  type MetalType, 
  type MetalPricePoint, 
  type HistoricalPriceRange, 
  type MarketOverviewRow 
} from "./prices/price-history-service";
import { 
  type PriceForecast, 
  type ForecastOverviewRow, 
  type ProjectionMethod 
} from "./prices/forecasting-service";

export const supportedMetalTypes = ["gold", "silver", "platinum", "palladium"] as const;

export async function getLatestPrice(metalType: MetalType): Promise<MetalPricePoint | null> {
  const prices: Record<MetalType, number> = {
    gold: 2150.42,
    silver: 24.15,
    platinum: 930.12,
    palladium: 1050.85,
  };

  return {
    id: `mock-price-${metalType}`,
    metalType,
    priceUsdPerUnit: prices[metalType],
    timestamp: new Date(),
    source: "mock-provider",
    priceBasis: "spot",
    priceAgeSeconds: 0,
    priceSourceStatus: "live",
  };
}

export async function getHistoricalPrices(
  metalType: MetalType,
  range?: HistoricalPriceRange,
): Promise<MetalPricePoint[]> {
  const points: MetalPricePoint[] = [];
  const days = range?.days ?? 30;
  const limit = range?.limit ?? 100;
  const basePrice = (await getLatestPrice(metalType))?.priceUsdPerUnit ?? 1000;

  for (let i = 0; i < Math.min(days, limit); i++) {
    const ts = new Date();
    ts.setDate(ts.getDate() - (days - i));
    points.push({
      id: `mock-hist-${metalType}-${i}`,
      metalType,
      priceUsdPerUnit: basePrice + Math.sin(i * 0.5) * (basePrice * 0.02),
      timestamp: ts,
      source: "mock-provider",
      priceBasis: "estimated",
      priceAgeSeconds: (days - i) * 86400,
      priceSourceStatus: "stale",
    });
  }

  return points;
}

export async function getPriceAtTimestamp(
  metalType: MetalType,
  timestamp: Date,
): Promise<MetalPricePoint | null> {
  return getLatestPrice(metalType);
}

export async function getMarketOverview(): Promise<MarketOverviewRow[]> {
  return [
    { metalType: "gold", latestPrice: 2150.42, latestTimestamp: new Date(), change7dPct: 1.2, change30dPct: 3.5, volatilityIndicator: "low", volatilityPct: 0.5, status: "live" },
    { metalType: "silver", latestPrice: 24.15, latestTimestamp: new Date(), change7dPct: -0.5, change30dPct: 0.8, volatilityIndicator: "moderate", volatilityPct: 2.1, status: "live" },
    { metalType: "platinum", latestPrice: 930.12, latestTimestamp: new Date(), change7dPct: 0.1, change30dPct: -1.2, volatilityIndicator: "moderate", volatilityPct: 1.5, status: "stale" },
    { metalType: "palladium", latestPrice: 1050.85, latestTimestamp: new Date(), change7dPct: 2.3, change30dPct: 5.1, volatilityIndicator: "high", volatilityPct: 4.2, status: "live" },
  ];
}

export async function getLatestPricesByMetalType(): Promise<Record<MetalType, number | null>> {
  return {
    gold: 2150.42,
    silver: 24.15,
    platinum: 930.12,
    palladium: 1050.85,
  };
}

export async function countPriceRows(): Promise<number> {
  return 4200;
}

// Forecasting Mock Sigs
export function movingAverage(prices: number[], window: number): number[] {
  return prices.map(p => p);
}

export function exponentialMovingAverage(prices: number[], alpha: number): number[] {
  return prices.map(p => p);
}

export function volatility(prices: number[]): number | null {
  return 1.5;
}

export function projectedPrice(prices: number[], method: ProjectionMethod): number | null {
  return (prices[prices.length - 1] ?? 1000) * 1.01;
}

export function chooseProjectionMethod(prices: number[]): ProjectionMethod {
  return "ema";
}

export function buildForecast(prices: MetalPricePoint[], method?: ProjectionMethod): PriceForecast {
  const lastPrice = prices[prices.length - 1]?.priceUsdPerUnit ?? 2000;
  return {
    method: method ?? "ema",
    projectedPrice: lastPrice * 1.02,
    smaProjectedPrice: lastPrice * 1.01,
    emaProjectedPrice: lastPrice * 1.02,
    regressionProjectedPrice: lastPrice * 1.03,
    volatilityPct: 1.2,
    confidenceIndicator: "high",
    hasAnomaly: false,
    confidenceBands: null,
    curve: prices.map(p => ({
      timestamp: p.timestamp,
      actualPriceUsdPerUnit: p.priceUsdPerUnit,
      projectedPriceUsdPerUnit: p.priceUsdPerUnit,
    })),
  };
}

export async function getForecastOverview(): Promise<ForecastOverviewRow[]> {
  return [
    {
      metalType: "gold",
      latestPrice: 2150.42,
      latestTimestamp: new Date(),
      projectedPrice: 2200.0,
      method: "ema",
      smaProjectedPrice: 2180.0,
      emaProjectedPrice: 2200.0,
      regressionProjectedPrice: 2210.0,
      confidenceIndicator: "high",
      volatilityPct: 0.8,
      hasAnomaly: false,
      confidenceBands: null,
      curve: [{ timestamp: new Date(), actualPriceUsdPerUnit: 2150, projectedPriceUsdPerUnit: 2150 }],
    },
  ];
}

export {
  countPriceRows,
  getHistoricalPrices,
  getLatestPrice,
  getLatestPricesByMetalType,
  getMarketOverview,
  getPriceAtTimestamp,
  supportedMetalTypes,
  type HistoricalPriceRange,
  type MarketOverviewRow,
  type MetalPricePoint,
  type MetalType,
} from "./price-history-service";

export {
  buildForecast,
  chooseProjectionMethod,
  exponentialMovingAverage,
  getForecastOverview,
  movingAverage,
  projectedPrice,
  volatility,
  type ForecastConfidence,
  type ForecastCurvePoint,
  type ForecastOverviewRow,
  type PriceForecast,
  type ProjectionMethod,
} from "./forecasting-service";

export {
  backfillRecentDailyPrices,
  ingestDailySpotPrices,
} from "./ingestion-job";

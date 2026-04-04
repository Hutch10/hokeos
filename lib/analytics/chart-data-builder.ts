import type { BatchApiData, BatchItemApiData } from "@/lib/validations/calculator";
import type { LotApiData } from "@/lib/validations/lots";
import { calculateSMA, calculateEMA } from "./trendline-utils";

export type FilteredBatchForCharts = {
  batch: BatchApiData;
  items: BatchItemApiData[];
};

export type MonthlyTimeSeriesPoint = {
  period: string;
  itemCount: number;
  recoveredMetalWeight: number;
  grossValue: number;
  netValue: number;
  profitLoss: number;
  averageMarginPct: number | null;
  // Professional volatility filtering
  netValueSMA_10?: number | null;
  netValueEMA_10?: number | null;
  netValueSMA_20?: number | null;
  netValueEMA_20?: number | null;
  netValueSMA_50?: number | null;
  netValueEMA_50?: number | null;
  profitEMA_10?: number | null;
  profitEMA_20?: number | null;
  profitEMA_50?: number | null;
};

export type MetalTypeTimeSeriesPoint = {
  period: string;
  itemCount: number;
  recoveredMetalWeight: number;
  netValue: number;
  profitLoss: number;
};

export type MetalTypeTimeSeries = {
  metalType: string;
  points: MetalTypeTimeSeriesPoint[];
};

export type CumulativeProfitLossPoint = {
  period: string;
  periodProfitLoss: number;
  cumulativeProfitLoss: number;
};

export type RecoveryRateTrendPoint = {
  period: string;
  itemCount: number;
  averageRecoveryRatePct: number;
  minRecoveryRatePct: number;
  maxRecoveryRatePct: number;
};

export type ChartDataSets = {
  monthlySeries: MonthlyTimeSeriesPoint[];
  metalTypeSeries: MetalTypeTimeSeries[];
  cumulativeProfitLossSeries: CumulativeProfitLossPoint[];
  recoveryRateTrendSeries: RecoveryRateTrendPoint[];
};

type MonthlyAccumulator = {
  itemCount: number;
  recoveredMetalWeight: number;
  grossValue: number;
  netValue: number;
  profitLoss: number;
  marginValues: number[];
  recoveryRates: number[];
};

type MetalMonthlyAccumulator = {
  itemCount: number;
  recoveredMetalWeight: number;
  netValue: number;
  profitLoss: number;
};

function toMonthKey(value: Date): string {
  const year = value.getUTCFullYear();
  const month = String(value.getUTCMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function round4(value: number): number {
  return Math.round(value * 10000) / 10000;
}

export function buildChartData(input: {
  filteredBatches: FilteredBatchForCharts[];
  lots?: LotApiData[];
}): ChartDataSets {
  const monthlyMap = new Map<string, MonthlyAccumulator>();
  const metalMonthlyMap = new Map<string, Map<string, MetalMonthlyAccumulator>>();

  for (const entry of input.filteredBatches) {
    const createdAt = entry.batch.createdAt ? new Date(entry.batch.createdAt) : null;
    if (!createdAt || Number.isNaN(createdAt.getTime())) {
      continue;
    }

    const period = toMonthKey(createdAt);
    const monthly = monthlyMap.get(period) ?? {
      itemCount: 0,
      recoveredMetalWeight: 0,
      grossValue: 0,
      netValue: 0,
      profitLoss: 0,
      marginValues: [],
      recoveryRates: [],
    };

    for (const item of entry.items) {
      monthly.itemCount += 1;
      monthly.recoveredMetalWeight += item.recoveredMetalWeight;
      monthly.grossValue += item.grossValue;
      monthly.netValue += item.netValue;
      monthly.profitLoss += item.profitLoss;
      monthly.recoveryRates.push(item.recoveryRatePct);
      if (item.marginPct != null) {
        monthly.marginValues.push(item.marginPct);
      }

      const metalMap = metalMonthlyMap.get(item.metalType) ?? new Map<string, MetalMonthlyAccumulator>();
      const metalMonthly = metalMap.get(period) ?? {
        itemCount: 0,
        recoveredMetalWeight: 0,
        netValue: 0,
        profitLoss: 0,
      };

      metalMonthly.itemCount += 1;
      metalMonthly.recoveredMetalWeight += item.recoveredMetalWeight;
      metalMonthly.netValue += item.netValue;
      metalMonthly.profitLoss += item.profitLoss;

      metalMap.set(period, metalMonthly);
      metalMonthlyMap.set(item.metalType, metalMap);
    }

    monthlyMap.set(period, monthly);
  }

  // Add Lot data to the monthly aggregation
  if (input.lots) {
    for (const lot of input.lots) {
      if (!lot.createdAt || !lot.roi) continue;
      const createdAt = new Date(lot.createdAt);
      if (Number.isNaN(createdAt.getTime())) continue;

      const period = toMonthKey(createdAt);
      const monthly = monthlyMap.get(period) ?? {
        itemCount: 0,
        recoveredMetalWeight: 0,
        grossValue: 0,
        netValue: 0,
        profitLoss: 0,
        marginValues: [],
        recoveryRates: [],
      };

      // In the context of a Lot, "revenue" is net recovery value (similar to netValue in batches)
      // and "totalCost" is the acquisition/process cost.
      monthly.itemCount += 1;
      monthly.netValue += Number(lot.roi.revenue);
      monthly.grossValue += Number(lot.roi.revenue); // Fallback for lot-based gross
      monthly.profitLoss += Number(lot.roi.profit);
      if (lot.roi.marginPct !== null) {
        monthly.marginValues.push(Number(lot.roi.marginPct));
      }

      monthlyMap.set(period, monthly);
      
      // Note: Metal-type specific breakdown for Lots would require recovery sub-table 
      // which is out of scope for the current combined dashboard simplification.
    }
  }

  const periods = Array.from(monthlyMap.keys()).sort((a, b) => a.localeCompare(b));

  let monthlySeries: MonthlyTimeSeriesPoint[] = periods.map((period) => {
    const row = monthlyMap.get(period)!;
    return {
      period,
      itemCount: row.itemCount,
      recoveredMetalWeight: round4(row.recoveredMetalWeight),
      grossValue: round2(row.grossValue),
      netValue: round2(row.netValue),
      profitLoss: round2(row.profitLoss),
      averageMarginPct:
        row.marginValues.length > 0
          ? round2(row.marginValues.reduce((sum, value) => sum + value, 0) / row.marginValues.length)
          : null,
    };
  });

  // Calculate Professional Gradated Smoothing (10, 20, 50 intervals)
  const netValues = monthlySeries.map((p) => p.netValue);
  const profitValues = monthlySeries.map((p) => p.profitLoss);

  const nSMA10 = calculateSMA(netValues, 10);
  const nEMA10 = calculateEMA(netValues, 10);
  const nSMA20 = calculateSMA(netValues, 20);
  const nEMA20 = calculateEMA(netValues, 20);
  const nSMA50 = calculateSMA(netValues, 50);
  const nEMA50 = calculateEMA(netValues, 50);
  
  const pEMA10 = calculateEMA(profitValues, 10);
  const pEMA20 = calculateEMA(profitValues, 20);
  const pEMA50 = calculateEMA(profitValues, 50);

  monthlySeries = monthlySeries.map((point, i) => ({
    ...point,
    netValueSMA_10: nSMA10[i] ? round2(nSMA10[i]!) : null,
    netValueEMA_10: nEMA10[i] ? round2(nEMA10[i]!) : null,
    netValueSMA_20: nSMA20[i] ? round2(nSMA20[i]!) : null,
    netValueEMA_20: nEMA20[i] ? round2(nEMA20[i]!) : null,
    netValueSMA_50: nSMA50[i] ? round2(nSMA50[i]!) : null,
    netValueEMA_50: nEMA50[i] ? round2(nEMA50[i]!) : null,
    profitEMA_10: pEMA10[i] ? round2(pEMA10[i]!) : null,
    profitEMA_20: pEMA20[i] ? round2(pEMA20[i]!) : null,
    profitEMA_50: pEMA50[i] ? round2(pEMA50[i]!) : null,
  }));

  const cumulativeProfitLossSeries: CumulativeProfitLossPoint[] = [];
  let cumulative = 0;
  for (const point of monthlySeries) {
    cumulative += point.profitLoss;
    cumulativeProfitLossSeries.push({
      period: point.period,
      periodProfitLoss: point.profitLoss,
      cumulativeProfitLoss: round2(cumulative),
    });
  }

  const recoveryRateTrendSeries: RecoveryRateTrendPoint[] = periods.map((period) => {
    const row = monthlyMap.get(period)!;
    const min = row.recoveryRates.length > 0 ? Math.min(...row.recoveryRates) : 0;
    const max = row.recoveryRates.length > 0 ? Math.max(...row.recoveryRates) : 0;
    const avg =
      row.recoveryRates.length > 0
        ? row.recoveryRates.reduce((sum, value) => sum + value, 0) / row.recoveryRates.length
        : 0;

    return {
      period,
      itemCount: row.itemCount,
      averageRecoveryRatePct: round2(avg),
      minRecoveryRatePct: round2(min),
      maxRecoveryRatePct: round2(max),
    };
  });

  const metalTypeSeries: MetalTypeTimeSeries[] = Array.from(metalMonthlyMap.entries())
    .map(([metalType, periodMap]) => {
      const points: MetalTypeTimeSeriesPoint[] = periods.map((period) => {
        const row = periodMap.get(period);
        return {
          period,
          itemCount: row?.itemCount ?? 0,
          recoveredMetalWeight: round4(row?.recoveredMetalWeight ?? 0),
          netValue: round2(row?.netValue ?? 0),
          profitLoss: round2(row?.profitLoss ?? 0),
        };
      });

      return {
        metalType,
        points,
      };
    })
    .sort((a, b) => {
      const aTotal = a.points.reduce((sum, p) => sum + p.netValue, 0);
      const bTotal = b.points.reduce((sum, p) => sum + p.netValue, 0);
      return bTotal - aTotal;
    });

  return {
    monthlySeries,
    metalTypeSeries,
    cumulativeProfitLossSeries,
    recoveryRateTrendSeries,
  };
}

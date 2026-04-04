"use client";

import { useMemo, useState } from "react";
import {
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type {
  CumulativeProfitLossPoint,
  MonthlyTimeSeriesPoint,
  RecoveryRateTrendPoint,
} from "@/lib/analytics/chart-data-builder";

type RoiLineChartProps = {
  monthlySeries: MonthlyTimeSeriesPoint[];
  cumulativeProfitLossSeries: CumulativeProfitLossPoint[];
  recoveryRateTrendSeries: RecoveryRateTrendPoint[];
};

type SmoothingWindow = "raw" | "10" | "20" | "50";

type RoiChartRow = {
  period: string;
  netValue: number;
  profitLoss: number;
  cumulativeProfitLoss: number;
  averageRecoveryRatePct: number;
  // Multi-window fields
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

function toCurrency(value: number): string {
  return `$${new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)}`;
}

export default function RoiLineChart({
  monthlySeries,
  cumulativeProfitLossSeries,
  recoveryRateTrendSeries,
}: RoiLineChartProps) {
  const [windowSize, setWindowSize] = useState<SmoothingWindow>("10");
  const [useEMA, setUseEMA] = useState(true);

  const chartData = useMemo<RoiChartRow[]>(() => {
    const cumulativeMap = new Map(
      cumulativeProfitLossSeries.map((point) => [point.period, point.cumulativeProfitLoss]),
    );
    const recoveryMap = new Map(
      recoveryRateTrendSeries.map((point) => [point.period, point.averageRecoveryRatePct]),
    );

    return monthlySeries.map((point) => {
      const cumulativeProfitLoss = cumulativeMap.get(point.period) ?? 0;
      const averageRecoveryRatePct = recoveryMap.get(point.period) ?? 0;
      return {
        ...point,
        cumulativeProfitLoss,
        averageRecoveryRatePct,
      };
    });
  }, [cumulativeProfitLossSeries, monthlySeries, recoveryRateTrendSeries]);

  if (chartData.length === 0) {
    return (
      <div className="flex h-full items-center justify-center rounded-md border border-zinc-200 bg-zinc-50 text-sm text-zinc-500">
        No data available
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full gap-4">
      <div className="flex items-center justify-between px-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Volatility Filter:</span>
          <div className="flex bg-zinc-100 p-0.5 rounded-lg border border-zinc-200">
            {(["raw", "10", "20", "50"] as const).map((size) => (
              <button
                key={size}
                onClick={() => setWindowSize(size)}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
                  windowSize === size
                    ? "bg-white text-zinc-900 shadow-sm"
                    : "text-zinc-500 hover:text-zinc-700"
                }`}
              >
                {size === "raw" ? "Raw" : `${size}p`}
              </button>
            ))}
          </div>
        </div>
        
        {windowSize !== "raw" && (
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Algorithm:</span>
            <div className="flex bg-zinc-100 p-0.5 rounded-lg border border-zinc-200">
              <button
                onClick={() => setUseEMA(false)}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
                  !useEMA
                    ? "bg-white text-zinc-900 shadow-sm"
                    : "text-zinc-500 hover:text-zinc-700"
                }`}
              >
                SMA
              </button>
              <button
                onClick={() => setUseEMA(true)}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
                  useEMA
                    ? "bg-white text-zinc-900 shadow-sm"
                    : "text-zinc-500 hover:text-zinc-700"
                }`}
              >
                EMA
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="flex-1 min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
            <XAxis dataKey="period" stroke="#71717a" tick={{ fontSize: 11 }} />
            <YAxis yAxisId="usd" stroke="#71717a" tick={{ fontSize: 11 }} tickFormatter={toCurrency} />
            <YAxis
              yAxisId="pct"
              orientation="right"
              stroke="#71717a"
              tick={{ fontSize: 11 }}
              tickFormatter={(value) => `${value}%`}
            />
            <Tooltip
              contentStyle={{ borderRadius: '8px', border: '1px solid #e4e4e7' }}
              formatter={(value, name) => {
                const numericValue = Number(value ?? 0);
                if (name === "averageRecoveryRatePct") {
                  return [`${numericValue.toFixed(2)}%`, "Avg Recovery Rate"];
                }
                return [toCurrency(numericValue), String(name)];
              }}
            />
            <Legend
              verticalAlign="top"
              height={36}
              formatter={(value) => {
                if (value === "netValue") return "Raw Net Value";
                if (value === "profitLoss") return "Profit / Loss";
                if (value === "cumulativeProfitLoss") return "Cumulative P&L";
                if (value === "averageRecoveryRatePct") return "Avg Recovery %";
                if (String(value).includes("SMA")) return `SMA (${windowSize}p)`;
                if (String(value).includes("EMA")) return `EMA (${windowSize}p)`;
                return value;
              }}
            />
            <Line yAxisId="usd" dataKey="netValue" stroke="#d4d4d8" strokeWidth={1} dot={false} strokeOpacity={windowSize === "raw" ? 1 : 0.4} />
            
            {windowSize !== "raw" && (
              <Line
                yAxisId="usd"
                dataKey={useEMA ? `netValueEMA_${windowSize}` : `netValueSMA_${windowSize}`}
                stroke="#0284c7"
                strokeWidth={2.5}
                dot={false}
                name={useEMA ? `netValueEMA_${windowSize}` : `netValueSMA_${windowSize}`}
              />
            )}

            <Line yAxisId="usd" dataKey="profitLoss" stroke="#10b981" strokeWidth={2} dot={false} strokeOpacity={0.6} />
            
            <Line
              yAxisId="usd"
              dataKey="cumulativeProfitLoss"
              stroke="#8b5cf6"
              strokeWidth={2}
              dot={false}
            />
            <Line
              yAxisId="pct"
              dataKey="averageRecoveryRatePct"
              stroke="#f59e0b"
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

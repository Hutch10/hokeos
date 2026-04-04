"use client";

import { useMemo } from "react";
import {
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type { MetalTypeTimeSeries } from "@/lib/analytics/chart-data-builder";

type MetalPerformanceChartProps = {
  metalTypeSeries: MetalTypeTimeSeries[];
};

type MetalChartRow = {
  period: string;
  [key: string]: number | string;
};

const SERIES_COLORS = ["#0284c7", "#16a34a", "#7c3aed", "#ea580c", "#db2777", "#0f766e"];

function toCurrency(value: number): string {
  return `$${new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)}`;
}

export default function MetalPerformanceChart({ metalTypeSeries }: MetalPerformanceChartProps) {
  const chartData = useMemo<MetalChartRow[]>(() => {
    const periodSet = new Set<string>();
    for (const series of metalTypeSeries) {
      for (const point of series.points) {
        periodSet.add(point.period);
      }
    }

    const periods = Array.from(periodSet).sort((a, b) => a.localeCompare(b));

    return periods.map((period) => {
      const row: MetalChartRow = { period };

      for (const series of metalTypeSeries) {
        const point = series.points.find((item) => item.period === period);
        row[series.metalType] = point?.netValue ?? 0;
      }

      return row;
    });
  }, [metalTypeSeries]);

  if (chartData.length === 0 || metalTypeSeries.length === 0) {
    return (
      <div className="flex h-full items-center justify-center rounded-md border border-zinc-200 bg-zinc-50 text-sm text-zinc-500">
        No data available
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={chartData} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
        <XAxis dataKey="period" stroke="#71717a" tick={{ fontSize: 12 }} />
        <YAxis stroke="#71717a" tick={{ fontSize: 12 }} tickFormatter={toCurrency} />
        <Tooltip
          formatter={(value) => {
            const numericValue = Number(value ?? 0);
            return [toCurrency(numericValue), "Net Value"];
          }}
        />
        <Legend formatter={(value) => (typeof value === "string" ? value : String(value))} />

        {metalTypeSeries.map((series, index) => (
          <Line
            key={series.metalType}
            type="monotone"
            dataKey={series.metalType}
            stroke={SERIES_COLORS[index % SERIES_COLORS.length]}
            strokeWidth={2}
            dot={false}
            name={series.metalType}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}

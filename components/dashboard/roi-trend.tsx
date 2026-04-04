"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartShell } from "@/components/dashboard/chart-shell";
import dynamic from "next/dynamic";
import type {
  CumulativeProfitLossPoint,
  MonthlyTimeSeriesPoint,
  RecoveryRateTrendPoint,
} from "@/lib/analytics/chart-data-builder";

const DynamicLineChart = dynamic(() => import("./roi-line-chart"), {
  ssr: false,
  loading: () => <div className="h-80 w-full animate-pulse bg-zinc-100 rounded-md" />,
});

type RoiTrendProps = {
  monthlySeries: MonthlyTimeSeriesPoint[];
  cumulativeProfitLossSeries: CumulativeProfitLossPoint[];
  recoveryRateTrendSeries: RecoveryRateTrendPoint[];
};

export function RoiTrend({
  monthlySeries,
  cumulativeProfitLossSeries,
  recoveryRateTrendSeries,
}: RoiTrendProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>ROI Trend</CardTitle>
        <CardDescription>
          Net value, profit/loss, cumulative P&L, and recovery-rate trend over time.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ChartShell
          ChartComponent={DynamicLineChart}
          chartProps={{
            monthlySeries,
            cumulativeProfitLossSeries,
            recoveryRateTrendSeries,
          }}
          heightClassName="h-80"
        />
      </CardContent>
    </Card>
  );
}

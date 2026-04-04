"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartShell } from "@/components/dashboard/chart-shell";
import dynamic from "next/dynamic";
import type { MetalTypeTimeSeries } from "@/lib/analytics/chart-data-builder";

const DynamicPerformanceChart = dynamic(() => import("./metal-performance-chart"), {
  ssr: false,
  loading: () => <div className="h-80 w-full animate-pulse bg-zinc-100 rounded-md" />,
});

type MetalPerformanceTrendProps = {
  metalTypeSeries: MetalTypeTimeSeries[];
};

export function MetalPerformanceTrend({ metalTypeSeries }: MetalPerformanceTrendProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Metal Performance Trend</CardTitle>
        <CardDescription>
          Net value trajectories by metal type across filtered periods.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ChartShell
          ChartComponent={DynamicPerformanceChart}
          chartProps={{ metalTypeSeries }}
          heightClassName="h-80"
        />
      </CardContent>
    </Card>
  );
}

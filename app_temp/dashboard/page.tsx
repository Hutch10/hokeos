import Link from "next/link";

import { DashboardMetricCard } from "@/components/dashboard/dashboard-metric-card";
import { FilterBar } from "@/components/dashboard/filter-bar";
import { MetalPerformanceTrend } from "@/components/dashboard/metal-performance-trend";
import {
  MetalBreakdownTable,
  type MetalBreakdownRow,
} from "@/components/dashboard/metal-breakdown-table";
import { MonthlySummary, type MonthlySummaryRow } from "@/components/dashboard/monthly-summary";
import { RoiTrend } from "@/components/dashboard/roi-trend";
import { PerformanceHeatmap, type HeatmapPoint } from "@/components/dashboard/performance-heatmap";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlphaHealth } from "@/components/dashboard/alpha-health";
import { ClassificationLabel } from "@/components/ui/classification-label";
import { cn } from "@/lib/utils";
import { PERSISTENCE_MODE } from "@/db";
import {
  buildChartData,
  type FilteredBatchForCharts,
} from "@/lib/analytics/chart-data-builder";
import { Sentinel } from "@/lib/analytics/sentinel";
import { TrustModeBanner } from "@/components/dashboard/trust-mode-banner";
import {
  getBatchService,
  getBillingService,
  getLotService,
  getPriceService,
  getInvestigationService,
} from "@/lib/persistence-router";
import {
  batchApiResponseSchema,
  targetMetalOptions,
  type BatchApiData,
} from "@/lib/validations/calculator";
import { requireCurrentUser } from "@/lib/auth";
import { type LotApiData } from "@/lib/validations/lots";
import { type RecentReportRow, type ReportScheduleRow } from "@/lib/reports";
import { type ProjectionMethod } from "@/lib/prices";

type DashboardSearchParams = Record<string, string | string[] | undefined>;

type DashboardFilterState = {
  startDate?: string;
  endDate?: string;
  metalTypes: string[];
  minPurity?: number;
  maxPurity?: number;
  minRecoveryRate?: number;
  maxRecoveryRate?: number;
};

function toNumber(value: string | undefined): number | undefined {
  if (!value) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function parseFilterState(params: DashboardSearchParams): DashboardFilterState {
  const metalTypeParam = params.metalType;
  const metalTypes = (Array.isArray(metalTypeParam) ? metalTypeParam : metalTypeParam ? [metalTypeParam] : [])
    .filter((value): value is (typeof targetMetalOptions)[number] =>
      (targetMetalOptions as readonly string[]).includes(value),
    );

  const startDate = typeof params.startDate === "string" ? params.startDate : undefined;
  const endDate = typeof params.endDate === "string" ? params.endDate : undefined;

  const minPurity = toNumber(typeof params.minPurity === "string" ? params.minPurity : undefined);
  const maxPurity = toNumber(typeof params.maxPurity === "string" ? params.maxPurity : undefined);
  const minRecoveryRate = toNumber(
    typeof params.minRecoveryRate === "string" ? params.minRecoveryRate : undefined,
  );
  const maxRecoveryRate = toNumber(
    typeof params.maxRecoveryRate === "string" ? params.maxRecoveryRate : undefined,
  );

  return {
    startDate,
    endDate,
    metalTypes,
    minPurity,
    maxPurity,
    minRecoveryRate,
    maxRecoveryRate,
  };
}

function fmt2(value: number): string {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function fmt4(value: number): string {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  }).format(value);
}

function fmtSignedPct(value: number | null): string {
  if (value == null) {
    return "n/a";
  }

  return `${value >= 0 ? "+" : ""}${fmt2(value)}%`;
}

function buildSparklinePath(values: number[], width: number, height: number): string {
  if (values.length === 0) {
    return "";
  }

  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;

  return values
    .map((value, index) => {
      const x = values.length === 1 ? width / 2 : (index / (values.length - 1)) * width;
      const y = height - ((value - min) / span) * height;
      return `${index === 0 ? "M" : "L"}${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(" ");
}

function formatProjectionMethod(method: ProjectionMethod): string {
  switch (method) {
    case "sma":
      return "SMA";
    case "ema":
      return "EMA";
    case "regression":
      return "Regression";
    case "statistical":
      return "Statistical";
  }
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams?: Promise<DashboardSearchParams>;
}) {
  const params = (await searchParams) ?? {};
  const user = await requireCurrentUser();
  const isMockRequested = params.mock === "true";
  
  // Resolve services from the gateway
  const batchService = await getBatchService(isMockRequested);
  const lotService = await getLotService(isMockRequested);
  const billingService = await getBillingService(isMockRequested);
  const priceService = await getPriceService(isMockRequested);
  const investigationService = await getInvestigationService(isMockRequested);

  const billing = await billingService.getBillingSummary(user.activeTeamId);
  const marketOverview = await priceService.getMarketOverview();
  const forecastOverview = await priceService.getForecastOverview();
  
  const recentReports: RecentReportRow[] = []; 
  const scheduledReports: ReportScheduleRow[] = []; 
  const recentInvestigations = await investigationService.listInvestigations(user.activeTeamId);
  const filters = parseFilterState(params);

  let batches: BatchApiData[] = [];
  let lots: LotApiData[] = [];
  let fetchError: string | null = null;

  try {
    const [rawBatches, rawLots] = await Promise.all([
      batchService.listBatches(user.id),
      lotService.listLots(user.activeTeamId),
    ]);
    
    lots = rawLots;
    const parsedBatches: BatchApiData[] = [];

    for (const rawBatch of rawBatches) {
      const parsed = batchApiResponseSchema.safeParse({ ok: true, data: rawBatch });
      if (!parsed.success || !parsed.data.ok || !parsed.data.data) {
        fetchError = "Failed to parse dashboard data. Check schema compatibility.";
        break;
      }
      parsedBatches.push(parsed.data.data);
    }

    batches = parsedBatches;
  } catch (err: unknown) {
    const error = err instanceof Error ? err : new Error(String(err));
    console.error("Dashboard fetch error:", error);
    fetchError = "Failed to load dashboard data. Check your database connection or use ?mock=true.";
  }

  const filteredBatches: FilteredBatchForCharts[] = batches
    .map((batch) => {
      const batchDate = batch.createdAt ? new Date(batch.createdAt) : null;
      const batchItems = batch.items ?? [];

      if (filters.startDate && batchDate) {
        const start = new Date(`${filters.startDate}T00:00:00.000Z`);
        if (batchDate < start) {
          return null;
        }
      }

      if (filters.endDate && batchDate) {
        const end = new Date(`${filters.endDate}T23:59:59.999Z`);
        if (batchDate > end) {
          return null;
        }
      }

      const filteredItems = batchItems.filter((item) => {
        if (filters.metalTypes.length > 0 && !filters.metalTypes.includes(item.metalType)) {
          return false;
        }
        if (filters.minPurity != null && item.purityPct < filters.minPurity) {
          return false;
        }
        if (filters.maxPurity != null && item.purityPct > filters.maxPurity) {
          return false;
        }
        if (filters.minRecoveryRate != null && item.recoveryRatePct < filters.minRecoveryRate) {
          return false;
        }
        if (filters.maxRecoveryRate != null && item.recoveryRatePct > filters.maxRecoveryRate) {
          return false;
        }
        return true;
      });

      if (filteredItems.length === 0) {
        return null;
      }

      return { batch, items: filteredItems };
    })
    .filter((entry): entry is FilteredBatchForCharts => entry !== null);

  const items = filteredBatches.flatMap((entry) => entry.items);

  const totalBatches = filteredBatches.length;
  const totalLots = lots.length;
  const totalRecoveredMetal = items.reduce((sum, item) => sum + item.recoveredMetalWeight, 0);
  
  // Combine Batch Gross + Lot Revenue
  const totalGrossValue = items.reduce((sum, item) => sum + item.grossValue, 0) + 
                         lots.reduce((sum, lot) => sum + Number(lot.roi?.revenue ?? 0), 0);
                         
  const totalNetValue = items.reduce((sum, item) => sum + item.netValue, 0) +
                       lots.reduce((sum, lot) => sum + Number(lot.roi?.revenue ?? 0), 0);
                       
  const totalProfitLoss = items.reduce((sum, item) => sum + item.profitLoss, 0) +
                         lots.reduce((sum, lot) => sum + Number(lot.roi?.profit ?? 0), 0);

  const marginValues = [
    ...items.map((item) => item.marginPct),
    ...lots.map((lot) => lot.roi?.marginPct ? Number(lot.roi.marginPct) : null)
  ].filter((margin): margin is number => margin !== null);
  
  const averageMarginPct =
    marginValues.length > 0
      ? marginValues.reduce((sum, margin) => sum + margin, 0) / marginValues.length
      : null;

  const metalMap = new Map<string, MetalBreakdownRow>();
  for (const item of items) {
    const current = metalMap.get(item.metalType) ?? {
      metalType: item.metalType,
      itemCount: 0,
      recoveredMetalWeight: 0,
      grossValue: 0,
      netValue: 0,
      profitLoss: 0,
    };

    current.itemCount += 1;
    current.recoveredMetalWeight += item.recoveredMetalWeight;
    current.grossValue += item.grossValue;
    current.netValue += item.netValue;
    current.profitLoss += item.profitLoss;

    metalMap.set(item.metalType, current);
  }

  const metalBreakdown = Array.from(metalMap.values()).sort((a, b) => b.netValue - a.netValue);

  const tagSummaryMap = new Map<string, { id: string; name: string; color: string | null; batchCount: number; totalNetValue: number; totalProfitLoss: number }>();

  for (const entry of filteredBatches) {
    const batchTags = entry.batch.tags ?? [];
    const batchNet = entry.items.reduce((sum, item) => sum + item.netValue, 0);
    const batchProfitLoss = entry.items.reduce((sum, item) => sum + item.profitLoss, 0);

    for (const tag of batchTags) {
      const current = tagSummaryMap.get(tag.id) ?? {
        id: tag.id,
        name: tag.name,
        color: tag.color ?? null,
        batchCount: 0,
        totalNetValue: 0,
        totalProfitLoss: 0,
      };

      current.batchCount += 1;
      current.totalNetValue += batchNet;
      current.totalProfitLoss += batchProfitLoss;

      tagSummaryMap.set(tag.id, current);
    }
  }

  const tagSummary = Array.from(tagSummaryMap.values()).sort((a, b) => {
    if (b.batchCount !== a.batchCount) {
      return b.batchCount - a.batchCount;
    }

    return b.totalNetValue - a.totalNetValue;
  });

  const chartData = buildChartData({ filteredBatches, lots });

  const monthlySummary: MonthlySummaryRow[] = [...chartData.monthlySeries]
    .map((point) => ({
      month: point.period,
      totalRecoveredMetal: point.recoveredMetalWeight,
      totalNetValue: point.netValue,
      totalProfitLoss: point.profitLoss,
      averageMarginPct: point.averageMarginPct,
    }))
    .sort((a, b) => b.month.localeCompare(a.month));

  const heatmapPoints: HeatmapPoint[] = filteredBatches.map((entry) => {
    const batch = entry.batch;
    const batchNet = entry.items.reduce((sum, item) => sum + item.netValue, 0);
    const batchProfit = entry.items.reduce((sum, item) => sum + item.profitLoss, 0);
    const marginPct = batchNet > 0 ? (batchProfit / batchNet) * 100 : 0;
    
    // Extract confidence from Phase 14 Audit Snapshot
    const confidenceScore = batch.auditSnapshot?.confidence?.score ?? 100;
    const isDegraded = batch.auditSnapshot?.confidence?.degradedMode ?? false;

    return {
      id: batch.id,
      netValue: batchNet,
      marginPct,
      confidenceScore,
      metalType: entry.items[0]?.metalType ?? "unknown",
      isDegraded,
    };
  });

  return (
    <main className="min-h-screen bg-gradient-to-b from-zinc-100 via-white to-zinc-100 px-4 py-10 sm:px-6 lg:px-8">
      <section className="mx-auto w-full max-w-6xl space-y-6">
        <header className="space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-3xl font-semibold tracking-tight text-zinc-900">ROI Dashboard</h1>
            <span className="rounded-full border border-zinc-200 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-zinc-700">
              {user.activeTeamName}
            </span>
            <span className="rounded-full border border-cyan-300 bg-cyan-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-cyan-800">
              {billing.definition.label}
            </span>
            <span className="rounded-full border border-zinc-200 bg-zinc-100 px-3 py-1 text-xs font-medium uppercase tracking-[0.2em] text-zinc-700">
              {billing.status.replace(/_/g, " ")}
            </span>
          </div>
          <p className="text-zinc-600">
            Portfolio-level recovery performance from saved Batches and Lot Lifecycles.
          </p>
          <p className="text-sm text-zinc-500">
            {billing.definition.batchLimit == null
              ? `${billing.batchCount} saved batches on an unlimited plan.`
              : `${billing.batchCount} / ${billing.definition.batchLimit} saved batches used.`}
          </p>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/batches"
              className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700"
            >
              View Batches
            </Link>
            <Link
              href="/batches?mode=compare"
              className="rounded-md bg-cyan-600 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-700"
            >
              Compare Batches
            </Link>
            <Link
              href="/calculator"
              className="rounded-md border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-100"
            >
              New Calculation
            </Link>
            <Link
              href="/billing"
              className="rounded-md border border-cyan-300 bg-cyan-50 px-4 py-2 text-sm font-medium text-cyan-800 hover:bg-cyan-100"
            >
              {billing.plan === "free" ? "Upgrade Plan" : "Manage Billing"}
            </Link>
            <Link
              href="/lots"
              className="rounded-md border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-100"
            >
              Manage Lots
            </Link>
            <Link
              href="/audit/verify"
              className="rounded-md border border-violet-300 bg-violet-50 px-4 py-2 text-sm font-medium text-violet-800 hover:bg-violet-100"
            >
              Verify Integrity
            </Link>
          </div>
        </header>

        <AlphaHealth />

        {/* Phase 10: Trust-Layer Integration */}
        {(() => {
          const snapshot = Sentinel.getSnapshot();
          let status: "active" | "degraded" | "mocking" | "fallback" = "active";
          if (snapshot.fallbackTriggerCount > 0) status = "fallback";
          else if (snapshot.degradedModeCount > 0 || snapshot.stalePriceUsage > 0) status = "degraded";
          else if (isMockRequested) status = "mocking";

          return (
            <TrustModeBanner 
              status={status} 
              fallbackCount={snapshot.fallbackTriggerCount}
              staleCount={snapshot.stalePriceUsage}
            />
          );
        })()}

        <FilterBar
          startDate={filters.startDate}
          endDate={filters.endDate}
          selectedMetalTypes={filters.metalTypes}
          minPurity={filters.minPurity}
          maxPurity={filters.maxPurity}
          minRecoveryRate={filters.minRecoveryRate}
          maxRecoveryRate={filters.maxRecoveryRate}
          metalTypeOptions={[...targetMetalOptions]}
        />

        {fetchError ? (
          <Card>
            <CardContent>
              <p className="text-sm text-rose-600">{fetchError}</p>
            </CardContent>
          </Card>
        ) : (filteredBatches.length === 0 && lots.length === 0) ? (
          <Card>
            <CardHeader>
              <CardTitle>No Matching Analytics Data</CardTitle>
              <CardDescription>
                Adjust filters or save new calculations to see dashboard metrics.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-3">
                <Link
                  href="/calculator"
                  className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700"
                >
                  New Calculation
                </Link>
                <Link
                  href="/batches"
                  className="rounded-md border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-100"
                >
                  View Batches
                </Link>
              </div>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {(() => {
                const snapshot = Sentinel.getSnapshot();
                const systemConfidence = snapshot.fallbackTriggerCount > 0 ? 35 : (snapshot.degradedModeCount > 0 ? 70 : 100);
                
                return (
                  <>
                    <DashboardMetricCard label="Total Batches" value={String(totalBatches)} confidence={systemConfidence} />
                    <DashboardMetricCard label="Active Lots" value={String(totalLots)} tone="positive" confidence={systemConfidence} />
                    <DashboardMetricCard
                      label="Total Recovered Metal"
                      value={`${fmt4(totalRecoveredMetal)} g`}
                      confidence={systemConfidence}
                    />
                    <DashboardMetricCard label="Total Gross Value" value={`$${fmt2(totalGrossValue)}`} confidence={systemConfidence} />
                    <DashboardMetricCard label="Total Net Value" value={`$${fmt2(totalNetValue)}`} confidence={systemConfidence} />
                    <DashboardMetricCard
                      label="Total Profit / Loss"
                      value={`${totalProfitLoss >= 0 ? "+" : ""}$${fmt2(totalProfitLoss)}`}
                      tone={totalProfitLoss >= 0 ? "positive" : "negative"}
                      confidence={systemConfidence}
                    />
                    <DashboardMetricCard
                      label="Average Margin %"
                      value={averageMarginPct != null ? `${fmt2(averageMarginPct)}%` : "n/a"}
                      confidence={systemConfidence}
                    />
                  </>
                );
              })()}
            </div>

            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Market Overview</CardTitle>
                    <CardDescription>
                      Latest server-ingested spot prices with 7-day / 30-day change and volatility signal.
                    </CardDescription>
                  </div>
                  <ClassificationLabel type="canonical" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-zinc-200 text-left text-xs text-zinc-500">
                        <th className="pb-2 pr-4 font-medium">Metal</th>
                        <th className="pb-2 pr-4 font-medium">Status</th>
                        <th className="pb-2 pr-4 font-medium">Latest Price ($/oz)</th>
                        <th className="pb-2 pr-4 font-medium">7-Day Change</th>
                        <th className="pb-2 pr-4 font-medium">30-Day Change</th>
                        <th className="pb-2 pr-4 font-medium">Volatility</th>
                        <th className="pb-2 font-medium">Updated</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100">
                      {marketOverview.map((row) => (
                        <tr key={row.metalType}>
                          <td className="py-2 pr-4 capitalize font-semibold text-zinc-900">{row.metalType}</td>
                          <td className="py-2 pr-4">
                            <span className={cn(
                              "rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-tighter border",
                              row.status === "live" ? "border-emerald-200 bg-emerald-50 text-emerald-700" :
                              row.status === "stale" ? "border-amber-200 bg-amber-50 text-amber-700" :
                              "border-rose-200 bg-rose-50 text-rose-700"
                            )}>
                              {row.status ?? "unknown"}
                            </span>
                          </td>
                          <td className="py-2 pr-4 text-zinc-900">
                            {row.latestPrice != null ? `$${fmt2(row.latestPrice)}` : "n/a"}
                          </td>
                          <td className={`py-2 pr-4 font-medium ${(row.change7dPct ?? 0) >= 0 ? "text-emerald-700" : "text-rose-600"}`}>
                            {fmtSignedPct(row.change7dPct)}
                          </td>
                          <td className={`py-2 pr-4 font-medium ${(row.change30dPct ?? 0) >= 0 ? "text-emerald-700" : "text-rose-600"}`}>
                            {fmtSignedPct(row.change30dPct)}
                          </td>
                          <td className="py-2 pr-4">
                            <span className={`rounded-full border px-2 py-0.5 text-xs font-medium uppercase tracking-wide ${
                              row.volatilityIndicator === "high"
                                ? "border-rose-300 bg-rose-50 text-rose-700"
                                : row.volatilityIndicator === "moderate"
                                  ? "border-amber-300 bg-amber-50 text-amber-700"
                                  : row.volatilityIndicator === "low"
                                    ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                                    : "border-zinc-300 bg-zinc-50 text-zinc-600"
                            }`}>
                              {row.volatilityIndicator}
                              {row.volatilityPct != null ? ` (${fmt2(row.volatilityPct)}%)` : ""}
                            </span>
                          </td>
                          <td className="py-2 text-zinc-600">
                            {row.latestTimestamp
                              ? new Date(row.latestTimestamp).toLocaleDateString("en-US", { month: "short", day: "numeric" })
                              : "n/a"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Forecast Overview</CardTitle>
                    <CardDescription>
                      Deterministic server-side projections across metals with SMA, EMA, regression, and confidence.
                    </CardDescription>
                  </div>
                  <ClassificationLabel type="statistical" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-zinc-200 text-left text-xs text-zinc-500">
                        <th className="pb-2 pr-4 font-medium">Metal</th>
                        <th className="pb-2 pr-4 font-medium">Latest</th>
                        <th className="pb-2 pr-4 font-medium">Projected</th>
                        <th className="pb-2 pr-4 font-medium">Method</th>
                        <th className="pb-2 pr-4 font-medium">SMA</th>
                        <th className="pb-2 pr-4 font-medium">EMA</th>
                        <th className="pb-2 pr-4 font-medium">Regression</th>
                        <th className="pb-2 pr-4 font-medium">Confidence</th>
                        <th className="pb-2 font-medium">Trend</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100">
                      {forecastOverview.map((row) => {
                        const trendPath = buildSparklinePath(
                          row.curve.map((point) => point.projectedPriceUsdPerUnit),
                          120,
                          32,
                        );

                        return (
                          <tr key={row.metalType}>
                            <td className="py-2 pr-4 capitalize text-zinc-900">{row.metalType}</td>
                            <td className="py-2 pr-4 text-zinc-900">
                              {row.latestPrice != null ? `$${fmt2(row.latestPrice)}` : "n/a"}
                            </td>
                            <td className="py-2 pr-4 text-zinc-900">
                              {row.projectedPrice != null ? `$${fmt2(row.projectedPrice)}` : "n/a"}
                            </td>
                            <td className="py-2 pr-4 text-zinc-900">{formatProjectionMethod(row.method as ProjectionMethod)}</td>
                            <td className="py-2 pr-4 text-zinc-900">
                              {row.smaProjectedPrice != null ? `$${fmt2(row.smaProjectedPrice)}` : "n/a"}
                            </td>
                            <td className="py-2 pr-4 text-zinc-900">
                              {row.emaProjectedPrice != null ? `$${fmt2(row.emaProjectedPrice)}` : "n/a"}
                            </td>
                            <td className="py-2 pr-4 text-zinc-900">
                              {row.regressionProjectedPrice != null ? `$${fmt2(row.regressionProjectedPrice)}` : "n/a"}
                            </td>
                            <td className="py-2 pr-4">
                              <span className={`rounded-full border px-2 py-0.5 text-xs font-medium uppercase tracking-wide ${
                                row.confidenceIndicator === "high"
                                  ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                                  : row.confidenceIndicator === "moderate"
                                    ? "border-amber-300 bg-amber-50 text-amber-700"
                                    : row.confidenceIndicator === "low"
                                      ? "border-rose-300 bg-rose-50 text-rose-700"
                                      : "border-zinc-300 bg-zinc-50 text-zinc-600"
                              }`}>
                                {row.confidenceIndicator}
                                {row.volatilityPct != null ? ` (${fmt2(row.volatilityPct)}% vol)` : ""}
                              </span>
                            </td>
                            <td className="py-2">
                              {trendPath ? (
                                <svg viewBox="0 0 120 32" className="h-8 w-28" role="img" aria-label={`${row.metalType} forecast trend`}>
                                  <path d={trendPath} fill="none" stroke="currentColor" strokeWidth="2" className="text-violet-600" />
                                </svg>
                              ) : (
                                <span className="text-zinc-500">n/a</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Top Tags</CardTitle>
                <CardDescription>Batch count and economic totals grouped by tag.</CardDescription>
              </CardHeader>
              <CardContent>
                {tagSummary.length === 0 ? (
                  <p className="text-sm text-zinc-500">No tagged batches found for the current filter set.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-zinc-200 text-left text-xs text-zinc-500">
                          <th className="pb-2 pr-4 font-medium">Tag</th>
                          <th className="pb-2 pr-4 font-medium">Batch Count</th>
                          <th className="pb-2 pr-4 font-medium">Total Net Value</th>
                          <th className="pb-2 font-medium">Total Profit / Loss</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-100">
                        {tagSummary.map((row) => (
                          <tr key={row.id}>
                            <td className="py-2 pr-4">
                              <span
                                className="rounded-full border border-zinc-300 bg-white px-2 py-0.5 text-xs text-zinc-700"
                               
                              >
                                {row.name}
                              </span>
                            </td>
                            <td className="py-2 pr-4 text-zinc-900">{row.batchCount}</td>
                            <td className="py-2 pr-4 text-zinc-900">${fmt2(row.totalNetValue)}</td>
                            <td className={`py-2 font-medium ${row.totalProfitLoss >= 0 ? "text-emerald-700" : "text-rose-600"}`}>
                              {row.totalProfitLoss >= 0 ? "+" : ""}${fmt2(row.totalProfitLoss)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <CardTitle>Scheduled Reports</CardTitle>
                    <CardDescription>
                      Automated report delivery queues and execution status.
                    </CardDescription>
                  </div>
                  <Link
                    href="/reports/schedules"
                    className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-xs font-medium text-zinc-900 hover:bg-zinc-50"
                  >
                    Manage Schedules
                  </Link>
                </div>
              </CardHeader>
              <CardContent>
                {scheduledReports.length === 0 ? (
                  <p className="text-sm text-zinc-500">No schedules configured.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-zinc-200 text-left text-xs text-zinc-500">
                          <th className="pb-2 pr-4 font-medium">Type</th>
                          <th className="pb-2 pr-4 font-medium">Batch</th>
                          <th className="pb-2 pr-4 font-medium">Cadence</th>
                          <th className="pb-2 pr-4 font-medium">Next Run</th>
                          <th className="pb-2 font-medium">Last Run</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-100">
                        {scheduledReports.slice(0, 8).map((schedule) => (
                          <tr key={schedule.id}>
                            <td className="py-2 pr-4 capitalize text-zinc-900">
                              {schedule.type}
                              {schedule.isPaused ? " (paused)" : ""}
                            </td>
                            <td className="py-2 pr-4 text-zinc-700">
                              {schedule.batchId ? (
                                <Link href={`/batches/${schedule.batchId}`} className="text-cyan-700 hover:text-cyan-900">
                                  {schedule.batchId.slice(0, 8)}...
                                </Link>
                              ) : (
                                "summary"
                              )}
                            </td>
                            <td className="py-2 pr-4 text-zinc-700">{schedule.cadence}</td>
                            <td className="py-2 pr-4 text-zinc-700">
                              {new Date(schedule.nextRunAt).toLocaleString("en-US", {
                                dateStyle: "medium",
                                timeStyle: "short",
                              })}
                            </td>
                            <td className="py-2 text-zinc-700">
                              {schedule.lastRunAt
                                ? new Date(schedule.lastRunAt).toLocaleString("en-US", {
                                    dateStyle: "medium",
                                    timeStyle: "short",
                                  })
                                : "never"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Recent Reports</CardTitle>
                <CardDescription>
                  Most recently generated customer-facing report documents.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {recentReports.length === 0 ? (
                  <p className="text-sm text-zinc-500">No reports generated yet.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-zinc-200 text-left text-xs text-zinc-500">
                          <th className="pb-2 pr-4 font-medium">Type</th>
                          <th className="pb-2 pr-4 font-medium">Batch</th>
                          <th className="pb-2 font-medium">Generated At</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-100">
                        {recentReports.map((report) => (
                          <tr key={report.id}>
                            <td className="py-2 pr-4 capitalize text-zinc-900">{report.type}</td>
                            <td className="py-2 pr-4">
                              {report.batchId ? (
                                <Link href={`/batches/${report.batchId}`} className="text-cyan-700 hover:text-cyan-900">
                                  {report.batchId.slice(0, 8)}...
                                </Link>
                              ) : (
                                <span className="text-zinc-500">summary</span>
                              )}
                            </td>
                            <td className="py-2 text-zinc-600">
                              {new Date(report.createdAt).toLocaleString("en-US", {
                                dateStyle: "medium",
                                timeStyle: "short",
                              })}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="border-amber-100 bg-amber-50/20">
              <CardHeader>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <CardTitle className="text-amber-900">Active Investigations</CardTitle>
                    <CardDescription className="text-amber-700">
                      High-priority audit discrepancies and sovereign trust alerts.
                    </CardDescription>
                  </div>
                  <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800">
                    {recentInvestigations.filter((i) => i.status !== "resolved").length} Active
                  </span>
                </div>
              </CardHeader>
              <CardContent>
                {recentInvestigations.length === 0 ? (
                  <p className="text-sm text-zinc-500">No investigations active.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-amber-200 text-left text-xs text-amber-600">
                          <th className="pb-2 pr-4 font-medium uppercase tracking-wider">Title</th>
                          <th className="pb-2 pr-4 font-medium uppercase tracking-wider">Severity</th>
                          <th className="pb-2 pr-4 font-medium uppercase tracking-wider">Status</th>
                          <th className="pb-2 font-medium uppercase tracking-wider">Batches</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-amber-100">
                        {recentInvestigations.slice(0, 5).map((inv) => (
                          <tr key={inv.id} className="group hover:bg-white/50 transition-colors">
                            <td className="py-3 pr-4">
                              <Link 
                                href={`/investigations/${inv.id}`}
                                className="font-semibold text-amber-900 hover:text-amber-600 transition-colors"
                              >
                                {inv.title}
                              </Link>
                            </td>
                            <td className="py-3 pr-4">
                              <span className={cn(
                                "rounded-full px-2 py-0.5 text-[10px] font-bold uppercase border",
                                inv.severity === "critical" ? "bg-rose-100 border-rose-200 text-rose-700" :
                                inv.severity === "high" ? "bg-orange-100 border-orange-200 text-orange-700" :
                                "bg-zinc-100 border-zinc-200 text-zinc-700"
                              )}>
                                {inv.severity}
                              </span>
                            </td>
                            <td className="py-3 pr-4 capitalize text-amber-800">{inv.status.replace(/_/g, " ")}</td>
                            <td className="py-3 text-amber-700">
                              {inv.linkedBatches?.length ?? 0}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>

            <section className="space-y-4">
              <PerformanceHeatmap data={heatmapPoints} />
              
              <header>
                <h2 className="text-xl font-semibold tracking-tight text-zinc-900">
                  Performance Over Time
                </h2>
                <p className="text-sm text-zinc-600">
                  Chart-ready time-series datasets prepared for future chart integrations.
                </p>
              </header>
              <div className="grid gap-4 lg:grid-cols-2">
                <RoiTrend
                  monthlySeries={chartData.monthlySeries}
                  cumulativeProfitLossSeries={chartData.cumulativeProfitLossSeries}
                  recoveryRateTrendSeries={chartData.recoveryRateTrendSeries}
                />
                <MetalPerformanceTrend metalTypeSeries={chartData.metalTypeSeries} />
              </div>
            </section>

            <MonthlySummary rows={monthlySummary} />

            <MetalBreakdownTable rows={metalBreakdown} />
          </>
        )}
      </section>
    </main>
  );
}


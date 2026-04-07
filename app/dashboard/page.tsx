export const dynamic = "force-dynamic";

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
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
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
  if (value == null) return "n/a";
  return `${value >= 0 ? "+" : ""}${fmt2(value)}%`;
}

function buildSparklinePath(values: number[], width: number, height: number): string {
  if (values.length === 0) return "";
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
    case "sma": return "SMA";
    case "ema": return "EMA";
    case "regression": return "Regression";
    case "statistical": return "Statistical";
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
  
  const batchService = await getBatchService(isMockRequested);
  const lotService = await getLotService(isMockRequested);
  const billingService = await getBillingService(isMockRequested);
  const priceService = await getPriceService(isMockRequested).catch((e) => { console.error("PriceService Init Failed", e); return null; });
  const investigationService = await getInvestigationService(isMockRequested).catch((e) => { console.error("InvestigationService Init Failed", e); return null; });

  const [billing, marketOverview, forecastOverview, recentInvestigations, rawBatches, rawLots] = await Promise.all([
    billingService.getBillingSummary(user.activeTeamId).catch(() => ({ record: {} as any, teamId: user.activeTeamId, plan: "free" as const, status: "active" as const, definition: { label: "Free", batchLimit: 10, exportsEnabled: false, comparisonEnabled: false, prioritySupport: false, customLimits: false }, batchCount: 0, remainingBatches: 10, canCreateBatch: true, canExport: false, canCompare: false })),
    priceService ? priceService.getMarketOverview().catch(() => []) : Promise.resolve([]),
    priceService ? priceService.getForecastOverview().catch(() => []) : Promise.resolve([]),
    investigationService ? investigationService.listInvestigations(user.activeTeamId).catch((err: any) => { console.warn("Investigations failed:", err?.message); return []; }) : Promise.resolve([]),
    batchService.listBatches(user.id).catch(() => []),
    lotService.listLots(user.activeTeamId).catch(() => []),
  ]);

  const filters = parseFilterState(params);

  let batches: BatchApiData[] = [];
  let fetchError: string | null = null;

  try {
    const parsedBatches: BatchApiData[] = [];
    for (const rawBatch of (rawBatches || [])) {
      const parsed = batchApiResponseSchema.safeParse({ ok: true, data: rawBatch });
      if (!parsed.success || !parsed.data.ok || !parsed.data.data) {
        fetchError = "Failed to parse dashboard data. Check schema compatibility.";
        break;
      }
      parsedBatches.push(parsed.data.data);
    }
    batches = parsedBatches;
  } catch (err: unknown) {
    fetchError = "Failed to load dashboard data. Check your database connection.";
  }

  const filteredBatches: FilteredBatchForCharts[] = batches
    .map((batch) => {
      const batchDate = batch.createdAt ? new Date(batch.createdAt) : null;
      if (filters.startDate && batchDate && batchDate < new Date(`${filters.startDate}T00:00:00.000Z`)) return null;
      if (filters.endDate && batchDate && batchDate > new Date(`${filters.endDate}T23:59:59.999Z`)) return null;

      const filteredItems = (batch.items ?? []).filter((item) => {
        if (filters.metalTypes.length > 0 && !filters.metalTypes.includes(item.metalType)) return false;
        if (filters.minPurity != null && item.purityPct < filters.minPurity) return false;
        if (filters.maxPurity != null && item.purityPct > filters.maxPurity) return false;
        if (filters.minRecoveryRate != null && item.recoveryRatePct < filters.minRecoveryRate) return false;
        if (filters.maxRecoveryRate != null && item.recoveryRatePct > filters.maxRecoveryRate) return false;
        return true;
      });

      return filteredItems.length > 0 ? { batch, items: filteredItems } : null;
    })
    .filter((entry): entry is FilteredBatchForCharts => entry !== null);

  const items = filteredBatches.flatMap((entry) => entry.items);
  const totalBatches = filteredBatches.length;
  const totalLots = (rawLots || []).length;
  const totalRecoveredMetal = items.reduce((sum, item) => sum + item.recoveredMetalWeight, 0);
  const totalGrossValue = items.reduce((sum, item) => sum + item.grossValue, 0) + (rawLots || []).reduce((sum: number, lot: any) => sum + Number(lot.roi?.revenue ?? 0), 0);
  const totalNetValue = items.reduce((sum, item) => sum + item.netValue, 0) + (rawLots || []).reduce((sum: number, lot: any) => sum + Number(lot.roi?.revenue ?? 0), 0);
  const totalProfitLoss = items.reduce((sum, item) => sum + item.profitLoss, 0) + (rawLots || []).reduce((sum: number, lot: any) => sum + Number(lot.roi?.profit ?? 0), 0);
  const marginValues = [...items.map(i => i.marginPct), ...(rawLots || []).map((l: any) => l.roi?.marginPct ? Number(l.roi.marginPct) : null)].filter((m): m is number => m !== null);
  const averageMarginPct = marginValues.length > 0 ? marginValues.reduce((s, m) => s + m, 0) / marginValues.length : null;

  const metalMap = new Map<string, MetalBreakdownRow>();
  for (const item of items) {
    const current = metalMap.get(item.metalType) ?? { metalType: item.metalType, itemCount: 0, recoveredMetalWeight: 0, grossValue: 0, netValue: 0, profitLoss: 0 };
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
    const batchNet = entry.items.reduce((sum, item) => sum + item.netValue, 0);
    const batchProfitLoss = entry.items.reduce((sum, item) => sum + item.profitLoss, 0);
    for (const tag of (entry.batch.tags ?? [])) {
      const current = tagSummaryMap.get(tag.id) ?? { id: tag.id, name: tag.name, color: tag.color ?? null, batchCount: 0, totalNetValue: 0, totalProfitLoss: 0 };
      current.batchCount += 1;
      current.totalNetValue += batchNet;
      current.totalProfitLoss += batchProfitLoss;
      tagSummaryMap.set(tag.id, current);
    }
  }
  const tagSummary = Array.from(tagSummaryMap.values()).sort((a, b) => b.batchCount !== a.batchCount ? b.batchCount - a.batchCount : b.totalNetValue - a.totalNetValue);

  const chartData = buildChartData({ filteredBatches, lots: rawLots || [] });
  const monthlySummary: MonthlySummaryRow[] = (chartData?.monthlySeries || []).map((p) => ({ month: p.period, totalRecoveredMetal: p.recoveredMetalWeight, totalNetValue: p.netValue, totalProfitLoss: p.profitLoss, averageMarginPct: p.averageMarginPct })).sort((a, b) => b.month.localeCompare(a.month));
  const heatmapPoints: HeatmapPoint[] = filteredBatches.map((entry) => ({ id: entry.batch.id, netValue: entry.items.reduce((s, i) => s + i.netValue, 0), marginPct: entry.items.reduce((s, i) => s + i.netValue, 0) > 0 ? (entry.items.reduce((s, i) => s + i.profitLoss, 0) / entry.items.reduce((s, i) => s + i.netValue, 0)) * 100 : 0, confidenceScore: entry.batch.auditSnapshot?.confidence?.score ?? 100, metalType: entry.items[0]?.metalType ?? "unknown", isDegraded: entry.batch.auditSnapshot?.confidence?.degradedMode ?? false }));

  return (
    <main className="min-h-screen bg-zinc-950 px-4 py-8 sm:px-6 lg:px-8 selection:bg-cyan-500/30 text-white">
      <section className="mx-auto w-full max-w-7xl space-y-8">
        <header className="relative overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6 sm:p-8 backdrop-blur-sm shadow-xl">
          <div className="absolute right-0 top-0 -mr-20 -mt-20 h-64 w-64 rounded-full bg-cyan-500/5 blur-3xl" />
          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-3xl font-bold tracking-tight text-white italic">Operational Cockpit</h1>
                <div className="flex items-center gap-2">
                  <span className="rounded-full border border-zinc-700 bg-zinc-800 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400">{user.activeTeamName}</span>
                  <span className="rounded-full border border-cyan-500/30 bg-cyan-500/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-cyan-400">{billing.definition.label}</span>
                </div>
              </div>
              <p className="max-w-2xl text-sm text-zinc-400 italic">Deterministic performance monitoring for industrial precious metal recovery. Tracking {billing.batchCount} validated batches.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link href="/calculator"><Button size="lg" className="shadow-lg shadow-cyan-500/10 hover:bg-cyan-500 transition-all">Initialize Calculation</Button></Link>
              <Link href="/batches"><Button variant="outline" size="lg" className="border-zinc-700 bg-zinc-800/50 text-white hover:bg-zinc-800">Batch Archive</Button></Link>
              <Link href="/audit/verify"><Button variant="outline" size="lg" className="border-violet-500/30 bg-violet-500/10 text-violet-300 hover:bg-violet-500/20">Verify Integrity</Button></Link>
            </div>
          </div>
        </header>

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2"><AlphaHealth /></div>
          <div className="flex flex-col justify-center">
            {(() => {
              const snapshot = Sentinel.getSnapshot();
              let status: "active" | "degraded" | "mocking" | "fallback" = "active";
              if (snapshot.fallbackTriggerCount > 0) status = "fallback";
              else if (snapshot.degradedModeCount > 0 || snapshot.stalePriceUsage > 0) status = "degraded";
              else if (isMockRequested) status = "mocking";
              return <TrustModeBanner status={status} fallbackCount={snapshot.fallbackTriggerCount} staleCount={snapshot.stalePriceUsage} />;
            })()}
          </div>
        </div>

        <FilterBar startDate={filters.startDate} endDate={filters.endDate} selectedMetalTypes={filters.metalTypes} minPurity={filters.minPurity} maxPurity={filters.maxPurity} minRecoveryRate={filters.minRecoveryRate} maxRecoveryRate={filters.maxRecoveryRate} metalTypeOptions={[...targetMetalOptions]} />

        {fetchError ? (
          <Card className="border-rose-900 bg-rose-950/20"><CardContent className="py-6"><p className="text-sm text-rose-400 font-medium">{fetchError}</p></CardContent></Card>
        ) : (filteredBatches.length === 0 && (rawLots || []).length === 0) ? (
          <Card className="border-zinc-800 bg-zinc-900/50"><CardHeader><CardTitle className="text-white">No Matching Analytics Data</CardTitle><CardDescription className="text-zinc-500 italic">Adjust filters or save new calculations to see cockpit metrics.</CardDescription></CardHeader><CardContent><div className="flex items-center gap-3"><Link href="/calculator"><Button className="bg-zinc-100 text-zinc-900 hover:bg-zinc-200">New Calculation</Button></Link><Link href="/batches"><Button variant="outline" className="border-zinc-700 text-white">View Batches</Button></Link></div></CardContent></Card>
        ) : (
          <div className="space-y-8">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {(() => {
                const snapshot = Sentinel.getSnapshot();
                const systemConfidence = snapshot.fallbackTriggerCount > 0 ? 35 : (snapshot.degradedModeCount > 0 ? 70 : 100);
                return (
                  <>
                    <DashboardMetricCard label="Total Batches" value={String(totalBatches)} confidence={systemConfidence} />
                    <DashboardMetricCard label="Active Lots" value={String(totalLots)} tone="positive" confidence={systemConfidence} />
                    <DashboardMetricCard label="Metal Recovered" value={`${fmt4(totalRecoveredMetal)} g`} confidence={systemConfidence} />
                    <DashboardMetricCard label="Gross Value" value={`$${fmt2(totalGrossValue)}`} confidence={systemConfidence} />
                    <DashboardMetricCard label="Net Value" value={`$${fmt2(totalNetValue)}`} confidence={systemConfidence} />
                    <DashboardMetricCard label="Profit / Loss" value={`${totalProfitLoss >= 0 ? "+" : ""}$${fmt2(totalProfitLoss)}`} tone={totalProfitLoss >= 0 ? "positive" : "negative"} confidence={systemConfidence} />
                    <DashboardMetricCard label="Avg Margin %" value={averageMarginPct != null ? `${fmt2(averageMarginPct)}%` : "n/a"} confidence={systemConfidence} />
                  </>
                );
              })()}
            </div>

            <div className="grid gap-8 lg:grid-cols-2">
              <Card className="border-zinc-800 bg-zinc-900/30 backdrop-blur-sm"><CardHeader><div className="flex items-center justify-between"><CardTitle className="text-white font-bold tracking-tight">Market Overview</CardTitle><ClassificationLabel type="canonical" /></div></CardHeader><CardContent><div className="overflow-x-auto text-zinc-300"><table className="w-full text-sm"><thead><tr className="border-b border-zinc-800 text-left text-xs text-zinc-500 uppercase tracking-widest"><th className="pb-4 pr-4">Metal</th><th className="pb-4 pr-4">Status</th><th className="pb-4 pr-4">Spot ($/oz)</th><th className="pb-4 pr-4">7D Chg</th><th className="pb-4 pr-4">30D Chg</th><th className="pb-4">Vol</th></tr></thead><tbody className="divide-y divide-zinc-800">{marketOverview.map((row) => (<tr key={row.metalType} className="hover:bg-zinc-800/20 transition-colors"><td className="py-4 pr-4 capitalize font-bold text-white">{row.metalType}</td><td className="py-4 pr-4"><span className={cn("rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest border", row.status === "live" ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400" : row.status === "stale" ? "border-amber-500/30 bg-amber-500/10 text-amber-400" : "border-rose-500/30 bg-rose-500/10 text-rose-400")}>{row.status ?? "unknown"}</span></td><td className="py-4 pr-4 font-medium text-zinc-100">{row.latestPrice != null ? `$${fmt2(row.latestPrice)}` : "n/a"}</td><td className={`py-4 pr-4 font-bold ${(row.change7dPct ?? 0) >= 0 ? "text-emerald-400" : "text-rose-400"}`}>{fmtSignedPct(row.change7dPct)}</td><td className={`py-4 pr-4 font-bold ${(row.change30dPct ?? 0) >= 0 ? "text-emerald-400" : "text-rose-400"}`}>{fmtSignedPct(row.change30dPct)}</td><td className="py-4"><span className={cn("rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase", row.volatilityIndicator === "high" ? "border-rose-500/30 text-rose-400" : row.volatilityIndicator === "moderate" ? "border-amber-500/30 text-amber-400" : "border-emerald-500/30 text-emerald-400")}>{row.volatilityIndicator}</span></td></tr>))}</tbody></table></div></CardContent></Card>
              <Card className="border-zinc-800 bg-zinc-900/30 backdrop-blur-sm"><CardHeader><div className="flex items-center justify-between"><CardTitle className="text-white font-bold tracking-tight">Focus Tags</CardTitle><ClassificationLabel type="canonical" /></div></CardHeader><CardContent><div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b border-zinc-800 text-left text-xs text-zinc-500 uppercase tracking-widest"><th className="pb-4 pr-4">Tag</th><th className="pb-4 pr-4">Batches</th><th className="pb-4 pr-4">Net Value</th><th className="pb-4">ROI</th></tr></thead><tbody className="divide-y divide-zinc-800">{tagSummary.slice(0, 6).map((row) => (<tr key={row.id} className="hover:bg-zinc-800/20 transition-colors"><td className="py-4 pr-4"><span className="rounded-full border border-zinc-700 bg-zinc-800 px-2 py-0.5 text-xs font-bold text-zinc-300">{row.name}</span></td><td className="py-4 pr-4 text-zinc-400">{row.batchCount}</td><td className="py-4 pr-4 text-zinc-100 font-bold">${fmt2(row.totalNetValue)}</td><td className={`py-4 font-bold ${row.totalProfitLoss >= 0 ? "text-emerald-400" : "text-rose-400"}`}>{row.totalProfitLoss >= 0 ? "+" : ""}${fmt2(row.totalProfitLoss)}</td></tr>))}</tbody></table></div></CardContent></Card>
            </div>

            <Card className="border-zinc-800 bg-zinc-900/30 backdrop-blur-sm"><CardHeader><div className="flex items-center justify-between"><CardTitle className="text-white font-bold tracking-tight">Forecast Engine</CardTitle><ClassificationLabel type="statistical" /></div></CardHeader><CardContent><div className="overflow-x-auto text-zinc-300"><table className="w-full text-sm"><thead><tr className="border-b border-zinc-800 text-left text-xs text-zinc-500 uppercase tracking-widest"><th className="pb-4 pr-4">Metal</th><th className="pb-4 pr-4">Method</th><th className="pb-4 pr-4">Projected</th><th className="pb-4 pr-4">Confidence</th><th className="pb-4 text-right">Trend</th></tr></thead><tbody className="divide-y divide-zinc-800">{forecastOverview.map((row) => { const trendPath = buildSparklinePath(row.curve.map(p => p.projectedPriceUsdPerUnit), 100, 24); return (<tr key={row.metalType} className="hover:bg-zinc-800/20 transition-colors"><td className="py-4 pr-4 capitalize font-bold text-white">{row.metalType}</td><td className="py-4 pr-4 text-zinc-500 uppercase font-bold text-[10px]">{formatProjectionMethod(row.method as ProjectionMethod)}</td><td className="py-4 pr-4 font-bold text-cyan-400">{row.projectedPrice != null ? `$${fmt2(row.projectedPrice)}` : "n/a"}</td><td className="py-4 pr-4"><span className={cn("rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase", row.confidenceIndicator === "high" ? "border-emerald-500/30 text-emerald-400" : "border-rose-500/30 text-rose-400")}>{row.confidenceIndicator}</span></td><td className="py-4 text-right">{trendPath ? (<svg viewBox="0 0 100 24" className="h-6 w-24 ml-auto"><path d={trendPath} fill="none" stroke="currentColor" strokeWidth="2" className="text-cyan-500/50" /></svg>) : (<span className="text-zinc-600">n/a</span>)}</td></tr>); })}</tbody></table></div></CardContent></Card>

            <div className="grid gap-8 lg:grid-cols-2">
              <Card className="border-amber-900/30 bg-amber-900/5"><CardHeader><div className="flex items-center justify-between"><CardTitle className="text-amber-200 font-bold">Investigation Queue</CardTitle><span className="rounded-full bg-amber-500/20 px-3 py-1 text-[10px] font-bold text-amber-400 uppercase tracking-widest">{recentInvestigations.filter((i: any) => i.status !== "resolved").length} Active Discrepancies</span></div></CardHeader><CardContent><div className="overflow-x-auto"><table className="w-full text-xs text-amber-100"><thead><tr className="border-b border-amber-900/50 text-left text-zinc-500 uppercase tracking-widest"><th className="pb-4 pr-4">Case Title</th><th className="pb-4 pr-4">Severity</th><th className="pb-4">Status</th></tr></thead><tbody className="divide-y divide-amber-900/30">{recentInvestigations.slice(0, 4).map((i: any) => (<tr key={i.id} className="hover:bg-amber-900/10"><td className="py-4 pr-4 font-bold"><Link href={`/investigations/${i.id}`} className="hover:underline">{i.title}</Link></td><td className="py-4 pr-4"><span className={cn("rounded-full px-2 py-0.5 text-[8px] font-bold uppercase border", i.severity === "critical" ? "border-rose-500/50 bg-rose-500/10 text-rose-400" : "border-amber-500/50 bg-amber-500/10 text-amber-400")}>{i.severity}</span></td><td className="py-4 capitalize italic text-amber-400/70">{i.status.replace(/_/g, " ")}</td></tr>))}</tbody></table></div></CardContent></Card>
              <Card className="border-zinc-800 bg-zinc-900/30 backdrop-blur-sm"><CardHeader><CardTitle className="text-white">Recent Artifacts</CardTitle></CardHeader><CardContent><p className="text-xs text-zinc-500 italic mb-4 text-center">No reports generated in this filter window.</p></CardContent></Card>
            </div>

            <section className="space-y-6 pt-4 border-t border-zinc-900">
              <div className="flex items-center justify-between"><h2 className="text-2xl font-bold italic tracking-tight text-white uppercase tracking-widest text-xs opacity-50">Industrial Analytics Suite</h2><div className="h-px flex-1 bg-zinc-900 mx-8 hidden lg:block" /></div>
              <PerformanceHeatmap data={heatmapPoints} />
              <div className="grid gap-6 lg:grid-cols-2">
                <RoiTrend monthlySeries={chartData.monthlySeries} cumulativeProfitLossSeries={chartData.cumulativeProfitLossSeries} recoveryRateTrendSeries={chartData.recoveryRateTrendSeries} />
                <MetalPerformanceTrend metalTypeSeries={chartData.metalTypeSeries} />
              </div>
              <MonthlySummary rows={monthlySummary} />
              <MetalBreakdownTable rows={metalBreakdown} />
            </section>
          </div>
        )}
      </section>
    </main>
  );
}

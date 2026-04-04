import Link from "next/link";
import { notFound } from "next/navigation";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ActionToast } from "@/components/ui/action-toast";
import { requireCurrentUser } from "@/lib/auth";
import { getBatchService, getBillingService } from "@/lib/mock-data-gate";
import {
  batchApiResponseSchema,
  calculatorResultSchema,
  type BatchApiData,
} from "@/lib/validations/calculator";
import { AuditTraceView } from "@/components/dashboard/audit-trace-view";
import { SettlementCertificationCard } from "@/components/batches/settlement-certification-card";
import { type CalculationSnapshot } from "@/lib/roi";
import { getBatchVolatilityForecast } from "@/lib/metals/predictive-service";
import { AlertCircle, TrendingUp, TrendingDown, Minus } from "lucide-react";

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

function fmtPct(value: number | null): string {
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
      const cmd = index === 0 ? "M" : "L";
      return `${cmd}${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(" ");
}

function formatProjectionMethod(method: "sma" | "ema" | "regression"): string {
  switch (method) {
    case "sma":
      return "SMA";
    case "ema":
      return "EMA";
    case "regression":
      return "Regression";
  }
}

type Props = {
  params: Promise<{ batchId: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function readToastMessage(toast: string | null): { message: string; tone: "success" | "error" } | null {
  if (toast === "updated") {
    return { message: "Batch updated successfully.", tone: "success" };
  }

  if (toast === "duplicated") {
    return { message: "Batch duplicated successfully.", tone: "success" };
  }

  if (toast === "duplicate-limit") {
    return { message: "Free plan batch limit reached. Upgrade to duplicate this batch.", tone: "error" };
  }

  if (toast === "duplicate-error") {
    return { message: "Failed to duplicate batch.", tone: "error" };
  }

  return null;
}

const LockIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
);

export default async function BatchDetailPage({ params, searchParams }: Props) {
  const user = await requireCurrentUser();
  const searchParamsResolved = (await searchParams) ?? {};
  const isMockRequested = searchParamsResolved.mock === "true";
  
  const batchService = await getBatchService(isMockRequested);
  const billingService = await getBillingService(isMockRequested);

  const billing = await billingService.getBillingSummary(user.activeTeamId);
  const { batchId } = await params;
  const toastParam = searchParamsResolved.toast;
  const toastCode = typeof toastParam === "string" ? toastParam : null;
  const toastMessage = readToastMessage(toastCode);
  const canDuplicate = billing.remainingBatches === null || billing.remainingBatches > 0;
  const exportCsvHref = `/api/batches/${batchId}/export/csv${isMockRequested ? "?mock=true" : ""}`;
  const exportPdfHref = `/api/batches/${batchId}/export/pdf${isMockRequested ? "?mock=true" : ""}`;
  const meltReportHref = `/api/batches/${batchId}/report/melt${isMockRequested ? "?mock=true" : ""}`;
  const settlementReportHref = `/api/batches/${batchId}/report/settlement${isMockRequested ? "?mock=true" : ""}`;
  const assayReportHref = `/api/batches/${batchId}/report/assay${isMockRequested ? "?mock=true" : ""}`;
  let batch: BatchApiData | null = null;
  let fetchError: string | null = null;

  try {
    const rawBatch = await batchService.getBatchById(batchId, user.id);

    if (!rawBatch) {
      notFound();
    }

    const parsed = batchApiResponseSchema.safeParse({ ok: true, data: rawBatch });
    if (!parsed.success || !parsed.data.ok || !parsed.data.data) {
      fetchError = "Failed to parse batch details. Check schema compatibility.";
    } else {
      batch = parsed.data.data;
    }
  } catch (err: unknown) {
    console.error("Batch details fetch error:", err);
    fetchError = `Failed to load batch details. ${isMockRequested ? "Mock data is also unavailable." : "Check your database connection or use ?mock=true."}`;
  }

  if (fetchError) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-zinc-100 via-white to-zinc-100 px-4 py-10 sm:px-6 lg:px-8">
        <section className="mx-auto w-full max-w-4xl space-y-6">
          <header className="space-y-2">
            <Link href={isMockRequested ? "/batches?mock=true" : "/batches"} className="text-sm text-zinc-500 hover:text-zinc-900">
              ← Back to Batches
            </Link>
            <h1 className="text-3xl font-semibold tracking-tight text-zinc-900">Batch Detail</h1>
          </header>
          <Card>
            <CardContent>
              <p className="text-sm text-rose-600">{fetchError}</p>
              <div className="mt-4">
                <Link
                  href="/calculator"
                  className="rounded-md bg-zinc-900 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-700"
                >
                  New Calculation
                </Link>
              </div>
            </CardContent>
          </Card>
        </section>
      </main>
    );
  }

  if (!batch) notFound();
 
  const primaryMetal = batch.calculatorInput?.metalType ?? "gold";
  const predictiveRisk = await getBatchVolatilityForecast(batchId, user.id, primaryMetal);

  const { snapshot, calculatorInput, calculatorOutput, auditSnapshot } = batch;
  const items = batch.items ?? [];
  const totalGrossValue = batch.totalGrossValue ?? 0;
  const totalNetValue = batch.totalNetValue ?? 0;
  const totalProfitLoss = batch.totalProfitLoss ?? 0;
  const historicalNetValue = batch.historicalNetValue ?? totalNetValue;
  const historicalProfitLoss = batch.historicalProfitLoss ?? totalProfitLoss;
  const deltaSinceBatch = batch.deltaSinceBatch ?? 0;
  const priceContext = batch.priceContext;
  const forecast = batch.forecast;
  const priceHistory = priceContext?.history ?? [];
  const sparklineValues = priceHistory.map((point) => point.priceUsdPerUnit);
  const sparklinePath = buildSparklinePath(sparklineValues, 320, 90);
  const forecastCurveValues = (forecast?.curve ?? []).map((point) => point.projectedPriceUsdPerUnit);
  const forecastCurvePath = buildSparklinePath(forecastCurveValues, 320, 90);
  const createdAt = batch.createdAt ? new Date(batch.createdAt) : null;

  const validatedCalculatorOutput = calculatorOutput
    ? calculatorResultSchema.safeParse(calculatorOutput)
    : null;
  const safeCalculatorOutput = validatedCalculatorOutput?.success
    ? validatedCalculatorOutput.data
    : null;

  return (
    <main className="min-h-screen bg-gradient-to-b from-zinc-100 via-white to-zinc-100 px-4 py-10 sm:px-6 lg:px-8">
      {toastMessage ? <ActionToast message={toastMessage.message} tone={toastMessage.tone} /> : null}
      <section className="mx-auto w-full max-w-4xl space-y-6">
        <header className="space-y-2">
          <Link
            href={isMockRequested ? "/batches?mock=true" : "/batches"}
            className="text-sm text-zinc-500 hover:text-zinc-900"
          >
            ← Back to Batches
          </Link>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h1 className="text-3xl font-semibold tracking-tight text-zinc-900">Batch Detail</h1>
            <div className="flex flex-wrap items-center gap-2">
              {!batch.certifiedAt ? (
                <Link
                  href={`/batches/${batchId}/edit${isMockRequested ? "?mock=true" : ""}`}
                  className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-xs font-medium text-zinc-900 hover:bg-zinc-50"
                >
                  Edit Batch
                </Link>
              ) : (
                <Badge variant="success" className="h-8 px-4 flex items-center gap-1.5 uppercase tracking-wider">
                  <LockIcon className="h-3 w-3" /> Locked for Settlement
                </Badge>
              )}

              <form action={`/api/batches/${batchId}/duplicate${isMockRequested ? "?mock=true" : ""}`} method="POST">
                <button
                  type="submit"
                  disabled={!canDuplicate}
                  className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-xs font-medium text-zinc-900 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Duplicate Batch
                </button>
              </form>

              {billing.canExport ? (
                <>
                  <Link
                    href={exportCsvHref}
                    className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-xs font-medium text-zinc-900 hover:bg-zinc-50"
                  >
                    Export CSV
                  </Link>
                  <Link
                    href={exportPdfHref}
                    className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-xs font-medium text-zinc-900 hover:bg-zinc-50"
                  >
                    Export PDF
                  </Link>
                </>
              ) : (
                <>
                  <p className="text-xs font-medium text-amber-700">Exports require Pro.</p>
                  <Link
                    href="/billing"
                    className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800 hover:bg-amber-100"
                  >
                    Upgrade
                  </Link>
                </>
              )}
            </div>
          </div>
          <p className="font-mono text-sm text-zinc-500">{batch.id}</p>
          {!canDuplicate ? (
            <p className="text-xs font-medium text-amber-700">
              Free plan limit reached. Upgrade to duplicate this batch.
            </p>
          ) : null}
        </header>

        {/* Phase 19: Industrial Settlement Certification */}
        <SettlementCertificationCard 
          batchId={batchId} 
          certifiedAt={batch.certifiedAt ?? null} 
          settlementHash={batch.settlementHash ?? null} 
          isMockRequested={isMockRequested}
          operatorMetadata={(batch.auditSnapshot as Record<string, unknown>)?.certificationMetadata as { ip?: string; userAgent?: string } | undefined}
        />
 
        {/* Phase 38: Predictive Risk & Volatility */}
        <section className="grid gap-6 lg:grid-cols-2">
          <Card className="border-l-4 border-l-violet-500 shadow-md">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-bold text-zinc-900">Predictive Performance</CardTitle>
                <Badge variant={predictiveRisk.riskRating === "low" ? "secondary" : "destructive"} className="px-3 uppercase">
                  {predictiveRisk.riskRating} Risk
                </Badge>
              </div>
              <CardDescription>7-day market volatility forecast for {primaryMetal}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Expected High</p>
                  <p className="text-xl font-bold text-zinc-900">${fmt2(predictiveRisk.expectedRangeHigh)}</p>
                </div>
                <div className="space-y-1 text-right">
                  <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Expected Low</p>
                  <p className="text-xl font-bold text-zinc-900">${fmt2(predictiveRisk.expectedRangeLow)}</p>
                </div>
              </div>
              
              <div className="mt-6 flex items-center justify-between rounded-lg bg-zinc-50 p-3">
                <div className="flex items-center gap-2">
                  {predictiveRisk.projected7DayTrend === "bullish" ? (
                    <TrendingUp className="h-5 w-5 text-emerald-600" />
                  ) : predictiveRisk.projected7DayTrend === "bearish" ? (
                    <TrendingDown className="h-5 w-5 text-rose-600" />
                  ) : (
                    <Minus className="h-5 w-5 text-zinc-400" />
                  )}
                  <div className="text-sm">
                    <span className="font-semibold text-zinc-900 capitalize">{predictiveRisk.projected7DayTrend}</span>
                    <span className="ml-1 text-zinc-500">7-day outlook</span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs font-medium text-zinc-500">Confidence Score</div>
                  <div className="text-sm font-bold text-zinc-900">{Math.round(predictiveRisk.confidenceScore)}%</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-zinc-900 text-white shadow-xl">
            <CardHeader>
              <div className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-violet-400" />
                <CardTitle className="text-lg font-bold">Risk Assessment</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-relaxed text-zinc-400">
                Market volatility for <span className="text-white font-medium capitalize">{primaryMetal}</span> is currently 
                <span className="text-white font-bold mx-1">{fmt2(predictiveRisk.volatilityPct)}%</span>. 
                {predictiveRisk.riskRating === "low" 
                  ? " The settlement window appears stable with minimal projected variance." 
                  : " Caution is advised for immediate settlement as market fluctuations may impact net recovery value."}
              </p>
              <div className="mt-4 pt-4 border-t border-zinc-800">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-zinc-500 font-medium">ANALYTICS ENGINE</span>
                  <span className="text-zinc-400">v1.1.0-PRED</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Batch metadata */}
        <Card>
          <CardHeader>
            <CardTitle>Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <div>
                <dt className="text-xs text-zinc-500">Status</dt>
                <dd className="mt-0.5 text-sm font-medium text-zinc-900 capitalize">{batch.status}</dd>
              </div>
              <div>
                <dt className="text-xs text-zinc-500">Created</dt>
                <dd className="mt-0.5 text-sm font-medium text-zinc-900">
                  {createdAt
                    ? createdAt.toLocaleString("en-US", {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })
                    : "Unknown time"}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-zinc-500">Items</dt>
                <dd className="mt-0.5 text-sm font-medium text-zinc-900">{items.length}</dd>
              </div>
              <div>
                <dt className="text-xs text-zinc-500">Customer</dt>
                <dd className="mt-0.5 text-sm font-medium text-zinc-900">{batch.customerName ?? "n/a"}</dd>
              </div>
              <div>
                <dt className="text-xs text-zinc-500">Customer Email</dt>
                <dd className="mt-0.5 text-sm font-medium text-zinc-900">{batch.customerEmail ?? "n/a"}</dd>
              </div>
              <div>
                <dt className="text-xs text-zinc-500">Customer Reference</dt>
                <dd className="mt-0.5 text-sm font-medium text-zinc-900">{batch.customerReference ?? "n/a"}</dd>
              </div>
              <div>
                <dt className="text-xs text-zinc-500">Total Gross Value</dt>
                <dd className="mt-0.5 text-sm font-medium text-zinc-900">${fmt2(totalGrossValue)}</dd>
              </div>
              <div>
                <dt className="text-xs text-zinc-500">Total Net Value</dt>
                <dd className="mt-0.5 text-sm font-medium text-zinc-900">${fmt2(totalNetValue)}</dd>
              </div>
              <div>
                <dt className="text-xs text-zinc-500">Total Profit / Loss</dt>
                <dd
                  className={`mt-0.5 text-sm font-medium ${
                    totalProfitLoss >= 0 ? "text-emerald-700" : "text-rose-600"
                  }`}
                >
                  {totalProfitLoss >= 0 ? "+" : ""}${fmt2(totalProfitLoss)}
                </dd>
              </div>
              {batch.formulaVersionId ? (
                <div>
                  <dt className="text-xs text-zinc-500">Formula Version ID</dt>
                  <dd className="mt-0.5 font-mono text-sm text-zinc-900">{batch.formulaVersionId}</dd>
                </div>
              ) : null}
              {batch.priceSnapshotId ? (
                <div>
                  <dt className="text-xs text-zinc-500">Snapshot ID</dt>
                  <dd className="mt-0.5 font-mono text-sm text-zinc-900">{batch.priceSnapshotId}</dd>
                </div>
              ) : null}
            </dl>
          </CardContent>
        </Card>

        {/* Price snapshot */}
        {snapshot ? (
          <Card>
            <CardHeader>
              <CardTitle>Price Snapshot</CardTitle>
              <CardDescription>
                Spot prices at the time of calculation · source: {snapshot.source}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {(
                  [
                    ["Gold", snapshot.goldUsdPerOz],
                    ["Silver", snapshot.silverUsdPerOz],
                    ["Platinum", snapshot.platinumUsdPerOz],
                    ["Palladium", snapshot.palladiumUsdPerOz],
                  ] as [string, number][]
                ).map(([label, price]) => (
                  <div key={label}>
                    <dt className="text-xs text-zinc-500">{label} ($/oz)</dt>
                    <dd className="mt-0.5 text-sm font-medium text-zinc-900">${fmt2(price)}</dd>
                  </div>
                ))}
              </dl>
            </CardContent>
          </Card>
        ) : null}

        {/* Historical pricing context */}
        {priceContext ? (
          <Card>
            <CardHeader>
              <CardTitle>Price History</CardTitle>
              <CardDescription>
                Server-side historical context for
                {" "}
                {priceContext.metalType ? (
                  <span className="capitalize">{priceContext.metalType}</span>
                ) : (
                  "this batch"
                )}
                .
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {sparklinePath ? (
                <div className="rounded-lg border border-zinc-200 bg-white p-3">
                  <svg viewBox="0 0 320 90" className="h-24 w-full" role="img" aria-label="Historical metal prices">
                    <path d={sparklinePath} fill="none" stroke="currentColor" strokeWidth="2" className="text-cyan-600" />
                  </svg>
                </div>
              ) : (
                <p className="text-sm text-zinc-500">No historical points available yet for this metal type.</p>
              )}

              <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <div>
                  <dt className="text-xs text-zinc-500">Price at Batch Timestamp</dt>
                  <dd className="mt-0.5 text-sm font-medium text-zinc-900">
                    {priceContext.priceAtBatchTimestamp != null ? `$${fmt2(priceContext.priceAtBatchTimestamp)}` : "n/a"}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-zinc-500">Current Price</dt>
                  <dd className="mt-0.5 text-sm font-medium text-zinc-900">
                    {priceContext.currentPrice != null ? `$${fmt2(priceContext.currentPrice)}` : "n/a"}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-zinc-500">Price Delta</dt>
                  <dd className={`mt-0.5 text-sm font-medium ${
                    (priceContext.deltaUsdPerUnit ?? 0) >= 0 ? "text-emerald-700" : "text-rose-600"
                  }`}>
                    {priceContext.deltaUsdPerUnit != null
                      ? `${priceContext.deltaUsdPerUnit >= 0 ? "+" : ""}$${fmt2(priceContext.deltaUsdPerUnit)}`
                      : "n/a"}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-zinc-500">Historical Net Value</dt>
                  <dd className="mt-0.5 text-sm font-medium text-zinc-900">${fmt2(historicalNetValue)}</dd>
                </div>
                <div>
                  <dt className="text-xs text-zinc-500">Historical Profit / Loss</dt>
                  <dd className={`mt-0.5 text-sm font-medium ${historicalProfitLoss >= 0 ? "text-emerald-700" : "text-rose-600"}`}>
                    {historicalProfitLoss >= 0 ? "+" : ""}${fmt2(historicalProfitLoss)}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-zinc-500">Delta Since Batch</dt>
                  <dd className={`mt-0.5 text-sm font-medium ${deltaSinceBatch >= 0 ? "text-emerald-700" : "text-rose-600"}`}>
                    {deltaSinceBatch >= 0 ? "+" : ""}${fmt2(deltaSinceBatch)}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-zinc-500">ROI at Batch Timestamp</dt>
                  <dd className="mt-0.5 text-sm font-medium text-zinc-900">{fmtPct(priceContext.roiAtBatchPct)}</dd>
                </div>
                <div>
                  <dt className="text-xs text-zinc-500">ROI Today</dt>
                  <dd className="mt-0.5 text-sm font-medium text-zinc-900">{fmtPct(priceContext.roiTodayPct)}</dd>
                </div>
              </dl>
            </CardContent>
          </Card>
        ) : null}

        {forecast ? (
          <Card>
            <CardHeader>
              <CardTitle>Forecast</CardTitle>
              <CardDescription>
                Forward-looking projection using {formatProjectionMethod(forecast.method)} for
                {" "}
                {priceContext?.metalType ? <span className="capitalize">{priceContext.metalType}</span> : "this batch"}.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {forecastCurvePath ? (
                <div className="rounded-lg border border-zinc-200 bg-white p-3">
                  <svg viewBox="0 0 320 90" className="h-24 w-full" role="img" aria-label="Forecast trendline">
                    <path d={forecastCurvePath} fill="none" stroke="currentColor" strokeWidth="2" className="text-violet-600" />
                  </svg>
                </div>
              ) : (
                <p className="text-sm text-zinc-500">Not enough historical points are available to project a forecast curve.</p>
              )}

              <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <div>
                  <dt className="text-xs text-zinc-500">Projected Price</dt>
                  <dd className="mt-0.5 text-sm font-medium text-zinc-900">
                    {forecast.projectedPrice != null ? `$${fmt2(forecast.projectedPrice)}` : "n/a"}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-zinc-500">Method</dt>
                  <dd className="mt-0.5 text-sm font-medium text-zinc-900">{formatProjectionMethod(forecast.method)}</dd>
                </div>
                <div>
                  <dt className="text-xs text-zinc-500">Confidence</dt>
                  <dd className="mt-0.5 text-sm font-medium text-zinc-900 capitalize">
                    {forecast.confidenceIndicator}
                    {forecast.volatilityPct != null ? ` (${fmt2(forecast.volatilityPct)}% vol)` : ""}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-zinc-500">Projected Net Value</dt>
                  <dd className="mt-0.5 text-sm font-medium text-zinc-900">${fmt2(forecast.projectedNetValue)}</dd>
                </div>
                <div>
                  <dt className="text-xs text-zinc-500">Projected Profit / Loss</dt>
                  <dd className={`mt-0.5 text-sm font-medium ${forecast.projectedProfitLoss >= 0 ? "text-emerald-700" : "text-rose-600"}`}>
                    {forecast.projectedProfitLoss >= 0 ? "+" : ""}${fmt2(forecast.projectedProfitLoss)}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-zinc-500">Projected ROI</dt>
                  <dd className="mt-0.5 text-sm font-medium text-zinc-900">{fmtPct(forecast.projectedROI)}</dd>
                </div>
                <div>
                  <dt className="text-xs text-zinc-500">SMA Projection</dt>
                  <dd className="mt-0.5 text-sm font-medium text-zinc-900">
                    {forecast.smaProjectedPrice != null ? `$${fmt2(forecast.smaProjectedPrice)}` : "n/a"}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-zinc-500">EMA Projection</dt>
                  <dd className="mt-0.5 text-sm font-medium text-zinc-900">
                    {forecast.emaProjectedPrice != null ? `$${fmt2(forecast.emaProjectedPrice)}` : "n/a"}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-zinc-500">Regression Projection</dt>
                  <dd className="mt-0.5 text-sm font-medium text-zinc-900">
                    {forecast.regressionProjectedPrice != null ? `$${fmt2(forecast.regressionProjectedPrice)}` : "n/a"}
                  </dd>
                </div>
              </dl>
            </CardContent>
          </Card>
        ) : null}

        <Card>
          <CardHeader>
            <CardTitle>Reports</CardTitle>
            <CardDescription>
              Customer-facing PDF documents for melt, settlement, and assay workflows.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {!billing.canExport ? (
              <p className="text-sm text-amber-700">Reports are available on Pro and Enterprise plans.</p>
            ) : null}
            <div className="flex flex-wrap gap-2">
              <Link
                href={meltReportHref}
                className={`rounded-md border px-3 py-2 text-xs font-medium ${
                  billing.canExport
                    ? "border-zinc-300 bg-white text-zinc-900 hover:bg-zinc-50"
                    : "pointer-events-none border-zinc-200 bg-zinc-100 text-zinc-400"
                }`}
                aria-disabled={!billing.canExport}
              >
                Download Melt Sheet
              </Link>
              <Link
                href={settlementReportHref}
                className={`rounded-md border px-3 py-2 text-xs font-medium ${
                  billing.canExport
                    ? "border-zinc-300 bg-white text-zinc-900 hover:bg-zinc-50"
                    : "pointer-events-none border-zinc-200 bg-zinc-100 text-zinc-400"
                }`}
                aria-disabled={!billing.canExport}
              >
                Download Settlement Sheet
              </Link>
              <Link
                href={assayReportHref}
                className={`rounded-md border px-3 py-2 text-xs font-medium ${
                  billing.canExport
                    ? "border-zinc-300 bg-white text-zinc-900 hover:bg-zinc-50"
                    : "pointer-events-none border-zinc-200 bg-zinc-100 text-zinc-400"
                }`}
                aria-disabled={!billing.canExport}
              >
                Download Assay Report
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Reference calculation */}
        {safeCalculatorOutput ? (
          <Card>
            <CardHeader>
              <CardTitle>Reference Calculation</CardTitle>
              <CardDescription>
                The calculator run that was saved with this batch. Canonical output is
                server-computed.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {calculatorInput ? (
                  <>
                    <div>
                      <dt className="text-xs text-zinc-500">Metal</dt>
                      <dd className="mt-0.5 text-sm font-medium text-zinc-900 capitalize">
                        {calculatorInput.metalType}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs text-zinc-500">Weight</dt>
                      <dd className="mt-0.5 text-sm font-medium text-zinc-900">
                        {fmt4(calculatorInput.weight)} {calculatorInput.weightUnit}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs text-zinc-500">Purity</dt>
                      <dd className="mt-0.5 text-sm font-medium text-zinc-900">
                        {calculatorInput.purityPct}%
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs text-zinc-500">Recovery Rate</dt>
                      <dd className="mt-0.5 text-sm font-medium text-zinc-900">
                        {calculatorInput.recoveryRatePct}%
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs text-zinc-500">Acquisition Cost</dt>
                      <dd className="mt-0.5 text-sm font-medium text-zinc-900">
                        ${fmt2(calculatorInput.acquisitionCostUsd)}
                      </dd>
                    </div>
                  </>
                ) : null}
                <div>
                  <dt className="text-xs text-zinc-500">Recovered Weight</dt>
                  <dd className="mt-0.5 text-sm font-medium text-zinc-900">
                    {fmt4(safeCalculatorOutput.recoveredMetalWeight)} g
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-zinc-500">Recovered Weight (oz)</dt>
                  <dd className="mt-0.5 text-sm font-medium text-zinc-900">
                    {fmt4(safeCalculatorOutput.recoveredMetalWeightOz)} oz
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-zinc-500">Gross Value</dt>
                  <dd className="mt-0.5 text-sm font-medium text-zinc-900">
                    ${fmt2(safeCalculatorOutput.grossValue)}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-zinc-500">Net Value</dt>
                  <dd className="mt-0.5 text-sm font-medium text-zinc-900">
                    ${fmt2(safeCalculatorOutput.netValue)}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-zinc-500">Profit / Loss</dt>
                  <dd
                    className={`mt-0.5 text-sm font-medium ${
                      safeCalculatorOutput.profitLoss >= 0 ? "text-emerald-700" : "text-rose-600"
                    }`}
                  >
                    {safeCalculatorOutput.profitLoss >= 0 ? "+" : ""}${fmt2(safeCalculatorOutput.profitLoss)}
                  </dd>
                </div>
                {safeCalculatorOutput.marginPct != null ? (
                  <div>
                    <dt className="text-xs text-zinc-500">Margin</dt>
                    <dd className="mt-0.5 text-sm font-medium text-zinc-900">
                      {fmt2(safeCalculatorOutput.marginPct)}%
                    </dd>
                  </div>
                ) : null}
              </dl>
            </CardContent>
          </Card>
        ) : null}

        {/* Batch items */}
        {items.length > 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>Items</CardTitle>
              <CardDescription>Individual item calculations in this batch.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-zinc-200 text-left text-xs text-zinc-500">
                      <th className="pb-2 pr-4 font-medium">ID</th>
                      <th className="pb-2 pr-4 font-medium">Metal</th>
                      <th className="pb-2 pr-4 font-medium">Weight</th>
                      <th className="pb-2 pr-4 font-medium">Purity</th>
                      <th className="pb-2 pr-4 font-medium">Recovered</th>
                      <th className="pb-2 pr-4 font-medium">Recovered (oz)</th>
                      <th className="pb-2 pr-4 font-medium">Gross Value</th>
                      <th className="pb-2 pr-4 font-medium">Net Value</th>
                      <th className="pb-2 pr-4 font-medium">Recovery %</th>
                      <th className="pb-2 pr-4 font-medium">Acq. Cost</th>
                      <th className="pb-2 pr-4 font-medium">Margin %</th>
                      <th className="pb-2 font-medium">P&L</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {items.map((item) => (
                      <tr key={item.id} className="text-zinc-700">
                        <td className="py-2 pr-4 font-mono text-xs text-zinc-500">
                          {item.id.slice(0, 8)}…
                        </td>
                        <td className="py-2 pr-4 capitalize">{item.metalType}</td>
                        <td className="py-2 pr-4">
                          {fmt4(item.weight)} {item.weightUnit}
                        </td>
                        <td className="py-2 pr-4">{item.purityPct}%</td>
                        <td className="py-2 pr-4">{fmt4(item.recoveredMetalWeight)} g</td>
                        <td className="py-2 pr-4">{fmt4(item.recoveredMetalWeightOz)} oz</td>
                        <td className="py-2 pr-4">${fmt2(item.grossValue)}</td>
                        <td className="py-2 pr-4">${fmt2(item.netValue)}</td>
                        <td className="py-2 pr-4">{fmt2(item.recoveryRatePct)}%</td>
                        <td className="py-2 pr-4">${fmt2(item.acquisitionCostUsd)}</td>
                        <td className="py-2 pr-4">
                          {item.marginPct != null ? `${fmt2(item.marginPct)}%` : "n/a"}
                        </td>
                        <td
                          className={`py-2 font-medium ${
                            item.profitLoss >= 0 ? "text-emerald-700" : "text-rose-600"
                          }`}
                        >
                          {item.profitLoss >= 0 ? "+" : ""}${fmt2(item.profitLoss)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent>
              <p className="text-sm text-zinc-500">No items were found for this batch.</p>
            </CardContent>
          </Card>
        )}
 
        {/* ── Phase 14: Audit Ledger ── */}
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold tracking-tight text-zinc-900">Audit Ledger</h2>
            <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-zinc-500">
              Immutable Trace v1.3.1
            </span>
          </div>
          <Card className="overflow-hidden border-zinc-200 shadow-lg">
             <CardHeader className="border-b border-zinc-100 bg-zinc-50/50">
               <CardTitle className="text-sm font-semibold text-zinc-700">Financial Providence & System Trace</CardTitle>
               <CardDescription className="text-xs text-zinc-500">
                 The following log is an immutable record of the state of the system at the time of calculation.
                 Operators can use this to verify price origins, engine versions, and trust-layer overrides.
               </CardDescription>
             </CardHeader>
             <CardContent className="p-6">
                <AuditTraceView snapshot={(auditSnapshot as unknown) as CalculationSnapshot | null} />
             </CardContent>
          </Card>
        </section>

        <div>
          <Link
            href="/calculator"
            className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700"
          >
            New Calculation
          </Link>
        </div>
      </section>
    </main>
  );
}

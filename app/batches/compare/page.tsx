import Link from "next/link";

import {
  ComparisonMetricCards,
  type BatchComparisonRow,
  type BatchMetalBreakdownRow,
} from "@/components/batches/comparison-metric-cards";
import { ComparisonMetalBreakdown } from "@/components/batches/comparison-metal-breakdown";
import { ComparisonSummaryTable } from "@/components/batches/comparison-summary-table";
import { ComparisonTrend } from "@/components/batches/comparison-trend";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireCurrentUser } from "@/lib/auth";
import { getBatchService, getBillingService } from "@/lib/mock-data-gate";
import { batchApiResponseSchema, type BatchApiData } from "@/lib/validations/calculator";

type CompareSearchParams = Record<string, string | string[] | undefined>;

const WEIGHT_TO_GRAMS: Record<string, number> = {
  g: 1,
  kg: 1000,
  oz: 31.1035,
  lb: 453.59237,
};

function toGrams(weight: number, unit: string): number {
  const factor = WEIGHT_TO_GRAMS[unit] ?? 1;
  return weight * factor;
}

function parseIds(params: CompareSearchParams): string[] {
  const idsParam = params.ids;

  const raw = Array.isArray(idsParam) ? idsParam : idsParam ? [idsParam] : [];

  const ids = raw
    .flatMap((value) => value.split(","))
    .map((value) => value.trim())
    .filter(Boolean);

  return Array.from(new Set(ids));
}

function computeComparisonRow(batch: BatchApiData): BatchComparisonRow {
  const items = batch.items ?? [];
  const priceContext = batch.priceContext;

  const totalRecoveredMetal = items.reduce((sum, item) => sum + item.recoveredMetalWeight, 0);
  const totalGrossValue = items.reduce((sum, item) => sum + item.grossValue, 0);
  const totalNetValue = items.reduce((sum, item) => sum + item.netValue, 0);
  const totalProfitLoss = items.reduce((sum, item) => sum + item.profitLoss, 0);
  const costBasis = items.reduce((sum, item) => sum + item.acquisitionCostUsd, 0);

  const inputWeightGrams = items.reduce((sum, item) => sum + toGrams(item.weight, item.weightUnit), 0);
  const recoveredGrams = items.reduce(
    (sum, item) => sum + toGrams(item.recoveredMetalWeight, item.weightUnit),
    0,
  );
  const recoveryEfficiency = inputWeightGrams > 0 ? recoveredGrams / inputWeightGrams : null;

  const marginValues = items
    .map((item) => item.marginPct)
    .filter((margin): margin is number => margin !== null);

  const averageMarginPct =
    marginValues.length > 0
      ? marginValues.reduce((sum, margin) => sum + margin, 0) / marginValues.length
      : null;

  const metalMap = new Map<string, BatchMetalBreakdownRow>();
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

  return {
    batchId: batch.id,
    createdAt: batch.createdAt ? new Date(batch.createdAt).toISOString() : null,
    tags: batch.tags ?? [],
    dominantMetalType: priceContext?.metalType ?? null,
    historicalNetValue: batch.historicalNetValue ?? totalNetValue,
    historicalProfitLoss: batch.historicalProfitLoss ?? totalProfitLoss,
    deltaSinceBatch: batch.deltaSinceBatch ?? 0,
    priceHistory: (priceContext?.history ?? []).map((point) => ({
      timestamp: new Date(point.timestamp).toISOString(),
      priceUsdPerUnit: point.priceUsdPerUnit,
    })),
    forecastMethod: batch.forecast?.method ?? null,
    forecastConfidence: batch.forecast?.confidenceIndicator ?? "n/a",
    forecastProjectedPrice: batch.forecast?.projectedPrice ?? null,
    forecastProjectedNetValue: batch.forecast?.projectedNetValue ?? totalNetValue,
    forecastProjectedProfitLoss: batch.forecast?.projectedProfitLoss ?? totalProfitLoss,
    forecastProjectedROI: batch.forecast?.projectedROI ?? null,
    forecastDelta: (batch.forecast?.projectedNetValue ?? totalNetValue) - totalNetValue,
    forecastCurve: (batch.forecast?.curve ?? []).map((point) => ({
      timestamp: new Date(point.timestamp).toISOString(),
      projectedPriceUsdPerUnit: point.projectedPriceUsdPerUnit,
    })),
    itemCount: items.length,
    totalRecoveredMetal,
    totalGrossValue,
    totalNetValue,
    totalProfitLoss,
    averageMarginPct,
    costBasis,
    recoveryEfficiency,
    metalBreakdown: Array.from(metalMap.values()).sort((a, b) => b.netValue - a.netValue),
  };
}

export default async function BatchComparePage({
  searchParams,
}: {
  searchParams?: Promise<CompareSearchParams>;
}) {
  const user = await requireCurrentUser();
  const searchParamsResolved = (await searchParams) ?? {};
  const isMockRequested = searchParamsResolved.mock === "true";
  
  const batchService = await getBatchService(isMockRequested);
  const billingService = await getBillingService(isMockRequested);

  const billing = await billingService.getBillingSummary(user.activeTeamId);
  const ids = parseIds(searchParamsResolved);
  const idsParam = encodeURIComponent(ids.join(","));
  const exportComparisonCsvHref = `/api/batches/compare/export/csv?ids=${idsParam}${isMockRequested ? "&mock=true" : ""}`;
  const exportComparisonPdfHref = `/api/batches/compare/export/pdf?ids=${idsParam}${isMockRequested ? "&mock=true" : ""}`;

  if (!billing.canCompare) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-zinc-100 via-white to-zinc-100 px-4 py-10 sm:px-6 lg:px-8">
        <section className="mx-auto w-full max-w-5xl space-y-6">
          <header className="space-y-2">
            <Link href={isMockRequested ? "/batches?mock=true" : "/batches"} className="text-sm text-zinc-500 hover:text-zinc-900">
              &larr; Back to Batches
            </Link>
            <h1 className="text-3xl font-semibold tracking-tight text-zinc-900">Batch Comparison</h1>
          </header>
          <Card>
            <CardHeader>
              <CardTitle>Comparison is locked on Free</CardTitle>
              <CardDescription>
                Upgrade to Pro to compare saved batches side by side and export the results.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-3">
              <Link
                href="/billing"
                className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700"
              >
                Upgrade to Pro
              </Link>
              <Link
                href={isMockRequested ? "/batches?mock=true" : "/batches"}
                className="rounded-md border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-100"
              >
                Back to Batches
              </Link>
            </CardContent>
          </Card>
        </section>
      </main>
    );
  }

  if (ids.length < 2) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-zinc-100 via-white to-zinc-100 px-4 py-10 sm:px-6 lg:px-8">
        <section className="mx-auto w-full max-w-6xl space-y-6">
          <header className="space-y-2">
            <Link href={isMockRequested ? "/batches?mock=true" : "/batches"} className="text-sm text-zinc-500 hover:text-zinc-900">
              &larr; Back to Batches
            </Link>
            <h1 className="text-3xl font-semibold tracking-tight text-zinc-900">Batch Comparison</h1>
          </header>
          <Card>
            <CardHeader>
              <CardTitle>Select At Least Two Batches</CardTitle>
              <CardDescription>
                Use selection mode on the batches page and choose two or more batches to compare.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link
                href={isMockRequested ? "/batches?mode=compare&mock=true" : "/batches?mode=compare"}
                className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700"
              >
                Open Batch Selection
              </Link>
            </CardContent>
          </Card>
        </section>
      </main>
    );
  }

  const rows: BatchComparisonRow[] = [];
  const missing: string[] = [];
  const invalid: string[] = [];

  for (const id of ids) {
    try {
        const raw = await batchService.getBatchById(id, user.id);

        if (!raw) {
          missing.push(id);
          continue;
        }

        const parsed = batchApiResponseSchema.safeParse({ ok: true, data: raw });
        if (!parsed.success || !parsed.data.ok || !parsed.data.data) {
          invalid.push(id);
          continue;
        }

        rows.push(computeComparisonRow(parsed.data.data));
    } catch (err) {
        console.error(`Error fetching batch ${id} for comparison:`, err);
        invalid.push(id);
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-zinc-100 via-white to-zinc-100 px-4 py-10 sm:px-6 lg:px-8">
      <section className="mx-auto w-full max-w-7xl space-y-6">
        <header className="space-y-2">
          <Link href={isMockRequested ? "/batches?mode=compare&mock=true" : "/batches?mode=compare"} className="text-sm text-zinc-500 hover:text-zinc-900">
            &larr; Back to Batches
          </Link>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h1 className="text-3xl font-semibold tracking-tight text-zinc-900">Batch Comparison</h1>
            <div className="flex items-center gap-2">
              <Link
                href={exportComparisonCsvHref}
                className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-xs font-medium text-zinc-900 hover:bg-zinc-50"
              >
                Export Comparison CSV
              </Link>
              <Link
                href={exportComparisonPdfHref}
                className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-xs font-medium text-zinc-900 hover:bg-zinc-50"
              >
                Export Comparison PDF
              </Link>
            </div>
          </div>
          <p className="text-zinc-600">Side-by-side ROI and recovery comparison across selected batches.</p>
        </header>

        {(missing.length > 0 || invalid.length > 0) && (
          <Card>
            <CardHeader>
              <CardTitle>Some Batches Could Not Be Compared</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {missing.length > 0 && (
                <p className="text-rose-600">Missing: {missing.map((id) => id.slice(0, 8)).join(", ")}</p>
              )}
              {invalid.length > 0 && (
                <p className="text-rose-600">Invalid: {invalid.map((id) => id.slice(0, 8)).join(", ")}</p>
              )}
            </CardContent>
          </Card>
        )}

        {rows.length === 0 ? (
          <Card>
            <CardContent>
              <p className="text-sm text-zinc-600">No comparable batches found for the selected IDs.</p>
            </CardContent>
          </Card>
        ) : (
          <>
            <ComparisonMetricCards rows={rows} />
            <ComparisonSummaryTable rows={rows} />
            <ComparisonMetalBreakdown rows={rows} />
            <ComparisonTrend rows={rows} />
          </>
        )}
      </section>
    </main>
  );
}

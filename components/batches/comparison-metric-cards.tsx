import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export type BatchMetalBreakdownRow = {
  metalType: string;
  itemCount: number;
  recoveredMetalWeight: number;
  grossValue: number;
  netValue: number;
  profitLoss: number;
};

export type BatchComparisonRow = {
  batchId: string;
  createdAt: string | null;
  tags: { id: string; name: string; color: string | null }[];
  dominantMetalType: string | null;
  historicalNetValue: number;
  historicalProfitLoss: number;
  deltaSinceBatch: number;
  priceHistory: { timestamp: string; priceUsdPerUnit: number }[];
  forecastMethod: "sma" | "ema" | "regression" | null;
  forecastConfidence: "high" | "moderate" | "low" | "n/a";
  forecastProjectedPrice: number | null;
  forecastProjectedNetValue: number;
  forecastProjectedProfitLoss: number;
  forecastProjectedROI: number | null;
  forecastDelta: number;
  forecastCurve: { timestamp: string; projectedPriceUsdPerUnit: number }[];
  itemCount: number;
  totalRecoveredMetal: number;
  totalGrossValue: number;
  totalNetValue: number;
  totalProfitLoss: number;
  averageMarginPct: number | null;
  costBasis: number;
  recoveryEfficiency: number | null;
  metalBreakdown: BatchMetalBreakdownRow[];
};

type ComparisonMetricCardsProps = {
  rows: BatchComparisonRow[];
};

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

function formatProjectionMethod(method: BatchComparisonRow["forecastMethod"]): string {
  switch (method) {
    case "sma":
      return "SMA";
    case "ema":
      return "EMA";
    case "regression":
      return "Regression";
    default:
      return "n/a";
  }
}

export function ComparisonMetricCards({ rows }: ComparisonMetricCardsProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {rows.map((row) => {
        const sparklineValues = row.forecastCurve.length > 0
          ? row.forecastCurve.map((point) => point.projectedPriceUsdPerUnit)
          : row.priceHistory.map((point) => point.priceUsdPerUnit);
        const sparklinePath = buildSparklinePath(sparklineValues, 220, 52);

        return (
          <Card key={row.batchId}>
            <CardHeader>
              <CardTitle className="text-sm font-semibold text-zinc-900">
                Batch {row.batchId.slice(0, 8)}...
              </CardTitle>
              {row.tags.length > 0 ? (
                <div className="mt-2 flex flex-wrap gap-2">
                  {row.tags.map((tag) => (
                    <span
                      key={tag.id}
                      className="rounded-full border border-zinc-300 bg-white px-2 py-0.5 text-xs text-zinc-700"
                    >
                      {tag.name}
                    </span>
                  ))}
                </div>
              ) : null}
              {sparklinePath ? (
                <div className="mt-3 rounded-md border border-zinc-200 bg-zinc-50 p-2">
                  <svg viewBox="0 0 220 52" className="h-14 w-full" role="img" aria-label="Batch price trend">
                    <path d={sparklinePath} fill="none" stroke="currentColor" strokeWidth="2" className="text-violet-600" />
                  </svg>
                </div>
              ) : null}
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <dt className="text-zinc-500">Recovered</dt>
                  <dd className="font-medium text-zinc-900">{fmt4(row.totalRecoveredMetal)} g</dd>
                </div>
                <div>
                  <dt className="text-zinc-500">Gross</dt>
                  <dd className="font-medium text-zinc-900">${fmt2(row.totalGrossValue)}</dd>
                </div>
                <div>
                  <dt className="text-zinc-500">Net</dt>
                  <dd className="font-medium text-zinc-900">${fmt2(row.totalNetValue)}</dd>
                </div>
                <div>
                  <dt className="text-zinc-500">Profit / Loss</dt>
                  <dd className={row.totalProfitLoss >= 0 ? "font-medium text-emerald-700" : "font-medium text-rose-600"}>
                    {row.totalProfitLoss >= 0 ? "+" : ""}${fmt2(row.totalProfitLoss)}
                  </dd>
                </div>
                <div>
                  <dt className="text-zinc-500">Historical Net</dt>
                  <dd className="font-medium text-zinc-900">${fmt2(row.historicalNetValue)}</dd>
                </div>
                <div>
                  <dt className="text-zinc-500">Delta Since Batch</dt>
                  <dd className={row.deltaSinceBatch >= 0 ? "font-medium text-emerald-700" : "font-medium text-rose-600"}>
                    {row.deltaSinceBatch >= 0 ? "+" : ""}${fmt2(row.deltaSinceBatch)}
                  </dd>
                </div>
                <div>
                  <dt className="text-zinc-500">Forecast Net</dt>
                  <dd className="font-medium text-zinc-900">${fmt2(row.forecastProjectedNetValue)}</dd>
                </div>
                <div>
                  <dt className="text-zinc-500">Forecast Delta</dt>
                  <dd className={row.forecastDelta >= 0 ? "font-medium text-emerald-700" : "font-medium text-rose-600"}>
                    {row.forecastDelta >= 0 ? "+" : ""}${fmt2(row.forecastDelta)}
                  </dd>
                </div>
                <div>
                  <dt className="text-zinc-500">Forecast ROI</dt>
                  <dd className="font-medium text-zinc-900">
                    {row.forecastProjectedROI != null ? `${fmt2(row.forecastProjectedROI)}%` : "n/a"}
                  </dd>
                </div>
                <div>
                  <dt className="text-zinc-500">Method</dt>
                  <dd className="font-medium text-zinc-900">
                    {formatProjectionMethod(row.forecastMethod)} / {row.forecastConfidence}
                  </dd>
                </div>
                <div>
                  <dt className="text-zinc-500">Avg Margin</dt>
                  <dd className="font-medium text-zinc-900">
                    {row.averageMarginPct != null ? `${fmt2(row.averageMarginPct)}%` : "n/a"}
                  </dd>
                </div>
                <div>
                  <dt className="text-zinc-500">Recovery Efficiency</dt>
                  <dd className="font-medium text-zinc-900">
                    {row.recoveryEfficiency != null ? `${fmt2(row.recoveryEfficiency * 100)}%` : "n/a"}
                  </dd>
                </div>
              </dl>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}


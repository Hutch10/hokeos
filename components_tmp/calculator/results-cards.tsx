import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { CalculatorOutput } from "@/lib/validations/calculator";

type ResultsCardsProps = {
  result: CalculatorOutput;
};

function formatNumber(value: number, options?: Intl.NumberFormatOptions): string {
  return new Intl.NumberFormat("en-US", options).format(value);
}

const DECIMAL_2: Intl.NumberFormatOptions = {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
};

const DECIMAL_4: Intl.NumberFormatOptions = {
  minimumFractionDigits: 2,
  maximumFractionDigits: 4,
};

export function ResultsCards({ result }: ResultsCardsProps) {
  const metricCards = [
    {
      label: "Recovered Metal",
      // Show 4 decimal places for weight — precision matters for metals
      value: `${formatNumber(result.recoveredMetalWeight, DECIMAL_4)} g`,
    },
    {
      label: "Gross Value",
      value: `$${formatNumber(result.grossValue, DECIMAL_2)}`,
    },
    {
      label: "Net Value",
      value: `$${formatNumber(result.netValue, DECIMAL_2)}`,
    },
    {
      label: "Profit / Loss",
      value: `$${formatNumber(result.profitLoss, DECIMAL_2)}`,
    },
    {
      label: "Margin %",
      // marginPct is null when no acquisition cost was provided (no cost basis)
      value: result.marginPct != null ? `${formatNumber(result.marginPct, DECIMAL_2)}%` : "—",
    },
    {
      label: "Recovery Rate",
      value: `${formatNumber(result.recoveryRatePct, DECIMAL_2)}%`,
    },
  ];

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {metricCards.map((metric) => (
          <Card key={metric.label}>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-zinc-600">{metric.label}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold text-zinc-900">{metric.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {result.hasAnomaly && (
        <Card className="border-rose-200 bg-rose-50">
          <CardContent className="flex items-center gap-3 py-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-rose-600 text-white shadow-lg animate-pulse">
              <span className="text-xl font-black">!</span>
            </div>
            <div>
              <p className="font-bold text-rose-900">MARKET 3-SIGMA ANOMALY DETECTED</p>
              <p className="text-xs text-rose-700">
                Current spot price is outside the statistically expected 30-day range (
                ${formatNumber(result.confidenceBands?.lower ?? 0, DECIMAL_2)} - 
                ${formatNumber(result.confidenceBands?.upper ?? 0, DECIMAL_2)}
                ). Proceed with extreme caution.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {(result.snapshotId != null || result.formulaVersionId !== undefined || result.fetchedAt) && (
        <Card>
          <CardContent className="grid gap-2 sm:grid-cols-2">
            <p className="text-sm text-zinc-600">
              Snapshot ID:{" "}
              <span className="font-medium text-zinc-900">{result.snapshotId ?? "n/a"}</span>
            </p>
            <p className="text-sm text-zinc-600">
              Formula Version ID:{" "}
              <span className="font-medium text-zinc-900">
                {result.formulaVersionId ?? "n/a"}
              </span>
            </p>
            {result.fetchedAt && (
              <p className="text-sm text-zinc-600">
                Data Fetched:{" "}
                <span className="font-medium text-zinc-900">
                  {new Date(result.fetchedAt).toLocaleString()}
                </span>
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

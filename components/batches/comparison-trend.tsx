import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { BatchComparisonRow } from "@/components/batches/comparison-metric-cards";

type ComparisonTrendProps = {
  rows: BatchComparisonRow[];
};

function fmt2(value: number): string {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function ComparisonTrend({ rows }: ComparisonTrendProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Comparison Trend (Chart-Ready)</CardTitle>
        <CardDescription>
          Placeholder for future multi-batch trend visualization using normalized comparison points.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="rounded-md border border-dashed border-zinc-300 bg-zinc-50 px-4 py-8 text-sm text-zinc-500">
          X-axis: Batch (selected order) | Y-axis: Net Value / Profit-Loss / Recovery Efficiency
          <br />
          Legend: one series per metric and optional per-metal overlays.
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-200 text-left text-xs text-zinc-500">
                <th className="pb-2 pr-4 font-medium">Batch</th>
                <th className="pb-2 pr-4 font-medium">Net Value</th>
                <th className="pb-2 pr-4 font-medium">Profit / Loss</th>
                <th className="pb-2 font-medium">Recovery Efficiency</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {rows.map((row) => (
                <tr key={row.batchId} className="text-zinc-700">
                  <td className="py-2 pr-4 font-mono text-xs">{row.batchId.slice(0, 8)}...</td>
                  <td className="py-2 pr-4">${fmt2(row.totalNetValue)}</td>
                  <td
                    className={`py-2 pr-4 font-medium ${
                      row.totalProfitLoss >= 0 ? "text-emerald-700" : "text-rose-600"
                    }`}
                  >
                    {row.totalProfitLoss >= 0 ? "+" : ""}${fmt2(row.totalProfitLoss)}
                  </td>
                  <td className="py-2">
                    {row.recoveryEfficiency != null
                      ? `${fmt2(row.recoveryEfficiency * 100)}%`
                      : "n/a"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

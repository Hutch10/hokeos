import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { BatchComparisonRow } from "@/components/batches/comparison-metric-cards";

type ComparisonSummaryTableProps = {
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

export function ComparisonSummaryTable({ rows }: ComparisonSummaryTableProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Comparison Summary</CardTitle>
        <CardDescription>Side-by-side batch metrics computed from canonical economic outputs.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-200 text-left text-xs text-zinc-500">
                <th className="pb-2 pr-4 font-medium">Batch</th>
                <th className="pb-2 pr-4 font-medium">Tags</th>
                <th className="pb-2 pr-4 font-medium">Items</th>
                <th className="pb-2 pr-4 font-medium">Recovered (g)</th>
                <th className="pb-2 pr-4 font-medium">Gross Value</th>
                <th className="pb-2 pr-4 font-medium">Net Value</th>
                <th className="pb-2 pr-4 font-medium">Historical Net</th>
                <th className="pb-2 pr-4 font-medium">Forecast Net</th>
                <th className="pb-2 pr-4 font-medium">Cost Basis</th>
                <th className="pb-2 pr-4 font-medium">Profit / Loss</th>
                <th className="pb-2 pr-4 font-medium">Delta Since Batch</th>
                <th className="pb-2 pr-4 font-medium">Forecast Delta</th>
                <th className="pb-2 pr-4 font-medium">Forecast ROI</th>
                <th className="pb-2 pr-4 font-medium">Avg Margin %</th>
                <th className="pb-2 font-medium">Recovery Efficiency</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {rows.map((row) => (
                <tr key={row.batchId} className="text-zinc-700">
                  <td className="py-2 pr-4 font-mono text-xs">{row.batchId.slice(0, 8)}...</td>
                  <td className="py-2 pr-4">
                    {row.tags.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {row.tags.map((tag) => (
                          <span
                            key={tag.id}
                            className="rounded-full border border-zinc-300 bg-white px-2 py-0.5 text-[10px]"
                          >
                            {tag.name}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-xs text-zinc-400">none</span>
                    )}
                  </td>
                  <td className="py-2 pr-4">{row.itemCount}</td>
                  <td className="py-2 pr-4">{fmt4(row.totalRecoveredMetal)}</td>
                  <td className="py-2 pr-4">${fmt2(row.totalGrossValue)}</td>
                  <td className="py-2 pr-4">${fmt2(row.totalNetValue)}</td>
                  <td className="py-2 pr-4">${fmt2(row.historicalNetValue)}</td>
                  <td className="py-2 pr-4">${fmt2(row.forecastProjectedNetValue)}</td>
                  <td className="py-2 pr-4">${fmt2(row.costBasis)}</td>
                  <td
                    className={`py-2 pr-4 font-medium ${
                      row.totalProfitLoss >= 0 ? "text-emerald-700" : "text-rose-600"
                    }`}
                  >
                    {row.totalProfitLoss >= 0 ? "+" : ""}${fmt2(row.totalProfitLoss)}
                  </td>
                  <td className={`py-2 pr-4 font-medium ${row.deltaSinceBatch >= 0 ? "text-emerald-700" : "text-rose-600"}`}>
                    {row.deltaSinceBatch >= 0 ? "+" : ""}${fmt2(row.deltaSinceBatch)}
                  </td>
                  <td className={`py-2 pr-4 font-medium ${row.forecastDelta >= 0 ? "text-emerald-700" : "text-rose-600"}`}>
                    {row.forecastDelta >= 0 ? "+" : ""}${fmt2(row.forecastDelta)}
                  </td>
                  <td className="py-2 pr-4">
                    {row.forecastProjectedROI != null ? `${fmt2(row.forecastProjectedROI)}%` : "n/a"}
                  </td>
                  <td className="py-2 pr-4">
                    {row.averageMarginPct != null ? `${fmt2(row.averageMarginPct)}%` : "n/a"}
                  </td>
                  <td className="py-2">
                    {row.recoveryEfficiency != null ? `${fmt2(row.recoveryEfficiency * 100)}%` : "n/a"}
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


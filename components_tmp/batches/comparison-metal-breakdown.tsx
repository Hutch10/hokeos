import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { BatchComparisonRow } from "@/components/batches/comparison-metric-cards";

type ComparisonMetalBreakdownProps = {
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

export function ComparisonMetalBreakdown({ rows }: ComparisonMetalBreakdownProps) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {rows.map((row) => (
        <Card key={row.batchId}>
          <CardHeader>
            <CardTitle className="text-base">Batch {row.batchId.slice(0, 8)}...</CardTitle>
            <CardDescription>Metal-type performance composition for this batch.</CardDescription>
          </CardHeader>
          <CardContent>
            {row.metalBreakdown.length === 0 ? (
              <p className="text-sm text-zinc-500">No metal records in this batch.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-zinc-200 text-left text-xs text-zinc-500">
                      <th className="pb-2 pr-3 font-medium">Metal</th>
                      <th className="pb-2 pr-3 font-medium">Items</th>
                      <th className="pb-2 pr-3 font-medium">Recovered (g)</th>
                      <th className="pb-2 pr-3 font-medium">Net</th>
                      <th className="pb-2 font-medium">P/L</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {row.metalBreakdown.map((metalRow) => (
                      <tr key={`${row.batchId}-${metalRow.metalType}`} className="text-zinc-700">
                        <td className="py-2 pr-3 capitalize">{metalRow.metalType}</td>
                        <td className="py-2 pr-3">{metalRow.itemCount}</td>
                        <td className="py-2 pr-3">{fmt4(metalRow.recoveredMetalWeight)}</td>
                        <td className="py-2 pr-3">${fmt2(metalRow.netValue)}</td>
                        <td
                          className={`py-2 font-medium ${
                            metalRow.profitLoss >= 0 ? "text-emerald-700" : "text-rose-600"
                          }`}
                        >
                          {metalRow.profitLoss >= 0 ? "+" : ""}${fmt2(metalRow.profitLoss)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export type MetalBreakdownRow = {
  metalType: string;
  itemCount: number;
  recoveredMetalWeight: number;
  grossValue: number;
  netValue: number;
  profitLoss: number;
};

type MetalBreakdownTableProps = {
  rows: MetalBreakdownRow[];
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

export function MetalBreakdownTable({ rows }: MetalBreakdownTableProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Breakdown by Metal Type</CardTitle>
        <CardDescription>Sorted by net value (descending).</CardDescription>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="text-sm text-zinc-500">No matching items for the active filters.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-200 text-left text-xs text-zinc-500">
                  <th className="pb-2 pr-4 font-medium">Metal</th>
                  <th className="pb-2 pr-4 font-medium">Items</th>
                  <th className="pb-2 pr-4 font-medium">Recovered (g)</th>
                  <th className="pb-2 pr-4 font-medium">Gross Value</th>
                  <th className="pb-2 pr-4 font-medium">Net Value</th>
                  <th className="pb-2 font-medium">Profit / Loss</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {rows.map((row) => (
                  <tr key={row.metalType} className="text-zinc-700">
                    <td className="py-2 pr-4 capitalize">{row.metalType}</td>
                    <td className="py-2 pr-4">{row.itemCount}</td>
                    <td className="py-2 pr-4">{fmt4(row.recoveredMetalWeight)}</td>
                    <td className="py-2 pr-4">${fmt2(row.grossValue)}</td>
                    <td className="py-2 pr-4">${fmt2(row.netValue)}</td>
                    <td
                      className={`py-2 font-medium ${
                        row.profitLoss >= 0 ? "text-emerald-700" : "text-rose-600"
                      }`}
                    >
                      {row.profitLoss >= 0 ? "+" : ""}${fmt2(row.profitLoss)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

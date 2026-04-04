import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export type MonthlySummaryRow = {
  month: string;
  totalRecoveredMetal: number;
  totalNetValue: number;
  totalProfitLoss: number;
  averageMarginPct: number | null;
};

type MonthlySummaryProps = {
  rows: MonthlySummaryRow[];
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

export function MonthlySummary({ rows }: MonthlySummaryProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Monthly Summary</CardTitle>
        <CardDescription>
          Aggregated by batch creation month (YYYY-MM).
        </CardDescription>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="text-sm text-zinc-500">No monthly data available for the active filters.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-200 text-left text-xs text-zinc-500">
                  <th className="pb-2 pr-4 font-medium">Month</th>
                  <th className="pb-2 pr-4 font-medium">Recovered (g)</th>
                  <th className="pb-2 pr-4 font-medium">Net Value</th>
                  <th className="pb-2 pr-4 font-medium">Profit / Loss</th>
                  <th className="pb-2 font-medium">Avg Margin %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {rows.map((row) => (
                  <tr key={row.month} className="text-zinc-700">
                    <td className="py-2 pr-4 font-medium text-zinc-900">{row.month}</td>
                    <td className="py-2 pr-4">{fmt4(row.totalRecoveredMetal)}</td>
                    <td className="py-2 pr-4">${fmt2(row.totalNetValue)}</td>
                    <td
                      className={`py-2 pr-4 font-medium ${
                        row.totalProfitLoss >= 0 ? "text-emerald-700" : "text-rose-600"
                      }`}
                    >
                      {row.totalProfitLoss >= 0 ? "+" : ""}${fmt2(row.totalProfitLoss)}
                    </td>
                    <td className="py-2">
                      {row.averageMarginPct != null ? `${fmt2(row.averageMarginPct)}%` : "n/a"}
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

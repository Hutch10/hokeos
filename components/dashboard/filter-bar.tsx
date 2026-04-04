import Link from "next/link";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type FilterBarProps = {
  startDate?: string;
  endDate?: string;
  selectedMetalTypes: string[];
  minPurity?: number;
  maxPurity?: number;
  minRecoveryRate?: number;
  maxRecoveryRate?: number;
  metalTypeOptions: string[];
};

export function FilterBar({
  startDate,
  endDate,
  selectedMetalTypes,
  minPurity,
  maxPurity,
  minRecoveryRate,
  maxRecoveryRate,
  metalTypeOptions,
}: FilterBarProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Filters</CardTitle>
        <CardDescription>Server-side item and date filtering for deterministic analytics.</CardDescription>
      </CardHeader>
      <CardContent>
        <form method="GET" action="/dashboard" className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-1">
              <label htmlFor="startDate" className="text-xs font-medium text-zinc-600">
                Start Date
              </label>
              <input
                id="startDate"
                name="startDate"
                type="date"
                defaultValue={startDate ?? ""}
                className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900"
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="endDate" className="text-xs font-medium text-zinc-600">
                End Date
              </label>
              <input
                id="endDate"
                name="endDate"
                type="date"
                defaultValue={endDate ?? ""}
                className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900"
              />
            </div>

            <div className="space-y-1">
              <p className="text-xs font-medium text-zinc-600">Metal Type</p>
              <div className="flex flex-wrap gap-3 rounded-md border border-zinc-300 bg-white px-3 py-2">
                {metalTypeOptions.map((metalType) => (
                  <label key={metalType} className="inline-flex items-center gap-2 text-sm text-zinc-700">
                    <input
                      type="checkbox"
                      name="metalType"
                      value={metalType}
                      defaultChecked={selectedMetalTypes.includes(metalType)}
                      className="h-4 w-4 rounded border-zinc-300"
                    />
                    <span className="capitalize">{metalType}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="space-y-1">
              <label htmlFor="minPurity" className="text-xs font-medium text-zinc-600">
                Min Purity %
              </label>
              <input
                id="minPurity"
                name="minPurity"
                type="number"
                step="0.01"
                min="0"
                max="100"
                defaultValue={minPurity ?? ""}
                className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900"
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="maxPurity" className="text-xs font-medium text-zinc-600">
                Max Purity %
              </label>
              <input
                id="maxPurity"
                name="maxPurity"
                type="number"
                step="0.01"
                min="0"
                max="100"
                defaultValue={maxPurity ?? ""}
                className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900"
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="minRecoveryRate" className="text-xs font-medium text-zinc-600">
                Min Recovery Rate %
              </label>
              <input
                id="minRecoveryRate"
                name="minRecoveryRate"
                type="number"
                step="0.01"
                min="0"
                max="100"
                defaultValue={minRecoveryRate ?? ""}
                className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900"
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="maxRecoveryRate" className="text-xs font-medium text-zinc-600">
                Max Recovery Rate %
              </label>
              <input
                id="maxRecoveryRate"
                name="maxRecoveryRate"
                type="number"
                step="0.01"
                min="0"
                max="100"
                defaultValue={maxRecoveryRate ?? ""}
                className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900"
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="submit"
              className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700"
            >
              Apply Filters
            </button>
            <Link
              href="/dashboard"
              className="rounded-md border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-100"
            >
              Reset Filters
            </Link>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

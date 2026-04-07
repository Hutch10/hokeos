import Link from "next/link";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ActionToast } from "@/components/ui/action-toast";
import { cn } from "@/lib/utils";
import { requireCurrentUser } from "@/lib/auth";
import { getBatchService, getTagService } from "@/lib/mock-data-gate";
import { batchApiResponseSchema, type BatchApiData } from "@/lib/validations/calculator";

type BatchesSearchParams = Record<string, string | string[] | undefined>;

function fmt2(value: number): string {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function parseSelectedValues(idsParam: string | string[] | undefined): string[] {
  const raw = Array.isArray(idsParam) ? idsParam : idsParam ? [idsParam] : [];

  const ids = raw
    .flatMap((value) => value.split(","))
    .map((value) => value.trim())
    .filter(Boolean);

  return Array.from(new Set(ids));
}

export default async function BatchesPage({
  searchParams,
}: {
  searchParams?: Promise<BatchesSearchParams>;
}) {
  const user = await requireCurrentUser();
  const params = (await searchParams) ?? {};
  const isMockRequested = params.mock === "true";
  
  const batchService = await getBatchService(isMockRequested);
  const tagService = await getTagService(isMockRequested);

  const selectionMode = params.mode === "compare" || params.selection === "1";
  const selectedIds = parseSelectedValues(params.ids);
  const selectedTagIds = parseSelectedValues(params.tag);
  const toastCode = typeof params.toast === "string" ? params.toast : null;
  const toastMessage =
    toastCode === "duplicate-limit"
      ? { message: "Free plan batch limit reached. Upgrade to duplicate batches.", tone: "error" as const }
      : toastCode === "duplicate-error"
        ? { message: "Failed to duplicate batch.", tone: "error" as const }
        : null;

  let batches: BatchApiData[] = [];
  let fetchError: string | null = null;
  let tags: { id: string; name: string; color: string | null }[] = [];

  try {
    tags = await tagService.listTags(user.activeTeamId);
    const rawBatches = await batchService.listBatches(user.id, { tagIds: selectedTagIds });
    const parsedBatches: BatchApiData[] = [];

    for (const rawBatch of rawBatches) {
      const parsed = batchApiResponseSchema.safeParse({ ok: true, data: rawBatch });
      if (!parsed.success || !parsed.data.ok || !parsed.data.data) {
        fetchError = "Failed to parse batch records. Check schema compatibility.";
        break;
      }
      parsedBatches.push(parsed.data.data);
    }

    batches = parsedBatches;
  } catch (err: unknown) {
    const error = err instanceof Error ? err : new Error(String(err));
    console.error("Batches fetch error:", error);
    fetchError = `Failed to load batches. ${isMockRequested ? "Mock data is also unavailable." : "Check your database connection or use ?mock=true."}`;
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-zinc-100 via-white to-zinc-100 px-4 py-10 sm:px-6 lg:px-8">
      {toastMessage ? <ActionToast message={toastMessage.message} tone={toastMessage.tone} /> : null}
      <section className="mx-auto w-full max-w-4xl space-y-6">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-2">
            <h1 className="text-3xl font-semibold tracking-tight text-zinc-900">Batch History</h1>
            <p className="text-zinc-600">Saved recovery calculations and their economic outputs.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href={selectionMode ? (isMockRequested ? "/batches?mock=true" : "/batches") : (isMockRequested ? "/batches?mode=compare&mock=true" : "/batches?mode=compare")}
              className="rounded-md border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-100"
            >
              {selectionMode ? "Exit Selection" : "Select For Compare"}
            </Link>
            <Link
              href="/calculator"
              className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700"
            >
              New Calculation
            </Link>
          </div>
        </header>

        <Card>
          <CardHeader>
            <CardTitle>Filter by Tag</CardTitle>
          </CardHeader>
          <CardContent>
            <form action="/batches" method="GET" className="space-y-3">
              <input type="hidden" name="mock" value={String(isMockRequested)} />
              {selectionMode ? <input type="hidden" name="mode" value="compare" /> : null}

              {tags.length === 0 ? (
                <p className="text-sm text-zinc-500">No tags yet. Add tags from calculator or edit batch flow.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {tags.map((tag: any) => {
                    const checked = selectedTagIds.includes(tag.id);
                    return (
                      <label
                        key={tag.id}
                        className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs ${
                          checked ? "border-zinc-900 bg-zinc-900 text-white" : "border-zinc-300 bg-white text-zinc-700"
                        }`}
                       
                      >
                        <input
                          type="checkbox"
                          name="tag"
                          value={tag.id}
                          defaultChecked={checked}
                          className="h-3.5 w-3.5"
                        />
                        {tag.name}
                      </label>
                    );
                  })}
                </div>
              )}

              <div className="flex flex-wrap gap-2">
                <button
                  type="submit"
                  className="rounded-md bg-zinc-900 px-3 py-2 text-xs font-medium text-white hover:bg-zinc-700"
                >
                  Apply Tag Filter
                </button>
                <Link
                  href={selectionMode ? (isMockRequested ? "/batches?mode=compare&mock=true" : "/batches?mode=compare") : (isMockRequested ? "/batches?mock=true" : "/batches")}
                  className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-xs font-medium text-zinc-900 hover:bg-zinc-100"
                >
                  Clear Filters
                </Link>
              </div>
            </form>
          </CardContent>
        </Card>

        {fetchError ? (
          <Card>
            <CardContent>
              <p className="text-sm text-rose-600">{fetchError}</p>
            </CardContent>
          </Card>
        ) : batches.length === 0 ? (
          <Card>
            <CardContent>
              <p className="text-sm text-zinc-500">
                No batches yet. {" "}
                <Link href="/calculator" className="underline text-zinc-900 hover:text-zinc-700">
                  Run a calculation
                </Link>{" "}
                and save it as a batch to see it here.
              </p>
            </CardContent>
          </Card>
        ) : (
          <form action="/batches/compare" method="GET" className="space-y-3">
            <input type="hidden" name="mock" value={String(isMockRequested)} />
            {selectionMode && (
              <Card>
                <CardContent>
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="text-sm text-zinc-600">
                      Select two or more batches, then open side-by-side comparison.
                    </p>
                    <button
                      type="submit"
                      className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700"
                    >
                      Compare Selected
                    </button>
                  </div>
                </CardContent>
              </Card>
            )}

            {batches.map((batch: any) => {
              const items = batch.items ?? [];
              const totalGrossValue = batch.totalGrossValue ?? 0;
              const totalNetValue = batch.totalNetValue ?? 0;
              const totalProfitLoss = batch.totalProfitLoss ?? 0;
              const createdAt = batch.createdAt ? new Date(batch.createdAt) : null;
              const isChecked = selectedIds.includes(batch.id);

              return (
                <Card key={batch.id} className="transition-shadow hover:shadow-md">
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        {selectionMode && (
                          <input
                            type="checkbox"
                            name="ids"
                            value={batch.id}
                            defaultChecked={isChecked}
                            className="h-4 w-4 rounded border-zinc-300"
                            aria-label={`Select batch ${batch.id}`}
                          />
                        )}
                        <span className="font-mono text-sm text-zinc-700">{batch.id.slice(0, 8)}...</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {batch.settlementHash && (
                          <span className="flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold uppercase text-emerald-700 border border-emerald-200">
                            <svg className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                            Certified
                          </span>
                        )}
                        <span className="text-xs font-normal text-zinc-500">
                          {createdAt
                            ? createdAt.toLocaleString("en-US", {
                                dateStyle: "medium",
                                timeStyle: "short",
                              })
                            : "Unknown time"}
                        </span>
                      </div>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <dl className="grid grid-cols-3 gap-4 sm:grid-cols-4">
                      <div>
                        <dt className="text-xs text-zinc-500">Items</dt>
                        <dd className="mt-0.5 text-sm font-medium text-zinc-900">{items.length}</dd>
                      </div>
                      <div>
                        <dt className="text-xs text-zinc-500">Gross Value</dt>
                        <dd className="mt-0.5 text-sm font-medium text-zinc-900">${fmt2(totalGrossValue)}</dd>
                      </div>
                      <div>
                        <dt className="text-xs text-zinc-500">Net Value</dt>
                        <dd className="mt-0.5 text-sm font-medium text-zinc-900">${fmt2(totalNetValue)}</dd>
                      </div>
                      <div>
                        <dt className="text-xs text-zinc-500">Profit / Loss</dt>
                        <dd
                          className={`mt-0.5 text-sm font-medium ${
                            totalProfitLoss >= 0 ? "text-emerald-700" : "text-rose-600"
                          }`}
                        >
                          {totalProfitLoss >= 0 ? "+" : ""}${fmt2(totalProfitLoss)}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-xs text-zinc-500">Trust Score</dt>
                        <dd className={cn(
                          "mt-0.5 text-sm font-bold",
                          Number(batch.trustScore ?? 0) >= 90 ? "text-emerald-600" :
                          Number(batch.trustScore ?? 0) >= 75 ? "text-amber-600" :
                          "text-rose-600"
                        )}>
                          {batch.trustScore}%
                        </dd>
                      </div>
                    </dl>

                    {batch.tags && batch.tags.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {batch.tags.map((tag: any) => (
                          <span
                            key={tag.id}
                            className="rounded-full border border-zinc-300 bg-white px-2 py-0.5 text-xs text-zinc-700"
                           
                          >
                            {tag.name}
                          </span>
                        ))}
                      </div>
                    ) : null}

                    <div>
                      <Link
                        href={`/batches/${batch.id}${isMockRequested ? "?mock=true" : ""}`}
                        className="text-sm font-medium text-zinc-700 underline hover:text-zinc-900"
                      >
                        View Details
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              );
            })}

            {selectionMode && batches.length > 0 && (
              <div className="flex justify-end">
                <button
                  type="submit"
                  className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700"
                >
                  Compare Selected
                </button>
              </div>
            )}
          </form>
        )}
      </section>
    </main>
  );
}

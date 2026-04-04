import Link from "next/link";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireCurrentUser } from "@/lib/auth";
import { getBillingService } from "@/lib/mock-data-gate";
import type { BillingPlan } from "@/lib/billing/service";

type BillingPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function planBadgeClasses(current: boolean): string {
  return current
    ? "border-cyan-300 bg-cyan-50 text-cyan-800"
    : "border-zinc-200 bg-white text-zinc-700";
}

function usageLabel(batchCount: number, batchLimit: number | null): string {
  return batchLimit == null ? `${batchCount} saved batches · unlimited plan` : `${batchCount} / ${batchLimit} saved batches`;
}

export default async function BillingPage({ searchParams }: BillingPageProps) {
  const user = await requireCurrentUser();
  const searchParamsResolved = (await searchParams) ?? {};
  const isMockRequested = searchParamsResolved.mock === "true";

  const billingService = await getBillingService(isMockRequested);
  const summary = await billingService.getBillingSummary(user.activeTeamId);
  
  const checkoutState = typeof searchParamsResolved.checkout === "string" ? searchParamsResolved.checkout : null;

  return (
    <main className="min-h-screen bg-gradient-to-b from-zinc-100 via-white to-zinc-100 px-4 py-10 sm:px-6 lg:px-8">
      <section className="mx-auto w-full max-w-6xl space-y-6">
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-700">Billing</p>
            <h1 className="text-3xl font-semibold tracking-tight text-zinc-900">Subscription and usage</h1>
            <p className="max-w-2xl text-zinc-600">
              Manage plan access for exports, comparisons, and saved batch capacity. All billing state is enforced server-side.
            </p>
          </div>
          <Link
            href={isMockRequested ? "/dashboard?mock=true" : "/dashboard"}
            className="rounded-md border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-100"
          >
            Back to Dashboard
          </Link>
        </header>

        {checkoutState === "success" ? (
          <Card className="border-emerald-200 bg-emerald-50">
            <CardContent>
              <p className="text-sm text-emerald-800">Checkout completed. Stripe will confirm the subscription and update your plan shortly.</p>
            </CardContent>
          </Card>
        ) : null}

        {checkoutState === "canceled" ? (
          <Card className="border-amber-200 bg-amber-50">
            <CardContent>
              <p className="text-sm text-amber-800">Checkout was canceled. Your current plan has not changed.</p>
            </CardContent>
          </Card>
        ) : null}

        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <Card>
            <CardHeader>
              <CardTitle>Current subscription</CardTitle>
              <CardDescription>Account-level plan and Stripe subscription status.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap items-center gap-3">
                <span className="rounded-full border border-cyan-300 bg-cyan-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-cyan-800">
                  {billingService.formatPlanLabel(summary.plan)}
                </span>
                <span className="rounded-full border border-zinc-200 bg-zinc-100 px-3 py-1 text-xs font-medium uppercase tracking-[0.2em] text-zinc-700">
                  {summary.status.replace(/_/g, " ")}
                </span>
              </div>
              <dl className="grid gap-4 sm:grid-cols-2">
                <div>
                  <dt className="text-xs uppercase tracking-[0.2em] text-zinc-500">Usage</dt>
                  <dd className="mt-1 text-sm font-medium text-zinc-900">
                    {usageLabel(summary.batchCount, summary.definition.batchLimit)}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-[0.2em] text-zinc-500">Exports</dt>
                  <dd className="mt-1 text-sm font-medium text-zinc-900">
                    {summary.canExport ? "CSV and PDF enabled" : "Locked on Free"}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-[0.2em] text-zinc-500">Comparison</dt>
                  <dd className="mt-1 text-sm font-medium text-zinc-900">
                    {summary.canCompare ? "Multi-batch comparison enabled" : "Locked on Free"}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-[0.2em] text-zinc-500">Priority support</dt>
                  <dd className="mt-1 text-sm font-medium text-zinc-900">
                    {summary.definition.prioritySupport ? "Included" : "Not included"}
                  </dd>
                </div>
              </dl>
              {!summary.canCreateBatch ? (
                <p className="text-sm text-rose-600">
                  Free plan batch capacity has been reached. Upgrade to Pro to save more batches.
                </p>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Plan matrix</CardTitle>
              <CardDescription>Deterministic server-enforced access by tier.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-zinc-700">
              <p>Free: save up to 10 batches, no exports, no comparison.</p>
              <p>Pro: unlimited batches, CSV/PDF exports, batch comparison.</p>
              <p>Enterprise: Pro features plus priority support and custom contractual limits.</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          {(["free", "pro", "enterprise"] as BillingPlan[]).map((plan) => {
            const definition = billingService.BILLING_PLANS[plan];
            const isCurrent = summary.plan === plan;

            return (
              <Card key={plan} className={planBadgeClasses(isCurrent)}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between gap-3">
                    <span>{definition.label}</span>
                    {isCurrent ? (
                      <span className="rounded-full border border-cyan-300 bg-cyan-100 px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-cyan-800">
                        Current
                      </span>
                    ) : null}
                  </CardTitle>
                  <CardDescription>
                    {plan === "free"
                      ? "Start with core usage."
                      : plan === "pro"
                        ? "Unlock exports and comparison."
                        : "Custom enterprise support and limits."}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <ul className="space-y-2 text-sm text-zinc-700">
                    <li>{definition.batchLimit == null ? "Unlimited batches" : `${definition.batchLimit} saved batches`}</li>
                    <li>{definition.exportsEnabled ? "CSV/PDF exports" : "No exports"}</li>
                    <li>{definition.comparisonEnabled ? "Batch comparison" : "No comparison"}</li>
                    <li>{definition.prioritySupport ? "Priority support" : "Standard support"}</li>
                    <li>{definition.customLimits ? "Custom limits" : "Standard limits"}</li>
                  </ul>

                  {plan === "pro" ? (
                    isCurrent ? (
                      <p className="text-sm font-medium text-zinc-800">Your account is already on Pro.</p>
                    ) : (
                      <form action={isMockRequested ? "/api/billing/checkout?mock=true" : "/api/billing/checkout"} method="POST">
                        <input type="hidden" name="plan" value="pro" />
                        <button
                          type="submit"
                          className="w-full rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700"
                        >
                          Upgrade to Pro
                        </button>
                      </form>
                    )
                  ) : null}

                  {plan === "enterprise" ? (
                    <a
                      href="mailto:sales@example.com?subject=Metals%20V1%20Enterprise"
                      className="inline-flex w-full items-center justify-center rounded-md border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-100"
                    >
                      Contact Sales
                    </a>
                  ) : null}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>
    </main>
  );
}
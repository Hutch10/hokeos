import Link from "next/link";

import { getCurrentUser } from "@/lib/auth";

export default async function Home() {
  const user = await getCurrentUser();

  return (
    <main className="min-h-[calc(100vh-73px)] bg-[radial-gradient(circle_at_top,_rgba(8,145,178,0.14),_transparent_38%),linear-gradient(180deg,#fafafa_0%,#ffffff_42%,#f4f4f5_100%)] px-4 py-16 sm:px-6 lg:px-8">
      <section className="mx-auto flex w-full max-w-5xl flex-col gap-10 rounded-[2rem] border border-zinc-200 bg-white/80 px-8 py-12 shadow-[0_24px_80px_rgba(24,24,27,0.08)] backdrop-blur sm:px-10 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-2xl space-y-6">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-cyan-700">
            Authenticated Recovery Analytics
          </p>
          <h1 className="text-4xl font-semibold tracking-tight text-zinc-950 sm:text-5xl">
            Per-user metals recovery calculations, batches, and ROI tracking.
          </h1>
          <p className="text-lg leading-8 text-zinc-600">
            Save calculator runs, compare batches, export results, and keep every dataset isolated to the authenticated account.
          </p>
          <div className="flex flex-wrap gap-3 text-sm font-medium">
            <Link
              className="rounded-full bg-zinc-950 px-5 py-3 text-white transition-colors hover:bg-zinc-800"
              href={user ? "/dashboard" : "/login"}
            >
              {user ? "Open Dashboard" : "Sign In"}
            </Link>
            <Link
              className="rounded-full border border-zinc-300 bg-white px-5 py-3 text-zinc-900 transition-colors hover:bg-zinc-100"
              href={user ? "/calculator" : "/login?callbackUrl=%2Fcalculator"}
            >
              Open Calculator
            </Link>
          </div>
        </div>
        <div className="grid gap-4 rounded-[1.5rem] border border-zinc-200 bg-zinc-50 p-6 text-sm text-zinc-600 lg:min-w-[22rem]">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-zinc-500">Session</p>
            <p className="mt-2 text-base font-medium text-zinc-900">
              {user ? `Signed in as ${user.email}` : "Not signed in"}
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
            <div className="rounded-2xl bg-white p-4 shadow-sm">
              <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">Security</p>
              <p className="mt-2 text-sm text-zinc-900">All batch, snapshot, and export access is enforced from the server session.</p>
            </div>
            <div className="rounded-2xl bg-white p-4 shadow-sm">
              <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">Exports</p>
              <p className="mt-2 text-sm text-zinc-900">CSV and PDF exports resolve ownership implicitly, without client-supplied user IDs.</p>
            </div>
            <div className="rounded-2xl bg-white p-4 shadow-sm">
              <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">Analytics</p>
              <p className="mt-2 text-sm text-zinc-900">Dashboard and comparison views stay SSR-backed and user scoped.</p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

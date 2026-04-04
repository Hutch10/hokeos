import { notFound } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { requireCurrentUser } from "@/lib/auth";
import { getInvestigationService } from "@/lib/mock-data-gate";
import { ResolutionActions } from "./resolution-actions";

export default async function InvestigationDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id } = await params;
  const sParams = (await searchParams) ?? {};
  const isMockRequested = sParams.mock === "true";
  const user = await requireCurrentUser();
  
  const investigationService = await getInvestigationService(isMockRequested);
  
  let investigation;
  try {
    investigation = await investigationService.getInvestigationById(id, user.activeTeamId);
  } catch (err) {
    console.error("Resolution data fetch error:", err);
    return notFound();
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-zinc-100 via-white to-zinc-100 px-4 py-10 sm:px-6 lg:px-8">
      <section className="mx-auto w-full max-w-4xl space-y-6">
        <header className="space-y-4">
          <div className="flex items-center gap-2 text-sm text-zinc-500">
            <Link href="/dashboard" className="hover:text-zinc-900 transition-colors">Dashboard</Link>
            <span>/</span>
            <span className="text-zinc-900 font-medium">Investigation</span>
          </div>
          
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-1">
              <h1 className="text-3xl font-bold tracking-tight text-zinc-900">{investigation.title}</h1>
              <p className="text-zinc-500 font-mono text-xs uppercase tracking-widest">{investigation.id}</p>
            </div>
            <div className="flex gap-2">
              <span className={cn(
                "rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-wider",
                investigation.status === "open" ? "bg-blue-100 border-blue-200 text-blue-700" :
                investigation.status === "in_progress" ? "bg-amber-100 border-amber-200 text-amber-700" :
                "bg-emerald-100 border-emerald-200 text-emerald-700"
              )}>
                {investigation.status.replace(/_/g, " ")}
              </span>
              <span className={cn(
                "rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-wider",
                investigation.severity === "critical" ? "bg-rose-100 border-rose-200 text-rose-700" :
                investigation.severity === "high" ? "bg-orange-100 border-orange-200 text-orange-700" :
                "bg-zinc-100 border-zinc-200 text-zinc-700"
              )}>
                {investigation.severity}
              </span>
            </div>
          </div>
        </header>

        <div className="grid gap-6 md:grid-cols-3">
          <div className="md:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Case Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-zinc-700 leading-relaxed">
                {investigation.summary ? (
                  <p>{investigation.summary}</p>
                ) : (
                  <p className="italic text-zinc-400">No summary provided for this investigation.</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Linked Batches</CardTitle>
                <CardDescription>Industrial datasets associated with this investigation.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="divide-y divide-zinc-100">
                  {investigation.linkedBatches?.map((batch) => (
                    <div key={batch.id} className="flex items-center justify-between py-4 group">
                      <div className="space-y-1">
                        <Link 
                          href={`/batches/${batch.id}${isMockRequested ? "?mock=true" : ""}`}
                          className="font-mono text-sm font-semibold text-zinc-900 hover:text-cyan-700 transition-colors"
                        >
                          {batch.id}
                        </Link>
                        <p className="text-xs text-zinc-500 capitalize">{batch.status}</p>
                      </div>
                      <div className="text-right">
                         <p className="text-xs text-zinc-500 uppercase tracking-tighter">Trust Score</p>
                         <p className={cn(
                           "text-lg font-bold",
                           Number(batch.trustScore ?? 0) >= 90 ? "text-emerald-600" :
                           Number(batch.trustScore ?? 0) >= 75 ? "text-amber-600" :
                           "text-rose-600"
                         )}>
                           {batch.trustScore}%
                         </p>
                      </div>
                    </div>
                  ))}
                  {(!investigation.linkedBatches || investigation.linkedBatches.length === 0) && (
                    <p className="py-4 text-sm text-zinc-500 italic">No batches linked to this investigation yet.</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <ResolutionActions 
              investigationId={investigation.id}
              isMock={isMockRequested}
              status={investigation.status}
            />

            <Card className="bg-zinc-50 border-zinc-200">
              <CardHeader>
                <CardTitle className="text-base text-zinc-900">Timeline</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-3">
                  <div className="relative flex h-2 w-2 mt-1.5 shrink-0 rounded-full bg-zinc-400" />
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-zinc-900">Investigation Created</p>
                    <p className="text-xs text-zinc-500">
                      {new Date(investigation.createdAt).toLocaleString()}
                    </p>
                  </div>
                </div>
                <div className="flex gap-3">
                   <div className="relative flex h-2 w-2 mt-1.5 shrink-0 rounded-full bg-cyan-500" />
                   <div className="space-y-1">
                     <p className="text-sm font-medium text-zinc-900">Latest Update</p>
                     <p className="text-xs text-zinc-500">
                       {new Date(investigation.updatedAt).toLocaleString()}
                     </p>
                   </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-cyan-100 bg-cyan-50/20">
              <CardHeader>
                <CardTitle className="text-base text-cyan-900">Sovereign Evidence</CardTitle>
              </CardHeader>
              <CardContent>
                 <pre className="text-[10px] font-mono whitespace-pre-wrap bg-white/50 p-2 rounded border border-cyan-100 text-cyan-800">
                    {JSON.stringify(investigation.evidenceJson || { status: "No supplementary evidence" }, null, 2)}
                 </pre>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>
    </main>
  );
}

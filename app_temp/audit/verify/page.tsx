import { getBatchById } from "@/lib/metals/batch-service";
import { requireCurrentUser } from "@/lib/auth";
import { AuditVerificationUI } from "@/components/audit/audit-verification-ui";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata = {
  title: "Audit Verification | HokeOS Sovereign",
  description: "Verify the cryptographic integrity of your metals recovery settlements.",
};

export default async function AuditVerifyPage({
  searchParams,
}: {
  searchParams?: Promise<{ batchId?: string }>;
}) {
  const params = (await searchParams) ?? {};
  const user = await requireCurrentUser();
  
  if (params.batchId) {
    await getBatchById(params.batchId, user.id);
  }

  return (
    <main className="min-h-screen bg-zinc-50 px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl space-y-8">
        <header className="space-y-4">
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-bold tracking-tight text-zinc-900">Audit Verification</h1>
            <span className="rounded-full bg-zinc-900 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest text-white">
              Sovereign V1.3
            </span>
          </div>
          <p className="max-w-2xl text-zinc-600">
            HokeOS uses deterministic HMAC-SHA256 signatures to ensure your financial settlements are tamper-proof. 
            Enter a Batch ID or Settlement Hash to verify its integrity against the sovereign ledger.
          </p>
        </header>

        <AuditVerificationUI initialBatchId={params.batchId} />

        <section className="grid gap-6 md:grid-cols-2">
          <Card className="border-zinc-200 bg-white/50 backdrop-blur">
            <CardHeader>
              <CardTitle className="text-sm font-semibold uppercase tracking-wider text-zinc-500">
                How it works
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-zinc-600">
              <p>
                When a batch is certified, HokeOS takes a snapshot of all inputs (weights, purity, market prices) 
                and signs it using a system-level secret. Any change to the source data will invalidate the signature.
              </p>
            </CardContent>
          </Card>

          <Card className="border-zinc-200 bg-white/50 backdrop-blur">
            <CardHeader>
              <CardTitle className="text-sm font-semibold uppercase tracking-wider text-zinc-500">
                Absolute Assurance
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-zinc-600">
              <p>
                This verification process is independent of the display layer. It re-runs the entire math engine 
                on raw database records to ensure the totals you see match the cryptographically signed ledger.
              </p>
            </CardContent>
          </Card>
        </section>
      </div>
    </main>
  );
}

import Link from "next/link";
import { notFound } from "next/navigation";

import { EditBatchForm } from "@/components/calculator/edit-batch-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireCurrentUser } from "@/lib/auth";
import { getBatchById } from "@/lib/metals/batch-service";
import { calculatorApiRequestSchema } from "@/lib/validations/calculator";

type Props = {
  params: Promise<{ batchId: string }>;
};

export default async function EditBatchPage({ params }: Props) {
  const user = await requireCurrentUser();
  const { batchId } = await params;

  const batch = await getBatchById(batchId, user.id);
  if (!batch) {
    notFound();
  }

  const baseInput = batch.calculatorInput ?? (batch.items[0]
    ? {
        metalType: batch.items[0].metalType,
        weight: batch.items[0].weight,
        weightUnit: batch.items[0].weightUnit,
        purityPct: batch.items[0].purityPct,
        recoveryRatePct: batch.items[0].recoveryRatePct,
        acquisitionCostUsd: batch.items[0].acquisitionCostUsd,
        formulaVersion: batch.items[0].formulaVersion,
      }
    : null);

  if (!baseInput) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-zinc-100 via-white to-zinc-100 px-4 py-10 sm:px-6 lg:px-8">
        <section className="mx-auto w-full max-w-4xl space-y-6">
          <header className="space-y-2">
            <Link href={`/batches/${batchId}`} className="text-sm text-zinc-500 hover:text-zinc-900">
              ← Back to Batch
            </Link>
            <h1 className="text-3xl font-semibold tracking-tight text-zinc-900">Edit Batch</h1>
          </header>
          <Card>
            <CardHeader>
              <CardTitle>Cannot edit this batch</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-rose-600">No editable inputs were found for this batch.</p>
            </CardContent>
          </Card>
        </section>
      </main>
    );
  }

  const parsed = calculatorApiRequestSchema.safeParse(baseInput);
  if (!parsed.success) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-zinc-100 via-white to-zinc-100 px-4 py-10 sm:px-6 lg:px-8">
        <section className="mx-auto w-full max-w-4xl space-y-6">
          <header className="space-y-2">
            <Link href={`/batches/${batchId}`} className="text-sm text-zinc-500 hover:text-zinc-900">
              ← Back to Batch
            </Link>
            <h1 className="text-3xl font-semibold tracking-tight text-zinc-900">Edit Batch</h1>
          </header>
          <Card>
            <CardHeader>
              <CardTitle>Cannot edit this batch</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-rose-600">Stored batch items are not compatible with the edit form.</p>
            </CardContent>
          </Card>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-zinc-100 via-white to-zinc-100 px-4 py-10 sm:px-6 lg:px-8">
      <section className="mx-auto w-full max-w-4xl space-y-6">
        <header className="space-y-2">
          <Link href={`/batches/${batchId}`} className="text-sm text-zinc-500 hover:text-zinc-900">
            ← Back to Batch
          </Link>
          <h1 className="text-3xl font-semibold tracking-tight text-zinc-900">Edit Batch</h1>
          <p className="text-zinc-600">
            This form is prefilled from your saved batch and recalculates all economics on the server.
          </p>
        </header>
        <EditBatchForm
          batchId={batchId}
          initialPayload={parsed.data}
          initialTagIds={batch.tags.map((tag) => tag.id)}
          initialCustomerName={batch.customerName}
          initialCustomerEmail={batch.customerEmail}
          initialCustomerReference={batch.customerReference}
        />
      </section>
    </main>
  );
}

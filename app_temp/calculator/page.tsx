import { CalculatorForm } from "@/components/calculator/calculator-form";
import { requireCurrentUser } from "@/lib/auth";

export default async function CalculatorPage() {
  await requireCurrentUser();

  return (
    <main className="min-h-screen bg-gradient-to-b from-zinc-100 via-white to-zinc-100 px-4 py-10 sm:px-6 lg:px-8">
      <section className="mx-auto w-full max-w-4xl space-y-6">
        <header className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight text-zinc-900">Recovery Calculator</h1>
          <p className="text-zinc-600">
            Run metal recovery estimates and persist batch inputs and outputs for downstream tracking.
          </p>
        </header>
        <CalculatorForm />
      </section>
    </main>
  );
}

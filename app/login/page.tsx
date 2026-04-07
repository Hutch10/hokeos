import { redirect } from "next/navigation";

import { LoginForm } from "@/components/auth/login-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getCurrentUser } from "@/lib/auth";

type LoginPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const user = await getCurrentUser();

  if (user) {
    redirect("/dashboard");
  }

  const params = (await searchParams) ?? {};
  const callbackUrl = typeof params.callbackUrl === "string" ? params.callbackUrl : "/dashboard";

  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-950 px-4 py-10 selection:bg-cyan-500/30">
      <section className="w-full max-w-md">
        <div className="mb-8 flex flex-col items-center gap-4 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-cyan-600 font-bold text-white shadow-lg shadow-cyan-500/20 text-xl">H</div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white italic">Operator Terminal</h1>
            <p className="mt-1 text-sm text-zinc-500 uppercase tracking-[0.2em] font-medium">HokeOS Metals Ledger v1.6.1</p>
          </div>
        </div>

        <Card className="border-zinc-800 bg-zinc-900/50 backdrop-blur-sm shadow-2xl">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg text-white">Authentication Required</CardTitle>
            <CardDescription className="text-zinc-400">
              Enter your credentials to access the secure ledger. 
              <span className="block mt-2 flex items-center gap-2 text-xs font-semibold text-emerald-500 uppercase">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                System State: Ready
              </span>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <LoginForm callbackUrl={callbackUrl} />
          </CardContent>
        </Card>

        <p className="mt-8 text-center text-xs text-zinc-600">
          Industrial-grade encryption active. <br />
          All authentication attempts are logged for audit compliance.
        </p>
      </section>
    </main>
  );
}

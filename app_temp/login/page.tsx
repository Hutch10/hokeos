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
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-b from-zinc-100 via-white to-zinc-100 px-4 py-10">
      <section className="w-full max-w-md">
        <Card>
          <CardHeader>
            <CardTitle>Sign In To Metals V1</CardTitle>
            <CardDescription>
              Authenticate with an email and password. New users can create an account directly here.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <LoginForm callbackUrl={callbackUrl} />
          </CardContent>
        </Card>
      </section>
    </main>
  );
}

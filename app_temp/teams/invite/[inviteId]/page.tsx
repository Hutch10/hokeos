import Link from "next/link";
import { redirect } from "next/navigation";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getCurrentUser } from "@/lib/auth";
import { acceptInvite } from "@/lib/teams";

type Props = {
  params: Promise<{ inviteId: string }>;
};

export default async function TeamInvitePage({ params }: Props) {
  const { inviteId } = await params;
  const user = await getCurrentUser();

  if (!user) {
    redirect(`/login?callbackUrl=${encodeURIComponent(`/teams/invite/${inviteId}`)}`);
  }

  try {
    const result = await acceptInvite(inviteId, user.id);
    redirect(`/teams?joined=${encodeURIComponent(result.teamId)}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to accept invite";

    return (
      <main className="min-h-screen bg-gradient-to-b from-zinc-100 via-white to-zinc-100 px-4 py-10 sm:px-6 lg:px-8">
        <section className="mx-auto w-full max-w-3xl space-y-6">
          <header className="space-y-2">
            <Link href="/teams" className="text-sm text-zinc-500 hover:text-zinc-900">
              ← Back to Teams
            </Link>
            <h1 className="text-3xl font-semibold tracking-tight text-zinc-900">Team Invitation</h1>
          </header>

          <Card>
            <CardHeader>
              <CardTitle>Could Not Accept Invite</CardTitle>
              <CardDescription>{message}</CardDescription>
            </CardHeader>
            <CardContent>
              <Link
                href="/teams"
                className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700"
              >
                Go To Teams
              </Link>
            </CardContent>
          </Card>
        </section>
      </main>
    );
  }
}

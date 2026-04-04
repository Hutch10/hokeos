import { getCurrentUser } from "@/lib/auth";
import { inviteByEmail } from "@/lib/teams";

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return Response.json({ ok: false, error: "Authentication required" }, { status: 401 });
    }

    const body = (await req.json().catch(() => null)) as { email?: string } | null;
    const email = body?.email?.trim() ?? "";

    if (!email) {
      return Response.json({ ok: false, error: "Email is required" }, { status: 400 });
    }

    const invite = await inviteByEmail(user.id, user.activeTeamId, email);

    return Response.json({
      ok: true,
      data: {
        inviteId: invite.inviteId,
        acceptUrl: `/teams/invite/${invite.inviteId}`,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create invite";
    const status = /access|required/i.test(message) ? 403 : 500;
    return Response.json({ ok: false, error: message }, { status });
  }
}

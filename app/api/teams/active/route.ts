import { getCurrentUser } from "@/lib/auth";
import { setActiveTeam } from "@/lib/teams";

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return Response.json({ ok: false, error: "Authentication required" }, { status: 401 });
    }

    const body = (await req.json().catch(() => null)) as { teamId?: string } | null;
    const teamId = body?.teamId?.trim() ?? "";

    if (!teamId) {
      return Response.json({ ok: false, error: "teamId is required" }, { status: 400 });
    }

    await setActiveTeam(user.id, teamId);

    return Response.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to switch team";
    const status = /access denied/i.test(message) ? 403 : 500;
    return Response.json({ ok: false, error: message }, { status });
  }
}

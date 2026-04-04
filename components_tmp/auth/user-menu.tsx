import Link from "next/link";
import { revalidatePath } from "next/cache";

import { getCurrentUser } from "@/lib/auth";
import { formatPlanLabel, getBillingSummary } from "@/lib/billing/service";
import { getUserTeams, setActiveTeam } from "@/lib/teams";

import { LogoutButton } from "./logout-button";

export async function UserMenu() {
  async function switchTeamAction(formData: FormData) {
    "use server";

    const current = await getCurrentUser();
    if (!current) {
      return;
    }

    const teamId = String(formData.get("teamId") ?? "").trim();
    if (!teamId) {
      return;
    }

    await setActiveTeam(current.id, teamId);
    revalidatePath("/dashboard");
    revalidatePath("/billing");
    revalidatePath("/batches");
    revalidatePath("/reports");
    revalidatePath("/teams");
  }

  const user = await getCurrentUser();

  if (!user) {
    return (
      <Link
        href="/login"
        className="rounded-md bg-zinc-900 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-700"
      >
        Login
      </Link>
    );
  }

  const billing = await getBillingSummary(user.activeTeamId);
  const teams = await getUserTeams(user.id);

  return (
    <div className="flex items-center gap-3">
      <div className="text-right">
        <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">Signed In</p>
        <p className="text-sm font-medium text-zinc-900">{user.email}</p>
        <form action={switchTeamAction} className="mt-1 flex items-center justify-end gap-1">
          <select
            name="teamId"
            defaultValue={user.activeTeamId}
            className="max-w-[180px] rounded-md border border-zinc-300 bg-white px-2 py-1 text-xs text-zinc-900"
            aria-label="Active team"
          >
            {teams.map((team) => (
              <option key={team.id} value={team.id}>
                {team.name}
              </option>
            ))}
          </select>
          <button type="submit" className="rounded-md border border-zinc-300 bg-white px-2 py-1 text-xs font-medium text-zinc-800 hover:bg-zinc-50">
            Switch
          </button>
        </form>
        <div className="mt-1 flex items-center justify-end gap-2">
          <span className="rounded-full border border-zinc-200 bg-zinc-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-700">
            {formatPlanLabel(billing.plan)}
          </span>
          <Link href="/billing" className="text-xs font-medium text-cyan-700 hover:text-cyan-900">
            {billing.plan === "free" ? "Upgrade" : "Billing"}
          </Link>
        </div>
      </div>
      <LogoutButton />
    </div>
  );
}

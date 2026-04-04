import Link from "next/link";
import { revalidatePath } from "next/cache";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireCurrentUser } from "@/lib/auth";
import {
  changeMemberRole,
  createTeam,
  getUserTeams,
  inviteByEmail,
  listTeamInvites,
  listTeamMembers,
  removeMember,
  renameTeam,
  setActiveTeam,
} from "@/lib/teams";

async function createTeamAction(formData: FormData) {
  "use server";

  const user = await requireCurrentUser();
  const name = String(formData.get("name") ?? "").trim();

  const teamId = await createTeam(user.id, name);
  await setActiveTeam(user.id, teamId);

  revalidatePath("/teams");
  revalidatePath("/dashboard");
}

async function renameTeamAction(formData: FormData) {
  "use server";

  const user = await requireCurrentUser();
  const teamId = String(formData.get("teamId") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();

  await renameTeam(user.id, teamId, name);

  revalidatePath("/teams");
  revalidatePath("/dashboard");
}

async function inviteAction(formData: FormData) {
  "use server";

  const user = await requireCurrentUser();
  const teamId = String(formData.get("teamId") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();

  await inviteByEmail(user.id, teamId, email);

  revalidatePath("/teams");
}

async function removeMemberAction(formData: FormData) {
  "use server";

  const user = await requireCurrentUser();
  const teamId = String(formData.get("teamId") ?? "").trim();
  const memberUserId = String(formData.get("memberUserId") ?? "").trim();

  await removeMember(user.id, teamId, memberUserId);
  revalidatePath("/teams");
}

async function makeAdminAction(formData: FormData) {
  "use server";

  const user = await requireCurrentUser();
  const teamId = String(formData.get("teamId") ?? "").trim();
  const memberUserId = String(formData.get("memberUserId") ?? "").trim();

  await changeMemberRole(user.id, teamId, memberUserId, "admin");
  revalidatePath("/teams");
}

async function makeMemberAction(formData: FormData) {
  "use server";

  const user = await requireCurrentUser();
  const teamId = String(formData.get("teamId") ?? "").trim();
  const memberUserId = String(formData.get("memberUserId") ?? "").trim();

  await changeMemberRole(user.id, teamId, memberUserId, "member");
  revalidatePath("/teams");
}

async function switchTeamAction(formData: FormData) {
  "use server";

  const user = await requireCurrentUser();
  const teamId = String(formData.get("teamId") ?? "").trim();

  await setActiveTeam(user.id, teamId);
  revalidatePath("/teams");
  revalidatePath("/dashboard");
}

export default async function TeamsPage() {
  const user = await requireCurrentUser();
  const userTeams = await getUserTeams(user.id);

  const activeTeam = userTeams.find((team) => team.id === user.activeTeamId) ?? userTeams[0] ?? null;

  const [members, invites] = activeTeam
    ? await Promise.all([
        listTeamMembers(user.id, activeTeam.id),
        listTeamInvites(user.id, activeTeam.id),
      ])
    : [[], []];

  return (
    <main className="min-h-screen bg-gradient-to-b from-zinc-100 via-white to-zinc-100 px-4 py-10 sm:px-6 lg:px-8">
      <section className="mx-auto w-full max-w-6xl space-y-6">
        <header className="space-y-2">
          <Link href="/dashboard" className="text-sm text-zinc-500 hover:text-zinc-900">
            ← Back to Dashboard
          </Link>
          <h1 className="text-3xl font-semibold tracking-tight text-zinc-900">Teams</h1>
          <p className="text-zinc-600">Manage teams, members, roles, and invitations.</p>
        </header>

        <Card>
          <CardHeader>
            <CardTitle>Create Team</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={createTeamAction} className="flex flex-wrap gap-2">
              <input
                type="text"
                name="name"
                aria-label="New team name"
                required
                placeholder="New Team Name"
                className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm"
              />
              <button type="submit" className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700">
                Create
              </button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Your Teams</CardTitle>
          </CardHeader>
          <CardContent>
            {userTeams.length === 0 ? (
              <p className="text-sm text-zinc-500">No teams found.</p>
            ) : (
              <div className="space-y-3">
                {userTeams.map((team) => (
                  <div key={team.id} className="rounded-lg border border-zinc-200 bg-white p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold text-zinc-900">{team.name}</p>
                        <p className="text-xs uppercase tracking-wide text-zinc-500">role: {team.role}</p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {team.id === user.activeTeamId ? (
                          <span className="rounded-md border border-cyan-300 bg-cyan-50 px-2 py-1 text-xs font-medium text-cyan-800">Active</span>
                        ) : (
                          <form action={switchTeamAction}>
                            <input type="hidden" name="teamId" value={team.id} />
                            <button type="submit" className="rounded-md border border-zinc-300 bg-white px-2 py-1 text-xs font-medium text-zinc-800 hover:bg-zinc-50">Switch</button>
                          </form>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {activeTeam ? (
          <>
            <Card>
              <CardHeader>
                <CardTitle>Active Team: {activeTeam.name}</CardTitle>
                <CardDescription>Rename, invite, and manage member roles.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <form action={renameTeamAction} className="flex flex-wrap gap-2">
                  <input type="hidden" name="teamId" value={activeTeam.id} />
                  <input
                    type="text"
                    name="name"
                    aria-label="Rename active team"
                    required
                    defaultValue={activeTeam.name}
                    className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm"
                  />
                  <button type="submit" className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-50">
                    Rename Team
                  </button>
                </form>

                <form action={inviteAction} className="flex flex-wrap gap-2">
                  <input type="hidden" name="teamId" value={activeTeam.id} />
                  <input
                    type="email"
                    name="email"
                    aria-label="Invite member email"
                    required
                    placeholder="invitee@example.com"
                    className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm"
                  />
                  <button type="submit" className="rounded-md bg-zinc-900 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-700">
                    Invite by Email
                  </button>
                </form>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Members</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-zinc-200 text-left text-xs text-zinc-500">
                        <th className="pb-2 pr-4 font-medium">Email</th>
                        <th className="pb-2 pr-4 font-medium">Role</th>
                        <th className="pb-2 font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100">
                      {members.map((member) => (
                        <tr key={member.id}>
                          <td className="py-2 pr-4 text-zinc-900">{member.email}</td>
                          <td className="py-2 pr-4 text-zinc-700">{member.role}</td>
                          <td className="py-2">
                            <div className="flex flex-wrap gap-2">
                              {member.role !== "owner" ? (
                                <>
                                  <form action={makeAdminAction}>
                                    <input type="hidden" name="teamId" value={activeTeam.id} />
                                    <input type="hidden" name="memberUserId" value={member.userId} />
                                    <button type="submit" className="rounded-md border border-zinc-300 bg-white px-2 py-1 text-xs font-medium text-zinc-800 hover:bg-zinc-50">Make Admin</button>
                                  </form>
                                  <form action={makeMemberAction}>
                                    <input type="hidden" name="teamId" value={activeTeam.id} />
                                    <input type="hidden" name="memberUserId" value={member.userId} />
                                    <button type="submit" className="rounded-md border border-zinc-300 bg-white px-2 py-1 text-xs font-medium text-zinc-800 hover:bg-zinc-50">Make Member</button>
                                  </form>
                                  <form action={removeMemberAction}>
                                    <input type="hidden" name="teamId" value={activeTeam.id} />
                                    <input type="hidden" name="memberUserId" value={member.userId} />
                                    <button type="submit" className="rounded-md border border-rose-300 bg-rose-50 px-2 py-1 text-xs font-medium text-rose-700 hover:bg-rose-100">Remove</button>
                                  </form>
                                </>
                              ) : (
                                <span className="text-xs text-zinc-500">Owner cannot be removed</span>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Pending Invites</CardTitle>
              </CardHeader>
              <CardContent>
                {invites.length === 0 ? (
                  <p className="text-sm text-zinc-500">No pending invites.</p>
                ) : (
                  <ul className="space-y-2 text-sm text-zinc-700">
                    {invites.map((invite) => (
                      <li key={invite.id}>
                        {invite.email} · accept link: <Link href={`/teams/invite/${invite.id}`} className="text-cyan-700 hover:text-cyan-900">/teams/invite/{invite.id}</Link>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </>
        ) : null}
      </section>
    </main>
  );
}

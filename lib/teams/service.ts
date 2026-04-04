import { and, asc, eq, sql } from "drizzle-orm";

import { db } from "@/db";
import { teamInvites, teamMembers, teams, users } from "@/db/schema";

export type TeamRole = "owner" | "admin" | "member";

export type TeamSummary = {
  id: string;
  name: string;
  role: TeamRole;
  ownerId: string;
};

export async function getUserTeams(userId: string): Promise<TeamSummary[]> {
  const isDev = process.env.NODE_ENV === "development";
  if (isDev && userId === "mock-user-id") {
    return [{
      id: "mock-team-id",
      name: "Hoke Core Testing (Mock)",
      role: "owner",
      ownerId: "mock-user-id",
    }];
  }

  try {
    const rows = await db
      .select({
        id: teams.id,
        name: teams.name,
        ownerId: teams.ownerId,
        role: teamMembers.role,
      })
      .from(teamMembers)
      .innerJoin(teams, eq(teams.id, teamMembers.teamId))
      .where(eq(teamMembers.userId, userId))
      .orderBy(asc(teams.name));

    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      ownerId: row.ownerId,
      role: (row.role as TeamRole) ?? "member",
    }));
  } catch (err) {
    if (isDev) {
      console.error("Teams DB Error, failing over to mock team list:", err);
      return [{
        id: "mock-team-id",
        name: "Hoke Core Testing (Mock)",
        role: "owner",
        ownerId: "mock-user-id",
      }];
    }
    throw err;
  }
}

export async function getTeamMembership(userId: string, teamId: string): Promise<{ role: TeamRole; ownerId: string } | null> {
  const [row] = await db
    .select({ role: teamMembers.role, ownerId: teams.ownerId })
    .from(teamMembers)
    .innerJoin(teams, eq(teams.id, teamMembers.teamId))
    .where(and(eq(teamMembers.userId, userId), eq(teamMembers.teamId, teamId)))
    .limit(1);

  if (!row) {
    return null;
  }

  return {
    role: (row.role as TeamRole) ?? "member",
    ownerId: row.ownerId,
  };
}

export async function assertTeamMember(userId: string, teamId: string): Promise<void> {
  const membership = await getTeamMembership(userId, teamId);
  if (!membership) {
    throw new Error("Team access denied");
  }
}

async function assertAdminOrOwner(userId: string, teamId: string): Promise<void> {
  const membership = await getTeamMembership(userId, teamId);
  if (!membership) {
    throw new Error("Team access denied");
  }

  if (membership.role !== "owner" && membership.role !== "admin") {
    throw new Error("Team admin access required");
  }
}

async function assertOwner(userId: string, teamId: string): Promise<void> {
  const membership = await getTeamMembership(userId, teamId);
  if (!membership) {
    throw new Error("Team access denied");
  }

  if (membership.role !== "owner") {
    throw new Error("Team owner access required");
  }
}

export async function ensurePersonalTeam(userId: string, nameHint?: string | null): Promise<string> {
  const existing = await getUserTeams(userId);
  const ownerTeam = existing.find((team) => team.role === "owner");
  if (ownerTeam) {
    return ownerTeam.id;
  }

  const [createdTeam] = await db
    .insert(teams)
    .values({
      ownerId: userId,
      name: `${(nameHint ?? "User").trim() || "User"} Personal`,
    })
    .returning({ id: teams.id });

  if (!createdTeam) {
    throw new Error("Failed to create personal team");
  }

  await db.insert(teamMembers).values({
    teamId: createdTeam.id,
    userId,
    role: "owner",
  });

  await db
    .update(users)
    .set({ activeTeamId: createdTeam.id })
    .where(eq(users.id, userId));

  return createdTeam.id;
}

export async function resolveActiveTeamId(userId: string, requestedTeamId?: string | null): Promise<string> {
  const isDev = process.env.NODE_ENV === "development";
  if (isDev && userId === "mock-user-id") {
    return "mock-team-id";
  }

  const normalized = requestedTeamId?.trim() || null;

  try {
    if (normalized) {
      const membership = await getTeamMembership(userId, normalized);
      if (membership) {
        return normalized;
      }
    }

    const [userRow] = await db
      .select({ activeTeamId: users.activeTeamId, name: users.name })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!userRow) {
      throw new Error("User not found");
    }

    if (userRow.activeTeamId) {
      const membership = await getTeamMembership(userId, userRow.activeTeamId);
      if (membership) {
        return userRow.activeTeamId;
      }
    }

    return ensurePersonalTeam(userId, userRow.name);
  } catch (err) {
    if (isDev) {
      console.error("Teams Resolve Error, failing over to mock team:", err);
      return "mock-team-id";
    }
    throw err;
  }
}

export async function setActiveTeam(userId: string, teamId: string): Promise<void> {
  await assertTeamMember(userId, teamId);

  await db
    .update(users)
    .set({ activeTeamId: teamId })
    .where(eq(users.id, userId));
}

export async function createTeam(ownerId: string, name: string): Promise<string> {
  const normalized = name.trim();
  if (!normalized) {
    throw new Error("Team name is required");
  }

  const [created] = await db
    .insert(teams)
    .values({ ownerId, name: normalized })
    .returning({ id: teams.id });

  if (!created) {
    throw new Error("Failed to create team");
  }

  await db.insert(teamMembers).values({
    teamId: created.id,
    userId: ownerId,
    role: "owner",
  });

  return created.id;
}

export async function renameTeam(userId: string, teamId: string, name: string): Promise<void> {
  await assertAdminOrOwner(userId, teamId);

  const normalized = name.trim();
  if (!normalized) {
    throw new Error("Team name is required");
  }

  await db
    .update(teams)
    .set({ name: normalized })
    .where(eq(teams.id, teamId));
}

export async function inviteByEmail(userId: string, teamId: string, email: string): Promise<{ inviteId: string }> {
  await assertAdminOrOwner(userId, teamId);

  const normalizedEmail = email.trim().toLowerCase();
  if (!/^\S+@\S+\.\S+$/.test(normalizedEmail)) {
    throw new Error("Valid email is required");
  }

  const [created] = await db
    .insert(teamInvites)
    .values({
      teamId,
      email: normalizedEmail,
      invitedBy: userId,
    })
    .onConflictDoUpdate({
      target: [teamInvites.teamId, teamInvites.email],
      set: {
        invitedBy: userId,
        createdAt: sql`now()`,
      },
    })
    .returning({ id: teamInvites.id });

  if (!created) {
    throw new Error("Failed to create invite");
  }

  return { inviteId: created.id };
}

export async function acceptInvite(inviteId: string, userId: string): Promise<{ teamId: string }> {
  const [invite] = await db
    .select()
    .from(teamInvites)
    .where(eq(teamInvites.id, inviteId))
    .limit(1);

  if (!invite) {
    throw new Error("Invite not found");
  }

  const [user] = await db
    .select({ email: users.email })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!user) {
    throw new Error("User not found");
  }

  if (user.email.trim().toLowerCase() !== invite.email.trim().toLowerCase()) {
    throw new Error("Invite email does not match current account");
  }

  await db
    .insert(teamMembers)
    .values({
      teamId: invite.teamId,
      userId,
      role: "member",
    })
    .onConflictDoNothing();

  await db
    .update(users)
    .set({ activeTeamId: invite.teamId })
    .where(eq(users.id, userId));

  await db.delete(teamInvites).where(eq(teamInvites.id, invite.id));

  return { teamId: invite.teamId };
}

export async function listTeamMembers(userId: string, teamId: string): Promise<Array<{ id: string; userId: string; email: string; name: string | null; role: TeamRole }>> {
  await assertTeamMember(userId, teamId);

  const rows = await db
    .select({
      id: teamMembers.id,
      userId: teamMembers.userId,
      email: users.email,
      name: users.name,
      role: teamMembers.role,
    })
    .from(teamMembers)
    .innerJoin(users, eq(users.id, teamMembers.userId))
    .where(eq(teamMembers.teamId, teamId))
    .orderBy(users.email);

  return rows.map((row) => ({
    id: row.id,
    userId: row.userId,
    email: row.email,
    name: row.name,
    role: (row.role as TeamRole) ?? "member",
  }));
}

export async function listTeamInvites(userId: string, teamId: string): Promise<Array<{ id: string; email: string; createdAt: Date }>> {
  await assertTeamMember(userId, teamId);

  return db
    .select({ id: teamInvites.id, email: teamInvites.email, createdAt: teamInvites.createdAt })
    .from(teamInvites)
    .where(eq(teamInvites.teamId, teamId))
    .orderBy(teamInvites.email);
}

export async function changeMemberRole(userId: string, teamId: string, memberUserId: string, role: Extract<TeamRole, "admin" | "member">): Promise<void> {
  await assertOwner(userId, teamId);

  await db
    .update(teamMembers)
    .set({ role })
    .where(and(eq(teamMembers.teamId, teamId), eq(teamMembers.userId, memberUserId), sql`${teamMembers.role} <> 'owner'`));
}

export async function removeMember(userId: string, teamId: string, memberUserId: string): Promise<void> {
  await assertAdminOrOwner(userId, teamId);

  const [target] = await db
    .select({ role: teamMembers.role })
    .from(teamMembers)
    .where(and(eq(teamMembers.teamId, teamId), eq(teamMembers.userId, memberUserId)))
    .limit(1);

  if (!target) {
    return;
  }

  if (target.role === "owner") {
    throw new Error("Owner cannot be removed");
  }

  await db
    .delete(teamMembers)
    .where(and(eq(teamMembers.teamId, teamId), eq(teamMembers.userId, memberUserId)));
}

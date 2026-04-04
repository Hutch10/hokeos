import { eq } from "drizzle-orm";
import { compare, hash } from "bcryptjs";
import { getServerSession, type NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { z } from "zod";

import { db } from "@/db";
import { users, accounts, sessions, verificationTokens } from "@/db/schema";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import EmailProvider from "next-auth/providers/email";
import { Resend } from "resend";
import { ensurePersonalTeam, getTeamMembership, getUserTeams, resolveActiveTeamId, type TeamRole } from "@/lib/teams";
import { logger } from "@/lib/logger";
import { auditService } from "@/lib/audit-service";

const credentialsSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(8),
});

export const registerSchema = credentialsSchema.extend({
  name: z.preprocess(
    (value) => {
      if (typeof value !== "string") return undefined;
      const trimmed = value.trim();
      return trimmed.length > 0 ? trimmed : undefined;
    },
    z.string().min(1).max(120).optional(),
  ),
});

export type RegisterInput = z.infer<typeof registerSchema>;

export type CurrentUser = {
  id: string;
  email: string;
  name: string | null;
  role: TeamRole;
  activeTeamId: string;
  activeTeamName: string;
};

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export async function getUserByEmail(email: string) {
  const normalizedEmail = normalizeEmail(email);

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.email, normalizedEmail))
    .limit(1);

  return user ?? null;
}

export async function createUser(input: RegisterInput): Promise<CurrentUser> {
  const normalizedEmail = normalizeEmail(input.email);
  const existingUser = await getUserByEmail(normalizedEmail);

  if (existingUser) {
    throw new Error("An account with this email already exists");
  }

  const passwordHash = await hash(input.password, 12);
  const userId = crypto.randomUUID();

  const [createdUser] = await db
    .insert(users)
    .values({
      id: userId,
      email: normalizedEmail,
      name: input.name ?? null,
      passwordHash,
    })
    .returning({
      id: users.id,
      email: users.email,
      name: users.name,
    });

  if (!createdUser) {
    throw new Error("Failed to create user");
  }

  const teamId = await ensurePersonalTeam(createdUser.id, createdUser.name);

  return {
    id: createdUser.id,
    email: createdUser.email,
    name: createdUser.name ?? null,
    role: "owner",
    activeTeamId: teamId,
    activeTeamName: `${createdUser.name ?? "User"} Personal`,
  };
}

export const authOptions: NextAuthOptions = {
  // @ts-expect-error - DrizzleAdapter type mismatch in some versions, but functional
  adapter: DrizzleAdapter(db, {
    usersTable: users,
    accountsTable: accounts,
    sessionsTable: sessions,
    verificationTokensTable: verificationTokens,
  }),
  secret: process.env.NEXTAUTH_SECRET ?? "dev-only-change-me",
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/login",
  },
  providers: [
    EmailProvider({
      server: {
        host: process.env.EMAIL_SERVER_HOST,
        port: Number(process.env.EMAIL_SERVER_PORT),
        auth: {
          user: process.env.EMAIL_SERVER_USER,
          pass: process.env.EMAIL_SERVER_PASSWORD,
        },
      },
      from: process.env.EMAIL_FROM,
      // Phase 42: Development Proxy / Mock
      // Phase 51: Industrial Resend Transporter
      async sendVerificationRequest({ identifier, url, provider }) {
        const isDev = process.env.NODE_ENV === "development";
        if (isDev && !process.env.RESEND_API_KEY) {
          console.log("--- [HokeOS Sovereign Magic Link (MOCK)] ---");
          console.log(`To: ${identifier}`);
          console.log(`URL: ${url}`);
          console.log("-------------------------------------------");
          return;
        }

        const resend = new Resend(process.env.RESEND_API_KEY);
        try {
          await resend.emails.send({
            from: provider.from,
            to: identifier,
            subject: "Sign in to HokeOS Industrial",
            html: `
              <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
                <h1 style="color: #0f172a; margin-bottom: 24px;">HokeOS Industrial</h1>
                <p style="color: #475569; font-size: 16px; line-height: 1.5;">Click the button below to sign in to your pilot environment.</p>
                <div style="margin: 32px 0;">
                  <a href="${url}" style="background-color: #0f172a; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600;">Sign In</a>
                </div>
                <p style="color: #94a3b8; font-size: 14px;">If you didn't request this email, you can safely ignore it.</p>
                <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
                <p style="color: #94a3b8; font-size: 12px; text-align: center;">Hoke Recovery Systems - Mission Control</p>
              </div>
            `,
          });
          
          await auditService.log({
            teamId: "SYSTEM",
            action: "MAGIC_LINK_SENT",
            category: "AUTH",
            message: `Magic link successfully emitted to ${identifier}`,
            metadata: { identifier }
          });
        } catch (error) {
          logger.error("MAGIC_LINK_EMISSION_FAILED", { identifier, error });
          throw new Error("Failed to send verification email");
        }
      },
    }),
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const parsed = credentialsSchema.safeParse(credentials);
        if (!parsed.success) {
          return null;
        }

        const user = await getUserByEmail(parsed.data.email);
        if (!user?.passwordHash) {
          return null;
        }

        const passwordMatches = await compare(parsed.data.password, user.passwordHash);
        if (!passwordMatches) {
          return null;
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name ?? null,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.userId = user.id;
        token.email = user.email;
        token.name = user.name;

        const activeTeamId = await resolveActiveTeamId(user.id);
        const membership = await getTeamMembership(user.id, activeTeamId);
        token.activeTeamId = activeTeamId;
        token.role = membership?.role ?? "member";
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = (token.userId as string | undefined) ?? token.sub ?? "";
        session.user.email = typeof token.email === "string" ? token.email : session.user.email;
        session.user.name = typeof token.name === "string" || token.name === null
          ? token.name
          : session.user.name;
        session.user.activeTeamId = typeof token.activeTeamId === "string" ? token.activeTeamId : "";
        session.user.role = (token.role as TeamRole | undefined) ?? "member";
      }

      return session;
    },
  },
};

export async function getCurrentUser(): Promise<CurrentUser | null> {
  const isDev = process.env.NODE_ENV === "development";

  try {
    const session = await getServerSession(authOptions);

    // Phase 51: Hardened Audit-First Auth Resolution
    // Explicitly reject mock auth headers in production/pilot contexts.
    const headerList = await headers();
    const authHeader = headerList.get("x-hokeos-mock-auth");
    const isPilot = process.env.PILOT_MODE === "true";

    if (isDev && !isPilot && authHeader === "true") {
      logger.warn("AUTH_BYPASS_DETECTED", { trace: "mock-header", category: "SECURITY" });
      return {
        id: "mock-user-id",
        email: "mock@example.com",
        name: "Mock User (Bypass)",
        role: "owner",
        activeTeamId: "mock-team-id",
        activeTeamName: "Hoke Core Testing (Mock)",
      };
    }

    if (!session?.user?.id || !session.user.email) {
      if (isDev && !isPilot) {
        return {
          id: "mock-user-id",
          email: "mock@example.com",
          name: "Mock User (Fallback)",
          role: "owner",
          activeTeamId: "mock-team-id",
          activeTeamName: "Hoke Core Testing (Mock)",
        };
      }
      return null;
    }

    const activeTeamId = await resolveActiveTeamId(session.user.id, session.user.activeTeamId ?? null);
    const teams = await getUserTeams(session.user.id);
    const activeTeam = teams.find((team) => team.id === activeTeamId);
    const activeTeamName = activeTeam?.name ?? "Team";
    const role = activeTeam?.role ?? "member";

    return {
      id: session.user.id,
      email: session.user.email,
      name: session.user.name ?? null,
      role,
      activeTeamId,
      activeTeamName,
    };
  } catch (err) {
    if (isDev) {
      console.error("Auth System Error, failing over to mock session:", err);
      return {
        id: "mock-user-id",
        email: "mock@example.com",
        name: "Mock User",
        role: "owner",
        activeTeamId: "mock-team-id",
        activeTeamName: "Hoke Core Testing (Mock)",
      };
    }
    throw err;
  }
}

export async function requireCurrentUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  return user;
}

/**
 * Phase 41: RBAC Helper
 * Ensures the current user has at least one of the required roles.
 */
export async function requireRole(allowedRoles: TeamRole | TeamRole[]): Promise<CurrentUser> {
  const user = await requireCurrentUser();
  const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];

  if (!roles.includes(user.role)) {
    throw new Error(`Forbidden: ${roles.join(" or ")} role required (current: ${user.role})`);
  }

  return user;
}

export async function requireAdmin(): Promise<CurrentUser> {
  return requireRole(["owner", "admin"]);
}

import type { DefaultSession } from "next-auth";
import type { TeamRole } from "@/lib/teams";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      activeTeamId?: string;
      role?: TeamRole;
    } & DefaultSession["user"];
  }

  interface User {
    id: string;
    email: string;
    name: string | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    userId?: string;
    activeTeamId?: string;
    role?: TeamRole;
  }
}

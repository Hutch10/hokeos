import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { getResolutionAccuracyReport } from "@/lib/analytics/resolution-service";

export const dynamic = "force-dynamic";

/**
 * Phase 36: Resolution Analytics API
 * Returns monthly audit efficiency and accuracy rates.
 */
export async function GET() {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.activeTeamId) {
    return new Response("Unauthorized or no active team", { status: 401 });
  }

  try {
    const report = await getResolutionAccuracyReport(session.user.activeTeamId);
    return NextResponse.json(report);
  } catch (err) {
    console.error("Failed to generate resolution report:", err);
    return new Response("Internal Server Error", { status: 500 });
  }
}

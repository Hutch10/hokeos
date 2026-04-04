import { count, eq, and, gte } from "drizzle-orm";
import { db } from "@/db";
import { investigations } from "@/db/schema";

export interface MonthlyResolutionReport {
  month: string;
  totalResolved: number;
  verifiedCount: number;
  adjustedCount: number;
  dismissedCount: number;
  accuracyRate: number;
}

/**
 * Phase 36: Advanced Resolution Analytics
 * Calculates aggregate resolution efficiency for the current period.
 */
export async function getResolutionAccuracyReport(teamId: string): Promise<MonthlyResolutionReport> {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  // 1. Fetch counts
  const [totalRow] = await db
    .select({ value: count() })
    .from(investigations)
    .where(and(
      eq(investigations.teamId, teamId),
      gte(investigations.updatedAt, startOfMonth)
    ));

  const [verifiedRow] = await db
    .select({ value: count() })
    .from(investigations)
    .where(and(
      eq(investigations.teamId, teamId),
      eq(investigations.status, "resolved"),
      eq(investigations.resolution, "verified"),
      gte(investigations.updatedAt, startOfMonth)
    ));

  const [adjustedRow] = await db
    .select({ value: count() })
    .from(investigations)
    .where(and(
      eq(investigations.teamId, teamId),
      eq(investigations.status, "resolved"),
      eq(investigations.resolution, "adjusted"),
      gte(investigations.updatedAt, startOfMonth)
    ));

  const [dismissedRow] = await db
    .select({ value: count() })
    .from(investigations)
    .where(and(
      eq(investigations.teamId, teamId),
      eq(investigations.status, "archived"),
      eq(investigations.resolution, "dismissed"),
      gte(investigations.updatedAt, startOfMonth)
    ));

  const total = Number(totalRow?.value ?? 0);
  const verified = Number(verifiedRow?.value ?? 0);
  const adjusted = Number(adjustedRow?.value ?? 0);
  const dismissed = Number(dismissedRow?.value ?? 0);

  // Accuracy Rate = Verified / (Verified + Adjusted)
  // Reflects how often the initial industrial data was correct.
  const accuracyRate = (verified + adjusted) > 0 
    ? (verified / (verified + adjusted)) * 100 
    : 100;

  return {
    month: now.toLocaleString("default", { month: "long", year: "numeric" }),
    totalResolved: total,
    verifiedCount: verified,
    adjustedCount: adjusted,
    dismissedCount: dismissed,
    accuracyRate: Math.round(accuracyRate),
  };
}

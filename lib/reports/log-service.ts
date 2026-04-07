import { and, desc, eq } from "drizzle-orm";

import { db } from "@/db";
import { reports } from "@/db/schema";
import type { ReportType } from "./generators";

export type ReportLogType = ReportType | "summary";

export type RecentReportRow = {
  id: string;
  userId: string;
  teamId: string;
  type: ReportLogType;
  batchId: string | null;
  createdAt: Date;
};

export async function logReportGeneration(
  userId: string,
  teamId: string,
  batchId: string | null,
  type: ReportLogType,
): Promise<void> {
  await db.insert(reports).values({
    userId,
    teamId,
    batchId,
    type,
  });
}

export async function listRecentReports(userId: string, limit = 5): Promise<RecentReportRow[]> {
  const rows = await db
    .select({
      id: reports.id,
      userId: reports.userId,
      teamId: reports.teamId,
      type: reports.type,
      batchId: reports.batchId,
      createdAt: reports.createdAt,
    })
    .from(reports)
    .where(and(eq(reports.userId, userId)))
    .orderBy(desc(reports.createdAt))
    .limit(Math.max(1, Math.min(limit, 25)));

  return (rows as any[]).map((row) => ({
    id: row.id,
    userId: row.userId,
    teamId: row.teamId,
    type: (row.type as ReportLogType) ?? "melt",
    batchId: row.batchId,
    createdAt: row.createdAt,
  }));
}

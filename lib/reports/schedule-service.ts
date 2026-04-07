import { and, asc, desc, eq, isNull, lte } from "drizzle-orm";

import { db } from "@/db";
import { batches, reportSchedules, reports } from "@/db/schema";

export type ScheduledReportType = "melt" | "settlement" | "assay" | "summary";
export type ReportCadence = "daily" | "weekly" | "monthly";

export type ReportScheduleRow = {
  id: string;
  userId: string;
  teamId: string;
  type: ScheduledReportType;
  batchId: string | null;
  cadence: ReportCadence;
  nextRunAt: Date;
  isPaused: boolean;
  createdAt: Date;
  lastRunAt: Date | null;
};

export function computeNextRunAt(cadence: ReportCadence, fromDate: Date): Date {
  const base = new Date(fromDate);

  switch (cadence) {
    case "daily":
      base.setUTCDate(base.getUTCDate() + 1);
      return base;
    case "weekly":
      base.setUTCDate(base.getUTCDate() + 7);
      return base;
    case "monthly":
      return new Date(
        Date.UTC(
          base.getUTCFullYear(),
          base.getUTCMonth() + 1,
          base.getUTCDate(),
          base.getUTCHours(),
          base.getUTCMinutes(),
          base.getUTCSeconds(),
          base.getUTCMilliseconds(),
        ),
      );
  }
}

function normalizeScheduledType(value: string): ScheduledReportType {
  if (value === "melt" || value === "settlement" || value === "assay" || value === "summary") {
    return value;
  }

  throw new Error("Invalid schedule type");
}

function normalizeCadence(value: string): ReportCadence {
  if (value === "daily" || value === "weekly" || value === "monthly") {
    return value;
  }

  throw new Error("Invalid cadence");
}

async function assertBatchOwnership(userId: string, batchId: string): Promise<void> {
  const [row] = await db
    .select({ id: batches.id })
    .from(batches)
    .where(and(eq(batches.id, batchId), eq(batches.userId, userId)))
    .limit(1);

  if (!row) {
    throw new Error("Batch not found");
  }
}

async function loadLastRunAt(
  userId: string,
  type: ScheduledReportType,
  batchId: string | null,
): Promise<Date | null> {
  const [row] = await db
    .select({ createdAt: reports.createdAt })
    .from(reports)
    .where(
      and(
        eq(reports.userId, userId),
        eq(reports.type, type),
        batchId ? eq(reports.batchId, batchId) : isNull(reports.batchId),
      ),
    )
    .orderBy(desc(reports.createdAt))
    .limit(1);

  return row?.createdAt ?? null;
}

export async function listReportSchedules(userId: string): Promise<ReportScheduleRow[]> {
  const rows = await db
    .select()
    .from(reportSchedules)
    .where(eq(reportSchedules.userId, userId))
    .orderBy(asc(reportSchedules.nextRunAt), asc(reportSchedules.createdAt));

  const enriched = await Promise.all(
    (rows as any[]).map(async (row) => ({
      id: row.id,
      userId: row.userId,
      teamId: row.teamId,
      type: normalizeScheduledType(row.type),
      batchId: row.batchId,
      cadence: normalizeCadence(row.cadence),
      nextRunAt: row.nextRunAt,
      isPaused: row.isPaused,
      createdAt: row.createdAt,
      lastRunAt: await loadLastRunAt(userId, normalizeScheduledType(row.type), row.batchId),
    })),
  );

  return enriched;
}

export async function createReportSchedule(input: {
  userId: string;
  teamId: string;
  type: ScheduledReportType;
  batchId?: string | null;
  cadence: ReportCadence;
  firstRunAt?: Date;
}): Promise<ReportScheduleRow> {
  const type = normalizeScheduledType(input.type);
  const cadence = normalizeCadence(input.cadence);
  const batchId = input.batchId?.trim() ? input.batchId.trim() : null;

  if (type === "summary" && batchId !== null) {
    throw new Error("Summary schedules cannot target a specific batch");
  }

  if (type !== "summary" && !batchId) {
    throw new Error("Batch report schedules require a batch");
  }

  if (batchId) {
    await assertBatchOwnership(input.userId, batchId);
  }

  const firstRunAt = input.firstRunAt ?? computeNextRunAt(cadence, new Date());

  const [created] = await db
    .insert(reportSchedules)
    .values({
      userId: input.userId,
      teamId: input.teamId,
      type,
      batchId,
      cadence,
      nextRunAt: firstRunAt,
      isPaused: false,
    })
    .returning();

  if (!created) {
    throw new Error("Failed to create schedule");
  }

  return {
    id: created.id,
    userId: created.userId,
    teamId: created.teamId,
    type,
    batchId: created.batchId,
    cadence,
    nextRunAt: created.nextRunAt,
    isPaused: created.isPaused,
    createdAt: created.createdAt,
    lastRunAt: null,
  };
}

export async function updateScheduleCadence(input: {
  scheduleId: string;
  userId: string;
  cadence: ReportCadence;
}): Promise<void> {
  const cadence = normalizeCadence(input.cadence);
  const [current] = await db
    .select()
    .from(reportSchedules)
    .where(and(eq(reportSchedules.id, input.scheduleId), eq(reportSchedules.userId, input.userId)))
    .limit(1);

  if (!current) {
    throw new Error("Schedule not found");
  }

  const now = new Date();
  const baseline = current.nextRunAt > now ? current.nextRunAt : now;

  await db
    .update(reportSchedules)
    .set({
      cadence,
      nextRunAt: computeNextRunAt(cadence, baseline),
    })
    .where(and(eq(reportSchedules.id, input.scheduleId), eq(reportSchedules.userId, input.userId)));
}

export async function setSchedulePaused(input: {
  scheduleId: string;
  userId: string;
  paused: boolean;
}): Promise<void> {
  const [current] = await db
    .select()
    .from(reportSchedules)
    .where(and(eq(reportSchedules.id, input.scheduleId), eq(reportSchedules.userId, input.userId)))
    .limit(1);

  if (!current) {
    throw new Error("Schedule not found");
  }

  const updates: {
    isPaused: boolean;
    nextRunAt?: Date;
  } = {
    isPaused: input.paused,
  };

  if (!input.paused && current.nextRunAt <= new Date()) {
    updates.nextRunAt = computeNextRunAt(normalizeCadence(current.cadence), new Date());
  }

  await db
    .update(reportSchedules)
    .set(updates)
    .where(and(eq(reportSchedules.id, input.scheduleId), eq(reportSchedules.userId, input.userId)));
}

export async function deleteReportSchedule(scheduleId: string, userId: string): Promise<void> {
  await db
    .delete(reportSchedules)
    .where(and(eq(reportSchedules.id, scheduleId), eq(reportSchedules.userId, userId)));
}

export async function listDueSchedules(now = new Date(), limit = 50): Promise<ReportScheduleRow[]> {
  const rows = await db
    .select()
    .from(reportSchedules)
    .where(and(eq(reportSchedules.isPaused, false), lte(reportSchedules.nextRunAt, now)))
    .orderBy(asc(reportSchedules.nextRunAt))
    .limit(Math.max(1, Math.min(limit, 500)));

  const result = await Promise.all(
    (rows as any[]).map(async (row) => ({
      id: row.id,
      userId: row.userId,
      teamId: row.teamId,
      type: normalizeScheduledType(row.type),
      batchId: row.batchId,
      cadence: normalizeCadence(row.cadence),
      nextRunAt: row.nextRunAt,
      isPaused: row.isPaused,
      createdAt: row.createdAt,
      lastRunAt: await loadLastRunAt(row.userId, normalizeScheduledType(row.type), row.batchId),
    })),
  );

  return result;
}

export async function updateScheduleNextRun(scheduleId: string, nextRunAt: Date): Promise<void> {
  await db
    .update(reportSchedules)
    .set({ nextRunAt })
    .where(eq(reportSchedules.id, scheduleId));
}

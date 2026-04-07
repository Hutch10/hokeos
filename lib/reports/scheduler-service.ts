import { eq } from "drizzle-orm";

import { db } from "@/db";
import { users } from "@/db/schema";
import { sendReportEmail } from "@/lib/email";
import { getBillingSummary } from "@/lib/billing/service";
import { getBatchById } from "@/lib/metals/batch-service";

import { generateAssayReport, generateMeltSheet, generateSettlementSheet } from "./generators";
import { logReportGeneration } from "./log-service";
import { generateSummaryReport } from "./summary-generator";
import {
  computeNextRunAt,
  listDueSchedules,
  type ReportScheduleRow,
  updateScheduleNextRun,
} from "./schedule-service";

export type SchedulerRunResult = {
  processed: number;
  succeeded: number;
  failed: number;
  skipped: number;
  details: Array<{
    scheduleId: string;
    status: "sent" | "skipped" | "failed";
    message: string;
  }>;
};

function displayReferenceForBatch(input: { createdAt: Date | string | null | undefined; customerReference?: string | null }): string | null {
  if (input.customerReference?.trim()) {
    return input.customerReference.trim();
  }

  if (input.createdAt) {
    return `batch-${new Date(input.createdAt).toISOString().slice(0, 10)}`;
  }

  return null;
}

async function loadUser(userId: string): Promise<{ id: string; email: string; name: string | null } | null> {
  const [row] = await db
    .select({ id: users.id, email: users.email, name: users.name })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  return row ?? null;
}

async function processSingleSchedule(schedule: ReportScheduleRow): Promise<{ status: "sent" | "skipped" | "failed"; message: string }> {
  const user = await loadUser(schedule.userId);
  if (!user) {
    return { status: "failed", message: "User not found" };
  }

  const billing = await getBillingSummary(schedule.teamId);
  if (!billing.canExport) {
    await updateScheduleNextRun(schedule.id, computeNextRunAt(schedule.cadence, schedule.nextRunAt));
    return { status: "skipped", message: "Billing does not allow scheduled reports; advanced schedule" };
  }

  try {
    if (schedule.type === "summary") {
      const pdf = await generateSummaryReport({ userId: user.id, asOf: schedule.nextRunAt });

      await sendReportEmail(user, pdf, {
        reportType: "summary",
        scheduledFor: schedule.nextRunAt,
      });

      await logReportGeneration(user.id, schedule.teamId, null, "summary");
      await updateScheduleNextRun(schedule.id, computeNextRunAt(schedule.cadence, schedule.nextRunAt));
      return { status: "sent", message: "Summary report delivered" };
    }

    if (!schedule.batchId) {
      return { status: "failed", message: "Batch schedule missing batchId" };
    }

    const batch = await getBatchById(schedule.batchId, user.id);
    if (!batch) {
      await updateScheduleNextRun(schedule.id, computeNextRunAt(schedule.cadence, schedule.nextRunAt));
      return { status: "skipped", message: "Batch not found; advanced schedule" };
    }

    const report = schedule.type === "melt"
      ? await generateMeltSheet(batch as any)
      : schedule.type === "settlement"
        ? await generateSettlementSheet(batch as any)
        : await generateAssayReport(batch as any);

    await sendReportEmail(user, report.pdf, {
      reportType: schedule.type,
      scheduledFor: schedule.nextRunAt,
      customerEmail: batch.customerEmail,
      publicReference: displayReferenceForBatch({
        createdAt: batch.createdAt,
        customerReference: batch.customerReference,
      }),
    });

    await logReportGeneration(user.id, schedule.teamId, batch.id, schedule.type);
    await updateScheduleNextRun(schedule.id, computeNextRunAt(schedule.cadence, schedule.nextRunAt));

    return { status: "sent", message: `${schedule.type} report delivered` };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown scheduler error";
    return { status: "failed", message };
  }
}

export async function runDueReportSchedules(input?: { now?: Date; limit?: number }): Promise<SchedulerRunResult> {
  const now = input?.now ?? new Date();
  const limit = input?.limit ?? 50;

  const schedules = await listDueSchedules(now, limit);

  const result: SchedulerRunResult = {
    processed: schedules.length,
    succeeded: 0,
    failed: 0,
    skipped: 0,
    details: [],
  };

  for (const schedule of schedules) {
    const output = await processSingleSchedule(schedule);

    if (output.status === "sent") {
      result.succeeded += 1;
    } else if (output.status === "skipped") {
      result.skipped += 1;
    } else {
      result.failed += 1;
    }

    result.details.push({
      scheduleId: schedule.id,
      status: output.status,
      message: output.message,
    });
  }

  return result;
}

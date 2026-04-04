import { 
  type ReportScheduleRow, 
  type RecentReportRow, 
  type ReportCadence, 
  type ScheduledReportType, 
  type SchedulerRunResult 
} from "./index";

// Generators
export async function generateAssayReport() { return { url: "mock-url" }; }
export async function generateMeltSheet() { return { url: "mock-url" }; }
export async function generateSettlementSheet() { return { url: "mock-url" }; }
export async function generateSummaryReport() { return { url: "mock-url" }; }

// Schedule Service
export function computeNextRunAt(cadence: ReportCadence, base?: Date): Date {
  return new Date(Date.now() + 24 * 60 * 60 * 1000);
}

export async function createReportSchedule() { return { id: "mock-sch-1" }; }
export async function deleteReportSchedule() { return { success: true }; }
export async function listDueSchedules() { return []; }

export async function listReportSchedules(userId: string): Promise<ReportScheduleRow[]> {
  return [
    {
      id: "mock-sch-1",
      teamId: "mock-team",
      userId,
      type: "assay" as ScheduledReportType,
      batchId: "mock-batch-1",
      cadence: "weekly" as ReportCadence,
      nextRunAt: new Date(),
      lastRunAt: new Date(),
      isPaused: false,
      createdAt: new Date(),
    }
  ];
}

export async function setSchedulePaused() { return { success: true }; }
export async function updateScheduleCadence() { return { success: true }; }
export async function updateScheduleNextRun() { return { success: true }; }

// Scheduler
export async function runDueReportSchedules(): Promise<SchedulerRunResult> {
  return {
    processed: 0,
    succeeded: 0,
    failed: 0,
    skipped: 0,
    details: [],
  };
}

// Log
export async function listRecentReports(userId: string): Promise<RecentReportRow[]> {
  return [
    {
      id: "mock-log-1",
      userId,
      teamId: "mock-team",
      type: "settlement",
      batchId: "mock-batch-1",
      createdAt: new Date(),
    }
  ];
}

export async function logReportGeneration() { return { id: "mock-log-gen" }; }

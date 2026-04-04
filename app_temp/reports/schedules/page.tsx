import Link from "next/link";
import { revalidatePath } from "next/cache";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireCurrentUser } from "@/lib/auth";
import {
  getBatchService,
  getBillingService,
  getReportService,
} from "@/lib/mock-data-gate";
import type { ReportCadence, ScheduledReportType } from "@/lib/reports";

type SchedulesSearchParams = Record<string, string | string[] | undefined>;

const cadenceOptions: ReportCadence[] = ["daily", "weekly", "monthly"];
const reportTypeOptions: ScheduledReportType[] = ["melt", "settlement", "assay", "summary"];

function parseCadence(value: FormDataEntryValue | null): ReportCadence {
  if (value === "daily" || value === "weekly" || value === "monthly") {
    return value;
  }

  throw new Error("Invalid cadence");
}

function parseReportType(value: FormDataEntryValue | null): ScheduledReportType {
  if (value === "melt" || value === "settlement" || value === "assay" || value === "summary") {
    return value;
  }

  throw new Error("Invalid report type");
}

async function createScheduleAction(formData: FormData) {
  "use server";

  const user = await requireCurrentUser();
  const isMock = formData.get("isMock") === "true";
  const reportService = await getReportService(isMock);
  const billingService = await getBillingService(isMock);
  
  const billing = await billingService.getBillingSummary(user.activeTeamId);
  if (!billing.canExport) {
    throw new Error("Scheduled reports require Pro or Enterprise");
  }

  const type = parseReportType(formData.get("type"));
  const cadence = parseCadence(formData.get("cadence"));
  const rawBatchId = formData.get("batchId");
  const batchId = typeof rawBatchId === "string" && rawBatchId.trim() ? rawBatchId.trim() : null;

  await reportService.createReportSchedule({
    userId: user.id,
    teamId: user.activeTeamId,
    type,
    cadence,
    batchId,
  });

  revalidatePath("/reports/schedules");
  revalidatePath("/dashboard");
}

async function updateCadenceAction(formData: FormData) {
  "use server";

  const user = await requireCurrentUser();
  const isMock = formData.get("isMock") === "true";
  const reportService = await getReportService(isMock);
  const billingService = await getBillingService(isMock);
  
  const billing = await billingService.getBillingSummary(user.activeTeamId);
  if (!billing.canExport) {
    throw new Error("Scheduled reports require Pro or Enterprise");
  }

  const scheduleId = String(formData.get("scheduleId") ?? "").trim();
  const cadence = parseCadence(formData.get("cadence"));

  if (!scheduleId) {
    throw new Error("Schedule ID required");
  }

  await reportService.updateScheduleCadence({
    userId: user.id,
    scheduleId,
    cadence,
  });

  revalidatePath("/reports/schedules");
  revalidatePath("/dashboard");
}

async function pauseAction(formData: FormData) {
  "use server";

  const user = await requireCurrentUser();
  const isMock = formData.get("isMock") === "true";
  const reportService = await getReportService(isMock);
  const billingService = await getBillingService(isMock);

  const billing = await billingService.getBillingSummary(user.activeTeamId);
  if (!billing.canExport) {
    throw new Error("Scheduled reports require Pro or Enterprise");
  }

  const scheduleId = String(formData.get("scheduleId") ?? "").trim();

  if (!scheduleId) {
    throw new Error("Schedule ID required");
  }

  await reportService.setSchedulePaused({
    userId: user.id,
    scheduleId,
    paused: true,
  });

  revalidatePath("/reports/schedules");
  revalidatePath("/dashboard");
}

async function resumeAction(formData: FormData) {
  "use server";

  const user = await requireCurrentUser();
  const isMock = formData.get("isMock") === "true";
  const reportService = await getReportService(isMock);
  const billingService = await getBillingService(isMock);

  const billing = await billingService.getBillingSummary(user.activeTeamId);
  if (!billing.canExport) {
    throw new Error("Scheduled reports require Pro or Enterprise");
  }

  const scheduleId = String(formData.get("scheduleId") ?? "").trim();

  if (!scheduleId) {
    throw new Error("Schedule ID required");
  }

  await reportService.setSchedulePaused({
    userId: user.id,
    scheduleId,
    paused: false,
  });

  revalidatePath("/reports/schedules");
  revalidatePath("/dashboard");
}

async function deleteAction(formData: FormData) {
  "use server";

  const user = await requireCurrentUser();
  const isMock = formData.get("isMock") === "true";
  const reportService = await getReportService(isMock);
  const billingService = await getBillingService(isMock);

  const billing = await billingService.getBillingSummary(user.activeTeamId);
  if (!billing.canExport) {
    throw new Error("Scheduled reports require Pro or Enterprise");
  }

  const scheduleId = String(formData.get("scheduleId") ?? "").trim();

  if (!scheduleId) {
    throw new Error("Schedule ID required");
  }

  await reportService.deleteReportSchedule(scheduleId, user.id);

  revalidatePath("/reports/schedules");
  revalidatePath("/dashboard");
}

export default async function ReportSchedulesPage({
  searchParams,
}: {
  searchParams?: Promise<SchedulesSearchParams>;
}) {
  const user = await requireCurrentUser();
  const params = (await searchParams) ?? {};
  const isMockRequested = params.mock === "true";

  const reportService = await getReportService(isMockRequested);
  const batchService = await getBatchService(isMockRequested);
  const billingService = await getBillingService(isMockRequested);

  const [billing, schedules, batches] = await Promise.all([
    billingService.getBillingSummary(user.activeTeamId),
    reportService.listReportSchedules(user.id),
    batchService.listBatches(user.id),
  ]);

  if (!billing.canExport) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-zinc-100 via-white to-zinc-100 px-4 py-10 sm:px-6 lg:px-8">
        <section className="mx-auto w-full max-w-4xl space-y-6">
          <header className="space-y-2">
            <Link href={isMockRequested ? "/dashboard?mock=true" : "/dashboard"} className="text-sm text-zinc-500 hover:text-zinc-900">
              ← Back to Dashboard
            </Link>
            <h1 className="text-3xl font-semibold tracking-tight text-zinc-900">Scheduled Reports</h1>
          </header>

          <Card>
            <CardHeader>
              <CardTitle>Scheduled Reports Require Pro</CardTitle>
              <CardDescription>
                Upgrade to Pro or Enterprise to automate report delivery.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link
                href="/billing"
                className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700"
              >
                Upgrade Plan
              </Link>
            </CardContent>
          </Card>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-zinc-100 via-white to-zinc-100 px-4 py-10 sm:px-6 lg:px-8">
      <section className="mx-auto w-full max-w-6xl space-y-6">
        <header className="space-y-2">
          <Link href={isMockRequested ? "/dashboard?mock=true" : "/dashboard"} className="text-sm text-zinc-500 hover:text-zinc-900">
            ← Back to Dashboard
          </Link>
          <h1 className="text-3xl font-semibold tracking-tight text-zinc-900">Scheduled Reports</h1>
          <p className="text-zinc-600">
            Create deterministic server-side schedules for melt, settlement, assay, and summary reports.
          </p>
        </header>

        <Card>
          <CardHeader>
            <CardTitle>Create Schedule</CardTitle>
            <CardDescription>
              Summary reports run account-wide. Other report types require a target batch.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form action={createScheduleAction} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <input type="hidden" name="isMock" value={String(isMockRequested)} />
              <div className="space-y-1">
                <label htmlFor="type" className="text-xs font-medium text-zinc-600">Type</label>
                <select
                  id="type"
                  name="type"
                  defaultValue="melt"
                  className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm"
                >
                  {reportTypeOptions.map((type) => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label htmlFor="cadence" className="text-xs font-medium text-zinc-600">Cadence</label>
                <select
                  id="cadence"
                  name="cadence"
                  defaultValue="weekly"
                  className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm"
                >
                  {cadenceOptions.map((cadence) => (
                    <option key={cadence} value={cadence}>{cadence}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1 sm:col-span-2">
                <label htmlFor="batchId" className="text-xs font-medium text-zinc-600">Batch (optional for summary)</label>
                <select
                  id="batchId"
                  name="batchId"
                  defaultValue=""
                  className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm"
                >
                  <option value="">Summary schedule (no batch)</option>
                  {batches.map((batch) => (
                    <option key={batch.id} value={batch.id}>
                      {batch.id.slice(0, 8)}... · {new Date(batch.createdAt).toLocaleDateString("en-US")}
                    </option>
                  ))}
                </select>
              </div>

              <div className="sm:col-span-2 lg:col-span-4">
                <button
                  type="submit"
                  className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700"
                >
                  Create Schedule
                </button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Existing Schedules</CardTitle>
            <CardDescription>
              Edit cadence, pause/resume delivery, or remove schedules.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {schedules.length === 0 ? (
              <p className="text-sm text-zinc-500">No schedules yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-zinc-200 text-left text-xs text-zinc-500">
                      <th className="pb-2 pr-4 font-medium">Type</th>
                      <th className="pb-2 pr-4 font-medium">Batch</th>
                      <th className="pb-2 pr-4 font-medium">Cadence</th>
                      <th className="pb-2 pr-4 font-medium">Next Run</th>
                      <th className="pb-2 pr-4 font-medium">Last Run</th>
                      <th className="pb-2 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {schedules.map((schedule) => (
                      <tr key={schedule.id}>
                        <td className="py-2 pr-4 capitalize text-zinc-900">
                          {schedule.type}
                          {schedule.isPaused ? " (paused)" : ""}
                        </td>
                        <td className="py-2 pr-4 text-zinc-700">
                          {schedule.batchId ? (
                            <Link href={`/batches/${schedule.batchId}${isMockRequested ? "?mock=true" : ""}`} className="text-cyan-700 hover:text-cyan-900">
                              {schedule.batchId.slice(0, 8)}...
                            </Link>
                          ) : (
                            "summary"
                          )}
                        </td>
                        <td className="py-2 pr-4">
                          <form action={updateCadenceAction} className="flex items-center gap-2">
                            <input type="hidden" name="scheduleId" value={schedule.id} />
                            <input type="hidden" name="isMock" value={String(isMockRequested)} />
                            <select
                              name="cadence"
                              defaultValue={schedule.cadence}
                              aria-label={`Cadence for schedule ${schedule.id}`}
                              className="rounded-md border border-zinc-300 bg-white px-2 py-1 text-xs"
                            >
                              {cadenceOptions.map((cadence) => (
                                <option key={cadence} value={cadence}>{cadence}</option>
                              ))}
                            </select>
                            <button
                              type="submit"
                              className="rounded-md border border-zinc-300 bg-white px-2 py-1 text-xs font-medium text-zinc-800 hover:bg-zinc-50"
                            >
                              Update
                            </button>
                          </form>
                        </td>
                        <td className="py-2 pr-4 text-zinc-700">
                          {new Date(schedule.nextRunAt).toLocaleString("en-US", {
                            dateStyle: "medium",
                            timeStyle: "short",
                          })}
                        </td>
                        <td className="py-2 pr-4 text-zinc-700">
                          {schedule.lastRunAt
                            ? new Date(schedule.lastRunAt).toLocaleString("en-US", {
                                dateStyle: "medium",
                                timeStyle: "short",
                              })
                            : "never"}
                        </td>
                        <td className="py-2">
                          <div className="flex flex-wrap gap-2">
                            {schedule.isPaused ? (
                              <form action={resumeAction}>
                                <input type="hidden" name="scheduleId" value={schedule.id} />
                                <input type="hidden" name="isMock" value={String(isMockRequested)} />
                                <button
                                  type="submit"
                                  className="rounded-md border border-emerald-300 bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-800 hover:bg-emerald-100"
                                >
                                  Resume
                                </button>
                              </form>
                            ) : (
                              <form action={pauseAction}>
                                <input type="hidden" name="scheduleId" value={schedule.id} />
                                <input type="hidden" name="isMock" value={String(isMockRequested)} />
                                <button
                                  type="submit"
                                  className="rounded-md border border-amber-300 bg-amber-50 px-2 py-1 text-xs font-medium text-amber-800 hover:bg-amber-100"
                                >
                                  Pause
                                </button>
                              </form>
                            )}

                            <form action={deleteAction}>
                              <input type="hidden" name="scheduleId" value={schedule.id} />
                              <input type="hidden" name="isMock" value={String(isMockRequested)} />
                              <button
                                type="submit"
                                className="rounded-md border border-rose-300 bg-rose-50 px-2 py-1 text-xs font-medium text-rose-700 hover:bg-rose-100"
                              >
                                Delete
                              </button>
                            </form>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </section>
    </main>
  );
}

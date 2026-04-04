import { getCurrentUser } from "@/lib/auth";
import { runDueReportSchedules } from "@/lib/reports";

export const runtime = "nodejs";

function hasValidSchedulerToken(req: Request): boolean {
  const expected = process.env.REPORT_SCHEDULER_TOKEN;
  if (!expected) {
    return false;
  }

  const auth = req.headers.get("authorization");
  if (!auth?.startsWith("Bearer ")) {
    return false;
  }

  const provided = auth.slice("Bearer ".length).trim();
  return provided === expected;
}

export async function POST(req: Request) {
  try {
    const byToken = hasValidSchedulerToken(req);

    if (!byToken) {
      const user = await getCurrentUser();
      if (!user) {
        return Response.json(
          { ok: false, error: "Unauthorized. Provide scheduler bearer token or authenticated session." },
          { status: 401 },
        );
      }
    }

    const body = (await req.json().catch(() => ({}))) as { limit?: number };
    const limit = Number(body.limit ?? 50);

    const result = await runDueReportSchedules({
      now: new Date(),
      limit: Number.isFinite(limit) ? limit : 50,
    });

    return Response.json({ ok: true, data: result });
  } catch (error) {
    console.error("[POST /api/reports/scheduler/run] error:", error);
    return Response.json({ ok: false, error: "Failed to run report scheduler" }, { status: 500 });
  }
}

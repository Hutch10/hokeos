import { backfillRecentDailyPrices, ingestDailySpotPrices } from "@/lib/prices";
import { getCurrentUser } from "@/lib/auth";

function hasValidIngestToken(req: Request): boolean {
  const expected = process.env.PRICE_INGEST_TOKEN;
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
    const byToken = hasValidIngestToken(req);

    if (!byToken) {
      const user = await getCurrentUser();
      if (!user) {
        return Response.json(
          { ok: false, error: "Unauthorized. Use a valid bearer token or authenticated session." },
          { status: 401 },
        );
      }
    }

    const body = (await req.json().catch(() => ({}))) as { backfillDays?: number };
    const backfillDays = Number(body.backfillDays ?? 0);

    if (Number.isFinite(backfillDays) && backfillDays > 1) {
      const results = await backfillRecentDailyPrices(backfillDays);
      return Response.json({
        ok: true,
        data: {
          mode: "backfill",
          days: results.length,
          insertedCount: results.reduce((sum, row) => sum + row.insertedCount, 0),
          skippedCount: results.reduce((sum, row) => sum + row.skippedCount, 0),
          latest: results.at(-1) ?? null,
        },
      });
    }

    const result = await ingestDailySpotPrices();

    return Response.json({
      ok: true,
      data: {
        mode: "daily",
        ...result,
      },
    });
  } catch (error) {
    console.error("[POST /api/prices/ingest] error:", error);
    return Response.json({ ok: false, error: "Failed to ingest metal prices" }, { status: 500 });
  }
}

import { buildComparisonPdf } from "@/lib/export/pdf-builder";
import { getBatchById } from "@/lib/metals/batch-service";
import { batchApiResponseSchema, type BatchApiData } from "@/lib/validations/calculator";
import { getCurrentUser } from "@/lib/auth";
import { assertFeatureAccess, BillingRestrictionError } from "@/lib/billing/service";

export const runtime = "nodejs";

function parseIds(searchParams: URLSearchParams): string[] {
  const raw = searchParams.get("ids");
  if (!raw) return [];

  const ids = raw
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);

  return Array.from(new Set(ids));
}

async function loadBatches(ids: string[], userId: string): Promise<BatchApiData[]> {
  const batches: BatchApiData[] = [];

  for (const id of ids) {
    const rawBatch = await getBatchById(id, userId);
    if (!rawBatch) continue;

    const parsed = batchApiResponseSchema.safeParse({ ok: true, data: rawBatch });
    if (!parsed.success || !parsed.data.ok || !parsed.data.data) continue;

    batches.push(parsed.data.data);
  }

  return batches;
}

export async function GET(req: Request) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return Response.json({ ok: false, error: "Authentication required" }, { status: 401 });
    }

    await assertFeatureAccess(user.id, "exports");
    await assertFeatureAccess(user.id, "comparison");

    const { searchParams } = new URL(req.url);
    const ids = parseIds(searchParams);

    if (ids.length < 2) {
      return Response.json(
        { ok: false, error: "Provide at least two batch ids in query param: ids" },
        { status: 400 },
      );
    }

    const batches = await loadBatches(ids, user.id);

    if (batches.length < 2) {
      return Response.json(
        { ok: false, error: "Fewer than two valid batches found for export" },
        { status: 404 },
      );
    }

    const pdf = await buildComparisonPdf(batches);

    return new Response(new Uint8Array(pdf), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="batch-comparison-${Date.now()}.pdf"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    if (err instanceof BillingRestrictionError) {
      return Response.json({ ok: false, error: err.message }, { status: 403 });
    }

    console.error("[GET /api/batches/compare/export/pdf] error:", err);
    return Response.json({ ok: false, error: "Failed to export comparison PDF" }, { status: 500 });
  }
}

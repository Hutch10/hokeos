import { buildBatchPdf } from "@/lib/export/pdf-builder";
import { getBatchById } from "@/lib/metals/batch-service";
import { batchApiResponseSchema } from "@/lib/validations/calculator";
import { getCurrentUser } from "@/lib/auth";
import { assertFeatureAccess, BillingRestrictionError } from "@/lib/billing/service";

export const runtime = "nodejs";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ batchId: string }> },
) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return Response.json({ ok: false, error: "Authentication required" }, { status: 401 });
    }

    await assertFeatureAccess(user.id, "exports");

    const { batchId } = await params;

    if (!batchId || !batchId.trim()) {
      return Response.json({ ok: false, error: "Invalid batchId" }, { status: 400 });
    }

    const rawBatch = await getBatchById(batchId, user.id);
    if (!rawBatch) {
      return Response.json({ ok: false, error: "Batch not found" }, { status: 404 });
    }

    const parsed = batchApiResponseSchema.safeParse({ ok: true, data: rawBatch });
    if (!parsed.success || !parsed.data.ok || !parsed.data.data) {
      return Response.json({ ok: false, error: "Invalid batch payload" }, { status: 500 });
    }

    const pdf = await buildBatchPdf(parsed.data.data);

    return new Response(new Uint8Array(pdf), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="batch-${batchId}.pdf"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    if (err instanceof BillingRestrictionError) {
      return Response.json({ ok: false, error: err.message }, { status: 403 });
    }

    console.error("[GET /api/batches/[batchId]/export/pdf] error:", err);
    return Response.json({ ok: false, error: "Failed to export batch PDF" }, { status: 500 });
  }
}

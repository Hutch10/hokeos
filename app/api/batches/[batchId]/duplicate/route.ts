import { duplicateBatch } from "@/lib/metals";
import { requireCurrentUser } from "@/lib/auth";
import { BillingRestrictionError } from "@/lib/billing/service";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ batchId: string }> },
) {
  const { batchId } = await params;

  if (!batchId || !batchId.trim()) {
    return Response.json({ ok: false, error: "Invalid batchId" }, { status: 400 });
  }

  try {
    const user = await requireCurrentUser();
    const duplicated = await duplicateBatch(batchId, user.id, user.activeTeamId);

    return Response.redirect(new URL(`/batches/${duplicated.id}?toast=duplicated`, req.url), 303);
  } catch (err) {
    if (err instanceof BillingRestrictionError) {
      return Response.redirect(new URL("/batches?toast=duplicate-limit", req.url), 303);
    }

    const message = err instanceof Error ? err.message : "Failed to duplicate batch";
    if (message === "Batch not found") {
      return Response.redirect(new URL(`/batches/${batchId}?toast=duplicate-error`, req.url), 303);
    }

    console.error("[POST /api/batches/[batchId]/duplicate] error:", err);
    return Response.redirect(new URL(`/batches/${batchId}?toast=duplicate-error`, req.url), 303);
  }
}

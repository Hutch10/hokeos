import { getBatchById, updateBatch, updateBatchSchema } from "@/lib/metals";
import { getCurrentUser, requireCurrentUser } from "@/lib/auth";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ batchId: string }> },
) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return Response.json({ ok: false, error: "Authentication required" }, { status: 401 });
    }

    const { batchId } = await params;

    if (!batchId || !batchId.trim()) {
      return Response.json({ ok: false, error: "Invalid batchId" }, { status: 400 });
    }

    const result = await getBatchById(batchId, user.id);
    console.log(`[GET /api/batches/${batchId}] userId=${user.id} found=${result !== null}`);

    if (!result) {
      return Response.json({ ok: false, error: "Batch not found" }, { status: 404 });
    }

    return Response.json({ ok: true, data: result });
  } catch (err) {
    console.error(`[GET /api/batches/[batchId]] error:`, err);
    return Response.json({ ok: false, error: "Failed to retrieve batch" }, { status: 500 });
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ batchId: string }> },
) {
  try {
    const user = await requireCurrentUser();
    const { batchId } = await params;

    if (!batchId || !batchId.trim()) {
      return Response.json({ ok: false, error: "Invalid batchId" }, { status: 400 });
    }

    const body = await req.json();
    const parsed = updateBatchSchema.safeParse(body);

    if (!parsed.success) {
      return Response.json(
        { ok: false, error: "Invalid input", details: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const updated = await updateBatch(batchId, user.id, user.activeTeamId, parsed.data);
    return Response.json({ ok: true, data: updated });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to update batch";

    if (message === "Batch not found") {
      return Response.json({ ok: false, error: "Batch not found" }, { status: 404 });
    }

    if (message === "Batch is locked for settlement and cannot be modified.") {
      return Response.json({ ok: false, error: message }, { status: 403 });
    }

    console.error("[PATCH /api/batches/[batchId]] error:", err);
    return Response.json({ ok: false, error: "Failed to update batch" }, { status: 500 });
  }
}

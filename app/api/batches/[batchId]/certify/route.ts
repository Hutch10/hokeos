import { certifyBatch } from "@/lib/metals/batch-service";
import { requireCurrentUser } from "@/lib/auth";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ batchId: string }> },
) {
  try {
    const user = await requireCurrentUser();
    const { batchId } = await params;

    if (!batchId || !batchId.trim()) {
      return Response.json({ ok: false, error: "Invalid batchId" }, { status: 400 });
    }

    const result = await certifyBatch(batchId, user.id);

    console.log(
      `[POST /api/batches/${batchId}/certify] userId=${user.id} status=certified snapshotHash=${result.settlementHash}`
    );

    return Response.json({ ok: true, data: result });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to certify batch";

    if (message === "Batch not found") {
      return Response.json({ ok: false, error: "Batch not found" }, { status: 404 });
    }

    if (message === "Batch is already certified") {
      return Response.json({ ok: false, error: message }, { status: 400 });
    }

    console.error("[POST /api/batches/[batchId]/certify] error:", err);
    return Response.json({ ok: false, error: "Failed to certify batch" }, { status: 500 });
  }
}

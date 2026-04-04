import { createBatch, createBatchSchema, listBatches } from "@/lib/metals";
import { getCurrentUser } from "@/lib/auth";
import { BillingRestrictionError } from "@/lib/billing/service";

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return Response.json({ ok: false, error: "Authentication required" }, { status: 401 });
    }

    const body = await req.json();
    const parsed = createBatchSchema.safeParse(body);

    if (!parsed.success) {
      return Response.json(
        { ok: false, error: "Invalid input", details: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const result = await createBatch(parsed.data, user.id, user.activeTeamId);

    console.log(
      `[POST /api/batches] created batchId=${result.id} userId=${result.userId} items=${result.items.length} total=$${result.totalNetValue}`,
    );

    return Response.json({ ok: true, data: result }, { status: 201 });
  } catch (err) {
    if (err instanceof BillingRestrictionError) {
      return Response.json({ ok: false, error: err.message }, { status: 403 });
    }

    console.error("[POST /api/batches] error:", err);
    return Response.json({ ok: false, error: "Failed to create batch" }, { status: 500 });
  }
}

export async function GET() {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return Response.json({ ok: false, error: "Authentication required" }, { status: 401 });
    }

    const results = await listBatches(user.id);
    console.log(`[GET /api/batches] userId=${user.id} count=${results.length}`);

    return Response.json({ ok: true, data: results });
  } catch (err) {
    console.error("[GET /api/batches] error:", err);
    return Response.json({ ok: false, error: "Failed to list batches" }, { status: 500 });
  }
}

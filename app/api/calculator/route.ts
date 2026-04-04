import { calculate, calculatorInputSchema, getOrCreateSnapshot } from "@/lib/metals";
import { getCurrentUser } from "@/lib/auth";
import { getHistoricalPrices } from "@/lib/prices/price-history-service";
import { getDetailedProjection } from "@/lib/prices/forecasting-service";

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return Response.json({ ok: false, error: "Authentication required" }, { status: 401 });
    }

    const body = await req.json();
    const parsed = calculatorInputSchema.safeParse(body);

    if (!parsed.success) {
      return Response.json(
        { ok: false, error: "Invalid input", details: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const snapshot = await getOrCreateSnapshot(user.id, user.activeTeamId);
    const result = calculate(parsed.data, snapshot);

    // Phase 3: Sovereign 3-Sigma Verification
    // We run a live statistical check against 30-day volatility to detect market anomalies.
    const history = await getHistoricalPrices(parsed.data.metalType, { days: 30, limit: 60 });
    const numericHistory = history.map(p => p.priceUsdPerUnit);
    if (numericHistory.length > 0 && !numericHistory.includes(result.pricePerOz)) {
      numericHistory.push(result.pricePerOz);
    }
    const projection = await getDetailedProjection(numericHistory);

    console.log(
      `[POST /api/calculator] ${result.metalType} net=$${result.netValue} anomaly=${projection.isAnomalous} snapshotId=${snapshot.snapshotId}`,
    );

    return Response.json({
      ok: true,
      data: {
        ...result,
        hasAnomaly: projection.isAnomalous,
        confidenceBands: projection.confidenceBands,
        snapshotId: snapshot.snapshotId,
        priceFetchedAt: snapshot.fetchedAt,
      },
    });
  } catch (err) {
    console.error("[POST /api/calculator] error:", err);
    return Response.json({ ok: false, error: "Calculation failed" }, { status: 500 });
  }
}

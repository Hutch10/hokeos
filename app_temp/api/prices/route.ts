import { getLatestSnapshot, getOrCreateSnapshot } from "@/lib/metals";
import { getCurrentUser } from "@/lib/auth";

export async function GET() {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return Response.json({ ok: false, error: "Authentication required" }, { status: 401 });
    }

    const snapshot = await getOrCreateSnapshot(user.id, user.activeTeamId);
    console.log(`[GET /api/prices] snapshotId=${snapshot.snapshotId} source=${snapshot.source}`);

    return Response.json({
      ok: true,
      data: {
        snapshotId: snapshot.snapshotId,
        source: snapshot.source,
        fetchedAt: snapshot.fetchedAt,
        prices: {
          gold: snapshot.goldUsdPerOz,
          silver: snapshot.silverUsdPerOz,
          platinum: snapshot.platinumUsdPerOz,
          palladium: snapshot.palladiumUsdPerOz,
        },
        currency: "USD",
        unit: "per_troy_oz",
      },
    });
  } catch (err) {
    console.error("[GET /api/prices] error:", err);
    return Response.json({ ok: false, error: "Failed to retrieve prices" }, { status: 500 });
  }
}

// Force-refresh: create a new snapshot even if a recent one exists
export async function POST() {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return Response.json({ ok: false, error: "Authentication required" }, { status: 401 });
    }

    const latest = await getLatestSnapshot(user.id, user.activeTeamId);

    // For now pricing is fallback-only; POST is a no-op refresh
    // Replace this block when a live pricing API is wired in
    const snapshot = latest ?? (await getOrCreateSnapshot(user.id, user.activeTeamId));
    console.log(`[POST /api/prices] refresh snapshotId=${snapshot.snapshotId}`);

    return Response.json({
      ok: true,
      data: {
        snapshotId: snapshot.snapshotId,
        source: snapshot.source,
        fetchedAt: snapshot.fetchedAt,
        prices: {
          gold: snapshot.goldUsdPerOz,
          silver: snapshot.silverUsdPerOz,
          platinum: snapshot.platinumUsdPerOz,
          palladium: snapshot.palladiumUsdPerOz,
        },
        currency: "USD",
        unit: "per_troy_oz",
      },
    });
  } catch (err) {
    console.error("[POST /api/prices] error:", err);
    return Response.json({ ok: false, error: "Failed to refresh prices" }, { status: 500 });
  }
}

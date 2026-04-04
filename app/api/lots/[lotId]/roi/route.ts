import { eq, and } from "drizzle-orm";
import { NextResponse } from "next/server";

import { db } from "@/db";
import { lotCosts, lotRecoveries, lotRoi, lots } from "@/db/schema";
import { calculateLotRoi } from "@/lib/roi";
import { requireCurrentUser } from "@/lib/auth";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ lotId: string }> },
) {
  try {
    const { lotId } = await params;

    if (!lotId || !lotId.trim()) {
      return NextResponse.json({ error: "Invalid lotId" }, { status: 400 });
    }

    const user = await requireCurrentUser();

    // Tenancy Check: Verify the lot exists and belongs to the user's active team
    const [lot] = await db
      .select({ id: lots.id })
      .from(lots)
      .where(and(eq(lots.id, lotId), eq(lots.teamId, user.activeTeamId)))
      .limit(1);

    if (!lot) {
      return NextResponse.json({ error: "Lot not found or access denied" }, { status: 404 });
    }

    // Drizzle returns numeric columns as strings — parse before passing to calculator
    // Scope these queries by team as well for defense-in-depth
    const rawCosts = await db
      .select({ amount: lotCosts.amount })
      .from(lotCosts)
      .where(and(eq(lotCosts.lotId, lotId), eq(lotCosts.teamId, user.activeTeamId)));

    const rawRecoveries = await db
      .select({ estimatedValue: lotRecoveries.estimatedValue })
      .from(lotRecoveries)
      .where(and(eq(lotRecoveries.lotId, lotId), eq(lotRecoveries.teamId, user.activeTeamId)));

    const costs = rawCosts.map((r: { amount: string }) => ({ amount: Number(r.amount) }));
    const recoveries = rawRecoveries.map((r: { estimatedValue: string | null }) => ({
      metalType: "unknown",
      recoveredWeight: 0,
      purityPct: 0,
      payableWeightPct: 0,
      refiningChargePerOz: 0,
      penaltyFees: 0,
      estimatedValue: r.estimatedValue != null ? Number(r.estimatedValue) : null,
    }));

    console.log(`[roi] lotId=${lotId} costs=${costs.length} recoveries=${recoveries.length}`);

    const roi = calculateLotRoi({ costs, recoveries });

    await db
      .insert(lotRoi)
      .values({
        lotId,
        teamId: user.activeTeamId,
        userId: user.id,
        totalCost: String(roi.totalCost),
        revenue: String(roi.revenue),
        profit: String(roi.profit),
        roiPct: String(roi.roiPct),
        marginPct: roi.marginPct !== null ? String(roi.marginPct) : null,
        calculatedAt: new Date(),
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: lotRoi.lotId,
        set: {
          totalCost: String(roi.totalCost),
          revenue: String(roi.revenue),
          profit: String(roi.profit),
          roiPct: String(roi.roiPct),
          marginPct: roi.marginPct !== null ? String(roi.marginPct) : null,
          calculatedAt: new Date(),
          updatedAt: new Date(),
        },
      });

    return NextResponse.json({ ok: true, data: roi });
  } catch (err) {
    console.error("[roi] error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

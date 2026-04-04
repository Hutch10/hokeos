import { eq } from "drizzle-orm";
import { db } from "@/db";
import { lots, lotRoi } from "@/db/schema";
import { type LotApiData } from "@/lib/validations/lots";

export async function listLots(teamId: string): Promise<LotApiData[]> {
  const result = await db
    .select()
    .from(lots)
    .where(eq(lots.teamId, teamId))
    .leftJoin(lotRoi, eq(lots.id, lotRoi.lotId));

  return result.map(({ lots: lot, lot_roi: roi }) => ({
    id: lot.id,
    teamId: lot.teamId,
    lotNumber: lot.lotNumber,
    materialType: lot.materialType,
    sourceName: lot.sourceName,
    grossWeight: lot.grossWeight ? Number(lot.grossWeight) : null,
    weightUnit: lot.weightUnit,
    status: lot.intakeStatus,
    createdAt: lot.createdAt,
    roi: roi
      ? {
          id: roi.id,
          lotId: roi.lotId,
          totalCost: Number(roi.totalCost),
          revenue: Number(roi.revenue),
          profit: Number(roi.profit),
          roiPct: Number(roi.roiPct),
          marginPct: roi.marginPct ? Number(roi.marginPct) : null,
          calculatedAt: roi.calculatedAt,
        }
      : null,
  }));
}

export async function getLotAnalytics(teamId: string) {
  const allLots = await listLots(teamId);
  
  const totalLots = allLots.length;
  const totalCost = allLots.reduce((sum, l) => sum + (l.roi?.totalCost ?? 0), 0);
  const totalRevenue = allLots.reduce((sum, l) => sum + (l.roi?.revenue ?? 0), 0);
  const totalProfit = allLots.reduce((sum, l) => sum + (l.roi?.profit ?? 0), 0);
  
  return {
    totalLots,
    totalCost,
    totalRevenue,
    totalProfit,
    averageRoiPct: totalCost > 0 ? (totalProfit / totalCost) * 100 : 0,
  };
}

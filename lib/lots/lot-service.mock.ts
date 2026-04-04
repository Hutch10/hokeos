import { type LotApiData } from "@/lib/validations/lots";

export async function listLots(teamId: string): Promise<LotApiData[]> {
  const mockLots: LotApiData[] = [];
  const lotCount = 5;

  for (let i = 1; i <= lotCount; i++) {
    mockLots.push({
      id: `mock-lot-${i}`,
      teamId: teamId,
      lotNumber: `LOT-2026-${1000 + i}`,
      materialType: i % 2 === 0 ? "Electronic Scrap" : "Jewelry Scrap",
      sourceName: `Supplier ${String.fromCharCode(64 + i)}`,
      grossWeight: 1250.5,
      weightUnit: "g",
      status: "settled",
      createdAt: new Date(),
      roi: {
        id: `roi-${i}`,
        lotId: `mock-lot-${i}`,
        totalCost: 5000,
        revenue: 7500,
        profit: 2500,
        roiPct: 50,
        marginPct: 33.3,
        calculatedAt: new Date(),
      },
    });
  }

  return mockLots;
}

export async function getLotAnalytics(teamId: string) {
  const allLots = await listLots(teamId);
  const totalCost = allLots.reduce((sum, l) => sum + (l.roi?.totalCost ?? 0), 0);
  const totalRevenue = allLots.reduce((sum, l) => sum + (l.roi?.revenue ?? 0), 0);
  const totalProfit = allLots.reduce((sum, l) => sum + (l.roi?.profit ?? 0), 0);
  
  return {
    totalLots: allLots.length,
    totalCost,
    totalRevenue,
    totalProfit,
    averageRoiPct: totalCost > 0 ? (totalProfit / totalCost) * 100 : 0,
  };
}

import { type BatchResult, type CreateBatchInput, type UpdateBatchInput, type ListBatchOptions, type BatchItemResult } from "./batch-service";
import { type CalculationSnapshot } from "@/lib/roi";

export async function createBatch(input: CreateBatchInput, userId: string): Promise<BatchResult> {
  const mockBatches = await listBatches(userId);
  return mockBatches[0]!;
}

export async function updateBatch(batchId: string, userId: string, input: UpdateBatchInput): Promise<BatchResult> {
  const mockBatches = await listBatches(userId);
  return mockBatches[0]!;
}

export async function duplicateBatch(batchId: string, userId: string): Promise<BatchResult> {
  const mockBatches = await listBatches(userId);
  return mockBatches[0]!;
}

export async function getBatchAccessStatus(batchId: string, userId: string): Promise<"ok" | "forbidden" | "not-found"> {
  return "ok";
}

export async function listItemsForBatch(batchId: string, userId: string): Promise<BatchItemResult[]> {
  const batches = await listBatches(userId);
  return batches[0]?.items ?? [];
}

export async function getBatchById(batchId: string, userId: string): Promise<BatchResult | null> {
  const batches = await listBatches(userId);
  return batches.find(b => b.id === batchId) ?? batches[0] ?? null;
}

export async function listBatches(userId: string, options?: ListBatchOptions): Promise<BatchResult[]> {
  const mockBatches: BatchResult[] = [];
  const batchCount = 10;

  for (let i = 1; i <= batchCount; i++) {
    const createdAt = new Date();
    createdAt.setMonth(createdAt.getMonth() - (batchCount - i));

    mockBatches.push({
      id: `mock-batch-${i}`,
      teamId: "mock-team-id",
      userId,
      status: "completed",
      priceSnapshotId: "mock-snapshot",
      formulaVersionId: "mock-v1",
      tags: [],
      snapshot: {
        goldUsdPerOz: 2000,
        silverUsdPerOz: 24,
        platinumUsdPerOz: 930,
        palladiumUsdPerOz: 1050,
        source: "mock-snapshot",
        fetchedAt: new Date(),
      },
      calculatorInput: null,
      calculatorOutput: null,
      items: [
        {
          id: `item-${i}-1`,
          metalType: i % 2 === 0 ? "gold" : "silver",
          weight: 500,
          weightUnit: "g",
          purityPct: 90,
          recoveryRatePct: 98,
          acquisitionCostUsd: 1000,
          formulaVersion: "v1",
          weightInOz: 16.0754,
          recoveredMetalWeight: 450,
          recoveredMetalWeightOz: 14.467,
          recoveredMetalMetalWeightOz: 14.467,
          pricePerOz: 2000,
          grossValue: 28934,
          netValue: 27934,
          profitLoss: 26934,
          marginPct: 93.1,
          currency: "USD",
          isHardwareVerified: false,
          auditSnapshot: undefined,
        } as BatchItemResult
      ],
      totalNetValue: 27934,
      totalGrossValue: 28934,
      totalProfitLoss: 26934,
      historicalNetValue: 27000,
      historicalProfitLoss: 26000,
      deltaSinceBatch: 934,
      priceContext: {
        metalType: "gold",
        priceAtBatchTimestamp: 1950,
        currentPrice: 2000,
        deltaUsdPerUnit: 50,
        history: [],
        roiAtBatchPct: 85,
        roiTodayPct: 93.1,
      },
      forecast: null,
      customerName: "Mock Customer",
      customerEmail: "mock@example.com",
      customerReference: `REF-${i}`,
      lotId: `mock-lot-${i}`,
      certifiedAt: i % 3 === 0 ? new Date() : null,
      settlementHash: i % 3 === 0 ? "2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824" : null,
      trustScore: i % 3 === 0 ? "35.00" : "100.00",
      auditSnapshot: (i % 3 === 0 ? {
        confidence: {
          score: 35,
          level: "low",
          reasons: ["Anomalous market volatility detected", "Stale price source usage"],
          degradedMode: true,
        },
        rawInputs: {} as any,
        normalizedInputs: {} as any,
        constantsVersion: "v1",
        roiEngineVersion: "v1.4",
        trace: { 
          inputs: {}, 
          constantsUsed: {}, 
          defaultsApplied: [], 
          intermediateSteps: [], 
          warnings: ["MOCK_WARNING"] 
        },
        timestamp: new Date().toISOString(),
      } : null) as unknown as CalculationSnapshot,
      createdAt,
    });
  }

  return mockBatches;
}

export async function certifyBatch(batchId: string, userId: string): Promise<BatchResult> {
  const mockBatches = await listBatches(userId);
  const found = mockBatches.find(b => b.id === batchId) ?? mockBatches[0]!;
  return {
    ...found,
    certifiedAt: new Date(),
    settlementHash: "2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824",
    status: "certified",
  };
}

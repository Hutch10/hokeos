import { and, desc, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { Decimal } from "decimal.js";

import { db } from "@/db";
import { batchItems, batchTags, batches, formulaVersions, priceSnapshots, lots } from "@/db/schema";
import { assertCanCreateBatch } from "@/lib/billing/service";
import {
  buildForecast,
  getHistoricalPrices,
  getLatestPrice,
  getPriceAtTimestamp,
  type ForecastConfidence,
  type ForecastCurvePoint,
  type MetalType,
  type ProjectionMethod,
} from "@/lib/prices";
import { assignTagsToBatch, getTagsForBatch, type TagRecord } from "@/lib/tags/tag-service";
import {
  calculate,
  calculatorInputSchema,
  type CalculatorInput,
  type CalculatorResult,
  type RefiningFeeSchedule,
} from "./calculator-service";
import { type CalculationSnapshot } from "@/lib/roi";
import { getInvestigationService } from "@/lib/mock-data-gate";
import { getOrCreateSnapshot, type PriceSnapshot } from "./pricing-service";
import { generateBatchSignature } from "@/lib/crypto/sha256";

// ─── Zod schema ──────────────────────────────────────────────────────────────

export const createBatchSchema = z.object({
  items: z.array(calculatorInputSchema).min(1).max(100),
  tagIds: z.array(z.string()).max(50).optional(),
  customerName: z.string().trim().max(255).optional(),
  customerEmail: z.preprocess(
    (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
    z.string().trim().email().max(255).optional(),
  ),
  customerReference: z.string().trim().max(255).optional(),
  lotId: z.string().uuid().optional(),
  /**
   * Optional reference calculation submitted by the UI.
   * Validated and stored as-is; the canonical output is always recomputed server-side.
   */
  calculatorInput: calculatorInputSchema.optional(),
  /**
   * Client-computed calculator output. Accepted to avoid 400 errors but ALWAYS
   * discarded — the backend recomputes from calculatorInput and stores that result.
   */
  calculatorOutput: z.unknown().optional(),
});

export type CreateBatchInput = z.infer<typeof createBatchSchema>;
export const updateBatchSchema = createBatchSchema;
export type UpdateBatchInput = z.infer<typeof updateBatchSchema>;

// ─── Result types ─────────────────────────────────────────────────────────────

export type BatchTag = {
  id: string;
  name: string;
  color: string | null;
};

export type BatchItemResult = CalculatorResult & { id: string };

export type BatchPricePoint = {
  timestamp: Date;
  priceUsdPerUnit: number;
};

export type BatchPriceContext = {
  metalType: MetalType | null;
  priceAtBatchTimestamp: number | null;
  currentPrice: number | null;
  deltaUsdPerUnit: number | null;
  history: BatchPricePoint[];
  roiAtBatchPct: number | null;
  roiTodayPct: number | null;
};

export type BatchForecastPoint = ForecastCurvePoint;

export type BatchForecast = {
  projectedPrice: number | null;
  projectedNetValue: number;
  projectedProfitLoss: number;
  projectedROI: number | null;
  method: ProjectionMethod;
  curve: BatchForecastPoint[];
  volatilityPct: number | null;
  confidenceIndicator: ForecastConfidence;
  smaProjectedPrice: number | null;
  emaProjectedPrice: number | null;
  regressionProjectedPrice: number | null;
};

export type BatchResult = {
  id: string;
  teamId: string;
  userId: string;
  status: string;
  priceSnapshotId: string;
  formulaVersionId: string | null;
  tags: BatchTag[];
  /** Price snapshot used for all calculations in this batch */
  snapshot: Omit<PriceSnapshot, "snapshotId"> | null;
  /** The validated reference CalculatorInput submitted by the UI (if any) */
  calculatorInput: CalculatorInput | null;
  /** Server-computed canonical output for the reference calculation (if any) */
  calculatorOutput: CalculatorResult | null;
  items: BatchItemResult[];
  /** Sum of netValue across all items */
  totalNetValue: number;
  /** Sum of grossValue across all items */
  totalGrossValue: number;
  /** Sum of profitLoss across all items */
  totalProfitLoss: number;
  /** Net value recomputed using historical price at batch creation timestamp */
  historicalNetValue: number;
  /** Profit/loss recomputed from historicalNetValue against acquisition cost */
  historicalProfitLoss: number;
  /** Difference between latest-price net value and historicalNetValue */
  deltaSinceBatch: number;
  /** Server-side market context for this batch's primary metal */
  priceContext: BatchPriceContext;
  /** Additive forecast derived from historical prices and batch economics */
  forecast: BatchForecast | null;
  customerName: string | null;
  customerEmail: string | null;
  customerReference: string | null;
  /** Immutable v1.3.0 Trust Snapshot for the entire batch */
  auditSnapshot: CalculationSnapshot | null;
  /** Phase 18: Settlement Lifecycle */
  certifiedAt: Date | null;
  settlementHash: string | null;
  lotId: string | null;
  /** Phase 30: Trust Score (0-100) */
  trustScore: string | null;
  createdAt: Date;
};

export type ListBatchOptions = {
  tagIds?: string[];
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function r2(n: number): number {
  return Math.round(n * 100) / 100;
}

function r4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

function normalizeOptionalField(value?: string): string | null {
  const next = value?.trim() ?? "";
  return next.length > 0 ? next : null;
}

function asMetalType(value: string): MetalType | null {
  switch (value) {
    case "gold":
    case "silver":
    case "platinum":
    case "palladium":
      return value;
    default:
      return null;
  }
}

const GRAMS_PER_TROY_OZ = 31.1035;
const WEIGHT_TO_OZ: Record<string, number> = {
  oz: 1,
  g: 1 / GRAMS_PER_TROY_OZ,
  kg: 1000 / GRAMS_PER_TROY_OZ,
  lb: 14.5833,
};

function toBatchTags(rows: TagRecord[]): BatchTag[] {
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    color: row.color,
  }));
}

async function buildBatchPriceAnalytics(
  createdAt: Date,
  items: BatchItemResult[],
): Promise<{
  historicalNetValue: number;
  historicalProfitLoss: number;
  deltaSinceBatch: number;
  priceContext: BatchPriceContext;
  forecast: BatchForecast | null;
}> {
  const totalAcquisitionCost = r2(items.reduce((sum, item) => sum + item.acquisitionCostUsd, 0));

  const uniqueMetalTypes = Array.from(
    new Set(
      items
        .map((item) => asMetalType(item.metalType))
        .filter((metal): metal is MetalType => metal !== null),
    ),
  );

  const pricePairs = await Promise.all(
    uniqueMetalTypes.map(async (metal) => {
      const [atBatch, latest, history] = await Promise.all([
        getPriceAtTimestamp(metal, createdAt),
        getLatestPrice(metal),
        getHistoricalPrices(metal, { end: new Date(), days: 45, limit: 120 }),
      ]);

      const forecast = await buildForecast(history);

      return {
        metal,
        atBatch: atBatch?.priceUsdPerUnit ?? null,
        latest: latest?.priceUsdPerUnit ?? null,
        history,
        forecast,
      };
    }),
  );

  const priceMap = new Map<
    MetalType,
    {
      atBatch: number | null;
      latest: number | null;
      history: Awaited<ReturnType<typeof getHistoricalPrices>>;
      forecast: Awaited<ReturnType<typeof buildForecast>>;
    }
  >();
  for (const row of pricePairs) {
    priceMap.set(row.metal, {
      atBatch: row.atBatch,
      latest: row.latest,
      history: row.history,
      forecast: row.forecast,
    });
  }

  let historicalNetValueRaw = 0;
  let latestNetValueRaw = 0;
  let projectedNetValueRaw = 0;

  for (const item of items) {
    const metal = asMetalType(item.metalType);
    if (!metal) {
      historicalNetValueRaw += item.netValue;
      latestNetValueRaw += item.netValue;
      projectedNetValueRaw += item.netValue;
      continue;
    }

    const prices = priceMap.get(metal);
    const atBatchPrice = prices?.atBatch ?? item.pricePerOz;
    const latestPrice = prices?.latest ?? atBatchPrice;
    const projectedPrice = prices?.forecast.projectedPrice ?? latestPrice;

    historicalNetValueRaw += item.recoveredMetalWeightOz * atBatchPrice;
    latestNetValueRaw += item.recoveredMetalWeightOz * latestPrice;
    projectedNetValueRaw += item.recoveredMetalWeightOz * projectedPrice;
  }

  const historicalNetValue = r2(historicalNetValueRaw);
  const historicalProfitLoss = r2(historicalNetValue - totalAcquisitionCost);
  const deltaSinceBatch = r2(latestNetValueRaw - historicalNetValueRaw);
  const projectedNetValue = r2(projectedNetValueRaw);
  const projectedProfitLoss = r2(projectedNetValue - totalAcquisitionCost);
  const projectedROI = totalAcquisitionCost > 0
    ? r2((projectedProfitLoss / totalAcquisitionCost) * 100)
    : null;

  const dominantMetal = items
    .reduce<{ metal: MetalType | null; recoveredOz: number }>(
      (best, item) => {
        const metal = asMetalType(item.metalType);
        if (!metal) {
          return best;
        }

        if (item.recoveredMetalWeightOz > best.recoveredOz) {
          return { metal, recoveredOz: item.recoveredMetalWeightOz };
        }

        return best;
      },
      { metal: null, recoveredOz: 0 },
    )
    .metal;

  const dominantPrices = dominantMetal ? priceMap.get(dominantMetal) : null;
  const history = dominantPrices?.history.slice(-30) ?? [];
  const dominantForecast = dominantPrices?.forecast ?? null;

  const roiAtBatchPct = totalAcquisitionCost > 0
    ? r2((historicalProfitLoss / totalAcquisitionCost) * 100)
    : null;

  const roiTodayPct = totalAcquisitionCost > 0
    ? r2(((latestNetValueRaw - totalAcquisitionCost) / totalAcquisitionCost) * 100)
    : null;

  return {
    historicalNetValue,
    historicalProfitLoss,
    deltaSinceBatch,
    priceContext: {
      metalType: dominantMetal,
      priceAtBatchTimestamp: dominantPrices?.atBatch ?? null,
      currentPrice: dominantPrices?.latest ?? null,
      deltaUsdPerUnit:
        dominantPrices?.atBatch != null && dominantPrices?.latest != null
          ? r2(dominantPrices.latest - dominantPrices.atBatch)
          : null,
      history: history.map((point) => ({
        timestamp: point.timestamp,
        priceUsdPerUnit: point.priceUsdPerUnit,
      })),
      roiAtBatchPct,
      roiTodayPct,
    },
    forecast: dominantForecast
      ? {
          projectedPrice: dominantForecast.projectedPrice,
          projectedNetValue,
          projectedProfitLoss,
          projectedROI,
          method: dominantForecast.method,
          curve: dominantForecast.curve,
          volatilityPct: dominantForecast.volatilityPct,
          confidenceIndicator: dominantForecast.confidenceIndicator,
          smaProjectedPrice: dominantForecast.smaProjectedPrice,
          emaProjectedPrice: dominantForecast.emaProjectedPrice,
          regressionProjectedPrice: dominantForecast.regressionProjectedPrice,
        }
      : null,
  };
}

/**
 * Reconstruct a BatchItemResult from a stored row.
 * Prefers economicOutputJson (set on rows created after the 0002 migration).
 * Falls back to column-level reconstruction for older rows.
 */
function itemResultFromRow(
  item: typeof batchItems.$inferSelect,
  pricePerOz: number,
): BatchItemResult {
  if (item.economicOutputJson) {
    return {
      ...(item.economicOutputJson as CalculatorResult),
      id: item.id,
      auditSnapshot: (item.auditSnapshotJson as CalculationSnapshot) ?? undefined,
    };
  }

  // Legacy reconstruction — rows created before economicOutputJson was added
  const weight = Number(item.weight);
  const purityPct = Number(item.purityPct ?? 99.9);
  const purityFactor = purityPct / 100;
  const convFactor = WEIGHT_TO_OZ[item.weightUnit] ?? 1 / GRAMS_PER_TROY_OZ;
  const weightInOz = r4(weight * convFactor);
  const recoveredMetalWeightOz = r4(weightInOz * purityFactor);
  const grossValue = r2(weightInOz * pricePerOz);
  const netValue = Number(item.calculatedValue ?? 0);

  return {
    id: item.id,
    metalType: item.metalType,
    weight,
    weightUnit: item.weightUnit,
    purityPct,
    acquisitionCostUsd: 0,
    formulaVersion: "v1",
    weightInOz,
    recoveredMetalWeight: r4(weight * purityFactor),
    recoveredMetalMetalWeightOz: recoveredMetalWeightOz,
    recoveredMetalWeightOz,
    pricePerOz,
    grossValue,
    netValue,
    profitLoss: r2(netValue),
    marginPct: 100,
    recoveryRatePct: 100,
    currency: "USD",
  };
}

// ─── Service functions ────────────────────────────────────────────────────────

function calculateTrustScore(snapshot: CalculationSnapshot | null): string {
  if (!snapshot) return "100.00";
  const baseScore = snapshot.confidence?.score ?? 100;
  // If in degraded mode, cap the score at 70% to signal manual review necessity
  const finalScore = snapshot.confidence?.degradedMode ? Math.min(baseScore, 70) : baseScore;
  return finalScore.toFixed(2);
}

export async function createBatch(
  input: CreateBatchInput,
  userId: string,
  teamId: string,
): Promise<BatchResult> {
  await assertCanCreateBatch(userId);

  const snapshot = await getOrCreateSnapshot(userId, teamId);

  const [activeFormula] = await db
    .select({ id: formulaVersions.id, version: formulaVersions.version })
    .from(formulaVersions)
    .where(eq(formulaVersions.isActive, true))
    .limit(1);

  const formulaVersionId = activeFormula?.id ?? null;

  // Phase 1 Hardening: Resolve Dynamic Lot context
  const [lot] = input.lotId 
    ? await db.select().from(lots).where(eq(lots.id, input.lotId)).limit(1)
    : [null];
  
  const feeSchedule = (lot?.refiningFeeSchedule as RefiningFeeSchedule) || {};

  // Compute canonical outputs — client-supplied calculatorOutput is intentionally ignored
  const calculatedItems = input.items.map((item) => calculate(item, snapshot, feeSchedule));

  // Compute canonical reference output from calculatorInput (if provided)
  const canonicalCalculatorOutput: CalculatorResult | null = input.calculatorInput
    ? calculate(input.calculatorInput, snapshot, feeSchedule)
    : null;

  const totalNetValue = calculatedItems.reduce((s, i) => s.plus(i.netValue), new Decimal(0));
  const totalGrossValue = calculatedItems.reduce((s, i) => s.plus(i.grossValue), new Decimal(0));
  const totalProfitLoss = calculatedItems.reduce((s, i) => s.plus(i.profitLoss), new Decimal(0));
  const totalAcquisitionCost = calculatedItems.reduce((s, i) => s.plus(i.acquisitionCostUsd), new Decimal(0));

  console.log(
    `[batch] create userId=${userId} items=${input.items.length} ` +
      `snapshotId=${snapshot.snapshotId} formulaVersionId=${formulaVersionId} ` +
      `totalNet=$${totalNetValue} totalP&L=$${totalProfitLoss}`,
  );

  const [batch] = await db
    .insert(batches)
    .values({
      userId,
      teamId,
      priceSnapshotId: snapshot.snapshotId,
      formulaVersionId,
      status: "completed",
      customerName: normalizeOptionalField(input.customerName),
      customerEmail: normalizeOptionalField(input.customerEmail),
      customerReference: normalizeOptionalField(input.customerReference),
      resultJson: {
        items: calculatedItems,
        totalNetValue: totalNetValue.toNumber(),
        totalGrossValue: totalGrossValue.toNumber(),
        totalProfitLoss: totalProfitLoss.toNumber(),
        totalAcquisitionCost: totalAcquisitionCost.toNumber(),
        calculatorInput: input.calculatorInput,
        calculatorOutput: canonicalCalculatorOutput,
      },
      // Store validated input; store server-computed output; discard client output
      calculatorInputJson: input.calculatorInput ?? null,
      calculatorOutputJson: canonicalCalculatorOutput,
      auditSnapshotJson: (canonicalCalculatorOutput?.auditSnapshot as unknown) ?? null,
      lotId: input.lotId ?? (input.calculatorInput ? (input.calculatorInput as Record<string, unknown>).lotId as string : null),
    })
    .returning();

  if (!batch) throw new Error("Failed to insert batch");

  const insertedItems = await db
    .insert(batchItems)
    .values(
      calculatedItems.map((item) => ({
        userId,
        teamId,
        batchId: batch.id,
        metalType: item.metalType,
        weight: item.weight.toString(),
        weightUnit: item.weightUnit,
        purityPct: item.purityPct.toString(),
        calculatedValue: item.netValue.toString(),
        // Full canonical result stored for audit and display
        economicOutputJson: item,
        isHardwareVerified: !!item.isHardwareVerified,
        hardwareDeviceId: item.hardwareDeviceId ?? null,
        auditSnapshotJson: (item.auditSnapshot as unknown) ?? null,
      })),
    )
    .returning({ id: batchItems.id });

  const assignedTags = await assignTagsToBatch(batch.id, userId, teamId, input.tagIds ?? []);

  const itemResults: BatchItemResult[] = calculatedItems.map((item, i) => ({
    ...item,
    id: insertedItems[i]!.id,
  }));

  const priceAnalytics = await buildBatchPriceAnalytics(batch.createdAt, itemResults);

  const result: BatchResult = {
    id: batch.id,
    teamId: batch.teamId,
    userId: batch.userId,
    status: batch.status,
    priceSnapshotId: snapshot.snapshotId,
    formulaVersionId,
    tags: toBatchTags(assignedTags),
    snapshot: {
      goldUsdPerOz: snapshot.goldUsdPerOz,
      silverUsdPerOz: snapshot.silverUsdPerOz,
      platinumUsdPerOz: snapshot.platinumUsdPerOz,
      palladiumUsdPerOz: snapshot.palladiumUsdPerOz,
      source: snapshot.source,
      fetchedAt: snapshot.fetchedAt,
    },
    calculatorInput: input.calculatorInput ?? null,
    calculatorOutput: canonicalCalculatorOutput,
    items: itemResults,
    totalNetValue: totalNetValue.toNumber(),
    totalGrossValue: totalGrossValue.toNumber(),
    totalProfitLoss: totalProfitLoss.toNumber(),
    historicalNetValue: priceAnalytics.historicalNetValue,
    historicalProfitLoss: priceAnalytics.historicalProfitLoss,
    deltaSinceBatch: priceAnalytics.deltaSinceBatch,
    priceContext: priceAnalytics.priceContext,
    forecast: priceAnalytics.forecast,
    customerName: batch.customerName,
    customerEmail: batch.customerEmail,
    customerReference: batch.customerReference,
    auditSnapshot: (canonicalCalculatorOutput?.auditSnapshot as unknown as CalculationSnapshot) ?? null,
    certifiedAt: null,
    settlementHash: null,
    lotId: batch.lotId,
    trustScore: calculateTrustScore(canonicalCalculatorOutput?.auditSnapshot as unknown as CalculationSnapshot),
    createdAt: batch.createdAt,
  };

  // Phase 32: Automated Trust-Triggered Investigations
  const numericallyLowTrust = Number(result.trustScore) < 75;
  if (numericallyLowTrust) {
    try {
      const investigationService = await getInvestigationService(false); 
      await investigationService.createInvestigation({
        title: `Automated Audit Trigger: Batch ${result.id.slice(0, 8)}`,
        summary: `Self-initiated investigation due to low trust score (${result.trustScore}%). 
Audit Reasons: ${result.auditSnapshot?.confidence?.reasons?.join(", ") ?? "None provided."}`,
        severity: Number(result.trustScore) < 40 ? "critical" : "high",
        batchIds: [result.id],
      }, "system", result.teamId);
    } catch (err) {
      console.error(`[Phase 32] Failed to auto-trigger investigation for batch ${result.id}:`, err);
    }
  }

  return result;
}

export async function updateBatch(
  batchId: string,
  userId: string,
  teamId: string,
  input: UpdateBatchInput,
): Promise<BatchResult> {
  const existing = await getBatchById(batchId, userId);
  if (!existing) {
    throw new Error("Batch not found");
  }

  if (existing.certifiedAt) {
    throw new Error("Batch is locked for settlement and cannot be modified.");
  }

  const snapshot = await getOrCreateSnapshot(userId, teamId);

  const [activeFormula] = await db
    .select({ id: formulaVersions.id })
    .from(formulaVersions)
    .where(eq(formulaVersions.isActive, true))
    .limit(1);

  const formulaVersionId = activeFormula?.id ?? null;

  // Phase 1 Hardening: Resolve Dynamic Lot context
  const [lot] = input.lotId 
    ? await db.select().from(lots).where(eq(lots.id, input.lotId)).limit(1)
    : [null];
  
  const feeSchedule = (lot?.refiningFeeSchedule as RefiningFeeSchedule) || {};

  // Canonical recomputation is always server-side.
  const calculatedItems = input.items.map((item) => calculate(item, snapshot, feeSchedule));
  const canonicalCalculatorOutput: CalculatorResult | null = input.calculatorInput
    ? calculate(input.calculatorInput, snapshot, feeSchedule)
    : null;

  const totalNetValue = calculatedItems.reduce((s, i) => s.plus(i.netValue), new Decimal(0));
  const totalGrossValue = calculatedItems.reduce((s, i) => s.plus(i.grossValue), new Decimal(0));
  const totalProfitLoss = calculatedItems.reduce((s, i) => s.plus(i.profitLoss), new Decimal(0));
  const totalAcquisitionCost = calculatedItems.reduce((s, i) => s.plus(i.acquisitionCostUsd), new Decimal(0));

  await db.transaction(async (tx) => {
    await tx
      .update(batches)
      .set({
        priceSnapshotId: snapshot.snapshotId,
        formulaVersionId,
        status: "completed",
        customerName: normalizeOptionalField(input.customerName),
        customerEmail: normalizeOptionalField(input.customerEmail),
        customerReference: normalizeOptionalField(input.customerReference),
        lotId: input.lotId ?? null,
        resultJson: {
          items: calculatedItems,
          totalNetValue: totalNetValue.toNumber(),
          totalGrossValue: totalGrossValue.toNumber(),
          totalProfitLoss: totalProfitLoss.toNumber(),
          totalAcquisitionCost: totalAcquisitionCost.toNumber(),
          calculatorInput: input.calculatorInput,
          calculatorOutput: canonicalCalculatorOutput,
        },
        calculatorInputJson: input.calculatorInput ?? null,
        calculatorOutputJson: canonicalCalculatorOutput,
        auditSnapshotJson: (canonicalCalculatorOutput?.auditSnapshot as unknown) ?? null,
        updatedAt: new Date(),
      })
      .where(and(eq(batches.id, batchId), eq(batches.userId, userId)));

    await tx
      .delete(batchItems)
      .where(and(eq(batchItems.batchId, batchId), eq(batchItems.userId, userId)));

      await tx.insert(batchItems).values(
        calculatedItems.map((item) => ({
          userId,
          teamId,
          batchId,
          metalType: item.metalType,
          weight: item.weight.toString(),
          weightUnit: item.weightUnit,
          purityPct: item.purityPct.toString(),
          calculatedValue: item.netValue.toString(),
          economicOutputJson: item,
          auditSnapshotJson: (item.auditSnapshot as unknown) ?? null,
        })),
      );
  });

  await assignTagsToBatch(batchId, userId, teamId, input.tagIds ?? []);

  const updated = await getBatchById(batchId, userId);
  if (!updated) {
    throw new Error("Failed to update batch");
  }

  return updated;
}

export async function duplicateBatch(
  batchId: string,
  userId: string,
  teamId: string,
): Promise<BatchResult> {
  await assertCanCreateBatch(userId);

  const source = await getBatchById(batchId, userId);
  if (!source) {
    throw new Error("Batch not found");
  }

  const items = source.items.map((item) =>
    calculatorInputSchema.parse({
      metalType: item.metalType,
      weight: item.weight,
      weightUnit: item.weightUnit,
      purityPct: item.purityPct,
      recoveryRatePct: item.recoveryRatePct,
      acquisitionCostUsd: item.acquisitionCostUsd,
      formulaVersion: item.formulaVersion,
    }),
  );

  const calculatorInput = source.calculatorInput
    ? calculatorInputSchema.parse(source.calculatorInput)
    : items[0];

  if (!calculatorInput) {
    throw new Error("Source batch has no items to duplicate");
  }

  return createBatch(
    {
      items,
      calculatorInput,
      tagIds: source.tags.map((tag) => tag.id),
      customerName: source.customerName ?? undefined,
      customerEmail: source.customerEmail ?? undefined,
      customerReference: source.customerReference ?? undefined,
    },
    userId,
    teamId,
  );
}

export async function listBatches(userId: string, options?: ListBatchOptions): Promise<BatchResult[]> {
  const normalizedTagIds = Array.from(
    new Set((options?.tagIds ?? []).map((id) => id.trim()).filter(Boolean)),
  );

  let rows: Array<typeof batches.$inferSelect> = [];

  if (normalizedTagIds.length === 0) {
    rows = await db
      .select()
      .from(batches)
      .where(eq(batches.userId, userId))
      .orderBy(desc(batches.createdAt));
  } else {
    const matches = await db
      .select({ batchId: batchTags.batchId })
      .from(batchTags)
      .where(and(eq(batchTags.userId, userId), inArray(batchTags.tagId, normalizedTagIds)));

    const batchIds = Array.from(new Set(matches.map((row) => row.batchId)));

    if (batchIds.length === 0) {
      return [];
    }

    rows = await db
      .select()
      .from(batches)
      .where(and(eq(batches.userId, userId), inArray(batches.id, batchIds)))
      .orderBy(desc(batches.createdAt));
  }

  console.log(`[batch] list userId=${userId} count=${rows.length} filterTags=${normalizedTagIds.length}`);
  const results = await Promise.all(rows.map((row) => getBatchById(row.id, userId)));
  return results.filter((r): r is BatchResult => r !== null);
}

export async function getBatchAccessStatus(
  batchId: string,
  userId: string,
): Promise<"ok" | "forbidden" | "not-found"> {
  const [row] = await db
    .select({ userId: batches.userId })
    .from(batches)
    .where(eq(batches.id, batchId))
    .limit(1);

  if (!row) {
    return "not-found";
  }

  return row.userId === userId ? "ok" : "forbidden";
}

export async function listItemsForBatch(
  batchId: string,
  userId: string,
): Promise<BatchItemResult[]> {
  const [batch] = await db
    .select({ priceSnapshotId: batches.priceSnapshotId })
    .from(batches)
    .where(and(eq(batches.id, batchId), eq(batches.userId, userId)))
    .limit(1);

  if (!batch) {
    return [];
  }

  const items = await db
    .select()
    .from(batchItems)
    .where(and(eq(batchItems.batchId, batchId), eq(batchItems.userId, userId)));

  const [snapshotRow] = batch.priceSnapshotId
    ? await db
        .select()
        .from(priceSnapshots)
        .where(and(eq(priceSnapshots.id, batch.priceSnapshotId), eq(priceSnapshots.userId, userId)))
        .limit(1)
    : [];

  const snapshot = snapshotRow
    ? {
        goldUsdPerOz: Number(snapshotRow.goldUsdPerOz),
        silverUsdPerOz: Number(snapshotRow.silverUsdPerOz),
        platinumUsdPerOz: Number(snapshotRow.platinumUsdPerOz),
        palladiumUsdPerOz: Number(snapshotRow.palladiumUsdPerOz),
      }
    : null;

  return items.map((item) => {
    const pricePerOz = snapshot ? metalPriceFromSnapshot(item.metalType, snapshot) : 0;
    return itemResultFromRow(item, pricePerOz);
  });
}

export async function getBatchById(
  batchId: string,
  userId: string,
): Promise<BatchResult | null> {
  const [batch] = await db
    .select()
    .from(batches)
    .where(and(eq(batches.id, batchId), eq(batches.userId, userId)));

  if (!batch) return null;

  const items = await db
    .select()
    .from(batchItems)
    .where(and(eq(batchItems.batchId, batchId), eq(batchItems.userId, userId)));

  const [snapshotRow] = batch.priceSnapshotId
    ? await db
        .select()
        .from(priceSnapshots)
        .where(and(eq(priceSnapshots.id, batch.priceSnapshotId), eq(priceSnapshots.userId, userId)))
        .limit(1)
    : [];

  const snapshot = snapshotRow
    ? {
        goldUsdPerOz: Number(snapshotRow.goldUsdPerOz),
        silverUsdPerOz: Number(snapshotRow.silverUsdPerOz),
        platinumUsdPerOz: Number(snapshotRow.platinumUsdPerOz),
        palladiumUsdPerOz: Number(snapshotRow.palladiumUsdPerOz),
        source: snapshotRow.source,
        fetchedAt: snapshotRow.fetchedAt,
      }
    : null;

  const itemResults: BatchItemResult[] = items.map((item) => {
    const pricePerOz = snapshot
      ? metalPriceFromSnapshot(item.metalType, snapshot)
      : 0;
    return itemResultFromRow(item, pricePerOz);
  });

  const assignedTags = await getTagsForBatch(batchId, userId);

  // Prefer stored aggregate from resultJson; recompute from items as fallback
  const stored = batch.resultJson as {
    totalNetValue?: number;
    totalGrossValue?: number;
    totalProfitLoss?: number;
  } | null;

  const totalNetValue = stored?.totalNetValue ?? r2(itemResults.reduce((s, i) => s + i.netValue, 0));
  const totalGrossValue = stored?.totalGrossValue ?? r2(itemResults.reduce((s, i) => s + i.grossValue, 0));
  const totalProfitLoss = stored?.totalProfitLoss ?? r2(itemResults.reduce((s, i) => s + i.profitLoss, 0));
  const priceAnalytics = await buildBatchPriceAnalytics(batch.createdAt, itemResults);

  return {
    id: batch.id,
    teamId: batch.teamId,
    userId: batch.userId,
    status: batch.status,
    priceSnapshotId: batch.priceSnapshotId ?? "",
    formulaVersionId: batch.formulaVersionId ?? null,
    tags: toBatchTags(assignedTags),
    snapshot,
    calculatorInput: (batch.calculatorInputJson as CalculatorInput | null) ?? null,
    calculatorOutput: (batch.calculatorOutputJson as CalculatorResult | null) ?? null,
    items: itemResults,
    totalNetValue,
    totalGrossValue,
    totalProfitLoss,
    historicalNetValue: priceAnalytics.historicalNetValue,
    historicalProfitLoss: priceAnalytics.historicalProfitLoss,
    deltaSinceBatch: priceAnalytics.deltaSinceBatch,
    priceContext: priceAnalytics.priceContext,
    forecast: priceAnalytics.forecast,
    customerName: batch.customerName,
    customerEmail: batch.customerEmail,
    customerReference: batch.customerReference,
    auditSnapshot: (batch.auditSnapshotJson as CalculationSnapshot) ?? null,
    certifiedAt: batch.certifiedAt,
    settlementHash: batch.settlementHash,
    lotId: batch.lotId,
    trustScore: batch.trustScore,
    createdAt: batch.createdAt,
  };
}

function metalPriceFromSnapshot(
  metalType: string,
  s: { goldUsdPerOz: number; silverUsdPerOz: number; platinumUsdPerOz: number; palladiumUsdPerOz: number },
): number {
  switch (metalType) {
    case "gold":      return s.goldUsdPerOz;
    case "silver":    return s.silverUsdPerOz;
    case "platinum":  return s.platinumUsdPerOz;
    case "palladium": return s.palladiumUsdPerOz;
    default:          return 0;
  }
}

/**
 * Phase 4: Field Certification (Sovereign Industrial Alpha)
 * Atomically locks a batch, verifies its integrity, and generates a
 * non-repudiable SHA-256 settlement signature.
 */
export async function certifyBatch(
  batchId: string,
  userId: string,
  metadata: { ip?: string; userAgent?: string } = {}
): Promise<BatchResult> {
  const batch = await getBatchById(batchId, userId);
  if (!batch) throw new Error("Batch not found");
  if (batch.certifiedAt) throw new Error("Batch is already certified");

  // Verify that the data hasn't been tampered with since creation/last-update
  const isValid = await verifyBatchIntegrity(batchId, userId);
  if (!isValid) {
    throw new Error("Batch integrity verification failed. Manual tamper detected.");
  }

  // Build certification payload including operator metadata
  const signaturePayload = {
    batchId: batch.id,
    calculatorInput: batch.calculatorInput,
    totalNetValue: batch.totalNetValue,
    createdAt: batch.createdAt,
    lotId: batch.lotId,
    certifiedBy: userId,
    ...metadata,
  };

  const settlementHash = generateBatchSignature(signaturePayload);

  const [updated] = await db
    .update(batches)
    .set({
      certifiedAt: new Date(),
      settlementHash,
      status: "certified",
      updatedAt: new Date(),
      // Append signature metadata to audit snapshot
      auditSnapshotJson: {
        ...batch.auditSnapshot,
        certificationMetadata: {
          ...metadata,
          signatureTimestamp: new Date().toISOString(),
        }
      }
    })
    .where(and(eq(batches.id, batchId), eq(batches.userId, userId)))
    .returning();

  if (!updated) throw new Error("Failed to certify batch");

  const results = await getBatchById(batchId, userId);
  if (!results) throw new Error("Failed to retrieve certified batch");
  return results;
}

/**
 * Re-hashes the current database state to ensure it matches the stored 
 * calculation fingerprints. Guards against rogue DB updates.
 */
export async function verifyBatchIntegrity(
  batchId: string, 
  userId: string
): Promise<boolean> {
  const batch = await getBatchById(batchId, userId);
  if (!batch) return false;

  // We re-calculate the expected net value from the stored calculator input
  // and the stored snapshot to verify numerical consistency.
  if (!batch.snapshot || !batch.calculatorOutput) return false;

  const [lot] = batch.lotId 
    ? await db.select().from(lots).where(eq(lots.id, batch.lotId)).limit(1)
    : [null];
  
  const recomputed = calculate(batch.calculatorInput as CalculatorInput, {
    goldUsdPerOz: batch.snapshot.goldUsdPerOz,
    silverUsdPerOz: batch.snapshot.silverUsdPerOz,
    platinumUsdPerOz: batch.snapshot.platinumUsdPerOz,
    palladiumUsdPerOz: batch.snapshot.palladiumUsdPerOz,
  }, (lot?.refiningFeeSchedule as RefiningFeeSchedule) || {});

  // Strict numerical check on total net value
  const isValueConsistent = r2(recomputed.netValue) === r2(batch.totalNetValue);

  return isValueConsistent;
}

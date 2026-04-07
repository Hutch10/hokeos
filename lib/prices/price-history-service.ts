import { and, asc, desc, eq, gte, lte, sql } from "drizzle-orm";

import { db } from "@/db";
import { metalPrices } from "@/db/schema";
import { STALE_PRICE_THRESHOLD_SECONDS } from "@/lib/constants";

export const supportedMetalTypes = ["gold", "silver", "platinum", "palladium"] as const;

export type MetalType = (typeof supportedMetalTypes)[number];

export type PriceBasis = "spot" | "cached" | "manual" | "estimated";
export type PriceSourceStatus = "live" | "stale" | "fallback" | "unknown";

export type MetalPricePoint = {
  id: string;
  metalType: MetalType;
  priceUsdPerUnit: number;
  timestamp: Date;
  source: string;
  // Phase 1: Provenance & Freshness
  priceBasis: PriceBasis;
  priceAgeSeconds: number;
  priceSourceStatus: PriceSourceStatus;
};

export type HistoricalPriceRange = {
  start?: Date;
  end?: Date;
  days?: number;
  limit?: number;
};

export type MarketOverviewRow = {
  metalType: MetalType;
  latestPrice: number | null;
  latestTimestamp: Date | null;
  change7dPct: number | null;
  change30dPct: number | null;
  volatilityPct: number | null;
  volatilityIndicator: "low" | "moderate" | "high" | "n/a";
  // Phase 1: Freshness in Overview
  status: PriceSourceStatus;
};

function asMetalType(value: string): MetalType | null {
  if ((supportedMetalTypes as readonly string[]).includes(value)) {
    return value as MetalType;
  }

  return null;
}

function r2(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * Derives the provenance metadata for a price point at runtime.
 */
function deriveProvenance(timestamp: Date, source: string): { 
  basis: PriceBasis; 
  ageSeconds: number; 
  status: PriceSourceStatus; 
} {
  const now = new Date();
  const ageSeconds = Math.max(0, (now.getTime() - timestamp.getTime()) / 1000);
  
  // Logic: All DB-stored prices are currently treated as "spot" unless marked differently.
  // In a future pass, we would check a 'basis' column in the schema.
  const basis: PriceBasis = source.toLowerCase().includes("manual") ? "manual" : "spot";
  
  let status: PriceSourceStatus = "live";
  if (ageSeconds > STALE_PRICE_THRESHOLD_SECONDS) {
    status = "stale";
  } else if (source.toLowerCase().includes("fallback")) {
    status = "fallback";
  }

  return { basis, ageSeconds, status };
}

function toPoint(row: typeof metalPrices.$inferSelect): MetalPricePoint | null {
  const metalType = asMetalType(row.metalType);
  if (!metalType) {
    return null;
  }

  const provenance = deriveProvenance(row.timestamp, row.source);

  return {
    id: row.id,
    metalType,
    priceUsdPerUnit: Number(row.priceUsdPerUnit),
    timestamp: row.timestamp,
    source: row.source,
    priceBasis: provenance.basis,
    priceAgeSeconds: provenance.ageSeconds,
    priceSourceStatus: provenance.status,
  };
}

function getRangeWindow(range?: HistoricalPriceRange): { start: Date; end: Date } {
  const end = range?.end ?? new Date();

  if (range?.start) {
    return { start: range.start, end };
  }

  const days = range?.days ?? 30;
  const start = new Date(end.getTime() - days * 24 * 60 * 60 * 1000);
  return { start, end };
}

export async function getLatestPrice(metalType: MetalType): Promise<MetalPricePoint | null> {
  const [row] = await db
    .select()
    .from(metalPrices)
    .where(eq(metalPrices.metalType, metalType))
    .orderBy(desc(metalPrices.timestamp))
    .limit(1);

  return row ? toPoint(row) : null;
}

export async function getHistoricalPrices(
  metalType: MetalType,
  range?: HistoricalPriceRange,
): Promise<MetalPricePoint[]> {
  const { start, end } = getRangeWindow(range);
  const limit = Math.min(range?.limit ?? 400, 1000);

  const rows = await db
    .select()
    .from(metalPrices)
    .where(
      and(
        eq(metalPrices.metalType, metalType),
        gte(metalPrices.timestamp, start),
        lte(metalPrices.timestamp, end),
      ),
    )
    .orderBy(asc(metalPrices.timestamp))
    .limit(limit);

  return (rows as any[])
    .map(toPoint)
    .filter((point): point is MetalPricePoint => point !== null);
}

export async function getPriceAtTimestamp(
  metalType: MetalType,
  timestamp: Date,
): Promise<MetalPricePoint | null> {
  const [prior] = await db
    .select()
    .from(metalPrices)
    .where(and(eq(metalPrices.metalType, metalType), lte(metalPrices.timestamp, timestamp)))
    .orderBy(desc(metalPrices.timestamp))
    .limit(1);

  if (prior) {
    return toPoint(prior);
  }

  const [next] = await db
    .select()
    .from(metalPrices)
    .where(and(eq(metalPrices.metalType, metalType), gte(metalPrices.timestamp, timestamp)))
    .orderBy(asc(metalPrices.timestamp))
    .limit(1);

  return next ? toPoint(next) : null;
}

function percentChange(current: number, reference: number): number | null {
  if (reference <= 0) {
    return null;
  }

  return r2(((current - reference) / reference) * 100);
}

function computeVolatilityPct(points: MetalPricePoint[]): number | null {
  if (points.length < 3) {
    return null;
  }

  const returns: number[] = [];
  for (let i = 1; i < points.length; i += 1) {
    const prev = points[i - 1]?.priceUsdPerUnit ?? 0;
    const next = points[i]?.priceUsdPerUnit ?? 0;
    if (prev > 0) {
      returns.push(((next - prev) / prev) * 100);
    }
  }

  if (returns.length < 2) {
    return null;
  }

  const mean = returns.reduce((sum, value) => sum + value, 0) / returns.length;
  const variance =
    returns.reduce((sum, value) => sum + (value - mean) ** 2, 0) / returns.length;

  return r2(Math.sqrt(variance));
}

function volatilityIndicator(volatilityPct: number | null): "low" | "moderate" | "high" | "n/a" {
  if (volatilityPct == null) {
    return "n/a";
  }

  if (volatilityPct < 1.5) {
    return "low";
  }

  if (volatilityPct < 3) {
    return "moderate";
  }

  return "high";
}

function pickReferencePrice(points: MetalPricePoint[], daysAgo: number): number | null {
  if (points.length === 0) {
    return null;
  }

  const target = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);
  let candidate: MetalPricePoint | null = null;

  for (const point of points) {
    if (point.timestamp <= target) {
      candidate = point;
    }
  }

  return candidate?.priceUsdPerUnit ?? points[0]?.priceUsdPerUnit ?? null;
}

export async function getMarketOverview(): Promise<MarketOverviewRow[]> {
  const rows = await Promise.all(
    supportedMetalTypes.map(async (metalType) => {
      const [latest, history30] = await Promise.all([
        getLatestPrice(metalType),
        getHistoricalPrices(metalType, { days: 35, limit: 60 }),
      ]);

      if (!latest) {
        return {
          metalType,
          latestPrice: null,
          latestTimestamp: null,
          change7dPct: null,
          change30dPct: null,
          volatilityPct: null,
          volatilityIndicator: "n/a" as const,
          status: "unknown" as const,
        };
      }

      const ref7d = pickReferencePrice(history30, 7);
      const ref30d = pickReferencePrice(history30, 30);
      const vol = computeVolatilityPct(history30);

      return {
        metalType,
        latestPrice: latest.priceUsdPerUnit,
        latestTimestamp: latest.timestamp,
        change7dPct: ref7d != null ? percentChange(latest.priceUsdPerUnit, ref7d) : null,
        change30dPct: ref30d != null ? percentChange(latest.priceUsdPerUnit, ref30d) : null,
        volatilityPct: vol,
        volatilityIndicator: volatilityIndicator(vol),
        status: latest.priceSourceStatus,
      };
    }),
  );

  return rows;
}

export async function getLatestPricesByMetalType(): Promise<Record<MetalType, number | null>> {
  const latest = await Promise.all(supportedMetalTypes.map((metal) => getLatestPrice(metal)));

  return {
    gold: latest[0]?.priceUsdPerUnit ?? null,
    silver: latest[1]?.priceUsdPerUnit ?? null,
    platinum: latest[2]?.priceUsdPerUnit ?? null,
    palladium: latest[3]?.priceUsdPerUnit ?? null,
  };
}

export async function countPriceRows(): Promise<number> {
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(metalPrices);

  return row?.count ?? 0;
}

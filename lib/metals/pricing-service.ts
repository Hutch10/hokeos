import { and, desc, eq, gte } from "drizzle-orm";

import { db } from "@/db";
import { priceSnapshots } from "@/db/schema";

export type MetalPrices = {
  goldUsdPerOz: number;
  silverUsdPerOz: number;
  platinumUsdPerOz: number;
  palladiumUsdPerOz: number;
  source: string;
  fetchedAt: Date;
};

export type PriceSnapshot = MetalPrices & { snapshotId: string };

// Hardcoded fallback — used when no snapshot exists in the DB
const FALLBACK_PRICES: Omit<MetalPrices, "source" | "fetchedAt"> = {
  goldUsdPerOz: 2350.0,
  silverUsdPerOz: 29.5,
  platinumUsdPerOz: 1020.0,
  palladiumUsdPerOz: 980.0,
};

// Reuse snapshots younger than this to avoid flooding the table
const SNAPSHOT_REUSE_MINUTES = 15;

export async function getOrCreateSnapshot(userId: string, teamId: string): Promise<PriceSnapshot> {
  const recentCutoff = new Date(Date.now() - SNAPSHOT_REUSE_MINUTES * 60 * 1000);

  const [existing] = await db
    .select()
    .from(priceSnapshots)
    .where(and(
      eq(priceSnapshots.userId, userId), 
      eq(priceSnapshots.teamId, teamId),
      gte(priceSnapshots.fetchedAt, recentCutoff)
    ))
    .orderBy(desc(priceSnapshots.fetchedAt))
    .limit(1);

  if (existing) {
    console.log(`[pricing] reusing snapshot id=${existing.id} fetched=${existing.fetchedAt}`);
    return rowToSnapshot(existing);
  }

  const prices: MetalPrices = {
    ...FALLBACK_PRICES,
    source: "hardcoded_fallback",
    fetchedAt: new Date(),
  };

  const snapshotId = await persistSnapshot(userId, teamId, prices);
  console.log(`[pricing] created new snapshot id=${snapshotId} source=${prices.source}`);
  return { ...prices, snapshotId };
}

export async function persistSnapshot(userId: string, teamId: string, prices: MetalPrices): Promise<string> {
  const [inserted] = await db
    .insert(priceSnapshots)
    .values({
      userId,
      teamId,
      source: prices.source,
      goldUsdPerOz: prices.goldUsdPerOz.toString(),
      silverUsdPerOz: prices.silverUsdPerOz.toString(),
      platinumUsdPerOz: prices.platinumUsdPerOz.toString(),
      palladiumUsdPerOz: prices.palladiumUsdPerOz.toString(),
      fetchedAt: prices.fetchedAt,
    })
    .returning({ id: priceSnapshots.id });

  if (!inserted) throw new Error("Failed to persist price snapshot");
  return inserted.id;
}

export async function getLatestSnapshot(userId: string, teamId: string): Promise<PriceSnapshot | null> {
  const [row] = await db
    .select()
    .from(priceSnapshots)
    .where(and(eq(priceSnapshots.userId, userId), eq(priceSnapshots.teamId, teamId)))
    .orderBy(desc(priceSnapshots.fetchedAt))
    .limit(1);

  return row ? rowToSnapshot(row) : null;
}

type SnapshotRow = typeof priceSnapshots.$inferSelect;

function rowToSnapshot(row: SnapshotRow): PriceSnapshot {
  return {
    snapshotId: row.id,
    goldUsdPerOz: Number(row.goldUsdPerOz ?? FALLBACK_PRICES.goldUsdPerOz),
    silverUsdPerOz: Number(row.silverUsdPerOz ?? FALLBACK_PRICES.silverUsdPerOz),
    platinumUsdPerOz: Number(row.platinumUsdPerOz ?? FALLBACK_PRICES.platinumUsdPerOz),
    palladiumUsdPerOz: Number(row.palladiumUsdPerOz ?? FALLBACK_PRICES.palladiumUsdPerOz),
    source: row.source,
    fetchedAt: row.fetchedAt,
  };
}

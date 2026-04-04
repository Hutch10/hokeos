import { headers } from "next/headers";
import { db } from "@/db";
import { metalPrices } from "@/db/schema";
import { supportedMetalTypes, type MetalType } from "@/lib/prices/price-history-service";
import { redis } from "@/lib/redis";

type ProviderPriceMap = Record<MetalType, number>;

type IngestionResult = {
  timestamp: Date;
  source: string;
  insertedCount: number;
  skippedCount: number;
  prices: ProviderPriceMap;
};

const METALS_API_BASE_URL = process.env.METALS_API_BASE_URL ?? "https://metals-api.com/api";
const METALS_API_KEY = process.env.METALS_API_KEY;

// Phase 41: Circuit Breaker State
let cbFailures = 0;
let cbLastFailureTime = 0;
const CB_THRESHOLD = 5;
const CB_COOLDOWN_MS = 10 * 60 * 1000; // 10 minutes

const STATIC_BASELINE: ProviderPriceMap = {
  gold: 2350,
  silver: 29.5,
  platinum: 1020,
  palladium: 980,
};

function startOfUtcDay(input: Date): Date {
  return new Date(Date.UTC(input.getUTCFullYear(), input.getUTCMonth(), input.getUTCDate(), 0, 0, 0, 0));
}

function r4(value: number): number {
  return Math.round(value * 10000) / 10000;
}

function extractPriceMapFromRates(data: unknown): ProviderPriceMap | null {
  if (!data || typeof data !== "object") {
    return null;
  }

  const rates = (data as { rates?: Record<string, number> }).rates;
  if (!rates) {
    return null;
  }

  const xau = rates.XAU;
  const xag = rates.XAG;
  const xpt = rates.XPT;
  const xpd = rates.XPD;

  if (!xau || !xag || !xpt || !xpd) {
    return null;
  }

  // metals-api commonly returns rates as "metal ounces per 1 USD" for base USD.
  // Convert to USD per troy ounce by inverting the rate.
  return {
    gold: r4(1 / xau),
    silver: r4(1 / xag),
    platinum: r4(1 / xpt),
    palladium: r4(1 / xpd),
  };
}

function fallbackPriceMap(date: Date): ProviderPriceMap {
  const daySeed = Math.floor(date.getTime() / (24 * 60 * 60 * 1000));

  return {
    gold: r4(STATIC_BASELINE.gold * (1 + Math.sin(daySeed * 0.11) * 0.008)),
    silver: r4(STATIC_BASELINE.silver * (1 + Math.sin(daySeed * 0.17 + 1.3) * 0.012)),
    platinum: r4(STATIC_BASELINE.platinum * (1 + Math.sin(daySeed * 0.09 + 2.1) * 0.01)),
    palladium: r4(STATIC_BASELINE.palladium * (1 + Math.sin(daySeed * 0.13 + 2.9) * 0.014)),
  };
}

async function withRetry<T>(
  fn: () => Promise<T>,
  retries = 3,
  delay = 1000,
  factor = 2
): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    if (retries <= 0) throw error;
    await new Promise((resolve) => setTimeout(resolve, delay));
    return withRetry(fn, retries - 1, delay * factor, factor);
  }
}

async function fetchProviderPrices(date: Date): Promise<{ prices: ProviderPriceMap; source: string }> {
  // Phase 41: Circuit Breaker Check
  if (cbFailures >= CB_THRESHOLD && Date.now() - cbLastFailureTime < CB_COOLDOWN_MS) {
    console.warn(`[prices-ingest] Circuit Breaker OPEN. Skipping provider fetch for ${CB_COOLDOWN_MS / 60000}m.`);
    return { prices: fallbackPriceMap(date), source: "fallback_simulated" };
  }

  if (!METALS_API_KEY) {
    return { prices: fallbackPriceMap(date), source: "fallback_simulated" };
  }

  const day = date.toISOString().slice(0, 10);
  const url = `${METALS_API_BASE_URL}/latest?access_key=${encodeURIComponent(METALS_API_KEY)}&base=USD&symbols=XAU,XAG,XPT,XPD&date=${day}`;

  const executeFetch = async () => {
    const headerList = await headers().catch(() => null);
    const traceId = headerList?.get("x-hoke-trace-id") || 
                    headerList?.get("x-request-id") || 
                    `hoke-ingest-${Date.now()}`;

    const response = await fetch(url, {
      method: "GET",
      cache: "no-store",
      headers: { 
        Accept: "application/json",
        "X-Hoke-Trace-ID": traceId,
        "X-Hoke-Sovereign-Mode": "false",
      },
    });

    if (!response.ok) {
      throw new Error(`[prices-ingest] HTTP ${response.status} trace=${traceId}`);
    }

    const json = (await response.json().catch(() => null)) as unknown;
    const extracted = extractPriceMapFromRates(json);

    if (!extracted) {
      throw new Error("[prices-ingest] Invalid rates payload");
    }

    return { prices: extracted, source: "metals_api" };
  };

  try {
    // Phase 41: Exponential Backoff
    const result = await withRetry(executeFetch, 3, 1000, 2);
    
    // Reset Circuit Breaker on success
    cbFailures = 0;
    return result;
  } catch (error) {
    cbFailures += 1;
    cbLastFailureTime = Date.now();
    console.warn(`[prices-ingest] Provider fetch failed after retries (Total Failures: ${cbFailures}), using fallback`, error);
    return { prices: fallbackPriceMap(date), source: "fallback_simulated" };
  }
}

export async function ingestDailySpotPrices(date = new Date()): Promise<IngestionResult> {
  const timestamp = startOfUtcDay(date);
  const dayStr = timestamp.toISOString().slice(0, 10);
  const lockKey = `hokeos:ingest:lock:${dayStr}`;

  // Phase 42: Idempotency Check
  const isLocked = await redis.get<boolean>(lockKey);
  if (isLocked) {
    console.log(`[prices-ingest] Skip: Job for ${dayStr} already completed or in-progress (Idempotency Lock FOUND)`);
    // Return early with empty/mock result or throw specialized error
    // For now, we return a blank result to signify skip
    return {
      timestamp,
      source: "idempotency_skip",
      insertedCount: 0,
      skippedCount: 0,
      prices: fallbackPriceMap(timestamp),
    };
  }

  // Set lock for 5 minutes during execution
  await redis.set(lockKey, true, 300);

  const { prices, source } = await fetchProviderPrices(timestamp);

  const values = supportedMetalTypes.map((metalType) => ({
    metalType,
    priceUsdPerUnit: prices[metalType].toString(),
    timestamp,
    source,
  }));

  const inserted = await db
    .insert(metalPrices)
    .values(values)
    .onConflictDoNothing({ target: [metalPrices.metalType, metalPrices.timestamp] })
    .returning({ id: metalPrices.id });

  const insertedCount = inserted.length;
  const skippedCount = values.length - insertedCount;

  return {
    timestamp,
    source,
    insertedCount,
    skippedCount,
    prices,
  };
}

export async function backfillRecentDailyPrices(days: number): Promise<IngestionResult[]> {
  const safeDays = Math.min(Math.max(days, 1), 90);
  const results: IngestionResult[] = [];

  for (let offset = safeDays - 1; offset >= 0; offset -= 1) {
    const day = new Date(Date.now() - offset * 24 * 60 * 60 * 1000);
    const result = await ingestDailySpotPrices(day);
    results.push(result);
  }

  return results;
}

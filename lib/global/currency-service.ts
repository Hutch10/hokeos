import { db } from "@/db";
import { currencies, exchangeRates } from "@/db/schema";
import { eq } from "drizzle-orm";
import { redis } from "@/lib/redis";

/**
 * Phase 45: Sovereign Currency Service (v1.9.5-GLOBAL)
 * Manages industrial FX conversion for global metal spot prices.
 */

const FX_CACHE_KEY = "hokeos:fx:rates";
const FX_CACHE_TTL = 3600; // 1 hour

export class SovereignCurrencyService {
  /**
   * Mock data for industrial currency support.
   */
  private static mockRates: Record<string, number> = {
    "USD_EUR": 0.92,
    "USD_GBP": 0.79,
    "USD_CAD": 1.36,
    "EUR_USD": 1.09,
    "GBP_USD": 1.27,
    "CAD_USD": 0.74,
  };

  /**
   * Convert an amount from one currency to another.
   */
  public static async convert(amount: number, from: string, to: string): Promise<number> {
    if (from === to) return amount;

    const rateKey = `${from}_${to}`;
    const rate = this.mockRates[rateKey];

    if (!rate) {
      throw new Error(`Exchange rate for ${from} to ${to} not found in Sovereign FX gate.`);
    }

    return amount * rate;
  }

  /**
   * Get all supported currencies.
   */
  public static async getSupportedCurrencies() {
    return db.select().from(currencies).where(eq(currencies.status, "active"));
  }

  /**
   * Refresh FX rates from the mock provider and sync to DB/Redis.
   */
  public static async syncExchangeRates() {
    const pairs = Object.entries(this.mockRates);
    
    for (const [pair, rate] of pairs) {
      const [from, to] = pair.split("_");
      if (!from || !to) continue;

      await db.insert(exchangeRates).values({
        fromCurrency: from,
        toCurrency: to,
        rate: rate.toString(),
        provider: "SovereignFX-Mock-v1",
        timestamp: new Date(),
      });
    }

    await redis.set(FX_CACHE_KEY, this.mockRates, FX_CACHE_TTL);
    return true;
  }
}

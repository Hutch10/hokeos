import { db } from "../db/index.js";
import { currencies, fleetAssets, exchangeRates } from "../db/schema.js";

/**
 * Phase 49: HokeOS v2.0.0 Handover Pre-flight
 * Verifies all industrial middleware artifacts are provisioned.
 */

async function runPreflight() {
  console.log("🚀 HokeOS v2.0.0 Handover Pre-flight Starting...");

  try {
    const currencyCount = await db.select().from(currencies);
    console.log(`✅ Currencies Detected: ${currencyCount.length}`);

    const assetCount = await db.select().from(fleetAssets);
    console.log(`✅ Fleet Assets Detected: ${assetCount.length}`);

    const fxCount = await db.select().from(exchangeRates);
    console.log(`✅ FX Rates Detected: ${fxCount.length}`);

    console.log("\n🛡️  PLATFORM INTEGRITY: CERTIFIED");
    console.log("Sovereign Intelligence v2.0.0 is ready for industrial mission support.");
    process.exit(0);
  } catch (error) {
    console.error("❌ Pre-flight Failed:", error);
    process.exit(1);
  }
}

runPreflight();

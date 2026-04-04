import { calculateLotRoi } from "./roi";
import { GOLDEN_DATASET } from "./testing/golden-dataset";

/**
 * HokeOS Golden Standard Certification Suite
 */
function runGoldenCertification() {
  console.log("--------------------------------------------------");
  console.log("HOKE-OS V1.3.0 GOLDEN CERTIFICATION SUITE [EXECUTION]");
  console.log("--------------------------------------------------");

  let passCount = 0;
  let failCount = 0;

  GOLDEN_DATASET.forEach((scenario, index) => {
    console.log(`\n[SCENARIO ${index + 1}] ${scenario.name}`);
    
    const result = calculateLotRoi(scenario.input, scenario.confidenceMeta);
    
    const revenueMatch = result.revenue === scenario.expected.revenue;
    const scoreMatch = result.confidence.score === scenario.expected.score;
    const modeMatch = result.resultMode === scenario.expected.resultMode;
    const degradedMatch = result.confidence.degradedMode === scenario.expected.degradedMode;

    if (revenueMatch && scoreMatch && modeMatch && degradedMatch) {
      console.log(`✅ MATCH: Precision, Confidence, Mode, and Signalling verified.`);
      passCount++;
    } else {
      console.log(`❌ MISMATCH DETECTED:`);
      if (!revenueMatch) console.log(`  - Revenue: Found ${result.revenue}, Expected ${scenario.expected.revenue}`);
      if (!scoreMatch) console.log(`  - Confidence Score: Found ${result.confidence.score}, Expected ${scenario.expected.score}`);
      if (!modeMatch) console.log(`  - Result Mode: Found ${result.resultMode}, Expected ${scenario.expected.resultMode}`);
      if (!degradedMatch) console.log(`  - Degraded Mode: Found ${result.confidence.degradedMode}, Expected ${scenario.expected.degradedMode}`);
      failCount++;
    }

    // Trace Integrity Check
    if (result.calculationTrace.intermediateSteps.length > 0) {
      console.log(`✅ TRACE: Valid audit-ledger captured (${result.calculationTrace.intermediateSteps.length} steps).`);
    }
  });

  console.log("\n--------------------------------------------------");
  console.log(`CERTIFICATION SUMMARY: ${passCount} PASSED, ${failCount} FAILED.`);
  console.log("--------------------------------------------------");

  if (failCount > 0) {
    process.exit(1);
  }
}

runGoldenCertification();

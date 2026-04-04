import { calculateLotRoi } from "./roi";

function testV12Hardening() {
  console.log("--- Executing v1.2.0 Hardening Verification ---");

  // Case 1: Industrial Precision (1000g Gold)
  const result1 = calculateLotRoi({
    costs: [{ amount: 50000 }],
    recoveries: [
      { 
        metalType: "gold", 
        recoveredWeight: 1000, 
        purityPct: 99.99, 
        payableWeightPct: 98.5, 
        refiningChargePerOz: 5, 
        penaltyFees: 10,
        estimatedValue: 65000 
      }
    ]
  });
  
  console.log("\n[TEST 1] Industrial Settlement:");
  console.log("Revenue:", result1.revenue);
  console.log("Profit:", result1.profit);
  console.log("Confidence:", result1.confidence.score, result1.confidence.level);
  console.log("Trace Inputs (Weight):", result1.calculationTrace.inputs.recoveries);

  // Verification of 31.1034768
  // 1000g / 31.1034768 = 32.15074656 oz
  // 32.15074656 * 5 = 160.7537 refining
  // 160.7537 + 10 = 170.7537 total deductions
  // 65000 - 170.7537 = 64829.2463 -> rounded 64829.25
  if (result1.revenue === 64829.25) {
    console.log("✅ Precision Match: 31.1034768 Troy Oz constant successfully integrated.");
  } else {
    console.log("❌ Precision Mismatch. Found:", result1.revenue, "Expected: 64829.25");
  }

  // Case 2: Resilience Fallback Confidence
  const result2 = calculateLotRoi(
    { costs: [], recoveries: [] }, 
    { isMocked: true }
  );
  console.log("\n[TEST 2] Resilience Mock Penalty:");
  console.log("Confidence Score:", result2.confidence.score);
  if (result2.confidence.score === 50) {
    console.log("✅ Confidence Match: Mock penalty (-50) correctly applied.");
  }

  // Case 3: Calculation Traceability
  console.log("\n[TEST 3] Trace Audit:");
  if (result1.calculationTrace.intermediateSteps.length > 0) {
    console.log("✅ Traceability Match: Auditor ledger generated.");
    console.log("Sample Step:", result1.calculationTrace.intermediateSteps[1]);
  }

  console.log("\n--- v1.2.0 Verification Complete ---");
}

testV12Hardening();

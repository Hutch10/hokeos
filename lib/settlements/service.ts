import { eq, and } from "drizzle-orm";
import { Decimal } from "decimal.js";
import { db } from "@/db";
import { settlements, batches, suppliers, lots, teams } from "@/db/schema";
import { SovereignAuditLogger } from "@/lib/reports/audit-service";
import { verifySignature } from "@/lib/crypto/sha256";
import { DISPLAY_PRECISION } from "../constants";
import type { RefiningFeeSchedule, TeamFeeConfig } from "../metals/calculator-service";

/**
 * Phase 44/Sovereign: Settlement Reconciliation Service (v1.9.1-SOVEREIGN)
 * Implements the absolute financial reconciliation engine: Gross -> Net -> Payout.
 * Hardened for Industrial Alpha certification.
 */
export class SovereignSettlementService {
  /**
   * Cryptographically verify that the certificate has not been tampered with.
   * Uses deterministic HMAC-SHA256 with deep key sorting.
   */
  public static async verifyBatchIntegrity(batchId: string, teamId: string): Promise<boolean> {
    const [batch] = await db
      .select({
        auditSnapshot: batches.auditSnapshotJson,
        settlementHash: batches.settlementHash,
      })
      .from(batches)
      .where(and(eq(batches.id, batchId), eq(batches.teamId, teamId)))
      .limit(1);

    if (!batch || !batch.settlementHash || !batch.auditSnapshot) {
      return false;
    }

    return verifySignature(batch.auditSnapshot, batch.settlementHash);
  }

  /**
   * Create a draft settlement for a certified batch.
   * Hardened version uses Decimal.js for absolute precision.
   */
  public static async initiateSettlement(batchId: string, userId: string, teamId: string) {
    // 1. Fetch batch and verify it's certified (ADR-003/ADR-008)
    const [batch] = await db
      .select({
        id: batches.id,
        status: batches.status,
        resultJson: batches.resultJson,
        auditHash: batches.settlementHash,
        customerEmail: batches.customerEmail,
        lotId: batches.lotId,
      })
      .from(batches)
      .where(and(eq(batches.id, batchId), eq(batches.teamId, teamId)))
      .limit(1);

    if (!batch || batch.status !== "certified") {
      throw new Error("Only certified batches can be moved to settlement.");
    }

    // 2. CRYPTOGRAPHIC LOCK VERIFICATION (Priority 4 Hardening)
    const isIntegrityValid = await this.verifyBatchIntegrity(batchId, teamId);
    if (!isIntegrityValid) {
      throw new Error("INTEGRITY FAILURE: Batch audit snapshot does not match settlement hash. Payout BLOCKED.");
    }

    // 3. Resolve supplier (Auto-link if exists)
    let supplierId: string | null = null;
    if (batch.customerEmail) {
      const [existingSupplier] = await db
        .select({ id: suppliers.id })
        .from(suppliers)
        .where(and(eq(suppliers.email, batch.customerEmail), eq(suppliers.teamId, teamId)))
        .limit(1);
      
      supplierId = existingSupplier?.id ?? null;
    }

    // 4. Resolve Dynamic Fees (Priority 1 Hardening)
    const [lot] = batch.lotId 
      ? await db.select().from(lots).where(eq(lots.id, batch.lotId)).limit(1)
      : [null];
      
    const [team] = await db.select().from(teams).where(eq(teams.id, teamId)).limit(1);

    const feeSchedule = (lot?.refiningFeeSchedule as RefiningFeeSchedule) || {};
    const teamConfig = (team?.feeConfig as TeamFeeConfig) || {};

    // 5. Absolute precision math (Industrial Reconciliation)
    const results = (batch.resultJson as Record<string, number | null>) || {};
    const dGrossValue = new Decimal(results.totalNetValue || 0);
    
    // Industrial logic: Apply refining fees from lot + global tax from team
    const dFixedDeductions = new Decimal(feeSchedule.fixedCharge ?? 0);
    const dVariableRate = new Decimal(feeSchedule.percentageFee ?? 0).div(100);
    const dVariableFees = dGrossValue.mul(dVariableRate);
    
    const dDeductions = dFixedDeductions.plus(dVariableFees); 
    
    const dTaxRate = new Decimal(teamConfig.defaultTaxRate ?? 0).div(100); 
    const dTaxableBasis = Decimal.max(0, dGrossValue.minus(dDeductions));
    const dTaxValue = dTaxableBasis.mul(dTaxRate);
    
    const dNetPayout = dGrossValue.minus(dDeductions).minus(dTaxValue);

    const [settlement] = await db
      .insert(settlements)
      .values({
        teamId,
        userId,
        batchId: batch.id,
        supplierId,
        status: "draft",
        grossValue: dGrossValue.toFixed(DISPLAY_PRECISION),
        deductionsTotal: dDeductions.toFixed(DISPLAY_PRECISION),
        taxValue: dTaxValue.toFixed(DISPLAY_PRECISION),
        netPayout: dNetPayout.toFixed(DISPLAY_PRECISION),
        auditHash: batch.auditHash!,
      })
      .returning();

    await SovereignAuditLogger.log(teamId, userId, "settlement_initiated", "finance", {
      settlementId: settlement.id,
      batchId,
      grossValue: dGrossValue.toNumber(),
    });

    return settlement;
  }

  /**
   * Approve a settlement and transition to Pay-out.
   */
  public static async approveSettlement(settlementId: string, userId: string, teamId: string) {
    const [updated] = await db
      .update(settlements)
      .set({
        status: "approved",
        approvedAt: new Date(),
      })
      .where(and(eq(settlements.id, settlementId), eq(settlements.teamId, teamId)))
      .returning();

    await SovereignAuditLogger.log(teamId, userId, "settlement_approved", "finance", {
      settlementId,
      amount: updated.netPayout,
    });

    return updated;
  }
}

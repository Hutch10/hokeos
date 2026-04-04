"use server";

import { verifyBatchIntegrity, getBatchById } from "@/lib/metals/batch-service";
import { requireCurrentUser } from "@/lib/auth";

export type VerificationResult = {
  isValid: boolean;
  batchId: string;
  certifiedAt: Date | null;
  settlementHash: string | null;
  error?: string;
};

/**
 * Phase 44: Audit Verification Action
 * Public-facing (but auth-wrapped) utility to verify batch integrity.
 */
export async function verifySettlementAction(batchId: string): Promise<VerificationResult> {
  try {
    const user = await requireCurrentUser();
    const batch = await getBatchById(batchId, user.id);

    if (!batch) {
      return { isValid: false, batchId, certifiedAt: null, settlementHash: null, error: "Batch not found or access denied." };
    }

    const isValid = await verifyBatchIntegrity(batchId, user.id);

    return {
      isValid,
      batchId: batch.id,
      certifiedAt: batch.certifiedAt,
      settlementHash: batch.settlementHash,
    };
  } catch (error) {
    console.error("[audit] Verification failed:", error);
    return { isValid: false, batchId, certifiedAt: null, settlementHash: null, error: "Internal verification error." };
  }
}

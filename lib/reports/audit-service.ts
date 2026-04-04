import { db } from "@/db";
import { auditTrace } from "@/db/schema";
import { headers } from "next/headers";

export type AuditAction = 
  | "user_login"
  | "user_failed_login"
  | "investigation_resolved"
  | "investigation_dismissed"
  | "batch_certified"
  | "price_ingestion_success"
  | "price_ingestion_failure"
  | "rbac_access_denied"
  | "ticket_created"
  | "settlement_initiated"
  | "settlement_approved"
  | "payout_executed";

export type AuditCategory = "security" | "recovery" | "system" | "analytics" | "field_ops" | "finance";

export interface AuditLogOptions {
  teamId: string;
  userId?: string;
  action: AuditAction;
  category: AuditCategory;
  resourceId?: string;
  message: string;
  metadata?: Record<string, unknown>;
}

/**
 * Phase 41/44: Sovereign Audit Logger
 * Dispatches a non-repudiable event to the audit_trace ledger.
 */
export class SovereignAuditLogger {
  public static async log(
    teamId: string, 
    userId: string | undefined, 
    action: AuditAction, 
    category: AuditCategory, 
    metadata?: Record<string, unknown>
  ) {
    const headerList = await headers().catch(() => null);
    const ipAddress = headerList?.get("x-forwarded-for") || "unknown";
    const userAgent = headerList?.get("user-agent") || "unknown";

    try {
      const [log] = await db
        .insert(auditTrace)
        .values({
          teamId,
          userId: userId ?? null,
          action,
          category,
          message: `${action.toUpperCase()} - Industrial Event`,
          metadataJson: metadata ?? null,
          ipAddress,
          userAgent,
        })
        .returning();

      return log;
    } catch (err) {
      console.error(`[AUDIT-LEDGER-FAILURE] ${action}`, err);
      return null;
    }
  }
}

export async function createAuditLog(options: AuditLogOptions) {
  return SovereignAuditLogger.log(
    options.teamId,
    options.userId,
    options.action,
    options.category,
    options.metadata
  );
}

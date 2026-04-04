import { db } from "@/db";
import { auditTrace } from "@/db/schema";
import { logger } from "./logger";

/**
 * Phase 51: Industrial Audit Service
 * Centralizes immutable audit event recording.
 * Bridges structured logging with the relational audit ledger.
 */

export type AuditCategory = 
  | "AUTH"
  | "FIELD_YARD"
  | "FINANCE"
  | "SECURITY"
  | "SYSTEM"
  | "TEAM";

export interface AuditEvent {
  teamId: string;
  userId?: string;
  action: string;
  category: AuditCategory;
  resourceId?: string;
  message: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}

class AuditService {
  private static instance: AuditService;

  private constructor() {}

  public static getInstance(): AuditService {
    if (!AuditService.instance) {
      AuditService.instance = new AuditService();
    }
    return AuditService.instance;
  }

  /**
   * Records a mission-critical event to the immutable audit table
   * and the structured log sink simultaneously.
   */
  public async log(event: AuditEvent) {
    const traceId = logger.audit(`[${event.category}] ${event.action}: ${event.message}`, {
      teamId: event.teamId,
      userId: event.userId,
      category: event.category,
      ...event.metadata
    });

    try {
      await db.insert(auditTrace).values({
        teamId: event.teamId,
        userId: event.userId ?? null,
        action: event.action,
        category: event.category,
        resourceId: event.resourceId ?? null,
        message: event.message,
        metadataJson: event.metadata ?? {},
        ipAddress: event.ipAddress ?? null,
        userAgent: event.userAgent ?? null,
      });
    } catch (err) {
      // In pilot mode, we must NOT crash on audit failure, but we must log it loudly.
      logger.error("AUDIT-PERSISTENCE-FAILED", {
        traceId,
        originalEvent: event,
        error: err instanceof Error ? err.message : String(err)
      });
    }
  }
}

export const auditService = AuditService.getInstance();

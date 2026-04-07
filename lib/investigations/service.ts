import { eq, and, desc, inArray } from "drizzle-orm";
import { db } from "@/db";
import { investigations, investigationBatches, batches } from "@/db/schema";
import { z } from "zod";
import { createNotification } from "@/lib/notifications/service";
import { createAuditLog } from "@/lib/reports/audit-service";

export const investigationStatusSchema = z.enum(["open", "in_progress", "resolved", "archived"]);
export const investigationSeveritySchema = z.enum(["low", "medium", "high", "critical"]);

export const createInvestigationSchema = z.object({
  title: z.string().min(1).max(255),
  summary: z.string().optional(),
  severity: investigationSeveritySchema.default("medium"),
  batchIds: z.array(z.string().uuid()).optional(),
});

export type CreateInvestigationInput = z.infer<typeof createInvestigationSchema>;

export type InvestigationResult = {
  id: string;
  teamId: string;
  userId: string;
  title: string;
  summary: string | null;
  status: string;
  severity: string;
  evidenceJson: Record<string, unknown> | null;
  createdAt: Date;
  updatedAt: Date;
  linkedBatches?: { id: string; status: string; trustScore: string | null }[];
};

export async function createInvestigation(
  input: CreateInvestigationInput,
  userId: string,
  teamId: string
): Promise<InvestigationResult> {
  const [investigation] = await db
    .insert(investigations)
    .values({
      userId,
      teamId,
      title: input.title,
      summary: input.summary ?? null,
      severity: input.severity,
      status: "open",
    })
    .returning();

  if (!investigation) throw new Error("Failed to create investigation");

  if (input.batchIds && input.batchIds.length > 0) {
    await db.insert(investigationBatches).values(
      input.batchIds.map((batchId) => ({
        investigationId: investigation.id,
        batchId,
      }))
    );
  }

  // Phase 33: Broadcast Investigation Notification
  await createNotification({
    teamId,
    userId: userId === "system" ? undefined : userId,
    type: "investigation_created",
    message: `New Investigation: ${investigation.title} (${investigation.severity.toUpperCase()})`,
    metadata: {
      investigationId: investigation.id,
      severity: investigation.severity,
      batchCount: input.batchIds?.length ?? 0,
    },
  });

  return getInvestigationById(investigation.id, teamId);
}

export async function listInvestigations(teamId: string): Promise<InvestigationResult[]> {
  const rows = await db
    .select()
    .from(investigations)
    .where(eq(investigations.teamId, teamId))
    .orderBy(desc(investigations.createdAt));

  return (rows as any[]).map((row) => ({
    ...row,
    evidenceJson: row.evidenceJson as Record<string, unknown> | null,
    linkedBatches: [] as { id: string; status: string; trustScore: string | null }[],
  }));
}

export async function getInvestigationById(id: string, teamId: string): Promise<InvestigationResult> {
  const [investigation] = await db
    .select()
    .from(investigations)
    .where(and(eq(investigations.id, id), eq(investigations.teamId, teamId)))
    .limit(1);

  if (!investigation) throw new Error("Investigation not found");

  const linked = await db
    .select({
      id: batches.id,
      status: batches.status,
      trustScore: batches.trustScore,
    })
    .from(investigationBatches)
    .innerJoin(batches, eq(investigationBatches.batchId, batches.id))
    .where(eq(investigationBatches.investigationId, id));

  return {
    ...investigation,
    evidenceJson: investigation.evidenceJson as Record<string, unknown> | null,
    linkedBatches: linked as { id: string; status: string; trustScore: string | null }[],
  };
}

export async function updateInvestigationStatus(
  id: string,
  teamId: string,
  status: z.infer<typeof investigationStatusSchema>
): Promise<InvestigationResult> {
  await db
    .update(investigations)
    .set({ status, updatedAt: new Date() })
    .where(and(eq(investigations.id, id), eq(investigations.teamId, teamId)));

  return getInvestigationById(id, teamId);
}

/**
 * Phase 34: Resolve Investigation
 * Updates the case status AND signals settlement for all linked batches.
 */
export async function resolveInvestigation(
  id: string,
  teamId: string,
  userId: string,
  resolution: "verified" | "adjusted"
): Promise<InvestigationResult> {
  const investigation = await getInvestigationById(id, teamId);
  const status = "resolved";
  
  // 1. Update Investigation
  await db
    .update(investigations)
    .set({ 
      status, 
      resolution, 
      updatedAt: new Date() 
    })
    .where(and(eq(investigations.id, id), eq(investigations.teamId, teamId)));

  // 2. Update all linked Batches
  if (investigation.linkedBatches && investigation.linkedBatches.length > 0) {
    const batchIds = investigation.linkedBatches.map((b) => b.id);
    const newBatchStatus = resolution === "verified" ? "settled" : "adjusted";

    await db
      .update(batches)
      .set({ status: newBatchStatus, updatedAt: new Date() })
      .where(and(inArray(batches.id, batchIds), eq(batches.teamId, teamId)));
  }

  // 3. Broadcast Resolution Notification
  await createNotification({
    teamId,
    userId: userId === "system" ? undefined : userId,
    type: "investigation_resolved",
    message: `Investigation Resolved: ${investigation.title} (${resolution.toUpperCase()})`,
    metadata: {
      investigationId: id,
      resolution,
      batchCount: investigation.linkedBatches?.length ?? 0,
    },
  });

  // 4. Phase 41: Audit Ledger Persistence
  await createAuditLog({
    teamId,
    userId: userId === "system" ? undefined : userId,
    action: "investigation_resolved",
    category: "recovery",
    resourceId: id,
    message: `Investigation '${investigation.title}' resolved as ${resolution.toUpperCase()}`,
    metadata: {
      resolution,
      batchIds: investigation.linkedBatches?.map((b) => b.id) ?? [],
    },
  });

  return getInvestigationById(id, teamId);
}

/**
 * Phase 34: Dismiss Investigation
 * Archives the case and resets linked batches to pending.
 */
export async function dismissInvestigation(
  id: string,
  teamId: string,
  userId: string
): Promise<InvestigationResult> {
  const investigation = await getInvestigationById(id, teamId);
  const status = "archived";

  await db
    .update(investigations)
    .set({ 
      status, 
      resolution: "dismissed", 
      updatedAt: new Date() 
    })
    .where(and(eq(investigations.id, id), eq(investigations.teamId, teamId)));

  if (investigation.linkedBatches && investigation.linkedBatches.length > 0) {
    const batchIds = investigation.linkedBatches.map((b) => b.id);

    await db
      .update(batches)
      .set({ status: "pending", updatedAt: new Date() })
      .where(and(inArray(batches.id, batchIds), eq(batches.teamId, teamId)));
  }

  // 3. Broadcast Dismissal Notification
  await createNotification({
    teamId,
    userId: userId === "system" ? undefined : userId,
    type: "system",
    message: `Investigation Dismissed: ${investigation.title}`,
    metadata: {
      investigationId: id,
      action: "dismissed",
    },
  });

  // 4. Phase 41: Audit Ledger Persistence
  await createAuditLog({
    teamId,
    userId: userId === "system" ? undefined : userId,
    action: "investigation_dismissed",
    category: "security",
    resourceId: id,
    message: `Investigation '${investigation.title}' dismissed/archived`,
    metadata: {
      action: "dismissed",
    },
  });

  return getInvestigationById(id, teamId);
}

import { db } from "@/db";
import { notifications } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { notificationHub } from "./hub";
import { mockSendEmail } from "./providers/email-provider";
import { mockSendSlack } from "./providers/slack-provider";

export type NotificationType = "investigation_created" | "investigation_resolved" | "trust_alert" | "system";

export interface CreateNotificationInput {
  teamId: string;
  userId?: string;
  type: NotificationType;
  message: string;
  metadata?: Record<string, unknown>;
}

export async function createNotification(input: CreateNotificationInput) {
  const [newNotification] = await db
    .insert(notifications)
    .values({
      teamId: input.teamId,
      userId: input.userId ?? null,
      type: input.type,
      message: input.message,
      metadataJson: input.metadata ?? null,
    })
    .returning();

  if (newNotification) {
    // Phase 33 Real-Time: Broadcast to SSE Hub
    notificationHub.notify(input.teamId, newNotification);

    // Phase 35: External Alert Bridging for High-Severity Anomalies
    // Dispatch Email and Slack for every Critical investigation
    const isCritical = input.metadata?.severity === "critical";
    if (isCritical) {
      void mockSendEmail(
        "admin@hutchcore.com",
        "CRITICAL AUDIT ALERT - HokeOS Infrastructure",
        `Critical system anomaly detected.\n\nMessage: ${input.message}\nTeam ID: ${input.teamId}\n\nPlease review in the Audit Ledger immediately.`
      );

      void mockSendSlack(`*CRITICAL AUDIT ALERT*: ${input.message}\n_Team: ${input.teamId}_`);
    }
  }

  return newNotification;
}

export async function listNotifications(teamId: string, limit = 50) {
  return db
    .select()
    .from(notifications)
    .where(eq(notifications.teamId, teamId))
    .orderBy(desc(notifications.createdAt))
    .limit(limit);
}

export async function markAsRead(id: string, teamId: string) {
  return db
    .update(notifications)
    .set({ readAt: new Date() })
    .where(and(eq(notifications.id, id), eq(notifications.teamId, teamId)))
    .returning();
}

export async function clearAllNotifications(teamId: string) {
  return db
    .update(notifications)
    .set({ readAt: new Date() })
    .where(eq(notifications.teamId, teamId))
    .returning();
}

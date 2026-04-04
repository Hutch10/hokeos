import { eq, and, desc } from "drizzle-orm";
import { db } from "@/db";
import { tickets, complianceRecords } from "@/db/schema";
import { scaleSDK } from "@/lib/hardware/scale-sdk";
import { cameraSDK } from "@/lib/hardware/camera-sdk";
import { SovereignAuditLogger } from "@/lib/reports/audit-service";

/**
 * Phase 43: Sovereign Ticketing Service (v1.8.0-YARD)
 * Implements the linear intake workflow: Gross -> Tare -> Photo -> Save
 */
export class SovereignTicketingService {
  /**
   * Initialize a new inbound ticket.
   */
  public static async createTicket(userId: string, teamId: string, type: "inbound" | "outbound" = "inbound") {
    const [ticket] = await db
      .insert(tickets)
      .values({
        userId,
        teamId,
        type,
        status: "pending",
      })
      .returning();

    await SovereignAuditLogger.log(teamId, userId, "ticket_created", "field_ops", {
      ticketId: ticket.id,
      timestamp: new Date().toISOString(),
    });

    return ticket;
  }

  /**
   * Capture the current weight from the active scale.
   */
  public static async captureWeight(ticketId: string, mode: "gross" | "tare") {
    const reading = await scaleSDK.getReading();
    
    if (reading.status !== "stable") {
      throw new Error(`Scale is in motion (${reading.status}). Please wait for stability.`);
    }

    const updateData = mode === "gross" 
      ? { grossWeight: reading.weight.toString(), status: "weighted" } 
      : { tareWeight: reading.weight.toString() };

    const [updated] = await db
      .update(tickets)
      .set({
        ...updateData,
        updatedAt: new Date(),
      })
      .where(eq(tickets.id, ticketId))
      .returning();

    return updated;
  }

  /**
   * Finalize compliance and audit data.
   */
  public static async finalizeTicket(ticketId: string, donorInfo?: { vin?: string, seller?: string }) {
    // 1. Snapshot the camera
    const snapshot = await cameraSDK.capture(ticketId);

    const [finalized] = await db
      .update(tickets)
      .set({
        photoUrl: snapshot.url,
        status: "closed",
        updatedAt: new Date(),
      })
      .where(eq(tickets.id, ticketId))
      .returning();

    // 2. Proactive NMVTIS detection (Mock)
    if (donorInfo?.vin) {
      await db.insert(complianceRecords).values({
        ticketId,
        teamId: finalized.teamId,
        vin: donorInfo.vin,
        sellerName: donorInfo.seller,
        disposition: "pending_intake",
      });
    }

    return finalized;
  }

  public static async listActiveTickets(teamId: string) {
    return db
      .select()
      .from(tickets)
      .where(and(eq(tickets.teamId, teamId), eq(tickets.status, "pending")))
      .orderBy(desc(tickets.createdAt));
  }
}

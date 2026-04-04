import { EventEmitter } from "events";

/**
 * Phase 33: Notification Hub
 * Global singleton for real-time SSE broadcasts.
 * Bridges backend service events to active client streams.
 */
class NotificationHub extends EventEmitter {
  private static instance: NotificationHub;
  private pulseInterval?: NodeJS.Timeout;

  private constructor() {
    super();
    this.setMaxListeners(200);

    // Phase 37: 30-second keep-alive pulse
    this.startPulse();
  }

  private startPulse() {
    if (this.pulseInterval) return;
    this.pulseInterval = setInterval(() => {
      this.emit("heartbeat", { timestamp: new Date().toISOString() });
    }, 30000); // 30s
  }

  public static getInstance(): NotificationHub {
    if (!NotificationHub.instance) {
      NotificationHub.instance = new NotificationHub();
    }
    return NotificationHub.instance;
  }

  public notify(teamId: string, data: Record<string, unknown>) {
    this.emit(`notify:${teamId}`, data);
  }
}

export const notificationHub = NotificationHub.getInstance();

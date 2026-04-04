"use client";

import { useEffect, useState } from "react";
import { ActionToast } from "@/components/ui/action-toast";

/**
 * Phase 33: Live Notifications Listener
 * Global client-side SSE subscriber.
 * Displays immediate alerts via ActionToast and updates global state.
 */
export function LiveNotifications() {
  const [lastNotification, setLastNotification] = useState<{
    id: string;
    message: string;
    type: string;
    metadataJson?: Record<string, unknown>;
  } | null>(null);

  useEffect(() => {
    let eventSource: EventSource | null = null;
    let reconnectTimeout: NodeJS.Timeout | null = null;
    let reconnectDelay = 1000; // Start with 1s
    const maxReconnectDelay = 30000; // Cap at 30s

    function connect() {
      if (eventSource) eventSource.close();
      
      console.log(`[Phase 51] Establishing industrial SSE (attempting with ${reconnectDelay}ms delay)...`);
      eventSource = new EventSource("/api/notifications");

      eventSource.onopen = () => {
        console.log("[Phase 51] SSE Connection: VERIFIED");
        reconnectDelay = 1000; // Reset on success
      };

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          setLastNotification(data);
        } catch (err) {
          console.error("[Phase 51] SSE Parse Failure:", err);
        }
      };

      // Phase 51: Industrial Reconnection Logic
      // Handles the 25s server-side cap and unexpected Wi-Fi drops.
      eventSource.addEventListener("close", (e: any) => {
        console.log("[Phase 51] Server requested clean reconnection:", e.data);
        scheduleReconnect(100); // Immediate reconnect for clean closes
      });

      eventSource.onerror = (err) => {
        console.warn("[Phase 51] SSE Stream Interrupted (likely Wi-Fi or Vercel Timeout). Reconnecting...");
        eventSource?.close();
        scheduleReconnect();
      };
    }

    function scheduleReconnect(delayOverride?: number) {
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      
      const delay = delayOverride ?? reconnectDelay;
      reconnectTimeout = setTimeout(() => {
        connect();
        // Increment delay for next time (exponential backoff)
        if (!delayOverride) {
          reconnectDelay = Math.min(reconnectDelay * 1.5, maxReconnectDelay);
        }
      }, delay);
    }

    connect();

    return () => {
      if (eventSource) eventSource.close();
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
    };
  }, []);

  if (!lastNotification) return null;

  // Determining tone based on severity or type
  const severity = lastNotification.metadataJson?.severity;
  const tone = severity === "critical" || severity === "high" ? "error" : "success";

  return (
    <ActionToast 
      key={lastNotification.id} 
      message={lastNotification.message} 
      tone={tone}
    />
  );
}

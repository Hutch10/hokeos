import { NextRequest } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth"; // Verify existance of authOptions
import { notificationHub } from "@/lib/notifications/hub";

export const dynamic = "force-dynamic";

/**
 * Phase 33: SSE Notification Stream
 * Estabishes a persistent event source for real-time audit alerts.
 */
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const teamId = session.user.activeTeamId;
  const encoder = new TextEncoder();

  let isClosed = false;

  const stream = new ReadableStream({
    start(controller) {
      const onNotify = (data: Record<string, unknown>) => {
        if (isClosed) return;
        const payload = `data: ${JSON.stringify(data)}\n\n`;
        controller.enqueue(encoder.encode(payload));
      };

      const onHeartbeat = (data: { timestamp: string }) => {
        if (isClosed) return;
        const payload = `: heartbeat ${data.timestamp}\n\n`;
        controller.enqueue(encoder.encode(payload));
      };

      // Listen for broadcasts to this specific team
      notificationHub.on(`notify:${teamId}`, onNotify);
      notificationHub.on("heartbeat", onHeartbeat);

      // Phase 51: Industrial Serverless Stream Capping
      // Vercel serverless has execution limits. We close the stream at 25s 
      // to ensure a clean client-side reconnection before platform termination.
      const timeout = setTimeout(() => {
        if (!isClosed) {
          isClosed = true;
          controller.enqueue(encoder.encode("event: close\ndata: reconnecting\n\n"));
          controller.close();
          notificationHub.off(`notify:${teamId}`, onNotify);
          notificationHub.off("heartbeat", onHeartbeat);
        }
      }, 25000);

      req.signal.onabort = () => {
        isClosed = true;
        clearTimeout(timeout);
        notificationHub.off(`notify:${teamId}`, onNotify);
        notificationHub.off("heartbeat", onHeartbeat);
      };
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      "Connection": "keep-alive",
      "X-Accel-Buffering": "no", // Essential for Nginx/Proxy buffering bypass
    },
  });
}

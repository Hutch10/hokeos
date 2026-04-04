"use client";

import { useCallback, useEffect, useState } from "react";

export type ScaleReading = {
  weight: number;
  unit: string;
  isStable: boolean;
  deviceId: string;
};

/**
 * Phase 1: Hardware Sovereignty
 * React hook for direct industrial scale integration via WebSerial API.
 * Supports NCI Standard Protocol (the most common industrial serial format).
 */
export function useSerialScale() {
  const [reading, setReading] = useState<ScaleReading | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [port, setPort] = useState<any>(null);

  const connect = useCallback(async () => {
    if (typeof window === "undefined" || !("serial" in navigator)) {
      setError("WebSerial is not supported in this browser. Use Chrome or Edge.");
      return;
    }

    setIsConnecting(true);
    setError(null);

    try {
      // @ts-ignore - WebSerial is not in default lib.dom
      const p = await navigator.serial.requestPort();
      
      // Standard industrial scale defaults: 9600 baud, 8 bits, no parity, 1 stop bit
      await p.open({ baudRate: 9600 });
      
      setPort(p);
      setIsConnected(true);
      setError(null);
    } catch (err: any) {
      console.error("Scale connection error:", err);
      if (err.name === "NotFoundError") {
        setError("No device selected.");
      } else {
        setError(err.message || "Failed to connect to scale.");
      }
    } finally {
      setIsConnecting(false);
    }
  }, []);

  const disconnect = useCallback(async () => {
    if (port) {
      try {
        await port.close();
      } catch (err) {
        console.error("Error closing serial port:", err);
      }
      setPort(null);
      setIsConnected(false);
      setReading(null);
    }
  }, [port]);

  useEffect(() => {
    if (!port || !isConnected) return;

    let reader: ReadableStreamDefaultReader | null = null;
    let keepReading = true;
    let buffer = "";

    async function startReading() {
      while (port.readable && keepReading) {
        reader = port.readable.getReader();
        try {
          while (true) {
            const { value, done } = await reader.read();
            if (done) break;

            const chunk = new TextDecoder().decode(value);
            buffer += chunk;

            // Industrial scales usually terminate sentences with \r or \n
            if (buffer.includes("\r") || buffer.includes("\n")) {
              const lines = buffer.split(/[\r\n]+/);
              // Process all complete lines
              for (let i = 0; i < lines.length - 1; i++) {
                const line = lines[i].trim();
                
                /**
                 * NCI Standard Parser
                 * Typically: "S  102.50 lb\r" or "M  102.50 lb\r"
                 * S = Stable, M = Motion
                 */
                const matches = line.match(/^([SM?])\s*([-+]?[0-9]*\.?[0-9]+)\s*(lb|kg|g|oz)/i);
                if (matches) {
                  const status = matches[1];
                  const weight = parseFloat(matches[2]);
                  const unit = matches[3].toLowerCase();

                  setReading({
                    weight,
                    unit,
                    isStable: status === "S",
                    deviceId: "serial-port-v1", // In prod, we'd use USB VendorID if available
                  });
                }
              }
              // Keep the last partial line in the buffer
              buffer = lines[lines.length - 1];
            }
          }
        } catch (err) {
          console.error("Serial read error:", err);
          setError("Lost connection to scale.");
          setIsConnected(false);
          break;
        } finally {
          if (reader) {
            reader.releaseLock();
          }
        }
      }
    }

    startReading();

    return () => {
      keepReading = false;
      if (reader) {
        reader.cancel().catch(e => console.error("Error canceling reader:", e));
      }
    };
  }, [port, isConnected]);

  return {
    reading,
    isConnected,
    isConnecting,
    error,
    connect,
    disconnect
  };
}

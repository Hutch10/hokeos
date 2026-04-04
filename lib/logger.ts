import { v4 as uuidv4 } from "uuid";

/**
 * Phase 51: Industrial Structured Logging Utility
 * Standardizes diagnostic output for Vercel and local observability.
 * Captures user, team, and trace context automatically.
 */

type LogLevel = "INFO" | "WARN" | "ERROR" | "AUDIT" | "DEBUG";

interface LogContext {
  userId?: string;
  teamId?: string;
  traceId?: string;
  category?: string;
  [key: string]: unknown;
}

class SovereignLogger {
  private static instance: SovereignLogger;
  
  private constructor() {}

  public static getInstance(): SovereignLogger {
    if (!SovereignLogger.instance) {
      SovereignLogger.instance = new SovereignLogger();
    }
    return SovereignLogger.instance;
  }

  private format(level: LogLevel, message: string, context: LogContext = {}) {
    const timestamp = new Date().toISOString();
    const traceId = context.traceId || `hoke-${Date.now()}-${uuidv4().slice(0, 8)}`;
    
    const structuredLog = {
      timestamp,
      level,
      message,
      traceId,
      ...context,
    };

    // In a real industrial environment, this would ship to an external sink (Datadog/Logtail)
    // For the v2.0.0 Pilot, we output structured JSON for Vercel Logs to ingest.
    const output = JSON.stringify(structuredLog);

    switch (level) {
      case "ERROR":
        console.error(output);
        break;
      case "WARN":
        console.warn(output);
        break;
      default:
        console.log(output);
        break;
    }

    return traceId;
  }

  public info(message: string, context?: LogContext) {
    return this.format("INFO", message, context);
  }

  public warn(message: string, context?: LogContext) {
    return this.format("WARN", message, context);
  }

  public error(message: string, context?: LogContext) {
    return this.format("ERROR", message, context);
  }

  public audit(message: string, context?: LogContext) {
    return this.format("AUDIT", message, context);
  }

  public debug(message: string, context?: LogContext) {
    if (process.env.NODE_ENV === "development") {
      return this.format("DEBUG", message, context);
    }
  }
}

export const logger = SovereignLogger.getInstance();

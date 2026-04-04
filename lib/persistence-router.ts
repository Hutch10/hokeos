import { headers } from "next/headers";
import * as realBatchService from "./metals/batch-service";
import * as mockBatchService from "./metals/batch-service.mock";
import * as realLotService from "./lots/lot-service";
import * as mockLotService from "./lots/lot-service.mock";
import * as realBillingService from "./billing/service";
import * as mockBillingService from "./billing/service.mock";
import * as realPriceService from "./prices";
import * as mockPriceService from "./prices.mock";
import * as realReportService from "./reports";
import * as mockReportService from "./reports/index.mock";
import * as realTagService from "./tags/tag-service";
import * as mockTagService from "./tags/tag-service.mock";
import * as realInvestigationService from "./investigations/service";
import * as mockInvestigationService from "./investigations/service.mock";
import { db, PERSISTENCE_MODE } from "@/db";
import { systemTelemetry } from "@/db/schema";

const DB_RESILIENCE_ERRORS = [
  "ECONNRESET",
  "ETIMEDOUT",
  "ECONNREFUSED",
  "28P01", // Invalid password
  "57P01", // Admin shutdown
  "Connection terminated",
  "Connection refused",
];

/**
 * Phase 15: Sovereign Connectivity Error
 * Thrown when a service call fails and no safe fallback was verified.
 */
export class SovereignConnectivityError extends Error {
  constructor(message: string, public readonly traceId: string, public readonly serviceName: string) {
    super(`[Sovereign Error - v1.3.2] ${serviceName}: ${message} (Trace: ${traceId})`);
    this.name = "SovereignConnectivityError";
  }
}

/**
 * ServiceMethod represents a generic asynchronous service function.
 */
type ServiceMethod = (...args: unknown[]) => Promise<unknown>;

/**
 * ServiceShape represents a collection of service methods.
 */
type ServiceShape = Record<string, ServiceMethod | unknown>;

function isDatabaseError(err: Error | unknown): boolean {
  if (!err) return false;

  const errObj = err as Record<string, unknown>;
  const errStr = JSON.stringify(err);
  const message = (String(err instanceof Error ? err.message : err)).toUpperCase();
  const code = String(errObj?.code || "").toUpperCase();
  const stack = (String(err instanceof Error ? err.stack : "")).toUpperCase();
  
  const matchesKeyword = DB_RESILIENCE_ERRORS.some((e: string) => 
    message.includes(e.toUpperCase()) || 
    code.includes(e.toUpperCase()) || 
    stack.includes(e.toUpperCase()) ||
    errStr.toUpperCase().includes(e.toUpperCase())
  );

  if (matchesKeyword) return true;

  const patterns = [
    "READ ECONNRESET",
    "WRITE EPIPE",
    "ETIMEDOUT",
    "AUTHENTICATION FAILED",
    "CONNECTION TERMINATED",
  ];

  if (patterns.some(p => message.includes(p))) return true;

  if (process.env.NODE_ENV === "development") {
    if (code.startsWith("E") || message.includes("FETCH") || message.includes("DATABASE")) {
      return true;
    }
  }

  return false;
}

/**
 * Creates a transparent proxy around a real service that automatically
 * falls back to a mock service if a database connectivity error is detected.
 * Strictly typed to prevent 'any' leakage and ensure signature parity.
 */
function createResilientService<T extends ServiceShape>(real: T, mock: T, serviceName: string): T {
  return new Proxy(real, {
    get(target, prop) {
      const original = target[prop as keyof T];
      
      if (typeof original !== "function") {
        return original;
      }

      // Preserve original function signature exactly
      const wrapped = async (...args: unknown[]): Promise<unknown> => {
        let traceId = "hoke-trace-unknown";
        try {
          const headerList = await headers().catch(() => null);
          traceId = headerList?.get("x-hoke-trace-id") || 
                    headerList?.get("x-request-id") || 
                    `hoke-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
        } catch {
          // Fallback trace generation if header access fails
        }

        try {
          return await (original as (...a: unknown[]) => Promise<unknown>).apply(target, args);
        } catch (err) {
          if (isDatabaseError(err)) {
            if (PERSISTENCE_MODE === "SOVEREIGN") {
              console.log(`\u001b[36m[Sovereign Local] ${serviceName}.${String(prop)} is running on SQLite. Trace: ${traceId}.\u001b[0m`);
              // In Sovereign Mode, we execute the "Real" logic on the SQLite instance.
              // If the REAL service itself fails (even on SQLite), then we fallback to mocks
              // ONLY as a visual training tool.
            } else {
              console.error(`\u001b[33m[Autonomous Resilience] ${serviceName}.${String(prop)} failed. Trace: ${traceId}. Sovereign Fallback: Active.\u001b[0m`);
            }
            
            try {
              // We use a detached insertion to avoid blocking the fallback UI
              const teamIdHeader = (await headers().catch(() => null))?.get("x-hoke-team-id");
              if (teamIdHeader) {
                await db.insert(systemTelemetry).values({
                  teamId: teamIdHeader,
                  serviceName,
                  methodName: String(prop),
                  errorType: err instanceof Error ? err.name : "UnknownError",
                  severity: "critical",
                  traceId,
                }).catch(() => null); // Silent catch to prevent recursion if DB is truly gone
              }
            } catch {
              // Ignore telemetry failures during total blackout
            }

            // Phase 10 Trace: Report fallback to the Trust-Layer Sentinel
            try {
              const { Sentinel } = await import("./analytics/sentinel");
              Sentinel.trackEvent("fallbackTriggerCount");
            } catch {
              // Fail silently for sentinel trace, prioritize the main fallback
            }

            const mockFn = mock[prop as keyof T];
            if (typeof mockFn === "function") {
              return (mockFn as (...a: unknown[]) => Promise<unknown>).apply(mock, args);
            }
          }
          
          // Phase 15: Sovereign Enforcement
          // If it wasn't a verified database error, we do not mask the failure.
          throw new SovereignConnectivityError(
            err instanceof Error ? err.message : String(err),
            traceId,
            `${serviceName}.${String(prop)}`
          );
        }
      };

      return wrapped as typeof original;
    },
  });
}

async function isMockMode(): Promise<boolean> {
  const isDev = process.env.NODE_ENV === "development";
  if (!isDev) return false;
  
  try {
    const headerList = await headers();
    const referer = headerList.get("referer") || "";
    
    const hasMockQuery = referer.includes("mock=true");
    const isEnvMock = process.env.NEXT_PUBLIC_MOCK_MODE === "true";
    
    return hasMockQuery || isEnvMock;
  } catch {
    return process.env.NEXT_PUBLIC_MOCK_MODE === "true";
  }
}

// Service Shadow definitions with explicit signature preservation

export async function getBatchService(forceMock?: boolean): Promise<typeof realBatchService> {
  const mockNeeded = forceMock || await isMockMode();
  if (mockNeeded) return mockBatchService as unknown as typeof realBatchService;
  return createResilientService(realBatchService as unknown as ServiceShape, mockBatchService as unknown as ServiceShape, "BatchService") as unknown as typeof realBatchService;
}

export async function getLotService(forceMock?: boolean): Promise<typeof realLotService> {
  const mockNeeded = forceMock || await isMockMode();
  if (mockNeeded) return mockLotService as unknown as typeof realLotService;
  return createResilientService(realLotService as unknown as ServiceShape, mockLotService as unknown as ServiceShape, "LotService") as unknown as typeof realLotService;
}

export async function getBillingService(forceMock?: boolean): Promise<typeof realBillingService> {
  const mockNeeded = forceMock || await isMockMode();
  if (mockNeeded) return mockBillingService as unknown as typeof realBillingService;
  return createResilientService(realBillingService as unknown as ServiceShape, mockBillingService as unknown as ServiceShape, "BillingService") as unknown as typeof realBillingService;
}

export async function getPriceService(forceMock?: boolean): Promise<typeof realPriceService> {
  const mockNeeded = forceMock || await isMockMode();
  if (mockNeeded) return mockPriceService as unknown as typeof realPriceService;
  return createResilientService(realPriceService as unknown as ServiceShape, mockPriceService as unknown as ServiceShape, "PriceService") as unknown as typeof realPriceService;
}

export async function getReportService(forceMock?: boolean): Promise<typeof realReportService> {
  const mockNeeded = forceMock || await isMockMode();
  if (mockNeeded) return mockReportService as unknown as typeof realReportService;
  return createResilientService(realReportService as unknown as ServiceShape, mockReportService as unknown as ServiceShape, "ReportService") as unknown as typeof realReportService;
}

export async function getTagService(forceMock?: boolean): Promise<typeof realTagService> {
  const mockNeeded = forceMock || await isMockMode();
  if (mockNeeded) return mockTagService as unknown as typeof realTagService;
  return createResilientService(realTagService as unknown as ServiceShape, mockTagService as unknown as ServiceShape, "TagService") as unknown as typeof realTagService;
}

export async function getInvestigationService(forceMock?: boolean): Promise<typeof realInvestigationService> {
  const mockNeeded = forceMock || await isMockMode();
  if (mockNeeded) return mockInvestigationService as unknown as typeof realInvestigationService;
  return createResilientService(realInvestigationService as unknown as ServiceShape, mockInvestigationService as unknown as typeof realInvestigationService as unknown as ServiceShape, "InvestigationService") as unknown as typeof realInvestigationService;
}

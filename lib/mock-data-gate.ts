// Mock data gate - returns real services when mock mode is disabled
export const isMockEnabled = () => false;

// ─── Service Imports ──────────────────────────────────────────────────────────
import * as batchService from "@/lib/metals/batch-service";
import * as billingService from "@/lib/billing/service";
import * as investigationService from "@/lib/investigations/service";
import * as reportService from "@/lib/reports/schedule-service";
import * as tagService from "@/lib/tags/tag-service";

// ─── Service Exports (factory pattern for dependency injection) ───────────────

export function getBatchService(_mock?: boolean) {
  return batchService;
}

export function getBillingService(_mock?: boolean) {
  return billingService;
}

export function getInvestigationService(_mock?: boolean) {
  return investigationService;
}

export function getReportService(_mock?: boolean) {
  return reportService;
}

export function getTagService(_mock?: boolean) {
  return tagService;
}

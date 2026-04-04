// Mock data gate - returns real services when mock mode is disabled
// This file is SERVER-ONLY - do not import from client components
export const isMockEnabled = () => false;

// ─── Service Exports ──────────────────────────────────────────────────────────
// These functions are used by Server Components only

import * as batchService from "@/lib/metals/batch-service";
import * as billingService from "@/lib/billing/service";
import * as investigationService from "@/lib/investigations/service";
import * as reportService from "@/lib/reports/schedule-service";
import * as tagService from "@/lib/tags/tag-service";
import * as lotService from "@/lib/lots/lot-service";
import * as priceService from "@/lib/prices/index";

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

export function getLotService(_mock?: boolean) {
  return lotService;
}

export function getPriceService(_mock?: boolean) {
  return priceService;
}

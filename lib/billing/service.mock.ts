import { 
  type BillingSummary, 
  type BillingRecord, 
  type BillingPlan, 
  type BillingStatus, 
  type BillingFeature,
  BILLING_PLANS
} from "./service";

export async function getBillingSummary(teamId: string): Promise<BillingSummary> {
  return {
    record: {
      id: "mock-billing-id",
      teamId,
      plan: "pro",
      status: "active",
      stripeCustomerId: "cus_mock_123",
      stripeSubscriptionId: "sub_mock_123",
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    teamId,
    plan: "pro",
    status: "active",
    definition: BILLING_PLANS.pro,
    batchCount: 42,
    remainingBatches: null,
    canCreateBatch: true,
    canExport: true,
    canCompare: true,
  };
}

export async function ensureBillingRecord(teamId: string): Promise<BillingRecord> {
  return (await getBillingSummary(teamId)).record;
}

export async function getBillingRecordForTeam(teamId: string): Promise<BillingRecord> {
  return (await getBillingSummary(teamId)).record;
}

export async function getBillingRecordByCustomerId(customerId: string): Promise<BillingRecord | null> {
  return (await getBillingSummary("mock-team")).record;
}

export async function assertCanCreateBatch(teamId: string): Promise<void> {
  // Always allowed in mock mode
  return;
}

export async function assertFeatureAccess(teamId: string, feature: BillingFeature): Promise<void> {
  // Always allowed in mock mode
  return;
}

export async function updateBillingRecord(input: any): Promise<BillingRecord> {
  return (await getBillingSummary(input.teamId)).record;
}

export function formatPlanLabel(plan: BillingPlan): string {
  return BILLING_PLANS[plan].label;
}

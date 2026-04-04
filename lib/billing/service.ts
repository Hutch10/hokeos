import { count, eq } from "drizzle-orm";
import type Stripe from "stripe";

import { db } from "@/db";
import { batches, billing } from "@/db/schema";

export type BillingPlan = "free" | "pro" | "enterprise";
export type BillingStatus = "active" | "past_due" | "canceled";
export type BillingFeature = "exports" | "comparison";

export type BillingRecord = typeof billing.$inferSelect;

export type BillingPlanDefinition = {
  label: string;
  batchLimit: number | null;
  exportsEnabled: boolean;
  comparisonEnabled: boolean;
  prioritySupport: boolean;
  customLimits: boolean;
};

export type BillingSummary = {
  record: BillingRecord;
  teamId: string;
  plan: BillingPlan;
  status: BillingStatus;
  definition: BillingPlanDefinition;
  batchCount: number;
  remainingBatches: number | null;
  canCreateBatch: boolean;
  canExport: boolean;
  canCompare: boolean;
};

export const BILLING_PLANS: Record<BillingPlan, BillingPlanDefinition> = {
  free: {
    label: "Free",
    batchLimit: 10,
    exportsEnabled: false,
    comparisonEnabled: false,
    prioritySupport: false,
    customLimits: false,
  },
  pro: {
    label: "Pro",
    batchLimit: null,
    exportsEnabled: true,
    comparisonEnabled: true,
    prioritySupport: false,
    customLimits: false,
  },
  enterprise: {
    label: "Enterprise",
    batchLimit: null,
    exportsEnabled: true,
    comparisonEnabled: true,
    prioritySupport: true,
    customLimits: true,
  },
};

export class BillingRestrictionError extends Error {
  constructor(
    public readonly code: "batch_limit" | "feature_locked",
    message: string,
  ) {
    super(message);
    this.name = "BillingRestrictionError";
  }
}

function normalizePlan(value: string | null | undefined): BillingPlan {
  return value === "pro" || value === "enterprise" ? value : "free";
}

function toDefinition(plan: BillingPlan): BillingPlanDefinition {
  return BILLING_PLANS[plan];
}

export function formatPlanLabel(plan: BillingPlan): string {
  return BILLING_PLANS[plan].label;
}

export async function ensureBillingRecord(teamId: string): Promise<BillingRecord> {
  const [existing] = await db.select().from(billing).where(eq(billing.teamId, teamId)).limit(1);

  if (existing) {
    return existing;
  }

  const [created] = await db
    .insert(billing)
    .values({
      teamId,
      plan: "free",
      status: "active",
    })
    .returning();

  if (!created) {
    throw new Error("Failed to create billing record");
  }

  return created;
}

export async function getBillingRecordForTeam(teamId: string): Promise<BillingRecord> {
  if (process.env.NODE_ENV === "development" && teamId === "mock-team-id") {
    return {
      teamId: "mock-team-id",
      plan: "pro",
      status: "active",
      stripeCustomerId: null,
      stripeSubscriptionId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any;
  }
  const record = await ensureBillingRecord(teamId);

  if (record.status === "canceled" && record.plan !== "free") {
    return updateBillingRecord({
      teamId,
      plan: "free",
      status: "canceled",
      stripeCustomerId: record.stripeCustomerId ?? null,
      stripeSubscriptionId: null,
    });
  }

  return record;
}

export async function getBillingRecordByCustomerId(customerId: string): Promise<BillingRecord | null> {
  const [record] = await db
    .select()
    .from(billing)
    .where(eq(billing.stripeCustomerId, customerId))
    .limit(1);

  return record ?? null;
}

export async function getBillingSummary(teamId: string): Promise<BillingSummary> {
  const isDev = process.env.NODE_ENV === "development";
  const isMock = teamId === "mock-team-id";

  if (isDev && isMock) {
    return {
      record: {} as any,
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

  try {
    const record = await getBillingRecordForTeam(teamId);
    const plan = normalizePlan(record.plan);
    const status = record.status === "past_due" || record.status === "canceled" ? record.status : "active";
    const definition = toDefinition(plan);

    const [usageRow] = await db
      .select({ count: count() })
      .from(batches)
      .where(eq(batches.teamId, teamId));

    const batchCount = Number(usageRow?.count ?? 0);
    const remainingBatches = definition.batchLimit == null
      ? null
      : Math.max(definition.batchLimit - batchCount, 0);

    return {
      record,
      teamId,
      plan,
      status,
      definition,
      batchCount,
      remainingBatches,
      canCreateBatch: definition.batchLimit == null || batchCount < definition.batchLimit,
      canExport: definition.exportsEnabled,
      canCompare: definition.comparisonEnabled,
    };
  } catch (err) {
    if (isDev) {
      console.error("Billing DB Error, failing over to mock summary:", err);
      return {
        record: {} as any,
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
    throw err;
  }
}

export async function assertCanCreateBatch(teamId: string): Promise<void> {
  const summary = await getBillingSummary(teamId);

  if (!summary.canCreateBatch) {
    throw new BillingRestrictionError(
      "batch_limit",
      "Free plan limit reached. Upgrade to Pro for unlimited saved batches.",
    );
  }
}

export async function assertFeatureAccess(teamId: string, feature: BillingFeature): Promise<void> {
  const summary = await getBillingSummary(teamId);

  if (feature === "exports" && !summary.canExport) {
    throw new BillingRestrictionError(
      "feature_locked",
      "Exports are available on Pro and Enterprise plans. Upgrade to continue.",
    );
  }

  if (feature === "comparison" && !summary.canCompare) {
    throw new BillingRestrictionError(
      "feature_locked",
      "Batch comparison is available on Pro and Enterprise plans. Upgrade to continue.",
    );
  }
}

type BillingUpdateInput = {
  teamId: string;
  stripeCustomerId?: string | null;
  stripeSubscriptionId?: string | null;
  plan: BillingPlan;
  status: BillingStatus;
};

export async function updateBillingRecord(input: BillingUpdateInput): Promise<BillingRecord> {
  const existing = await ensureBillingRecord(input.teamId);

  const [updated] = await db
    .update(billing)
    .set({
      stripeCustomerId: input.stripeCustomerId === undefined ? existing.stripeCustomerId : input.stripeCustomerId,
      stripeSubscriptionId: input.stripeSubscriptionId === undefined ? existing.stripeSubscriptionId : input.stripeSubscriptionId,
      plan: input.plan,
      status: input.status,
      updatedAt: new Date(),
    })
    .where(eq(billing.teamId, input.teamId))
    .returning();

  if (!updated) {
    throw new Error("Failed to update billing record");
  }

  return updated;
}

export function billingPlanFromSubscription(subscription: Stripe.Subscription): BillingPlan {
  const priceIds = subscription.items.data.map((item) => item.price.id);

  if (priceIds.includes(process.env.STRIPE_ENTERPRISE_PRICE_ID ?? "")) {
    return "enterprise";
  }

  if (priceIds.includes(process.env.STRIPE_PRO_PRICE_ID ?? "")) {
    return "pro";
  }

  return normalizePlan((subscription.metadata.plan as BillingPlan | undefined) ?? "free");
}

export function billingStatusFromStripeStatus(status: Stripe.Subscription.Status): BillingStatus {
  switch (status) {
    case "active":
    case "trialing":
      return "active";
    case "past_due":
    case "unpaid":
    case "incomplete":
    case "incomplete_expired":
      return "past_due";
    case "canceled":
      return "canceled";
    default:
      return "active";
  }
}

export async function syncBillingFromSubscription(subscription: Stripe.Subscription): Promise<BillingRecord> {
  const customerId = typeof subscription.customer === "string" ? subscription.customer : subscription.customer.id;
  const teamId = subscription.metadata.teamId;

  if (!teamId) {
    throw new Error("Stripe subscription metadata is missing teamId");
  }

  const plan = subscription.status === "canceled"
    ? "free"
    : billingPlanFromSubscription(subscription);
  const status = billingStatusFromStripeStatus(subscription.status);

  return updateBillingRecord({
    teamId,
    stripeCustomerId: customerId,
    stripeSubscriptionId: subscription.status === "canceled" ? null : subscription.id,
    plan,
    status,
  });
}
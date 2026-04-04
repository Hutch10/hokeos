import Stripe from "stripe";

const DEFAULT_APP_URL = "http://localhost:3000";

let stripeClient: Stripe | null = null;

export function getStripeSecretKey(): string {
  const secretKey = process.env.STRIPE_SECRET_KEY;

  if (!secretKey) {
    throw new Error("STRIPE_SECRET_KEY is not configured");
  }

  return secretKey;
}

export function getStripeWebhookSecret(): string {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    throw new Error("STRIPE_WEBHOOK_SECRET is not configured");
  }

  return webhookSecret;
}

export function getStripePriceId(plan: "pro" | "enterprise"): string {
  const envKey = plan === "pro" ? "STRIPE_PRO_PRICE_ID" : "STRIPE_ENTERPRISE_PRICE_ID";
  const priceId = process.env[envKey];

  if (!priceId) {
    throw new Error(`${envKey} is not configured`);
  }

  return priceId;
}

export function getAppUrl(): string {
  return process.env.APP_URL ?? process.env.NEXTAUTH_URL ?? DEFAULT_APP_URL;
}

export function getStripe(): Stripe {
  if (!stripeClient) {
    stripeClient = new Stripe(getStripeSecretKey());
  }

  return stripeClient;
}
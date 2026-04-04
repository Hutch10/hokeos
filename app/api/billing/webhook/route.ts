import type Stripe from "stripe";

import { syncBillingFromSubscription, updateBillingRecord } from "@/lib/billing/service";
import { getStripe, getStripeWebhookSecret } from "@/lib/billing/stripe";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const stripe = getStripe();
  const signature = req.headers.get("stripe-signature");

  if (!signature) {
    return Response.json({ ok: false, error: "Missing Stripe signature" }, { status: 400 });
  }

  const payload = await req.text();
  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(payload, signature, getStripeWebhookSecret());
  } catch (err) {
    console.error("[POST /api/billing/webhook] signature error:", err);
    return Response.json({ ok: false, error: "Invalid webhook signature" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const teamId = session.metadata?.teamId;
        const customerId = typeof session.customer === "string" ? session.customer : null;
        const subscriptionId = typeof session.subscription === "string" ? session.subscription : null;
        const plan = session.metadata?.plan === "enterprise" ? "enterprise" : "pro";

        if (teamId) {
          await updateBillingRecord({
            teamId,
            stripeCustomerId: customerId,
            stripeSubscriptionId: subscriptionId,
            plan,
            status: "active",
          });
        }
        break;
      }
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        await syncBillingFromSubscription(subscription);
        break;
      }
      default:
        break;
    }

    return Response.json({ ok: true });
  } catch (err) {
    console.error(`[POST /api/billing/webhook] event ${event.type} failed:`, err);
    return Response.json({ ok: false, error: "Failed to process webhook" }, { status: 500 });
  }
}
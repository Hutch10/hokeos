import { getCurrentUser } from "@/lib/auth";
import { getBillingRecordForTeam, updateBillingRecord } from "@/lib/billing/service";
import { getAppUrl, getStripe, getStripePriceId } from "@/lib/billing/stripe";

export const runtime = "nodejs";

async function parsePlan(req: Request): Promise<string | null> {
  const contentType = req.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    const body = await req.json().catch(() => null) as { plan?: string } | null;
    return body?.plan ?? null;
  }

  const formData = await req.formData().catch(() => null);
  const value = formData?.get("plan");
  return typeof value === "string" ? value : null;
}

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return Response.json({ ok: false, error: "Authentication required" }, { status: 401 });
    }

    const plan = await parsePlan(req);

    if (plan !== "pro") {
      return Response.json(
        { ok: false, error: "Only Pro self-serve checkout is available. Contact sales for Enterprise." },
        { status: 400 },
      );
    }

    const stripe = getStripe();
    const billingRecord = await getBillingRecordForTeam(user.activeTeamId);

    let stripeCustomerId = billingRecord.stripeCustomerId;

    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name: user.name ?? undefined,
        metadata: { userId: user.id, teamId: user.activeTeamId },
      });

      stripeCustomerId = customer.id;

      await updateBillingRecord({
        teamId: user.activeTeamId,
        stripeCustomerId,
        stripeSubscriptionId: billingRecord.stripeSubscriptionId ?? null,
        plan: billingRecord.plan === "enterprise" ? "enterprise" : "free",
        status: (billingRecord.status === "past_due" ? "past_due" : billingRecord.status) as import("@/lib/billing/service").BillingStatus,
      });
    }

    const baseUrl = getAppUrl();
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: stripeCustomerId,
      line_items: [{ price: getStripePriceId("pro"), quantity: 1 }],
      success_url: `${baseUrl}/billing?checkout=success`,
      cancel_url: `${baseUrl}/billing?checkout=canceled`,
      client_reference_id: user.id,
      metadata: {
        userId: user.id,
        teamId: user.activeTeamId,
        plan: "pro",
      },
      subscription_data: {
        metadata: {
          userId: user.id,
          teamId: user.activeTeamId,
          plan: "pro",
        },
      },
      allow_promotion_codes: true,
    });

    if (!session.url) {
      return Response.json({ ok: false, error: "Stripe did not return a checkout URL" }, { status: 500 });
    }

    return Response.redirect(session.url, 303);
  } catch (err) {
    console.error("[POST /api/billing/checkout] error:", err);
    return Response.json({ ok: false, error: "Failed to start checkout" }, { status: 500 });
  }
}
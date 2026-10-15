import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getBundle } from "@/lib/toolkits";
import { getDubCheckoutFields, syncDubStripeCustomer } from "@/lib/dub-attribution";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { bundleId } = await req.json() as { bundleId: string };
  const bundle = getBundle(bundleId);
  if (!bundle) return NextResponse.json({ error: "Invalid bundle" }, { status: 400 });

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const dub = getDubCheckoutFields(req, user.id);
  const customerId = await syncDubStripeCustomer({
    stripe,
    customerId: user.stripeCustomerId,
    email: user.email,
    name: user.name,
    userId: user.id,
    clickId: dub.clickId,
  });
  if (!user.stripeCustomerId) {
    await prisma.user.update({ where: { id: user.id }, data: { stripeCustomerId: customerId } });
  }

  const checkoutSession = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: "payment",
    phone_number_collection: { enabled: true },
    // Use eligible payment methods enabled in Stripe Dashboard (including wallets and buy now, pay later).
    ...(dub.clientReferenceId ? { client_reference_id: dub.clientReferenceId } : {}),
    line_items: [{
      price_data: {
        currency: "usd",
        unit_amount: Math.round(bundle.price * 100),
        product_data: {
          name: bundle.name,
          description: `${bundle.tagline} — One-time 2-month Marketplace Plus bonus. No automatic renewal.`,
        },
      },
      quantity: 1,
    }],
    success_url: `${process.env.NEXT_PUBLIC_APP_URL}/toolkits/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url:  `${process.env.NEXT_PUBLIC_APP_URL}/toolkits`,
    metadata: {
      userId:           user.id,
      ...dub.metadata,
      bundleId,
      membershipTier:   "MARKETPLACE_PLUS",
      membershipMonths: "2",
      type:             "bundle",
    },
  });

  return NextResponse.json({ url: checkoutSession.url });
}

import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

const AD_PRICES: Record<string, number> = { 
  CENTER_COLUMN: 199,
  LEFT_COLUMN:   299,
};

// POST /api/pro-ads/checkout
export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { title, description, imageUrl, linkUrl, placement, durationMonths, startsAt } =
    await req.json() as {
      title: string; description?: string; imageUrl: string; linkUrl: string;
      placement: "CENTER_COLUMN" | "LEFT_COLUMN"; durationMonths: number; startsAt: string;
    };

  if (!title || !imageUrl || !linkUrl || !placement || !durationMonths)
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });

  const monthlyRate = AD_PRICES[placement];
  if (!monthlyRate) return NextResponse.json({ error: "Invalid placement" }, { status: 400 });

  const priceUsd = monthlyRate * durationMonths;
  const placementLabel = placement === "CENTER_COLUMN" ? "Center Column (Feed)" : "Left Column (Sidebar)";

  // Create the ad record
  const ad = await prisma.proAd.create({
    data: {
      userId: session.user.id,
      title: title.trim(),
      description: description?.trim() ?? null,
      imageUrl: imageUrl.trim(),
      linkUrl: linkUrl.trim(),
      placement,
      durationMonths,
      priceUsd,
      status: "PENDING_PAYMENT",
      startsAt: startsAt ? new Date(startsAt) : null,
    },
  });

  // Ensure Stripe customer
  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  let customerId = user?.stripeCustomerId;
  if (!customerId) {
    const customer = await stripe.customers.create({ email: session.user.email, name: session.user.name });
    customerId = customer.id;
    await prisma.user.update({ where: { id: session.user.id }, data: { stripeCustomerId: customerId } });
  }

  const checkoutSession = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: "payment",
    // Use eligible payment methods enabled in Stripe Dashboard (including wallets and buy now, pay later).
    line_items: [{
      price_data: {
        currency: "usd",
        unit_amount: Math.round(priceUsd * 100),
        product_data: {
          name: `Pro Advertising — ${placementLabel}`,
          description: `${durationMonths} month${durationMonths > 1 ? "s" : ""} · ${title}`,
        },
      },
      quantity: 1,
    }],
    success_url: `${process.env.NEXT_PUBLIC_APP_URL}/pro-marketing?ad_success=1&ad_id=${ad.id}&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url:  `${process.env.NEXT_PUBLIC_APP_URL}/pro-marketing`,
    metadata: { adId: ad.id, userId: session.user.id },
  });

  await prisma.proAd.update({ where: { id: ad.id }, data: { stripeSessionId: checkoutSession.id } });

  return NextResponse.json({ url: checkoutSession.url });
}

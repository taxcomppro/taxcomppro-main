import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2026-04-22.dahlia" });
const PRICE_PER_MONTH = 79;

export async function POST(req: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { listingId, durationMonths = 1 } = await req.json();
  if (!listingId || !durationMonths) return NextResponse.json({ error: "listingId and durationMonths required" }, { status: 400 });

  const listing = await prisma.marketplaceListing.findFirst({ where: { id: listingId, userId: session.user.id } });
  if (!listing) return NextResponse.json({ error: "Listing not found" }, { status: 404 });

  const priceUsd = PRICE_PER_MONTH * durationMonths;

  const featuredReq = await prisma.featuredListingRequest.create({
    data: { userId: session.user.id, listingId, durationMonths, priceUsd, status: "PENDING_PAYMENT" },
  });

  const origin = (await headers()).get("origin") ?? "http://localhost:3000";
  const checkoutSession = await stripe.checkout.sessions.create({
    // Use eligible payment methods enabled in Stripe Dashboard (including wallets and buy now, pay later).
    mode: "payment",
    line_items: [{
      quantity: 1,
      price_data: {
        currency: "usd",
        unit_amount: Math.round(priceUsd * 100),
        product_data: { name: `Featured Listing — ${listing.title} (${durationMonths} month${durationMonths > 1 ? "s" : ""})` },
      },
    }],
    success_url: `${origin}/pro-marketing?featured_id=${featuredReq.id}&session_id={CHECKOUT_SESSION_ID}&featured_success=1`,
    cancel_url: `${origin}/pro-marketing`,
    metadata: { featuredId: featuredReq.id, userId: session.user.id },
  });

  await prisma.featuredListingRequest.update({ where: { id: featuredReq.id }, data: { stripeSessionId: checkoutSession.id } });

  return NextResponse.json({ url: checkoutSession.url });
}

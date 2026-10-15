import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  // Create or retrieve Stripe customer
  let customerId = user.stripeCustomerId;
  if (!customerId) {
    const customer = await stripe.customers.create({ email: user.email, name: user.name });
    customerId = customer.id;
    await prisma.user.update({ where: { id: user.id }, data: { stripeCustomerId: customerId } });
  }

  // One-time $99.99 payment — host a single Pro Talk session
  const checkoutSession = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: "payment",
    // Use eligible payment methods enabled in Stripe Dashboard (including wallets and buy now, pay later).
    line_items: [
      {
        price_data: {
          currency: "usd",
          unit_amount: 9999, // $99.99
          product_data: {
            name: "Pro Talk Host — One-Time Session",
            description: "Host one live Pro Talk audio room on TaxCompPro",
          },
        },
        quantity: 1,
      },
    ],
    success_url: `${process.env.NEXT_PUBLIC_APP_URL}/pro-talks/new?host_paid=1&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/pro-talks/new`,
    metadata: { userId: user.id, type: "pro_talk_host" },
  });

  return NextResponse.json({ url: checkoutSession.url });
}

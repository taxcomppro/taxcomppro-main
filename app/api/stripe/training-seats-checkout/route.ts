import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ADDITIONAL_SEAT_PRICE_USD } from "@/lib/training";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

// Purchase additional staff-training seats on an existing TrainingLicense.
// NOTE: $25/seat is a placeholder price — confirm before going live.
export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { toolkitId, seats } = await req.json() as { toolkitId?: string; seats?: number };
  const seatCount = Math.floor(Number(seats));
  if (!toolkitId || !seatCount || seatCount < 1 || seatCount > 100) {
    return NextResponse.json({ error: "Invalid seat count" }, { status: 400 });
  }

  const license = await prisma.trainingLicense.findUnique({ where: { eroId_toolkitId: { eroId: session.user.id, toolkitId } } });
  if (!license) return NextResponse.json({ error: "You don't have a training license for this toolkit yet." }, { status: 404 });

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  let customerId = user.stripeCustomerId;
  if (!customerId) {
    const customer = await stripe.customers.create({ email: user.email, name: user.name ?? "" });
    customerId = customer.id;
    await prisma.user.update({ where: { id: user.id }, data: { stripeCustomerId: customerId } });
  }

  const checkoutSession = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: "payment",
    // Use eligible payment methods enabled in Stripe Dashboard (including wallets and buy now, pay later).
    line_items: [{
      price_data: {
        currency: "usd",
        unit_amount: Math.round(ADDITIONAL_SEAT_PRICE_USD * 100),
        product_data: { name: "Additional Staff Training Seat", description: "ERO Training Center — additional staff seat" },
      },
      quantity: seatCount,
    }],
    success_url: `${process.env.NEXT_PUBLIC_APP_URL}/training-center?seats_added=1`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/training-center`,
    metadata: {
      userId: user.id,
      licenseId: license.id,
      seats: String(seatCount),
      priceUsd: String(ADDITIONAL_SEAT_PRICE_USD * seatCount),
      type: "training_seats",
    },
  });

  return NextResponse.json({ url: checkoutSession.url });
}

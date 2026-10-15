import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { auth } from "@/lib/auth";
import { canAccessProMarketing } from "@/lib/marketingAccess";
import { prisma } from "@/lib/prisma";
import { calcBlastPrice, BLAST_LIMIT_PER_MONTH } from "@/lib/blast-pricing";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

// POST /api/message-blast/checkout
export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canAccessProMarketing(session.user))
    return NextResponse.json({ error: "Marketplace Plus required" }, { status: 403 });

  const { subject, content, filterRoles, filterCities, filterStates } =
    await req.json() as {
      subject: string; content: string;
      filterRoles: string[]; filterCities: string[]; filterStates: string[];
    };

  if (!subject?.trim() || !content?.trim())
    return NextResponse.json({ error: "Subject and content required" }, { status: 400 });

  // Check 2/month quota
  const blastMonth = new Date().toISOString().slice(0, 7); // "2026-04"
  const usedThisMonth = await prisma.messageBlast.count({
    where: {
      senderId: session.user.id,
      blastMonth,
      status: { notIn: ["REJECTED"] },
    },
  });
  if (usedThisMonth >= BLAST_LIMIT_PER_MONTH)
    return NextResponse.json({ error: `You've used your ${BLAST_LIMIT_PER_MONTH} blasts for this month` }, { status: 429 });

  // Re-count audience
  const where: Record<string, unknown> = { id: { not: session.user.id } };
  if (filterRoles?.length) where.role = { in: filterRoles };
  if (filterCities?.length || filterStates?.length) {
    where.OR = [
      ...filterCities.map((c: string) => ({ location: { contains: c, mode: "insensitive" as const } })),
      ...filterStates.map((s: string) => ({ location: { contains: s, mode: "insensitive" as const } })),
    ];
  }
  const recipientCount = await prisma.user.count({ where });
  if (recipientCount === 0)
    return NextResponse.json({ error: "No recipients match your filters" }, { status: 400 });

  const priceUsd = calcBlastPrice(recipientCount);

  // Create blast record
  const blast = await prisma.messageBlast.create({
    data: {
      senderId: session.user.id,
      subject: subject.trim(),
      content: content.trim(),
      filterRoles: filterRoles ?? [],
      filterCities: filterCities ?? [],
      filterStates: filterStates ?? [],
      recipientCount,
      priceUsd,
      blastMonth,
      status: "PENDING_PAYMENT",
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
          name: `Message Blast — ${recipientCount.toLocaleString()} recipients`,
          description: subject.trim(),
        },
      },
      quantity: 1,
    }],
    success_url: `${process.env.NEXT_PUBLIC_APP_URL}/pro-marketing?blast_success=1&blast_id=${blast.id}&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url:  `${process.env.NEXT_PUBLIC_APP_URL}/pro-marketing`,
    metadata: { blastId: blast.id, userId: session.user.id },
  });

  // Store session ID on blast
  await prisma.messageBlast.update({
    where: { id: blast.id },
    data: { stripeSessionId: checkoutSession.id },
  });

  return NextResponse.json({ url: checkoutSession.url });
}

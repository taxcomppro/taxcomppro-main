import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getToolkit } from "@/lib/toolkits";
import { getDubCheckoutFields, syncDubStripeCustomer } from "@/lib/dub-attribution";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { toolkitId, couponCode } = (await req.json()) as { toolkitId: string; couponCode?: string };
  const toolkit = getToolkit(toolkitId);
  if (!toolkit) return NextResponse.json({ error: "Invalid toolkit" }, { status: 400 });

  // Check if user already purchased this toolkit
  const existing = await prisma.toolkitPurchase.findFirst({
    where: { userId: session.user.id, toolkitId },
  });
  if (existing) return NextResponse.json({ error: "Already purchased", alreadyOwned: true }, { status: 400 });

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  let finalPrice = toolkit.price;
  let appliedCoupon = null;

  if (couponCode && finalPrice > 0) {
    const coupon = await prisma.marketplaceCoupon.findFirst({
      where: {
        code: couponCode.toUpperCase().trim(),
        isActive: true,
      },
    });

    if (coupon) {
      const isValidTime = !coupon.expiresAt || new Date() <= coupon.expiresAt;
      const isValidUses = coupon.maxUses == null || coupon.usedCount < coupon.maxUses;
      const isValidScope = !coupon.listingId || coupon.listingId === "ALL" || coupon.listingId === "TOOLKITS" || coupon.listingId === toolkitId;

      if (isValidTime && isValidUses && isValidScope) {
        appliedCoupon = coupon;
        if (coupon.discountType === "PERCENT") {
          const discount = (finalPrice * coupon.discountValue) / 100;
          finalPrice = Math.max(0, finalPrice - discount);
        } else {
          finalPrice = Math.max(0, finalPrice - coupon.discountValue);
        }

        await prisma.marketplaceCoupon.update({
          where: { id: coupon.id },
          data: { usedCount: { increment: 1 } },
        });
      }
    }
  }

  // If 100% discount, grant purchase immediately
  if (finalPrice <= 0) {
    await prisma.toolkitPurchase.create({
      data: {
        userId: session.user.id,
        toolkitId,
        membershipGranted: false,
        membershipTier: "MARKETPLACE_PLUS",
        membershipMonths: 0,
        stripeSessionId: `free_claim_${Date.now()}`,
      },
    });


    return NextResponse.json({ url: "/toolkits/success?free=1" });
  }

  const dub = getDubCheckoutFields(req, user.id);

  // Create or retrieve Stripe customer and associate this platform sale with Dub.
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
    allow_promotion_codes: true,
    phone_number_collection: { enabled: true },
    // Use eligible payment methods enabled in Stripe Dashboard (including wallets and buy now, pay later).
    ...(dub.clientReferenceId ? { client_reference_id: dub.clientReferenceId } : {}),
    line_items: [{
      price_data: {
        currency: "usd",
        unit_amount: Math.round(finalPrice * 100),
        product_data: {
          name: toolkit.name + (appliedCoupon ? ` (${appliedCoupon.code} Applied)` : ""),
          description: "Includes a one-time 2-month Marketplace Plus membership bonus. No automatic renewal.",
          images: [],
        },
      },
      quantity: 1,
    }],
    success_url: `${process.env.NEXT_PUBLIC_APP_URL}/toolkits/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url:  `${process.env.NEXT_PUBLIC_APP_URL}/toolkits`,
    metadata: {
      userId:           user.id,
      ...dub.metadata,
      toolkitId,
      membershipTier:   "MARKETPLACE_PLUS",
      membershipMonths: "2",
      type:             "toolkit",
      couponCode:       appliedCoupon?.code || "",
    },
  });

  return NextResponse.json({ url: checkoutSession.url });
}

import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendMembershipUpgradedEmail } from "@/lib/email";
import { getDubCheckoutFields, syncDubStripeCustomer } from "@/lib/dub-attribution";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

const PRICE_IDS: Record<string, string> = {
  VIP:              process.env.STRIPE_VIP_PRICE_ID!,
  MARKETPLACE:      process.env.STRIPE_MARKETPLACE_PRICE_ID!,
  MARKETPLACE_PLUS: process.env.STRIPE_MARKETPLACE_PLUS_PRICE_ID!,
};

export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { tier, couponCode, redirectUrl } = (await req.json()) as {
    tier: string;
    couponCode?: string;
    redirectUrl?: string;
  };
  const priceId = PRICE_IDS[tier];
  if (!priceId) return NextResponse.json({ error: "Invalid tier" }, { status: 400 });

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  let appliedCoupon = null;

  if (couponCode) {
    const coupon = await prisma.marketplaceCoupon.findFirst({
      where: {
        code: couponCode.toUpperCase().trim(),
        isActive: true,
      },
    });

    if (coupon) {
      const isValidTime = !coupon.expiresAt || new Date() <= coupon.expiresAt;
      const isValidUses = coupon.maxUses == null || coupon.usedCount < coupon.maxUses;
      const isValidScope =
        !coupon.listingId ||
        coupon.listingId === "ALL" ||
        coupon.listingId === "MEMBERSHIP" ||
        coupon.listingId === "UPGRADE" ||
        coupon.listingId === tier;

      if (isValidTime && isValidUses && isValidScope) {
        appliedCoupon = coupon;

        // If 100% discount, grant membership upgrade immediately without Stripe checkout
        if (coupon.discountType === "PERCENT" && coupon.discountValue >= 100) {
          const months = coupon.durationMonths && coupon.durationMonths > 0 ? coupon.durationMonths : 1;
          const now = new Date();

          const existingSub = await prisma.subscription.findUnique({
            where: { userId: user.id },
          });

          let periodEnd: Date;
          if (existingSub?.currentPeriodEnd && new Date(existingSub.currentPeriodEnd) > now) {
            periodEnd = new Date(existingSub.currentPeriodEnd);
            periodEnd.setMonth(periodEnd.getMonth() + months);
          } else {
            periodEnd = new Date();
            periodEnd.setMonth(periodEnd.getMonth() + months);
          }

          await prisma.user.update({
            where: { id: user.id },
            data: { tier: tier as any },
          });

          await prisma.subscription.upsert({
            where: { userId: user.id },
            create: {
              userId: user.id,
              plan: tier as any,
              status: "active",
              currentPeriodEnd: periodEnd,
            },
            update: {
              plan: tier as any,
              status: "active",
              currentPeriodEnd: periodEnd,
            },
          });

          await prisma.marketplaceCoupon.update({
            where: { id: coupon.id },
            data: { usedCount: { increment: 1 } },
          });

          await prisma.toolkitPurchase.create({
            data: {
              userId: user.id,
              toolkitId: `promo_${coupon.code}`,
              stripeSessionId: `promo_${coupon.code}_${Date.now()}`,
              membershipGranted: true,
              membershipTier: tier as any,
              membershipMonths: months,
            },
          }).catch(err => console.error("[Checkout Coupon] Failed to record purchase:", err));

          const formattedDate = periodEnd.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          });

          await prisma.notification.create({
            data: {
              userId: user.id,
              type: "SYSTEM",
              title: "🎉 Membership Upgraded!",
              message: `You are now on the ${tier} plan for ${months} month${months > 1 ? "s" : ""} (valid until ${formattedDate}). Enjoy your benefits!`,
            },
          }).catch(err => console.error("[Checkout Coupon] Failed to send notification:", err));

          if (user.email) {
            sendMembershipUpgradedEmail({
              to: user.email,
              userName: user.name || "Member",
              tier,
              currentPeriodEnd: periodEnd,
              months,
              isComplimentary: true,
            }).catch(err => console.error("[Checkout Coupon] Failed to send upgrade email:", err));
          }

          return NextResponse.json({ url: redirectUrl || "/feed?welcome=1" });
        }

        await prisma.marketplaceCoupon.update({
          where: { id: coupon.id },
          data: { usedCount: { increment: 1 } },
        });
      }
    }
  }

  const dub = getDubCheckoutFields(req, user.id);

  // Create or retrieve Stripe customer and preserve Dub attribution for renewals.
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

  // Read referral code from cookie
  const refCode = req.cookies.get("ref_code")?.value ?? null;

  const targetPath = redirectUrl || "/feed?welcome=1";
  const successUrl = `${process.env.NEXT_PUBLIC_APP_URL}${
    targetPath.includes("?") ? targetPath + "&" : targetPath + "?"
  }session_id={CHECKOUT_SESSION_ID}`;

  let discountsParam: Array<{ coupon?: string; promotion_code?: string }> | undefined = undefined;
  if (appliedCoupon) {
    try {
      const months = appliedCoupon.durationMonths && appliedCoupon.durationMonths > 0 ? appliedCoupon.durationMonths : 1;
      const stripeCouponId = `PROMO_${appliedCoupon.code}_${appliedCoupon.discountType}_${appliedCoupon.discountValue}_${months}M`;
      let stripeCoupon;
      try {
        stripeCoupon = await stripe.coupons.retrieve(stripeCouponId);
      } catch {
        const duration = months > 1 ? "repeating" : "once";
        stripeCoupon = await stripe.coupons.create({
          id: stripeCouponId,
          name: `${appliedCoupon.code} (${appliedCoupon.discountValue}${appliedCoupon.discountType === "PERCENT" ? "%" : "$"} OFF - ${months} mo)`,
          duration,
          ...(duration === "repeating" ? { duration_in_months: months } : {}),
          ...(appliedCoupon.discountType === "PERCENT"
            ? { percent_off: appliedCoupon.discountValue }
            : { amount_off: Math.round(appliedCoupon.discountValue * 100), currency: "usd" }),
        });
      }
      discountsParam = [{ coupon: stripeCoupon.id }];
    } catch (stripeErr) {
      console.warn("Could not sync Stripe coupon, falling back to allow_promotion_codes:", stripeErr);
    }
  }

  const checkoutSession = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: "subscription",
    ...(discountsParam ? { discounts: discountsParam } : { allow_promotion_codes: true }),
    phone_number_collection: { enabled: true },
    payment_method_types: ["card"],
    ...(dub.clientReferenceId ? { client_reference_id: dub.clientReferenceId } : {}),
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: successUrl,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/register?step=membership&canceled=1`,
    metadata: {
      userId: user.id,
      tier,
      ...dub.metadata,
      couponCode: appliedCoupon?.code || "",
      ...(refCode ? { referralCode: refCode } : {}),
    },
  });

  return NextResponse.json({ url: checkoutSession.url });
}

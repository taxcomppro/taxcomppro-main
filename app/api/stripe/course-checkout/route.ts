import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getDubCheckoutFields, syncDubStripeCustomer } from "@/lib/dub-attribution";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { slug, couponCode, refCode } = (await req.json()) as {
    slug: string;
    couponCode?: string;
    refCode?: string;
  };
  if (!slug) return NextResponse.json({ error: "Missing slug" }, { status: 400 });

  const course = await prisma.course.findUnique({
    where: { slug },
  });
  if (!course) return NextResponse.json({ error: "Course not found" }, { status: 404 });

  // If user is instructor or admin, they already have full access
  if (course.instructorId === session.user.id || session.user.role === "ADMIN") {
    return NextResponse.json({ error: "You are the instructor / admin of this course", alreadyEnrolled: true }, { status: 400 });
  }

  // Already enrolled?
  const existing = await prisma.enrollment.findUnique({
    where: { userId_courseId: { userId: session.user.id, courseId: course.id } },
  });
  if (existing) return NextResponse.json({ error: "Already enrolled", alreadyEnrolled: true }, { status: 400 });

  let finalPrice = course.isFree ? 0 : course.price;
  let appliedCoupon = null;

  // Apply Coupon if provided
  if (couponCode && finalPrice > 0) {
    const cleanCode = couponCode.toUpperCase().trim();
    const coupon = await prisma.marketplaceCoupon.findFirst({
      where: {
        code: cleanCode,
        isActive: true,
        OR: [
          { sellerId: course.instructorId },
          { seller: { role: "ADMIN" } },
        ],
      },
      include: {
        seller: { select: { role: true } },
      },
    });

    if (coupon) {
      const isValidTime = !coupon.expiresAt || new Date() <= coupon.expiresAt;
      const isValidUses = coupon.maxUses == null || coupon.usedCount < coupon.maxUses;

      let isScopeValid = true;
      if (coupon.seller?.role === "ADMIN" && coupon.listingId) {
        const target = coupon.listingId.toUpperCase();
        if (target === "MEMBERSHIP" || target === "TOOLKITS" || target === "MARKETPLACE") {
          isScopeValid = false;
        } else if (
          target !== "ALL" &&
          target !== "PLATFORM" &&
          target !== "COURSES" &&
          target !== "COURSE" &&
          coupon.listingId !== course.id &&
          coupon.listingId !== course.slug
        ) {
          isScopeValid = false;
        }
      } else if (coupon.seller?.role !== "ADMIN" && coupon.listingId) {
        if (coupon.listingId !== course.id && coupon.listingId !== course.slug) {
          isScopeValid = false;
        }
      }

      if (isValidTime && isValidUses && isScopeValid) {
        appliedCoupon = coupon;
        if (coupon.discountType === "PERCENT") {
          const discount = (finalPrice * coupon.discountValue) / 100;
          finalPrice = Math.max(0, finalPrice - discount);
        } else {
          finalPrice = Math.max(0, finalPrice - coupon.discountValue);
        }
        finalPrice = Math.round(finalPrice * 100) / 100;

        // Increment coupon usage
        await prisma.marketplaceCoupon.update({
          where: { id: coupon.id },
          data: { usedCount: { increment: 1 } },
        }).catch(() => {});
      }
    }
  }

  // Track referral conversion if code passed
  if (refCode) {
    await prisma.marketplaceReferral.updateMany({
      where: { code: refCode.toUpperCase().trim() },
      data: {
        conversions: { increment: 1 },
        earningsUsd: { increment: Math.round(finalPrice * 0.1 * 100) / 100 },
      },
    }).catch(() => {});
  }

  // If free course or 100% coupon discount, enroll immediately
  if (finalPrice <= 0) {
    await prisma.enrollment.create({
      data: { userId: session.user.id, courseId: course.id },
    });
    return NextResponse.json({ success: true, isFree: true });
  }

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const instructor = await prisma.user.findUnique({
    where: { id: course.instructorId },
    select: { id: true, stripeAccountId: true, stripeOnboarded: true, role: true },
  });
  const isTaxCompProCourse = instructor?.role === "ADMIN";
  const dub = isTaxCompProCourse ? getDubCheckoutFields(req, user.id) : null;

  // Create / retrieve Stripe customer
  let customerId = user.stripeCustomerId;
  if (dub) {
    customerId = await syncDubStripeCustomer({
      stripe,
      customerId,
      email: user.email,
      name: user.name,
      userId: user.id,
      clickId: dub.clickId,
    });
  } else if (!customerId) {
    const customer = await stripe.customers.create({ email: user.email, name: user.name ?? "" });
    customerId = customer.id;
  }
  if (!user.stripeCustomerId) {
    await prisma.user.update({ where: { id: user.id }, data: { stripeCustomerId: customerId } });
  }

  // Verify instructor has connected their Stripe account
  if (!instructor?.stripeAccountId) {
    return NextResponse.json(
      { error: "The course instructor has not yet connected their Stripe payout account to receive payments. Purchases are paused until setup is complete." },
      { status: 400 }
    );
  }

  // Verify charges_enabled with Stripe if not yet flagged in DB
  let isChargesEnabled = instructor.stripeOnboarded;
  if (!isChargesEnabled && instructor.stripeAccountId) {
    try {
      const acct = await stripe.accounts.retrieve(instructor.stripeAccountId);
      if (acct.charges_enabled) {
        isChargesEnabled = true;
        await prisma.user.update({
          where: { id: instructor.id },
          data: { stripeOnboarded: true },
        }).catch(() => {});
      }
    } catch (err: any) {
      console.warn("[Course Checkout] Failed to check instructor account status:", err?.message);
    }
  }

  if (!isChargesEnabled) {
    return NextResponse.json(
      { error: "The course instructor's Stripe payout account is still completing onboarding. Please try again shortly." },
      { status: 400 }
    );
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  const lineItems: NonNullable<Stripe.Checkout.SessionCreateParams["line_items"]> = [
    {
      price_data: {
        currency: "usd",
        unit_amount: Math.round(finalPrice * 100),
        product_data: {
          name: course.title + (appliedCoupon ? ` (${appliedCoupon.code} Applied)` : ""),
          description: `Full access to "${course.title}"`,
          images: course.thumbnail ? [course.thumbnail] : [],
        },
      },
      quantity: 1,
    },
  ];

  const sessionMetadata: Record<string, string> = {
    type: "course",
    userId: user.id,
    ...(dub?.metadata ?? {}),
    courseId: course.id,
    slug,
    couponCode: appliedCoupon?.code || "",
    refCode: refCode || "",
    instructorId: instructor.id,
    instructorStripeAccountId: instructor.stripeAccountId,
  };

  let checkoutSession: Stripe.Checkout.Session;

  try {
    // ── Approach 1: Direct Charge (Whole payment goes directly to instructor's Stripe, $0 platform fee) ──
    checkoutSession = await stripe.checkout.sessions.create(
      {
        mode: "payment",
        // Use eligible payment methods enabled in Stripe Dashboard (including wallets and buy now, pay later).
        phone_number_collection: { enabled: true },
        customer_email: user.email ?? undefined,
        ...(dub?.clientReferenceId ? { client_reference_id: dub.clientReferenceId } : {}),
        line_items: lineItems,
        success_url: `${appUrl}/courses/${slug}?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${appUrl}/courses/${slug}`,
        metadata: sessionMetadata,
        // No application_fee_amount: 100% belongs to instructor
      },
      { stripeAccount: instructor.stripeAccountId }
    );
  } catch (directErr: any) {
    console.warn(
      "[Course Checkout] Direct charge on connected account failed, using 100% destination transfer fallback:",
      directErr?.message
    );

    // ── Approach 2: Destination Charge Fallback (100% transferred to instructor, $0 platform fee) ──
    checkoutSession = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: "payment",
      // Use eligible payment methods enabled in Stripe Dashboard (including wallets and buy now, pay later).
      phone_number_collection: { enabled: true },
      ...(dub?.clientReferenceId ? { client_reference_id: dub.clientReferenceId } : {}),
      line_items: lineItems,
      success_url: `${appUrl}/courses/${slug}?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/courses/${slug}`,
      metadata: sessionMetadata,
      payment_intent_data: {
        transfer_data: {
          destination: instructor.stripeAccountId,
        },
        // No application_fee_amount: 100% transferred to instructor's Stripe balance
      },
    });
  }

  return NextResponse.json({ url: checkoutSession.url });
}

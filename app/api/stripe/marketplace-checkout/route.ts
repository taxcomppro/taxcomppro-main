import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const { listingId, listingIds, couponCode, refCode, source, networkId, networkSlug } = body as {
    listingId?: string;
    listingIds?: string[];
    couponCode?: string;
    refCode?: string;
    source?: string;
    networkId?: string;
    networkSlug?: string;
  };

  const rawIds = listingIds && Array.isArray(listingIds) && listingIds.length > 0
    ? listingIds
    : listingId
    ? [listingId]
    : [];

  if (rawIds.length === 0) {
    return NextResponse.json({ error: "No listings specified for checkout" }, { status: 400 });
  }

  // Fetch all requested listings
  const listings = await prisma.marketplaceListing.findMany({
    where: { id: { in: rawIds } },
    include: { user: { select: { id: true, name: true, stripeAccountId: true, stripeOnboarded: true, email: true } } },
  });

  if (listings.length === 0) {
    return NextResponse.json({
      error: "No matching marketplace listings found. If you selected a Pro Network, please join directly from the Network page.",
    }, { status: 404 });
  }

  // Check if current user owns any of the listings
  const ownListings = listings.filter((l) => l.userId === session.user.id);
  if (ownListings.length > 0) {
    return NextResponse.json({
      error: `You cannot purchase your own listing (${ownListings[0].title}). Please remove it from your cart.`,
    }, { status: 400 });
  }

  // Enforce single-seller per checkout (due to direct Stripe Connect payouts)
  const sellerIds = Array.from(new Set(listings.map((l) => l.userId)));
  if (sellerIds.length > 1) {
    return NextResponse.json({
      error: "Your cart contains items from multiple sellers. Because payments go directly to each seller's Stripe account, please checkout items from one seller at a time.",
    }, { status: 400 });
  }

  // Filter out demo listings
  const validListings = listings.filter((l) => {
    if (l.metadata && typeof l.metadata === "object" && !Array.isArray(l.metadata) && (l.metadata as any).isDemo) {
      return false;
    }
    return true;
  });

  if (validListings.length === 0) {
    return NextResponse.json({ error: "Demo listings cannot be purchased" }, { status: 400 });
  }

  const purchasableListings = validListings;

  // Check which items are already purchased
  const alreadyPurchased = await prisma.marketplacePurchase.findMany({
    where: {
      userId: session.user.id,
      listingId: { in: purchasableListings.map((l) => l.id) },
    },
    select: { listingId: true },
  });
  const alreadyPurchasedSet = new Set(alreadyPurchased.map((p) => p.listingId));

  const itemsToBuy = purchasableListings.filter((l) => !alreadyPurchasedSet.has(l.id));
  if (itemsToBuy.length === 0) {
    return NextResponse.json({ alreadyPurchased: true, message: "All items in cart have already been purchased" });
  }

  // 1. Resolve coupon if provided
  let validCoupon: any = null;
  if (couponCode && typeof couponCode === "string" && couponCode.trim()) {
    const cleanCode = couponCode.toUpperCase().trim();
    const primarySellerId = sellerIds[0];

    const matchingCoupons = await prisma.marketplaceCoupon.findMany({
      where: {
        code: cleanCode,
        isActive: true,
        OR: [
          { sellerId: primarySellerId },
          { seller: { role: "ADMIN" } },
        ],
      },
      include: {
        seller: { select: { id: true, role: true } },
      },
    });

    if (matchingCoupons.length > 0) {
      // Prioritize seller's own coupon, or admin platform promo code
      const candidate =
        matchingCoupons.find((c) => c.sellerId === primarySellerId) ||
        matchingCoupons.find((c) => c.seller?.role === "ADMIN") ||
        matchingCoupons[0];

      const isValidTime = !candidate.expiresAt || new Date() <= candidate.expiresAt;
      const isValidUses = candidate.maxUses == null || candidate.usedCount < candidate.maxUses;

      let isTargetValid = true;
      if (candidate.listingId) {
        const target = candidate.listingId.toUpperCase();
        if (candidate.seller?.role === "ADMIN") {
          if (target === "MEMBERSHIP" || target === "COURSES" || target === "TOOLKITS") {
            isTargetValid = false;
          } else if (target !== "ALL" && target !== "PLATFORM" && target !== "MARKETPLACE") {
            const matchesAny = itemsToBuy.some(
              (l) => l.id === candidate.listingId || l.slug === candidate.listingId
            );
            if (!matchesAny) isTargetValid = false;
          }
        } else {
          const matchesAny = itemsToBuy.some(
            (l) => l.id === candidate.listingId || l.slug === candidate.listingId
          );
          if (!matchesAny) isTargetValid = false;
        }
      }

      if (isValidTime && isValidUses && isTargetValid) {
        validCoupon = candidate;
      }
    }
  }

  // 2. Calculate pricing & apply coupon across itemsToBuy
  let totalAmount = 0;
  const lineItems: NonNullable<Stripe.Checkout.SessionCreateParams["line_items"]> = [];
  const freeListingIds: string[] = [];
  const paidListings: typeof itemsToBuy = [];

  let remainingFixedDiscount =
    validCoupon && validCoupon.discountType === "FIXED" ? validCoupon.discountValue : 0;
  let couponApplied = false;

  for (const listing of itemsToBuy) {
    let finalPrice = listing.price || 0;

    if (validCoupon && finalPrice > 0) {
      const isApplicableToThisItem =
        !validCoupon.listingId ||
        validCoupon.listingId.toUpperCase() === "ALL" ||
        validCoupon.listingId.toUpperCase() === "PLATFORM" ||
        validCoupon.listingId.toUpperCase() === "MARKETPLACE" ||
        validCoupon.listingId === listing.id ||
        validCoupon.listingId === listing.slug;

      if (isApplicableToThisItem) {
        if (validCoupon.discountType === "PERCENT") {
          const discount = (finalPrice * validCoupon.discountValue) / 100;
          finalPrice = Math.max(0, finalPrice - discount);
          couponApplied = true;
        } else if (remainingFixedDiscount > 0) {
          const deduct = Math.min(finalPrice, remainingFixedDiscount);
          finalPrice = Math.max(0, finalPrice - deduct);
          remainingFixedDiscount -= deduct;
          couponApplied = true;
        }
        finalPrice = Math.round(finalPrice * 100) / 100;
      }
    }

    if (finalPrice <= 0) {
      freeListingIds.push(listing.id);
    } else {
      totalAmount += finalPrice;
      paidListings.push(listing);
      lineItems.push({
        price_data: {
          currency: "usd",
          unit_amount: Math.round(finalPrice * 100),
          product_data: {
            name: listing.title,
            description: `Marketplace purchase from ${listing.user?.name || "Tax Compliance Pro Member"}`,
            images: listing.images[0] ? [listing.images[0]] : [],
          },
        },
        quantity: 1,
      });
    }
  }

  // 3. Increment coupon usage ONCE per order if applied
  if (validCoupon && couponApplied) {
    await prisma.marketplaceCoupon.update({
      where: { id: validCoupon.id },
      data: { usedCount: { increment: 1 } },
    }).catch(() => {});
  }

  // Track referral if provided
  if (refCode && totalAmount > 0) {
    await prisma.marketplaceReferral.updateMany({
      where: { code: refCode.toUpperCase().trim() },
      data: {
        conversions: { increment: 1 },
        earningsUsd: { increment: Math.round(totalAmount * 0.1 * 100) / 100 },
      },
    }).catch(() => {});
  }

  // Provision any free listings immediately
  // Provision any free listings immediately
  for (const freeId of freeListingIds) {
    await prisma.marketplacePurchase.upsert({
      where: { userId_listingId: { userId: session.user.id, listingId: freeId } },
      create: {
        userId: session.user.id,
        listingId: freeId,
        price: 0,
        source: source || "MARKETPLACE",
        networkId: networkId || null,
      },
      update: {
        source: source || "MARKETPLACE",
        networkId: networkId || null,
      },
    }).catch(() => {});

    const freeListing = itemsToBuy.find((l) => l.id === freeId);
    if (freeListing) {
      await prisma.notification.create({
        data: {
          userId: freeListing.userId,
          type: "SYSTEM",
          title: "💰 Listing Acquired!",
          message: `Someone claimed your free listing: ${freeListing.title}`,
          link: `/${freeListing.slug ?? freeListing.id}`,
        },
      }).catch(() => {});
    }
  }

  // If everything was free
  if (paidListings.length === 0) {
    return NextResponse.json({ success: true, isFree: true, count: freeListingIds.length });
  }

  // Paid listings: Create Stripe Checkout Session
  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const isSingleItem = paidListings.length === 1 && freeListingIds.length === 0;
  const singleListing = paidListings[0];
  const primarySlugOrId = isSingleItem ? (singleListing.slug || singleListing.id) : "marketplace";

  const successUrl = source === "PRO_NETWORK" && networkSlug
    ? `${appUrl}/pro-networks/${networkSlug}?tab=shop&purchased=true&session_id={CHECKOUT_SESSION_ID}`
    : `${appUrl}/marketplace?view=purchases&checkout_success=true&session_id={CHECKOUT_SESSION_ID}`;

  const cancelUrl = source === "PRO_NETWORK" && networkSlug
    ? `${appUrl}/pro-networks/${networkSlug}?tab=shop`
    : `${appUrl}/${primarySlugOrId}`;

  const sessionMetadata: Record<string, string> = {
    userId: user.id,
    type: "marketplace",
    source: source || "MARKETPLACE",
    networkId: networkId || "",
    networkSlug: networkSlug || "",
    listingIds: paidListings.map((l) => l.id).join(","),
    listingId: singleListing.id,
    itemCount: String(paidListings.length),
    couponCode: couponCode || "",
    refCode: refCode || "",
  };

  // Direct Stripe Connect payment to seller's account
  // (All items in this cart belong to the same seller)
  const seller = paidListings[0].user;
  let isChargesEnabled = seller.stripeOnboarded;

  if (!isChargesEnabled && seller.stripeAccountId) {
    try {
      const acct = await stripe.accounts.retrieve(seller.stripeAccountId);
      if (acct.charges_enabled) {
        isChargesEnabled = true;
        await prisma.user.update({
          where: { id: seller.id },
          data: { stripeOnboarded: true },
        }).catch(() => {});
      }
    } catch (err: any) {
      console.warn("[Marketplace Checkout] Check seller account status failed:", err?.message);
    }
  }

  if (seller.stripeAccountId && isChargesEnabled) {
    try {
      const checkoutSession = await stripe.checkout.sessions.create(
        {
          mode: "payment",
          payment_method_types: ["card"],
          customer_email: user.email ?? undefined,
          line_items: lineItems,
          success_url: successUrl,
          cancel_url: cancelUrl,
          metadata: {
            ...sessionMetadata,
            sellerId: seller.id,
            sellerStripeAccountId: seller.stripeAccountId,
          },
        },
        { stripeAccount: seller.stripeAccountId }
      );
      return NextResponse.json({ url: checkoutSession.url, sessionId: checkoutSession.id });
    } catch (directErr: any) {
      console.warn("[Marketplace Checkout] Direct connect charge failed, falling back to platform checkout:", directErr?.message);
    }
  }

  // Platform Stripe Checkout Session (for multi-item carts, or sellers completing onboarding)
  try {
    const checkoutSession = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      customer_email: user.email ?? undefined,
      line_items: lineItems,
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: sessionMetadata,
    });

    return NextResponse.json({ url: checkoutSession.url, sessionId: checkoutSession.id });
  } catch (err: any) {
    console.error("[Marketplace Checkout] Stripe checkout failed:", err);
    return NextResponse.json(
      { error: err?.message || "Failed to initiate Stripe checkout" },
      { status: 500 }
    );
  }
}

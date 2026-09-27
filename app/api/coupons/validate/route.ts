import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getToolkit } from "@/lib/toolkits";

const TIER_PRICES: Record<string, number> = {
  VIP: 39.99,
  MARKETPLACE: 59.99,
  MARKETPLACE_PLUS: 79.99,
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const {
      code,
      listingId,
      courseSlug,
      tier,
      toolkitId,
      cartItems,
      subtotal,
      sellerId: passedSellerId,
    } = body;

    if (!code || typeof code !== "string" || !code.trim()) {
      return NextResponse.json({ valid: false, error: "Please enter a promo code" }, { status: 400 });
    }

    const cleanCode = code.toUpperCase().trim();

    // 1. Find coupon in database
    const matchingCoupons = await prisma.marketplaceCoupon.findMany({
      where: {
        code: cleanCode,
        isActive: true,
      },
      include: {
        seller: {
          select: { id: true, role: true, name: true },
        },
        listing: {
          select: { id: true, title: true, slug: true, price: true },
        },
      },
    });

    if (!matchingCoupons || matchingCoupons.length === 0) {
      return NextResponse.json({ valid: false, error: "Invalid or inactive promo code" }, { status: 404 });
    }

    // Determine relevant seller IDs from request context
    const requestedSellerIds = new Set<string>();
    if (passedSellerId) requestedSellerIds.add(passedSellerId);

    if (Array.isArray(cartItems) && cartItems.length > 0) {
      cartItems.forEach((item: any) => {
        if (item.sellerId) requestedSellerIds.add(item.sellerId);
        if (item.seller?.id) requestedSellerIds.add(item.seller.id);
      });
    }

    // Select the best matching coupon:
    // Prioritize a coupon from the same seller, or an ADMIN platform coupon
    let coupon =
      matchingCoupons.find((c) => requestedSellerIds.has(c.sellerId)) ||
      matchingCoupons.find((c) => c.seller?.role === "ADMIN") ||
      matchingCoupons[0];

    // Check expiration date
    if (coupon.expiresAt && new Date() > coupon.expiresAt) {
      return NextResponse.json({ valid: false, error: "This promo code has expired" }, { status: 400 });
    }

    // Check maximum redemptions
    if (coupon.maxUses != null && coupon.usedCount >= coupon.maxUses) {
      return NextResponse.json(
        { valid: false, error: "This promo code has reached its maximum usage limit" },
        { status: 400 }
      );
    }

    const isAdminCoupon = coupon.seller?.role === "ADMIN";

    // 2. Evaluate Applicability & Pricing

    // --- Scenario A: Cart Context ---
    if (Array.isArray(cartItems) && cartItems.length > 0) {
      // Check seller permission if not an admin coupon
      if (!isAdminCoupon && requestedSellerIds.size > 0 && !requestedSellerIds.has(coupon.sellerId)) {
        return NextResponse.json(
          { valid: false, error: "This promo code cannot be used for this creator's items" },
          { status: 400 }
        );
      }

      // Check item targeting
      let eligibleItems = cartItems;
      if (coupon.listingId) {
        const target = coupon.listingId.toUpperCase();
        if (isAdminCoupon && (target === "ALL" || target === "PLATFORM" || target === "MARKETPLACE")) {
          eligibleItems = cartItems;
        } else {
          eligibleItems = cartItems.filter(
            (item: any) => item.id === coupon.listingId || item.slug === coupon.listingId
          );
          if (eligibleItems.length === 0) {
            return NextResponse.json(
              { valid: false, error: "This promo code is only valid for a specific item not in your cart" },
              { status: 400 }
            );
          }
        }
      }

      const cartSubtotal = typeof subtotal === "number" && subtotal > 0
        ? subtotal
        : cartItems.reduce((acc: number, i: any) => acc + (Number(i.price) || 0), 0);

      const eligibleSubtotal = eligibleItems.reduce(
        (acc: number, i: any) => acc + (Number(i.price) || 0),
        0
      );

      if (cartSubtotal <= 0 || eligibleSubtotal <= 0) {
        return NextResponse.json({ valid: false, error: "The items in your cart are already free" }, { status: 400 });
      }

      let savings = 0;
      if (coupon.discountType === "PERCENT") {
        savings = (eligibleSubtotal * coupon.discountValue) / 100;
      } else {
        savings = Math.min(eligibleSubtotal, coupon.discountValue);
      }
      savings = Math.round(Math.min(eligibleSubtotal, Math.max(0, savings)) * 100) / 100;
      const discountedPrice = Math.max(0, Math.round((cartSubtotal - savings) * 100) / 100);

      return NextResponse.json({
        valid: true,
        id: coupon.id,
        code: coupon.code,
        discountType: coupon.discountType,
        discountValue: coupon.discountValue,
        originalPrice: Math.round(cartSubtotal * 100) / 100,
        discountedPrice,
        savings,
        label: coupon.discountType === "PERCENT" ? `${coupon.discountValue}% OFF` : `$${coupon.discountValue} OFF`,
      });
    }

    // --- Scenario B: Single Product Context ---
    let targetListing = null;
    let targetCourse = null;
    let targetToolkit = null;
    let basePrice = 0;
    let resolvedSellerId = "";
    let productCategory: "MEMBERSHIP" | "COURSE" | "TOOLKIT" | "MARKETPLACE" | "OTHER" = "OTHER";

    if (tier) {
      basePrice = TIER_PRICES[tier] || 0;
      productCategory = "MEMBERSHIP";
    } else if (toolkitId) {
      targetToolkit = getToolkit(toolkitId);
      basePrice = targetToolkit?.price || 0;
      productCategory = "TOOLKIT";
    } else if (listingId) {
      targetListing = await prisma.marketplaceListing.findFirst({
        where: { OR: [{ id: listingId }, { slug: listingId }] },
      });
      if (targetListing) {
        basePrice = targetListing.price || 0;
        resolvedSellerId = targetListing.userId;
        productCategory = "MARKETPLACE";
      } else {
        // Fallback: check if it's a course
        targetCourse = await prisma.course.findFirst({
          where: { OR: [{ id: listingId }, { slug: listingId }] },
        });
        if (targetCourse) {
          basePrice = targetCourse.isFree ? 0 : targetCourse.price || 0;
          resolvedSellerId = targetCourse.instructorId;
          productCategory = "COURSE";
        } else {
          return NextResponse.json({ valid: false, error: "Item not found" }, { status: 404 });
        }
      }
    } else if (courseSlug) {
      targetCourse = await prisma.course.findUnique({
        where: { slug: courseSlug },
      });
      if (targetCourse) {
        basePrice = targetCourse.isFree ? 0 : targetCourse.price || 0;
        resolvedSellerId = targetCourse.instructorId;
        productCategory = "COURSE";
      } else {
        return NextResponse.json({ valid: false, error: "Course not found" }, { status: 404 });
      }
    }

    if (basePrice <= 0) {
      return NextResponse.json({ valid: false, error: "This item is already free" }, { status: 400 });
    }

    // Check permissions
    if (isAdminCoupon) {
      if (coupon.listingId) {
        const target = coupon.listingId.toUpperCase();
        if (target === "ALL" || target === "PLATFORM") {
          // Allowed everywhere
        } else if (target === "MEMBERSHIP" || target === "UPGRADE") {
          if (productCategory !== "MEMBERSHIP") {
            return NextResponse.json({ valid: false, error: "This code is only valid for Membership Upgrades" }, { status: 400 });
          }
        } else if (target === "COURSES" || target === "COURSE") {
          if (productCategory !== "COURSE") {
            return NextResponse.json({ valid: false, error: "This code is only valid for Academy Courses" }, { status: 400 });
          }
        } else if (target === "TOOLKITS" || target === "TOOLKIT") {
          if (productCategory !== "TOOLKIT") {
            return NextResponse.json({ valid: false, error: "This code is only valid for Success Toolkits" }, { status: 400 });
          }
        } else if (target === "MARKETPLACE") {
          if (productCategory !== "MARKETPLACE") {
            return NextResponse.json({ valid: false, error: "This code is only valid for Marketplace Items" }, { status: 400 });
          }
        } else {
          const matchesListing = targetListing && targetListing.id === coupon.listingId;
          const matchesCourse = targetCourse && (targetCourse.id === coupon.listingId || targetCourse.slug === coupon.listingId);
          const matchesToolkit = targetToolkit && targetToolkit.id === coupon.listingId;
          if (!matchesListing && !matchesCourse && !matchesToolkit) {
            return NextResponse.json({ valid: false, error: "This promo code is not applicable to this item" }, { status: 400 });
          }
        }
      }
    } else {
      if (resolvedSellerId && coupon.sellerId !== resolvedSellerId) {
        return NextResponse.json({ valid: false, error: "This promo code cannot be used for this creator's items" }, { status: 400 });
      }
      if (coupon.listingId) {
        const matchesListing = targetListing && (targetListing.id === coupon.listingId || targetListing.slug === coupon.listingId);
        const matchesCourse = targetCourse && (targetCourse.id === coupon.listingId || targetCourse.slug === coupon.listingId);
        if (!matchesListing && !matchesCourse) {
          return NextResponse.json({ valid: false, error: "This promo code is not applicable to this item" }, { status: 400 });
        }
      }
    }

    let savings = 0;
    if (coupon.discountType === "PERCENT") {
      savings = (basePrice * coupon.discountValue) / 100;
    } else {
      savings = Math.min(basePrice, coupon.discountValue);
    }
    savings = Math.round(Math.min(basePrice, Math.max(0, savings)) * 100) / 100;
    const discountedPrice = Math.max(0, Math.round((basePrice - savings) * 100) / 100);

    const months = coupon.durationMonths || 1;
    let label = coupon.discountType === "PERCENT" ? `${coupon.discountValue}% OFF` : `$${coupon.discountValue} OFF`;
    if (productCategory === "MEMBERSHIP" && months > 1) {
      if (coupon.discountType === "PERCENT" && coupon.discountValue >= 100) {
        label = `100% OFF (${months} Months Free)`;
      } else {
        label = `${label} (${months} Months)`;
      }
    }

    return NextResponse.json({
      valid: true,
      id: coupon.id,
      code: coupon.code,
      discountType: coupon.discountType,
      discountValue: coupon.discountValue,
      durationMonths: months,
      originalPrice: basePrice,
      discountedPrice,
      savings,
      label,
    });
  } catch (err: any) {
    console.error("Coupon validation error:", err);
    return NextResponse.json({ valid: false, error: err.message || "Failed to validate coupon" }, { status: 500 });
  }
}

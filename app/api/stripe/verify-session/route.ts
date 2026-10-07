import { fulfillDirectCheckout } from "@/lib/stripe-direct-connect";
import { grantAcademyMembershipBonus, reconcileAcademyMembershipBonus } from "@/lib/academy-membership-bonus";
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { SubscriptionTier } from "@prisma/client";
import { TRAINING_TOOLKIT_IDS, DEFAULT_SEATS, LICENSE_MONTHS } from "@/lib/training";
import { ensureActiveTrainingVersion } from "@/lib/trainingServer";
import {
  sendMembershipUpgradedEmail,
  notifyAdminUpgrade,
  notifyAdminPurchase,
} from "@/lib/email";
import { fulfillStripePurchase } from "@/lib/fulfillment";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

const PRICE_TO_TIER: Record<string, SubscriptionTier> = {
  [process.env.STRIPE_VIP_PRICE_ID!]:              "VIP",
  [process.env.STRIPE_MARKETPLACE_PRICE_ID!]:      "MARKETPLACE",
  [process.env.STRIPE_MARKETPLACE_PLUS_PRICE_ID!]: "MARKETPLACE_PLUS",
};

// POST /api/stripe/verify-session
// Called on the success redirect to immediately update the DB regardless of webhook delivery
export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { sessionId, stripeAccount } = await req.json() as { sessionId?: string; stripeAccount?: string };
  if (stripeAccount && (typeof stripeAccount !== "string" || !/^acct_[a-zA-Z0-9]+$/.test(stripeAccount))) return NextResponse.json({ error: "Invalid account" }, { status: 400 });
  if (!sessionId) return NextResponse.json({ error: "Missing sessionId" }, { status: 400 });

  let stripeSession: Stripe.Checkout.Session;
  try {
    stripeSession = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ["subscription", "subscription.items.data.price"],
    }, stripeAccount ? { stripeAccount } : undefined);
  } catch {
    return NextResponse.json({ error: "Invalid session" }, { status: 400 });
  }

  // Security: only allow the session owner to verify
  const { userId, tier, type } = stripeSession.metadata ?? {};
  if (userId !== session.user.id)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  if (stripeSession.status !== "complete" || stripeSession.payment_status === "unpaid")
    return NextResponse.json({ error: "Payment not completed" }, { status: 400 });

  if (stripeAccount) {
    try {
      await fulfillDirectCheckout(stripe, stripeSession, stripeAccount);
      return NextResponse.json({ success: true });
    } catch (error) {
      console.error("Connected payment verification failed:", error);
      return NextResponse.json({ error: "Unable to confirm this seller payment. Please retry." }, { status: 409 });
    }
  }

  const membershipBonus = await grantAcademyMembershipBonus(stripeSession, userId);

  let resolvedTier: SubscriptionTier | null = null;

  // Subscription purchase — resolve tier from price ID
  if (stripeSession.mode === "subscription") {
    const sub = stripeSession.subscription as Stripe.Subscription | null;
    const priceId = sub?.items?.data?.[0]?.price?.id ?? "";
    resolvedTier = PRICE_TO_TIER[priceId] ?? (tier as SubscriptionTier) ?? null;

    if (resolvedTier) {
      // Check if upgrade email was already sent in last 10 minutes to prevent duplicate emails
      const alreadyNotified = await prisma.notification.findFirst({
        where: {
          userId,
          title: "🎉 Membership Upgraded!",
          createdAt: { gte: new Date(Date.now() - 10 * 60 * 1000) },
        },
      });

      await prisma.user.update({ where: { id: userId }, data: { tier: resolvedTier } });
      await prisma.subscription.upsert({
        where:  { userId },
        create: { userId, plan: resolvedTier, stripeCustomerId: stripeSession.customer as string, stripeSubscriptionId: sub?.id ?? "", status: "active" },
        update: { plan: resolvedTier, stripeSubscriptionId: sub?.id ?? "", status: "active" },
      });
      await prisma.notification.create({
        data: { userId, type: "SYSTEM", title: "🎉 Membership Upgraded!", message: `You are now on the ${resolvedTier} plan. Enjoy your new benefits!` },
      }).catch(() => {});

      if (!alreadyNotified) {
        const u = await prisma.user.findUnique({ where: { id: userId }, select: { email: true, name: true } });
        if (u?.email) {
          sendMembershipUpgradedEmail({
            to: u.email,
            userName: u.name || "Member",
            tier: resolvedTier,
            currentPeriodEnd: (sub as any)?.current_period_end ? new Date((sub as any).current_period_end * 1000) : undefined,
          }).catch(err => console.error("[Verify Session] Failed to send upgrade email:", err));
        }
      }

      notifyAdminUpgrade({
        userId,
        tier: resolvedTier,
        stripeSessionId: stripeSession.id,
        amountTotal: stripeSession.amount_total,
        currency: stripeSession.currency,
        customerEmail: stripeSession.customer_details?.email,
        customerName: stripeSession.customer_details?.name,
      }).catch(err => console.error("[Verify Session] Failed to send admin upgrade alert:", err));
    }
  }

  // Toolkit / bundle / course purchase (Centralized Robust Fulfillment)
  let enrolledCourseSlug: string | null = null;
  if (type === "toolkit" || type === "bundle" || type === "course" || stripeSession.metadata?.productKey) {
    const res = await fulfillStripePurchase({
      userId,
      session: stripeSession,
      membershipBonus,
    });
    enrolledCourseSlug = res.enrolledCourseSlug || null;
  }

  // Marketplace item(s) purchase fulfillment
  if (type === "marketplace") {
    const { listingId, listingIds, source, networkId } = stripeSession.metadata ?? {};
    const ids = (listingIds ? listingIds.split(",") : [listingId]).filter(Boolean);
    for (const id of ids) {
      await prisma.marketplacePurchase.upsert({
        where:  { userId_listingId: { userId, listingId: id } },
        create: {
          userId,
          listingId: id,
          price: Number(stripeSession.amount_total ? (stripeSession.amount_total / 100) / ids.length : 0),
          stripeSessionId: stripeSession.id,
          source: source || "MARKETPLACE",
          networkId: networkId || null,
        },
        update: {
          stripeSessionId: stripeSession.id,
          source: source || "MARKETPLACE",
          networkId: networkId || null,
        },
      }).catch(() => {});

      const listing = await prisma.marketplaceListing.findUnique({ where: { id }, select: { title: true } });
      if (listing) {
        notifyAdminPurchase({
          userId,
          itemType: "marketplace",
          itemName: `Marketplace: ${listing.title}`,
          amountTotal: stripeSession.amount_total,
          currency: stripeSession.currency,
          stripeSessionId: stripeSession.id,
          metadata: stripeSession.metadata,
          customerEmail: stripeSession.customer_details?.email,
          customerName: stripeSession.customer_details?.name,
        }).catch(err => console.error("[Verify Session] Admin marketplace alert error:", err));
      }
    }
  }

  await reconcileAcademyMembershipBonus(userId);

  // Return the fresh tier so the client can update Redux
  const freshUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { tier: true, role: true, name: true, email: true, image: true, bio: true, headline: true },
  });

  return NextResponse.json({ tier: freshUser?.tier ?? "FREE", user: freshUser, enrolledCourseSlug });
}

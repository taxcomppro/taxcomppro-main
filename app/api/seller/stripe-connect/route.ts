import { isDirectChargeReady, supportsSellerPaidCharges } from "@/lib/stripe-direct-connect";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import Stripe from "stripe";

function getStripe(): Stripe {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    throw new Error("STRIPE_SECRET_KEY is not configured on the server.");
  }
  return new Stripe(secretKey);
}

function getBaseUrl(req: NextRequest): string {
  if (process.env.NEXT_PUBLIC_APP_URL) return new URL(process.env.NEXT_PUBLIC_APP_URL).origin;
  const originHeader = req.headers.get("origin");
  if (originHeader) return originHeader.replace(/\/$/, "");

  const forwardedHost = req.headers.get("x-forwarded-host");
  if (forwardedHost) {
    const proto = req.headers.get("x-forwarded-proto") || "https";
    return `${proto}://${forwardedHost}`.replace(/\/$/, "");
  }

  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "");
  }

  return "https://taxcomppro.com";
}

// GET — return connection status + account details
export async function GET() {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { stripeAccountId: true, stripeOnboarded: true, tier: true, role: true },
    });
    if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });

    let accountDetails = null;
    if (user.stripeAccountId) {
      try {
        const stripe = getStripe();
        const acct = await stripe.accounts.retrieve(user.stripeAccountId);
        const onboarded = isDirectChargeReady(acct);

        // Sync onboarding status to DB if it changed
        if (onboarded !== user.stripeOnboarded) {
          await prisma.user.update({
            where: { id: session.user.id },
            data: { stripeOnboarded: onboarded },
          });
        }

        user.stripeOnboarded = onboarded;
        accountDetails = {
          id: acct.id,
          email: acct.email,
          country: acct.country,
          chargesEnabled: acct.charges_enabled,
          payoutsEnabled: acct.payouts_enabled,
          pendingVerification: !!acct.requirements?.pending_verification?.length,
          detailsSubmitted: acct.details_submitted,
          onboarded,
          requiresSetupReview: !supportsSellerPaidCharges(acct),
        };
      } catch (err: any) {
        // A transient Stripe failure must never erase a seller's connection.
        console.error("Stripe account status lookup failed:", err?.message);
        return NextResponse.json({ error: "Unable to verify Stripe status. Please retry." }, { status: 503 });
      }
    }

    return NextResponse.json({
      connected: !!user.stripeAccountId,
      onboarded: user.stripeOnboarded,
      accountId: user.stripeAccountId,
      accountDetails,
    });
  } catch (err: any) {
    console.error("GET /api/seller/stripe-connect error:", err);
    return NextResponse.json({ error: err?.message || "Internal server error" }, { status: 500 });
  }
}

// POST — create seller-paid connected account + return onboarding link
export async function POST(req: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    let body: { returnUrl?: string } = {};
    try {
      body = await req.json();
    } catch {
      // empty body is acceptable
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { stripeAccountId: true, stripeOnboarded: true, tier: true, role: true, email: true, name: true },
    });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const stripe = getStripe();
    let accountId = user.stripeAccountId;

    if (accountId) {
      const existingAccount = await stripe.accounts.retrieve(accountId);
      if (!supportsSellerPaidCharges(existingAccount)) {
        return NextResponse.json({ code: "STRIPE_SETUP_REVIEW_REQUIRED", error: "Your existing Stripe account assigns fees or payment losses to the platform. Contact support to review migration to a seller-paid Stripe connection. Existing subscriptions must be reviewed before replacing this account." }, { status: 409 });
      }
    } else {
      // Accounts v1 controller properties: full seller dashboard, seller-paid
      // Stripe fees, and Stripe-managed negative-balance liability.
      const account = await stripe.accounts.create({
        controller: {
          fees: { payer: "account" },
          losses: { payments: "stripe" },
          stripe_dashboard: { type: "full" },
          requirement_collection: "stripe",
        },
        email: user.email ?? undefined,
        business_profile: { name: user.name ?? undefined },
        metadata: { platformUserId: session.user.id },
      }, { idempotencyKey: "seller-connect:" + session.user.id });
      accountId = account.id;
      await prisma.user.update({ where: { id: session.user.id }, data: { stripeAccountId: accountId, stripeOnboarded: false } });
    }

    const baseUrl = getBaseUrl(req);
    const targetReturnPath = typeof body.returnUrl === "string" && body.returnUrl.startsWith("/") && !body.returnUrl.startsWith("//") && !body.returnUrl.includes("\\") ? body.returnUrl : "/seller-dashboard";
    const separator = targetReturnPath.includes("?") ? "&" : "?";

    const refreshUrl = `${baseUrl}${targetReturnPath}${separator}stripe=refresh`;
    const returnUrl = `${baseUrl}${targetReturnPath}${separator}stripe=success`;

    // Generate a fresh Account Link for onboarding
    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: refreshUrl,
      return_url: returnUrl,
      type: "account_onboarding",
    });

    return NextResponse.json({ url: accountLink.url });
  } catch (error: any) {
    console.error("POST /api/seller/stripe-connect error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to start Stripe onboarding." },
      { status: 500 }
    );
  }
}

// DELETE — disconnect Stripe account
export async function DELETE() {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await prisma.user.update({
      where: { id: session.user.id },
      data: { stripeAccountId: null, stripeOnboarded: false },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("DELETE /api/seller/stripe-connect error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to disconnect Stripe account." },
      { status: 500 }
    );
  }
}

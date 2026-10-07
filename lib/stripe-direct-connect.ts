import Stripe from "stripe";
import { prisma } from "@/lib/prisma";
import { hasNetworkMembership } from "@/lib/networkAccess";

export function supportsSellerPaidCharges(account: Stripe.Account) {
  return account.controller?.fees?.payer === "account" &&
    account.controller?.losses?.payments === "stripe";
}

export function isDirectChargeReady(account: Stripe.Account) {
  return supportsSellerPaidCharges(account) && account.charges_enabled &&
    account.payouts_enabled && account.details_submitted;
}

export async function requireDirectChargeAccount(stripe: Stripe, accountId: string | null | undefined) {
  if (!accountId) throw new Error("The seller must connect Stripe before accepting payments.");
  const account = await stripe.accounts.retrieve(accountId);
  if (!supportsSellerPaidCharges(account)) {
    throw new Error("This seller's Stripe connection requires a setup review: fees and payment losses must not be assigned to the platform. Please contact support.");
  }
  if (!isDirectChargeReady(account)) {
    throw new Error("The seller must finish Stripe verification and enable payments and payouts before accepting purchases.");
  }
  return account.id;
}

// Account-scoped validation is required even for signed Connect events: sellers
// can create their own Stripe metadata, so metadata alone cannot grant access.
export async function fulfillDirectCheckout(stripe: Stripe, session: Stripe.Checkout.Session, accountId: string) {
  const meta = session.metadata ?? {};
  const userId = meta.userId;
  if (!userId || session.status !== "complete" || session.payment_status !== "paid") {
    throw new Error("Payment has not completed.");
  }
  if (meta.type === "marketplace") {
    const ids = [...new Set((meta.listingIds || meta.listingId || "").split(",").filter(Boolean))];
    const listings = await prisma.marketplaceListing.findMany({
      where: { id: { in: ids } }, include: { user: { select: { stripeAccountId: true } } },
    });
    if (!ids.length || listings.length !== ids.length || listings.some(l => l.user.stripeAccountId !== accountId)) {
      throw new Error("Payment account does not match the listing seller.");
    }
    const lineItems = await stripe.checkout.sessions.listLineItems(session.id, { limit: 100, expand: ["data.price.product"] }, { stripeAccount: accountId });
    if (lineItems.has_more) throw new Error("Checkout contains too many line items.");
    const amounts = new Map<string, number>();
    for (const item of lineItems.data) {
      const product = item.price?.product;
      if (product && typeof product !== "string" && !product.deleted && product.metadata.listingId) {
        amounts.set(product.metadata.listingId, (amounts.get(product.metadata.listingId) ?? 0) + item.amount_total / 100);
      }
    }
    // Older sessions did not label line items. Preserve their fulfillment.
    if (amounts.size && ids.some(id => !amounts.has(id))) throw new Error("Checkout line items do not match the order.");
    await prisma.$transaction(async tx => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`marketplace:${session.id}`}))`;
      for (const listing of listings) {
        const existing = await tx.marketplacePurchase.findUnique({ where: { userId_listingId: { userId, listingId: listing.id } } });
        if (existing) continue;
        await tx.marketplacePurchase.create({ data: {
          userId, listingId: listing.id, stripeSessionId: session.id,
          price: amounts.get(listing.id) ?? (session.amount_total ?? 0) / 100 / ids.length,
          source: meta.source || "MARKETPLACE", networkId: meta.networkId || null,
        } });
        await tx.notification.create({ data: { userId: listing.userId, type: "SYSTEM", title: "Listing purchased", message: `Your listing ${listing.title} was purchased. Payment was received in your Stripe account.`, link: `/${listing.slug || listing.id}` } });
        await tx.notification.create({ data: { userId, type: "SYSTEM", title: "Purchase complete", message: `Your purchase of ${listing.title} is ready.`, link: `/${listing.slug || listing.id}` } });
      }
    });
    return;
  }
  if (meta.type === "pro_network_sub" && meta.networkId) {
    const subscriptionId = typeof session.subscription === "string" ? session.subscription : session.subscription?.id;
    if (!subscriptionId) throw new Error("Missing network subscription.");
    const sub = await stripe.subscriptions.retrieve(subscriptionId, {}, { stripeAccount: accountId });
    await syncDirectNetworkSubscription(sub, accountId, { networkId: meta.networkId, userId });
    return;
  }
  throw new Error("Unsupported connected-account checkout.");
}

export async function syncDirectNetworkSubscription(
  sub: Stripe.Subscription,
  accountId: string,
  checkout?: { networkId: string; userId: string },
) {
  const existing = await prisma.proNetworkMember.findFirst({ where: { stripeSubscriptionId: sub.id } });
  const networkId = existing?.networkId || checkout?.networkId || sub.metadata.networkId;
  const userId = existing?.userId || checkout?.userId || sub.metadata.userId;
  if (!networkId || !userId) return;
  const network = await prisma.proNetwork.findUnique({ where: { id: networkId }, include: { owner: { select: { stripeAccountId: true } } } });
  if (!network || network.owner.stripeAccountId !== accountId) throw new Error("Subscription account does not match network owner.");
  // Never grant access from a subscription-created event alone. Checkout must
  // first confirm payment; subsequent events may only update that membership.
  if (!existing && !checkout) return;
  const active = sub.status === "active" || sub.status === "trialing";
  const periodEnd = sub.items.data[0]?.current_period_end;
  const expiresAt = active && periodEnd ? new Date(periodEnd * 1000) : new Date();
  const status = active ? (sub.cancel_at_period_end ? "CANCELED" : "ACTIVE") : sub.status === "past_due" ? "PAST_DUE" : "EXPIRED";
  await prisma.$transaction(async tx => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`network-members:${networkId}`}))`;
    const previous = await tx.proNetworkMember.findUnique({ where: { networkId_userId: { networkId, userId } } });
    if (previous?.stripeSubscriptionId && previous.stripeSubscriptionId !== sub.id) {
      // A delayed event for an old subscription cannot revoke a new subscription.
      if (!checkout || hasNetworkMembership(previous)) return;
    }
    const data = { status, expiresAt, stripeSubscriptionId: sub.id, stripeCustomerId: typeof sub.customer === "string" ? sub.customer : sub.customer.id };
    await tx.proNetworkMember.upsert({ where: { networkId_userId: { networkId, userId } }, create: { networkId, userId, role: "MEMBER", ...data }, update: data });
    const wasCounted = !!previous && (previous.status === "ACTIVE" || (previous.status === "CANCELED" && !!previous.expiresAt));
    const delta = Number(active) - Number(wasCounted);
    if (delta) await tx.proNetwork.update({ where: { id: networkId }, data: { memberCount: { increment: delta } } });
    if (!previous && active) await tx.notification.create({ data: { userId, type: "SYSTEM", title: "Pro Network membership active", message: `Welcome to ${network.name}.`, link: `/pro-networks/${network.slug}` } });
  });
}

export async function handleDirectConnectEvent(stripe: Stripe, event: Stripe.Event) {
  const accountId = event.account;
  if (!accountId) return false;
  if (event.type === "account.updated") {
    const account = event.data.object as Stripe.Account;
    if (account.id !== accountId) throw new Error("Invalid account event.");
    await prisma.user.updateMany({ where: { stripeAccountId: accountId }, data: { stripeOnboarded: isDirectChargeReady(account) } });
    return true;
  }
  if (event.type === "account.application.deauthorized") {
    await prisma.user.updateMany({ where: { stripeAccountId: accountId }, data: { stripeOnboarded: false } });
    return true;
  }
  if (event.type === "checkout.session.completed" || event.type === "checkout.session.async_payment_succeeded") {
    const session = event.data.object as Stripe.Checkout.Session;
    if (!["marketplace", "pro_network_sub"].includes(session.metadata?.type || "")) return false;
    if (session.payment_status === "paid") await fulfillDirectCheckout(stripe, session, accountId);
    return true;
  }
  if (event.type === "customer.subscription.updated" || event.type === "customer.subscription.deleted") {
    const eventSub = event.data.object as Stripe.Subscription;
    // Retrieve current state so out-of-order delivery cannot restore old access.
    const sub = event.type === "customer.subscription.deleted" ? eventSub : await stripe.subscriptions.retrieve(eventSub.id, {}, { stripeAccount: accountId });
    await syncDirectNetworkSubscription(sub, accountId);
    return true;
  }
  if (event.type === "invoice.paid" || event.type === "invoice.payment_failed") {
    const invoice = event.data.object as Stripe.Invoice;
    const subscription = invoice.parent?.subscription_details?.subscription;
    const subscriptionId = typeof subscription === "string" ? subscription : subscription?.id;
    if (subscriptionId) {
      const sub = await stripe.subscriptions.retrieve(subscriptionId, {}, { stripeAccount: accountId });
      await syncDirectNetworkSubscription(sub, accountId);
    }
    return true;
  }
  return false;
}

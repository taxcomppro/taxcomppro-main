import { handleDirectConnectEvent } from "@/lib/stripe-direct-connect";
import { grantAcademyMembershipBonus, reconcileAcademyMembershipBonus } from "@/lib/academy-membership-bonus";
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { prisma } from "@/lib/prisma";
import type { SubscriptionTier } from "@prisma/client";
import { TRAINING_TOOLKIT_IDS, DEFAULT_SEATS, LICENSE_MONTHS } from "@/lib/training";
import { ensureActiveTrainingVersion } from "@/lib/trainingServer";
import { fulfillStripePurchase } from "@/lib/fulfillment";
import {
  sendMembershipUpgradedEmail,
  notifyAdminUpgrade,
  notifyAdminPurchase,
} from "@/lib/email";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

const PRICE_TO_TIER: Record<string, SubscriptionTier> = {
  [process.env.STRIPE_VIP_PRICE_ID!]:              "VIP",
  [process.env.STRIPE_MARKETPLACE_PRICE_ID!]:      "MARKETPLACE",
  [process.env.STRIPE_MARKETPLACE_PLUS_PRICE_ID!]: "MARKETPLACE_PLUS",
};

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig  = req.headers.get("stripe-signature");

  if (!sig) {
    console.error("[Stripe Webhook] Missing stripe-signature header");
    return NextResponse.json({ error: "Missing stripe-signature header" }, { status: 400 });
  }

  const webhookSecrets = [process.env.STRIPE_WEBHOOK_SECRET, process.env.STRIPE_CONNECT_WEBHOOK_SECRET].filter((value): value is string => !!value);
  if (!webhookSecrets.length) return NextResponse.json({ error: "Stripe webhook is not configured" }, { status: 500 });
  let event: Stripe.Event | undefined;
  for (const secret of webhookSecrets) {
    try { event = stripe.webhooks.constructEvent(body, sig, secret); break; } catch { /* Try the other endpoint secret. */ }
  }
  if (!event) return NextResponse.json({ error: "Invalid Stripe signature" }, { status: 400 });

  try {
  if (await handleDirectConnectEvent(stripe, event)) return NextResponse.json({ received: true });
  // Connected sellers cannot use their own metadata to grant platform upgrades.
  if (event.account) {
    const object = event.data.object as Stripe.Checkout.Session;
    if (object.metadata?.type !== "course") return NextResponse.json({ received: true });
  }

  if ((event.type === "checkout.session.completed" || event.type === "checkout.session.async_payment_succeeded")) {
    const session = event.data.object as Stripe.Checkout.Session;
    const { userId, tier, type, toolkitId } = session.metadata ?? {};
    if(session.payment_status === "unpaid") return NextResponse.json({received:true});
    const membershipBonus = await grantAcademyMembershipBonus(session);

    // Save customer phone number to User if collected during checkout
    if (userId && session.customer_details?.phone) {
      await prisma.user.update({
        where: { id: userId },
        data: { phone: session.customer_details.phone },
      }).catch(() => {});
    }

    // ── Toolkits, Courses & Bundles (Centralized Robust Fulfillment) ──────
    if (userId && (type === "toolkit" || type === "course" || type === "bundle" || session.metadata?.productKey)) {
      await fulfillStripePurchase({
        userId,
        session,
        membershipBonus,
      });
    }

    // ── Additional staff-training seats ────────────────────
    if (type === "training_seats" && userId) {
      const { licenseId, seats } = session.metadata ?? {};
      const seatCount = Number(seats ?? 0);
      if (licenseId && seatCount > 0) {
        const already = await prisma.trainingSeatPurchase.findUnique({ where: { stripeSessionId: session.id } });
        if (!already) {
          await prisma.trainingSeatPurchase.create({
            data: { licenseId, seats: seatCount, priceUsd: (session.amount_total ?? 0) / 100, stripeSessionId: session.id },
          });
          await prisma.trainingLicense.update({ where: { id: licenseId }, data: { totalSeats: { increment: seatCount } } });
          await prisma.notification.create({
            data: { userId, type: "SYSTEM", title: "✅ Training Seats Added", message: `${seatCount} additional staff training seat(s) have been added to your license.`, link: "/training-center" },
          }).catch(() => {});

          await notifyAdminPurchase({
            userId,
            itemType: "training_seats",
            itemName: `${seatCount} Staff Training Seat(s)`,
            amountTotal: session.amount_total,
            currency: session.currency,
            stripeSessionId: session.id,
            metadata: session.metadata,
            customerEmail: session.customer_details?.email,
            customerName: session.customer_details?.name,
          }).catch(err => console.error("[Stripe Webhook] Admin purchase alert error:", err));
        }
      }
    }

    // ── Pro Talk Host purchase (one-time $99.99) ──────────────────────
    if (type === "pro_talk_host" && userId) {
      await prisma.notification.create({
        data: {
          userId,
          type: "SYSTEM",
          title: "🎙️ Pro Talk Hosting Unlocked!",
          message: "Your $99.99 payment is confirmed. You can now host a Pro Talk audio room. Go to Pro Talks to start your session.",
          link: "/pro-talks",
        },
      });

      await notifyAdminPurchase({
        userId,
        itemType: "pro_talk_host",
        itemName: "Pro Talk Host Seat ($99.99)",
        amountTotal: session.amount_total || 9999,
        currency: session.currency || "usd",
        stripeSessionId: session.id,
        metadata: session.metadata,
        customerEmail: session.customer_details?.email,
        customerName: session.customer_details?.name,
      }).catch(err => console.error("[Stripe Webhook] Admin purchase alert error:", err));
    }

    // ── Ticketed Pro Talk Ticket Purchase ────────────────────────
    if (type === "space_ticket" && userId) {
      const { spaceId, customerEmail, customerName, ticketPrice } = session.metadata ?? {};
      if (spaceId) {
        const existingTicket = await prisma.spaceTicket.findUnique({
          where: { stripeSessionId: session.id },
        });

        if (!existingTicket) {
          const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
          let randomPart = "";
          for (let i = 0; i < 4; i++) {
            randomPart += chars.charAt(Math.floor(Math.random() * chars.length));
          }
          const ticketNumber = `TKT-${Date.now().toString().slice(-5)}-${randomPart}`;
          const pricePaid = (session.amount_total ?? 0) / 100;

          await prisma.spaceTicket.create({
            data: {
              spaceId,
              userId,
              ticketNumber,
              pricePaid: pricePaid || Number(ticketPrice || 0),
              stripeSessionId: session.id,
              stripePaymentIntentId:
                typeof session.payment_intent === "string"
                  ? session.payment_intent
                  : (session.payment_intent as any)?.id || null,
              paymentStatus: "PAID",
              status: "CONFIRMED",
              customerName: customerName || session.customer_details?.name || "Member",
              customerEmail: customerEmail || session.customer_details?.email || "",
            },
          });

          const space = await prisma.space.update({
            where: { id: spaceId },
            data: { ticketsSold: { increment: 1 } },
            select: { name: true, hostId: true },
          });

          await prisma.spaceRsvp.upsert({
            where: { spaceId_userId: { spaceId, userId } },
            create: {
              spaceId,
              userId,
              name: customerName || "Member",
              email: customerEmail || "",
            },
            update: {},
          });

          await prisma.notification.create({
            data: {
              userId,
              type: "SYSTEM",
              title: "🎟️ Pro Talk Ticket Confirmed!",
              message: `Your ticket (${ticketNumber}) for "${space.name}" is confirmed.`,
              link: `/pro-talks/${spaceId}`,
            },
          }).catch(() => {});

          if (space.hostId) {
            await prisma.notification.create({
              data: {
                userId: space.hostId,
                type: "SYSTEM",
                title: "💰 Pro Talk Ticket Sold!",
                message: `A new ticket was purchased for "${space.name}".`,
                link: `/pro-talks/${spaceId}`,
              },
            }).catch(() => {});
          }

          await notifyAdminPurchase({
            userId,
            itemType: "space_ticket",
            itemName: `Pro Talk Ticket: ${space.name} (${ticketNumber})`,
            amountTotal: session.amount_total,
            currency: session.currency,
            stripeSessionId: session.id,
            metadata: session.metadata,
            customerEmail: session.customer_details?.email,
            customerName: session.customer_details?.name,
          }).catch((err) => console.error("[Stripe Webhook] Admin purchase alert error:", err));
        }
      }
    }

    // ── Pro Talk Ticket Capacity Boost Pack ────────────────────
    if (type === "space_capacity_pack" && userId) {
      const { spaceId, additionalSeats, packKey, pricePaid } = session.metadata ?? {};
      if (spaceId) {
        const existingOrder = await prisma.spaceCapacityOrder.findUnique({
          where: { stripeSessionId: session.id },
        });

        if (!existingOrder) {
          const seatsCount = Number(additionalSeats || 25);
          await prisma.spaceCapacityOrder.create({
            data: {
              spaceId,
              hostId: userId,
              packKey: packKey || "PACK_25",
              additionalSeats: seatsCount,
              pricePaid: Number(pricePaid || (session.amount_total ?? 0) / 100),
              stripeSessionId: session.id,
              status: "COMPLETED",
            },
          });

          const space = await prisma.space.update({
            where: { id: spaceId },
            data: {
              ticketCapacity: { increment: seatsCount },
              bonusTicketCapacity: { increment: seatsCount },
            },
            select: { name: true, ticketCapacity: true },
          });

          await prisma.notification.create({
            data: {
              userId,
              type: "SYSTEM",
              title: "🚀 Ticket Capacity Boosted!",
              message: `+${seatsCount} ticket capacity added to "${space.name}". Total capacity: ${space.ticketCapacity} tickets.`,
              link: `/pro-talks/${spaceId}`,
            },
          }).catch(() => {});

          await notifyAdminPurchase({
            userId,
            itemType: "space_capacity_pack",
            itemName: `Capacity Boost: +${seatsCount} for ${space.name}`,
            amountTotal: session.amount_total,
            currency: session.currency,
            stripeSessionId: session.id,
            metadata: session.metadata,
            customerEmail: session.customer_details?.email,
            customerName: session.customer_details?.name,
          }).catch((err) => console.error("[Stripe Webhook] Admin capacity alert error:", err));
        }
      }
    }

    // ── Marketplace item purchase ──────────────────────────
    if (type === "marketplace" && userId) {
      const { listingId, listingIds } = session.metadata ?? {};
      const ids = (listingIds ? listingIds.split(",") : [listingId]).filter(Boolean);
      for (const id of ids) {
        await prisma.marketplacePurchase.upsert({
          where:  { userId_listingId: { userId, listingId: id } },
          create: { userId, listingId: id, price: Number(session.amount_total ? (session.amount_total / 100) / ids.length : 0), stripeSessionId: session.id },
          update: { stripeSessionId: session.id },
        }).catch(() => {});

        const listing = await prisma.marketplaceListing.findUnique({ where: { id }, select: { title: true, userId: true, slug: true } });
        if (listing) {
          await prisma.notification.create({
            data: {
              userId: listing.userId,
              type: "SYSTEM",
              title: "💰 Listing Purchased!",
              message: `Someone purchased your listing: ${listing.title}`,
              link: `/${listing.slug ?? id}`,
            },
          }).catch(() => {});
          await prisma.notification.create({
            data: {
              userId,
              type: "SYSTEM",
              title: "🎉 Purchase Complete!",
              message: `Your purchase of "${listing.title}" is complete. Your product download is ready!`,
              link: `/${listing.slug ?? id}`,
            },
          }).catch(() => {});

          await notifyAdminPurchase({
            userId,
            itemType: "marketplace",
            itemName: `Marketplace: ${listing.title}`,
            amountTotal: session.amount_total,
            currency: session.currency,
            stripeSessionId: session.id,
            metadata: session.metadata,
            customerEmail: session.customer_details?.email,
            customerName: session.customer_details?.name,
          }).catch(err => console.error("[Stripe Webhook] Admin purchase alert error:", err));
        }
      }
    }

    // ── ProConnect Card purchase ($29 one-time) ───────────
    if ((type === "proconnect_card" || session.metadata?.product === "proconnect_card") && userId) {
      const fallbackUsername = `user-${userId.slice(-6).toLowerCase()}`;
      await prisma.digitalCard.upsert({
        where: { userId },
        create: {
          userId,
          username: fallbackUsername,
          isPurchased: true,
          isActivated: false,
          stripeSessionId: session.id,
        },
        update: {
          isPurchased: true,
          stripeSessionId: session.id,
        },
      });

      await prisma.notification.create({
        data: {
          userId,
          type: "SYSTEM",
          title: "💳 ProConnect Card Purchase Confirmed!",
          message: "Your $29 ProConnect card order is confirmed. You can now activate and customize your digital business card and profile!",
          link: "/connect",
        },
      }).catch(() => {});

      await notifyAdminPurchase({
        userId,
        itemType: "proconnect_card",
        itemName: "ProConnect Digital Card ($29)",
        amountTotal: session.amount_total || 2900,
        currency: session.currency || "usd",
        stripeSessionId: session.id,
        metadata: session.metadata,
        customerEmail: session.customer_details?.email,
        customerName: session.customer_details?.name,
      }).catch(err => console.error("[Stripe Webhook] Admin purchase alert error:", err));
    }

    // ── Pro Network Monthly Membership Subscription ──────
    if (type === "pro_network_sub" && userId) {
      const { networkId, networkSlug } = session.metadata ?? {};
      if (networkId) {
        await prisma.proNetworkMember.upsert({
          where: { networkId_userId: { networkId, userId } },
          create: {
            networkId,
            userId,
            role: "MEMBER",
            status: "ACTIVE",
            stripeCustomerId: session.customer as string,
            stripeSubscriptionId: session.subscription as string,
          },
          update: {
            status: "ACTIVE",
            stripeCustomerId: session.customer as string,
            stripeSubscriptionId: session.subscription as string,
            joinedAt: new Date(),
          },
        });

        const updatedNetwork = await prisma.proNetwork.update({
          where: { id: networkId },
          data: { memberCount: { increment: 1 } },
          select: { ownerId: true, name: true, slug: true },
        });

        // Notify member
        await prisma.notification.create({
          data: {
            userId,
            type: "SYSTEM",
            title: "🌟 Pro Network Membership Active!",
            message: "Welcome to your new Pro Network! Your custom member badge, private feeds, discussion vault, and exclusive resources are now unlocked.",
            link: `/pro-networks/${networkSlug ?? updatedNetwork.slug}`,
          },
        }).catch(() => {});

        // Notify owner
        if (updatedNetwork.ownerId) {
          await prisma.notification.create({
            data: {
              userId: updatedNetwork.ownerId,
              type: "SYSTEM",
              title: "🎉 New Paying Member Subscribed!",
              message: `A new member subscribed to your Pro Network: ${updatedNetwork.name}. Subscription payout is routed directly to your Stripe account.`,
              link: `/pro-networks/${networkSlug ?? updatedNetwork.slug}`,
            },
          }).catch(() => {});
        }

        await notifyAdminPurchase({
          userId,
          itemType: "pro_network_sub",
          itemName: `Pro Network: ${updatedNetwork.name}`,
          amountTotal: session.amount_total,
          currency: session.currency,
          stripeSessionId: session.id,
          metadata: session.metadata,
          customerEmail: session.customer_details?.email,
          customerName: session.customer_details?.name,
        }).catch(err => console.error("[Stripe Webhook] Admin purchase alert error:", err));
      }
    }

    // ── Subscription upgrade ──────────────────────────────
    if (type !== "toolkit" && type !== "proconnect_card" && type !== "pro_network_sub" && session.metadata?.product !== "proconnect_card" && userId && tier) {
      const t = tier as SubscriptionTier;
      await prisma.user.update({ where: { id: userId }, data: { tier: t } });
      await prisma.subscription.upsert({
        where:  { userId },
        create: { userId, plan: t, stripeCustomerId: session.customer as string, stripeSubscriptionId: session.subscription as string, status: "active" },
        update: { plan: t, stripeSubscriptionId: session.subscription as string, status: "active" },
      });

      await reconcileAcademyMembershipBonus(userId);
      // Check if upgrade email was already sent in last 10 minutes to prevent duplicates
      const alreadyNotified = await prisma.notification.findFirst({
        where: {
          userId,
          title: "🎉 Membership Upgraded!",
          createdAt: { gte: new Date(Date.now() - 10 * 60 * 1000) },
        },
      });

      if (!alreadyNotified) {
        await prisma.notification.create({
          data: { userId, type: "SYSTEM", title: "🎉 Membership Upgraded!", message: `You are now on the ${t} plan. Enjoy your new benefits!` },
        }).catch(() => {});

        const u = await prisma.user.findUnique({ where: { id: userId }, select: { email: true, name: true } });
        if (u?.email) {
          sendMembershipUpgradedEmail({
            to: u.email,
            userName: u.name || "Member",
            tier: t,
          }).catch(err => console.error("[Stripe Webhook] Failed to send upgrade email:", err));
        }
      }

      await notifyAdminUpgrade({
        userId,
        tier: t,
        stripeSessionId: session.id,
        amountTotal: session.amount_total,
        currency: session.currency,
        customerEmail: session.customer_details?.email,
        customerName: session.customer_details?.name,
      }).catch(err => console.error("[Stripe Webhook] Failed to send admin upgrade alert:", err));
    }
  }

  if (event.type === "customer.subscription.deleted") {
    const sub = event.data.object as Stripe.Subscription;
    const existingSub = await prisma.subscription.findFirst({ where: { stripeSubscriptionId: sub.id } });
    if (existingSub) {
      await prisma.user.update({ where: { id: existingSub.userId }, data: { tier: "FREE" } });
      await prisma.subscription.update({ where: { id: existingSub.id }, data: { status: "canceled", plan: "FREE" } });
      await reconcileAcademyMembershipBonus(existingSub.userId);
    }

    // Pro Network membership cancellation
    const networkMember = await prisma.proNetworkMember.findFirst({
      where: { stripeSubscriptionId: sub.id },
      include: { network: true },
    });
    if (networkMember) {
      await prisma.proNetworkMember.update({
        where: { id: networkMember.id },
        data: { status: "CANCELED" },
      });
      await prisma.proNetwork.update({
        where: { id: networkMember.networkId },
        data: { memberCount: { decrement: 1 } },
      });
    }
  }

  if (event.type === "customer.subscription.updated") {
    const sub     = event.data.object as Stripe.Subscription;
    const priceId = sub.items.data[0]?.price.id;
    const t       = PRICE_TO_TIER[priceId] ?? "FREE";
    const existing = await prisma.subscription.findFirst({ where: { stripeSubscriptionId: sub.id } });
    if (existing) {
      await prisma.user.update({ where: { id: existing.userId }, data: { tier: t } });
      await prisma.subscription.update({ where: { id: existing.id }, data: { plan: t, status: sub.status } });
      await reconcileAcademyMembershipBonus(existing.userId);
    }
  }

  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error("[Stripe Webhook] Error processing event:", errorMsg, err);
    return NextResponse.json({ error: `Webhook handler error: ${errorMsg}` }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

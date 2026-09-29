import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Stripe from "stripe";
import { getTicketSalesStatus } from "@/lib/ticketedProTalks";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

type Params = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  try {
    const session = await auth.api.getSession({ headers: req.headers });
    if (!session?.user) {
      return NextResponse.json({ error: "Please sign in to get a ticket." }, { status: 401 });
    }

    const { id } = await params;
    const space = await prisma.space.findUnique({
      where: { id },
      include: {
        host: {
          select: {
            id: true,
            name: true,
            email: true,
            stripeAccountId: true,
            stripeOnboarded: true,
          },
        },
        network: {
          select: {
            id: true,
            name: true,
            members: {
              where: { userId: session.user.id },
              select: { userId: true, status: true },
            },
          },
        },
        tickets: {
          where: { userId: session.user.id, status: "CONFIRMED" },
          select: { id: true, ticketNumber: true },
        },
      },
    });

    if (!space) {
      return NextResponse.json({ error: "Pro Talk not found." }, { status: 404 });
    }

    const isTicketed =
      space.visibility === "TICKETED" ||
      space.accessType === "TICKETED" ||
      space.ticketPrice > 0;

    if (!isTicketed) {
      return NextResponse.json(
        { error: "This Pro Talk is free. You can RSVP and join directly." },
        { status: 400 }
      );
    }

    // Check if user is host or admin
    if (space.hostId === session.user.id || session.user.role === "ADMIN") {
      return NextResponse.json(
        { error: "You are the host/admin of this Pro Talk and already have full access." },
        { status: 400 }
      );
    }

    // Check if user already holds an active ticket
    if (space.tickets && space.tickets.length > 0) {
      return NextResponse.json(
        {
          error: "You already purchased a ticket for this Pro Talk.",
          ticketNumber: space.tickets[0].ticketNumber,
        },
        { status: 400 }
      );
    }

    // Check Network exclusivity
    if (space.isNetworkExclusive && space.networkId) {
      const isMember = space.network?.members?.some(
        (m) => m.userId === session.user.id && m.status === "ACTIVE"
      );
      if (!isMember) {
        return NextResponse.json(
          {
            error: `This Pro Talk is exclusive to members of the "${space.network?.name || "Pro Network"}". Please join the network first.`,
          },
          { status: 403 }
        );
      }
    }

    // Check ticket sales status & capacity
    const salesStatus = getTicketSalesStatus(space);
    if (!salesStatus.isOpen) {
      return NextResponse.json({ error: salesStatus.message }, { status: 400 });
    }

    const ticketPrice = space.ticketPrice || 0;
    const priceInCents = Math.round(ticketPrice * 100);

    if (priceInCents <= 0) {
      return NextResponse.json({ error: "Invalid ticket price." }, { status: 400 });
    }

    const baseUrl =
      process.env.NEXTAUTH_URL ||
      process.env.NEXT_PUBLIC_APP_URL ||
      req.nextUrl.origin ||
      "https://taxcomppro.com";

    // Setup Stripe Connect destination & platform fee (10% platform fee) if host has connected account
    let isChargesEnabled = false;
    if (space.host?.stripeAccountId && space.host.stripeOnboarded) {
      try {
        const acct = await stripe.accounts.retrieve(space.host.stripeAccountId);
        isChargesEnabled = acct.charges_enabled && acct.payouts_enabled;
      } catch {
        isChargesEnabled = false;
      }
    }

    const lineItems = [
      {
        price_data: {
          currency: "usd",
          unit_amount: priceInCents,
          product_data: {
            name: `Ticket: ${space.name}`,
            description: `Live Pro Talk admission hosted by ${space.host.name} on ${
              space.scheduledAt
                ? new Date(space.scheduledAt).toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                  })
                : "Tax Compliance Pro"
            }`,
            images: [`${baseUrl}/protalk.png`],
          },
        },
        quantity: 1,
      },
    ];

    const sessionParams: any = {
      payment_method_types: ["card"],
      line_items: lineItems,
      mode: "payment",
      customer_email: session.user.email || undefined,
      success_url: `${baseUrl}/pro-talks/${space.id}?ticket_purchased=1&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/pro-talks/${space.id}?ticket_cancelled=1`,
      metadata: {
        type: "space_ticket",
        spaceId: space.id,
        userId: session.user.id,
        customerEmail: session.user.email || "",
        customerName: session.user.name || "Member",
        ticketPrice: String(ticketPrice),
        hostId: space.hostId,
      },
    };

    if (space.host?.stripeAccountId && isChargesEnabled) {
      const platformFee = Math.round(priceInCents * 0.1); // 10% platform fee
      sessionParams.payment_intent_data = {
        application_fee_amount: platformFee,
        transfer_data: {
          destination: space.host.stripeAccountId,
        },
      };
    }

    const checkoutSession = await stripe.checkout.sessions.create(sessionParams);

    return NextResponse.json({ url: checkoutSession.url, sessionId: checkoutSession.id });
  } catch (err) {
    console.error("[Ticket Checkout] Error creating checkout session:", err);
    return NextResponse.json(
      { error: "Could not initiate ticket checkout. Please try again." },
      { status: 500 }
    );
  }
}

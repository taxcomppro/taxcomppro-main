import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Stripe from "stripe";
import { generateTicketNumber } from "@/lib/ticketedProTalks";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

type Params = { params: Promise<{ id: string }> };

// POST /api/spaces/[id]/confirm-ticket — Confirm Stripe checkout session and activate ticket immediately
export async function POST(req: NextRequest, { params }: Params) {
  try {
    const session = await auth.api.getSession({ headers: req.headers });
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const { sessionId } = body;

    if (!sessionId) {
      return NextResponse.json({ error: "Session ID is required." }, { status: 400 });
    }

    const space = await prisma.space.findUnique({
      where: { id },
      include: { host: { select: { id: true, name: true, email: true } } },
    });

    if (!space) {
      return NextResponse.json({ error: "Pro Talk not found." }, { status: 404 });
    }

    // Check if ticket already confirmed for this session
    const existingTicket = await prisma.spaceTicket.findUnique({
      where: { stripeSessionId: sessionId },
    });

    if (existingTicket) {
      return NextResponse.json({
        ok: true,
        alreadyConfirmed: true,
        ticket: existingTicket,
      });
    }

    // Verify checkout session with Stripe
    const stripeSession = await stripe.checkout.sessions.retrieve(sessionId);

    if (
      stripeSession.payment_status !== "paid" ||
      stripeSession.metadata?.type !== "space_ticket" ||
      stripeSession.metadata?.spaceId !== id
    ) {
      return NextResponse.json(
        { error: "Payment not confirmed or session mismatch." },
        { status: 400 }
      );
    }

    const customerEmail =
      stripeSession.customer_details?.email ||
      stripeSession.metadata?.customerEmail ||
      session.user.email ||
      "";
    const customerName =
      stripeSession.customer_details?.name ||
      stripeSession.metadata?.customerName ||
      session.user.name ||
      "Member";

    const pricePaid = (stripeSession.amount_total ?? 0) / 100;
    const ticketNumber = generateTicketNumber();

    const newTicket = await prisma.spaceTicket.create({
      data: {
        spaceId: id,
        userId: session.user.id,
        ticketNumber,
        pricePaid,
        stripeSessionId: sessionId,
        stripePaymentIntentId:
          typeof stripeSession.payment_intent === "string"
            ? stripeSession.payment_intent
            : stripeSession.payment_intent?.id || null,
        paymentStatus: "PAID",
        status: "CONFIRMED",
        customerName,
        customerEmail,
      },
    });

    // Increment tickets sold and auto-rsvp
    await Promise.allSettled([
      prisma.space.update({
        where: { id },
        data: { ticketsSold: { increment: 1 } },
      }),
      prisma.spaceRsvp.upsert({
        where: { spaceId_userId: { spaceId: id, userId: session.user.id } },
        create: {
          spaceId: id,
          userId: session.user.id,
          name: customerName,
          email: customerEmail,
        },
        update: {},
      }),
      prisma.notification.create({
        data: {
          userId: session.user.id,
          type: "SYSTEM",
          title: "🎟️ Pro Talk Ticket Confirmed!",
          message: `Your ticket (${ticketNumber}) for "${space.name}" is confirmed. You're all set to join the stage.`,
          link: `/pro-talks/${space.id}`,
        },
      }),
      prisma.notification.create({
        data: {
          userId: space.hostId,
          type: "SYSTEM",
          title: "💰 Pro Talk Ticket Sold!",
          message: `${customerName} purchased a ticket ($${pricePaid.toFixed(2)}) for your Pro Talk "${space.name}".`,
          link: `/pro-talks/${space.id}`,
        },
      }),
    ]);

    return NextResponse.json({
      ok: true,
      ticket: newTicket,
    });
  } catch (err) {
    console.error("[Confirm Ticket] Error:", err);
    return NextResponse.json(
      { error: "Could not confirm ticket. Please contact support if payment completed." },
      { status: 500 }
    );
  }
}

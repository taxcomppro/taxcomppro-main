import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

type Params = { params: Promise<{ id: string; ticketId: string }> };

// POST /api/spaces/[id]/tickets/[ticketId]/refund — Refund attendee ticket
export async function POST(req: NextRequest, { params }: Params) {
  try {
    const session = await auth.api.getSession({ headers: req.headers });
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id, ticketId } = await params;
    const space = await prisma.space.findUnique({
      where: { id },
      select: { id: true, name: true, hostId: true },
    });

    if (!space) {
      return NextResponse.json({ error: "Pro Talk not found." }, { status: 404 });
    }

    const isHost = space.hostId === session.user.id;
    const isAdmin = session.user.role === "ADMIN";
    if (!isHost && !isAdmin) {
      return NextResponse.json(
        { error: "Only the host or admin can process refunds." },
        { status: 403 }
      );
    }

    const ticket = await prisma.spaceTicket.findUnique({
      where: { id: ticketId },
      include: { user: { select: { id: true, name: true, email: true } } },
    });

    if (!ticket || ticket.spaceId !== id) {
      return NextResponse.json({ error: "Ticket not found." }, { status: 404 });
    }

    if (ticket.status === "REFUNDED") {
      return NextResponse.json({ error: "This ticket has already been refunded." }, { status: 400 });
    }

    const body = await req.json().catch(() => ({}));
    const reason = body.reason || "Refund requested by host";

    // Attempt Stripe refund if Stripe session or payment intent exists
    if (ticket.stripePaymentIntentId || ticket.stripeSessionId) {
      try {
        if (ticket.stripePaymentIntentId) {
          await stripe.refunds.create({
            payment_intent: ticket.stripePaymentIntentId,
            reason: "requested_by_customer",
          });
        } else if (ticket.stripeSessionId) {
          const stripeSession = await stripe.checkout.sessions.retrieve(ticket.stripeSessionId);
          if (stripeSession.payment_intent) {
            await stripe.refunds.create({
              payment_intent: typeof stripeSession.payment_intent === "string"
                ? stripeSession.payment_intent
                : stripeSession.payment_intent.id,
            });
          }
        }
      } catch (stripeErr) {
        console.warn("[Refund] Stripe refund call failed or skipped:", stripeErr);
      }
    }

    // Mark ticket refunded in database
    const updatedTicket = await prisma.spaceTicket.update({
      where: { id: ticketId },
      data: {
        status: "REFUNDED",
        paymentStatus: "REFUNDED",
        refundedAt: new Date(),
        refundReason: reason,
      },
    });

    // Decrement ticketsSold on Space
    await prisma.space.update({
      where: { id },
      data: {
        ticketsSold: { decrement: 1 },
      },
    });

    // Notify Attendee
    await prisma.notification.create({
      data: {
        userId: ticket.userId,
        type: "SYSTEM",
        title: "💳 Pro Talk Ticket Refunded",
        message: `Your ticket (${ticket.ticketNumber}) for "${space.name}" has been refunded ($${ticket.pricePaid.toFixed(2)}).`,
        link: `/pro-talks/${space.id}`,
      },
    }).catch(() => {});

    return NextResponse.json({
      ok: true,
      message: "Ticket refunded successfully.",
      ticket: updatedTicket,
    });
  } catch (err) {
    console.error("[Refund Ticket] Error:", err);
    return NextResponse.json(
      { error: "Failed to refund ticket. Please try again." },
      { status: 500 }
    );
  }
}

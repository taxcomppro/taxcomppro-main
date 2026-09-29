import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

type Params = { params: Promise<{ id: string }> };

// POST /api/spaces/[id]/confirm-capacity — Confirm Stripe capacity pack checkout
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
      select: { id: true, name: true, hostId: true, ticketCapacity: true },
    });

    if (!space) {
      return NextResponse.json({ error: "Pro Talk not found." }, { status: 404 });
    }

    // Check if already confirmed
    const existingOrder = await prisma.spaceCapacityOrder.findUnique({
      where: { stripeSessionId: sessionId },
    });

    if (existingOrder) {
      return NextResponse.json({
        ok: true,
        alreadyConfirmed: true,
        capacity: space.ticketCapacity,
      });
    }

    // Verify with Stripe
    const stripeSession = await stripe.checkout.sessions.retrieve(sessionId);

    if (
      stripeSession.payment_status !== "paid" ||
      stripeSession.metadata?.type !== "space_capacity_pack" ||
      stripeSession.metadata?.spaceId !== id
    ) {
      return NextResponse.json(
        { error: "Payment not verified or session mismatch." },
        { status: 400 }
      );
    }

    const additionalSeats = Number(stripeSession.metadata?.additionalSeats || 25);
    const packKey = stripeSession.metadata?.packKey || "PACK_25";
    const pricePaid = (stripeSession.amount_total ?? 0) / 100;

    await prisma.$transaction([
      prisma.spaceCapacityOrder.create({
        data: {
          spaceId: id,
          hostId: session.user.id,
          packKey,
          additionalSeats,
          pricePaid,
          stripeSessionId: sessionId,
          status: "COMPLETED",
        },
      }),
      prisma.space.update({
        where: { id },
        data: {
          ticketCapacity: { increment: additionalSeats },
          bonusTicketCapacity: { increment: additionalSeats },
        },
      }),
      prisma.notification.create({
        data: {
          userId: session.user.id,
          type: "SYSTEM",
          title: "🚀 Pro Talk Ticket Capacity Boosted!",
          message: `+${additionalSeats} ticket capacity successfully added to "${space.name}". Total capacity is now ${
            space.ticketCapacity + additionalSeats
          } tickets.`,
          link: `/pro-talks/${space.id}`,
        },
      }),
    ]);

    return NextResponse.json({
      ok: true,
      addedCapacity: additionalSeats,
      newTotalCapacity: space.ticketCapacity + additionalSeats,
    });
  } catch (err) {
    console.error("[Confirm Capacity] Error:", err);
    return NextResponse.json(
      { error: "Could not confirm capacity boost. Please contact support." },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Stripe from "stripe";
import { TICKET_CAPACITY_PACKS } from "@/lib/ticketedProTalks";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

type Params = { params: Promise<{ id: string }> };

// POST /api/spaces/[id]/capacity-checkout — Host purchases capacity boost pack (+25, +50, +100, +250, +500)
export async function POST(req: NextRequest, { params }: Params) {
  try {
    const session = await auth.api.getSession({ headers: req.headers });
    if (!session?.user) {
      return NextResponse.json({ error: "Please sign in to manage capacity." }, { status: 401 });
    }

    const { id } = await params;
    const space = await prisma.space.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        hostId: true,
        ticketCapacity: true,
        ticketsSold: true,
      },
    });

    if (!space) {
      return NextResponse.json({ error: "Pro Talk not found." }, { status: 404 });
    }

    const isHost = space.hostId === session.user.id;
    const isAdmin = session.user.role === "ADMIN";
    if (!isHost && !isAdmin) {
      return NextResponse.json(
        { error: "Only the host of this Pro Talk can purchase capacity add-ons." },
        { status: 403 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const { packKey } = body;

    const pack = TICKET_CAPACITY_PACKS.find((p) => p.key === packKey);
    if (!pack) {
      return NextResponse.json(
        { error: "Invalid capacity pack selected." },
        { status: 400 }
      );
    }

    const priceInCents = Math.round(pack.price * 100);

    const baseUrl =
      process.env.NEXTAUTH_URL ||
      process.env.NEXT_PUBLIC_APP_URL ||
      req.nextUrl.origin ||
      "https://taxcomppro.com";

    const checkoutSession = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "usd",
            unit_amount: priceInCents,
            product_data: {
              name: `Pro Talk Ticket Capacity Boost: ${pack.label}`,
              description: `Adds ${pack.tickets} ticket capacity to "${space.name}". Total capacity will increase to ${
                space.ticketCapacity + pack.tickets
              } tickets.`,
              images: [`${baseUrl}/protalk.png`],
            },
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      customer_email: session.user.email || undefined,
      success_url: `${baseUrl}/pro-talks/${space.id}?capacity_added=1&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/pro-talks/${space.id}?tab=tickets`,
      metadata: {
        type: "space_capacity_pack",
        spaceId: space.id,
        hostId: session.user.id,
        packKey: pack.key,
        additionalSeats: String(pack.tickets),
        pricePaid: String(pack.price),
      },
    });

    return NextResponse.json({ url: checkoutSession.url, sessionId: checkoutSession.id });
  } catch (err) {
    console.error("[Capacity Checkout] Error creating checkout session:", err);
    return NextResponse.json(
      { error: "Could not initiate capacity checkout. Please try again." },
      { status: 500 }
    );
  }
}

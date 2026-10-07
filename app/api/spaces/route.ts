import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { nanoid } from "nanoid";
import { BASE_TICKET_ALLOWANCE, isTicketedSpace } from "@/lib/ticketedProTalks";

const HOST_SELECT = {
  id: true,
  name: true,
  image: true,
  headline: true,
  role: true,
  tier: true,
};

// GET /api/spaces — list live, upcoming, following, popular, ticketed, and replay spaces
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const category = searchParams.get("category");
    const search = searchParams.get("search")?.trim().toLowerCase();
    const tab = searchParams.get("tab"); // "live" | "upcoming" | "following" | "popular" | "replays" | "my-tickets" | "my-talks" | "all"
    const networkId = searchParams.get("networkId");

    const session = await auth.api.getSession({ headers: req.headers }).catch(() => null);
    const userId = session?.user?.id;

    // Collect invite cookies: pro-talk-invite-[spaceId]
    const inviteCookies = req.cookies
      .getAll()
      .filter((c) => c.name.startsWith("pro-talk-invite-"))
      .map((c) => ({
        id: c.name.replace("pro-talk-invite-", ""),
        token: c.value,
      }))
      .filter((c) => !!c.id && !!c.token);

    const publicOnly = searchParams.get("publicOnly") === "true";

    const andConditions: Prisma.SpaceWhereInput[] = [];

    if (networkId) {
      andConditions.push({ networkId });
    }

    if (tab === "my-tickets" || tab === "tickets") {
      if (!userId) return NextResponse.json([]);
      andConditions.push({
        tickets: {
          some: {
            userId,
            status: "CONFIRMED",
          },
        },
      });
    } else if (tab === "my-talks" || tab === "hosted") {
      if (!userId) return NextResponse.json([]);
      andConditions.push({ OR: [{ hostId: userId }, { coHostIds: { has: userId } }] });
    } else if (publicOnly) {
      andConditions.push({
        OR: [{ visibility: "PUBLIC" }, { visibility: "TICKETED" }, { accessType: "PAID" }, { accessType: "TICKETED" }],
      });
    } else {
      // Visibility conditions: Public & Ticketed events are listed; Private requires invite/rsvp/attendance/host
      const visibilityOrConditions: Prisma.SpaceWhereInput[] = [
        { visibility: "PUBLIC" },
        { visibility: "TICKETED" },
        { accessType: "PAID" },
        { accessType: "TICKETED" },
        { ticketPrice: { gt: 0 } },
      ];

      if (userId) {
        if (session?.user?.role === "ADMIN") {
          visibilityOrConditions.push({ visibility: "PRIVATE" }, { accessType: "PRIVATE" });
        } else {
          visibilityOrConditions.push(
            { hostId: userId },
            { coHostIds: { has: userId } },
            { rsvps: { some: { userId } } },
            { attendances: { some: { userId } } },
            { tickets: { some: { userId } } }
          );
        }
      }

      for (const ic of inviteCookies) {
        visibilityOrConditions.push({
          id: ic.id,
          shareToken: ic.token,
        });
      }

      andConditions.push({ OR: visibilityOrConditions });
    }

    // Category filter
    if (category && category !== "all") {
      andConditions.push({ category: { equals: category, mode: "insensitive" } });
    }

    // Keyword search filter (matches title, description, or host name)
    if (search) {
      andConditions.push({
        OR: [
          { name: { contains: search, mode: "insensitive" } },
          { description: { contains: search, mode: "insensitive" } },
          { category: { contains: search, mode: "insensitive" } },
          { host: { name: { contains: search, mode: "insensitive" } } },
        ],
      });
    }

    // Filter by tab type
    if (tab === "live") {
      andConditions.push({ isLive: true });
    } else if (tab === "upcoming") {
      andConditions.push({
        isLive: false,
        endedAt: null,
        scheduledAt: { gt: new Date() },
      });
    } else if (tab === "replays") {
      andConditions.push({
        OR: [
          { isReplay: true },
          { replayUrl: { not: null } },
          { endedAt: { not: null } },
        ],
      });
    } else if (tab === "following") {
      if (userId) {
        const connections = await prisma.connection.findMany({
          where: {
            status: "ACCEPTED",
            OR: [{ requesterId: userId }, { receiverId: userId }],
          },
          select: { requesterId: true, receiverId: true },
        });

        const followedHostIds = connections.map((c) =>
          c.requesterId === userId ? c.receiverId : c.requesterId
        );

        andConditions.push({
          hostId: { in: followedHostIds },
          OR: [
            { isLive: true },
            { isLive: false, endedAt: null, scheduledAt: { gt: new Date() } },
          ],
        });
      } else {
        return NextResponse.json([]);
      }
    } else if (tab === "ticketed") {
      andConditions.push({
        OR: [
          { visibility: "TICKETED" },
          { accessType: "PAID" },
          { accessType: "TICKETED" },
          { ticketPrice: { gt: 0 } },
        ],
        endedAt: null,
      });
    } else if (!tab || tab === "all" || tab === "popular") {
      andConditions.push({
        OR: [
          { isLive: true },
          { isLive: false, endedAt: null, scheduledAt: { gt: new Date() } },
        ],
      });
    }

    const whereConditions: Prisma.SpaceWhereInput = {
      AND: andConditions,
    };

    // Determine order
    let orderBy: Prisma.SpaceOrderByWithRelationInput[] = [
      { isLive: "desc" },
      { scheduledAt: "asc" },
      { createdAt: "desc" },
    ];

    if (tab === "popular") {
      orderBy = [
        { totalAttendees: "desc" },
        { rsvps: { _count: "desc" } },
        { isLive: "desc" },
      ];
    }

    const spaces = await prisma.space.findMany({
      where: whereConditions,
      orderBy,
      include: {
        host: { select: HOST_SELECT },
        network: { select: { id: true, name: true, slug: true, logoImage: true } },
        _count: { select: { rsvps: true, attendances: true, tickets: true } },
      },
    });

    let registeredIds = new Set<string>();
    let joinedIds = new Set<string>();
    let ticketMap = new Map<string, { id: string; ticketNumber: string; status: string; pricePaid: number }>();

    if (userId) {
      const [registrations, attendances, tickets] = await Promise.all([
        prisma.spaceRsvp.findMany({
          where: { userId, spaceId: { in: spaces.map((s) => s.id) } },
          select: { spaceId: true },
        }),
        prisma.spaceAttendance.findMany({
          where: { userId, spaceId: { in: spaces.map((s) => s.id) } },
          select: { spaceId: true },
        }),
        prisma.spaceTicket.findMany({
          where: {
            userId,
            spaceId: { in: spaces.map((s) => s.id) },
            status: "CONFIRMED",
          },
          select: {
            id: true,
            spaceId: true,
            ticketNumber: true,
            status: true,
            pricePaid: true,
          },
        }),
      ]);
      registeredIds = new Set(registrations.map((item) => item.spaceId));
      joinedIds = new Set(attendances.map((item) => item.spaceId));
      tickets.forEach((t) => ticketMap.set(t.spaceId, t));
    }

    return NextResponse.json(
      spaces.map((space) => {
        const userTicket = ticketMap.get(space.id);
        const isPaid = isTicketedSpace(space);
        const capacity = space.ticketCapacity || BASE_TICKET_ALLOWANCE;
        const sold = space.ticketsSold || 0;
        const remaining = Math.max(0, capacity - sold);

        return {
          ...space,
          accessType: isPaid
            ? "PAID"
            : space.visibility === "PRIVATE" || space.accessType === "PRIVATE"
            ? "PRIVATE"
            : "FREE",
          isTicketed: isPaid,
          ticketsRemaining: remaining,
          isRsvped: registeredIds.has(space.id),
          hasJoined: joinedIds.has(space.id),
          hasTicket: !!userTicket,
          ticketNumber: userTicket?.ticketNumber || null,
          userTicket: userTicket || null,
        };
      })
    );
  } catch (error) {
    console.error("Error fetching spaces:", error);
    return NextResponse.json({ error: "Failed to fetch Pro Talks" }, { status: 500 });
  }
}

// POST /api/spaces — create a new space (Free, Private, or Ticketed)
export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const dbUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true, tier: true, stripeAccountId: true, stripeOnboarded: true },
  });
  const canHost = dbUser?.role === "ADMIN" || dbUser?.tier === "MARKETPLACE_PLUS";

  const body = await req.json();
  const {
    name,
    description,
    category,
    mediaType,
    hostSessionId,
    scheduledAt,
    coHostIds,
    visibility = "PUBLIC",
    accessType = "PUBLIC",
    ticketPrice = 0,
    ticketCapacity = BASE_TICKET_ALLOWANCE,
    salesStartsAt,
    salesEndsAt,
    refundPolicy = "NO_REFUNDS",
    refundUntil,
    whatIsIncluded = [],
    networkId,
    isNetworkExclusive = false,
  } = body;

  let hostVerified = canHost;
  if (!hostVerified && hostSessionId) {
    try {
      const Stripe = (await import("stripe")).default;
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
      const stripeSession = await stripe.checkout.sessions.retrieve(hostSessionId);
      if (
        stripeSession.payment_status === "paid" &&
        stripeSession.metadata?.userId === session.user.id &&
        stripeSession.metadata?.type === "pro_talk_host"
      ) {
        hostVerified = true;
      }
    } catch {
      /* ignore */
    }
  }

  if (!hostVerified) {
    return NextResponse.json(
      { error: "Only Marketplace Plus members or Admin can host a Pro Talk." },
      { status: 403 }
    );
  }

  if (!name?.trim()) {
    return NextResponse.json({ error: "Title is required" }, { status: 400 });
  }

  const numPrice = Number(ticketPrice) || 0;
  const isPaid =
    accessType === "PAID" ||
    accessType === "TICKETED" ||
    visibility === "TICKETED" ||
    numPrice > 0;

  const effectiveVisibility = isPaid
    ? "TICKETED"
    : visibility === "PRIVATE" || accessType === "PRIVATE"
    ? "PRIVATE"
    : "PUBLIC";

  const effectiveAccessType = isPaid
    ? "PAID"
    : effectiveVisibility === "PRIVATE"
    ? "PRIVATE"
    : "FREE";

  if (isPaid && numPrice <= 0) {
    return NextResponse.json(
      { error: "Ticket price must be greater than $0 for a ticketed Pro Talk." },
      { status: 400 }
    );
  }

  const numCapacity = Math.max(1, Number(ticketCapacity) || BASE_TICKET_ALLOWANCE);

  // Parse dates
  let scheduledDate: Date | null = null;
  if (scheduledAt) {
    const parsed = new Date(scheduledAt);
    if (!isNaN(parsed.getTime()) && parsed > new Date()) {
      scheduledDate = parsed;
    }
  }

  let salesStart: Date | null = null;
  if (salesStartsAt) {
    const parsed = new Date(salesStartsAt);
    if (!isNaN(parsed.getTime())) salesStart = parsed;
  }

  let salesEnd: Date | null = null;
  if (salesEndsAt) {
    const parsed = new Date(salesEndsAt);
    if (!isNaN(parsed.getTime())) salesEnd = parsed;
  } else if (scheduledDate) {
    // Default sales end time to the talk's start time
    salesEnd = scheduledDate;
  }

  let refundDate: Date | null = null;
  if (refundPolicy === "REFUND_UNTIL_DATE" && refundUntil) {
    const parsed = new Date(refundUntil);
    if (!isNaN(parsed.getTime())) refundDate = parsed;
  }

  const inclusions = Array.isArray(whatIsIncluded)
    ? whatIsIncluded.filter((item: unknown) => typeof item === "string" && item.trim().length > 0)
    : [];

  const roomName = `space-${nanoid(10)}`;
  const shareToken = nanoid(32);

  const space = await prisma.space.create({
    data: {
      name: name.trim(),
      description: description?.trim() ?? null,
      category: category?.trim() || "Open Discussion",
      mediaType: mediaType === "AUDIO" ? "AUDIO" : "AUDIO_VIDEO",
      hostId: session.user.id,
      coHostIds: Array.isArray(coHostIds) ? coHostIds : [],
      roomName,
      shareToken,
      visibility: effectiveVisibility,
      accessType: effectiveAccessType,
      ticketPrice: isPaid ? numPrice : 0,
      ticketCapacity: numCapacity,
      baseTicketAllowance: BASE_TICKET_ALLOWANCE,
      bonusTicketCapacity: 0,
      ticketsSold: 0,
      salesStartsAt: salesStart,
      salesEndsAt: salesEnd,
      refundPolicy: isPaid ? refundPolicy : "NO_REFUNDS",
      refundUntil: refundDate,
      whatIsIncluded: inclusions,
      networkId: networkId?.trim() || null,
      isNetworkExclusive: Boolean(networkId && isNetworkExclusive),
      isLive: scheduledDate ? false : true,
      scheduledAt: scheduledDate,
    },
    include: {
      host: { select: HOST_SELECT },
      network: { select: { id: true, name: true, slug: true, logoImage: true } },
      _count: { select: { rsvps: true, attendances: true, tickets: true } },
    },
  });

  return NextResponse.json(
    {
      ...space,
      accessType: isPaid ? "PAID" : space.visibility === "PRIVATE" ? "PRIVATE" : "FREE",
      isTicketed: isPaid,
      ticketsRemaining: numCapacity,
    },
    { status: 201 }
  );
}

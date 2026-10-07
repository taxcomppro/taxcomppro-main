import { NextRequest, NextResponse } from "next/server";
import { canAccessSpace } from "@/lib/spaceAccess";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { nanoid } from "nanoid";
import { RoomServiceClient } from "livekit-server-sdk";
import { isTicketedSpace } from "@/lib/ticketedProTalks";

type Params = { params: Promise<{ id: string }> };

const HOST_SELECT = {
  id: true,
  name: true,
  image: true,
  headline: true,
  role: true,
  tier: true,
};

export async function GET(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const session = await auth.api.getSession({ headers: req.headers }).catch(() => null);
  const userId = session?.user?.id;

  const space = await prisma.space.findUnique({
    where: { id },
    include: {
      host: { select: HOST_SELECT },
      network: {
        select: {
          id: true,
          name: true,
          slug: true,
          logoImage: true,
          members: {
            where: userId ? { userId } : { userId: "__none__" },
            select: { userId: true, status: true, role: true },
          },
        },
      },
      _count: { select: { rsvps: true, attendances: true, tickets: true } },
      ...(userId
        ? {
            attendances: { where: { userId }, select: { userId: true } },
            rsvps: { where: { userId }, select: { userId: true } },
            tickets: {
              where: { userId, status: "CONFIRMED" },
              select: {
                id: true,
                ticketNumber: true,
                pricePaid: true,
                status: true,
                createdAt: true,
                paymentStatus: true,
              },
            },
          }
        : {}),
    },
  });

  if (!space) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const isTicketed = isTicketedSpace(space);
  const hasAccess = canAccessSpace(req, space as any, session?.user);
  const userTicket = (space as any).tickets?.[0] || null;
  const capacity = space.ticketCapacity || 25;
  const sold = space.ticketsSold || 0;
  const remaining = Math.max(0, capacity - sold);

  return NextResponse.json({
    ...space,
    accessType: isTicketed
      ? "PAID"
      : space.visibility === "PRIVATE" || space.accessType === "PRIVATE"
      ? "PRIVATE"
      : "FREE",
    hasAccess,
    isTicketed,
    ticketsRemaining: remaining,
    hasTicket: !!userTicket,
    ticketNumber: userTicket?.ticketNumber || null,
    userTicket,
    isRsvped: Array.isArray((space as any).rsvps) && (space as any).rsvps.length > 0,
  });
}

// PATCH /api/spaces/[id] — host starts a scheduled space or updates settings
export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const space = await prisma.space.findUnique({ where: { id } });
  if (!space) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const isAdmin = session.user.role === "ADMIN";
  const isHost = space.hostId === session.user.id;
  if (!isAdmin && !isHost)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const dataToUpdate: Record<string, unknown> = {};

  if (typeof body.name === "string" && body.name.trim()) {
    dataToUpdate.name = body.name.trim();
  }
  if (body.description !== undefined) {
    dataToUpdate.description = typeof body.description === "string" ? body.description.trim() || null : null;
  }
  if (typeof body.category === "string" && body.category.trim()) {
    dataToUpdate.category = body.category.trim();
  }
  if (body.mediaType === "AUDIO" || body.mediaType === "AUDIO_VIDEO") {
    dataToUpdate.mediaType = body.mediaType;
  }
  if (body.scheduledAt !== undefined) {
    if (body.scheduledAt === null || body.scheduledAt === "") {
      dataToUpdate.scheduledAt = null;
    } else {
      const parsed = new Date(body.scheduledAt as string);
      if (!isNaN(parsed.getTime())) {
        dataToUpdate.scheduledAt = parsed;
      }
    }
  }

  if (body.visibility !== undefined || body.accessType !== undefined) {
    const rawVis = (body.visibility || body.accessType) as string;
    const isPaid = rawVis === "PAID" || rawVis === "TICKETED";
    if (!isPaid && !["PUBLIC", "PRIVATE", "FREE"].includes(rawVis)) {
      return NextResponse.json({ error: "Invalid visibility" }, { status: 400 });
    }
    dataToUpdate.visibility = isPaid ? "TICKETED" : (rawVis === "PRIVATE" ? "PRIVATE" : "PUBLIC");
    dataToUpdate.accessType = isPaid ? "PAID" : (rawVis === "PRIVATE" ? "PRIVATE" : "FREE");
    if (rawVis === "PRIVATE" && space.visibility !== "PRIVATE") {
      dataToUpdate.shareToken = nanoid(32);
    }
  }

  if (body.ticketPrice !== undefined) {
    const numPrice = Number(body.ticketPrice);
    if (!isNaN(numPrice) && numPrice >= 0) {
      dataToUpdate.ticketPrice = numPrice;
    }
  }

  if (body.ticketCapacity !== undefined) {
    const numCap = Number(body.ticketCapacity);
    if (!isNaN(numCap) && numCap >= 1) {
      dataToUpdate.ticketCapacity = numCap;
    }
  }

  if (body.salesStartsAt !== undefined) {
    dataToUpdate.salesStartsAt = body.salesStartsAt ? new Date(body.salesStartsAt as string) : null;
  }

  if (body.salesEndsAt !== undefined) {
    dataToUpdate.salesEndsAt = body.salesEndsAt ? new Date(body.salesEndsAt as string) : null;
  }

  if (typeof body.salesClosedEarly === "boolean") {
    dataToUpdate.salesClosedEarly = body.salesClosedEarly;
  }

  if (typeof body.refundPolicy === "string") {
    dataToUpdate.refundPolicy = body.refundPolicy;
  }

  if (body.refundUntil !== undefined) {
    dataToUpdate.refundUntil = body.refundUntil ? new Date(body.refundUntil as string) : null;
  }

  if (Array.isArray(body.whatIsIncluded)) {
    dataToUpdate.whatIsIncluded = body.whatIsIncluded.filter(
      (item: unknown) => typeof item === "string" && item.trim().length > 0
    );
  }

  if (body.networkId !== undefined) {
    dataToUpdate.networkId = typeof body.networkId === "string" && body.networkId.trim() ? body.networkId.trim() : null;
  }

  if (typeof body.isNetworkExclusive === "boolean") {
    dataToUpdate.isNetworkExclusive = body.isNetworkExclusive;
  }

  if (typeof body.isLive === "boolean") {
    dataToUpdate.isLive = body.isLive;
    if (body.isLive) {
      dataToUpdate.endedAt = null;
    }
  }

  const updated = await prisma.space.update({
    where: { id },
    data: dataToUpdate,
    include: {
      host: { select: HOST_SELECT },
      network: { select: { id: true, name: true, slug: true, logoImage: true } },
      _count: { select: { rsvps: true, attendances: true, tickets: true } },
    },
  });

  return NextResponse.json(updated);
}

// DELETE /api/spaces/[id] — host ends or cancels the space
export async function DELETE(req: NextRequest, { params }: Params) {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { searchParams } = new URL(req.url);
  const action = searchParams.get("action"); // "cancel" or default "end"

  const space = await prisma.space.findUnique({ where: { id } });
  if (!space) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const isAdmin = session.user.role === "ADMIN";
  const isHost = space.hostId === session.user.id;
  if (!isAdmin && !isHost)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  // If cancelling a scheduled talk that has not gone live
  if (action === "cancel" && !space.isLive && !space.endedAt) {
    await prisma.space.delete({ where: { id } });
    return NextResponse.json({ success: true, message: "Talk cancelled and removed" });
  }

  // Persist the report before disconnecting clients; repeat end requests retain the original end time.
  const updated = await prisma.$transaction(async (tx) => {
    await tx.space.updateMany({ where: { id, endedAt: null }, data: { isLive: false, endedAt: new Date() } });
    const ended = await tx.space.findUniqueOrThrow({ where: { id }, include: {
      host: { select: HOST_SELECT },
      network: { select: { id: true, name: true, slug: true, logoImage: true } },
    } });
    await tx.spaceAttendance.updateMany({ where: { spaceId: id, leftAt: null }, data: { leftAt: ended.endedAt } });
    return ended;
  });

  // End LiveKit room if active
  const apiKey = process.env.LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET;
  const wsUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL;

  if (apiKey && apiSecret && wsUrl) {
    try {
      const httpUrl = wsUrl.replace(/^ws/, "http");
      const roomService = new RoomServiceClient(httpUrl, apiKey, apiSecret);
      await roomService.deleteRoom(space.roomName);
    } catch {
      // Room may already be closed in LiveKit
    }
  }


  return NextResponse.json(updated);
}

import { NextRequest, NextResponse } from "next/server";
import { proTalkPublishPermissions } from "@/lib/proTalkPermissions";
import { canAccessSpace } from "@/lib/spaceAccess";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AccessToken } from "livekit-server-sdk";

type Params = { params: Promise<{ id: string }> };

// POST /api/spaces/[id]/token — generate LiveKit join token with ticket & access verification
export async function POST(req: NextRequest, { params }: Params) {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const space = await prisma.space.findUnique({
    where: { id },
    include: {
      network: {
        select: {
          id: true,
          members: {
            where: { userId: session.user.id },
            select: { userId: true, status: true },
          },
        },
      },
      attendances: { where: { userId: session.user.id }, select: { userId: true } },
      rsvps: { where: { userId: session.user.id }, select: { userId: true } },
      tickets: {
        where: { userId: session.user.id, status: "CONFIRMED" },
        select: { userId: true, status: true, ticketNumber: true },
      },
    },
  });

  if (!space || !space.isLive)
    return NextResponse.json({ error: "Space not found or ended" }, { status: 404 });

  if (!canAccessSpace(req, space as any, session.user)) {
    const isTicketed =
      space.visibility === "TICKETED" ||
      space.accessType === "TICKETED" ||
      space.ticketPrice > 0;
    return NextResponse.json(
      {
        error: isTicketed
          ? "A purchased ticket is required to enter this Pro Talk."
          : "Invitation required to join this private Pro Talk.",
      },
      { status: 403 }
    );
  }

  const apiKey = process.env.LIVEKIT_API_KEY!;
  const apiSecret = process.env.LIVEKIT_API_SECRET!;
  const isHost = session.user.id === space.hostId;
  const isAdmin = session.user.role === "ADMIN";
  const isCoHost = Array.isArray(space.coHostIds) && space.coHostIds.includes(session.user.id);
  const ticketNumber = (space as any).tickets?.[0]?.ticketNumber || null;

  const token = new AccessToken(apiKey, apiSecret, {
    identity: session.user.id,
    name: session.user.name ?? session.user.id,
    metadata: JSON.stringify({
      image: session.user.image ?? null,
      isHost,
      isAdmin,
      isCoHost,
      ticketNumber,
      role: isHost ? "HOST" : isCoHost ? "CO_HOST" : "ATTENDEE",
      tier: (session.user as { tier?: string }).tier ?? "FREE",
    }),
  });

  token.addGrant({
    roomJoin: true,
    room: space.roomName,
    ...proTalkPublishPermissions(isHost || isCoHost),
    canUpdateOwnMetadata: false,
    canPublishData: true,
    canSubscribe: true,
    roomAdmin: isHost || isAdmin,
  });

  const jwt = await token.toJwt();
  return NextResponse.json({ token: jwt, roomName: space.roomName, ticketNumber });
}

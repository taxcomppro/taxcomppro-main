import { NextRequest, NextResponse } from "next/server";
import { proTalkPublishPermissions } from "@/lib/proTalkPermissions";
import { canAccessSpace } from "@/lib/spaceAccess";
import { prisma } from "@/lib/prisma";
import { AccessToken } from "livekit-server-sdk";

type Params = { params: Promise<{ id: string }> };

// POST /api/spaces/[id]/guest-token — generate a LiveKit join token for guests (free/public talks only)
export async function POST(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const space = await prisma.space.findUnique({ where: { id } });
  if (!space || !space.isLive)
    return NextResponse.json({ error: "This Pro Talk has ended or does not exist." }, { status: 404 });

  const isTicketed =
    space.visibility === "TICKETED" ||
    space.accessType === "TICKETED" ||
    space.ticketPrice > 0;

  if (isTicketed) {
    return NextResponse.json(
      { error: "This is a Ticketed Pro Talk. Please sign in to purchase or access your ticket." },
      { status: 403 }
    );
  }

  if (!canAccessSpace(req, space)) return NextResponse.json({ error: "Invitation required" }, { status: 403 });

  const { displayName } = await req.json();
  const name = (typeof displayName === "string" && displayName.trim())
    ? displayName.trim().slice(0, 40)
    : "Guest";

  const apiKey    = process.env.LIVEKIT_API_KEY!;
  const apiSecret = process.env.LIVEKIT_API_SECRET!;

  const identity = `guest-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

  const token = new AccessToken(apiKey, apiSecret, {
    identity,
    name,
    metadata: JSON.stringify({ image: null, isGuest: true, role: "ATTENDEE" }),
  });

  token.addGrant({
    roomJoin:       true,
    room:           space.roomName,
    ...proTalkPublishPermissions(false),
    canUpdateOwnMetadata: false,
    canPublishData: true,
    canSubscribe:   true,
    roomAdmin:      false,
  });

  const jwt = await token.toJwt();
  return NextResponse.json({ token: jwt, roomName: space.roomName, identity });
}

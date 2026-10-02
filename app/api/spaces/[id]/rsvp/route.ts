import { NextRequest, NextResponse } from "next/server";
import { canAccessSpace } from "@/lib/spaceAccess";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ id: string }> };

// GET /api/spaces/[id]/rsvp — host/admin only: list all RSVPs
export async function GET(req: NextRequest, { params }: Params) {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const space = await prisma.space.findUnique({ where: { id } });
  if (!space) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const isAdmin = session.user.role === "ADMIN";
  const isHost  = space.hostId === session.user.id;
  if (!isAdmin && !isHost)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const rsvps = await prisma.spaceRsvp.findMany({
    where: { spaceId: id },
    orderBy: { createdAt: "asc" },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          image: true,
          headline: true,
          phone: true,
          email: true,
          role: true,
          tier: true,
          isBrandAmbassador: true,
        },
      },
    },
  });

  return NextResponse.json(rsvps);
}

// POST /api/spaces/[id]/rsvp — add RSVP (self or admin manual RSVP)
export async function POST(req: NextRequest, { params }: Params) {
  const session = await auth.api.getSession({ headers: req.headers });
  const { id } = await params;
  const body = await req.json().catch(() => ({}));

  // Check for admin manual RSVP
  if (body?.targetUserId || body?.userId) {
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Forbidden: Only site admins can manually RSVP members" },
        { status: 403 }
      );
    }

    const targetUserId = (body.targetUserId || body.userId) as string;
    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserId },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        headline: true,
        phone: true,
        role: true,
        tier: true,
        isBrandAmbassador: true,
      },
    });

    if (!targetUser) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    const rsvp = await prisma.spaceRsvp.upsert({
      where: { spaceId_userId: { spaceId: id, userId: targetUser.id } },
      create: {
        spaceId: id,
        userId: targetUser.id,
        name: targetUser.name || "Member",
        email: targetUser.email || null,
      },
      update: {
        name: targetUser.name || "Member",
        email: targetUser.email || null,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            image: true,
            headline: true,
            phone: true,
            email: true,
            role: true,
            tier: true,
            isBrandAmbassador: true,
          },
        },
      },
    });

    return NextResponse.json(rsvp, { status: 201 });
  }

  // Self or Guest RSVP
  const space = await prisma.space.findUnique({
    where: { id },
    include: {
      ...(session?.user?.id
        ? {
            attendances: { where: { userId: session.user.id }, select: { userId: true } },
            rsvps: { where: { userId: session.user.id }, select: { userId: true } },
          }
        : {}),
    },
  });
  if (!space) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (!canAccessSpace(req, space, session?.user)) {
    return NextResponse.json({ error: "Invitation required" }, { status: 403 });
  }

  if (session) {
    // Authenticated user: upsert by userId
    const dbUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { name: true, email: true },
    });

    const rsvp = await prisma.spaceRsvp.upsert({
      where: { spaceId_userId: { spaceId: id, userId: session.user.id } },
      create: {
        spaceId: id,
        userId: session.user.id,
        name: dbUser?.name ?? session.user.name ?? "Member",
        email: session.user.email ?? null,
      },
      update: {}, // already RSVPed — no-op
      include: {
        user: {
          select: {
            id: true,
            name: true,
            image: true,
            headline: true,
            phone: true,
            email: true,
            role: true,
            tier: true,
            isBrandAmbassador: true,
          },
        },
      },
    });
    return NextResponse.json(rsvp, { status: 201 });
  } else {
    // Guest RSVP — require name; email optional
    const { name, email } = body as { name?: string; email?: string };
    if (!name?.trim()) return NextResponse.json({ error: "Name required" }, { status: 400 });

    const rsvp = await prisma.spaceRsvp.create({
      data: {
        spaceId: id,
        userId: null,
        name: name.trim(),
        email: email?.trim() ?? null,
      },
    });
    return NextResponse.json(rsvp, { status: 201 });
  }
}

// DELETE /api/spaces/[id]/rsvp — remove RSVP
export async function DELETE(req: NextRequest, { params }: Params) {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { searchParams } = new URL(req.url);
  const targetUserId = searchParams.get("targetUserId") || searchParams.get("userId");
  const rsvpId = searchParams.get("rsvpId");

  if (targetUserId || rsvpId) {
    const space = await prisma.space.findUnique({ where: { id }, select: { hostId: true } });
    const isHost = space?.hostId === session.user.id;
    const isAdmin = session.user.role === "ADMIN";

    if (!isAdmin && !isHost) {
      return NextResponse.json({ error: "Forbidden: Admin or Host required" }, { status: 403 });
    }

    if (rsvpId) {
      await prisma.spaceRsvp.deleteMany({
        where: { id: rsvpId, spaceId: id },
      });
    } else if (targetUserId) {
      await prisma.spaceRsvp.deleteMany({
        where: { spaceId: id, userId: targetUserId },
      });
    }
    return NextResponse.json({ ok: true });
  }

  // Self remove
  await prisma.spaceRsvp.deleteMany({
    where: { spaceId: id, userId: session.user.id },
  });

  return NextResponse.json({ ok: true });
}

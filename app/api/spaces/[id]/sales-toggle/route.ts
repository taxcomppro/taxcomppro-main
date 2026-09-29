import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ id: string }> };

// POST /api/spaces/[id]/sales-toggle — Host or Admin closes early or re-opens ticket sales
export async function POST(req: NextRequest, { params }: Params) {
  try {
    const session = await auth.api.getSession({ headers: req.headers });
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const space = await prisma.space.findUnique({
      where: { id },
      select: { id: true, hostId: true, salesClosedEarly: true },
    });

    if (!space) {
      return NextResponse.json({ error: "Pro Talk not found." }, { status: 404 });
    }

    const isHost = space.hostId === session.user.id;
    const isAdmin = session.user.role === "ADMIN";
    if (!isHost && !isAdmin) {
      return NextResponse.json(
        { error: "Only the host or admin can toggle ticket sales." },
        { status: 403 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const newClosedState =
      typeof body.closed === "boolean" ? body.closed : !space.salesClosedEarly;

    const updated = await prisma.space.update({
      where: { id },
      data: { salesClosedEarly: newClosedState },
      select: { id: true, salesClosedEarly: true },
    });

    return NextResponse.json({
      ok: true,
      salesClosedEarly: updated.salesClosedEarly,
      message: updated.salesClosedEarly
        ? "Ticket sales have been closed early."
        : "Ticket sales are now open.",
    });
  } catch (err) {
    console.error("[Sales Toggle] Error:", err);
    return NextResponse.json(
      { error: "Failed to update ticket sales status." },
      { status: 500 }
    );
  }
}

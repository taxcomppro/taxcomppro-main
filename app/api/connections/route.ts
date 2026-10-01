import { sendCommunityNotificationEmail } from "@/lib/community-email";
import { after, NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET: list my connections + pending received requests + sent requests
export async function GET(req: NextRequest) {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = session.user.id;

  const [connections, received, sent] = await Promise.all([
    // Accepted connections
    prisma.connection.findMany({
      where: { OR: [{ requesterId: userId }, { receiverId: userId }], status: "ACCEPTED" },
      include: {
        requester: { select: { id: true, profileSlug: true, name: true, image: true, headline: true, professionalTitle: true, location: true, role: true, isBrandAmbassador: true } },
        receiver:  { select: { id: true, profileSlug: true, name: true, image: true, headline: true, professionalTitle: true, location: true, role: true, isBrandAmbassador: true } },
      },
      orderBy: { updatedAt: "desc" },
    }),
    // Pending requests I received
    prisma.connection.findMany({
      where: { receiverId: userId, status: "PENDING" },
      include: { requester: { select: { id: true, profileSlug: true, name: true, image: true, headline: true, professionalTitle: true, location: true, role: true, isBrandAmbassador: true } } },
      orderBy: { createdAt: "desc" },
    }),
    // Requests I sent
    prisma.connection.findMany({
      where: { requesterId: userId, status: "PENDING" },
      include: { receiver: { select: { id: true, profileSlug: true, name: true, image: true, headline: true, professionalTitle: true, location: true, role: true, isBrandAmbassador: true } } },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return NextResponse.json({ connections, received, sent });
}

// POST: send connection request
export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { receiverId } = await req.json();
  if (!receiverId || receiverId === session.user.id) {
    return NextResponse.json({ error: "Invalid receiver" }, { status: 400 });
  }

  if (await prisma.aiSpecialist.findUnique({where:{userId:receiverId}})) return NextResponse.json({error:"Ask this AI specialist through their profile instead of sending a connection request."},{status:400});

  // Check for existing connection in either direction
  const existing = await prisma.connection.findFirst({
    where: {
      OR: [
        { requesterId: session.user.id, receiverId },
        { requesterId: receiverId, receiverId: session.user.id },
      ],
    },
  });
  if (existing) return NextResponse.json({ error: "Connection already exists", existing }, { status: 409 });

  const connection = await prisma.connection.create({
    data: { requesterId: session.user.id, receiverId, status: "PENDING" },
  });

  // Notify receiver
  await prisma.notification.create({
    data: {
      userId:  receiverId,
      type:    "CONNECTION_REQUEST",
      title:   "New Connection Request",
      message: `${session.user.name} wants to connect with you`,
      link:    "/connections",
    },
  }).catch(() => {});

  after(() => sendCommunityNotificationEmail({ kind: "CONNECTION_REQUEST", recipientId: receiverId, senderId: session.user.id, eventId: connection.id }));

  return NextResponse.json(connection, { status: 201 });
}

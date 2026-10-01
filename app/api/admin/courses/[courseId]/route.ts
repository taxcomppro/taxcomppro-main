import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { headers } from "next/headers";

async function requireAdmin() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return null;
  const dbUser = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!dbUser) return null;
  const canManage = dbUser.role === "ADMIN" || dbUser.tier === "MARKETPLACE" || dbUser.tier === "MARKETPLACE_PLUS";
  if (!canManage) return null;
  return dbUser;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ courseId: string }> }
) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { courseId } = await params;
  const course = await prisma.course.findUnique({
    where: { id: courseId },
    include: {
      sections: {
        orderBy: { order: "asc" },
        include: { lessons: { orderBy: { order: "asc" } } },
      },
      _count: { select: { enrollments: true } },
    },
  });

  if (!course) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(course);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ courseId: string }> }
) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { courseId } = await params;
  const body = await req.json();
  const isAdmin = admin.role === "ADMIN";

  // Non-admins cannot set status to PUBLISHED directly (must go through marketplace admin approval)
  const nextStatus = body.status !== undefined
    ? (isAdmin ? body.status : (body.status === "PUBLISHED" ? undefined : body.status))
    : undefined;

  const isFree = body.isFree !== undefined ? body.isFree : (body.price !== undefined ? Number(body.price) <= 0 : undefined);
  const price = isFree !== undefined && isFree ? 0 : (body.price !== undefined ? Number(body.price) : undefined);

  const course = await prisma.course.update({
    where: { id: courseId },
    data: {
      ...(body.title            !== undefined ? { title:            body.title }              : {}),
      ...(body.slug             !== undefined ? { slug:             body.slug }               : {}),
      ...(body.description      !== undefined ? { description:      body.description }        : {}),
      ...(body.thumbnail        !== undefined ? { thumbnail:        body.thumbnail || null }  : {}),
      ...(body.level            !== undefined ? { level:            body.level }              : {}),
      ...(price                 !== undefined ? { price }                                     : {}),
      ...(isFree                !== undefined ? { isFree }                                    : {}),
      ...(body.category         !== undefined ? { category:         body.category }           : {}),
      ...(body.tags             !== undefined ? { tags:             body.tags }               : {}),
      ...(nextStatus            !== undefined ? { status:           nextStatus }              : {}),
      ...(body.isSequential     !== undefined ? { isSequential:     body.isSequential }       : {}),
      ...(body.learningOutcomes !== undefined ? { learningOutcomes: body.learningOutcomes }   : {}),
      ...(body.requirements     !== undefined ? { requirements:     body.requirements }       : {}),
    },
  });

  // Sync updates to MarketplaceListing if exists
  try {
    await prisma.marketplaceListing.updateMany({
      where: {
        OR: [
          { slug: course.slug },
          { metadata: { path: ["courseId"], equals: course.id } },
        ],
      },
      data: {
        ...(body.title       !== undefined ? { title:       body.title }             : {}),
        ...(body.description !== undefined ? { description: body.description }       : {}),
        ...(price            !== undefined ? { price }                                : {}),
        ...(body.thumbnail   !== undefined ? { images: body.thumbnail ? [body.thumbnail] : [] } : {}),
        ...(body.tags        !== undefined ? { tags:        body.tags }              : {}),
      },
    });
  } catch (syncErr) {
    console.error("Failed to sync listing updates:", syncErr);
  }

  return NextResponse.json(course);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ courseId: string }> }
) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { courseId } = await params;
  await prisma.course.delete({ where: { id: courseId } });
  return NextResponse.json({ success: true });
}

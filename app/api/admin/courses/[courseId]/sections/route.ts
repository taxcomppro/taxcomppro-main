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

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ courseId: string }> }
) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { courseId } = await params;
  const { title, order } = await req.json();

  if (!title?.trim()) return NextResponse.json({ error: "Title required" }, { status: 400 });

  const lastSection = await prisma.courseSection.findFirst({
    where: { courseId },
    orderBy: { order: "desc" },
  });

  const section = await prisma.courseSection.create({
    data: {
      title: title.trim(),
      order: order ?? (lastSection ? lastSection.order + 1 : 0),
      courseId,
    },
    include: { lessons: true },
  });

  return NextResponse.json(section, { status: 201 });
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ courseId: string }> }
) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { courseId } = await params;
  const sections = await prisma.courseSection.findMany({
    where: { courseId },
    orderBy: { order: "asc" },
    include: { lessons: { orderBy: { order: "asc" } } },
  });

  return NextResponse.json(sections);
}

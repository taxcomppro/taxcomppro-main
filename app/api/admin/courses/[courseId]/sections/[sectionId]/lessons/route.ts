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
  { params }: { params: Promise<{ courseId: string; sectionId: string }> }
) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { sectionId } = await params;
  const { title, description, contentType, videoUrl, textContent, downloadUrl, downloadName, duration, order, isFree } = await req.json();

  if (!title?.trim()) return NextResponse.json({ error: "Title required" }, { status: 400 });

  const lastLesson = await prisma.lesson.findFirst({
    where: { sectionId },
    orderBy: { order: "desc" },
  });

  const lesson = await prisma.lesson.create({
    data: {
      title:        title.trim(),
      description:  description?.trim()   || null,
      contentType:  contentType           ?? "VIDEO",
      videoUrl:     videoUrl?.trim()      || null,
      textContent:  textContent?.trim()   || null,
      downloadUrl:  downloadUrl?.trim()   || null,
      downloadName: downloadName?.trim()  || null,
      duration:     duration              ?? 0,
      order:        order                 ?? (lastLesson ? lastLesson.order + 1 : 0),
      isFree:       isFree                ?? false,
      sectionId,
    },
  });

  return NextResponse.json(lesson, { status: 201 });
}

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

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ lessonId: string }> }
) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { lessonId } = await params;
  const body = await req.json();

  const lesson = await prisma.lesson.update({
    where: { id: lessonId },
    data: {
      ...(body.title       !== undefined ? { title:        body.title }                   : {}),
      ...(body.description !== undefined ? { description:  body.description || null }     : {}),
      ...(body.contentType !== undefined ? { contentType:  body.contentType }             : {}),
      ...(body.videoUrl    !== undefined ? { videoUrl:     body.videoUrl || null }        : {}),
      ...(body.textContent !== undefined ? { textContent:  body.textContent || null }     : {}),
      ...(body.downloadUrl !== undefined ? { downloadUrl:  body.downloadUrl || null }     : {}),
      ...(body.downloadName !== undefined ? { downloadName: body.downloadName || null }   : {}),
      ...(body.duration    !== undefined ? { duration:     body.duration }                : {}),
      ...(body.order       !== undefined ? { order:        body.order }                   : {}),
      ...(body.isFree      !== undefined ? { isFree:       body.isFree }                  : {}),
    },
  });

  return NextResponse.json(lesson);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ lessonId: string }> }
) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { lessonId } = await params;
  await prisma.lesson.delete({ where: { id: lessonId } });
  return NextResponse.json({ success: true });
}

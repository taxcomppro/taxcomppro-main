import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function courseAccess(headers: Headers, refs: { courseId?: string; sectionId?: string; lessonId?: string }) {
  const session = await auth.api.getSession({ headers });
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user || (user.role !== "ADMIN" && !["MARKETPLACE", "MARKETPLACE_PLUS"].includes(user.tier))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const owner = user.role === "ADMIN" ? {} : { instructorId: user.id };
  if (refs.lessonId) {
    const lesson = await prisma.lesson.findFirst({ where: { id: refs.lessonId, ...(refs.sectionId ? { sectionId: refs.sectionId } : {}), section: { ...(refs.courseId ? { courseId: refs.courseId } : {}), course: owner } }, select: { id: true } });
    return lesson ? null : NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (refs.sectionId) {
    const section = await prisma.courseSection.findFirst({ where: { id: refs.sectionId, ...(refs.courseId ? { courseId: refs.courseId } : {}), course: owner }, select: { id: true } });
    return section ? null : NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (!refs.courseId) return NextResponse.json({ error: "Course is required" }, { status: 400 });
  const course = await prisma.course.findFirst({ where: { id: refs.courseId, ...owner }, select: { id: true } });
  return course ? null : NextResponse.json({ error: "Not found" }, { status: 404 });
}

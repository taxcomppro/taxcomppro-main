import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { lessonId } = await req.json();
  if (!lessonId) return NextResponse.json({ error: "lessonId required" }, { status: 400 });

  const course = await prisma.course.findUnique({
    where: { slug },
    include: {
      sections: { include: { lessons: { select: { id: true } } } },
    },
  });
  if (!course) return NextResponse.json({ error: "Course not found" }, { status: 404 });

  if (!course.sections.some(section => section.lessons.some(lesson => lesson.id === lessonId))) {
    return NextResponse.json({ error: "Lesson not found in this course" }, { status: 404 });
  }

  let enrollment = await prisma.enrollment.findUnique({
    where: { userId_courseId: { userId: session.user.id, courseId: course.id } },
    include: { progress: { select: { lessonId: true } } },
  });

  if (!enrollment) {
    const dbUser = await prisma.user.findUnique({ where: { id: session.user.id } });
    if (session.user.id === course.instructorId || dbUser?.role === "ADMIN") {
      enrollment = await prisma.enrollment.create({
        data: { userId: session.user.id, courseId: course.id },
        include: { progress: { select: { lessonId: true } } },
      });
    } else {
      return NextResponse.json({ error: "Not enrolled" }, { status: 403 });
    }
  }

  // Upsert progress (idempotent)
  await prisma.lessonProgress.upsert({
    where: { enrollmentId_lessonId: { enrollmentId: enrollment.id, lessonId } },
    create: { enrollmentId: enrollment.id, lessonId },
    update: {},
  });

  // Check for course completion
  const allLessonIds = course.sections.flatMap((s) => s.lessons.map((l) => l.id));
  const completedIds = new Set([...enrollment.progress.map((p) => p.lessonId), lessonId]);
  const isCompleted  = allLessonIds.every((id) => completedIds.has(id));

  if (isCompleted && !enrollment.completedAt) {
    await prisma.enrollment.update({
      where: { id: enrollment.id },
      data:  { completedAt: new Date() },
    });
  }

  const progressPercent = allLessonIds.length > 0
    ? Math.round((completedIds.size / allLessonIds.length) * 100)
    : 0;

  return NextResponse.json({ success: true, progressPercent, courseCompleted: isCompleted });
}

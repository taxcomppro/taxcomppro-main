import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { headers } from "next/headers";

// POST /api/courses/[slug]/quiz-attempt — submit quiz answers
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { lessonId, answers } = await req.json();
  if (!lessonId || !Array.isArray(answers)) {
    return NextResponse.json({ error: "lessonId and answers required" }, { status: 400 });
  }

  // Verify enrollment
  const course = await prisma.course.findUnique({ where: { slug } });
  if (!course) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const enrollment = await prisma.enrollment.findUnique({
    where: { userId_courseId: { userId: session.user.id, courseId: course.id } },
  });
  if (!enrollment) return NextResponse.json({ error: "Not enrolled" }, { status: 403 });

  const lesson = await prisma.lesson.findFirst({ where: { id: lessonId, section: { courseId: course.id } }, select: { id: true } });
  if (!lesson) return NextResponse.json({ error: "Lesson not found in this course" }, { status: 404 });

  // Get quiz
  const quiz = await prisma.quiz.findUnique({
    where: { lessonId },
    include: { questions: { orderBy: { order: "asc" } } },
  });
  if (!quiz) return NextResponse.json({ error: "Quiz not found" }, { status: 404 });

  // Score the attempt
  let correct = 0;
  quiz.questions.forEach((q, i) => {
    if (answers[i] === q.correctAnswer) correct++;
  });
  const score  = quiz.questions.length > 0 ? Math.round((correct / quiz.questions.length) * 100) : 0;
  const passed = score >= quiz.passMark;

  // Save attempt
  const attempt = await prisma.quizAttempt.create({
    data: {
      userId:  session.user.id,
      quizId:  quiz.id,
      score,
      passed,
      answers,
    },
  });

  // If passed, mark lesson as complete
  if (passed) {
    await prisma.lessonProgress.upsert({
      where:  { enrollmentId_lessonId: { enrollmentId: enrollment.id, lessonId } },
      create: { enrollmentId: enrollment.id, lessonId },
      update: {},
    });
  }

  return NextResponse.json({
    score,
    passed,
    passMark: quiz.passMark,
    correct,
    total:   quiz.questions.length,
    results: quiz.questions.map((q, i) => ({
      question:      q.question,
      yourAnswer:    answers[i],
      correctAnswer: q.correctAnswer,
      correct:       answers[i] === q.correctAnswer,
      explanation:   q.explanation,
    })),
  });
}

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

// POST /api/admin/courses/[courseId]/sections/[sectionId]/lessons/[lessonId]/quiz
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ lessonId: string }> }
) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { lessonId } = await params;
  const { title, passMark, questions } = await req.json();

  // Upsert quiz
  const quiz = await prisma.quiz.upsert({
    where: { lessonId },
    update: { title, passMark: passMark ?? 70 },
    create: { lessonId, title, passMark: passMark ?? 70 },
  });

  // Replace questions
  if (Array.isArray(questions) && questions.length > 0) {
    await prisma.quizQuestion.deleteMany({ where: { quizId: quiz.id } });
    await prisma.quizQuestion.createMany({
      data: questions.map((q: { question: string; options: string[]; correctAnswer: number; explanation?: string }, i: number) => ({
        quizId:        quiz.id,
        question:      q.question,
        options:       q.options,
        correctAnswer: q.correctAnswer,
        explanation:   q.explanation ?? null,
        order:         i,
      })),
    });
  }

  const full = await prisma.quiz.findUnique({
    where: { id: quiz.id },
    include: { questions: { orderBy: { order: "asc" } } },
  });

  return NextResponse.json(full, { status: 201 });
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ lessonId: string }> }
) {
  const { lessonId } = await params;
  const quiz = await prisma.quiz.findUnique({
    where: { lessonId },
    include: { questions: { orderBy: { order: "asc" } } },
  });
  if (!quiz) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(quiz);
}

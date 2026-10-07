import { safeRichText } from "@/lib/safe-rich-text";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const session = await auth.api.getSession({ headers: req.headers });

  const course = await prisma.course.findUnique({
    where: { slug },
    include: {
      instructor: { select: { id: true, name: true, image: true, headline: true, role: true } },
      sections: {
        orderBy: { order: "asc" },
        include: {
          lessons: {
            orderBy: { order: "asc" },
            include: {
              quiz: {
                include: { questions: { orderBy: { order: "asc" } } },
              },
            },
          },
        },
      },
      _count: { select: { enrollments: true } },
    },
  });

  if (!course) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const dbUser = session?.user ? await prisma.user.findUnique({ where: { id: session.user.id } }) : null;

  if (course.status !== "PUBLISHED") {
    const canViewUnpublished = dbUser && (dbUser.role === "ADMIN" || dbUser.id === course.instructorId);
    if (!canViewUnpublished) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
  }

  let isEnrolled = false;
  let completedLessonIds: string[] = [];

  if (session?.user) {
    const isOwnerOrAdmin = session.user.id === course.instructorId || dbUser?.role === "ADMIN";
    if (isOwnerOrAdmin) {
      isEnrolled = true;
    }

    const enrollment = await prisma.enrollment.findUnique({
      where: { userId_courseId: { userId: session.user.id, courseId: course.id } },
      include: { progress: { select: { lessonId: true } } },
    });

    if (enrollment) {
      isEnrolled = true;
      completedLessonIds = enrollment.progress.map((p) => p.lessonId);
    } else if (!isOwnerOrAdmin) {
      // Check if user purchased this course from marketplace listing
      const listingPurchase = await prisma.marketplacePurchase.findFirst({
        where: {
          userId: session.user.id,
          listing: {
            OR: [
              { slug: course.slug },
              { metadata: { path: ["courseId"], equals: course.id } },
            ],
          },
        },
      });
      if (listingPurchase) {
        isEnrolled = true;
        // Auto-create enrollment for future tracking
        await prisma.enrollment.create({
          data: { userId: session.user.id, courseId: course.id },
        }).catch(() => {});
      }
    }
  }

  const totalLessons = course.sections.reduce((sum, s) => sum + s.lessons.length, 0);

  // Ratings
  const ratings = await prisma.courseRating.findMany({
    where: { courseId: course.id },
    include: { user: { select: { name: true, image: true } } },
    orderBy: { createdAt: "desc" },
    take: 20,
  });
  const avgRating = ratings.length > 0
    ? Math.round((ratings.reduce((s, r) => s + r.rating, 0) / ratings.length) * 10) / 10
    : 0;
  const userRating = session?.user ? (ratings.find(r => r.userId === session.user.id) ?? null) : null;

  return NextResponse.json({
    ...course,
    sections: course.sections.map(section => ({ ...section, lessons: section.lessons.map(lesson => {
      const canRead = isEnrolled || lesson.isFree;
      return { ...lesson,
        videoUrl: canRead ? lesson.videoUrl : null,
        downloadUrl: canRead ? lesson.downloadUrl : null,
        textContent: canRead && lesson.textContent ? safeRichText(lesson.textContent) : null,
        quiz: canRead && lesson.quiz ? { ...lesson.quiz, questions: lesson.quiz.questions.map(question => ({
          id: question.id, question: question.question, options: question.options, order: question.order,
        })) } : null,
      };
    }) })),
    totalLessons,
    isEnrolled,
    completedLessonIds,
    progressPercent: totalLessons > 0 ? Math.round((completedLessonIds.length / totalLessons) * 100) : 0,
    ratings,
    avgRating,
    ratingCount: ratings.length,
    userRating,
  });
}

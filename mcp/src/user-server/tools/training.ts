import { prisma } from "../../common/db";
import { UserSessionContext, formatSuccess, formatError, McpToolResponse } from "../../common/types";

export const trainingToolDefinitions = [
  {
    name: "list_enrolled_courses",
    description: "List all courses the user is enrolled in, including progress %, completed lessons, and certificate status.",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "get_course_curriculum",
    description: "Get full course details, sections, and lessons hierarchy for an enrolled or available course.",
    inputSchema: {
      type: "object",
      properties: {
        courseIdOrSlug: { type: "string", description: "Course ID or URL slug" },
      },
      required: ["courseIdOrSlug"],
    },
  },
  {
    name: "get_lesson",
    description: "Get the content, text, video info, and resources for a specific lesson.",
    inputSchema: {
      type: "object",
      properties: {
        lessonId: { type: "string", description: "ID of the lesson" },
      },
      required: ["lessonId"],
    },
  },
  {
    name: "update_lesson_progress",
    description: "Mark a lesson as completed or update watch progress.",
    inputSchema: {
      type: "object",
      properties: {
        lessonId: { type: "string", description: "ID of the lesson" },
        completed: { type: "boolean", description: "Whether the lesson is completed" },
      },
      required: ["lessonId", "completed"],
    },
  },
  {
    name: "get_course_quiz",
    description: "Retrieve quiz questions for a lesson or course module.",
    inputSchema: {
      type: "object",
      properties: {
        lessonId: { type: "string", description: "Lesson ID containing the quiz" },
      },
      required: ["lessonId"],
    },
  },
  {
    name: "submit_quiz_attempt",
    description: "Submit answers for a quiz, calculate score, and record passing status.",
    inputSchema: {
      type: "object",
      properties: {
        quizId: { type: "string", description: "ID of the quiz" },
        answers: {
          type: "array",
          items: {
            type: "object",
            properties: {
              questionId: { type: "string" },
              selectedAnswerIndex: { type: "number", description: "0-indexed choice selected" },
            },
            required: ["questionId", "selectedAnswerIndex"],
          },
          description: "List of selected answers for each question",
        },
      },
      required: ["quizId", "answers"],
    },
  },
  {
    name: "list_my_certificates",
    description: "List all certificates earned by the user across TaxComPro courses and academy trainings.",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "verify_certificate",
    description: "Public verification of any TaxComPro certificate by certificate number.",
    inputSchema: {
      type: "object",
      properties: {
        certificateNumber: { type: "string", description: "Certificate number/code" },
      },
      required: ["certificateNumber"],
    },
  },
];

export async function handleTrainingTool(
  toolName: string,
  args: any,
  user: UserSessionContext
): Promise<McpToolResponse> {
  try {
    switch (toolName) {
      case "list_enrolled_courses": {
        const enrollments = await prisma.enrollment.findMany({
          where: { userId: user.userId },
          include: {
            course: {
              select: {
                id: true,
                title: true,
                slug: true,
                description: true,
                thumbnail: true,
                level: true,
                totalDuration: true,
                _count: {
                  select: { sections: true },
                },
              },
            },
            progress: true,
          },
          orderBy: { createdAt: "desc" },
        });

        const formatted = enrollments.map((enr) => ({
          enrollmentId: enr.id,
          enrolledAt: enr.createdAt,
          course: enr.course,
          completedLessonsCount: enr.progress.length,
          completedAt: enr.completedAt,
        }));

        return formatSuccess({
          totalEnrolled: enrollments.length,
          courses: formatted,
        });
      }

      case "get_course_curriculum": {
        const { courseIdOrSlug } = args;
        const course = await prisma.course.findFirst({
          where: {
            OR: [{ id: courseIdOrSlug }, { slug: courseIdOrSlug }],
          },
          include: {
            sections: {
              orderBy: { order: "asc" },
              include: {
                lessons: {
                  orderBy: { order: "asc" },
                  select: {
                    id: true,
                    title: true,
                    description: true,
                    contentType: true,
                    duration: true,
                    order: true,
                    isFree: true,
                  },
                },
              },
            },
          },
        });

        if (!course) return formatError(`Course not found: ${courseIdOrSlug}`);
        return formatSuccess(course);
      }

      case "get_lesson": {
        const { lessonId } = args;
        const lesson = await prisma.lesson.findUnique({
          where: { id: lessonId },
          include: {
            section: {
              select: {
                id: true,
                title: true,
                course: {
                  select: { id: true, title: true, slug: true },
                },
              },
            },
            quiz: {
              select: {
                id: true,
                title: true,
                passMark: true,
                _count: { select: { questions: true } },
              },
            },
          },
        });

        if (!lesson) return formatError(`Lesson not found: ${lessonId}`);

        // Check if user has completed it
        const progress = await prisma.lessonProgress.findFirst({
          where: {
            lessonId,
            enrollment: { userId: user.userId },
          },
        });

        return formatSuccess({
          ...lesson,
          userProgress: {
            completed: Boolean(progress),
            completedAt: progress?.completedAt ?? null,
          },
        });
      }

      case "update_lesson_progress": {
        const { lessonId, completed } = args;

        const lesson = await prisma.lesson.findUnique({
          where: { id: lessonId },
          include: { section: { select: { courseId: true } } },
        });

        if (!lesson) return formatError(`Lesson not found: ${lessonId}`);

        const courseId = lesson.section.courseId;

        // Ensure user is enrolled
        const enrollment = await prisma.enrollment.upsert({
          where: {
            userId_courseId: {
              userId: user.userId,
              courseId,
            },
          },
          update: {},
          create: {
            userId: user.userId,
            courseId,
          },
        });

        if (completed) {
          const progress = await prisma.lessonProgress.upsert({
            where: {
              enrollmentId_lessonId: {
                enrollmentId: enrollment.id,
                lessonId,
              },
            },
            update: { completedAt: new Date() },
            create: {
              enrollmentId: enrollment.id,
              lessonId,
              completedAt: new Date(),
            },
          });
          return formatSuccess(progress, "Lesson marked as completed");
        } else {
          await prisma.lessonProgress.deleteMany({
            where: {
              enrollmentId: enrollment.id,
              lessonId,
            },
          });
          return formatSuccess(null, "Lesson progress reset");
        }
      }

      case "get_course_quiz": {
        const { lessonId } = args;
        const quiz = await prisma.quiz.findUnique({
          where: { lessonId },
          include: {
            questions: {
              orderBy: { order: "asc" },
              select: {
                id: true,
                question: true,
                options: true,
              },
            },
          },
        });

        if (!quiz) return formatError(`No quiz found for lesson: ${lessonId}`);
        return formatSuccess(quiz);
      }

      case "submit_quiz_attempt": {
        const { quizId, answers } = args;
        const quiz = await prisma.quiz.findUnique({
          where: { id: quizId },
          include: { questions: true },
        });

        if (!quiz) return formatError(`Quiz not found: ${quizId}`);

        let correct = 0;
        const total = quiz.questions.length;
        const answerMap = new Map((answers as any[]).map((a) => [a.questionId, a.selectedAnswerIndex]));

        for (const q of quiz.questions) {
          if (answerMap.get(q.id) === q.correctAnswer) {
            correct++;
          }
        }

        const score = total > 0 ? Math.round((correct / total) * 100) : 0;
        const passed = score >= (quiz.passMark ?? 70);

        const attempt = await prisma.quizAttempt.create({
          data: {
            quizId,
            userId: user.userId,
            score,
            passed,
            answers: answers as any,
          },
        });

        return formatSuccess({
          attemptId: attempt.id,
          score,
          correctQuestions: correct,
          totalQuestions: total,
          passed,
          passMark: quiz.passMark ?? 70,
        });
      }

      case "list_my_certificates": {
        const trainingCerts = await prisma.trainingCertificate.findMany({
          where: {
            OR: [
              { invitation: { userId: user.userId } },
              { invitation: { eroId: user.userId } },
            ],
          },
          include: {
            invitation: {
              select: { name: true, email: true },
            },
          },
          orderBy: { issuedAt: "desc" },
        });

        return formatSuccess({
          certificates: trainingCerts,
        });
      }

      case "verify_certificate": {
        const { certificateNumber } = args;
        const cert = await prisma.trainingCertificate.findUnique({
          where: { certificateNumber },
          include: {
            invitation: {
              select: {
                name: true,
                email: true,
                license: {
                  select: { toolkitId: true, officeName: true },
                },
              },
            },
          },
        });

        if (cert) {
          return formatSuccess({
            valid: true,
            certificateNumber: cert.certificateNumber,
            recipient: cert.invitation.name,
            versionLabel: cert.versionLabel,
            toolkitId: cert.invitation.license.toolkitId,
            score: cert.score,
            issuedAt: cert.issuedAt,
            status: "VERIFIED_ACTIVE",
          });
        }

        const academyCert = await prisma.academyCertificate.findUnique({
          where: { certificateNumber },
          include: {
            assignment: {
              include: {
                profile: true,
                trainingVersion: true,
              },
            },
          },
        });

        if (academyCert) {
          return formatSuccess({
            valid: true,
            certificateNumber: academyCert.certificateNumber,
            recipient: academyCert.assignment.profile?.fullName || "Academy Trainee",
            trainingVersion: academyCert.assignment.trainingVersion.title,
            issuedAt: academyCert.issuedAt,
            status: academyCert.status,
          });
        }

        return formatError(`Certificate number "${certificateNumber}" is not valid or was not found.`);
      }

      default:
        return formatError(`Unknown training tool: ${toolName}`);
    }
  } catch (error: any) {
    return formatError(error.message || "Error executing training tool", error);
  }
}

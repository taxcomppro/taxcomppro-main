import { NextRequest, NextResponse } from "next/server";
import { isAdmin } from "@/lib/specialists/admin";
import { prisma } from "@/lib/prisma";
import {
  availableProviders,
  initializeSpecialists,
  generateActivity,
  publishActivity,
  runSchedule,
  testSpecialistPlayground,
} from "@/lib/specialists/service";
import { z } from "zod";
export const maxDuration = 120;
const safeUrl = z
  .string()
  .max(2000)
  .refine(
    (s) =>
      !s || (s.startsWith("/") && !s.startsWith("//")) || /^https:\/\//.test(s),
    "Use an HTTPS URL or local path",
  );
const config = z.object({
  id: z.string(),
  name: z.string().min(1).max(80),
  image: safeUrl,
  title: z.string().min(1).max(180),
  about: z.string().min(1).max(3000),
  expertise: z.array(z.string().max(120)).max(25),
  starters: z.array(z.string().max(300)).max(10),
  signature: z.string().max(300),
  courseNames: z.array(z.string().max(200)).max(15),
  personality: z.string().max(4000),
  boundaries: z.string().max(4000),
  provider: z.enum(["auto", "openai", "claude"]),
  model: z.string().max(100).default("auto"),
  temperature: z.number().min(0).max(1).default(0.7),
  postTone: z.string().max(50).default("authoritative"),
  postLength: z.string().max(50).default("standard"),
  postDays: z.array(z.string().max(20)).default([]),
  postTime: z.string().max(20).default("14:00"),
  timezone: z.string().max(50).default("UTC"),
  maxDailyReplies: z.number().int().min(0).max(200).default(20),
  customPrompt: z.string().max(10000).nullable().optional(),
  enabled: z.boolean(),
  autoPublish: z.boolean(),
  autoReply: z.boolean(),
  weeklyPosts: z.number().int().min(0).max(7),
  destination: z.enum(["FEED", "GROUP", "FORUM", "NETWORK"]),
  destinationId: z.string().nullable(),
  knowledge: z
    .array(
      z.object({
        id: z.string().optional(),
        title: z.string().max(200),
        category: z.string().max(100).optional(),
        text: z.string().max(20000),
        url: safeUrl.optional(),
        priority: z.number().int().min(1).max(6),
        approved: z.boolean(),
        reviewedAt: z.string().max(40).optional(),
      }),
    )
    .max(100),
});
export async function GET(req: NextRequest) {
  if (!(await isAdmin(req.headers)))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const [bots, activities, groups, forums, networks, courses] =
    await Promise.all([
      prisma.aiSpecialist.findMany({
        include: {
          user: { select: { name: true, image: true, profileSlug: true } },
        },
        orderBy: { id: "asc" },
      }),
      prisma.aiActivity.findMany({ orderBy: { createdAt: "desc" }, take: 80 }),
      prisma.community.findMany({ select: { id: true, name: true } }),
      prisma.forum.findMany({ select: { id: true, name: true } }),
      prisma.proNetwork.findMany({ select: { id: true, name: true } }),
      prisma.course.findMany({
        select: { id: true, title: true, instructorId: true },
      }),
    ]);
  return NextResponse.json({
    bots,
    activities,
    providers: availableProviders(),
    schedulerConfigured: !!process.env.CRON_SECRET,
    groups,
    forums,
    networks,
    courses,
  });
}
export async function POST(req: NextRequest) {
  if (!(await isAdmin(req.headers)))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  try {
    const body = await req.json();
    if (body.action === "initialize") {
      await initializeSpecialists();
      return NextResponse.json({ ok: true });
    }
    if (body.action === "publish")
      return NextResponse.json(await publishActivity(String(body.id)));
    if (body.action === "deletePublished" || body.action === "deleteActivity") {
      const activity = await prisma.aiActivity.findUnique({
        where: { id: String(body.id) },
      });
      if (activity?.publishedUrl) {
        const feedMatch = activity.publishedUrl.match(/[?&]post=([a-zA-Z0-9_-]+)/);
        if (feedMatch?.[1]) {
          await prisma.post.delete({ where: { id: feedMatch[1] } }).catch(() => null);
        }
      }
      if (body.action === "deleteActivity") {
        await prisma.aiActivity.delete({ where: { id: String(body.id) } });
      } else {
        await prisma.aiActivity.update({
          where: { id: String(body.id) },
          data: { status: "DISCARDED", publishedUrl: null },
        });
      }
      return NextResponse.json({ ok: true });
    }
    if (body.action === "discard") {
      const activity = await prisma.aiActivity.findUnique({
        where: { id: String(body.id) },
      });
      if (activity?.publishedUrl) {
        const feedMatch = activity.publishedUrl.match(/[?&]post=([a-zA-Z0-9_-]+)/);
        if (feedMatch?.[1]) {
          await prisma.post.delete({ where: { id: feedMatch[1] } }).catch(() => null);
        }
      }
      await prisma.aiActivity.updateMany({
        where: { id: String(body.id) },
        data: { status: "DISCARDED", publishedUrl: null },
      });
      return NextResponse.json({ ok: true });
    }
    if (body.action === "draft") {
      const bot = await prisma.aiSpecialist.findUniqueOrThrow({
        where: { id: String(body.id) },
      });
      return NextResponse.json(
        await generateActivity(
          { ...bot, autoPublish: false },
          `manual:${crypto.randomUUID()}`,
        ),
      );
    }
    if (body.action === "postNow") {
      const bot = await prisma.aiSpecialist.findUniqueOrThrow({
        where: { id: String(body.id) },
      });
      return NextResponse.json(
        await generateActivity(
          { ...bot, autoPublish: true },
          `instant:${crypto.randomUUID()}`,
        ),
      );
    }
    if (body.action === "manualPost") {
      const specialistId = String(body.specialistId || body.id);
      const content = z.string().min(1).max(12000).parse(body.content);
      const destination = z.enum(["FEED", "GROUP", "FORUM", "NETWORK"]).parse(body.destination || "FEED");
      const destinationId = body.destinationId ? String(body.destinationId) : null;
      const publishNow = Boolean(body.publishNow);
      const rawImages = Array.isArray(body.images) ? body.images : [];
      const images: string[] = rawImages.filter((img: any) => typeof img === "string" && (img.startsWith("http://") || img.startsWith("https://") || img.startsWith("/")));

      const bot = await prisma.aiSpecialist.findUniqueOrThrow({
        where: { id: specialistId },
        include: { user: true },
      });

      let fullContent = content;
      if (images.length > 0) {
        const missingImages = images.filter((img) => !fullContent.includes(img));
        if (missingImages.length > 0) {
          const imageMarkdown = missingImages.map((img) => `\n\n![Attachment](${img})`).join("");
          fullContent = `${fullContent}${imageMarkdown}`;
        }
      }

      const activity = await prisma.aiActivity.create({
        data: {
          specialistId: bot.id,
          key: `manual:${crypto.randomUUID()}`,
          kind: "POST",
          destination,
          destinationId,
          status: "DRAFT",
          content: fullContent,
          provider: "manual",
        },
      });

      if (publishNow) {
        const published = await publishActivity(activity.id);
        return NextResponse.json({ ok: true, activity: published, publishedUrl: published.publishedUrl });
      }

      return NextResponse.json({ ok: true, activity });
    }
    if (body.action === "runSchedule") {
      const results = await runSchedule();
      return NextResponse.json({ results });
    }
    if (body.action === "testPlayground") {
      const question = z.string().min(1).max(3000).parse(body.question);
      let bot: any = null;
      if (body.temporaryBot) {
        bot = body.temporaryBot;
      } else {
        bot = await prisma.aiSpecialist.findUniqueOrThrow({
          where: { id: String(body.id) },
        });
      }
      const answer = await testSpecialistPlayground(bot, question);
      return NextResponse.json({ answer });
    }
    if (body.action === "editDraft") {
      const content = z.string().min(1).max(12000).parse(body.content);
      const result = await prisma.aiActivity.updateMany({
        where: { id: String(body.id), status: { in: ["DRAFT", "FAILED"] } },
        data: { content, status: "DRAFT", error: null },
      });
      if (!result.count) throw new Error("Draft is no longer editable.");
      return NextResponse.json({ ok: true });
    }
    if (body.action === "assignCourse") {
      const bot = await prisma.aiSpecialist.findUniqueOrThrow({
        where: { id: String(body.id) },
      });
      await prisma.course.update({
        where: { id: String(body.courseId) },
        data: { instructorId: bot.userId },
      });
      return NextResponse.json({ ok: true });
    }
    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error && !error.message.includes("prisma")
            ? error.message
            : "Could not complete this action.",
      },
      { status: 400 },
    );
  }
}
export async function PATCH(req: NextRequest) {
  if (!(await isAdmin(req.headers)))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const parsed = config.safeParse(await req.json().catch(() => null));
  if (!parsed.success)
    return NextResponse.json(
      { error: parsed.error.issues[0].message },
      { status: 400 },
    );
  const { id, name, image, ...data } = parsed.data;
  if (data.destination !== "FEED") {
    const target =
      data.destination === "GROUP"
        ? await prisma.community.findUnique({
            where: { id: data.destinationId || "" },
          })
        : data.destination === "FORUM"
          ? await prisma.forum.findUnique({
              where: { id: data.destinationId || "" },
            })
          : await prisma.proNetwork.findUnique({
              where: { id: data.destinationId || "" },
            });
    if (!target)
      return NextResponse.json(
        { error: "Select an existing destination." },
        { status: 400 },
      );
  } else data.destinationId = null;
  const bot = await prisma.aiSpecialist.update({
    where: { id },
    data: {
      ...data,
      user: {
        update: {
          name,
          image,
          bio: data.about,
          headline: `Tax Comp Pro AI Specialist · ${data.title}`,
          professionalTitle: data.title,
          specialties: data.expertise,
        },
      },
    },
    include: {
      user: { select: { name: true, image: true, profileSlug: true } },
    },
  });
  return NextResponse.json(bot);
}

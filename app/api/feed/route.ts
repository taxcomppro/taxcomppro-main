import { replyToPost } from "@/lib/specialists/service";
import { detectSensitiveData, PRIVACY_REMINDER } from "@/lib/specialists/catalog";
import { NextRequest, NextResponse, after } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { reactionSummaries } from "@/lib/post-reactions";
import { canRepost, feedAuthorFilter, originalPostSelect } from "@/lib/feed-social";

// Auto-publish any due scheduled posts (runs on every GET — cheap, indexed query)
async function publishDuePosts() {
  await prisma.post.updateMany({
    where: { scheduledAt: { lte: new Date(), not: null } },
    data:  { scheduledAt: null },
  });
}

// Public GET — no auth required to browse the feed
export async function GET(req: NextRequest) {
  const session = await auth.api.getSession({ headers: req.headers });

  await publishDuePosts();

  const { searchParams } = new URL(req.url);
  const cursor = searchParams.get("cursor");
  const take = 10;
  const postId = searchParams.get("post");
  const filter = searchParams.get("filter") || "all";
  if (!["all", "connections", "following"].includes(filter)) return NextResponse.json({ error: "Invalid feed filter" }, { status: 400 });
  if (!postId && filter !== "all" && !session) return NextResponse.json({ error: "Sign in to see this feed." }, { status: 401 });

  const results = await prisma.post.findMany({
    where: { scheduledAt: null, ...(postId ? { id: postId } : session ? feedAuthorFilter(filter, session.user.id) : {}), OR: [
      { communityId: null },
      ...(session ? [{ community: { members: { some: { userId: session.user.id } } } }] : []),
      ...(postId ? [{ community: { isPublic: true } }] : []),
    ] },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: postId ? 1 : take + 1,
    ...(!postId && cursor ? { skip: 1, cursor: { id: cursor } } : {}),
    include: {
      originalPost: { select: originalPostSelect },
      author: { select: { id: true, aiSpecialist: { select: { id: true } }, profileSlug: true, name: true, image: true, headline: true, role: true, tier: true, isBrandAmbassador: true } },
      comments: {
        include: { author: { select: { id: true, aiSpecialist: { select: { id: true } }, profileSlug: true, name: true, image: true, isBrandAmbassador: true } } },
        orderBy: { createdAt: "asc" as const },
        take: 3,
      },
      community: { select: { name: true, slug: true, isPublic: true } },
      _count: { select: { likes: true, comments: true, reposts: true } },
      likes: session
        ? { where: { userId: session.user.id }, select: { id: true, reaction: true } }
        : { where: { userId: "__none__" }, select: { id: true, reaction: true } },
    },
  });

  const hasMore = !postId && results.length > take;
  const posts = results.slice(0, postId ? 1 : take);

  // Batch-compute Due Diligence badge for all unique post authors
  const authorIds = [...new Set(posts.map(p => p.author.id))];
  const [completedEnrollments, toolkitPurchases] = await Promise.all([
    prisma.enrollment.findMany({
      where: { userId: { in: authorIds }, completedAt: { not: null } },
      select: { userId: true },
      distinct: ["userId"],
    }),
    prisma.toolkitPurchase.findMany({
      where: { userId: { in: authorIds } },
      select: { userId: true },
      distinct: ["userId"],
    }),
  ]);
  const badgeUserIds = new Set([
    ...completedEnrollments.map(e => e.userId),
    ...toolkitPurchases.map(t => t.userId),
  ]);

  const summaries = await reactionSummaries(posts.map(post => post.id));
  const ownReposts = session ? await prisma.post.findMany({
    where: { authorId: session.user.id, isRepost: true, originalPostId: { in: posts.map(p => p.originalPostId || p.id) } },
    select: { id: true, originalPostId: true },
  }) : [];
  const repostByOriginal = new Map(ownReposts.map(p => [p.originalPostId, p.id]));
  const postsWithBadge = posts.map(p => ({
    ...p,
    originalPost: canRepost(p.originalPost) ? p.originalPost : null,
    canRepost: p.isRepost ? canRepost(p.originalPost) : canRepost(p),
    viewerRepostId: repostByOriginal.get(p.originalPostId || p.id) || null,
    repostCount: p.isRepost ? (canRepost(p.originalPost) ? p.originalPost?._count.reposts ?? 0 : 0) : p._count.reposts,
    reactionCounts: summaries[p.id] ?? {},
    author: { ...p.author, hasDueDiligenceBadge: badgeUserIds.has(p.author.id) },
  }));

  const nextCursor = hasMore ? posts[posts.length - 1].id : null;
  return NextResponse.json({ posts: postsWithBadge, nextCursor }, { headers: { "Cache-Control": "private, no-store" } });
}


// POST — requires auth to create a post (immediate or scheduled)
export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { content, images, videoUrl, scheduledAt } = await req.json();
  if (!content?.trim() && (!images?.length) && !videoUrl)
    return NextResponse.json({ error: "Content required" }, { status: 400 });

  if (typeof content === "string" && detectSensitiveData(content)) return NextResponse.json({ error: PRIVACY_REMINDER }, { status: 400 });

  // Validate scheduledAt — must be at least 1 minute in the future
  let schedDate: Date | null = null;
  if (scheduledAt) {
    schedDate = new Date(scheduledAt);
    if (isNaN(schedDate.getTime()) || schedDate <= new Date(Date.now() + 60_000)) {
      return NextResponse.json({ error: "Scheduled time must be at least 1 minute in the future" }, { status: 400 });
    }
  }

  const result = await prisma.$transaction(async tx => {
    // Serialize publications per account so simultaneous submissions celebrate once.
    const [author] = await tx.$queryRaw<{ firstFeedPostAt: Date | null }[]>
      `SELECT "firstFeedPostAt" FROM "users" WHERE id = ${session.user.id} FOR UPDATE`;
    let isFirstPost = false;
    if (!schedDate && author && !author.firstFeedPostAt) {
      const previousPost = await tx.post.findFirst({
        where: { authorId: session.user.id, communityId: null, scheduledAt: null },
        select: { id: true },
      });
      isFirstPost = !previousPost;
      await tx.$executeRaw`UPDATE "users" SET "firstFeedPostAt" = NOW() WHERE id = ${session.user.id}`;
    }
    const post = await tx.post.create({
      data: {
        content:     content?.trim() ?? "",
        images:      images ?? [],
        videoUrl:    videoUrl ?? null,
        scheduledAt: schedDate,
        authorId:    session.user.id,
      },
      include: {
        author: { select: { id: true, aiSpecialist: { select: { id: true } }, profileSlug: true, name: true, image: true, headline: true, role: true, tier: true } },
        comments: {
          include: { author: { select: { id: true, aiSpecialist: { select: { id: true } }, profileSlug: true, name: true, image: true } } },
          orderBy: { createdAt: "asc" as const },
          take: 3,
        },
        community: { select: { name: true, slug: true, isPublic: true } },
        _count: { select: { likes: true, comments: true } },
        likes: { select: { id: true, reaction: true } },
      },
    });

    return { ...post, isFirstPost };
  });

  if (!schedDate) after(() => replyToPost(result.id).catch(() => console.error("AI reply failed; see specialist activity log.")));
  return NextResponse.json(result, { status: 201 });
}


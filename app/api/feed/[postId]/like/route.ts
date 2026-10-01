import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isReaction } from "@/lib/reactions";
import { reactionSummaries } from "@/lib/post-reactions";

async function readablePost(postId: string, userId?: string) {
  return prisma.post.findFirst({ where: { id: postId, scheduledAt: null, OR: [
    { communityId: null }, { community: { isPublic: true } },
    ...(userId ? [{ community: { members: { some: { userId } } } }] : []),
  ] }, select: { id: true, communityId: true } });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ postId: string }> }) {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { postId } = await params;
  const post = await readablePost(postId, session.user.id);
  if (!post) return NextResponse.json({ error: "Post not found" }, { status: 404 });
  if (post.communityId) {
    const member = await prisma.communityMember.findFirst({ where: { communityId: post.communityId, userId: session.user.id } });
    if (!member) return NextResponse.json({ error: "Join this group to react" }, { status: 403 });
  }
  const raw = await req.text();
  let body: { reaction?: unknown } = {};
  try { if (raw) body = JSON.parse(raw); } catch { return NextResponse.json({ error: "Invalid reaction" }, { status: 400 }); }
  if (!body || typeof body !== "object" || (body.reaction !== undefined && body.reaction !== null && !isReaction(body.reaction))) return NextResponse.json({ error: "Invalid reaction" }, { status: 400 });
  const reaction = await prisma.$transaction(async tx => {
    // Serialize changes to this post so its cached count stays consistent.
    await tx.post.update({ where: { id: postId }, data: { likeCount: { increment: 0 } } });
    const key = { userId_postId: { userId: session.user.id, postId } };
    const existing = await tx.postLike.findUnique({ where: key });
    const selected = body.reaction === undefined ? (existing ? null : "LIKE") : body.reaction;
    if (selected === null) await tx.postLike.deleteMany({ where: { userId: session.user.id, postId } });
    else await tx.postLike.upsert({ where: key, create: { userId: session.user.id, postId, reaction: selected as string }, update: { reaction: selected as string } });
    const count = await tx.postLike.count({ where: { postId } });
    await tx.post.update({ where: { id: postId }, data: { likeCount: count } });
    return selected;
  });
  const counts = (await reactionSummaries([postId]))[postId] ?? {};
  return NextResponse.json({ liked: !!reaction, reaction, reactionCounts: counts, totalCount: Object.values(counts).reduce((sum, count) => sum + (count ?? 0), 0) });
}
export async function GET(req: NextRequest, { params }: { params: Promise<{ postId: string }> }) {
  const { postId } = await params;

  const session = await auth.api.getSession({ headers: req.headers });
  const post = await readablePost(postId, session?.user.id);
  if (!post) return NextResponse.json({ error: "Post not found" }, { status: 404 });
  try {
    const likes = await prisma.postLike.findMany({
      where: { postId },
      orderBy: { createdAt: "desc" },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            image: true,
            headline: true,
            role: true,
            tier: true,
            isBrandAmbassador: true,
          },
        },
      },
    });

    const userIds = likes.map((l) => l.user.id);
    const [completedEnrollments, toolkitPurchases] = await Promise.all([
      prisma.enrollment.findMany({
        where: { userId: { in: userIds }, completedAt: { not: null } },
        select: { userId: true },
        distinct: ["userId"],
      }),
      prisma.toolkitPurchase.findMany({
        where: { userId: { in: userIds } },
        select: { userId: true },
        distinct: ["userId"],
      }),
    ]);

    const badgeUserIds = new Set([
      ...completedEnrollments.map((e) => e.userId),
      ...toolkitPurchases.map((t) => t.userId),
    ]);

    const formattedLikes = likes.map((l) => ({
      id: l.id,
      reaction: l.reaction,
      createdAt: l.createdAt,
      user: {
        ...l.user,
        hasDueDiligenceBadge: badgeUserIds.has(l.user.id),
      },
    }));

    return NextResponse.json({
      likes: formattedLikes,
      totalCount: formattedLikes.length,
    });
  } catch (error) {
    console.error("Error fetching post likes:", error);
    return NextResponse.json({ error: "Failed to fetch likes" }, { status: 500 });
  }
}


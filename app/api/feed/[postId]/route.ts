import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ postId: string }> }
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { postId } = await params;
  const body = await req.json().catch(() => null);
  if (typeof body?.content !== "string" || !body.content.trim() || body.content.length > 20000) return NextResponse.json({ error: "Write a post between 1 and 20,000 characters." }, { status: 400 });
  const content = body.content;

  const post = await prisma.post.findUnique({ where: { id: postId } });
  if (!post) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (post.authorId !== session.user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const updated = await prisma.post.update({
    where: { id: postId },
    data: { content: content.trim() },
    include: {
      author: { select: { id: true, name: true, image: true, headline: true, role: true, tier: true } },
      comments: { take: 3, orderBy: { createdAt: "desc" }, include: { author: { select: { id: true, name: true, image: true } } } },
      _count: { select: { likes: true, comments: true } },
      likes: { where: { userId: session.user.id }, select: { id: true } },
    },
  });

  return NextResponse.json(updated);
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ postId: string }> }
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { postId } = await params;

  const post = await prisma.post.findUnique({ where: { id: postId } });
  if (!post) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const [user, group] = await Promise.all([
    prisma.user.findUnique({ where: { id: session.user.id }, select: { role: true } }),
    post.communityId ? prisma.community.findUnique({ where: { id: post.communityId }, select: { creatorId: true } }) : Promise.resolve(null),
  ]);
  if (post.authorId !== session.user.id && user?.role !== "ADMIN" && group?.creatorId !== session.user.id)
    return NextResponse.json({ error: "Only the author, group host, or a platform admin can delete this post." }, { status: 403 });

  await Promise.all([
    prisma.post.delete({ where: { id: postId } }),
    prisma.aiActivity.updateMany({
      where: {
        OR: [
          { publishedUrl: `/feed?post=${postId}` },
          { publishedUrl: { contains: postId } },
        ],
      },
      data: { status: "DISCARDED", publishedUrl: null },
    }).catch(() => null),
  ]);
  return NextResponse.json({ ok: true });
}

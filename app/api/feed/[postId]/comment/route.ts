import { replyToPost } from "@/lib/specialists/service";
import { detectSensitiveData, PRIVACY_REMINDER } from "@/lib/specialists/catalog";
import { NextRequest, NextResponse, after } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
async function access(req: NextRequest, postId: string, writing: boolean) {
  const session = await auth.api.getSession({ headers: req.headers });
  if (writing && !session) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  const post = await prisma.post.findUnique({ where: { id: postId }, include: { community: true } });
  if (!post) return { error: NextResponse.json({ error: "Not found" }, { status: 404 }) };
  if (post.community && (writing || !post.community.isPublic)) {
    const membership = session ? await prisma.communityMember.findUnique({ where: { userId_communityId: { userId: session.user.id, communityId: post.community.id } } }) : null;
    if (!membership) return { error: NextResponse.json({ error: "Join this group first." }, { status: 403 }) };
  }
  return { session };
}
export async function GET(req: NextRequest, { params }: { params: Promise<{ postId: string }> }) {
  const { postId } = await params;
  const permission = await access(req, postId, false);
  if (permission.error) return permission.error;
  const comments = await prisma.comment.findMany({ where: { postId }, include: { author: { select: { id: true, aiSpecialist: { select: { id: true } }, profileSlug: true, name: true, image: true, headline: true, isBrandAmbassador: true } } }, orderBy: { createdAt: "asc" } });
  return NextResponse.json(comments);
}
export async function POST(req: NextRequest, { params }: { params: Promise<{ postId: string }> }) {
  const { postId } = await params;
  const permission = await access(req, postId, true);
  if (permission.error) return permission.error;
  const body = await req.json().catch(() => null);
  if (typeof body?.content !== "string" || !body.content.trim() || body.content.length > 5000) return NextResponse.json({ error: "Write a comment between 1 and 5,000 characters." }, { status: 400 });
  if (detectSensitiveData(body.content)) return NextResponse.json({error:PRIVACY_REMINDER},{status:400});
  const comment = await prisma.$transaction(async tx => {
    const created = await tx.comment.create({ data: { content: body.content.trim(), authorId: permission.session!.user.id, postId }, include: { author: { select: { id: true, aiSpecialist: { select: { id: true } }, profileSlug: true, name: true, image: true, headline: true, isBrandAmbassador: true } } } });
    await tx.post.update({ where: { id: postId }, data: { commentCount: { increment: 1 } } });
    return created;
  });
  after(() => replyToPost(postId,comment.id).catch(() => console.error("AI reply failed; see specialist activity log.")));
  return NextResponse.json(comment, { status: 201 });
}

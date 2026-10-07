import { countHostedProTalks } from "@/lib/hosted-pro-talks";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  const session = await auth.api.getSession({ headers: _req.headers }).catch(() => null);

  const networkCardSelect = {
    id: true, name: true, slug: true, tagline: true, logoImage: true, memberCount: true,
    badgeShape: true, badgeInitials: true, badgeBgColor: true, badgeTextColor: true,
    badgeBorderColor: true, badgeCustomImage: true,
    _count: { select: { members: { where: { status: "ACTIVE" } } } },
  } as const;

  const [user, acceptedConnectionsCount, hasTraining, hasToolkit, ownedNetworks, memberships, discussionsStarted, proTalksHosted, feedMediaPosts] = await Promise.all([
    prisma.user.findUnique({
      where: { id },
      select: {
        id: true, name: true, image: true, coverImage: true, profileSlug: true, professionalTitle: true,
        headline: true, bio: true, mission: true, location: true,
        yearsExperience: true, website: true, linkedIn: true,
        twitter: true, facebook: true, specialties: true,
        certifications: true, languages: true, mediaPhotos: true,
        voiceMemoUrl: true,
        role: true, tier: true, isBrandAmbassador: true, createdAt: true,
        instructorCourses: {
          where: { status: "PUBLISHED" },
          select: { id: true, slug: true, title: true, thumbnail: true, level: true, price: true, isFree: true },
          take: 6,
        },
        listings: {
          where: { status: "APPROVED" },
          select: { id: true, slug: true, title: true, description: true, price: true, category: true, images: true },
          take: 6,
        },
        proServices: {
          select: { id: true, title: true, description: true, price: true, emoji: true },
          take: 6,
        },
        reviewsReceived: {
          select: {
            id: true,
            rating: true,
            content: true,
            createdAt: true,
            reviewer: { select: { id: true, name: true, image: true, headline: true } },
          },
          orderBy: { createdAt: "desc" },
          take: 6,
        },
        posts: {
          where: { communityId: null, scheduledAt: null },
          orderBy: { createdAt: "desc" },
          take: 8,
          select: {
            id: true,
            content: true,
            images: true,
            videoUrl: true,
            likeCount: true,
            commentCount: true,
            createdAt: true,
          },
        },
        _count: {
          select: {
            posts: { where: { communityId: null, scheduledAt: null } },
            instructorCourses: true,
            listings: true,
            reviewsReceived: true,
          },
        },
      },
    }),
    prisma.connection.count({
      where: {
        status: "ACCEPTED",
        OR: [{ requesterId: id }, { receiverId: id }],
      },
    }),
    prisma.enrollment.findFirst({
      where: { userId: id, completedAt: { not: null } },
      select: { id: true },
    }),
    prisma.toolkitPurchase.findFirst({
      where: { userId: id },
      select: { id: true },
    }),
    // Public profile data only — no emails, phones or payment info.
    prisma.proNetwork.findMany({ where: { ownerId: id }, select: networkCardSelect, orderBy: { createdAt: "asc" } }),
    // Joined networks are shown only when the member chose to appear in that network's directory.
    prisma.proNetworkMember.findMany({
      where: { userId: id, status: "ACTIVE", showInDirectory: true, network: { ownerId: { not: id } } },
      select: { role: true, network: { select: networkCardSelect } },
    }),
    prisma.proNetworkDiscussion.count({ where: { authorId: id } }),
    countHostedProTalks(id),
    // Photos/videos from public feed posts (no group posts, nothing still scheduled).
    prisma.post.findMany({
      where: {
        authorId: id,
        communityId: null,
        AND: [
          { OR: [{ images: { isEmpty: false } }, { videoUrl: { not: null } }] },
          { OR: [{ scheduledAt: null }, { scheduledAt: { lte: new Date() } }] },
        ],
      },
      select: { id: true, images: true, videoUrl: true },
      orderBy: { createdAt: "desc" },
      take: 30,
    }),
  ]);

  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });

  let viewerConnectionStatus: "NONE" | "PENDING" | "ACCEPTED" = "NONE";
  if (session?.user?.id && session.user.id !== user.id) {
    const conn = await prisma.connection.findFirst({
      where: {
        OR: [
          { requesterId: session.user.id, receiverId: user.id },
          { requesterId: user.id, receiverId: session.user.id },
        ],
      },
      select: { status: true },
    });
    if (conn?.status === "ACCEPTED") viewerConnectionStatus = "ACCEPTED";
    else if (conn?.status === "PENDING") viewerConnectionStatus = "PENDING";
  }

  type NetworkRow = (typeof ownedNetworks)[number];
  const toBadge = (n: NetworkRow, role: string) => ({
    id: n.id,
    name: n.name,
    slug: n.slug,
    tagline: n.tagline,
    role,
    memberCount: Math.max(n._count.members, n.memberCount || 0),
    image: n.badgeCustomImage || n.logoImage || null,
    shape: n.badgeShape,
    initials: n.badgeInitials,
    bgColor: n.badgeBgColor,
    textColor: n.badgeTextColor,
    borderColor: n.badgeBorderColor,
  });

  return NextResponse.json({
    ...user,
    viewerConnectionStatus,
    networks: [
      ...ownedNetworks.map((n) => toBadge(n, "OWNER")),
      ...memberships.map((m) => toBadge(m.network, m.role === "OWNER" ? "MEMBER" : m.role || "MEMBER")),
    ],
    networkStats: {
      proNetworks: ownedNetworks.length + memberships.length,
      discussionsStarted,
      proTalksHosted,
    },
    feedMedia: feedMediaPosts
      .flatMap((post) => [
        ...(post.videoUrl ? [{ url: post.videoUrl, postId: post.id, type: "video" as const }] : []),
        ...post.images.map((url) => ({ url, postId: post.id, type: "photo" as const })),
      ])
      .slice(0, 48),
    connectionCount: acceptedConnectionsCount,
    hasDueDiligenceBadge: Boolean(hasTraining || hasToolkit),
  });
}

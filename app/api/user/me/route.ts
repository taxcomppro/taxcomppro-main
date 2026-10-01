import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req: NextRequest) {
  const session = await auth.api.getSession({ headers: req.headers });

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [
    user,
    enrollments,
    toolkitPurchases,
    unreadNotifications,
    reviewsAggregate,
    ownedNetworks,
    memberNetworks,
    discussionsStarted,
    proTalksHosted,
    feedImagePosts,
    connections,
    followers,
  ] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        profileSlug: true,
        professionalTitle: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        tier: true,
        isBrandAmbassador: true,
        headline: true,
        bio: true,
        mission: true,
        location: true,
        yearsExperience: true,
        website: true,
        linkedIn: true,
        twitter: true,
        facebook: true,
        image: true,
        coverImage: true,
        specialties: true,
        certifications: true,
        languages: true,
        mediaPhotos: true,
        voiceMemoUrl: true,
        createdAt: true,
        digitalCard: {
          select: {
            id: true,
            username: true,
            isActivated: true,
            professionalTitle: true,
            businessName: true,
            theme: true,
            accentColor: true,
            logoUrl: true,
          },
        },
        subscription: {
          select: {
            plan: true,
            status: true,
            currentPeriodEnd: true,
          },
        },
      },
    }),
    prisma.enrollment.findMany({
      where: { userId: session.user.id },
      select: { completedAt: true },
    }),
    prisma.toolkitPurchase.count({
      where: { userId: session.user.id },
    }),
    prisma.notification.count({
      where: { userId: session.user.id, isRead: false },
    }),
    prisma.proReview.aggregate({
      where: { proId: session.user.id },
      _avg: { rating: true },
      _count: { rating: true },
    }),
    prisma.proNetwork.findMany({
      where: { ownerId: session.user.id },
      select: {
        id: true,
        name: true,
        slug: true,
        tagline: true,
        description: true,
        category: true,
        monthlyPrice: true,
        memberCount: true,
        followerCount: true,
        logoImage: true,
        coverImage: true,
        memberBenefits: true,
        badgeShape: true,
        badgeInitials: true,
        badgeText: true,
        badgeIcon: true,
        badgeBgColor: true,
        badgeTextColor: true,
        badgeBorderColor: true,
        badgeCustomImage: true,
        owner: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
        _count: {
          select: {
            members: { where: { status: "ACTIVE" } },
            followers: true,
            discussions: true,
            events: true,
          },
        },
      },
    }),
    prisma.proNetworkMember.findMany({
      where: { userId: session.user.id, status: "ACTIVE" },
      select: {
        id: true,
        role: true,
        joinedAt: true,
        network: {
          select: {
            id: true,
            name: true,
            slug: true,
            tagline: true,
            description: true,
            monthlyPrice: true,
            memberCount: true,
            logoImage: true,
            coverImage: true,
            memberBenefits: true,
            badgeShape: true,
            badgeInitials: true,
            badgeText: true,
            badgeIcon: true,
            badgeBgColor: true,
            badgeTextColor: true,
            badgeBorderColor: true,
            badgeCustomImage: true,
            ownerId: true,
            owner: {
              select: {
                id: true,
                name: true,
                image: true,
              },
            },
            _count: {
              select: {
                members: { where: { status: "ACTIVE" } },
              },
            },
          },
        },
      },
    }),
    prisma.proNetworkDiscussion.count({
      where: { authorId: session.user.id },
    }),
    prisma.proNetworkEvent.count({
      where: { hostId: session.user.id },
    }),
    // Photos and videos the user posted to the main feed (not group posts, not still-scheduled posts)
    prisma.post.findMany({
      where: {
        authorId: session.user.id,
        communityId: null,
        AND: [
          { OR: [{ images: { isEmpty: false } }, { videoUrl: { not: null } }] },
          { OR: [{ scheduledAt: null }, { scheduledAt: { lte: new Date() } }] },
        ],
      },
      select: { id: true, images: true, videoUrl: true, createdAt: true },
      orderBy: { createdAt: "desc" },
      take: 30,
    }),
    // Accepted connections in either direction (same rule as /connections)
    prisma.connection.count({
      where: {
        status: "ACCEPTED",
        OR: [{ requesterId: session.user.id }, { receiverId: session.user.id }],
      },
    }),
    prisma.userFollow.count({ where: { followingId: session.user.id } }),
  ]);

  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const totalEnrollments = enrollments.length;
  const completedCourses = enrollments.filter((e) => e.completedAt !== null).length;
  const reviewsCount = reviewsAggregate._count.rating ?? 0;
  const hasDueDiligenceBadge = completedCourses > 0 || toolkitPurchases > 0;
  const avgRating = reviewsAggregate._avg.rating ?? (user.role === "ADMIN" ? 5.0 : null);
  const totalReviews = reviewsCount > 0 ? reviewsCount : (user.role === "ADMIN" ? 128 : 0);

  // Pro Network metrics (100% dynamic from DB)
  const proNetworksOwned = ownedNetworks.length;
  const proNetworkMembers = ownedNetworks.reduce(
    (sum, net) => sum + Math.max(net._count.members, net.memberCount || 0),
    0
  );
  const primaryNetwork = ownedNetworks[0] || null;

  // Format Owned Networks list
  const formattedOwnedNetworks = ownedNetworks.map((n) => {
    const logo = n.logoImage || n.badgeCustomImage || n.owner?.image || user.image || null;
    return {
      id: n.id,
      name: n.name,
      slug: n.slug,
      tagline: n.tagline,
      description: n.description,
      category: n.category,
      monthlyPrice: n.monthlyPrice,
      memberCount: Math.max(n._count.members, n.memberCount || 0),
      followerCount: Math.max(n._count.followers, n.followerCount || 0),
      logoImage: logo,
      coverImage: n.coverImage,
      memberBenefits: n.memberBenefits,
      badgeShape: n.badgeShape,
      badgeInitials: n.badgeInitials,
      badgeText: n.badgeText,
      badgeIcon: n.badgeIcon,
      badgeBgColor: n.badgeBgColor,
      badgeTextColor: n.badgeTextColor,
      badgeBorderColor: n.badgeBorderColor,
      badgeCustomImage: logo,
      role: "OWNER",
      ownerName: n.owner?.name || user.name || "Owner",
      ownerImage: n.owner?.image || user.image || null,
    };
  });

  // Networks the user belongs to but doesn't own
  const joinedMemberships = memberNetworks.filter((m) => m.network.ownerId !== session.user.id);
  const proNetworksJoined = joinedMemberships.length;
  const formattedJoinedNetworks = joinedMemberships.map((m) => {
    const n = m.network;
    return {
      id: n.id,
      name: n.name,
      slug: n.slug,
      tagline: n.tagline,
      description: n.description,
      monthlyPrice: n.monthlyPrice,
      memberCount: Math.max(n._count.members, n.memberCount || 0),
      logoImage: n.logoImage || n.badgeCustomImage || n.owner?.image || null,
      coverImage: n.coverImage,
      role: m.role || "MEMBER",
      ownerName: n.owner?.name || "Network Owner",
      ownerImage: n.owner?.image || null,
    };
  });

  // Format Badges (Owned Networks + Joined Member Networks)
  const myBadges = [
    ...ownedNetworks.map((n) => {
      const logo = n.badgeCustomImage || n.logoImage || n.owner?.image || user.image || null;
      return {
        id: `owned-${n.id}`,
        networkId: n.id,
        networkName: n.name,
        networkSlug: n.slug,
        role: "OWNER",
        ownerName: n.owner?.name || user.name || "Owner",
        ownerImage: n.owner?.image || user.image || null,
        shape: n.badgeShape || "circle",
        initials: n.badgeInitials || n.name.slice(0, 3).toUpperCase(),
        text: n.badgeText || "OWNER",
        icon: n.badgeIcon || "Crown",
        bgColor: n.badgeBgColor || "#0a1628",
        textColor: n.badgeTextColor || "#ffbe24",
        borderColor: n.badgeBorderColor || "#ffbe24",
        customImage: logo,
        logoImage: logo,
      };
    }),
    ...memberNetworks
      .filter((m) => m.network.ownerId !== session.user.id)
      .map((m) => {
        const logo = m.network.badgeCustomImage || m.network.logoImage || m.network.owner?.image || null;
        return {
          id: `member-${m.id}`,
          networkId: m.network.id,
          networkName: m.network.name,
          networkSlug: m.network.slug,
          role: m.role || "MEMBER",
          ownerName: m.network.owner?.name || "Network Owner",
          ownerImage: m.network.owner?.image || null,
          shape: m.network.badgeShape || "circle",
          initials: m.network.badgeInitials || m.network.name.slice(0, 3).toUpperCase(),
          text: m.network.badgeText || "MEMBER",
          icon: m.network.badgeIcon || "Star",
          bgColor: m.network.badgeBgColor || "#0a1628",
          textColor: m.network.badgeTextColor || "#ffbe24",
          borderColor: m.network.badgeBorderColor || "#ffbe24",
          customImage: logo,
          logoImage: logo,
        };
      }),
  ];

  return NextResponse.json({
    ...user,
    hasDueDiligenceBadge,
    proNetworks: [...formattedOwnedNetworks, ...formattedJoinedNetworks],
    feedPhotos: feedImagePosts
      .flatMap((post) => [
        ...(post.videoUrl ? [{ url: post.videoUrl, postId: post.id, createdAt: post.createdAt, type: "video" as const }] : []),
        ...post.images.map((url) => ({ url, postId: post.id, createdAt: post.createdAt, type: "photo" as const })),
      ])
      .slice(0, 48),
    myBadges,
    primaryNetwork: primaryNetwork
      ? {
          id: primaryNetwork.id,
          name: primaryNetwork.name,
          slug: primaryNetwork.slug,
          tagline: primaryNetwork.tagline,
          description: primaryNetwork.description,
          monthlyPrice: primaryNetwork.monthlyPrice,
          memberCount: Math.max(primaryNetwork._count.members, primaryNetwork.memberCount || 0),
          logoImage: primaryNetwork.logoImage || primaryNetwork.badgeCustomImage || primaryNetwork.owner?.image || user.image || null,
          ownerName: primaryNetwork.owner?.name || user.name || "Owner",
          memberBenefits: primaryNetwork.memberBenefits,
        }
      : null,
    stats: {
      completedCourses,
      totalEnrollments,
      toolkitPurchases,
      unreadNotifications,
      avgRating,
      reviewsCount: totalReviews,
      // Dynamic Pro Network Stats
      connections,
      followers,
      proNetworkMembers,
      proNetworksOwned,
      proNetworksJoined,
      discussionsStarted,
      proTalksHosted,
      primaryNetworkSlug: primaryNetwork?.slug ?? null,
      primaryNetworkName: primaryNetwork?.name ?? null,
    },
  }, {
    headers: {
      "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0",
      "Pragma": "no-cache",
    },
  });
}

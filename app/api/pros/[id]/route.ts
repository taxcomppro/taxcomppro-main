import { countHostedProTalks } from "@/lib/hosted-pro-talks";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { directoryUserWhere } from "@/lib/proDirectory";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params;

  const [pro, ownedNetworks, discussionsStarted, proTalksHosted, followers] = await Promise.all([
    prisma.user.findFirst({
      where: { id, OR: [{ role: "ADMIN" }, ...(directoryUserWhere.OR ?? [])] },
      select: {
        id: true,
        name: true,
        image: true,
        coverImage: true,
        headline: true,
        bio: true,
        mission: true,
        location: true,
        yearsExperience: true,
        website: true,
        linkedIn: true,
        twitter: true,
        facebook: true,
        specialties: true,
        certifications: true,
        languages: true,
        mediaPhotos: true,
        voiceMemoUrl: true,
        createdAt: true,
        instructorCourses: {
          where: { status: "PUBLISHED" },
          select: { id: true, slug: true, title: true, thumbnail: true, level: true, price: true, isFree: true },
          take: 4,
        },
      },
    }),
    prisma.proNetwork.findMany({
      where: { ownerId: id },
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
    prisma.proNetworkDiscussion.count({
      where: { authorId: id },
    }),
    countHostedProTalks(id),
    prisma.userFollow.count({ where: { followingId: id } }),
  ]);

  if (!pro) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const proNetworksOwned = ownedNetworks.length;
  const proNetworkMembers = ownedNetworks.reduce(
    (sum, net) => sum + Math.max(net._count.members, net.memberCount || 0),
    0
  );
  const primaryNetwork = ownedNetworks[0] || null;

  const formattedOwnedNetworks = ownedNetworks.map((n) => {
    const logo = n.logoImage || n.badgeCustomImage || n.owner?.image || pro.image || null;
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
      ownerName: n.owner?.name || pro.name || "Owner",
      ownerImage: n.owner?.image || pro.image || null,
    };
  });

  const myBadges = ownedNetworks.map((n) => {
    const logo = n.badgeCustomImage || n.logoImage || n.owner?.image || pro.image || null;
    return {
      id: `owned-${n.id}`,
      networkId: n.id,
      networkName: n.name,
      networkSlug: n.slug,
      role: "OWNER",
      ownerName: n.owner?.name || pro.name || "Owner",
      ownerImage: n.owner?.image || pro.image || null,
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
  });

  return NextResponse.json({
    ...pro,
    proNetworks: formattedOwnedNetworks,
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
          logoImage: primaryNetwork.logoImage || primaryNetwork.badgeCustomImage || primaryNetwork.owner?.image || pro.image || null,
          ownerName: primaryNetwork.owner?.name || pro.name || "Owner",
          memberBenefits: primaryNetwork.memberBenefits,
        }
      : null,
    networkStats: {
      followers,
      proNetworkMembers,
      proNetworksOwned,
      discussionsStarted,
      proTalksHosted,
      primaryNetworkSlug: primaryNetwork?.slug ?? null,
      primaryNetworkName: primaryNetwork?.name ?? null,
    },
  });
}

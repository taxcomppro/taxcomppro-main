import type { Prisma } from "@prisma/client";

export const originalPostSelect = {
  id: true, content: true, images: true, videoUrl: true, createdAt: true,
  scheduledAt: true, isRepost: true, communityId: true,
  author: { select: { id: true, profileSlug: true, name: true, image: true, isBrandAmbassador: true, aiSpecialist: { select: { id: true } } } },
  community: { select: { name: true, slug: true, isPublic: true } },
  _count: { select: { reposts: true } },
} as const satisfies Prisma.PostSelect;

// Reposts never carry private-group content onto the public feed.
export function canRepost(post: { scheduledAt: Date | null; isRepost: boolean; communityId: string | null; community: { isPublic: boolean } | null } | null) {
  return !!post && !post.scheduledAt && !post.isRepost &&
    (!post.communityId || post.community?.isPublic === true);
}

export function feedAuthorFilter(filter: string, userId: string): Prisma.PostWhereInput {
  if (filter === "following") return { author: { followers: { some: { followerId: userId } } } };
  if (filter === "connections") return { author: { OR: [
    { sentConnections: { some: { receiverId: userId, status: "ACCEPTED" } } },
    { receivedConnections: { some: { requesterId: userId, status: "ACCEPTED" } } },
  ] } };
  return {};
}

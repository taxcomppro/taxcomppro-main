import { prisma } from "../../common/db";
import { UserSessionContext, formatSuccess, formatError, McpToolResponse } from "../../common/types";
import { detectSensitiveData, PRIVACY_REMINDER } from "@/lib/specialists/catalog";
import { replyToPost } from "@/lib/specialists/service";
import { isReaction } from "@/lib/reactions";

export const feedToolDefinitions = [
  {
    name: "post_to_feed",
    description: "Publish a new post to the TaxComPro practitioner community feed, or schedule it for future publication. Share tax technical insights, IRS updates, client defense strategies, questions, or practice announcements from any LLM.",
    inputSchema: {
      type: "object",
      properties: {
        content: {
          type: "string",
          description: "The text/markdown content of the post to publish.",
        },
        images: {
          type: "array",
          items: { type: "string" },
          description: "Optional array of publicly accessible image URLs to attach.",
        },
        videoUrl: {
          type: "string",
          description: "Optional URL of a video to attach (e.g., YouTube, Vimeo, Loom).",
        },
        communityId: {
          type: "string",
          description: "Optional Community/Group ID to post into. Omit for the main public community feed.",
        },
        scheduledAt: {
          type: "string",
          description: "Optional ISO 8601 timestamp (e.g., '2026-11-10T14:00:00Z') to schedule publication in the future (must be at least 1 minute ahead).",
        },
      },
      required: ["content"],
    },
  },
  {
    name: "get_feed",
    description: "Browse recent posts and practitioner discussions on the TaxComPro community feed.",
    inputSchema: {
      type: "object",
      properties: {
        limit: {
          type: "number",
          description: "Number of posts to retrieve (1-30, default 10).",
        },
        communityId: {
          type: "string",
          description: "Optional Community/Group ID to filter posts from a specific group.",
        },
      },
    },
  },
  {
    name: "get_my_posts",
    description: "Retrieve posts created by the authenticated user, including published and scheduled posts with engagement metrics.",
    inputSchema: {
      type: "object",
      properties: {
        limit: {
          type: "number",
          description: "Number of posts to retrieve (default 15).",
        },
        status: {
          type: "string",
          enum: ["all", "published", "scheduled"],
          description: "Filter by status: 'all', 'published', or 'scheduled'.",
        },
      },
    },
  },
  {
    name: "comment_on_post",
    description: "Add a comment or technical reply to an existing post on the TaxComPro community feed.",
    inputSchema: {
      type: "object",
      properties: {
        postId: {
          type: "string",
          description: "ID of the post to comment on.",
        },
        content: {
          type: "string",
          description: "The comment content (1 to 5,000 characters).",
        },
      },
      required: ["postId", "content"],
    },
  },
  {
    name: "like_post",
    description: "Like or react to a post on the TaxComPro community feed.",
    inputSchema: {
      type: "object",
      properties: {
        postId: {
          type: "string",
          description: "ID of the post to like/react to.",
        },
        reaction: {
          type: "string",
          enum: ["LIKE", "LOVE", "CARE", "HAHA", "WOW", "SAD", "ANGRY"],
          description: "Reaction type (default: 'LIKE').",
        },
      },
      required: ["postId"],
    },
  },
  {
    name: "delete_my_post",
    description: "Delete a post created by the authenticated user from the TaxComPro feed.",
    inputSchema: {
      type: "object",
      properties: {
        postId: {
          type: "string",
          description: "ID of the post to delete.",
        },
      },
      required: ["postId"],
    },
  },
];

export async function handleFeedTool(
  name: string,
  args: Record<string, any>,
  user: UserSessionContext
): Promise<McpToolResponse> {
  try {
    switch (name) {
      case "post_to_feed": {
        const content = typeof args.content === "string" ? args.content.trim() : "";
        const images: string[] = Array.isArray(args.images) ? args.images.filter(Boolean) : [];
        const videoUrl = typeof args.videoUrl === "string" && args.videoUrl.trim() ? args.videoUrl.trim() : null;
        const communityId = typeof args.communityId === "string" && args.communityId.trim() ? args.communityId.trim() : null;
        const scheduledAtRaw = typeof args.scheduledAt === "string" && args.scheduledAt.trim() ? args.scheduledAt.trim() : null;

        if (!content && images.length === 0 && !videoUrl) {
          return formatError("Post content or media (image/video) is required.");
        }

        // Privacy & Client PII protection
        if (content && detectSensitiveData(content)) {
          return formatError(
            `Privacy Warning: ${PRIVACY_REMINDER}. Never post client SSNs, EINs, bank accounts, or sensitive taxpayer information.`
          );
        }

        // Validate scheduled date if provided
        let schedDate: Date | null = null;
        if (scheduledAtRaw) {
          schedDate = new Date(scheduledAtRaw);
          if (isNaN(schedDate.getTime()) || schedDate <= new Date(Date.now() + 60_000)) {
            return formatError("Scheduled time must be a valid future ISO date at least 1 minute ahead.");
          }
        }

        // If communityId specified, verify access
        let communityName: string | null = null;
        if (communityId) {
          const community = await prisma.community.findUnique({
            where: { id: communityId },
            include: {
              members: { where: { userId: user.userId } },
            },
          });

          if (!community) {
            return formatError(`Community with ID "${communityId}" not found.`);
          }

          if (!community.isPublic && community.members.length === 0) {
            return formatError(`You must be a member of "${community.name}" to post in this group.`);
          }

          communityName = community.name;
        }

        // Create the post
        const post = await prisma.$transaction(async (tx) => {
          // Check and update firstFeedPostAt
          const currentUser = await tx.user.findUnique({
            where: { id: user.userId },
            select: { firstFeedPostAt: true },
          });

          if (!schedDate && currentUser && !currentUser.firstFeedPostAt) {
            await tx.user.update({
              where: { id: user.userId },
              data: { firstFeedPostAt: new Date() },
            });
          }

          return await tx.post.create({
            data: {
              content,
              images,
              videoUrl,
              communityId,
              scheduledAt: schedDate,
              authorId: user.userId,
            },
            include: {
              author: {
                select: {
                  id: true,
                  name: true,
                  headline: true,
                  tier: true,
                },
              },
              community: {
                select: {
                  id: true,
                  name: true,
                  slug: true,
                },
              },
            },
          });
        });

        // Trigger AI specialist reply if immediate post
        if (!schedDate) {
          replyToPost(post.id).catch((err) => {
            console.warn("[Feed MCP] AI reply trigger skipped:", err);
          });
        }

        const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://taxcomppro.com";
        const postUrl = `${appUrl}/feed?post=${post.id}`;

        return formatSuccess({
          message: schedDate
            ? `Post scheduled successfully for ${schedDate.toISOString()}!`
            : "Post published successfully to the TaxComPro feed!",
          post: {
            id: post.id,
            content: post.content,
            author: post.author.name,
            tier: post.author.tier,
            community: post.community?.name ?? "Public Community Feed",
            isScheduled: Boolean(schedDate),
            scheduledAt: schedDate?.toISOString() ?? null,
            createdAt: post.createdAt.toISOString(),
            postUrl,
          },
        });
      }

      case "get_feed": {
        const limit = Math.min(Math.max(Number(args.limit) || 10, 1), 30);
        const communityId = typeof args.communityId === "string" && args.communityId.trim() ? args.communityId.trim() : null;

        const posts = await prisma.post.findMany({
          where: {
            scheduledAt: null,
            ...(communityId ? { communityId } : {}),
            OR: [
              { communityId: null },
              { community: { isPublic: true } },
              { community: { members: { some: { userId: user.userId } } } },
            ],
          },
          orderBy: { createdAt: "desc" },
          take: limit,
          include: {
            author: {
              select: {
                id: true,
                name: true,
                headline: true,
                tier: true,
                role: true,
              },
            },
            community: {
              select: {
                id: true,
                name: true,
                slug: true,
              },
            },
            comments: {
              take: 3,
              orderBy: { createdAt: "desc" },
              include: {
                author: {
                  select: {
                    id: true,
                    name: true,
                    headline: true,
                  },
                },
              },
            },
            _count: {
              select: {
                likes: true,
                comments: true,
                reposts: true,
              },
            },
          },
        });

        const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://taxcomppro.com";

        return formatSuccess({
          totalRetrieved: posts.length,
          posts: posts.map((p) => ({
            id: p.id,
            author: {
              id: p.author.id,
              name: p.author.name,
              headline: p.author.headline,
              tier: p.author.tier,
            },
            content: p.content,
            hasImages: p.images.length > 0,
            hasVideo: Boolean(p.videoUrl),
            community: p.community?.name ?? "Public Feed",
            stats: {
              likes: p._count.likes,
              comments: p._count.comments,
              reposts: p._count.reposts,
            },
            recentComments: p.comments.map((c) => ({
              id: c.id,
              author: c.author.name,
              content: c.content,
              createdAt: c.createdAt.toISOString(),
            })),
            createdAt: p.createdAt.toISOString(),
            url: `${appUrl}/feed?post=${p.id}`,
          })),
        });
      }

      case "get_my_posts": {
        const limit = Math.min(Math.max(Number(args.limit) || 15, 1), 50);
        const status = args.status || "all";

        let scheduledFilter: any = {};
        if (status === "published") {
          scheduledFilter = { scheduledAt: null };
        } else if (status === "scheduled") {
          scheduledFilter = { scheduledAt: { not: null } };
        }

        const posts = await prisma.post.findMany({
          where: {
            authorId: user.userId,
            ...scheduledFilter,
          },
          orderBy: { createdAt: "desc" },
          take: limit,
          include: {
            community: {
              select: {
                name: true,
                slug: true,
              },
            },
            _count: {
              select: {
                likes: true,
                comments: true,
                reposts: true,
              },
            },
          },
        });

        const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://taxcomppro.com";

        return formatSuccess({
          totalPosts: posts.length,
          posts: posts.map((p) => ({
            id: p.id,
            content: p.content,
            isScheduled: Boolean(p.scheduledAt),
            scheduledAt: p.scheduledAt?.toISOString() ?? null,
            community: p.community?.name ?? "Public Feed",
            stats: {
              likes: p._count.likes,
              comments: p._count.comments,
              reposts: p._count.reposts,
            },
            createdAt: p.createdAt.toISOString(),
            url: `${appUrl}/feed?post=${p.id}`,
          })),
        });
      }

      case "comment_on_post": {
        const postId = typeof args.postId === "string" ? args.postId.trim() : "";
        const content = typeof args.content === "string" ? args.content.trim() : "";

        if (!postId) return formatError("Post ID is required.");
        if (!content || content.length > 5000) {
          return formatError("Comment content must be between 1 and 5,000 characters.");
        }

        if (detectSensitiveData(content)) {
          return formatError(
            `Privacy Warning: ${PRIVACY_REMINDER}. Do not include client SSNs, EINs, or private information in comments.`
          );
        }

        // Verify target post exists and is accessible
        const post = await prisma.post.findUnique({
          where: { id: postId },
          include: {
            community: {
              include: {
                members: { where: { userId: user.userId } },
              },
            },
          },
        });

        if (!post) return formatError("Target post not found.");
        if (post.community && !post.community.isPublic && post.community.members.length === 0) {
          return formatError("You must join this community group to comment on its posts.");
        }

        // Create comment and increment count in transaction
        const comment = await prisma.$transaction(async (tx) => {
          const created = await tx.comment.create({
            data: {
              content,
              authorId: user.userId,
              postId,
            },
            include: {
              author: {
                select: {
                  id: true,
                  name: true,
                  headline: true,
                },
              },
            },
          });

          await tx.post.update({
            where: { id: postId },
            data: { commentCount: { increment: 1 } },
          });

          return created;
        });

        // Trigger AI reply if appropriate
        replyToPost(postId, comment.id).catch((err) => {
          console.warn("[Feed MCP] AI reply trigger skipped:", err);
        });

        return formatSuccess({
          message: "Comment added successfully!",
          comment: {
            id: comment.id,
            postId,
            author: comment.author.name,
            content: comment.content,
            createdAt: comment.createdAt.toISOString(),
          },
        });
      }

      case "like_post": {
        const postId = typeof args.postId === "string" ? args.postId.trim() : "";
        const rawReaction = typeof args.reaction === "string" ? args.reaction.trim().toUpperCase() : "LIKE";

        if (!postId) return formatError("Post ID is required.");
        const reaction = isReaction(rawReaction) ? rawReaction : "LIKE";

        const post = await prisma.post.findUnique({
          where: { id: postId },
          select: { id: true, communityId: true },
        });

        if (!post) return formatError("Post not found.");

        const key = { userId_postId: { userId: user.userId, postId } };

        const result = await prisma.$transaction(async (tx) => {
          const existing = await tx.postLike.findUnique({ where: key });

          let currentReaction: string | null = reaction;
          if (existing && existing.reaction === reaction) {
            // Clicking the same reaction removes it (toggle)
            await tx.postLike.delete({ where: key });
            currentReaction = null;
          } else {
            await tx.postLike.upsert({
              where: key,
              create: { userId: user.userId, postId, reaction },
              update: { reaction },
            });
          }

          const count = await tx.postLike.count({ where: { postId } });
          await tx.post.update({
            where: { id: postId },
            data: { likeCount: count },
          });

          return { reaction: currentReaction, totalLikes: count };
        });

        return formatSuccess({
          message: result.reaction ? `Reacted with ${result.reaction}!` : "Reaction removed.",
          reaction: result.reaction,
          totalLikes: result.totalLikes,
        });
      }

      case "delete_my_post": {
        const postId = typeof args.postId === "string" ? args.postId.trim() : "";
        if (!postId) return formatError("Post ID is required.");

        const post = await prisma.post.findUnique({
          where: { id: postId },
          select: { id: true, authorId: true },
        });

        if (!post) return formatError("Post not found.");
        if (post.authorId !== user.userId) {
          return formatError("Forbidden: You can only delete your own posts.");
        }

        await prisma.post.delete({
          where: { id: postId },
        });

        return formatSuccess({
          message: "Post deleted successfully.",
          deletedPostId: postId,
        });
      }

      default:
        return formatError(`Unknown feed tool: ${name}`);
    }
  } catch (error: any) {
    return formatError(`Feed tool error [${name}]: ${error.message || String(error)}`);
  }
}

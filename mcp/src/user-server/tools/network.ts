import { prisma } from "../../common/db";
import { UserSessionContext, formatSuccess, formatError, McpToolResponse } from "../../common/types";

export const networkToolDefinitions = [
  {
    name: "list_my_networks",
    description: "List all ProNetworks the user has joined, created, or follows.",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "get_network_details",
    description: "Get detailed information about a ProNetwork, its creator, active announcements, and member counts.",
    inputSchema: {
      type: "object",
      properties: {
        networkIdOrSlug: { type: "string", description: "ProNetwork ID or slug" },
      },
      required: ["networkIdOrSlug"],
    },
  },
  {
    name: "get_network_discussions",
    description: "Fetch discussion threads in a ProNetwork with recent replies.",
    inputSchema: {
      type: "object",
      properties: {
        networkId: { type: "string", description: "ProNetwork ID" },
        limit: { type: "number", description: "Max discussions to return (default: 15)" },
      },
      required: ["networkId"],
    },
  },
  {
    name: "post_discussion",
    description: "Start a new discussion topic or question in a ProNetwork.",
    inputSchema: {
      type: "object",
      properties: {
        networkId: { type: "string", description: "ProNetwork ID" },
        title: { type: "string", description: "Discussion title / question" },
        content: { type: "string", description: "Discussion text content" },
        category: { type: "string", description: "Optional category tag (e.g. 'Tax Law', 'Software', 'General')" },
      },
      required: ["networkId", "title", "content"],
    },
  },
  {
    name: "reply_to_discussion",
    description: "Reply to an existing ProNetwork discussion thread.",
    inputSchema: {
      type: "object",
      properties: {
        discussionId: { type: "string", description: "Discussion ID" },
        content: { type: "string", description: "Reply text content" },
      },
      required: ["discussionId", "content"],
    },
  },
  {
    name: "list_network_events",
    description: "List upcoming ProTalks, live classes, workshops, and webinars scheduled in a ProNetwork.",
    inputSchema: {
      type: "object",
      properties: {
        networkId: { type: "string", description: "ProNetwork ID" },
      },
      required: ["networkId"],
    },
  },
  {
    name: "rsvp_to_network_event",
    description: "RSVP to a ProNetwork event (attending, maybe, not attending).",
    inputSchema: {
      type: "object",
      properties: {
        eventId: { type: "string", description: "ProNetwork Event ID" },
        status: { type: "string", enum: ["GOING", "MAYBE", "NOT_GOING"], description: "RSVP status" },
      },
      required: ["eventId", "status"],
    },
  },
];

export async function handleNetworkTool(
  toolName: string,
  args: any,
  user: UserSessionContext
): Promise<McpToolResponse> {
  try {
    switch (toolName) {
      case "list_my_networks": {
        const memberships = await prisma.proNetworkMember.findMany({
          where: { userId: user.userId },
          include: {
            network: {
              include: {
                _count: {
                  select: { members: true, discussions: true, events: true },
                },
              },
            },
          },
          orderBy: { joinedAt: "desc" },
        });

        const createdNetworks = await prisma.proNetwork.findMany({
          where: { ownerId: user.userId },
          include: {
            _count: {
              select: { members: true, discussions: true, events: true },
            },
          },
        });

        return formatSuccess({
          joined: memberships.map((m) => ({
            role: m.role,
            joinedAt: m.joinedAt,
            network: m.network,
          })),
          owned: createdNetworks,
        });
      }

      case "get_network_details": {
        const { networkIdOrSlug } = args;
        const network = await prisma.proNetwork.findFirst({
          where: {
            OR: [{ id: networkIdOrSlug }, { slug: networkIdOrSlug }],
          },
          include: {
            owner: { select: { id: true, name: true, image: true } },
            announcements: {
              orderBy: { createdAt: "desc" },
              take: 5,
            },
            _count: {
              select: { members: true, discussions: true, events: true, resources: true },
            },
          },
        });

        if (!network) return formatError(`ProNetwork not found: ${networkIdOrSlug}`);
        return formatSuccess(network);
      }

      case "get_network_discussions": {
        const { networkId, limit = 15 } = args;
        const discussions = await prisma.proNetworkDiscussion.findMany({
          where: { networkId },
          include: {
            author: { select: { id: true, name: true, image: true } },
            replies: {
              take: 3,
              orderBy: { createdAt: "desc" },
              include: {
                author: { select: { id: true, name: true, image: true } },
              },
            },
          },
          orderBy: [{ isPinned: "desc" }, { createdAt: "desc" }],
          take: Number(limit),
        });

        return formatSuccess(discussions);
      }

      case "post_discussion": {
        const { networkId, title, content, category } = args;
        const discussion = await prisma.proNetworkDiscussion.create({
          data: {
            networkId,
            authorId: user.userId,
            title,
            content,
            category: category || "General",
          },
        });

        return formatSuccess(discussion, "Discussion posted successfully");
      }

      case "reply_to_discussion": {
        const { discussionId, content } = args;
        const reply = await prisma.$transaction(async (tx) => {
          const r = await tx.proNetworkDiscussionReply.create({
            data: {
              discussionId,
              authorId: user.userId,
              content,
            },
          });
          await tx.proNetworkDiscussion.update({
            where: { id: discussionId },
            data: { replyCount: { increment: 1 } },
          });
          return r;
        });

        return formatSuccess(reply, "Reply posted successfully");
      }

      case "list_network_events": {
        const { networkId } = args;
        const events = await prisma.proNetworkEvent.findMany({
          where: { networkId },
          include: {
            host: { select: { id: true, name: true } },
            _count: { select: { rsvps: true } },
          },
          orderBy: { scheduledAt: "asc" },
        });

        return formatSuccess(events);
      }

      case "rsvp_to_network_event": {
        const { eventId, status } = args;
        const rsvp = await prisma.proNetworkEventRsvp.upsert({
          where: {
            eventId_userId: {
              eventId,
              userId: user.userId,
            },
          },
          update: { status },
          create: {
            eventId,
            userId: user.userId,
            status,
          },
        });

        return formatSuccess(rsvp, `RSVP set to ${status}`);
      }

      default:
        return formatError(`Unknown network tool: ${toolName}`);
    }
  } catch (error: any) {
    return formatError(error.message || "Error executing network tool", error);
  }
}


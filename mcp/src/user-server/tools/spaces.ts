import { prisma } from "../../common/db";
import { UserSessionContext, formatSuccess, formatError, McpToolResponse } from "../../common/types";

export const spaceToolDefinitions = [
  {
    name: "list_upcoming_spaces",
    description: "Browse live ProTalks, audio/video spaces, webinars, and masterminds scheduled on TaxComPro.",
    inputSchema: {
      type: "object",
      properties: {
        category: { type: "string", description: "Optional category filter" },
        liveOnly: { type: "boolean", description: "Only show currently live spaces" },
      },
    },
  },
  {
    name: "get_space_details",
    description: "Get full details, host information, ticket capacity, and agenda for a ProTalk space.",
    inputSchema: {
      type: "object",
      properties: {
        spaceId: { type: "string", description: "Space ID" },
      },
      required: ["spaceId"],
    },
  },
  {
    name: "rsvp_to_space",
    description: "RSVP to a free or public ProTalk space.",
    inputSchema: {
      type: "object",
      properties: {
        spaceId: { type: "string", description: "Space ID" },
      },
      required: ["spaceId"],
    },
  },
  {
    name: "get_my_space_tickets",
    description: "View all tickets purchased or reserved by the user for ProTalk spaces.",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
];

export async function handleSpaceTool(
  toolName: string,
  args: any,
  user: UserSessionContext
): Promise<McpToolResponse> {
  try {
    switch (toolName) {
      case "list_upcoming_spaces": {
        const { category, liveOnly } = args;

        const where: any = {};
        if (category) where.category = category;
        if (liveOnly) {
          where.isLive = true;
        } else {
          where.OR = [
            { isLive: true },
            { scheduledAt: { gte: new Date() } },
          ];
        }

        const spaces = await prisma.space.findMany({
          where,
          include: {
            host: { select: { id: true, name: true, image: true } },
            _count: { select: { rsvps: true, reports: true } },
          },
          orderBy: [{ isLive: "desc" }, { scheduledAt: "asc" }],
          take: 20,
        });

        return formatSuccess(spaces);
      }

      case "get_space_details": {
        const { spaceId } = args;
        const space = await prisma.space.findUnique({
          where: { id: spaceId },
          include: {
            host: { select: { id: true, name: true, image: true, email: true } },
            rsvps: {
              where: { userId: user.userId },
              take: 1,
            },
            _count: { select: { rsvps: true, reports: true } },
          },
        });

        if (!space) return formatError(`Space not found: ${spaceId}`);

        const tickets = await prisma.spaceTicket.findMany({
          where: { spaceId, userId: user.userId },
          take: 1,
        });

        return formatSuccess({
          ...space,
          userStatus: {
            hasRsvp: space.rsvps.length > 0,
            hasTicket: tickets.length > 0,
            ticket: tickets[0] || null,
          },
        });
      }

      case "rsvp_to_space": {
        const { spaceId } = args;
        const space = await prisma.space.findUnique({ where: { id: spaceId } });
        if (!space) return formatError(`Space not found: ${spaceId}`);

        const rsvp = await prisma.spaceRsvp.upsert({
          where: {
            spaceId_userId: {
              spaceId,
              userId: user.userId,
            },
          },
          update: {},
          create: {
            spaceId,
            userId: user.userId,
            name: user.name || user.email,
            email: user.email,
          },
        });

        return formatSuccess(
          {
            rsvpId: rsvp.id,
            spaceName: space.name,
            scheduledAt: space.scheduledAt,
          },
          "Successfully registered RSVP for ProTalk space."
        );
      }

      case "get_my_space_tickets": {
        const tickets = await prisma.spaceTicket.findMany({
          where: { userId: user.userId },
          orderBy: { createdAt: "desc" },
        });

        return formatSuccess(tickets);
      }

      default:
        return formatError(`Unknown space tool: ${toolName}`);
    }
  } catch (error: any) {
    return formatError(error.message || "Error executing space tool", error);
  }
}

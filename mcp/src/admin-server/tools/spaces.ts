import { prisma } from "../../common/db";
import { AdminSessionContext, formatSuccess, formatError, McpToolResponse } from "../../common/types";

export const adminSpaceToolDefinitions = [
  {
    name: "admin_list_spaces",
    description: "List all ProTalk spaces, filter by live status or upcoming.",
    inputSchema: {
      type: "object",
      properties: {
        isLive: { type: "boolean" },
      },
    },
  },
  {
    name: "admin_create_space",
    description: "Schedule or create a new live ProTalk space.",
    inputSchema: {
      type: "object",
      properties: {
        name: { type: "string", description: "Space title / topic" },
        description: { type: "string" },
        category: { type: "string", description: "Category (e.g. Mastermind, Due Diligence, Case Study)" },
        scheduledAt: { type: "string", description: "ISO timestamp for scheduled start" },
        ticketPrice: { type: "number", description: "0 for free, or ticket price in USD" },
        ticketCapacity: { type: "number", description: "Max capacity (default: 50)" },
      },
      required: ["name"],
    },
  },
  {
    name: "admin_get_space_attendance",
    description: "Get complete attendance roster and tickets for a specific space.",
    inputSchema: {
      type: "object",
      properties: {
        spaceId: { type: "string", description: "Space ID" },
      },
      required: ["spaceId"],
    },
  },
  {
    name: "admin_close_space",
    description: "End a live space session.",
    inputSchema: {
      type: "object",
      properties: {
        spaceId: { type: "string", description: "Space ID" },
      },
      required: ["spaceId"],
    },
  },
];

export async function handleAdminSpaceTool(
  toolName: string,
  args: any,
  admin: AdminSessionContext
): Promise<McpToolResponse> {
  try {
    switch (toolName) {
      case "admin_list_spaces": {
        const { isLive } = args;
        const spaces = await prisma.space.findMany({
          where: {
            ...(isLive !== undefined ? { isLive: Boolean(isLive) } : {}),
          },
          include: {
            host: { select: { id: true, name: true, email: true } },
            _count: { select: { rsvps: true, reports: true } },
          },
          orderBy: { createdAt: "desc" },
        });

        return formatSuccess(spaces);
      }

      case "admin_create_space": {
        const { name, description, category, scheduledAt, ticketPrice = 0, ticketCapacity = 50 } = args;

        const roomName = `room_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        const shareToken = Math.random().toString(36).substring(2, 10);

        const space = await prisma.space.create({
          data: {
            name,
            description,
            category: category || "Open Discussion",
            hostId: admin.adminId,
            roomName,
            shareToken,
            scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
            isLive: !scheduledAt,
            ticketPrice: Number(ticketPrice),
            ticketCapacity: Number(ticketCapacity),
            visibility: Number(ticketPrice) > 0 ? "TICKETED" : "PUBLIC",
            accessType: Number(ticketPrice) > 0 ? "TICKETED" : "PUBLIC",
          },
        });

        return formatSuccess(space, `Space '${space.name}' created successfully.`);
      }

      case "admin_get_space_attendance": {
        const { spaceId } = args;
        const attendees = await prisma.spaceAttendance.findMany({
          where: { spaceId },
          include: {
            user: { select: { id: true, name: true, email: true } },
          },
          orderBy: { joinedAt: "asc" },
        });

        const tickets = await prisma.spaceTicket.findMany({
          where: { spaceId },
          orderBy: { createdAt: "asc" },
        });

        return formatSuccess({
          totalAttendees: attendees.length,
          attendees,
          ticketsIssued: tickets.length,
          tickets,
        });
      }

      case "admin_close_space": {
        const { spaceId } = args;
        const updated = await prisma.space.update({
          where: { id: spaceId },
          data: { isLive: false },
        });

        return formatSuccess(updated, `Space ${spaceId} is now closed.`);
      }

      default:
        return formatError(`Unknown admin space tool: ${toolName}`);
    }
  } catch (error: any) {
    return formatError(error.message || "Error executing admin space tool", error);
  }
}

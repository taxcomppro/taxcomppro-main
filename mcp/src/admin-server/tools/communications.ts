import { prisma } from "../../common/db";
import { AdminSessionContext, formatSuccess, formatError, McpToolResponse } from "../../common/types";

export const adminCommunicationsToolDefinitions = [
  {
    name: "admin_list_support_tickets",
    description: "List all support tickets across TaxComPro with status filters (OPEN, IN_PROGRESS, RESOLVED, CLOSED).",
    inputSchema: {
      type: "object",
      properties: {
        status: { type: "string", description: "Status filter" },
        limit: { type: "number", description: "Max tickets (default: 25)" },
      },
    },
  },
  {
    name: "admin_update_support_ticket",
    description: "Update a support ticket's status and add internal feedback or resolution notes.",
    inputSchema: {
      type: "object",
      properties: {
        ticketId: { type: "string", description: "Ticket ID" },
        status: { type: "string", enum: ["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"], description: "New status" },
        feedback: { type: "string", description: "Admin feedback or resolution notes" },
      },
      required: ["ticketId", "status"],
    },
  },
  {
    name: "admin_list_email_templates",
    description: "View system transactional email templates and HTML content.",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "admin_create_message_blast",
    description: "Create an admin message broadcast to members.",
    inputSchema: {
      type: "object",
      properties: {
        subject: { type: "string", description: "Broadcast subject" },
        content: { type: "string", description: "Message body" },
        filterRoles: { type: "array", items: { type: "string" }, description: "Role filters (MEMBER, ADMIN, etc.)" },
      },
      required: ["subject", "content"],
    },
  },
];

export async function handleAdminCommunicationsTool(
  toolName: string,
  args: any,
  admin: AdminSessionContext
): Promise<McpToolResponse> {
  try {
    switch (toolName) {
      case "admin_list_support_tickets": {
        const { status, limit = 25 } = args;
        const tickets = await prisma.supportTicket.findMany({
          where: {
            ...(status ? { status } : {}),
          },
          orderBy: { createdAt: "desc" },
          take: Number(limit),
        });

        return formatSuccess(tickets);
      }

      case "admin_update_support_ticket": {
        const { ticketId, status, feedback } = args;
        const updated = await prisma.supportTicket.update({
          where: { id: ticketId },
          data: {
            status,
            ...(feedback !== undefined ? { feedback } : {}),
          },
        });

        return formatSuccess(updated, `Ticket ${ticketId} updated to ${status}.`);
      }

      case "admin_list_email_templates": {
        const templates = await prisma.emailTemplate.findMany({
          orderBy: { name: "asc" },
        });

        return formatSuccess(templates);
      }

      case "admin_create_message_blast": {
        const { subject, content, filterRoles = [] } = args;

        const recipientCount = await prisma.user.count({
          where: filterRoles.length > 0 ? { role: { in: filterRoles } } : {},
        });

        const blast = await prisma.messageBlast.create({
          data: {
            senderId: admin.adminId,
            subject,
            content,
            filterRoles,
            filterCities: [],
            filterStates: [],
            recipientCount,
            priceUsd: 0,
            status: "APPROVED",
            blastMonth: new Date().toISOString().substring(0, 7),
            deliveredAt: new Date(),
          },
        });

        return formatSuccess(blast, `Broadcast '${blast.subject}' dispatched to ${recipientCount} users.`);
      }

      default:
        return formatError(`Unknown admin communications tool: ${toolName}`);
    }
  } catch (error: any) {
    return formatError(error.message || "Error executing admin communications tool", error);
  }
}


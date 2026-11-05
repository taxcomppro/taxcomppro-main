import { prisma } from "../../common/db";
import { UserSessionContext, formatSuccess, formatError, McpToolResponse } from "../../common/types";

export const profileToolDefinitions = [
  {
    name: "get_my_profile",
    description: "Get the current authenticated user's profile, tier, credentials, and settings on TaxComPro.",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "update_my_profile",
    description: "Update the authenticated user's profile information (name, bio, firm, website, title, phone).",
    inputSchema: {
      type: "object",
      properties: {
        name: { type: "string", description: "Full name" },
      },
    },
  },
  {
    name: "get_my_subscriptions",
    description: "Check current active TaxComPro subscription, tier status (FREE, VIP, MARKETPLACE, MARKETPLACE_PLUS), and billing details.",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "list_my_notifications",
    description: "List notifications for the authenticated user, optionally filtering by read status.",
    inputSchema: {
      type: "object",
      properties: {
        unreadOnly: { type: "boolean", description: "Only return unread notifications (default: false)" },
        limit: { type: "number", description: "Maximum number of notifications to return (default: 20)" },
      },
    },
  },
  {
    name: "mark_notification_read",
    description: "Mark a specific notification or all notifications as read.",
    inputSchema: {
      type: "object",
      properties: {
        notificationId: { type: "string", description: "ID of notification to mark read. If omitted, marks all read." },
      },
    },
  },
];

export async function handleProfileTool(
  toolName: string,
  args: any,
  user: UserSessionContext
): Promise<McpToolResponse> {
  try {
    switch (toolName) {
      case "get_my_profile": {
        const fullUser = await prisma.user.findUnique({
          where: { id: user.userId },
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
            tier: true,
            image: true,
            emailVerified: true,
            createdAt: true,
            updatedAt: true,
            subscription: true,
            _count: {
              select: {
                enrollments: true,
                toolkitPurchases: true,
                trainingLicenses: true,
                marketplacePurchases: true,
                listings: true,
                communityMembers: true,
                spaceRsvps: true,
              },
            },
          },
        });
        if (!fullUser) return formatError("User not found");
        return formatSuccess(fullUser);
      }

      case "update_my_profile": {
        const { name } = args;
        const updated = await prisma.user.update({
          where: { id: user.userId },
          data: {
            ...(name !== undefined ? { name } : {}),
          },
        });
        return formatSuccess(updated, "Profile updated successfully");
      }

      case "get_my_subscriptions": {
        const sub = await prisma.subscription.findUnique({
          where: { userId: user.userId },
        });

        return formatSuccess({
          tier: user.tier,
          subscription: sub,
        });
      }

      case "list_my_notifications": {
        const unreadOnly = Boolean(args.unreadOnly);
        const limit = Number(args.limit) || 20;

        const notifications = await prisma.notification.findMany({
          where: {
            userId: user.userId,
            ...(unreadOnly ? { isRead: false } : {}),
          },
          orderBy: { createdAt: "desc" },
          take: limit,
        });

        return formatSuccess(notifications);
      }

      case "mark_notification_read": {
        const notificationId = args.notificationId;
        if (notificationId) {
          await prisma.notification.updateMany({
            where: { id: notificationId, userId: user.userId },
            data: { isRead: true },
          });
          return formatSuccess(null, `Notification ${notificationId} marked as read`);
        } else {
          const res = await prisma.notification.updateMany({
            where: { userId: user.userId, isRead: false },
            data: { isRead: true },
          });
          return formatSuccess(null, `Marked ${res.count} notifications as read`);
        }
      }

      default:
        return formatError(`Unknown profile tool: ${toolName}`);
    }
  } catch (error: any) {
    return formatError(error.message || "Error executing profile tool", error);
  }
}

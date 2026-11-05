import { prisma } from "../../common/db";
import { AdminSessionContext, formatSuccess, formatError, McpToolResponse } from "../../common/types";

export const adminUserToolDefinitions = [
  {
    name: "admin_list_users",
    description: "Search and paginate through TaxComPro users with filters for tier, role, or name/email query.",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Search by email or name" },
        role: { type: "string", enum: ["MEMBER", "ADMIN"], description: "Role filter" },
        tier: { type: "string", enum: ["FREE", "VIP", "MARKETPLACE", "MARKETPLACE_PLUS"], description: "Tier filter" },
        limit: { type: "number", description: "Number of records to return (default: 20)" },
        page: { type: "number", description: "Page number (default: 1)" },
      },
    },
  },
  {
    name: "admin_get_user_details",
    description: "Get complete 360-degree view of a user: profile, purchases, courses, licenses, digital card, and affiliate status.",
    inputSchema: {
      type: "object",
      properties: {
        userIdOrEmail: { type: "string", description: "User ID or Email address" },
      },
      required: ["userIdOrEmail"],
    },
  },
  {
    name: "admin_update_user_role",
    description: "Promote or demote a user role between MEMBER and ADMIN.",
    inputSchema: {
      type: "object",
      properties: {
        userId: { type: "string", description: "User ID" },
        role: { type: "string", enum: ["MEMBER", "ADMIN"], description: "New role" },
      },
      required: ["userId", "role"],
    },
  },
  {
    name: "admin_update_user_tier",
    description: "Change a user's subscription tier (FREE, VIP, MARKETPLACE, MARKETPLACE_PLUS).",
    inputSchema: {
      type: "object",
      properties: {
        userId: { type: "string", description: "User ID" },
        tier: { type: "string", enum: ["FREE", "VIP", "MARKETPLACE", "MARKETPLACE_PLUS"], description: "New tier" },
      },
      required: ["userId", "tier"],
    },
  },
  {
    name: "admin_grant_toolkit_access",
    description: "Manually grant a user access to a TaxComPro toolkit (e.g. 'irs-fine-defense', 'schedule-c-reconstruction', 'audit-playbook', 'ultimate-bundle').",
    inputSchema: {
      type: "object",
      properties: {
        userId: { type: "string", description: "User ID" },
        toolkitId: { type: "string", description: "Toolkit ID or slug" },
      },
      required: ["userId", "toolkitId"],
    },
  },
];

export async function handleAdminUserTool(
  toolName: string,
  args: any,
  admin: AdminSessionContext
): Promise<McpToolResponse> {
  try {
    switch (toolName) {
      case "admin_list_users": {
        const { query, role, tier, limit = 20, page = 1 } = args;
        const take = Number(limit);
        const skip = (Number(page) - 1) * take;

        const where: any = {};
        if (role) where.role = role;
        if (tier) where.tier = tier;
        if (query) {
          where.OR = [
            { email: { contains: query, mode: "insensitive" } },
            { name: { contains: query, mode: "insensitive" } },
          ];
        }

        const [total, users] = await Promise.all([
          prisma.user.count({ where }),
          prisma.user.findMany({
            where,
            select: {
              id: true,
              email: true,
              name: true,
              role: true,
              tier: true,
              image: true,
              createdAt: true,
              _count: {
                select: {
                  enrollments: true,
                  toolkitPurchases: true,
                  trainingLicenses: true,
                  marketplacePurchases: true,
                },
              },
            },
            orderBy: { createdAt: "desc" },
            take,
            skip,
          }),
        ]);

        return formatSuccess({
          total,
          page: Number(page),
          totalPages: Math.ceil(total / take),
          users,
        });
      }

      case "admin_get_user_details": {
        const { userIdOrEmail } = args;
        const user = await prisma.user.findFirst({
          where: {
            OR: [{ id: userIdOrEmail }, { email: userIdOrEmail }],
          },
          include: {
            subscription: true,
            toolkitPurchases: { orderBy: { createdAt: "desc" } },
            trainingLicenses: {
              include: { _count: { select: { invitations: true } } },
            },
            enrollments: {
              include: { course: { select: { id: true, title: true, slug: true } } },
            },
            digitalCard: true,
            affiliateProfile: true,
          },
        });

        if (!user) return formatError(`User not found: ${userIdOrEmail}`);
        return formatSuccess(user);
      }

      case "admin_update_user_role": {
        const { userId, role } = args;
        const updated = await prisma.user.update({
          where: { id: userId },
          data: { role },
          select: { id: true, email: true, name: true, role: true },
        });

        return formatSuccess(updated, `User role changed to ${role}`);
      }

      case "admin_update_user_tier": {
        const { userId, tier } = args;
        const updated = await prisma.user.update({
          where: { id: userId },
          data: { tier },
          select: { id: true, email: true, name: true, tier: true },
        });

        return formatSuccess(updated, `User tier changed to ${tier}`);
      }

      case "admin_grant_toolkit_access": {
        const { userId, toolkitId } = args;
        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user) return formatError(`User not found: ${userId}`);

        let purchase = await prisma.toolkitPurchase.findFirst({
          where: { userId, toolkitId },
        });

        if (!purchase) {
          purchase = await prisma.toolkitPurchase.create({
            data: {
              userId,
              toolkitId,
              stripeSessionId: `admin_grant_${Date.now()}_${toolkitId}`,
            },
          });
        }

        return formatSuccess(purchase, `Access to toolkit '${toolkitId}' granted to ${user.email}`);
      }

      default:
        return formatError(`Unknown admin user tool: ${toolName}`);
    }
  } catch (error: any) {
    return formatError(error.message || "Error executing admin user tool", error);
  }
}

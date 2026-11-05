import { prisma } from "../../common/db";
import { AdminSessionContext, formatSuccess, formatError, McpToolResponse } from "../../common/types";

export const adminAnalyticsToolDefinitions = [
  {
    name: "admin_get_platform_stats",
    description: "Get executive-level metrics and KPIs: user counts, active subscriptions, tier distribution, pending approvals, revenue overview.",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "admin_get_activity_logs",
    description: "Get recent administrative and academy audit logs.",
    inputSchema: {
      type: "object",
      properties: {
        limit: { type: "number", description: "Maximum entries to return (default: 25)" },
      },
    },
  },
];

export async function handleAdminAnalyticsTool(
  toolName: string,
  args: any,
  admin: AdminSessionContext
): Promise<McpToolResponse> {
  try {
    switch (toolName) {
      case "admin_get_platform_stats": {
        const now = new Date();
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

        const [
          totalUsers,
          newUsersWeek,
          totalListings,
          pendingListings,
          totalSubscriptions,
          activeSubscriptions,
          totalToolkitsSold,
          totalLicensesIssued,
          pendingPayouts,
          openSupportTickets,
          unansweredQuestions,
        ] = await Promise.all([
          prisma.user.count(),
          prisma.user.count({ where: { createdAt: { gte: weekAgo } } }),
          prisma.marketplaceListing.count(),
          prisma.marketplaceListing.count({ where: { status: "PENDING" } }),
          prisma.subscription.count(),
          prisma.subscription.count({ where: { status: "active" } }),
          prisma.toolkitPurchase.count(),
          prisma.trainingLicense.count(),
          prisma.affiliatePayout.count({ where: { status: "PENDING" } }),
          prisma.supportTicket.count({ where: { status: "OPEN" } }),
          prisma.atlasUnansweredQuestion.count(),
        ]);

        const tierCounts = await prisma.user.groupBy({
          by: ["tier"],
          _count: { tier: true },
        });

        return formatSuccess({
          overview: {
            totalUsers,
            newUsersPast7Days: newUsersWeek,
            totalSubscriptions,
            activeSubscriptions,
            totalToolkitsSold,
            totalLicensesIssued,
          },
          actionRequiredQueue: {
            pendingMarketplaceListings: pendingListings,
            pendingAffiliatePayouts: pendingPayouts,
            openSupportTickets,
            unansweredAtlasQuestions: unansweredQuestions,
          },
          userTierBreakdown: tierCounts.map((t) => ({ tier: t.tier, count: t._count.tier })),
        });
      }

      case "admin_get_activity_logs": {
        const limit = Number(args.limit || 25);
        const logs = await prisma.academyAuditLog.findMany({
          orderBy: { createdAt: "desc" },
          take: limit,
        });

        return formatSuccess(logs);
      }

      default:
        return formatError(`Unknown analytics tool: ${toolName}`);
    }
  } catch (error: any) {
    return formatError(error.message || "Error executing admin analytics tool", error);
  }
}


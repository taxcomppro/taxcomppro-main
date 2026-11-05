import { prisma } from "../../common/db.js";
import { AdminSessionContext, formatSuccess, formatError, McpToolResponse } from "../../common/types.js";

export const adminAffiliateToolDefinitions = [
  {
    name: "admin_list_affiliates",
    description: "List all affiliate partners, total earnings, pending balances, and referral counts.",
    inputSchema: {
      type: "object",
      properties: {
        limit: { type: "number", description: "Max results (default: 25)" },
      },
    },
  },
  {
    name: "admin_list_pending_payouts",
    description: "List all pending affiliate payout requests awaiting administrative settlement.",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "admin_process_payout",
    description: "Approve, mark paid, or reject an affiliate payout request.",
    inputSchema: {
      type: "object",
      properties: {
        payoutId: { type: "string", description: "AffiliatePayout ID" },
        status: { type: "string", enum: ["APPROVED", "PAID", "REJECTED"], description: "New payout status" },
        note: { type: "string", description: "Admin note or payment reference / transaction ID" },
      },
      required: ["payoutId", "status"],
    },
  },
  {
    name: "admin_update_affiliate_settings",
    description: "Update platform affiliate program configuration (default commissions %, cookie days, min payout).",
    inputSchema: {
      type: "object",
      properties: {
        commissionVip: { type: "number", description: "VIP tier commission %" },
        commissionMarketplace: { type: "number", description: "Marketplace commission %" },
        commissionPlus: { type: "number", description: "Marketplace Plus commission %" },
        cookieDays: { type: "number", description: "Attribution cookie days (e.g. 30)" },
        minPayoutAmount: { type: "number", description: "Minimum payout threshold in USD (e.g. 50)" },
        programEnabled: { type: "boolean", description: "Enable/disable affiliate program" },
      },
    },
  },
];

export async function handleAdminAffiliateTool(
  toolName: string,
  args: any,
  admin: AdminSessionContext
): Promise<McpToolResponse> {
  try {
    switch (toolName) {
      case "admin_list_affiliates": {
        const limit = Number(args.limit || 25);
        const affiliates = await prisma.affiliateProfile.findMany({
          include: {
            user: { select: { id: true, name: true, email: true } },
            _count: { select: { referrals: true, payouts: true } },
          },
          orderBy: { totalEarned: "desc" },
          take: limit,
        });

        return formatSuccess(affiliates);
      }

      case "admin_list_pending_payouts": {
        const payouts = await prisma.affiliatePayout.findMany({
          where: { status: "PENDING" },
          include: {
            affiliate: {
              include: {
                user: { select: { id: true, name: true, email: true } },
              },
            },
          },
          orderBy: { createdAt: "asc" },
        });

        return formatSuccess(payouts);
      }

      case "admin_process_payout": {
        const { payoutId, status, note } = args;

        const payout = await prisma.affiliatePayout.findUnique({
          where: { id: payoutId },
          include: { affiliate: true },
        });

        if (!payout) return formatError(`Payout request not found: ${payoutId}`);

        if (status === "PAID") {
          await prisma.$transaction([
            prisma.affiliatePayout.update({
              where: { id: payoutId },
              data: {
                status: "PAID",
                note: note || payout.note,
              },
            }),
            prisma.affiliateProfile.update({
              where: { id: payout.affiliateId },
              data: {
                totalPaid: { increment: payout.amount },
              },
            }),
          ]);
        } else if (status === "REJECTED") {
          await prisma.$transaction([
            prisma.affiliatePayout.update({
              where: { id: payoutId },
              data: {
                status: "REJECTED",
                note: note || "Payout request rejected by admin",
              },
            }),
            prisma.affiliateProfile.update({
              where: { id: payout.affiliateId },
              data: {
                pendingBalance: { increment: payout.amount },
              },
            }),
          ]);
        } else {
          await prisma.affiliatePayout.update({
            where: { id: payoutId },
            data: { status: "APPROVED", note },
          });
        }

        return formatSuccess(null, `Payout ${payoutId} has been updated to ${status}.`);
      }

      case "admin_update_affiliate_settings": {
        const {
          commissionVip,
          commissionMarketplace,
          commissionPlus,
          cookieDays,
          minPayoutAmount,
          programEnabled,
        } = args;

        const existing = await prisma.affiliateSettings.findFirst();

        const updated = existing
          ? await prisma.affiliateSettings.update({
              where: { id: existing.id },
              data: {
                ...(commissionVip !== undefined ? { commissionVip: Number(commissionVip) } : {}),
                ...(commissionMarketplace !== undefined ? { commissionMarketplace: Number(commissionMarketplace) } : {}),
                ...(commissionPlus !== undefined ? { commissionPlus: Number(commissionPlus) } : {}),
                ...(cookieDays !== undefined ? { cookieDays: Number(cookieDays) } : {}),
                ...(minPayoutAmount !== undefined ? { minPayoutAmount: Number(minPayoutAmount) } : {}),
                ...(programEnabled !== undefined ? { programEnabled: Boolean(programEnabled) } : {}),
              },
            })
          : await prisma.affiliateSettings.create({
              data: {
                commissionVip: Number(commissionVip ?? 10),
                commissionMarketplace: Number(commissionMarketplace ?? 15),
                commissionPlus: Number(commissionPlus ?? 20),
                cookieDays: Number(cookieDays ?? 30),
                minPayoutAmount: Number(minPayoutAmount ?? 50),
                programEnabled: programEnabled !== undefined ? Boolean(programEnabled) : true,
              },
            });

        return formatSuccess(updated, "Affiliate settings updated.");
      }

      default:
        return formatError(`Unknown admin affiliate tool: ${toolName}`);
    }
  } catch (error: any) {
    return formatError(error.message || "Error executing admin affiliate tool", error);
  }
}

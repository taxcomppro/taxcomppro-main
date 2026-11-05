import { prisma } from "../../common/db.js";
import { AdminSessionContext } from "../../common/types.js";

export const adminResourceDefinitions = [
  {
    uri: "taxcomppro://admin/dashboard",
    name: "Executive Platform Dashboard",
    description: "Real-time key performance indicators, user tiers, and platform statistics in JSON format",
    mimeType: "application/json",
  },
  {
    uri: "taxcomppro://admin/pending-queue",
    name: "Moderation & Approvals Queue",
    description: "Aggregated pending actions: listings, payouts, support tickets, and unanswered questions",
    mimeType: "application/json",
  },
];

export async function handleAdminResourceRead(
  uri: string,
  admin: AdminSessionContext
): Promise<{ uri: string; mimeType: string; text: string }> {
  switch (uri) {
    case "taxcomppro://admin/dashboard": {
      const [usersCount, subCount, listingsCount, spacesCount] = await Promise.all([
        prisma.user.count(),
        prisma.subscription.count({ where: { status: "active" } }),
        prisma.marketplaceListing.count({ where: { status: "APPROVED" } }),
        prisma.space.count({ where: { isLive: true } }),
      ]);

      const data = {
        totalUsers: usersCount,
        activeSubscriptions: subCount,
        activeListings: listingsCount,
        liveSpaces: spacesCount,
        timestamp: new Date().toISOString(),
      };

      return {
        uri,
        mimeType: "application/json",
        text: JSON.stringify(data, null, 2),
      };
    }

    case "taxcomppro://admin/pending-queue": {
      const [pendingListings, pendingPayouts, openTickets, unansweredAtlas] = await Promise.all([
        prisma.marketplaceListing.findMany({ where: { status: "PENDING" }, take: 10 }),
        prisma.affiliatePayout.findMany({ where: { status: "PENDING" }, take: 10 }),
        prisma.supportTicket.findMany({ where: { status: "OPEN" }, take: 10 }),
        prisma.atlasUnansweredQuestion.findMany({ take: 10 }),
      ]);

      const data = {
        pendingListings,
        pendingPayouts,
        openTickets,
        unansweredAtlas,
      };

      return {
        uri,
        mimeType: "application/json",
        text: JSON.stringify(data, null, 2),
      };
    }

    default:
      throw new Error(`Resource not found: ${uri}`);
  }
}


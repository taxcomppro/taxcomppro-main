import { prisma } from "../../common/db";
import { AdminSessionContext, formatSuccess, formatError, McpToolResponse } from "../../common/types";

export const adminModerationToolDefinitions = [
  {
    name: "admin_list_pending_listings",
    description: "List marketplace product/service listings awaiting administrative moderation.",
    inputSchema: {
      type: "object",
      properties: {
        limit: { type: "number", description: "Max listings (default: 20)" },
      },
    },
  },
  {
    name: "admin_moderate_listing",
    description: "Approve or reject a marketplace listing.",
    inputSchema: {
      type: "object",
      properties: {
        listingId: { type: "string", description: "Listing ID" },
        action: { type: "string", enum: ["APPROVE", "REJECT"], description: "Moderation action" },
      },
      required: ["listingId", "action"],
    },
  },
  {
    name: "admin_list_featured_requests",
    description: "List requests from vendors to feature their marketplace listings.",
    inputSchema: {
      type: "object",
      properties: {
        pendingOnly: { type: "boolean", description: "Only show pending requests" },
      },
    },
  },
  {
    name: "admin_moderate_featured_request",
    description: "Approve or reject a featured listing request.",
    inputSchema: {
      type: "object",
      properties: {
        requestId: { type: "string", description: "FeaturedListingRequest ID" },
        action: { type: "string", enum: ["APPROVE", "REJECT"], description: "Action" },
      },
      required: ["requestId", "action"],
    },
  },
];

export async function handleAdminModerationTool(
  toolName: string,
  args: any,
  admin: AdminSessionContext
): Promise<McpToolResponse> {
  try {
    switch (toolName) {
      case "admin_list_pending_listings": {
        const limit = Number(args.limit || 20);
        const listings = await prisma.marketplaceListing.findMany({
          where: { status: "PENDING" },
          include: {
            user: { select: { id: true, name: true, email: true } },
          },
          orderBy: { createdAt: "desc" },
          take: limit,
        });

        return formatSuccess(listings);
      }

      case "admin_moderate_listing": {
        const { listingId, action } = args;
        const status = action === "APPROVE" ? "APPROVED" : "REJECTED";

        const updated = await prisma.marketplaceListing.update({
          where: { id: listingId },
          data: { status },
        });

        return formatSuccess(updated, `Listing ${listingId} has been ${status.toLowerCase()}`);
      }

      case "admin_list_featured_requests": {
        const { pendingOnly } = args;
        const requests = await prisma.featuredListingRequest.findMany({
          where: {
            ...(pendingOnly ? { status: "PENDING_APPROVAL" } : {}),
          },
          include: {
            listing: { select: { id: true, title: true, price: true } },
          },
          orderBy: { createdAt: "desc" },
        });

        return formatSuccess(requests);
      }

      case "admin_moderate_featured_request": {
        const { requestId, action } = args;
        const status = action === "APPROVE" ? "ACTIVE" : "REJECTED";

        const req = await prisma.featuredListingRequest.findUnique({
          where: { id: requestId },
        });

        if (!req) return formatError(`Featured request not found: ${requestId}`);

        await prisma.$transaction([
          prisma.featuredListingRequest.update({
            where: { id: requestId },
            data: { status },
          }),
          ...(action === "APPROVE"
            ? [
                prisma.marketplaceListing.update({
                  where: { id: req.listingId },
                  data: { isFeatured: true },
                }),
              ]
            : []),
        ]);

        return formatSuccess(null, `Featured request ${requestId} marked as ${status}`);
      }

      default:
        return formatError(`Unknown admin moderation tool: ${toolName}`);
    }
  } catch (error: any) {
    return formatError(error.message || "Error executing admin moderation tool", error);
  }
}

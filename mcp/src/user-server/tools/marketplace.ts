import { prisma } from "../../common/db";
import { UserSessionContext, formatSuccess, formatError, McpToolResponse } from "../../common/types";

export const marketplaceToolDefinitions = [
  {
    name: "search_marketplace",
    description: "Search TaxComPro marketplace for tax services, software products, training, or partner networks.",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Search keyword" },
        category: {
          type: "string",
          enum: ["SERVICE", "PRODUCT", "NETWORK", "TRAINING"],
          description: "Category filter",
        },
        maxPrice: { type: "number", description: "Maximum price filter" },
        limit: { type: "number", description: "Maximum results (default: 20)" },
      },
    },
  },
  {
    name: "get_listing_details",
    description: "Get full details, pricing, seller bio, and media for a specific marketplace listing.",
    inputSchema: {
      type: "object",
      properties: {
        listingIdOrSlug: { type: "string", description: "Listing ID or URL slug" },
      },
      required: ["listingIdOrSlug"],
    },
  },
  {
    name: "list_my_purchases",
    description: "View all marketplace products and services purchased by the user.",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "list_my_seller_listings",
    description: "List all marketplace listings created by the user (as a vendor/seller) along with approval status.",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "create_marketplace_listing",
    description: "Draft and submit a new marketplace product or service listing for moderation.",
    inputSchema: {
      type: "object",
      properties: {
        title: { type: "string", description: "Listing title" },
        description: { type: "string", description: "Detailed description of the offer" },
        category: {
          type: "string",
          enum: ["SERVICE", "PRODUCT", "NETWORK", "TRAINING"],
          description: "Category",
        },
        price: { type: "number", description: "Price in USD (e.g. 99.00)" },
        tags: { type: "array", items: { type: "string" }, description: "Tags/keywords" },
      },
      required: ["title", "description", "category", "price"],
    },
  },
  {
    name: "validate_coupon",
    description: "Verify a discount coupon code and return its discount percentage or amount.",
    inputSchema: {
      type: "object",
      properties: {
        code: { type: "string", description: "Coupon code (e.g. 'SAVE20')" },
        sellerId: { type: "string", description: "Optional seller user ID" },
        listingId: { type: "string", description: "Optional listing ID" },
      },
      required: ["code"],
    },
  },
];

export async function handleMarketplaceTool(
  toolName: string,
  args: any,
  user: UserSessionContext
): Promise<McpToolResponse> {
  try {
    switch (toolName) {
      case "search_marketplace": {
        const { query, category, maxPrice, limit = 20 } = args;

        const where: any = {
          status: "APPROVED",
        };

        if (category) {
          where.category = category;
        }

        if (maxPrice !== undefined) {
          where.price = { lte: Number(maxPrice) };
        }

        if (query) {
          where.OR = [
            { title: { contains: query, mode: "insensitive" } },
            { description: { contains: query, mode: "insensitive" } },
            { tags: { has: query.toLowerCase() } },
          ];
        }

        const listings = await prisma.marketplaceListing.findMany({
          where,
          include: {
            user: {
              select: { id: true, name: true, image: true },
            },
          },
          orderBy: [{ isFeatured: "desc" }, { createdAt: "desc" }],
          take: Number(limit),
        });

        return formatSuccess({
          total: listings.length,
          listings,
        });
      }

      case "get_listing_details": {
        const { listingIdOrSlug } = args;
        const listing = await prisma.marketplaceListing.findFirst({
          where: {
            OR: [{ id: listingIdOrSlug }, { slug: listingIdOrSlug }],
          },
          include: {
            user: {
              select: { id: true, name: true, image: true, email: true },
            },
          },
        });

        if (!listing) return formatError(`Listing not found: ${listingIdOrSlug}`);

        // Increment view count in background
        await prisma.marketplaceListing.update({
          where: { id: listing.id },
          data: { viewCount: { increment: 1 } },
        });

        return formatSuccess(listing);
      }

      case "list_my_purchases": {
        const purchases = await prisma.marketplacePurchase.findMany({
          where: { userId: user.userId },
          include: {
            listing: {
              include: {
                user: { select: { name: true, email: true } },
              },
            },
          },
          orderBy: { createdAt: "desc" },
        });

        return formatSuccess(purchases);
      }

      case "list_my_seller_listings": {
        const listings = await prisma.marketplaceListing.findMany({
          where: { userId: user.userId },
          include: {
            _count: {
              select: { purchases: true },
            },
          },
          orderBy: { createdAt: "desc" },
        });

        return formatSuccess(listings);
      }

      case "create_marketplace_listing": {
        const { title, description, category, price, tags = [] } = args;

        const slug =
          title
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-+|-+$/g, "") +
          "-" +
          Math.random().toString(36).substring(2, 6);

        const newListing = await prisma.marketplaceListing.create({
          data: {
            title,
            slug,
            description,
            category,
            price: Number(price),
            tags: tags.map((t: string) => t.toLowerCase()),
            userId: user.userId,
            status: "PENDING", // Requires admin approval
            images: [],
          },
        });

        return formatSuccess(
          newListing,
          "Marketplace listing created successfully and submitted for admin review."
        );
      }

      case "validate_coupon": {
        const { code, sellerId, listingId } = args;

        const coupon = await prisma.marketplaceCoupon.findFirst({
          where: {
            code: code.trim().toUpperCase(),
            isActive: true,
            ...(sellerId ? { sellerId } : {}),
            ...(listingId ? { OR: [{ listingId }, { listingId: null }] } : {}),
            OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
          },
        });

        if (!coupon) {
          return formatError(`Coupon code '${code}' is invalid, expired, or does not apply to this item.`);
        }

        if (coupon.maxUses && coupon.usedCount >= coupon.maxUses) {
          return formatError(`Coupon code '${code}' has reached its maximum usage limit.`);
        }

        return formatSuccess({
          valid: true,
          code: coupon.code,
          discountType: coupon.discountType,
          discountValue: coupon.discountValue,
          durationMonths: coupon.durationMonths,
        });
      }

      default:
        return formatError(`Unknown marketplace tool: ${toolName}`);
    }
  } catch (error: any) {
    return formatError(error.message || "Error executing marketplace tool", error);
  }
}


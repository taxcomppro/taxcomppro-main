import { prisma } from "../../common/db";
import { AdminSessionContext, formatSuccess, formatError, McpToolResponse } from "../../common/types";

export const adminCouponToolDefinitions = [
  {
    name: "admin_list_coupons",
    description: "View all marketplace discount coupons, usage counts, and status.",
    inputSchema: {
      type: "object",
      properties: {
        activeOnly: { type: "boolean", description: "Only show active coupons" },
      },
    },
  },
  {
    name: "admin_create_coupon",
    description: "Create a platform-wide or seller-specific discount coupon.",
    inputSchema: {
      type: "object",
      properties: {
        code: { type: "string", description: "Coupon code (e.g. 'LAUNCH50')" },
        discountType: { type: "string", enum: ["PERCENT", "FIXED"], description: "PERCENT or FIXED" },
        discountValue: { type: "number", description: "Discount value (e.g. 20 for 20% or 50 for $50 off)" },
        maxUses: { type: "number", description: "Optional max redemption count" },
        expiresAt: { type: "string", description: "Optional ISO date string for expiration" },
        listingId: { type: "string", description: "Optional listing restriction, or 'MEMBERSHIP', 'COURSES', 'TOOLKITS'" },
      },
      required: ["code", "discountType", "discountValue"],
    },
  },
  {
    name: "admin_toggle_coupon",
    description: "Activate or deactivate a discount coupon.",
    inputSchema: {
      type: "object",
      properties: {
        couponId: { type: "string", description: "Coupon ID" },
        isActive: { type: "boolean", description: "Active state" },
      },
      required: ["couponId", "isActive"],
    },
  },
];

export async function handleAdminCouponTool(
  toolName: string,
  args: any,
  admin: AdminSessionContext
): Promise<McpToolResponse> {
  try {
    switch (toolName) {
      case "admin_list_coupons": {
        const { activeOnly } = args;
        const coupons = await prisma.marketplaceCoupon.findMany({
          where: {
            ...(activeOnly ? { isActive: true } : {}),
          },
          include: {
            seller: { select: { id: true, name: true, email: true } },
            listing: { select: { id: true, title: true } },
          },
          orderBy: { createdAt: "desc" },
        });

        return formatSuccess(coupons);
      }

      case "admin_create_coupon": {
        const { code, discountType, discountValue, maxUses, expiresAt, listingId } = args;

        const coupon = await prisma.marketplaceCoupon.create({
          data: {
            code: code.trim().toUpperCase(),
            discountType,
            discountValue: Number(discountValue),
            maxUses: maxUses ? Number(maxUses) : null,
            expiresAt: expiresAt ? new Date(expiresAt) : null,
            sellerId: admin.adminId, // Admin created
            listingId: listingId || null,
            isActive: true,
          },
        });

        return formatSuccess(coupon, `Coupon '${coupon.code}' created successfully.`);
      }

      case "admin_toggle_coupon": {
        const { couponId, isActive } = args;
        const updated = await prisma.marketplaceCoupon.update({
          where: { id: couponId },
          data: { isActive: Boolean(isActive) },
        });

        return formatSuccess(updated, `Coupon status updated to ${isActive ? "ACTIVE" : "INACTIVE"}`);
      }

      default:
        return formatError(`Unknown admin coupon tool: ${toolName}`);
    }
  } catch (error: any) {
    return formatError(error.message || "Error executing admin coupon tool", error);
  }
}


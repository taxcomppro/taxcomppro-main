import { prisma } from "../../common/db.js";
import { AdminSessionContext, formatSuccess, formatError, McpToolResponse } from "../../common/types.js";

export const adminProHubToolDefinitions = [
  {
    name: "admin_list_pro_applications",
    description: "List applications from practitioners applying for verified professional directory status.",
    inputSchema: {
      type: "object",
      properties: {
        status: { type: "string", enum: ["PENDING", "APPROVED", "REJECTED"], description: "Status filter" },
      },
    },
  },
  {
    name: "admin_moderate_pro_application",
    description: "Approve or reject a professional application.",
    inputSchema: {
      type: "object",
      properties: {
        applicationId: { type: "string", description: "Application ID" },
        action: { type: "string", enum: ["APPROVE", "REJECT"], description: "Action" },
        note: { type: "string", description: "Optional feedback note" },
      },
      required: ["applicationId", "action"],
    },
  },
  {
    name: "admin_list_pro_ads",
    description: "List sponsored advertisements submitted by members for left or center column placement.",
    inputSchema: {
      type: "object",
      properties: {
        status: {
          type: "string",
          enum: ["PENDING_APPROVAL", "ACTIVE", "PAUSED", "REJECTED", "EXPIRED"],
          description: "Ad status filter",
        },
      },
    },
  },
  {
    name: "admin_moderate_pro_ad",
    description: "Approve, reject, or pause a member advertisement.",
    inputSchema: {
      type: "object",
      properties: {
        adId: { type: "string", description: "ProAd ID" },
        action: { type: "string", enum: ["APPROVE", "REJECT", "PAUSE"], description: "Moderation action" },
        rejectionReason: { type: "string", description: "Reason if rejecting" },
      },
      required: ["adId", "action"],
    },
  },
];

export async function handleAdminProHubTool(
  toolName: string,
  args: any,
  admin: AdminSessionContext
): Promise<McpToolResponse> {
  try {
    switch (toolName) {
      case "admin_list_pro_applications": {
        const { status } = args;
        const apps = await prisma.professionalApplication.findMany({
          where: {
            ...(status ? { status } : {}),
          },
          include: {
            user: { select: { id: true, name: true, email: true, tier: true } },
          },
          orderBy: { createdAt: "desc" },
        });

        return formatSuccess(apps);
      }

      case "admin_moderate_pro_application": {
        const { applicationId, action, note } = args;
        const status = action === "APPROVE" ? "APPROVED" : "REJECTED";

        const updated = await prisma.professionalApplication.update({
          where: { id: applicationId },
          data: {
            status,
            note: note || undefined,
          },
        });

        return formatSuccess(updated, `Application ${applicationId} has been ${status.toLowerCase()}`);
      }

      case "admin_list_pro_ads": {
        const { status } = args;
        const ads = await prisma.proAd.findMany({
          where: {
            ...(status ? { status } : {}),
          },
          orderBy: { createdAt: "desc" },
        });

        return formatSuccess(ads);
      }

      case "admin_moderate_pro_ad": {
        const { adId, action, rejectionReason } = args;

        let status: any = "ACTIVE";
        let startsAt = new Date();
        let endsAt = new Date();

        const ad = await prisma.proAd.findUnique({ where: { id: adId } });
        if (!ad) return formatError(`Ad not found: ${adId}`);

        if (action === "APPROVE") {
          status = "ACTIVE";
          startsAt = new Date();
          endsAt = new Date(startsAt.getTime() + ad.durationMonths * 30 * 24 * 60 * 60 * 1000);
        } else if (action === "REJECT") {
          status = "REJECTED";
        } else if (action === "PAUSE") {
          status = "PAUSED";
        }

        const updated = await prisma.proAd.update({
          where: { id: adId },
          data: {
            status,
            rejectionReason: rejectionReason || null,
            ...(action === "APPROVE" ? { startsAt, endsAt } : {}),
          },
        });

        return formatSuccess(updated, `Ad ${adId} updated to ${status}`);
      }

      default:
        return formatError(`Unknown admin pro hub tool: ${toolName}`);
    }
  } catch (error: any) {
    return formatError(error.message || "Error executing admin pro hub tool", error);
  }
}


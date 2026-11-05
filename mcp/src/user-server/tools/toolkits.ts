import { prisma } from "../../common/db";
import { UserSessionContext, formatSuccess, formatError, McpToolResponse } from "../../common/types";

export const toolkitToolDefinitions = [
  {
    name: "list_my_toolkits",
    description: "List all practice defense toolkits owned by the user (e.g., IRS Audit Playbook, Schedule C Reconstruction, IRS Fine Defense, 30 Day Tax Office Launch, Staff Audit Ready).",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "get_toolkit_assets",
    description: "Get downloadable assets, checklists, templates, and spreadsheets for a specific toolkit.",
    inputSchema: {
      type: "object",
      properties: {
        toolkitId: { type: "string", description: "Toolkit ID or slug (e.g., 'irs-fine-defense', 'schedule-c-reconstruction', 'audit-playbook')" },
      },
      required: ["toolkitId"],
    },
  },
  {
    name: "get_my_training_licenses",
    description: "View purchased staff training licenses, total seats, and active seat usage.",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "list_my_staff_invitations",
    description: "List all staff members invited to take compliance and audit-ready training under the user's license.",
    inputSchema: {
      type: "object",
      properties: {
        licenseId: { type: "string", description: "Optional filter by training license ID" },
      },
    },
  },
  {
    name: "invite_staff_member",
    description: "Invite a new team or staff member to complete compliance due diligence training using an available seat.",
    inputSchema: {
      type: "object",
      properties: {
        licenseId: { type: "string", description: "The Training License ID providing the seat" },
        email: { type: "string", description: "Staff member's email address" },
        name: { type: "string", description: "Staff member's name" },
      },
      required: ["licenseId", "email", "name"],
    },
  },
  {
    name: "get_staff_member_progress",
    description: "Check the due diligence training and assessment attempt status for an invited staff member.",
    inputSchema: {
      type: "object",
      properties: {
        invitationId: { type: "string", description: "ID of the staff invitation" },
      },
      required: ["invitationId"],
    },
  },
];

export async function handleToolkitTool(
  toolName: string,
  args: any,
  user: UserSessionContext
): Promise<McpToolResponse> {
  try {
    switch (toolName) {
      case "list_my_toolkits": {
        const purchases = await prisma.toolkitPurchase.findMany({
          where: { userId: user.userId },
          orderBy: { createdAt: "desc" },
        });

        return formatSuccess(purchases);
      }

      case "get_toolkit_assets": {
        const { toolkitId } = args;
        const hasAccess = await prisma.toolkitPurchase.findFirst({
          where: {
            userId: user.userId,
            OR: [
              { toolkitId },
              { toolkitId: "ultimate-bundle" },
              { toolkitId: "ultimate-bundle-plus" },
            ],
          },
        });

        if (!hasAccess && user.role !== "ADMIN") {
          return formatError(
            `Access denied. You do not own toolkit '${toolkitId}'. Please purchase it or upgrade your membership.`
          );
        }

        const assets = await prisma.toolkitAsset.findMany({
          where: { toolkitId },
          orderBy: { uploadedAt: "asc" },
        });

        return formatSuccess({
          toolkitId,
          totalAssets: assets.length,
          assets,
        });
      }

      case "get_my_training_licenses": {
        const licenses = await prisma.trainingLicense.findMany({
          where: { eroId: user.userId },
          include: {
            _count: {
              select: { invitations: true },
            },
          },
          orderBy: { createdAt: "desc" },
        });

        const formatted = licenses.map((lic) => ({
          id: lic.id,
          toolkitId: lic.toolkitId,
          officeName: lic.officeName,
          totalSeats: lic.totalSeats,
          usedSeats: lic._count.invitations,
          remainingSeats: Math.max(0, lic.totalSeats - lic._count.invitations),
          expiresAt: lic.expiresAt,
          createdAt: lic.createdAt,
        }));

        return formatSuccess(formatted);
      }

      case "list_my_staff_invitations": {
        const { licenseId } = args;
        const invitations = await prisma.staffInvitation.findMany({
          where: {
            eroId: user.userId,
            ...(licenseId ? { licenseId } : {}),
          },
          include: {
            license: {
              select: { toolkitId: true, totalSeats: true, officeName: true },
            },
            attempts: {
              orderBy: { startedAt: "desc" },
              take: 1,
            },
            certificate: true,
          },
          orderBy: { invitedAt: "desc" },
        });

        return formatSuccess(invitations);
      }

      case "invite_staff_member": {
        const { licenseId, email, name } = args;

        const license = await prisma.trainingLicense.findFirst({
          where: { id: licenseId, eroId: user.userId },
          include: { _count: { select: { invitations: true } } },
        });

        if (!license) {
          return formatError("Training license not found or does not belong to you.");
        }

        if (license._count.invitations >= license.totalSeats) {
          return formatError(
            `License seat limit reached (${license._count.invitations}/${license.totalSeats} seats used).`
          );
        }

        let version = await prisma.trainingVersion.findFirst({
          where: { toolkitId: license.toolkitId, isActive: true },
        });

        if (!version) {
          version = await prisma.trainingVersion.findFirst({
            where: { isActive: true },
          });
        }

        if (!version) {
          version = await prisma.trainingVersion.create({
            data: {
              toolkitId: license.toolkitId,
              versionLabel: "2026 Standard Due Diligence",
              isActive: true,
            },
          });
        }

        const inviteToken = "inv_" + Math.random().toString(36).substring(2, 12) + Date.now().toString(36);

        const invitation = await prisma.staffInvitation.create({
          data: {
            licenseId,
            eroId: user.userId,
            versionId: version.id,
            email: email.trim().toLowerCase(),
            name: name.trim(),
            inviteToken,
            status: "INVITED",
          },
        });

        return formatSuccess(
          {
            invitationId: invitation.id,
            email: invitation.email,
            name: invitation.name,
            inviteLink: `${process.env.NEXT_PUBLIC_APP_URL || "https://taxcomppro.com"}/staff-training/invite/${invitation.inviteToken}`,
            status: invitation.status,
          },
          "Staff member invited successfully and seat reserved."
        );
      }

      case "get_staff_member_progress": {
        const { invitationId } = args;
        const invitation = await prisma.staffInvitation.findFirst({
          where: {
            id: invitationId,
            eroId: user.userId,
          },
          include: {
            attempts: {
              orderBy: { startedAt: "desc" },
            },
            acknowledgment: true,
            certificate: true,
          },
        });

        if (!invitation) return formatError("Staff invitation not found or access denied.");
        return formatSuccess(invitation);
      }

      default:
        return formatError(`Unknown toolkit tool: ${toolName}`);
    }
  } catch (error: any) {
    return formatError(error.message || "Error executing toolkit tool", error);
  }
}

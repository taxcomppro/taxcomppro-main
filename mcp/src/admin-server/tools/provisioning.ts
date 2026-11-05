import { prisma } from "../../common/db";
import { AdminSessionContext, formatSuccess, formatError, McpToolResponse } from "../../common/types";

const PRODUCT_CATALOG: Record<
  string,
  { title: string; type: string; seats: number; toolkitId: string; courseSlugs: string[] }
> = {
  "toolkit:30-day-tax-office-launch": {
    title: "30 Day Tax Office Launch Toolkit",
    type: "TOOLKIT",
    seats: 1,
    toolkitId: "30-day-tax-office",
    courseSlugs: ["30-day-tax-office-launch", "30-day-launch"],
  },
  "course:30-day-tax-office-launch": {
    title: "30 Day Tax Office Launch Course",
    type: "COURSE",
    seats: 1,
    toolkitId: "30-day-tax-office",
    courseSlugs: ["30-day-tax-office-launch", "30-day-launch"],
  },
  "bundle:30-day-tax-office-launch": {
    title: "30 Day Tax Office Launch Bundle",
    type: "BUNDLE",
    seats: 5,
    toolkitId: "30-day-tax-office",
    courseSlugs: ["30-day-tax-office-launch", "30-day-launch"],
  },
  "toolkit:irs-fine-defense": {
    title: "IRS Fine Defense Toolkit",
    type: "TOOLKIT",
    seats: 1,
    toolkitId: "irs-fine-defense",
    courseSlugs: ["irs-fine-defense", "irs-fine-defense-toolkit-masterclass"],
  },
  "course:irs-fine-defense": {
    title: "IRS Fine Defense Course",
    type: "COURSE",
    seats: 1,
    toolkitId: "irs-fine-defense",
    courseSlugs: ["irs-fine-defense", "irs-fine-defense-toolkit-masterclass"],
  },
  "bundle:irs-fine-defense": {
    title: "IRS Fine Defense Complete Bundle",
    type: "BUNDLE",
    seats: 5,
    toolkitId: "irs-fine-defense",
    courseSlugs: ["irs-fine-defense", "irs-fine-defense-toolkit-masterclass"],
  },
  "toolkit:schedule-c-reconstruction": {
    title: "Schedule C Reconstruction Toolkit",
    type: "TOOLKIT",
    seats: 1,
    toolkitId: "schedule-c-reconstruction",
    courseSlugs: ["schedule-c-reconstruction", "mastering-schedule-c-reconstruction"],
  },
  "course:schedule-c-reconstruction": {
    title: "Mastering Schedule C Reconstruction",
    type: "COURSE",
    seats: 1,
    toolkitId: "schedule-c-reconstruction",
    courseSlugs: ["schedule-c-reconstruction", "mastering-schedule-c-reconstruction"],
  },
  "bundle:schedule-c-reconstruction": {
    title: "Schedule C Reconstruction Bundle",
    type: "BUNDLE",
    seats: 5,
    toolkitId: "schedule-c-reconstruction",
    courseSlugs: ["schedule-c-reconstruction", "mastering-schedule-c-reconstruction"],
  },
  "toolkit:irs-audit-playbook": {
    title: "IRS Audit Defense Toolkit",
    type: "TOOLKIT",
    seats: 1,
    toolkitId: "audit-playbook",
    courseSlugs: ["audit-playbook", "irs-audit-playbook"],
  },
  "bundle:irs-audit-playbook": {
    title: "IRS Audit Playbook Bundle",
    type: "BUNDLE",
    seats: 5,
    toolkitId: "audit-playbook",
    courseSlugs: ["audit-playbook", "irs-audit-playbook"],
  },
  "toolkit:credits-filing-status": {
    title: "Credits & Filing Status Toolkit",
    type: "TOOLKIT",
    seats: 1,
    toolkitId: "credits-filing-status",
    courseSlugs: ["credits-filing-status"],
  },
  "toolkit:staff-audit-ready": {
    title: "Staff Audit Ready Playbook Toolkit",
    type: "TOOLKIT",
    seats: 1,
    toolkitId: "due-diligence-course",
    courseSlugs: ["staff-audit-ready", "due-diligence-course"],
  },
  "bundle:staff-audit-ready": {
    title: "Staff Audit Ready Complete Bundle",
    type: "BUNDLE",
    seats: 5,
    toolkitId: "due-diligence-course",
    courseSlugs: ["staff-audit-ready", "due-diligence-course"],
  },
  "bundle:ultimate-bundle": {
    title: "Ultimate Practice Defense Bundle",
    type: "BUNDLE",
    seats: 5,
    toolkitId: "ultimate-bundle",
    courseSlugs: [],
  },
  "bundle:ultimate-bundle-plus": {
    title: "Ultimate Practice Defense Bundle Plus",
    type: "BUNDLE",
    seats: 10,
    toolkitId: "ultimate-bundle-plus",
    courseSlugs: [],
  },
};

const ALL_6_TOOLKITS = [
  "30-day-tax-office",
  "due-diligence-course",
  "irs-fine-defense",
  "schedule-c-reconstruction",
  "audit-playbook",
  "credits-filing-status",
];

export const adminProvisioningToolDefinitions = [
  {
    name: "admin_provision_order",
    description: "Fully provision an order for a customer: grants toolkits, creates training seat licenses, and enrolls in courses.",
    inputSchema: {
      type: "object",
      properties: {
        userIdOrEmail: { type: "string", description: "Customer User ID or Email" },
        productKey: {
          type: "string",
          description: "Product key (e.g. 'bundle:ultimate-bundle', 'bundle:irs-fine-defense', 'toolkit:schedule-c-reconstruction')",
        },
        customSeats: { type: "number", description: "Optional seat count override" },
      },
      required: ["userIdOrEmail", "productKey"],
    },
  },
  {
    name: "admin_list_licenses",
    description: "List all issued training licenses across the platform with seat consumption.",
    inputSchema: {
      type: "object",
      properties: {
        toolkitId: { type: "string", description: "Optional toolkit filter" },
        limit: { type: "number", description: "Max results (default: 20)" },
      },
    },
  },
];

export async function handleAdminProvisioningTool(
  toolName: string,
  args: any,
  admin: AdminSessionContext
): Promise<McpToolResponse> {
  try {
    switch (toolName) {
      case "admin_provision_order": {
        const { userIdOrEmail, productKey, customSeats } = args;

        const user = await prisma.user.findFirst({
          where: {
            OR: [{ id: userIdOrEmail }, { email: userIdOrEmail }],
          },
        });

        if (!user) return formatError(`Customer not found: ${userIdOrEmail}`);

        const product = PRODUCT_CATALOG[productKey];
        if (!product) {
          return formatError(
            `Unknown product key: '${productKey}'. Valid keys: ${Object.keys(PRODUCT_CATALOG).join(", ")}`
          );
        }

        const isUltimate =
          productKey === "bundle:ultimate-bundle" || productKey === "bundle:ultimate-bundle-plus";
        const toolkitsToGrant = isUltimate ? ALL_6_TOOLKITS : [product.toolkitId];
        const seats = Number(customSeats) || product.seats;
        const expiresAt = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);

        // 1. Grant toolkit purchases
        for (const tkId of toolkitsToGrant) {
          const existing = await prisma.toolkitPurchase.findFirst({
            where: { userId: user.id, toolkitId: tkId },
          });

          if (!existing) {
            await prisma.toolkitPurchase.create({
              data: {
                userId: user.id,
                toolkitId: tkId,
                stripeSessionId: `mcp_prov_${Date.now()}_${tkId}`,
              },
            });
          }
        }

        // 2. Create or update training license
        const license = await prisma.trainingLicense.upsert({
          where: {
            eroId_toolkitId: {
              eroId: user.id,
              toolkitId: product.toolkitId,
            },
          },
          create: {
            eroId: user.id,
            toolkitId: product.toolkitId,
            totalSeats: seats,
            expiresAt,
          },
          update: {
            totalSeats: seats,
            expiresAt,
          },
        });

        // 3. Enroll in courses if applicable
        const enrolledCourseIds: string[] = [];
        if (product.courseSlugs.length > 0) {
          const courses = await prisma.course.findMany({
            where: { slug: { in: product.courseSlugs } },
          });

          for (const c of courses) {
            await prisma.enrollment.upsert({
              where: {
                userId_courseId: {
                  userId: user.id,
                  courseId: c.id,
                },
              },
              update: {},
              create: {
                userId: user.id,
                courseId: c.id,
              },
            });
            enrolledCourseIds.push(c.id);
          }
        }

        return formatSuccess(
          {
            user: { id: user.id, email: user.email, name: user.name },
            productKey,
            toolkitsGranted: toolkitsToGrant,
            trainingLicense: {
              licenseId: license.id,
              totalSeats: license.totalSeats,
              expiresAt: license.expiresAt,
            },
            enrolledCourseIds,
          },
          `Successfully provisioned ${product.title} for ${user.email}`
        );
      }

      case "admin_list_licenses": {
        const { toolkitId, limit = 20 } = args;
        const licenses = await prisma.trainingLicense.findMany({
          where: {
            ...(toolkitId ? { toolkitId } : {}),
          },
          include: {
            ero: { select: { id: true, name: true, email: true } },
            _count: { select: { invitations: true } },
          },
          orderBy: { createdAt: "desc" },
          take: Number(limit),
        });

        return formatSuccess(licenses);
      }

      default:
        return formatError(`Unknown admin provisioning tool: ${toolName}`);
    }
  } catch (error: any) {
    return formatError(error.message || "Error executing admin provisioning tool", error);
  }
}

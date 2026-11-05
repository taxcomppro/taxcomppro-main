import { prisma } from "../../common/db";
import { UserSessionContext } from "../../common/types";

export const userResourceDefinitions = [
  {
    uri: "taxcomppro://user/profile",
    name: "My TaxComPro Profile",
    description: "Current user profile, credentials, and account details in JSON format",
    mimeType: "application/json",
  },
  {
    uri: "taxcomppro://user/toolkits",
    name: "My Practice Defense Toolkits",
    description: "Overview of owned toolkits, seat licenses, and practice defense assets",
    mimeType: "application/json",
  },
  {
    uri: "taxcomppro://user/courses",
    name: "My Enrolled Courses & Progress",
    description: "Active courses, modules, completion stats, and certificate status",
    mimeType: "application/json",
  },
];

export async function handleUserResourceRead(
  uri: string,
  user: UserSessionContext
): Promise<{ uri: string; mimeType: string; text: string }> {
  switch (uri) {
    case "taxcomppro://user/profile": {
      const profile = await prisma.user.findUnique({
        where: { id: user.userId },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          tier: true,
          createdAt: true,
        },
      });
      return {
        uri,
        mimeType: "application/json",
        text: JSON.stringify(profile, null, 2),
      };
    }

    case "taxcomppro://user/toolkits": {
      const toolkits = await prisma.toolkitPurchase.findMany({
        where: { userId: user.userId },
      });
      const licenses = await prisma.trainingLicense.findMany({
        where: { eroId: user.userId },
      });
      return {
        uri,
        mimeType: "application/json",
        text: JSON.stringify({ toolkits, licenses }, null, 2),
      };
    }

    case "taxcomppro://user/courses": {
      const enrollments = await prisma.enrollment.findMany({
        where: { userId: user.userId },
        include: {
          course: {
            select: { id: true, title: true, slug: true, level: true },
          },
        },
      });
      return {
        uri,
        mimeType: "application/json",
        text: JSON.stringify(enrollments, null, 2),
      };
    }

    default:
      throw new Error(`Resource not found: ${uri}`);
  }
}

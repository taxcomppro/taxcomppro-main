import { prisma } from "../../common/db.js";
import { AdminSessionContext, formatSuccess, formatError, McpToolResponse } from "../../common/types.js";

export const adminCourseToolDefinitions = [
  {
    name: "admin_list_courses",
    description: "List all courses on the platform with enrollment counts, module counts, and status.",
    inputSchema: {
      type: "object",
      properties: {
        status: { type: "string", enum: ["DRAFT", "PUBLISHED", "ARCHIVED"], description: "Status filter" },
      },
    },
  },
  {
    name: "admin_create_course",
    description: "Create a new course in the TaxComPro Academy catalog.",
    inputSchema: {
      type: "object",
      properties: {
        title: { type: "string", description: "Course title" },
        slug: { type: "string", description: "Unique URL slug" },
        description: { type: "string", description: "Course description" },
        category: { type: "string", description: "Course category (e.g. 'Tax Defense', 'Due Diligence')" },
        level: { type: "string", enum: ["BEGINNER", "INTERMEDIATE", "ADVANCED"], description: "Level" },
        price: { type: "number", description: "Price in USD" },
        status: { type: "string", enum: ["DRAFT", "PUBLISHED", "ARCHIVED"], description: "Initial status" },
      },
      required: ["title", "slug", "description", "category"],
    },
  },
  {
    name: "admin_update_course",
    description: "Update an existing course's details or publication status.",
    inputSchema: {
      type: "object",
      properties: {
        courseId: { type: "string", description: "Course ID" },
        title: { type: "string" },
        description: { type: "string" },
        status: { type: "string", enum: ["DRAFT", "PUBLISHED", "ARCHIVED"] },
        price: { type: "number" },
      },
      required: ["courseId"],
    },
  },
  {
    name: "admin_list_certificates",
    description: "Audit and search all issued completion certificates.",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Search by certificate number or recipient name" },
        limit: { type: "number", description: "Max results (default: 25)" },
      },
    },
  },
];

export async function handleAdminCourseTool(
  toolName: string,
  args: any,
  admin: AdminSessionContext
): Promise<McpToolResponse> {
  try {
    switch (toolName) {
      case "admin_list_courses": {
        const { status } = args;
        const courses = await prisma.course.findMany({
          where: {
            ...(status ? { status } : {}),
          },
          include: {
            _count: {
              select: { enrollments: true, sections: true, ratings: true },
            },
          },
          orderBy: { createdAt: "desc" },
        });

        return formatSuccess(courses);
      }

      case "admin_create_course": {
        const { title, slug, description, category, level = "BEGINNER", price = 0, status = "DRAFT" } = args;

        const course = await prisma.course.create({
          data: {
            title,
            slug,
            description,
            category,
            level,
            price: Number(price),
            isFree: Number(price) === 0,
            status,
            tags: [],
            learningOutcomes: [],
            requirements: [],
            instructorId: admin.adminId,
          },
        });

        return formatSuccess(course, `Course '${course.title}' created.`);
      }

      case "admin_update_course": {
        const { courseId, title, description, status, price } = args;
        const updated = await prisma.course.update({
          where: { id: courseId },
          data: {
            ...(title !== undefined ? { title } : {}),
            ...(description !== undefined ? { description } : {}),
            ...(status !== undefined ? { status } : {}),
            ...(price !== undefined ? { price: Number(price), isFree: Number(price) === 0 } : {}),
          },
        });

        return formatSuccess(updated, `Course updated.`);
      }

      case "admin_list_certificates": {
        const { query, limit = 25 } = args;
        const certs = await prisma.trainingCertificate.findMany({
          where: query
            ? {
                OR: [
                  { certificateNumber: { contains: query, mode: "insensitive" } },
                  { versionLabel: { contains: query, mode: "insensitive" } },
                  { invitation: { name: { contains: query, mode: "insensitive" } } },
                  { invitation: { email: { contains: query, mode: "insensitive" } } },
                ],
              }
            : {},
          include: {
            invitation: {
              select: {
                name: true,
                email: true,
                ero: { select: { id: true, name: true, email: true } },
                license: { select: { toolkitId: true, officeName: true } },
              },
            },
          },
          orderBy: { issuedAt: "desc" },
          take: Number(limit),
        });

        return formatSuccess(certs);
      }

      default:
        return formatError(`Unknown admin course tool: ${toolName}`);
    }
  } catch (error: any) {
    return formatError(error.message || "Error executing admin course tool", error);
  }
}

import { prisma } from "../../common/db";
import { AdminSessionContext, formatSuccess, formatError, McpToolResponse } from "../../common/types";

export const adminAtlasToolDefinitions = [
  {
    name: "admin_list_knowledge_items",
    description: "List Atlas AI verified knowledge base Q&As with category and active filters.",
    inputSchema: {
      type: "object",
      properties: {
        category: { type: "string" },
        search: { type: "string" },
      },
    },
  },
  {
    name: "admin_create_knowledge_item",
    description: "Add a new verified question & answer to the Atlas AI knowledge base for practice defense & compliance.",
    inputSchema: {
      type: "object",
      properties: {
        question: { type: "string", description: "Primary question" },
        approvedAnswer: { type: "string", description: "Verified authoritative answer" },
        category: { type: "string", description: "Category (e.g. 'DUE_DILIGENCE', 'AUDIT_DEFENSE', 'SCHEDULE_C', 'PLATFORM')" },
        alternatePhrasings: { type: "array", items: { type: "string" }, description: "Alternative ways users might ask this" },
        relatedUrl: { type: "string", description: "Link to course, toolkit, or IRS guidance" },
      },
      required: ["question", "approvedAnswer"],
    },
  },
  {
    name: "admin_update_knowledge_item",
    description: "Update an existing Atlas AI knowledge base item.",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "Knowledge item ID" },
        question: { type: "string" },
        approvedAnswer: { type: "string" },
        category: { type: "string" },
        active: { type: "boolean" },
      },
      required: ["id"],
    },
  },
  {
    name: "admin_delete_knowledge_item",
    description: "Remove an item from the Atlas AI knowledge base.",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "Knowledge item ID" },
      },
      required: ["id"],
    },
  },
  {
    name: "admin_list_unanswered_questions",
    description: "List questions submitted by users that Atlas AI could not resolve, waiting for expert review.",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "admin_resolve_unanswered_question",
    description: "Answer an unresolved question and optionally publish it to the Atlas AI knowledge base.",
    inputSchema: {
      type: "object",
      properties: {
        questionId: { type: "string", description: "AtlasUnansweredQuestion ID" },
        approvedAnswer: { type: "string", description: "Official answer" },
        addToKnowledgeBase: { type: "boolean", description: "Whether to create a permanent AtlasKnowledgeItem (default: true)" },
        category: { type: "string", description: "Category if creating knowledge item" },
      },
      required: ["questionId", "approvedAnswer"],
    },
  },
];

export async function handleAdminAtlasTool(
  toolName: string,
  args: any,
  admin: AdminSessionContext
): Promise<McpToolResponse> {
  try {
    switch (toolName) {
      case "admin_list_knowledge_items": {
        const { category, search } = args;
        const items = await prisma.atlasKnowledgeItem.findMany({
          where: {
            ...(category ? { category } : {}),
            ...(search
              ? {
                  OR: [
                    { question: { contains: search, mode: "insensitive" } },
                    { approvedAnswer: { contains: search, mode: "insensitive" } },
                  ],
                }
              : {}),
          },
          orderBy: { updatedAt: "desc" },
        });

        return formatSuccess(items);
      }

      case "admin_create_knowledge_item": {
        const { question, approvedAnswer, category, alternatePhrasings = [], relatedUrl } = args;

        const item = await prisma.atlasKnowledgeItem.create({
          data: {
            question,
            approvedAnswer,
            category: category || "GENERAL",
            alternatePhrasings,
            relatedUrl,
            active: true,
          },
        });

        return formatSuccess(item, "Knowledge item created and activated for Atlas AI.");
      }

      case "admin_update_knowledge_item": {
        const { id, question, approvedAnswer, category, active } = args;
        const updated = await prisma.atlasKnowledgeItem.update({
          where: { id },
          data: {
            ...(question !== undefined ? { question } : {}),
            ...(approvedAnswer !== undefined ? { approvedAnswer } : {}),
            ...(category !== undefined ? { category } : {}),
            ...(active !== undefined ? { active: Boolean(active) } : {}),
          },
        });

        return formatSuccess(updated, `Knowledge item ${id} updated.`);
      }

      case "admin_delete_knowledge_item": {
        const { id } = args;
        await prisma.atlasKnowledgeItem.delete({ where: { id } });
        return formatSuccess(null, `Knowledge item ${id} deleted.`);
      }

      case "admin_list_unanswered_questions": {
        const list = await prisma.atlasUnansweredQuestion.findMany({
          orderBy: { id: "desc" },
        });

        return formatSuccess(list);
      }

      case "admin_resolve_unanswered_question": {
        const { questionId, approvedAnswer, addToKnowledgeBase = true, category = "GENERAL" } = args;

        const unans = await prisma.atlasUnansweredQuestion.findUnique({
          where: { id: questionId },
        });

        if (!unans) return formatError(`Unanswered question not found: ${questionId}`);

        let createdItem = null;
        if (addToKnowledgeBase) {
          createdItem = await prisma.atlasKnowledgeItem.create({
            data: {
              question: unans.question,
              approvedAnswer,
              category,
              active: true,
            },
          });
        }

        // Delete from unanswered questions queue
        await prisma.atlasUnansweredQuestion.delete({
          where: { id: questionId },
        });

        return formatSuccess(
          {
            resolvedQuestion: unans.question,
            createdKnowledgeItem: createdItem,
          },
          "Question resolved and archived from queue."
        );
      }

      default:
        return formatError(`Unknown admin atlas tool: ${toolName}`);
    }
  } catch (error: any) {
    return formatError(error.message || "Error executing admin atlas tool", error);
  }
}


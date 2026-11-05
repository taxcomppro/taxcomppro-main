import { prisma } from "../../common/db.js";
import { UserSessionContext, formatSuccess, formatError, McpToolResponse } from "../../common/types.js";

export const supportToolDefinitions = [
  {
    name: "ask_atlas_tax_expert",
    description: "Search TaxComPro Atlas AI knowledge base for answers regarding practice defense, tax rules, due diligence, and platform usage. Unresolved questions are logged for admin review.",
    inputSchema: {
      type: "object",
      properties: {
        question: { type: "string", description: "Tax, due diligence, or platform question" },
      },
      required: ["question"],
    },
  },
  {
    name: "create_support_ticket",
    description: "Submit a support ticket to the TaxComPro support team.",
    inputSchema: {
      type: "object",
      properties: {
        subject: { type: "string", description: "Brief subject of the issue" },
        description: { type: "string", description: "Detailed description of the issue" },
      },
      required: ["subject", "description"],
    },
  },
  {
    name: "list_my_support_tickets",
    description: "View all support tickets submitted by the user and their status (OPEN, IN_PROGRESS, RESOLVED, CLOSED).",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
];

export async function handleSupportTool(
  toolName: string,
  args: any,
  user: UserSessionContext
): Promise<McpToolResponse> {
  try {
    switch (toolName) {
      case "ask_atlas_tax_expert": {
        const { question } = args;
        const queryTerms = question.toLowerCase().split(/\s+/).filter((w: string) => w.length > 2);

        // Search active knowledge items
        const items = await prisma.atlasKnowledgeItem.findMany({
          where: { active: true },
          take: 100,
        });

        // Simple scoring based on term match in question and alternatePhrasings
        const scored = items.map((item) => {
          let score = 0;
          const fullText = (
            item.question +
            " " +
            item.alternatePhrasings.join(" ") +
            " " +
            item.approvedAnswer
          ).toLowerCase();

          for (const term of queryTerms) {
            if (fullText.includes(term)) score += 1;
            if (item.question.toLowerCase().includes(term)) score += 2;
          }
          return { item, score };
        });

        scored.sort((a, b) => b.score - a.score);
        const topMatches = scored.filter((s) => s.score > 0).slice(0, 3);

        if (topMatches.length > 0 && topMatches[0].score >= 2) {
          return formatSuccess({
            matched: true,
            bestAnswer: topMatches[0].item.approvedAnswer,
            category: topMatches[0].item.category,
            relatedUrl: topMatches[0].item.relatedUrl,
            allMatches: topMatches.map((m) => ({
              question: m.item.question,
              answer: m.item.approvedAnswer,
              category: m.item.category,
            })),
          });
        }

        // Log as unanswered question for admin review
        await prisma.atlasUnansweredQuestion.create({
          data: {
            question,
            userId: user.userId,
            accountEmail: user.email,
          },
        });

        return formatSuccess(
          {
            matched: false,
            message:
              "Atlas could not find an exact verified answer in the knowledge base. Your question has been forwarded to the TaxComPro compliance & support team for review.",
          },
          "Question logged for expert review."
        );
      }

      case "create_support_ticket": {
        const { subject, description } = args;
        const ticket = await prisma.supportTicket.create({
          data: {
            userId: user.userId,
            name: user.name || user.email,
            email: user.email,
            subject,
            description,
            status: "OPEN",
          },
        });

        return formatSuccess(ticket, `Support ticket #${ticket.id} created successfully.`);
      }

      case "list_my_support_tickets": {
        const tickets = await prisma.supportTicket.findMany({
          where: {
            OR: [
              { userId: user.userId },
              { email: user.email },
            ],
          },
          orderBy: { createdAt: "desc" },
        });

        return formatSuccess(tickets);
      }

      default:
        return formatError(`Unknown support tool: ${toolName}`);
    }
  } catch (error: any) {
    return formatError(error.message || "Error executing support tool", error);
  }
}


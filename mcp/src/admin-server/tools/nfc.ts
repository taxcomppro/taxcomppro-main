import { prisma } from "../../common/db";
import { AdminSessionContext, formatSuccess, formatError, McpToolResponse } from "../../common/types";

export const adminNfcToolDefinitions = [
  {
    name: "admin_list_nfc_cards",
    description: "List physical ProConnect NFC cards and their assigned member usernames.",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "admin_bind_nfc_card",
    description: "Pair or reassign a physical NFC card short ID to a user's digital card username.",
    inputSchema: {
      type: "object",
      properties: {
        cardId: { type: "string", description: "NFC card identifier (e.g. 'TCP-8842')" },
        username: { type: "string", description: "User's digital card username / handle" },
      },
      required: ["cardId", "username"],
    },
  },
];

export async function handleAdminNfcTool(
  toolName: string,
  args: any,
  admin: AdminSessionContext
): Promise<McpToolResponse> {
  try {
    switch (toolName) {
      case "admin_list_nfc_cards": {
        const cards = await prisma.nfcCard.findMany({
          orderBy: { createdAt: "desc" },
        });

        return formatSuccess(cards);
      }

      case "admin_bind_nfc_card": {
        const { cardId, username } = args;

        const digitalCard = await prisma.digitalCard.findUnique({
          where: { username },
        });

        if (!digitalCard) {
          return formatError(`Digital card with username '${username}' does not exist.`);
        }

        const url = `https://taxcomppro.com/c/${username}`;

        const nfc = await prisma.nfcCard.upsert({
          where: { cardId },
          update: {
            username,
            url,
            status: "ACTIVE",
          },
          create: {
            cardId,
            username,
            url,
            status: "ACTIVE",
          },
        });

        return formatSuccess(nfc, `NFC card '${cardId}' bound to username '${username}'.`);
      }

      default:
        return formatError(`Unknown admin nfc tool: ${toolName}`);
    }
  } catch (error: any) {
    return formatError(error.message || "Error executing admin nfc tool", error);
  }
}


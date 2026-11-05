import { prisma } from "../../common/db.js";
import { UserSessionContext, formatSuccess, formatError, McpToolResponse } from "../../common/types.js";

export const digitalCardToolDefinitions = [
  {
    name: "get_my_digital_card",
    description: "Fetch the user's ProConnect digital card profile, custom links, theme, and tap/scan stats.",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "update_my_digital_card",
    description: "Update digital card details (business name, professional title, description, phone, booking URL, theme, accent color).",
    inputSchema: {
      type: "object",
      properties: {
        businessName: { type: "string", description: "Practice/Company name" },
        professionalTitle: { type: "string", description: "Title (e.g. EA, Tax Strategist)" },
        businessDescription: { type: "string", description: "Short bio or service description" },
        phone: { type: "string", description: "Business phone" },
        bookingUrl: { type: "string", description: "Meeting or consultation booking URL (Calendly, etc.)" },
        theme: { type: "string", description: "Card theme (e.g. 'classic', 'modern', 'dark')" },
        accentColor: { type: "string", description: "Hex accent color (e.g. '#0a1628')" },
      },
    },
  },
  {
    name: "add_card_link",
    description: "Add a new button link to your ProConnect digital card (e.g. Schedule Call, Client Portal, Review Us).",
    inputSchema: {
      type: "object",
      properties: {
        label: { type: "string", description: "Button text" },
        url: { type: "string", description: "Destination URL" },
        icon: { type: "string", description: "Optional icon identifier (e.g. 'calendar', 'globe', 'star', 'linkedin')" },
      },
      required: ["label", "url"],
    },
  },
  {
    name: "update_card_link",
    description: "Update an existing link on your digital card.",
    inputSchema: {
      type: "object",
      properties: {
        linkId: { type: "string", description: "Link ID" },
        label: { type: "string", description: "Updated label" },
        url: { type: "string", description: "Updated URL" },
        isActive: { type: "boolean", description: "Enable or disable link" },
      },
      required: ["linkId"],
    },
  },
  {
    name: "delete_card_link",
    description: "Remove a link from your digital card.",
    inputSchema: {
      type: "object",
      properties: {
        linkId: { type: "string", description: "Link ID to remove" },
      },
      required: ["linkId"],
    },
  },
  {
    name: "get_card_analytics",
    description: "View ProConnect tap performance, page views, NFC taps, QR scans, and top clicked links.",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
];

export async function handleDigitalCardTool(
  toolName: string,
  args: any,
  user: UserSessionContext
): Promise<McpToolResponse> {
  try {
    switch (toolName) {
      case "get_my_digital_card": {
        const card = await prisma.digitalCard.findUnique({
          where: { userId: user.userId },
          include: {
            links: {
              orderBy: { order: "asc" },
            },
          },
        });

        if (!card) {
          return formatSuccess(
            { exists: false },
            "No digital card found for this account. You can create or activate one on TaxComPro."
          );
        }

        return formatSuccess({
          exists: true,
          cardUrl: `https://taxcomppro.com/c/${card.username}`,
          card,
        });
      }

      case "update_my_digital_card": {
        const { businessName, professionalTitle, businessDescription, phone, bookingUrl, theme, accentColor } = args;

        const updated = await prisma.digitalCard.update({
          where: { userId: user.userId },
          data: {
            ...(businessName !== undefined ? { businessName } : {}),
            ...(professionalTitle !== undefined ? { professionalTitle } : {}),
            ...(businessDescription !== undefined ? { businessDescription } : {}),
            ...(phone !== undefined ? { phone } : {}),
            ...(bookingUrl !== undefined ? { bookingUrl } : {}),
            ...(theme !== undefined ? { theme } : {}),
            ...(accentColor !== undefined ? { accentColor } : {}),
          },
        });

        return formatSuccess(updated, "Digital card updated successfully");
      }

      case "add_card_link": {
        const { label, url, icon } = args;
        const card = await prisma.digitalCard.findUnique({
          where: { userId: user.userId },
          include: { links: true },
        });

        if (!card) return formatError("You do not have a digital card yet.");

        const nextOrder = card.links.length;
        const link = await prisma.cardLink.create({
          data: {
            cardId: card.id,
            label,
            url,
            icon,
            order: nextOrder,
            isActive: true,
          },
        });

        return formatSuccess(link, "Link added to digital card");
      }

      case "update_card_link": {
        const { linkId, label, url, isActive } = args;
        // Verify link belongs to user's card
        const existing = await prisma.cardLink.findFirst({
          where: {
            id: linkId,
            card: { userId: user.userId },
          },
        });

        if (!existing) return formatError("Card link not found or access denied.");

        const updated = await prisma.cardLink.update({
          where: { id: linkId },
          data: {
            ...(label !== undefined ? { label } : {}),
            ...(url !== undefined ? { url } : {}),
            ...(isActive !== undefined ? { isActive: Boolean(isActive) } : {}),
          },
        });

        return formatSuccess(updated, "Link updated successfully");
      }

      case "delete_card_link": {
        const { linkId } = args;
        const existing = await prisma.cardLink.findFirst({
          where: {
            id: linkId,
            card: { userId: user.userId },
          },
        });

        if (!existing) return formatError("Card link not found or access denied.");

        await prisma.cardLink.delete({ where: { id: linkId } });
        return formatSuccess(null, "Card link deleted successfully");
      }

      case "get_card_analytics": {
        const card = await prisma.digitalCard.findUnique({
          where: { userId: user.userId },
          include: {
            links: {
              select: { id: true, label: true, url: true, clickCount: true, isActive: true },
              orderBy: { clickCount: "desc" },
            },
          },
        });

        if (!card) return formatError("No digital card found.");

        const totalLinkClicks = card.links.reduce((sum, link) => sum + link.clickCount, 0);

        return formatSuccess({
          username: card.username,
          pageViews: card.pageViews,
          nfcTaps: card.nfcTaps,
          qrScans: card.qrScans,
          totalInteractions: card.pageViews + card.nfcTaps + card.qrScans,
          totalLinkClicks,
          links: card.links,
        });
      }

      default:
        return formatError(`Unknown digital card tool: ${toolName}`);
    }
  } catch (error: any) {
    return formatError(error.message || "Error executing digital card tool", error);
  }
}


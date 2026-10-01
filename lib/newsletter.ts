import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";
import { BRAND, escapeHtml, renderButton, renderEmailShell } from "@/lib/email-template";

export * from "./newsletter-types";
import {
  AudienceSegmentKey,
  RecipientInfo,
} from "./newsletter-types";


/**
 * Resolves audience filter into recipient records, filtering out unsubscribed emails.
 */
export async function resolveAudienceRecipients(
  audience: AudienceSegmentKey,
  customEmails: string[] = []
): Promise<{ recipients: RecipientInfo[]; totalUnsubscribed: number }> {
  // 1. Get unsubscribed email list
  const unsubscribedRecords = await prisma.newsletterUnsubscribe.findMany({
    select: { email: true },
  });
  const unsubscribedSet = new Set(
    unsubscribedRecords.map((u) => u.email.toLowerCase().trim())
  );

  let recipients: RecipientInfo[] = [];

  if (audience === "CUSTOM") {
    // Custom email list
    const cleaned = customEmails
      .map((e) => e.trim().toLowerCase())
      .filter((e) => e && e.includes("@") && !unsubscribedSet.has(e));
    const unique = Array.from(new Set(cleaned));
    recipients = unique.map((email) => ({
      email,
      name: email.split("@")[0],
    }));
    return { recipients, totalUnsubscribed: unsubscribedSet.size };
  }

  // Database-driven user queries
  const whereClause: Record<string, unknown> = {};

  if (audience === "VERIFIED") {
    whereClause.emailVerified = true;
  } else if (audience === "PROS") {
    whereClause.tier = { in: ["MARKETPLACE", "MARKETPLACE_PLUS"] };
  } else if (audience === "MEMBERS") {
    whereClause.role = "MEMBER";
  } else if (audience === "TIER_VIP") {
    whereClause.tier = "VIP";
  } else if (audience === "TIER_MARKETPLACE") {
    whereClause.tier = { in: ["MARKETPLACE", "MARKETPLACE_PLUS"] };
  } else if (audience === "TIER_FREE") {
    whereClause.tier = "FREE";
  }

  const users = await prisma.user.findMany({
    where: whereClause,
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      tier: true,
    },
    orderBy: { createdAt: "desc" },
  });

  // Filter out any unsubscribed or invalid emails
  const filtered = users.filter((u) => {
    const normalized = (u.email || "").toLowerCase().trim();
    return normalized && normalized.includes("@") && !unsubscribedSet.has(normalized);
  });

  recipients = filtered.map((u) => ({
    id: u.id,
    email: u.email.trim(),
    name: u.name?.trim() || "Tax Professional",
    role: u.role,
    tier: u.tier,
  }));

  return {
    recipients,
    totalUnsubscribed: unsubscribedSet.size,
  };
}

/**
 * Compiles personalized email HTML for a recipient, including branding, tokens and CAN-SPAM footer.
 */
export function compileNewsletterForRecipient({
  recipient,
  subject,
  preheader,
  heading,
  bodyHtml,
  buttonLabel,
  buttonUrl,
  footerNote,
}: {
  recipient: RecipientInfo;
  subject: string;
  preheader?: string | null;
  heading: string;
  bodyHtml: string;
  buttonLabel?: string | null;
  buttonUrl?: string | null;
  footerNote?: string | null;
}): { compiledSubject: string; compiledHtml: string } {
  const firstName = recipient.name.split(" ")[0] || "there";
  const unsubscribeUrl = `${BRAND.site}/unsubscribe?email=${encodeURIComponent(
    recipient.email
  )}`;

  const vars: Record<string, string> = {
    name: escapeHtml(recipient.name),
    userName: escapeHtml(recipient.name),
    firstName: escapeHtml(firstName),
    email: escapeHtml(recipient.email),
    role: escapeHtml(recipient.role || "Member"),
    tier: escapeHtml(recipient.tier || "Standard"),
    siteUrl: BRAND.site,
    supportEmail: BRAND.supportEmail,
    unsubscribeUrl,
    currentYear: String(new Date().getFullYear()),
  };

  const replaceTokens = (str: string) => {
    return str.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_, key) => {
      return vars[key] !== undefined ? vars[key] : `{{${key}}}`;
    });
  };

  const compiledSubject = replaceTokens(subject);
  const compiledHeading = replaceTokens(heading);
  const compiledPreheader = preheader ? replaceTokens(preheader) : compiledSubject;
  const compiledBodyContent = replaceTokens(bodyHtml);
  const compiledButtonLabel = buttonLabel ? replaceTokens(buttonLabel) : "";
  const compiledButtonUrl = buttonUrl ? replaceTokens(buttonUrl) : "";
  const compiledCustomFooter = footerNote ? replaceTokens(footerNote) : "";

  // Render CTA Button if provided
  const buttonHtml =
    compiledButtonLabel && compiledButtonUrl
      ? renderButton({ href: compiledButtonUrl, label: compiledButtonLabel })
      : "";

  const finalBody = [compiledBodyContent, buttonHtml].filter(Boolean).join("\n");

  // CAN-SPAM compliant footer notice with unsubscribe link
  const canSpamFooter = `
    ${compiledCustomFooter ? `<p style="margin:0 0 10px 0;">${compiledCustomFooter}</p>` : ""}
    <p style="margin:0 0 8px 0;font-size:12px;color:#94a3b8;line-height:1.5;">
      Tax Compliance Pro &middot; 100% Tax Preparer Audit Defense &amp; Practice Solutions<br/>
      You are receiving this newsletter because you registered an account on <a href="${BRAND.site}" style="color:#ffbe24;text-decoration:none;">taxcomppro.com</a>.
    </p>
    <p style="margin:0;font-size:12px;color:#94a3b8;">
      Prefer not to receive promotional newsletters?
      <a href="${unsubscribeUrl}" target="_blank" rel="noopener noreferrer" style="color:#ffbe24;text-decoration:underline;font-weight:600;margin-left:4px;">
        Unsubscribe from marketing emails
      </a>
    </p>
  `.trim();

  const compiledHtml = renderEmailShell({
    preheader: compiledPreheader,
    heading: compiledHeading,
    body: finalBody,
    footerNote: canSpamFooter,
  });

  return {
    compiledSubject,
    compiledHtml,
  };
}

/**
 * Dispatches a single test email of the newsletter to the given address.
 */
export async function sendNewsletterTest({
  to,
  subject,
  preheader,
  heading,
  bodyHtml,
  buttonLabel,
  buttonUrl,
  footerNote,
  adminId,
}: {
  to: string;
  subject: string;
  preheader?: string | null;
  heading: string;
  bodyHtml: string;
  buttonLabel?: string | null;
  buttonUrl?: string | null;
  footerNote?: string | null;
  adminId?: string;
}) {
  const testRecipient: RecipientInfo = {
    email: to.trim(),
    name: "Admin Previewer",
    role: "ADMIN",
    tier: "VIP",
  };

  const { compiledSubject, compiledHtml } = compileNewsletterForRecipient({
    recipient: testRecipient,
    subject: `[TEST PREVIEW] ${subject}`,
    preheader,
    heading,
    bodyHtml,
    buttonLabel,
    buttonUrl,
    footerNote,
  });

  return sendEmail({
    to: to.trim(),
    subject: compiledSubject,
    html: compiledHtml,
    templateKey: "NEWSLETTER_TEST_PREVIEW",
    metadata: {
      isTest: true,
      sentByAdminId: adminId,
      campaignSubject: subject,
    },
  });
}

/**
 * Safe throttled batch dispatcher for broadcasting campaigns via Microsoft Graph.
 * Processes in chunks of 5 with 150ms delay between chunks to prevent 429 rate limiting.
 */
export async function dispatchNewsletterCampaign({
  campaignId,
  audience,
  customEmails = [],
  subject,
  preheader,
  heading,
  bodyHtml,
  buttonLabel,
  buttonUrl,
  footerNote,
  adminId,
}: {
  campaignId?: string;
  audience: AudienceSegmentKey;
  customEmails?: string[];
  subject: string;
  preheader?: string | null;
  heading: string;
  bodyHtml: string;
  buttonLabel?: string | null;
  buttonUrl?: string | null;
  footerNote?: string | null;
  adminId?: string;
}): Promise<{
  total: number;
  sent: number;
  failed: number;
  errors: Array<{ email: string; error: string }>;
}> {
  // 1. Resolve recipients
  const { recipients } = await resolveAudienceRecipients(audience, customEmails);

  if (recipients.length === 0) {
    throw new Error("No active recipients found matching the selected audience criteria.");
  }

  // Update campaign status if campaignId is provided
  if (campaignId) {
    await prisma.newsletterCampaign.update({
      where: { id: campaignId },
      data: {
        status: "SENDING",
        totalRecipients: recipients.length,
        sentAt: new Date(),
      },
    }).catch((err) => console.warn("[Newsletter] Failed to mark campaign SENDING:", err));
  }

  const BATCH_SIZE = 5;
  const DELAY_MS = 150;
  let sentCount = 0;
  let failedCount = 0;
  const errors: Array<{ email: string; error: string }> = [];

  for (let i = 0; i < recipients.length; i += BATCH_SIZE) {
    const batch = recipients.slice(i, i + BATCH_SIZE);

    const promises = batch.map(async (recipient) => {
      try {
        const { compiledSubject, compiledHtml } = compileNewsletterForRecipient({
          recipient,
          subject,
          preheader,
          heading,
          bodyHtml,
          buttonLabel,
          buttonUrl,
          footerNote,
        });

        await sendEmail({
          to: recipient.email,
          subject: compiledSubject,
          html: compiledHtml,
          templateKey: "NEWSLETTER_CAMPAIGN",
          metadata: {
            campaignId: campaignId || null,
            targetAudience: audience,
            recipientName: recipient.name,
            sentByAdminId: adminId,
          },
        });

        sentCount++;
      } catch (err) {
        failedCount++;
        const errorMsg = err instanceof Error ? err.message : "Send failed";
        errors.push({ email: recipient.email, error: errorMsg });
        console.error(`[Newsletter Broadcast] Failed for ${recipient.email}:`, err);
      }
    });

    await Promise.all(promises);

    // Optional delay between micro-batches to respect Microsoft Graph tenant concurrency
    if (i + BATCH_SIZE < recipients.length) {
      await new Promise((resolve) => setTimeout(resolve, DELAY_MS));
    }
  }

  // Final update to campaign record
  if (campaignId) {
    const finalStatus = failedCount === recipients.length ? "FAILED" : "SENT";
    await prisma.newsletterCampaign.update({
      where: { id: campaignId },
      data: {
        status: finalStatus,
        sentCount,
        failedCount,
        errorMessage: errors.length > 0 ? JSON.stringify(errors.slice(0, 10)) : null,
      },
    }).catch((err) => console.warn("[Newsletter] Failed to mark campaign SENT:", err));
  }

  return {
    total: recipients.length,
    sent: sentCount,
    failed: failedCount,
    errors,
  };
}

export const adminPromptDefinitions = [
  {
    name: "admin_daily_briefing",
    description: "Generate an executive operations briefing covering new users, revenue events, pending tickets, and moderation alerts.",
    arguments: [],
  },
  {
    name: "admin_audit_verification_summary",
    description: "Generate a formal audit and verification summary for a firm's staff compliance training licenses.",
    arguments: [
      {
        name: "user_email",
        description: "Email of the practitioner or firm owner",
        required: true,
      },
    ],
  },
];

export function handleAdminGetPrompt(
  name: string,
  args?: Record<string, string>
) {
  switch (name) {
    case "admin_daily_briefing": {
      return {
        description: "TaxComPro Daily Operations Executive Briefing",
        messages: [
          {
            role: "user" as const,
            content: {
              type: "text" as const,
              text: `You are the executive AI assistant for TaxComPro administration.
Using the administrative MCP tools available:
1. Call 'admin_get_platform_stats' to retrieve current platform totals, new users, and pending queues.
2. Check for pending affiliate payouts ('admin_list_pending_payouts').
3. Check for unanswered questions from members in Atlas AI ('admin_list_unanswered_questions').
4. Summarize this in an executive daily briefing with clear priorities and recommended immediate actions.`,
            },
          },
        ],
      };
    }

    case "admin_audit_verification_summary": {
      const email = args?.user_email || "the target user";
      return {
        description: `Audit & Compliance Verification for ${email}`,
        messages: [
          {
            role: "user" as const,
            content: {
              type: "text" as const,
              text: `Perform a compliance and license audit for practitioner: "${email}".
1. Fetch customer details with 'admin_get_user_details'.
2. Verify all active training licenses and staff seat allocations.
3. Review issued certificates and assessment attempts for their staff members.
4. Generate a formal IRS Due Diligence practice defense compliance summary verifying their audit readiness.`,
            },
          },
        ],
      };
    }

    default:
      throw new Error(`Prompt not found: ${name}`);
  }
}


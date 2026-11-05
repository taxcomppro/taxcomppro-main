export const userPromptDefinitions = [
  {
    name: "due_diligence_audit_checklist",
    description: "Generate a comprehensive IRS Due Diligence compliance checklist for tax returns (EITC, CTC, ACTC, ODC, AOTC, HOH).",
    arguments: [
      {
        name: "filing_type",
        description: "Filing situation (e.g. 'Schedule C sole proprietor with cash income', 'Head of household with dependents')",
        required: false,
      },
    ],
  },
  {
    name: "schedule_c_reconstruction_workflow",
    description: "Step-by-step guidance on reconstructing client Schedule C income, business bank records, and deductible expenses.",
    arguments: [
      {
        name: "client_situation",
        description: "Details of client's missing records, 1099-K, or commingled bank statements",
        required: true,
      },
    ],
  },
  {
    name: "draft_community_feed_post",
    description: "Draft a high-impact, professional tax practice post to publish directly to the TaxComPro community feed using the post_to_feed tool.",
    arguments: [
      {
        name: "topic",
        description: "The subject or insight (e.g., 'IRS 1099-K updates', 'Client audit win on Schedule C', 'Form 8867 due diligence tips')",
        required: true,
      },
      {
        name: "post_type",
        description: "Type of post: 'technical_insight', 'practice_tip', 'client_victory', 'irs_alert', or 'discussion_starter'",
        required: false,
      },
    ],
  },
];

export function handleUserGetPrompt(
  name: string,
  args?: Record<string, string>
) {
  switch (name) {
    case "due_diligence_audit_checklist": {
      const situation = args?.filing_type || "general due diligence";
      return {
        description: `IRS Due Diligence Audit Checklist for: ${situation}`,
        messages: [
          {
            role: "user" as const,
            content: {
              type: "text" as const,
              text: `You are an expert IRS compliance and due diligence specialist using TaxComPro practice defense toolkits.
Generate a structured, audit-proof checklist for: "${situation}".
Include:
1. Form 8867 (Paid Preparer's Due Diligence Checklist) requirements.
2. Necessary corroborating records (bank statements, mileage logs, receipts, school/medical residency proofs).
3. Red flags that trigger IRS audits or Form 8867 penalties (\$600+ per failure).
4. Notes and retention standards to protect the preparer's EFIN and license.`,
            },
          },
        ],
      };
    }

    case "schedule_c_reconstruction_workflow": {
      const situation = args?.client_situation || "missing receipts and mixed accounts";
      return {
        description: "Schedule C Reconstruction Workflow",
        messages: [
          {
            role: "user" as const,
            content: {
              type: "text" as const,
              text: `You are a TaxComPro Master Schedule C Reconstruction Consultant.
The client's scenario: "${situation}".
Provide a step-by-step reconstruction methodology compliant with the Cohan rule, IRS audit techniques guides (ATGs), and TaxComPro standard practice sheets.
Break down:
1. Income reconciliation (1099-NEC, 1099-K, merchant processors, bank deposits).
2. Expense substantiation categories (auto, travel, home office, supplies, contractors).
3. The reconstruction ledger formula.
4. Client representation letter & disclosure statements.`,
            },
          },
        ],
      };
    }

    case "draft_community_feed_post": {
      const topic = args?.topic || "Tax Practice Best Practices";
      const postType = args?.post_type || "technical_insight";
      return {
        description: `Draft Community Feed Post for: ${topic}`,
        messages: [
          {
            role: "user" as const,
            content: {
              type: "text" as const,
              text: `You are a seasoned tax practitioner and active member of the TaxComPro professional community.
Draft an engaging, authoritative, and helpful post about: "${topic}" (Format: ${postType}).

Guidelines:
1. Hook the reader with a practical reality tax practitioners face during filing or audit season.
2. Deliver concrete, actionable tax insights (referencing IRC code, IRS publications, or practice standards where relevant).
3. NEVER include real taxpayer PII (no SSNs, EINs, real client names, or bank numbers).
4. End with an open, thought-provoking question to invite comments and peer discussion from other CPAs, EAs, and tax pros.
5. Offer to call the \`post_to_feed\` tool to publish this post immediately to TaxComPro once approved.`,
            },
          },
        ],
      };
    }

    default:
      throw new Error(`Prompt not found: ${name}`);
  }
}


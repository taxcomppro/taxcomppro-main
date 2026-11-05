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

    default:
      throw new Error(`Prompt not found: ${name}`);
  }
}


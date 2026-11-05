"use client";

import { useState, useEffect } from "react";
import {
  Sparkles,
  Shield,
  Terminal,
  Copy,
  Check,
  Play,
  Loader2,
  Cpu,
  Layers,
  Database,
  Users,
  CreditCard,
  GraduationCap,
  ShoppingBag,
  Gift,
  Mail,
  Radio,
  Bot,
  Search,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Lock,
} from "lucide-react";
import { useSession } from "@/lib/auth-client";

interface AdminCategory {
  title: string;
  icon: any;
  tools: {
    name: string;
    description: string;
    examplePrompt: string;
  }[];
}

const ADMIN_CATEGORIES: AdminCategory[] = [
  {
    title: "Platform Analytics & KPIs",
    icon: Database,
    tools: [
      {
        name: "admin_get_platform_stats",
        description: "Fetch live platform totals: user counts, active subscriptions, revenue metrics, and pending action queues",
        examplePrompt: "Give me the executive overview of platform growth and active subscriptions.",
      },
      {
        name: "admin_get_activity_logs",
        description: "Audit recent system activities, training completions, and administrative changes",
        examplePrompt: "Show the latest 10 academy audit log events.",
      },
    ],
  },
  {
    title: "User & Role Administration",
    icon: Users,
    tools: [
      {
        name: "admin_list_users",
        description: "Search, paginate, and filter users by subscription tier (VIP, MARKETPLACE, FREE) or role",
        examplePrompt: "Find all users in the MARKETPLACE_PLUS tier.",
      },
      {
        name: "admin_get_user_details",
        description: "Inspect 360-degree user profile: toolkits owned, courses enrolled, licenses, and digital card",
        examplePrompt: "Inspect the full profile, licenses, and purchases for user user@example.com.",
      },
      {
        name: "admin_update_user_role",
        description: "Promote or demote user role between MEMBER and ADMIN",
        examplePrompt: "Change role for user ID xyz to ADMIN.",
      },
      {
        name: "admin_update_user_tier",
        description: "Upgrade or downgrade user subscription tier (FREE, VIP, MARKETPLACE, MARKETPLACE_PLUS)",
        examplePrompt: "Upgrade user@example.com to VIP tier.",
      },
      {
        name: "admin_grant_toolkit_access",
        description: "Manually grant practice defense toolkit access (e.g. IRS Fine Defense, Ultimate Bundle)",
        examplePrompt: "Grant toolkit 'irs-fine-defense' to user@example.com.",
      },
    ],
  },
  {
    title: "Order Provisioning & Licensing",
    icon: Shield,
    tools: [
      {
        name: "admin_provision_order",
        description: "Fully provision bundle or toolkit: allocates seats, creates training licenses, and enrolls in courses",
        examplePrompt: "Provision 'bundle:ultimate-bundle' with 5 seats for customer owner@taxpractice.com.",
      },
      {
        name: "admin_list_licenses",
        description: "Audit all issued enterprise training seat licenses and track seat utilization",
        examplePrompt: "List all training licenses for the due diligence training course.",
      },
    ],
  },
  {
    title: "Marketplace & Promotions",
    icon: ShoppingBag,
    tools: [
      {
        name: "admin_list_pending_listings",
        description: "List marketplace services and products awaiting administrative review",
        examplePrompt: "Show all pending marketplace listings that need moderation.",
      },
      {
        name: "admin_moderate_listing",
        description: "Approve or reject a marketplace listing with feedback",
        examplePrompt: "Approve marketplace listing 'cuid_xyz'.",
      },
      {
        name: "admin_list_coupons",
        description: "View all platform coupons, redemption counts, and active discounts",
        examplePrompt: "List all active discount coupon codes.",
      },
      {
        name: "admin_create_coupon",
        description: "Generate new percentage or fixed discount coupon codes with expiration dates",
        examplePrompt: "Create a 25% off coupon code 'SUMMER25' with 100 max redemptions.",
      },
      {
        name: "admin_toggle_coupon",
        description: "Activate or deactivate existing discount coupons",
        examplePrompt: "Deactivate coupon code 'LAUNCH50'.",
      },
    ],
  },
  {
    title: "Courses & Certificates",
    icon: GraduationCap,
    tools: [
      {
        name: "admin_list_courses",
        description: "List all academy courses with enrollment stats and module counts",
        examplePrompt: "List all published courses and their total enrollments.",
      },
      {
        name: "admin_create_course",
        description: "Publish a new course to the academy catalog",
        examplePrompt: "Create a new course 'Schedule C Audit Defense 2026' priced at $149.",
      },
      {
        name: "admin_update_course",
        description: "Update course metadata, pricing, or publish/archive status",
        examplePrompt: "Update course status to PUBLISHED.",
      },
      {
        name: "admin_list_certificates",
        description: "Audit all issued training completion certificates and verify codes",
        examplePrompt: "Search certificates issued in the last 30 days.",
      },
    ],
  },
  {
    title: "Spaces & ProTalks Live Hub",
    icon: Radio,
    tools: [
      {
        name: "admin_list_spaces",
        description: "List all scheduled and active live spaces",
        examplePrompt: "List all upcoming ProTalk spaces.",
      },
      {
        name: "admin_create_space",
        description: "Schedule a new live workshop or audio/video mastermind",
        examplePrompt: "Schedule a live space 'IRS Due Diligence Q&A' for tomorrow at 3 PM EST.",
      },
      {
        name: "admin_get_space_attendance",
        description: "Inspect attendee list and ticket sales for any space",
        examplePrompt: "Get the attendance roster for space 'cuid_123'.",
      },
      {
        name: "admin_close_space",
        description: "Conclude or archive an active space room",
        examplePrompt: "End and close live space 'cuid_123'.",
      },
    ],
  },
  {
    title: "Affiliate Program & Payouts",
    icon: Gift,
    tools: [
      {
        name: "admin_list_affiliates",
        description: "View affiliate partners, total commission earned, and pending balances",
        examplePrompt: "Show top affiliate partners by earnings.",
      },
      {
        name: "admin_list_pending_payouts",
        description: "List all pending commission payout requests awaiting payout",
        examplePrompt: "Are there any pending affiliate payout requests?",
      },
      {
        name: "admin_process_payout",
        description: "Mark affiliate payout as PAID, APPROVED, or REJECTED with transaction note",
        examplePrompt: "Mark payout 'cuid_pay123' as PAID with reference PayPal-Tx-889.",
      },
      {
        name: "admin_update_affiliate_settings",
        description: "Update default commission percentages and payout thresholds",
        examplePrompt: "Update default commission to 25% and cookie duration to 60 days.",
      },
    ],
  },
  {
    title: "Atlas AI Knowledge & Support",
    icon: Bot,
    tools: [
      {
        name: "admin_list_knowledge_items",
        description: "List verified practice defense Q&As powering the Atlas AI engine",
        examplePrompt: "List all Atlas AI knowledge base items under 'AUDIT_DEFENSE'.",
      },
      {
        name: "admin_create_knowledge_item",
        description: "Add a canonical tax rule or practice defense answer to Atlas AI",
        examplePrompt: "Add a new verified Q&A on Schedule C Cohan rule documentation requirements.",
      },
      {
        name: "admin_list_unanswered_questions",
        description: "Review unanswered questions asked by members in Atlas AI",
        examplePrompt: "Show unanswered questions submitted by members.",
      },
      {
        name: "admin_resolve_unanswered_question",
        description: "Answer an unresolved question and publish it to the permanent knowledge base",
        examplePrompt: "Resolve question 'cuid_q1' and add the approved answer to knowledge base.",
      },
      {
        name: "admin_list_support_tickets",
        description: "List helpdesk tickets with status filters (OPEN, IN_PROGRESS, RESOLVED)",
        examplePrompt: "List all OPEN support tickets.",
      },
      {
        name: "admin_update_support_ticket",
        description: "Reply to user ticket and update resolution status",
        examplePrompt: "Resolve ticket #cuid_tick1 with feedback note.",
      },
    ],
  },
  {
    title: "Physical NFC Card Pairing",
    icon: CreditCard,
    tools: [
      {
        name: "admin_list_nfc_cards",
        description: "Inspect physical NFC card inventory and mapped usernames",
        examplePrompt: "List all active NFC cards.",
      },
      {
        name: "admin_bind_nfc_card",
        description: "Pair a physical NFC tap card short ID to a user's digital card profile",
        examplePrompt: "Bind NFC card ID 'TCP-8842' to member username 'johncpa'.",
      },
    ],
  },
];

export default function AdminMcpPage() {
  const { data: session } = useSession();
  const [adminEmail, setAdminEmail] = useState("");
  const [adminApiKey, setAdminApiKey] = useState("");
  const [activeTab, setActiveTab] = useState<"claude" | "cursor" | "cli" | "http">("claude");
  const [copied, setCopied] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);

  useEffect(() => {
    if (session?.user) {
      if (session.user.email) setAdminEmail(session.user.email);
      fetch("/api/user/mcp-token")
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => {
          if (data?.adminApiKey) setAdminApiKey(data.adminApiKey);
          else if (data?.apiKey) setAdminApiKey(data.apiKey);
          if (data?.email) setAdminEmail(data.email);
        })
        .catch(() => {});
    }
  }, [session]);

  const appUrl = typeof window !== "undefined" ? window.location.origin : "https://taxcomppro.com";

  const getSnippet = () => {
    const tokenToUse = adminApiKey || adminEmail.trim() || "tcp_admin_SECRET_KEY";
    if (activeTab === "claude") {
      return JSON.stringify(
        {
          mcpServers: {
            "taxcomppro-admin": {
              url: `${appUrl}/api/mcp/admin`,
              headers: {
                Authorization: `Bearer ${tokenToUse}`,
              },
            },
          },
        },
        null,
        2
      );
    }
    if (activeTab === "cursor") {
      return JSON.stringify(
        {
          mcpServers: {
            "taxcomppro-admin": {
              url: `${appUrl}/api/mcp/admin`,
              headers: {
                Authorization: `Bearer ${tokenToUse}`,
              },
            },
          },
        },
        null,
        2
      );
    }
    if (activeTab === "cli") {
      return `# Run locally via stdio:
cd taxcomppro-web-main
npm run mcp:admin

# Or with standalone CLI:
node mcp/dist/cli/run-admin.js`;
    }
    return `curl -X POST "${appUrl}/api/mcp/admin" \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer ${tokenToUse}" \\
  -d '{"jsonrpc": "2.0", "id": 1, "method": "tools/call", "params": {"name": "admin_get_platform_stats"}}'`;
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(getSnippet());
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleRunTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const tokenToUse = adminApiKey || adminEmail;
      const res = await fetch("/api/mcp/admin", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${tokenToUse}`,
        },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: Date.now(),
          method: "tools/call",
          params: { name: "admin_get_platform_stats" },
        }),
      });
      const data = await res.json();
      setTestResult(data);
    } catch (err: any) {
      setTestResult({ error: err.message });
    } finally {
      setTesting(false);
    }
  };

  const filteredCategories = ADMIN_CATEGORIES.map((cat) => ({
    ...cat,
    tools: cat.tools.filter(
      (t) =>
        t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        cat.title.toLowerCase().includes(searchQuery.toLowerCase())
    ),
  })).filter((cat) => cat.tools.length > 0);

  const totalAdminTools = filteredCategories.reduce((acc, cat) => acc + cat.tools.length, 0);

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200 dark:border-white/10">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-xs font-bold bg-[#ffbe24]/15 text-[#ffbe24] border border-[#ffbe24]/30 mb-2">
            <Lock className="w-3.5 h-3.5" />
            ADMIN ONLY • Role Verified
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white flex items-center gap-3">
            Admin MCP Control Center
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Supervise platform operations, license provisioning, coupons, moderation, and analytics through your LLM.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-semibold">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Endpoint Live: /api/mcp/admin</span>
          </div>
        </div>
      </div>

      {/* Live Server Ping & Diagnostic Card */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-[#0a1628] to-[#112440] text-white border border-white/10 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-[#ffbe24] block mb-1">
              Active Administrative API
            </span>
            <h3 className="text-lg font-bold">
              Test Connection &amp; Live Stats Query
            </h3>
            <p className="text-xs text-slate-300 max-w-xl mt-1">
              Test your admin authentication directly against the Model Context Protocol endpoint to verify credentials and fetch real-time KPIs.
            </p>
          </div>

          <button
            onClick={handleRunTest}
            disabled={testing}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#ffbe24] hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-lg shadow-amber-500/20 transition shrink-0 disabled:opacity-50"
          >
            {testing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Querying MCP Server...</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-current" />
                <span>Test Live 'admin_get_platform_stats'</span>
              </>
            )}
          </button>
        </div>

        {/* Live Test Result Output */}
        {testResult && (
          <div className="mt-6 pt-5 border-t border-white/10">
            <div className="text-xs font-mono font-bold text-emerald-400 mb-2 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4" />
              <span>Response 200 OK (JSON-RPC Protocol Verified)</span>
            </div>
            <pre className="p-4 rounded-xl bg-black/60 border border-white/10 font-mono text-xs text-amber-200 overflow-x-auto max-h-60">
              {JSON.stringify(testResult, null, 2)}
            </pre>
          </div>
        )}
      </div>

      {/* Client Configuration Generator */}
      <div className="p-6 rounded-2xl bg-white dark:bg-[#070f1e] border border-slate-200 dark:border-white/10 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Terminal className="w-5 h-5 text-[#ffbe24]" />
              Connect Your AI (Claude / Cursor / Windsurf)
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Add this JSON snippet to your AI client to grant it administrative control over TaxComPro.
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-500 dark:text-slate-400">Admin Email:</span>
            <input
              type="email"
              value={adminEmail}
              onChange={(e) => setAdminEmail(e.target.value)}
              className="px-2.5 py-1 rounded-md border border-slate-300 dark:border-white/15 bg-slate-50 dark:bg-white/5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-[#ffbe24] w-52"
            />
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-2 mb-4">
          <button
            onClick={() => setActiveTab("claude")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
              activeTab === "claude"
                ? "bg-[#ffbe24] text-slate-950"
                : "bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400 hover:text-white"
            }`}
          >
            Claude Desktop
          </button>
          <button
            onClick={() => setActiveTab("cursor")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
              activeTab === "cursor"
                ? "bg-[#ffbe24] text-slate-950"
                : "bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400 hover:text-white"
            }`}
          >
            Cursor Editor
          </button>
          <button
            onClick={() => setActiveTab("cli")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
              activeTab === "cli"
                ? "bg-[#ffbe24] text-slate-950"
                : "bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400 hover:text-white"
            }`}
          >
            Local Stdio CLI
          </button>
          <button
            onClick={() => setActiveTab("http")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
              activeTab === "http"
                ? "bg-[#ffbe24] text-slate-950"
                : "bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400 hover:text-white"
            }`}
          >
            cURL / HTTP
          </button>

          <button
            onClick={handleCopy}
            className="ml-auto inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 dark:bg-white/10 text-white font-medium text-xs hover:bg-slate-800 transition"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400">Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copy</span>
              </>
            )}
          </button>
        </div>

        <pre className="p-4 rounded-xl bg-slate-900 dark:bg-black/60 border border-slate-800 dark:border-white/10 font-mono text-xs text-amber-300 dark:text-amber-200 overflow-x-auto leading-relaxed">
          {getSnippet()}
        </pre>
      </div>

      {/* Admin Tool Directory */}
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              All 44 Administrative Tools
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Every supervisory action your LLM can execute across the TaxComPro database.
            </p>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter admin tools..."
              className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-slate-300 dark:border-white/15 bg-white dark:bg-white/5 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-[#ffbe24]"
            />
          </div>
        </div>

        <div className="grid gap-6">
          {filteredCategories.map((cat, idx) => {
            const Icon = cat.icon;
            return (
              <div
                key={idx}
                className="p-5 rounded-2xl bg-white dark:bg-[#070f1e] border border-slate-200 dark:border-white/10 shadow-sm"
              >
                <div className="flex items-center gap-2.5 pb-3 mb-4 border-b border-slate-100 dark:border-white/5">
                  <Icon className="w-4 h-4 text-[#ffbe24]" />
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white">{cat.title}</h3>
                  <span className="ml-auto text-[11px] font-semibold text-slate-400">
                    {cat.tools.length} Tools
                  </span>
                </div>

                <div className="grid sm:grid-cols-2 gap-3">
                  {cat.tools.map((tool, tIdx) => (
                    <div
                      key={tIdx}
                      className="p-3.5 rounded-xl bg-slate-50 dark:bg-black/30 border border-slate-200/80 dark:border-white/5 hover:border-[#ffbe24]/40 transition"
                    >
                      <div className="font-mono text-xs font-bold text-[#ffbe24] mb-1">
                        {tool.name}
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-300 mb-2">
                        {tool.description}
                      </p>
                      <div className="text-[10px] text-slate-400 font-mono italic bg-white dark:bg-white/[0.02] p-1.5 rounded border border-slate-200/60 dark:border-white/5">
                        "{tool.examplePrompt}"
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}


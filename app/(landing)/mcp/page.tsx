"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Sparkles,
  Bot,
  Terminal,
  Shield,
  Copy,
  Check,
  Code,
  GraduationCap,
  BookOpen,
  Briefcase,
  CreditCard,
  ShoppingBag,
  Users,
  Radio,
  HelpCircle,
  TrendingUp,
  Search,
  ExternalLink,
  ChevronRight,
  Cpu,
  Layers,
  ArrowRight,
} from "lucide-react";
import { useSession } from "@/lib/auth-client";

interface ToolCategory {
  title: string;
  icon: any;
  badge: string;
  tools: {
    name: string;
    description: string;
    examplePrompt: string;
  }[];
}

const TOOL_CATEGORIES: ToolCategory[] = [
  {
    title: "Practice Defense Toolkits & Staff",
    icon: Shield,
    badge: "Flagship",
    tools: [
      {
        name: "list_my_toolkits",
        description: "List all practice defense toolkits owned (Audit Playbook, Schedule C Recon, IRS Fine Defense, etc.)",
        examplePrompt: "What practice defense toolkits do I have access to on TaxComPro?",
      },
      {
        name: "get_toolkit_assets",
        description: "Fetch downloadable templates, checklists, and spreadsheets for an owned toolkit",
        examplePrompt: "Get the due diligence spreadsheets and checklist assets for IRS Fine Defense.",
      },
      {
        name: "get_my_training_licenses",
        description: "View staff training licenses, total seats, and active usage counts",
        examplePrompt: "Check how many staff training seats I have left in my license.",
      },
      {
        name: "invite_staff_member",
        description: "Invite a team or staff member to complete compliance due diligence training",
        examplePrompt: "Invite preparer Sarah (sarah@taxoffice.com) to take the Staff Audit Ready course.",
      },
      {
        name: "get_staff_member_progress",
        description: "Monitor assessment score and completion status for an invited staff member",
        examplePrompt: "Check Sarah's assessment score and due diligence completion progress.",
      },
    ],
  },
  {
    title: "Academy, Courses & Certification",
    icon: GraduationCap,
    badge: "Education",
    tools: [
      {
        name: "list_enrolled_courses",
        description: "View all enrolled courses, progress %, and completed lessons",
        examplePrompt: "What courses am I enrolled in and how much have I completed?",
      },
      {
        name: "get_course_curriculum",
        description: "Inspect sections, lessons, video durations, and quizzes for any course",
        examplePrompt: "Show me the curriculum outline for Schedule C Reconstruction.",
      },
      {
        name: "get_lesson",
        description: "Fetch lesson notes, video info, and study materials",
        examplePrompt: "Get the lesson content for 'Automobile and Travel Expense Substantiation'.",
      },
      {
        name: "update_lesson_progress",
        description: "Mark lessons completed and advance curriculum progress",
        examplePrompt: "Mark lesson 3 as completed.",
      },
      {
        name: "get_course_quiz",
        description: "Retrieve quiz questions to test compliance knowledge",
        examplePrompt: "Fetch the quiz questions for module 2.",
      },
      {
        name: "submit_quiz_attempt",
        description: "Submit quiz answers, get scored instantly, and verify pass status",
        examplePrompt: "Submit my quiz answers for the IRS audit defense module.",
      },
      {
        name: "list_my_certificates",
        description: "Retrieve all verified course and training completion certificates",
        examplePrompt: "List all my earned TaxComPro compliance certificates.",
      },
      {
        name: "verify_certificate",
        description: "Validate any certificate number for proof of due diligence compliance",
        examplePrompt: "Verify certificate #TCP-2026-CERT-9481.",
      },
    ],
  },
  {
    title: "ProConnect Tap Card & Digital Profile",
    icon: CreditCard,
    badge: "Networking",
    tools: [
      {
        name: "get_my_digital_card",
        description: "View your ProConnect digital card, links, contact card, and themes",
        examplePrompt: "Show my digital business card details and public link.",
      },
      {
        name: "update_my_digital_card",
        description: "Update headline, practice bio, booking URL, and accent colors",
        examplePrompt: "Update my digital card title to 'Senior Tax Strategist & EA'.",
      },
      {
        name: "add_card_link",
        description: "Add custom action buttons (Calendly, Review Us, Client Portal, LinkedIn)",
        examplePrompt: "Add a button 'Schedule Tax Strategy Session' pointing to my booking link.",
      },
      {
        name: "get_card_analytics",
        description: "Track page views, NFC taps, QR scans, and link click performance",
        examplePrompt: "How many NFC taps and page views did my ProConnect card get this month?",
      },
    ],
  },
  {
    title: "Marketplace & Products",
    icon: ShoppingBag,
    badge: "Commerce",
    tools: [
      {
        name: "search_marketplace",
        description: "Search professional tax services, software tools, toolkits, and training",
        examplePrompt: "Search marketplace for Schedule C tax tools under $150.",
      },
      {
        name: "get_listing_details",
        description: "Inspect seller credentials, full product description, and pricing",
        examplePrompt: "Get details for 'Complete 1040 Due Diligence Checklist 2026'.",
      },
      {
        name: "list_my_purchases",
        description: "View past orders, software keys, and purchase receipts",
        examplePrompt: "Show my marketplace purchase history.",
      },
      {
        name: "validate_coupon",
        description: "Verify a promo code or partner discount before purchasing",
        examplePrompt: "Check if coupon code 'SAVE20' is valid for my order.",
      },
    ],
  },
  {
    title: "ProNetworks, Discussions & Live Spaces",
    icon: Users,
    badge: "Community",
    tools: [
      {
        name: "list_my_networks",
        description: "List joined private communities, mastermind circles, and networks",
        examplePrompt: "Which ProNetworks am I currently a member of?",
      },
      {
        name: "get_network_discussions",
        description: "Read recent practitioner discussion threads and compliance questions",
        examplePrompt: "What are the latest questions being discussed in the EA Mastermind group?",
      },
      {
        name: "post_discussion",
        description: "Post a question or case study for peer review in your network",
        examplePrompt: "Post a discussion asking how other pros handle 1099-K payment reconciliation.",
      },
      {
        name: "list_upcoming_spaces",
        description: "Browse scheduled ProTalks, live audio/video AMAs, and webinars",
        examplePrompt: "Are there any upcoming ProTalk live spaces this week?",
      },
      {
        name: "rsvp_to_space",
        description: "Reserve your seat for an upcoming live space or workshop",
        examplePrompt: "RSVP to the IRS Audit Season Masterclass live space.",
      },
    ],
  },
  {
    title: "Atlas AI Tax Knowledge & Support",
    icon: Bot,
    badge: "AI & Helpdesk",
    tools: [
      {
        name: "ask_atlas_tax_expert",
        description: "Query verified practice defense rules, due diligence, and IRC standards",
        examplePrompt: "Ask Atlas what documents are required to corroborate cash income on Schedule C.",
      },
      {
        name: "create_support_ticket",
        description: "Submit a support ticket directly to the TaxComPro helpdesk",
        examplePrompt: "Open a support ticket regarding accessing my course download files.",
      },
      {
        name: "list_my_support_tickets",
        description: "Check the status and admin responses to your open tickets",
        examplePrompt: "Check if there are any replies on my open support tickets.",
      },
    ],
  },
];

export default function McpPage() {
  const { data: session } = useSession();
  const [activeTab, setActiveTab] = useState<"claude" | "cursor" | "windsurf" | "http">("claude");
  const [copied, setCopied] = useState(false);
  const [userEmail, setUserEmail] = useState(session?.user?.email || "practitioner@example.com");
  const [searchQuery, setSearchQuery] = useState("");

  const appUrl = typeof window !== "undefined" ? window.location.origin : "https://taxcomppro.com";

  const getSnippet = () => {
    const emailToUse = userEmail.trim() || "practitioner@example.com";
    if (activeTab === "claude") {
      return JSON.stringify(
        {
          mcpServers: {
            "taxcomppro-user": {
              url: `${appUrl}/api/mcp/user`,
              headers: {
                Authorization: `Bearer ${emailToUse}`,
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
            "taxcomppro-user": {
              url: `${appUrl}/api/mcp/user`,
              headers: {
                Authorization: `Bearer ${emailToUse}`,
              },
            },
          },
        },
        null,
        2
      );
    }
    if (activeTab === "windsurf") {
      return JSON.stringify(
        {
          mcpServers: {
            "taxcomppro-user": {
              serverUrl: `${appUrl}/api/mcp/user`,
              headers: {
                Authorization: `Bearer ${emailToUse}`,
              },
            },
          },
        },
        null,
        2
      );
    }
    return `curl -X POST "${appUrl}/api/mcp/user" \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer ${emailToUse}" \\
  -d '{"jsonrpc": "2.0", "id": 1, "method": "tools/list"}'`;
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(getSnippet());
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const filteredCategories = TOOL_CATEGORIES.map((cat) => ({
    ...cat,
    tools: cat.tools.filter(
      (t) =>
        t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        cat.title.toLowerCase().includes(searchQuery.toLowerCase())
    ),
  })).filter((cat) => cat.tools.length > 0);

  const totalFilteredTools = filteredCategories.reduce((acc, cat) => acc + cat.tools.length, 0);

  return (
    <div className="min-h-screen bg-[#060e1a] text-slate-100 selection:bg-[#ffbe24] selection:text-black">
      {/* Hero Section */}
      <section className="relative pt-28 pb-20 overflow-hidden border-b border-white/10">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-gradient-to-b from-[#ffbe24]/15 to-transparent rounded-full blur-[140px] pointer-events-none" />

        <div className="max-w-6xl mx-auto px-5 sm:px-6 relative z-10 text-center">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-[#ffbe24]/15 text-[#ffbe24] border border-[#ffbe24]/30 mb-6">
            <Sparkles className="w-4 h-4" />
            TaxComPro Model Context Protocol (MCP) Standard
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white mb-6">
            Connect Your AI Directly to <br className="hidden sm:inline" />
            <span className="bg-gradient-to-r from-[#ffbe24] via-amber-300 to-yellow-500 bg-clip-text text-transparent">
              Your TaxComPro Practice
            </span>
          </h1>

          <p className="max-w-3xl mx-auto text-lg sm:text-xl text-slate-300 leading-relaxed mb-10">
            Empower Claude Desktop, Cursor, ChatGPT, or Windsurf with <strong>48 dedicated tools</strong>.
            Your AI can now check enrolled courses, verify IRS audit defense assets, manage staff compliance seats,
            query Atlas AI, and pull ProConnect digital card analytics in real-time.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4 text-sm font-medium">
            <a
              href="#config-generator"
              className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl font-bold bg-[#ffbe24] text-slate-950 hover:bg-amber-400 shadow-lg shadow-amber-500/20 transition"
            >
              <Cpu className="w-4 h-4" />
              Get Your MCP Config
            </a>
            <a
              href="#tool-directory"
              className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl font-bold bg-white/5 border border-white/15 text-white hover:bg-white/10 transition"
            >
              <Layers className="w-4 h-4" />
              Browse 48 Available Tools
            </a>
          </div>

          {/* Quick Feature Pills */}
          <div className="mt-14 pt-8 border-t border-white/10 grid grid-cols-2 md:grid-cols-4 gap-4 text-left">
            <div className="p-4 rounded-xl bg-white/[0.03] border border-white/5">
              <div className="text-xs font-semibold text-[#ffbe24] uppercase tracking-wider mb-1">Compatibility</div>
              <div className="text-sm font-bold text-white">Claude, Cursor, Windsurf</div>
              <div className="text-xs text-slate-400 mt-1">Works with any MCP-enabled LLM</div>
            </div>
            <div className="p-4 rounded-xl bg-white/[0.03] border border-white/5">
              <div className="text-xs font-semibold text-[#ffbe24] uppercase tracking-wider mb-1">Architecture</div>
              <div className="text-sm font-bold text-white">Direct Remote HTTP & Stdio</div>
              <div className="text-xs text-slate-400 mt-1">Zero local software install needed</div>
            </div>
            <div className="p-4 rounded-xl bg-white/[0.03] border border-white/5">
              <div className="text-xs font-semibold text-[#ffbe24] uppercase tracking-wider mb-1">Security</div>
              <div className="text-sm font-bold text-white">Tenant-Isolated Access</div>
              <div className="text-xs text-slate-400 mt-1">Your AI only sees your practice data</div>
            </div>
            <div className="p-4 rounded-xl bg-white/[0.03] border border-white/5">
              <div className="text-xs font-semibold text-[#ffbe24] uppercase tracking-wider mb-1">Tool Count</div>
              <div className="text-sm font-bold text-white">48 User Tools + Resources</div>
              <div className="text-xs text-slate-400 mt-1">Full platform coverage</div>
            </div>
          </div>
        </div>
      </section>

      {/* Interactive Config Generator Section */}
      <section id="config-generator" className="py-20 bg-[#0a1628]/70 border-b border-white/10">
        <div className="max-w-5xl mx-auto px-5 sm:px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-3">
              1-Minute Setup Configurator
            </h2>
            <p className="text-slate-400 max-w-xl mx-auto">
              Select your AI tool below, enter your TaxComPro account email, and copy the configuration snippet.
            </p>
          </div>

          <div className="bg-[#050b14] border border-white/15 rounded-2xl shadow-2xl overflow-hidden">
            {/* Header / Tabs */}
            <div className="p-5 bg-white/[0.02] border-b border-white/10 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setActiveTab("claude")}
                  className={`px-4 py-2 rounded-lg text-xs font-bold transition ${
                    activeTab === "claude"
                      ? "bg-[#ffbe24] text-slate-950"
                      : "text-slate-400 hover:text-white bg-white/5"
                  }`}
                >
                  Claude Desktop
                </button>
                <button
                  onClick={() => setActiveTab("cursor")}
                  className={`px-4 py-2 rounded-lg text-xs font-bold transition ${
                    activeTab === "cursor"
                      ? "bg-[#ffbe24] text-slate-950"
                      : "text-slate-400 hover:text-white bg-white/5"
                  }`}
                >
                  Cursor Editor
                </button>
                <button
                  onClick={() => setActiveTab("windsurf")}
                  className={`px-4 py-2 rounded-lg text-xs font-bold transition ${
                    activeTab === "windsurf"
                      ? "bg-[#ffbe24] text-slate-950"
                      : "text-slate-400 hover:text-white bg-white/5"
                  }`}
                >
                  Windsurf
                </button>
                <button
                  onClick={() => setActiveTab("http")}
                  className={`px-4 py-2 rounded-lg text-xs font-bold transition ${
                    activeTab === "http"
                      ? "bg-[#ffbe24] text-slate-950"
                      : "text-slate-400 hover:text-white bg-white/5"
                  }`}
                >
                  cURL / Raw HTTP
                </button>
              </div>

              {/* Email Input for personalized config */}
              <div className="flex items-center gap-2 text-xs">
                <span className="text-slate-400">Account Email:</span>
                <input
                  type="email"
                  value={userEmail}
                  onChange={(e) => setUserEmail(e.target.value)}
                  placeholder="your@email.com"
                  className="bg-white/10 border border-white/15 rounded-md px-2.5 py-1 text-white text-xs focus:outline-none focus:border-[#ffbe24] w-48"
                />
              </div>
            </div>

            {/* Code Block Container */}
            <div className="p-6 relative">
              <div className="flex items-center justify-between text-xs text-slate-400 mb-3">
                <div className="flex items-center gap-2 font-mono">
                  <Terminal className="w-4 h-4 text-[#ffbe24]" />
                  {activeTab === "claude" && "%APPDATA%\\Claude\\claude_desktop_config.json"}
                  {activeTab === "cursor" && ".cursor/mcp.json (or Settings -> MCP)"}
                  {activeTab === "windsurf" && "~/.codeium/windsurf/mcp_config.json"}
                  {activeTab === "http" && "Standard JSON-RPC 2.0 Endpoint"}
                </div>

                <button
                  onClick={handleCopy}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-white font-medium text-xs transition border border-white/10"
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-emerald-400">Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy Config</span>
                    </>
                  )}
                </button>
              </div>

              <pre className="p-5 rounded-xl bg-black/60 border border-white/5 font-mono text-xs text-amber-200 overflow-x-auto leading-relaxed">
                {getSnippet()}
              </pre>
            </div>

            {/* Step-by-Step Instructions */}
            <div className="px-6 py-4 bg-white/[0.02] border-t border-white/10 text-xs text-slate-400 grid sm:grid-cols-3 gap-4">
              <div>
                <span className="font-bold text-white block mb-1">1. Copy Configuration</span>
                Click the Copy Config button above with your registered TaxComPro email.
              </div>
              <div>
                <span className="font-bold text-white block mb-1">2. Paste in Client</span>
                Paste inside your Claude Desktop or Cursor MCP settings file.
              </div>
              <div>
                <span className="font-bold text-white block mb-1">3. Start Chatting</span>
                Restart your LLM client. Your AI will now automatically see all 48 tools!
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Tool Directory & Explorer */}
      <section id="tool-directory" className="py-20">
        <div className="max-w-6xl mx-auto px-5 sm:px-6">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
            <div>
              <div className="text-xs font-semibold text-[#ffbe24] uppercase tracking-wider mb-2">
                Protocol Capability Inventory
              </div>
              <h2 className="text-3xl sm:text-4xl font-bold text-white">
                All 48 User MCP Tools
              </h2>
              <p className="text-slate-400 mt-2">
                Every tool available to your LLM when connected to your TaxComPro account.
              </p>
            </div>

            {/* Search Input */}
            <div className="relative w-full md:w-72">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search tools or prompts..."
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-[#ffbe24] transition"
              />
            </div>
          </div>

          {/* Categories Grid */}
          <div className="space-y-10">
            {filteredCategories.map((cat, idx) => {
              const Icon = cat.icon;
              return (
                <div key={idx} className="bg-white/[0.02] border border-white/10 rounded-2xl p-6 sm:p-8">
                  <div className="flex items-center justify-between mb-6 pb-4 border-b border-white/10">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-[#ffbe24]/10 border border-[#ffbe24]/20 flex items-center justify-center text-[#ffbe24]">
                        <Icon className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-white">{cat.title}</h3>
                        <span className="text-xs text-slate-400">{cat.tools.length} Tools Available</span>
                      </div>
                    </div>
                    <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-white/5 text-slate-300 border border-white/10">
                      {cat.badge}
                    </span>
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    {cat.tools.map((tool, tIdx) => (
                      <div
                        key={tIdx}
                        className="p-4 rounded-xl bg-black/40 border border-white/5 hover:border-white/15 transition flex flex-col justify-between"
                      >
                        <div>
                          <div className="flex items-center gap-2 mb-1.5">
                            <span className="font-mono text-xs font-bold text-[#ffbe24]">{tool.name}</span>
                          </div>
                          <p className="text-xs text-slate-300 leading-relaxed mb-3">
                            {tool.description}
                          </p>
                        </div>

                        <div className="mt-2 pt-2 border-t border-white/5">
                          <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                            Example AI Prompt:
                          </span>
                          <span className="text-xs text-amber-100/90 italic font-mono bg-white/[0.03] px-2 py-1 rounded block">
                            "{tool.examplePrompt}"
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          {filteredCategories.length === 0 && (
            <div className="text-center py-16 bg-white/[0.02] rounded-2xl border border-white/10">
              <HelpCircle className="w-8 h-8 text-slate-500 mx-auto mb-3" />
              <p className="text-slate-400 text-sm">No tools found matching "{searchQuery}".</p>
            </div>
          )}
        </div>
      </section>

      {/* Prompts & Resources Callout */}
      <section className="py-16 bg-gradient-to-r from-[#0a1628] to-[#12284c] border-y border-white/10">
        <div className="max-w-5xl mx-auto px-5 sm:px-6 grid md:grid-cols-2 gap-8 items-center">
          <div>
            <div className="inline-flex items-center gap-2 text-xs font-semibold text-[#ffbe24] uppercase tracking-wider mb-2">
              <Bot className="w-4 h-4" />
              Pre-Engineered Prompts Included
            </div>
            <h3 className="text-2xl sm:text-3xl font-bold text-white mb-4">
              Ask Your AI for Full Audit Checklists & Reconstruction Ledgers
            </h3>
            <p className="text-slate-300 text-sm leading-relaxed mb-6">
              Our MCP server provides native prompt templates that teach your LLM IRS Form 8867 standards,
              due diligence penalty protection (\$600+ per failure), and Schedule C ledger formulas automatically.
            </p>
            <div className="space-y-2 text-xs text-slate-300">
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-400" />
                <span><code className="text-[#ffbe24]">due_diligence_audit_checklist</code>: Audit-proof preparer checklists</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-400" />
                <span><code className="text-[#ffbe24]">schedule_c_reconstruction_workflow</code>: Cohan rule substantiation workflows</span>
              </div>
            </div>
          </div>

          <div className="p-6 rounded-2xl bg-black/60 border border-white/10 font-mono text-xs text-slate-300">
            <div className="text-[#ffbe24] mb-2 font-bold">// In your Claude or Cursor chat:</div>
            <p className="text-white italic">
              "Use TaxComPro due_diligence_audit_checklist for a sole proprietor claiming EITC with cash receipts."
            </p>
            <div className="mt-4 pt-3 border-t border-white/10 text-slate-400 text-[11px]">
              → AI immediately pulls verified requirements and cross-checks your toolkit assets.
            </div>
          </div>
        </div>
      </section>

      {/* Final Call to Action */}
      <section className="py-20 text-center">
        <div className="max-w-3xl mx-auto px-5 sm:px-6">
          <h2 className="text-3xl font-extrabold text-white mb-4">
            Transform Your Tax Practice with Connected AI
          </h2>
          <p className="text-slate-400 mb-8 text-base">
            Get started today. Free for all registered TaxComPro members.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <a
              href="#config-generator"
              className="px-6 py-3.5 rounded-xl font-bold bg-[#ffbe24] text-slate-950 hover:bg-amber-400 transition"
            >
              Get Your Setup Snippet
            </a>
            <Link
              href="/upgrade"
              className="px-6 py-3.5 rounded-xl font-bold bg-white/5 border border-white/15 text-white hover:bg-white/10 transition"
            >
              Explore Membership Tiers
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}


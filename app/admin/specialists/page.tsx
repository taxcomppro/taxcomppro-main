"use client";
import { useAdminDialog } from "@/components/layout/useAdminDialog";
import { useCallback, useEffect, useState, useRef } from "react";
import Link from "next/link";
import {
  SparklesIcon,
  PlayIcon,
  PauseIcon,
  Settings01Icon,
  ArrowUpRight01Icon,
  Delete02Icon,
  Add01Icon,
  CheckmarkCircle01Icon,
  SentIcon,
  RefreshIcon,
  Search01Icon,
  Link01Icon,
  Image01Icon,
} from "hugeicons-react";
import LinkifiedText from "@/components/ui/LinkifiedText";

export type Knowledge = {
  id?: string;
  title: string;
  category?: string;
  text: string;
  url?: string;
  priority: number;
  approved: boolean;
  reviewedAt?: string;
};

export type Bot = {
  id: string;
  userId: string;
  user: { name: string; image: string; profileSlug: string };
  title: string;
  about: string;
  expertise: string[];
  starters: string[];
  signature: string;
  courseNames: string[];
  personality: string;
  boundaries: string;
  provider: "auto" | "openai" | "claude";
  model: string;
  temperature: number;
  postTone: string;
  postLength: string;
  postDays: string[];
  postTime: string;
  timezone: string;
  maxDailyReplies: number;
  customPrompt?: string | null;
  enabled: boolean;
  autoPublish: boolean;
  autoReply: boolean;
  weeklyPosts: number;
  destination: "FEED" | "GROUP" | "FORUM" | "NETWORK";
  destinationId: string | null;
  knowledge: Knowledge[];
};

export type Activity = {
  id: string;
  specialistId: string;
  kind: string;
  status: string;
  content: string;
  error: string | null;
  provider: string | null;
  publishedUrl: string | null;
  createdAt: string;
};

type Option = { id: string; name: string };
type Data = {
  bots: Bot[];
  activities: Activity[];
  providers: { openai: boolean; claude: boolean };
  schedulerConfigured: boolean;
  groups: Option[];
  forums: Option[];
  networks: Option[];
  courses: { id: string; title: string; instructorId: string }[];
};

const PRESET_AVATARS = [
  { name: "Atlas (Robot)", image: "/Atlas.jpg" },
  { name: "Celeste Rowan", image: "/Celeste.jpg" },
  { name: "Vega Bennett", image: "/Vega.jpg" },
  { name: "Nova Grant", image: "/Nova.jpg" },
  { name: "Lyra Vance", image: "/Lyra.jpg" },
  { name: "Marcus Reed", image: "/Orion.jpg" },
  { name: "Elara Quinn", image: "/elara.jpg" },
];

const DAYS_OF_WEEK = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];

const KNOWLEDGE_TEMPLATES = [
  {
    title: "IRS Form 8867 Paid Preparer Due Diligence",
    category: "IRS Guidance",
    priority: 2,
    text: "Treas. Reg. § 1.6695-2 requires paid tax return preparers to exercise due diligence in determining eligibility for EITC, CTC/ACTC/ODC, AOTC, and Head of Household (HOH) filing status. Preparers must complete Form 8867, meet the knowledge requirement by asking probing questions when information appears inconsistent or incomplete, verify qualifying child residence and relationship, and retain all documentation for 3 years from the date filed.",
  },
  {
    title: "IRC § 162 Trade or Business Expenses & Substantiation",
    category: "Tax Code / Law",
    priority: 1,
    text: "Under IRC § 162(a), taxpayers may deduct all ordinary and necessary expenses paid or incurred during the taxable year in carrying on any trade or business. An expense is 'ordinary' if it is common and accepted in the field of business, and 'necessary' if it is helpful and appropriate. Under IRC § 274(d), strict substantiation (adequate records of amount, time, place, and business purpose) is required for travel, gifts, and listed property.",
  },
  {
    title: "Schedule C Record Reconstruction & Cohan Rule Limits",
    category: "Firm SOP",
    priority: 4,
    text: "When primary receipts are lost or unavailable, preparers can assist with systematic record reconstruction using bank statements, credit card records, supplier invoices, calendar logs, and third-party confirmations. Under the Cohan rule (Cohan v. Commissioner, 39 F.2d 540), reasonable estimates may be permitted for general business deductions, but Cohan does NOT apply to § 274(d) expenses (meals, travel, vehicles). Never manufacture invoices.",
  },
  {
    title: "Treasury Department Circular 230 § 10.37 Written Advice",
    category: "Tax Code / Law",
    priority: 1,
    text: "Circular 230 § 10.37 establishes requirements for written tax advice: the practitioner must base the advice on reasonable factual and legal assumptions, reasonably consider all relevant facts known or that should be known, exercise reasonable effort to identify relevant facts, not rely on unreasonable representations, and relate the applicable law to the actual facts.",
  },
];

const SAMPLE_MANUAL_TEMPLATES = [
  {
    label: "IRS Form 8867 Due Diligence Reminder",
    content: "Tax preparers: Form 8867 due diligence is not optional when claiming EITC, CTC, or Head of Household status.\n\nAlways ask probing questions and retain your supporting verification notes for at least 3 years.\n\nReview the latest IRS guidance: [IRS Form 8867 Details](https://www.irs.gov/forms-pubs/about-form-8867)\n\nWhat is your firm's standard intake process for verifying qualifying child residency?",
  },
  {
    label: "Schedule C Substantiation & Record Reconstruction",
    content: "When Schedule C clients come in with missing receipts, bank statements and third-party vendor logs are your best starting point.\n\nRemember: The Cohan rule allows reasonable estimates for general expenses, but strict § 274(d) substantiation is required for meals, travel, and listed property.\n\nHow do you handle client record reconstruction during crunch periods?",
  },
  {
    label: "Tax Practice Growth & Advisory Packaging",
    content: "Transitioning from 1040 volume preparation to monthly tax planning and compliance advisory can double your firm's average revenue per client.\n\nStart by offering proactive quarterly tax reviews and audit-readiness checkups.\n\nWhat is the biggest roadblock you face when raising your tax fees?",
  },
  {
    label: "IRS Notice & Audit Defense Protocol",
    content: "Receiving an IRS CP2000 or audit inquiry requires quick, methodical action.\n\nNever send the IRS original records — always submit organized copies with a clear reconciliation cover letter and Form 2848 Power of Attorney.\n\nWhat is your go-to workflow when a client receives an unexpected IRS letter?",
  },
];

export default function SpecialistsAdmin() {
  const [data, setData] = useState<Data | null>(null);
  const [editing, setEditing] = useState<Bot | null>(null);
  const [activeTab, setActiveTab] = useState<"profile" | "schedule" | "knowledge" | "engine" | "playground">("profile");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [draft, setDraft] = useState<Activity | null>(null);
  
  // Knowledge & Tag local helpers
  const [newTag, setNewTag] = useState("");
  const [newStarter, setNewStarter] = useState("");
  const [knowledgeSearch, setKnowledgeSearch] = useState("");
  const [knowledgeCategoryFilter, setKnowledgeCategoryFilter] = useState("ALL");
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Playground state
  const [testQuestion, setTestQuestion] = useState("");
  const [testLoading, setTestLoading] = useState(false);
  const [testAnswer, setTestAnswer] = useState<{ text: string; provider?: string } | null>(null);

  // Activity queue filter
  const [activityBotFilter, setActivityBotFilter] = useState("ALL");
  const [activityStatusFilter, setActivityStatusFilter] = useState("ALL");

  // Manual Specialist Post Modal State
  const [manualPostOpen, setManualPostOpen] = useState(false);
  const [manualSpecialistId, setManualSpecialistId] = useState("");
  const [manualDestination, setManualDestination] = useState<"FEED" | "GROUP" | "FORUM" | "NETWORK">("FEED");
  const [manualDestinationId, setManualDestinationId] = useState<string>("");
  const [manualContent, setManualContent] = useState("");
  const [manualImages, setManualImages] = useState<string[]>([]);
  const [uploadingManualImage, setUploadingManualImage] = useState(false);
  const manualFileInputRef = useRef<HTMLInputElement>(null);
  const [manualLinkUrl, setManualLinkUrl] = useState("");
  const [manualLinkText, setManualLinkText] = useState("");
  const [showManualLinkHelper, setShowManualLinkHelper] = useState(false);

  // Draft Editor Link Helper State
  const [draftLinkUrl, setDraftLinkUrl] = useState("");
  const [draftLinkText, setDraftLinkText] = useState("");
  const [showDraftLinkHelper, setShowDraftLinkHelper] = useState(false);

  // Delete Confirmation State
  const [deleteConfirmTarget, setDeleteConfirmTarget] = useState<{ id: string; type: "published" | "entry"; label: string } | null>(null);

  const closeDialog = useCallback(() => {
    setEditing(null);
    setDraft(null);
    setTestAnswer(null);
    setTestQuestion("");
    setManualPostOpen(false);
    setManualImages([]);
    setUploadingManualImage(false);
    setShowManualLinkHelper(false);
    setShowDraftLinkHelper(false);
    setDeleteConfirmTarget(null);
  }, []);

  useAdminDialog(!!editing || !!draft || manualPostOpen || !!deleteConfirmTarget, closeDialog);

  const load = useCallback(async () => {
    const r = await fetch("/api/admin/specialists");
    if (!r.ok) throw new Error("Could not load specialists.");
    const json = await r.json();
    setData(json);
    if (json.bots?.length && !manualSpecialistId) {
      setManualSpecialistId(json.bots[0].id);
    }
  }, [manualSpecialistId]);

  useEffect(() => {
    void load().catch((e) => setError(e.message));
  }, [load]);

  async function action(
    actionName: string,
    id?: string,
    extra: Record<string, unknown> = {},
  ) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const r = await fetch("/api/admin/specialists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: actionName, id, ...extra }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      await load();
      if (actionName === "draft") {
        setNotice("Draft generated. Review it in the queue below.");
      } else if (actionName === "postNow") {
        setNotice("Specialist post generated and published live!");
      } else if (actionName === "publish") {
        setNotice("Post published successfully!");
      } else if (actionName === "deletePublished") {
        setNotice("Live post deleted and removed from feed.");
      } else if (actionName === "deleteActivity") {
        setNotice("Activity entry deleted.");
      } else if (actionName === "discard") {
        setNotice("Activity discarded and unlinked.");
      } else if (actionName === "runSchedule") {
        setNotice(`Schedule triggered. Results: ${JSON.stringify(d.results)}`);
      } else {
        setNotice("Changes saved.");
      }
      setDraft(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Action failed");
    } finally {
      setBusy(false);
    }
  }

  async function handleManualImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || !files.length) return;
    const remaining = 4 - manualImages.length;
    if (remaining <= 0) {
      setError("Maximum 4 images allowed per post.");
      return;
    }
    const filesToUpload = Array.from(files).slice(0, remaining);
    setUploadingManualImage(true);
    setError("");
    try {
      const fd = new FormData();
      filesToUpload.forEach((f) => fd.append("files", f));
      fd.append("folder", "taxcomppro/specialists");
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "Image upload failed");
      const urls: string[] = d.urls || (d.url ? [d.url] : []);
      setManualImages((prev) => [...prev, ...urls].slice(0, 4));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not upload image(s)");
    } finally {
      setUploadingManualImage(false);
      if (manualFileInputRef.current) manualFileInputRef.current.value = "";
    }
  }

  const removeManualImage = (idx: number) => {
    setManualImages((prev) => prev.filter((_, i) => i !== idx));
  };

  async function handleManualPost(publishNow: boolean) {
    if (!manualContent.trim() && manualImages.length === 0) {
      setError("Please enter post content or upload an image.");
      return;
    }
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const r = await fetch("/api/admin/specialists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "manualPost",
          specialistId: manualSpecialistId,
          content: manualContent.trim(),
          images: manualImages,
          destination: manualDestination,
          destinationId: manualDestinationId || null,
          publishNow,
        }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Could not complete action");
      await load();
      setManualPostOpen(false);
      setManualContent("");
      setManualImages([]);
      setManualLinkUrl("");
      setManualLinkText("");
      setShowManualLinkHelper(false);
      const specialistName = data?.bots.find((b) => b.id === manualSpecialistId)?.user.name || "specialist";
      setNotice(
        publishNow
          ? `Post published live as ${specialistName}!`
          : `Draft post saved to activity queue for review.`
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create specialist post");
    } finally {
      setBusy(false);
    }
  }

  const openManualPostModal = (bot?: Bot) => {
    if (bot) {
      setManualSpecialistId(bot.id);
      setManualDestination(bot.destination || "FEED");
      setManualDestinationId(bot.destinationId || "");
    } else if (data?.bots.length) {
      const first = data.bots[0];
      setManualSpecialistId(first.id);
      setManualDestination(first.destination || "FEED");
      setManualDestinationId(first.destinationId || "");
    }
    setManualContent("");
    setManualImages([]);
    setShowManualLinkHelper(false);
    setManualPostOpen(true);
  };

  const insertManualLink = () => {
    let url = manualLinkUrl.trim();
    if (!url) return;
    if (!url.startsWith("http://") && !url.startsWith("https://") && !url.startsWith("/")) {
      url = "https://" + url;
    }
    const text = manualLinkText.trim();
    const snippet = text ? `[${text}](${url})` : url;
    setManualContent((prev) => (prev ? `${prev} ${snippet}` : snippet));
    setManualLinkUrl("");
    setManualLinkText("");
    setShowManualLinkHelper(false);
  };

  const insertDraftLink = () => {
    let url = draftLinkUrl.trim();
    if (!url || !draft) return;
    if (!url.startsWith("http://") && !url.startsWith("https://") && !url.startsWith("/")) {
      url = "https://" + url;
    }
    const text = draftLinkText.trim();
    const snippet = text ? `[${text}](${url})` : url;
    setDraft({
      ...draft,
      content: draft.content ? `${draft.content} ${snippet}` : snippet,
    });
    setDraftLinkUrl("");
    setDraftLinkText("");
    setShowDraftLinkHelper(false);
  };

  async function save() {
    if (!editing) return;
    setBusy(true);
    setError("");
    try {
      const r = await fetch("/api/admin/specialists", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...editing,
          name: editing.user.name,
          image: editing.user.image || "",
        }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      await load();
      setEditing(null);
      setNotice(`Specialist settings for ${editing.user.name} saved successfully.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setBusy(false);
    }
  }

  const update = (patch: Partial<Bot>) =>
    setEditing((b) => (b ? { ...b, ...patch } : b));

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !editing) return;
    setUploadingImage(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "Image upload failed");
      update({ user: { ...editing.user, image: d.url } });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not upload image");
    } finally {
      setUploadingImage(false);
    }
  }

  async function runPlaygroundTest() {
    if (!editing || !testQuestion.trim()) return;
    setTestLoading(true);
    setTestAnswer(null);
    try {
      const r = await fetch("/api/admin/specialists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "testPlayground",
          id: editing.id,
          question: testQuestion,
          temporaryBot: {
            ...editing,
            name: editing.user.name,
            image: editing.user.image || "",
          },
        }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Playground test failed");
      setTestAnswer(d.answer);
    } catch (err) {
      setTestAnswer({
        text: `Error: ${err instanceof Error ? err.message : "Failed to run test"}`,
        provider: "error",
      });
    } finally {
      setTestLoading(false);
    }
  }

  const destinations =
    editing?.destination === "GROUP"
      ? data?.groups
      : editing?.destination === "FORUM"
        ? data?.forums
        : data?.networks;

  const manualDestinations =
    manualDestination === "GROUP"
      ? data?.groups
      : manualDestination === "FORUM"
        ? data?.forums
        : data?.networks;

  const filteredKnowledge = (editing?.knowledge || []).filter((k) => {
    const matchesSearch =
      !knowledgeSearch ||
      k.title.toLowerCase().includes(knowledgeSearch.toLowerCase()) ||
      k.text.toLowerCase().includes(knowledgeSearch.toLowerCase());
    const matchesCat =
      knowledgeCategoryFilter === "ALL" || k.category === knowledgeCategoryFilter;
    return matchesSearch && matchesCat;
  });

  const filteredActivities = (data?.activities || []).filter((a) => {
    if (a.kind === "CHAT") return false;
    const matchesBot =
      activityBotFilter === "ALL" || a.specialistId === activityBotFilter;
    const matchesStatus =
      activityStatusFilter === "ALL" || a.status === activityStatusFilter;
    return matchesBot && matchesStatus;
  });

  const selectedManualBot = data?.bots.find((b) => b.id === manualSpecialistId);

  return (
    <div className="admin-workspace">
      <header className="admin-page-heading">
        <div>
          <span className="admin-eyebrow">INTELLIGENCE & COMMUNITY</span>
          <h1>AI Specialist Control Center</h1>
          <p>
            Control posting schedules, feed custom tax knowledge, manually publish through specialist profiles, and monitor live activities.
          </p>
        </div>
        <SparklesIcon size={38} />
      </header>

      {error && (
        <p role="alert" className="admin-alert">
          {error}
        </p>
      )}
      {notice && (
        <p role="status" className="admin-notice">
          {notice}
        </p>
      )}

      {!data ? (
        <p>Loading AI specialists…</p>
      ) : (
        <>
          {/* Top Metrics & Trigger Actions */}
          <div className="admin-metrics">
            <div>
              <span>Specialists Active</span>
              <strong>{data.bots.filter((b) => b.enabled).length} / {data.bots.length || 7}</strong>
            </div>
            <div>
              <span>Configured Providers</span>
              <strong>
                {[
                  data.providers.openai && "OpenAI",
                  data.providers.claude && "Claude",
                ]
                  .filter(Boolean)
                  .join(" + ") || "None (Manual Mode Ready)"}
              </strong>
            </div>
            <div>
              <span>Scheduled Posts / Wk</span>
              <strong>
                {data.bots
                  .filter((b) => b.enabled)
                  .reduce((n, b) => n + (b.postDays?.length || b.weeklyPosts || 0), 0)}
              </strong>
            </div>
            <div>
              <span>Scheduler System</span>
              <strong>
                {data.schedulerConfigured ? "Active (14:00 UTC)" : "CRON_SECRET Needed"}
              </strong>
            </div>
          </div>

          <div style={{ display: "flex", gap: "10px", alignItems: "center", marginBottom: "20px", flexWrap: "wrap" }}>
            <button
              disabled={busy}
              onClick={() => openManualPostModal()}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                background: "#ffbe24",
                color: "#0f172a",
                border: "none",
                padding: "9px 18px",
                borderRadius: "10px",
                fontSize: "13px",
                fontWeight: 800,
                cursor: "pointer",
                boxShadow: "0 2px 8px rgba(255, 190, 36, 0.25)",
              }}
            >
              ✍️ Post Manually as Specialist
            </button>

            <button
              disabled={busy}
              onClick={() => action("runSchedule")}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "7px",
                background: "var(--a-inner)",
                border: "1px solid var(--a-line)",
                padding: "9px 14px",
                borderRadius: "10px",
                fontSize: "12px",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              <RefreshIcon size={15} /> Run Cron Schedule Now
            </button>

            {!data.bots.length && (
              <button
                className="admin-primary"
                disabled={busy}
                onClick={() => action("initialize")}
              >
                Set up 7 Default Specialists
              </button>
            )}
          </div>

          {/* Specialists Grid */}
          <div className="admin-bot-grid">
            {data.bots.map((b) => {
              const activeDays = b.postDays && b.postDays.length > 0
                ? b.postDays.join(", ")
                : `${b.weeklyPosts} posts / wk`;

              return (
                <article className="admin-bot-card" key={b.id}>
                  <div className="admin-bot-top">
                    <img src={b.user.image || "/Atlas.jpg"} alt={b.user.name} />
                    <span className={b.enabled ? "admin-status" : "admin-status paused"}>
                      {b.enabled ? <PlayIcon size={12} /> : <PauseIcon size={12} />}
                      {b.enabled ? "Active" : "Paused"}
                    </span>
                  </div>

                  <h2>{b.user.name}</h2>
                  <p>{b.title}</p>
                  <small>Tax Comp Pro AI Specialist</small>

                  <div className="admin-bot-tags">
                    <span>🗓️ {activeDays}</span>
                    <span>⏰ {b.postTime || "14:00"} UTC</span>
                    <span>📍 {b.destination.toLowerCase()}</span>
                    <span>{b.autoPublish ? "⚡ Auto-publish" : "📝 Review drafts"}</span>
                    <span>🧠 {Array.isArray(b.knowledge) ? b.knowledge.filter(k => k.approved).length : 0} sources</span>
                    {b.model && b.model !== "auto" && <span>🤖 {b.model}</span>}
                  </div>

                  <footer>
                    <button onClick={() => { setEditing(structuredClone(b)); setActiveTab("profile"); }}>
                      <Settings01Icon size={16} /> Manage
                    </button>
                    <button
                      disabled={busy}
                      onClick={() => openManualPostModal(b)}
                      title="Write and publish a custom post as this specialist"
                      style={{ color: "#ffbe24", fontWeight: 700 }}
                    >
                      ✍️ Write Post
                    </button>
                    <button
                      disabled={busy || !b.enabled}
                      onClick={() => action("draft", b.id)}
                      title="Generate an AI draft for review"
                    >
                      AI Draft
                    </button>
                    <button
                      disabled={busy || !b.enabled}
                      onClick={() => action("postNow", b.id)}
                      title="Generate and publish live immediately via AI"
                    >
                      AI Post Now
                    </button>
                    <Link
                      aria-label={`View ${b.user.name}`}
                      href={`/member/${b.user.profileSlug}`}
                    >
                      <ArrowUpRight01Icon size={18} />
                    </Link>
                  </footer>
                </article>
              );
            })}
          </div>

          {/* Activity & Publishing Queue Section */}
          <section className="admin-panel" style={{ marginTop: "32px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "16px", marginBottom: "16px" }}>
              <div>
                <h2>Activity &amp; Publishing Queue</h2>
                <p>Review generated drafts, inspect AI responses, publish to community feeds, or discard.</p>
              </div>

              {/* Filters */}
              <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", alignItems: "center" }}>
                <button
                  disabled={busy}
                  onClick={() => openManualPostModal()}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    background: "var(--a-inner)",
                    border: "1px solid #ffbe24",
                    color: "#ffbe24",
                    padding: "6px 12px",
                    borderRadius: "8px",
                    fontSize: "12px",
                    fontWeight: 750,
                    cursor: "pointer",
                  }}
                >
                  + New Specialist Post
                </button>
                <select
                  value={activityBotFilter}
                  onChange={(e) => setActivityBotFilter(e.target.value)}
                  style={{ padding: "6px 12px", borderRadius: "8px", background: "var(--a-inner)", border: "1px solid var(--a-line)", fontSize: "12px", color: "var(--a-text)" }}
                >
                  <option value="ALL">All Specialists</option>
                  {data.bots.map((b) => (
                    <option key={b.id} value={b.id}>{b.user.name}</option>
                  ))}
                </select>
                <select
                  value={activityStatusFilter}
                  onChange={(e) => setActivityStatusFilter(e.target.value)}
                  style={{ padding: "6px 12px", borderRadius: "8px", background: "var(--a-inner)", border: "1px solid var(--a-line)", fontSize: "12px", color: "var(--a-text)" }}
                >
                  <option value="ALL">All Statuses</option>
                  <option value="DRAFT">Drafts (Pending Review)</option>
                  <option value="PUBLISHED">Published</option>
                  <option value="FAILED">Failed</option>
                  <option value="DISCARDED">Discarded</option>
                </select>
              </div>
            </div>

            <div className="admin-activity-list">
              {filteredActivities.map((a) => {
                const botMatch = data.bots.find((b) => b.id === a.specialistId);
                return (
                  <article key={a.id}>
                    <div>
                      <strong>{botMatch?.user.name || a.specialistId}</strong>
                      <span className={`admin-status ${a.status === "PUBLISHED" ? "" : a.status === "DRAFT" ? "paused" : "failed"}`}>
                        {a.status}
                      </span>
                      <small>
                        {new Date(a.createdAt).toLocaleString()} · {a.kind}{" "}
                        {a.provider && `· ${a.provider}`}
                      </small>
                    </div>

                    <div className="admin-activity-text">
                      {a.error ? (
                        <span style={{ color: "#ef4444" }}>Error: {a.error}</span>
                      ) : (
                        <LinkifiedText text={a.content || "Generating content…"} />
                      )}
                    </div>

                    <div className="admin-actions">
                      {a.status === "DRAFT" && (
                        <>
                          <button disabled={busy} onClick={() => setDraft(a)}>
                            Edit Draft
                          </button>
                          <button
                            className="admin-primary"
                            disabled={busy}
                            onClick={() => action("publish", a.id)}
                          >
                            <SentIcon size={14} /> Publish Now
                          </button>
                        </>
                      )}
                      {a.status === "FAILED" && (
                        <button
                          disabled={busy}
                          onClick={() => setDraft({ ...a, content: a.content || `Tax insight from ${botMatch?.user.name || "specialist"}: ` })}
                          style={{ color: "#ffbe24", borderColor: "#ffbe2440" }}
                        >
                          ✏️ Edit &amp; Publish
                        </button>
                      )}
                      {["DRAFT", "FAILED"].includes(a.status) && (
                        <button
                          disabled={busy}
                          onClick={() => action("discard", a.id)}
                        >
                          <Delete02Icon size={14} /> Discard
                        </button>
                      )}
                      {a.publishedUrl && (
                        <Link href={a.publishedUrl} target="_blank" style={{ display: "inline-flex", alignItems: "center", gap: "4px", fontSize: "12px", color: "#ffbe24" }}>
                          View published post ↗
                        </Link>
                      )}
                      {a.status === "PUBLISHED" && (
                        <button
                          disabled={busy}
                          onClick={() => setDeleteConfirmTarget({ id: a.id, type: "published", label: a.content || "this post" })}
                          style={{ display: "inline-flex", alignItems: "center", gap: "4px", color: "#ef4444", borderColor: "#ef444440" }}
                        >
                          <Delete02Icon size={14} /> Delete Live Post
                        </button>
                      )}
                      <button
                        disabled={busy}
                        onClick={() => setDeleteConfirmTarget({ id: a.id, type: "entry", label: "this queue entry" })}
                        title="Delete queue log entry"
                        style={{ display: "inline-flex", alignItems: "center", gap: "4px", color: "var(--a-muted)" }}
                      >
                        <Delete02Icon size={14} /> Delete Entry
                      </button>
                    </div>
                  </article>
                );
              })}

              {!filteredActivities.length && (
                <p style={{ color: "var(--a-muted)", padding: "20px 0", textAlign: "center" }}>
                  No activities matching current filters.
                </p>
              )}
            </div>
          </section>
        </>
      )}

      {/* Delete Confirmation Dialog */}
      {deleteConfirmTarget && (
        <div className="admin-dialog-backdrop">
          <section
            className="admin-dialog"
            role="dialog"
            aria-modal="true"
            aria-label="Confirm deletion"
            style={{ width: "min(440px, 95vw)" }}
          >
            <header style={{ borderBottom: "1px solid var(--a-line)", paddingBottom: "12px", marginBottom: "14px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <div style={{ width: "36px", height: "36px", borderRadius: "10px", background: "rgba(239, 68, 68, 0.15)", display: "flex", alignItems: "center", justifyContent: "center", color: "#ef4444" }}>
                  <Delete02Icon size={20} />
                </div>
                <div>
                  <h2 style={{ fontSize: "16px", margin: 0, color: "var(--a-text)" }}>
                    {deleteConfirmTarget.type === "published" ? "Delete Published Live Post?" : "Delete Queue Entry?"}
                  </h2>
                </div>
              </div>
              <button
                onClick={() => setDeleteConfirmTarget(null)}
                disabled={busy}
                style={{ background: "transparent", border: "none", fontSize: "18px", cursor: "pointer", color: "var(--a-muted)" }}
              >
                ✕
              </button>
            </header>
            <p style={{ fontSize: "13px", color: "var(--a-muted)", lineHeight: 1.5, margin: "0 0 16px 0" }}>
              {deleteConfirmTarget.type === "published"
                ? "This will immediately and permanently delete this published post and its comments from the live feed and community."
                : "This will remove this activity log entry permanently."}
            </p>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
              <button
                disabled={busy}
                onClick={() => setDeleteConfirmTarget(null)}
                style={{ padding: "8px 16px", borderRadius: "8px", border: "1px solid var(--a-line)", background: "transparent", color: "var(--a-text)", cursor: "pointer", fontSize: "13px" }}
              >
                Cancel
              </button>
              <button
                disabled={busy}
                onClick={async () => {
                  const target = deleteConfirmTarget;
                  setDeleteConfirmTarget(null);
                  if (target.type === "published") {
                    await action("deletePublished", target.id);
                  } else {
                    await action("deleteActivity", target.id);
                  }
                }}
                style={{ padding: "8px 16px", borderRadius: "8px", border: "none", background: "#ef4444", color: "#fff", fontWeight: 700, cursor: "pointer", fontSize: "13px" }}
              >
                {busy ? "Deleting…" : "Yes, Delete"}
              </button>
            </div>
          </section>
        </div>
      )}

      {/* Manual Post as Specialist Dialog */}
      {manualPostOpen && (
        <div className="admin-dialog-backdrop">
          <section
            className="admin-dialog"
            role="dialog"
            aria-modal="true"
            aria-label="Create post as specialist"
            style={{ width: "min(720px, 96vw)", maxHeight: "90vh" }}
          >
            <header style={{ borderBottom: "1px solid var(--a-line)", paddingBottom: "14px", marginBottom: "16px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                {selectedManualBot && (
                  <img
                    src={selectedManualBot.user.image || "/Atlas.jpg"}
                    alt=""
                    style={{ width: "42px", height: "42px", borderRadius: "10px", objectFit: "cover", border: "2px solid #ffbe24" }}
                  />
                )}
                <div>
                  <h2 style={{ fontSize: "18px", margin: 0 }}>✍️ Write Post as AI Specialist</h2>
                  <span style={{ fontSize: "12px", color: "var(--a-gold)" }}>
                    Post directly under an official AI specialist identity to feed, groups, or forums
                  </span>
                </div>
              </div>
              <button onClick={() => setManualPostOpen(false)} disabled={busy} style={{ background: "transparent", border: "none", fontSize: "20px", cursor: "pointer", color: "var(--a-muted)" }}>
                ✕
              </button>
            </header>

            <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              {/* Specialist & Destination Selectors */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <label style={{ display: "flex", flexDirection: "column", gap: "5px", fontSize: "12px", fontWeight: 700 }}>
                  Select Specialist Profile:
                  <select
                    value={manualSpecialistId}
                    onChange={(e) => {
                      const nextId = e.target.value;
                      setManualSpecialistId(nextId);
                      const match = data?.bots.find((b) => b.id === nextId);
                      if (match) {
                        setManualDestination(match.destination || "FEED");
                        setManualDestinationId(match.destinationId || "");
                      }
                    }}
                    style={{ padding: "8px 12px", borderRadius: "8px", background: "var(--a-inner)", border: "1px solid var(--a-line)", fontSize: "13px" }}
                  >
                    {data?.bots.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.user.name} ({b.title})
                      </option>
                    ))}
                  </select>
                </label>

                <label style={{ display: "flex", flexDirection: "column", gap: "5px", fontSize: "12px", fontWeight: 700 }}>
                  Publish Destination:
                  <select
                    value={manualDestination}
                    onChange={(e) => {
                      setManualDestination(e.target.value as any);
                      setManualDestinationId("");
                    }}
                    style={{ padding: "8px 12px", borderRadius: "8px", background: "var(--a-inner)", border: "1px solid var(--a-line)", fontSize: "13px" }}
                  >
                    <option value="FEED">Main Community Feed</option>
                    <option value="GROUP">Community Group</option>
                    <option value="FORUM">Pro Hub / Forum</option>
                    <option value="NETWORK">Pro Network</option>
                  </select>
                </label>
              </div>

              {manualDestination !== "FEED" && (
                <label style={{ display: "flex", flexDirection: "column", gap: "5px", fontSize: "12px", fontWeight: 700 }}>
                  Select Specific {manualDestination === "GROUP" ? "Group" : manualDestination === "FORUM" ? "Forum" : "Network"}:
                  <select
                    value={manualDestinationId}
                    onChange={(e) => setManualDestinationId(e.target.value)}
                    style={{ padding: "8px 12px", borderRadius: "8px", background: "var(--a-inner)", border: "1px solid var(--a-line)", fontSize: "13px" }}
                  >
                    <option value="">Select target space...</option>
                    {manualDestinations?.map((d) => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </label>
              )}

              {/* Sample Templates */}
              <div style={{ background: "var(--a-inner)", padding: "10px 14px", borderRadius: "10px", border: "1px solid var(--a-line)" }}>
                <span style={{ fontSize: "11px", fontWeight: 700, color: "var(--a-gold)", display: "block", marginBottom: "6px" }}>
                  💡 Load Sample Post Template:
                </span>
                <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                  {SAMPLE_MANUAL_TEMPLATES.map((tmpl, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setManualContent(tmpl.content)}
                      style={{ padding: "4px 8px", borderRadius: "6px", background: "var(--a-panel)", border: "1px solid var(--a-line)", fontSize: "11px", cursor: "pointer" }}
                    >
                      {tmpl.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Post Content Area */}
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                  <label htmlFor="manual-post-textarea" style={{ fontSize: "12px", fontWeight: 700 }}>
                    Post Content &amp; Guidance
                  </label>
                  <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                    <button
                      type="button"
                      disabled={uploadingManualImage || manualImages.length >= 4}
                      onClick={() => manualFileInputRef.current?.click()}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "4px",
                        background: uploadingManualImage ? "#10b98120" : "transparent",
                        border: "1px solid #10b98160",
                        color: "#10b981",
                        padding: "4px 10px",
                        borderRadius: "6px",
                        fontSize: "11px",
                        fontWeight: 700,
                        cursor: manualImages.length >= 4 ? "not-allowed" : "pointer",
                      }}
                    >
                      <Image01Icon size={13} /> {uploadingManualImage ? "Uploading..." : `Upload Image${manualImages.length > 0 ? ` (${manualImages.length}/4)` : ""}`}
                    </button>
                    <input
                      type="file"
                      ref={manualFileInputRef}
                      accept="image/*"
                      multiple
                      style={{ display: "none" }}
                      onChange={handleManualImageUpload}
                    />

                    <button
                      type="button"
                      onClick={() => setShowManualLinkHelper((v) => !v)}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "4px",
                        background: showManualLinkHelper ? "#3b82f620" : "transparent",
                        border: "1px solid #3b82f650",
                        color: "#3b82f6",
                        padding: "4px 10px",
                        borderRadius: "6px",
                        fontSize: "11px",
                        fontWeight: 700,
                        cursor: "pointer",
                      }}
                    >
                      <Link01Icon size={13} /> Add Clickable Link
                    </button>
                  </div>
                </div>

                {/* Link Helper Popover */}
                {showManualLinkHelper && (
                  <div style={{ background: "var(--a-inner)", border: "1px solid #3b82f640", borderRadius: "10px", padding: "10px", marginBottom: "8px", display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" }}>
                    <input
                      type="url"
                      placeholder="URL (https://irs.gov/...)"
                      value={manualLinkUrl}
                      onChange={(e) => setManualLinkUrl(e.target.value)}
                      style={{ flex: 1, minWidth: "160px", padding: "6px 10px", fontSize: "12px", borderRadius: "6px" }}
                    />
                    <input
                      type="text"
                      placeholder="Display Text (optional)"
                      value={manualLinkText}
                      onChange={(e) => setManualLinkText(e.target.value)}
                      style={{ flex: 1, minWidth: "140px", padding: "6px 10px", fontSize: "12px", borderRadius: "6px" }}
                    />
                    <button
                      type="button"
                      onClick={insertManualLink}
                      disabled={!manualLinkUrl.trim()}
                      className="admin-primary"
                      style={{ padding: "6px 12px", fontSize: "11.5px" }}
                    >
                      Insert
                    </button>
                  </div>
                )}

                <textarea
                  id="manual-post-textarea"
                  rows={6}
                  value={manualContent}
                  onChange={(e) => setManualContent(e.target.value)}
                  placeholder="Write the specialist post here. Links like https://... or [Link Text](https://...) will automatically be clickable."
                  style={{ width: "100%", fontSize: "13.5px", lineHeight: "1.6", padding: "12px", borderRadius: "10px" }}
                />

                {/* Attached Images Thumbnail Bar */}
                {manualImages.length > 0 && (
                  <div style={{ marginTop: "8px", padding: "10px 12px", background: "var(--a-inner)", borderRadius: "10px", border: "1px solid var(--a-line)" }}>
                    <span style={{ fontSize: "11px", fontWeight: 700, color: "var(--a-gold)", display: "block", marginBottom: "8px" }}>
                      📷 Attached Images ({manualImages.length}/4):
                    </span>
                    <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                      {manualImages.map((imgUrl, idx) => (
                        <div key={idx} style={{ position: "relative", width: "72px", height: "72px", borderRadius: "8px", overflow: "hidden", border: "1px solid var(--a-line)", background: "#000" }}>
                          <img src={imgUrl} alt={`Attachment ${idx + 1}`} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                          <button
                            type="button"
                            onClick={() => removeManualImage(idx)}
                            aria-label="Remove image"
                            style={{
                              position: "absolute",
                              top: "3px",
                              right: "3px",
                              width: "18px",
                              height: "18px",
                              borderRadius: "50%",
                              background: "rgba(0,0,0,0.8)",
                              color: "#fff",
                              border: "none",
                              fontSize: "10px",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              cursor: "pointer",
                            }}
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "4px", fontSize: "11px", color: "var(--a-muted)" }}>
                  <span>Tip: Markdown links [Text](URL) and raw URLs are both rendered as clickable links.</span>
                  <span>{manualContent.length} characters</span>
                </div>
              </div>

              {/* Live Preview */}
              {(manualContent.trim() || manualImages.length > 0) && (
                <div style={{ background: "var(--a-inner)", padding: "12px 14px", borderRadius: "10px", border: "1px solid var(--a-line)" }}>
                  <span style={{ fontSize: "11px", fontWeight: 700, color: "var(--a-gold)", display: "block", marginBottom: "4px" }}>
                    Live Preview:
                  </span>
                  {manualContent.trim() && (
                    <div style={{ fontSize: "13px", lineHeight: "1.6", whiteSpace: "pre-wrap" }}>
                      <LinkifiedText text={manualContent} />
                    </div>
                  )}
                  {manualImages.length > 0 && (
                    <div style={{ display: "grid", gridTemplateColumns: manualImages.length === 1 ? "1fr" : "repeat(auto-fit, minmax(100px, 1fr))", gap: "8px", marginTop: "10px" }}>
                      {manualImages.map((imgUrl, i) => (
                        <img key={i} src={imgUrl} alt="Preview attachment" style={{ width: "100%", maxHeight: "180px", objectFit: "cover", borderRadius: "8px", border: "1px solid var(--a-line)" }} />
                      ))}
                    </div>
                  )}
                  <small style={{ display: "block", marginTop: "8px", color: "var(--a-muted)" }}>
                    {selectedManualBot?.user.name} · Tax Comp Pro AI Specialist
                  </small>
                </div>
              )}
            </div>

            <footer style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "20px", paddingTop: "14px", borderTop: "1px solid var(--a-line)" }}>
              <button
                type="button"
                onClick={() => setManualPostOpen(false)}
                style={{ background: "transparent", border: "1px solid var(--a-line)", padding: "9px 16px", borderRadius: "8px", cursor: "pointer" }}
              >
                Cancel
              </button>

              <div style={{ display: "flex", gap: "10px" }}>
                <button
                  type="button"
                  disabled={busy || !manualContent.trim()}
                  onClick={() => handleManualPost(false)}
                  style={{ background: "var(--a-inner)", border: "1px solid var(--a-line)", padding: "9px 16px", borderRadius: "8px", cursor: "pointer", fontWeight: 700, fontSize: "12.5px" }}
                >
                  💾 Save as Draft
                </button>
                <button
                  type="button"
                  disabled={busy || !manualContent.trim()}
                  onClick={() => handleManualPost(true)}
                  style={{ background: "#ffbe24", color: "#0f172a", border: "none", padding: "9px 18px", borderRadius: "8px", cursor: "pointer", fontWeight: 800, fontSize: "12.5px" }}
                >
                  ⚡ Publish Live Now
                </button>
              </div>
            </footer>
          </section>
        </div>
      )}

      {/* Comprehensive Specialist Management Dialog */}
      {editing && (
        <div className="admin-dialog-backdrop">
          <section
            className="admin-dialog"
            role="dialog"
            aria-modal="true"
            aria-label="Manage specialist"
            style={{ width: "min(960px, 96vw)", maxHeight: "92vh" }}
          >
            <header style={{ borderBottom: "1px solid var(--a-line)", paddingBottom: "16px", marginBottom: "16px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <img
                  src={editing.user.image || "/Atlas.jpg"}
                  alt=""
                  style={{ width: "44px", height: "44px", borderRadius: "12px", objectFit: "cover", border: "2px solid #ffbe24" }}
                />
                <div>
                  <h2 style={{ fontSize: "20px", margin: 0 }}>Manage {editing.user.name}</h2>
                  <span style={{ fontSize: "12px", color: "var(--a-gold)" }}>{editing.title}</span>
                </div>
              </div>
              <button onClick={() => setEditing(null)} disabled={busy} style={{ background: "transparent", border: "none", fontSize: "20px", cursor: "pointer", color: "var(--a-muted)" }}>
                ✕
              </button>
            </header>

            {/* Navigation Tabs */}
            <div className="admin-modal-nav">
              <button
                className={activeTab === "profile" ? "active" : ""}
                onClick={() => setActiveTab("profile")}
              >
                👤 Profile &amp; Persona
              </button>
              <button
                className={activeTab === "schedule" ? "active" : ""}
                onClick={() => setActiveTab("schedule")}
              >
                🗓️ Schedule &amp; Posting
              </button>
              <button
                className={activeTab === "knowledge" ? "active" : ""}
                onClick={() => setActiveTab("knowledge")}
              >
                🧠 Custom Knowledge ({editing.knowledge.length})
              </button>
              <button
                className={activeTab === "engine" ? "active" : ""}
                onClick={() => setActiveTab("engine")}
              >
                ⚙️ AI Brain &amp; Guardrails
              </button>
              <button
                className={activeTab === "playground" ? "active" : ""}
                onClick={() => setActiveTab("playground")}
              >
                🧪 Live Playground
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                void save();
              }}
            >
              {/* TAB 1: PROFILE & PERSONA */}
              {activeTab === "profile" && (
                <div className="admin-form-grid animate-in fade-in duration-200">
                  <label>
                    Specialist Name
                    <input
                      value={editing.user.name}
                      onChange={(e) => update({ user: { ...editing.user, name: e.target.value } })}
                      placeholder="e.g. Celeste Rowan"
                    />
                  </label>

                  <label>
                    Professional Title &amp; Headline
                    <input
                      value={editing.title}
                      onChange={(e) => update({ title: e.target.value })}
                      placeholder="e.g. Tax Education & Due Diligence Coach"
                    />
                  </label>

                  {/* Avatar Picker & Image Uploader */}
                  <div className="wide" style={{ background: "var(--a-inner)", padding: "16px", borderRadius: "14px", border: "1px solid var(--a-line)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                      <span style={{ fontSize: "13px", fontWeight: 700 }}>Profile Avatar Image</span>
                      <button
                        type="button"
                        disabled={uploadingImage}
                        onClick={() => fileInputRef.current?.click()}
                        style={{ fontSize: "12px", padding: "6px 12px", background: "var(--a-panel)", border: "1px solid var(--a-line)", borderRadius: "8px", cursor: "pointer" }}
                      >
                        {uploadingImage ? "Uploading…" : "📤 Upload Custom Photo"}
                      </button>
                      <input
                        type="file"
                        ref={fileInputRef}
                        accept="image/*"
                        style={{ display: "none" }}
                        onChange={handleImageUpload}
                      />
                    </div>

                    <div className="admin-avatar-grid">
                      {PRESET_AVATARS.map((preset) => (
                        <div
                          key={preset.image}
                          className={`admin-avatar-thumb ${editing.user.image === preset.image ? "selected" : ""}`}
                          onClick={() => update({ user: { ...editing.user, image: preset.image } })}
                          title={preset.name}
                        >
                          <img src={preset.image} alt={preset.name} />
                        </div>
                      ))}
                    </div>

                    <div style={{ marginTop: "12px" }}>
                      <input
                        value={editing.user.image || ""}
                        onChange={(e) => update({ user: { ...editing.user, image: e.target.value } })}
                        placeholder="Or enter direct image URL (e.g. /Nova.jpg or https://...)"
                        style={{ fontSize: "12px", padding: "8px 12px" }}
                      />
                    </div>
                  </div>

                  <label className="wide">
                    About / Bio
                    <textarea
                      value={editing.about}
                      onChange={(e) => update({ about: e.target.value })}
                      rows={3}
                      placeholder="Public bio displayed on the specialist's member profile..."
                    />
                  </label>

                  {/* Specialties Tag Manager */}
                  <div className="wide">
                    <span style={{ fontSize: "12px", fontWeight: 650, display: "block", marginBottom: "6px" }}>
                      Specialties / Expertise Tags
                    </span>
                    <div className="admin-chip-container">
                      {editing.expertise.map((tag, idx) => (
                        <span className="admin-chip" key={idx}>
                          {tag}
                          <button
                            type="button"
                            onClick={() => update({ expertise: editing.expertise.filter((_, i) => i !== idx) })}
                          >
                            ✕
                          </button>
                        </span>
                      ))}
                      <div style={{ display: "flex", gap: "6px", flex: 1, minWidth: "160px" }}>
                        <input
                          value={newTag}
                          onChange={(e) => setNewTag(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && newTag.trim()) {
                              e.preventDefault();
                              if (!editing.expertise.includes(newTag.trim())) {
                                update({ expertise: [...editing.expertise, newTag.trim()] });
                              }
                              setNewTag("");
                            }
                          }}
                          placeholder="Type tag & press Enter..."
                          style={{ border: "none", background: "transparent", padding: "4px", fontSize: "12px", outline: "none", width: "100%" }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Starters */}
                  <div className="wide">
                    <span style={{ fontSize: "12px", fontWeight: 650, display: "block", marginBottom: "6px" }}>
                      Conversation Starters (Member Prompt Suggestions)
                    </span>
                    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                      {editing.starters.map((starter, idx) => (
                        <div key={idx} style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                          <input
                            value={starter}
                            onChange={(e) => {
                              const updated = [...editing.starters];
                              updated[idx] = e.target.value;
                              update({ starters: updated });
                            }}
                            style={{ flex: 1, padding: "8px 12px", fontSize: "12px" }}
                          />
                          <button
                            type="button"
                            onClick={() => update({ starters: editing.starters.filter((_, i) => i !== idx) })}
                            style={{ padding: "8px 10px", background: "var(--a-inner)", border: "1px solid var(--a-line)", borderRadius: "8px", cursor: "pointer" }}
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                      <div style={{ display: "flex", gap: "8px", marginTop: "4px" }}>
                        <input
                          value={newStarter}
                          onChange={(e) => setNewStarter(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && newStarter.trim()) {
                              e.preventDefault();
                              update({ starters: [...editing.starters, newStarter.trim()] });
                              setNewStarter("");
                            }
                          }}
                          placeholder="Add new conversation starter..."
                          style={{ flex: 1, padding: "8px 12px", fontSize: "12px" }}
                        />
                        <button
                          type="button"
                          onClick={() => {
                            if (newStarter.trim()) {
                              update({ starters: [...editing.starters, newStarter.trim()] });
                              setNewStarter("");
                            }
                          }}
                          style={{ padding: "8px 14px", background: "var(--a-inner)", border: "1px solid var(--a-line)", borderRadius: "8px", cursor: "pointer", fontSize: "12px", fontWeight: 700 }}
                        >
                          + Add
                        </button>
                      </div>
                    </div>
                  </div>

                  <label className="wide">
                    Signature &amp; Closing Sign-off
                    <input
                      value={editing.signature}
                      onChange={(e) => update({ signature: e.target.value })}
                      placeholder="e.g. I help you understand the rule — not just memorize the answer."
                    />
                  </label>
                </div>
              )}

              {/* TAB 2: SCHEDULE & POSTING */}
              {activeTab === "schedule" && (
                <div className="admin-form-grid animate-in fade-in duration-200">
                  <div className="wide" style={{ background: "var(--a-inner)", padding: "16px", borderRadius: "14px", border: "1px solid var(--a-line)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
                      <div>
                        <strong style={{ fontSize: "15px", display: "block" }}>Specialist Activity Status</strong>
                        <span style={{ fontSize: "12px", color: "var(--a-muted)" }}>Enable or temporarily pause this AI specialist</span>
                      </div>
                      <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}>
                        <input
                          type="checkbox"
                          checked={editing.enabled}
                          onChange={(e) => update({ enabled: e.target.checked })}
                          style={{ width: "18px", height: "18px" }}
                        />
                        <span style={{ fontWeight: 700, fontSize: "14px", color: editing.enabled ? "#10b981" : "var(--a-muted)" }}>
                          {editing.enabled ? "Active & Posting" : "Paused"}
                        </span>
                      </label>
                    </div>

                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: "14px", borderTop: "1px solid var(--a-line)" }}>
                      <div>
                        <strong style={{ fontSize: "14px", display: "block" }}>Publishing Mode</strong>
                        <span style={{ fontSize: "12px", color: "var(--a-muted)" }}>Auto-publish live posts or send to queue for admin review</span>
                      </div>
                      <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}>
                        <input
                          type="checkbox"
                          checked={editing.autoPublish}
                          onChange={(e) => update({ autoPublish: e.target.checked })}
                          style={{ width: "18px", height: "18px" }}
                        />
                        <span style={{ fontWeight: 700, fontSize: "13px" }}>
                          {editing.autoPublish ? "⚡ Auto-Publish Live" : "📝 Review Drafts First"}
                        </span>
                      </label>
                    </div>
                  </div>

                  {/* Specific Posting Days */}
                  <div className="wide" style={{ background: "var(--a-inner)", padding: "16px", borderRadius: "14px", border: "1px solid var(--a-line)" }}>
                    <span style={{ fontSize: "13px", fontWeight: 700, display: "block" }}>
                      Weekly Posting Schedule Days
                    </span>
                    <span style={{ fontSize: "12px", color: "var(--a-muted)", display: "block", marginBottom: "10px" }}>
                      Select the specific days of the week when this bot should publish automated posts:
                    </span>

                    <div className="admin-day-grid">
                      {DAYS_OF_WEEK.map((day) => {
                        const isSelected = (editing.postDays || []).includes(day);
                        return (
                          <button
                            type="button"
                            key={day}
                            className={`admin-day-btn ${isSelected ? "selected" : ""}`}
                            onClick={() => {
                              const current = editing.postDays || [];
                              const updated = isSelected
                                ? current.filter((d) => d !== day)
                                : [...current, day];
                              update({ postDays: updated, weeklyPosts: updated.length || 1 });
                            }}
                          >
                            {day}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <label>
                    Preferred Post Time (UTC)
                    <select
                      value={editing.postTime || "14:00"}
                      onChange={(e) => update({ postTime: e.target.value })}
                    >
                      <option value="09:00">09:00 UTC (Early Morning)</option>
                      <option value="12:00">12:00 UTC (Midday)</option>
                      <option value="14:00">14:00 UTC (Standard 10am EST)</option>
                      <option value="17:00">17:00 UTC (Afternoon 1pm EST)</option>
                      <option value="20:00">20:00 UTC (Evening 4pm EST)</option>
                    </select>
                  </label>

                  <label>
                    Weekly Post Volume
                    <input
                      type="number"
                      min={0}
                      max={7}
                      value={editing.weeklyPosts}
                      onChange={(e) => update({ weeklyPosts: Number(e.target.value) })}
                    />
                  </label>

                  <label>
                    Post Target Destination
                    <select
                      value={editing.destination}
                      onChange={(e) => update({ destination: e.target.value as any, destinationId: null })}
                    >
                      <option value="FEED">Main Community Feed</option>
                      <option value="GROUP">Community Group</option>
                      <option value="FORUM">Pro Hub / Forum</option>
                      <option value="NETWORK">Pro Network</option>
                    </select>
                  </label>

                  {editing.destination !== "FEED" && (
                    <label>
                      Select Destination Space
                      <select
                        value={editing.destinationId || ""}
                        onChange={(e) => update({ destinationId: e.target.value })}
                      >
                        <option value="">Choose a destination...</option>
                        {destinations?.map((d) => (
                          <option key={d.id} value={d.id}>{d.name}</option>
                        ))}
                      </select>
                    </label>
                  )}

                  {/* Instant Trigger Actions */}
                  <div className="wide" style={{ display: "flex", gap: "10px", marginTop: "10px", borderTop: "1px solid var(--a-line)", paddingTop: "16px", flexWrap: "wrap" }}>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => openManualPostModal(editing)}
                      style={{ padding: "9px 16px", borderRadius: "10px", background: "#ffbe24", color: "#0f172a", border: "none", cursor: "pointer", fontSize: "12px", fontWeight: 800 }}
                    >
                      ✍️ Write Manual Post Now
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => action("draft", editing.id)}
                      style={{ padding: "9px 16px", borderRadius: "10px", background: "var(--a-inner)", border: "1px solid var(--a-line)", cursor: "pointer", fontSize: "12px", fontWeight: 700 }}
                    >
                      📝 Generate AI Draft
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => action("postNow", editing.id)}
                      style={{ padding: "9px 16px", borderRadius: "10px", background: "var(--a-inner)", border: "1px solid var(--a-line)", cursor: "pointer", fontSize: "12px", fontWeight: 700 }}
                    >
                      ⚡ AI Post Live Now
                    </button>
                  </div>
                </div>
              )}

              {/* TAB 3: CUSTOM KNOWLEDGE BASE */}
              {activeTab === "knowledge" && (
                <div className="animate-in fade-in duration-200">
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", flexWrap: "wrap", gap: "10px" }}>
                    <div>
                      <strong style={{ fontSize: "15px", display: "block" }}>Specialist Knowledge Base</strong>
                      <span style={{ fontSize: "12px", color: "var(--a-muted)" }}>
                        Feed verified IRS tax codes, form rules, firm SOPs, and course content.
                      </span>
                    </div>

                    <div style={{ display: "flex", gap: "8px" }}>
                      <button
                        type="button"
                        onClick={() => {
                          const newK: Knowledge = {
                            title: "New Knowledge Source",
                            category: "IRS Guidance",
                            text: "",
                            priority: 2,
                            approved: true,
                            reviewedAt: new Date().toISOString(),
                          };
                          update({ knowledge: [newK, ...editing.knowledge] });
                        }}
                        style={{ padding: "7px 14px", borderRadius: "8px", background: "#ffbe24", color: "#0f172a", border: "none", fontSize: "12px", fontWeight: 800, cursor: "pointer" }}
                      >
                        + Add Source
                      </button>
                    </div>
                  </div>

                  {/* Pre-built Knowledge Templates */}
                  <div style={{ background: "var(--a-inner)", padding: "12px 16px", borderRadius: "12px", border: "1px solid var(--a-line)", marginBottom: "16px" }}>
                    <span style={{ fontSize: "11.5px", fontWeight: 700, color: "var(--a-gold)", display: "block", marginBottom: "6px" }}>
                      ⚡ Quick Add Tax Knowledge Templates:
                    </span>
                    <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                      {KNOWLEDGE_TEMPLATES.map((tmpl, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => {
                            const newK: Knowledge = {
                              ...tmpl,
                              approved: true,
                              reviewedAt: new Date().toISOString(),
                            };
                            update({ knowledge: [newK, ...editing.knowledge] });
                          }}
                          style={{ padding: "4px 10px", borderRadius: "6px", background: "var(--a-panel)", border: "1px solid var(--a-line)", fontSize: "11px", cursor: "pointer", fontWeight: 650 }}
                        >
                          + {tmpl.title}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Filter & Search */}
                  <div style={{ display: "flex", gap: "10px", marginBottom: "16px" }}>
                    <div style={{ position: "relative", flex: 1 }}>
                      <input
                        value={knowledgeSearch}
                        onChange={(e) => setKnowledgeSearch(e.target.value)}
                        placeholder="Search knowledge sources..."
                        style={{ paddingLeft: "32px", fontSize: "12px" }}
                      />
                      <Search01Icon size={14} style={{ position: "absolute", left: "10px", top: "12px", color: "var(--a-muted)" }} />
                    </div>
                    <select
                      value={knowledgeCategoryFilter}
                      onChange={(e) => setKnowledgeCategoryFilter(e.target.value)}
                      style={{ width: "auto", fontSize: "12px" }}
                    >
                      <option value="ALL">All Categories</option>
                      <option value="IRS Guidance">IRS Guidance</option>
                      <option value="Tax Code / Law">Tax Code / Law</option>
                      <option value="Firm SOP">Firm SOP</option>
                      <option value="TCP Training">TCP Training</option>
                      <option value="Platform FAQ">Platform FAQ</option>
                    </select>
                  </div>

                  {/* Knowledge Cards List */}
                  <div style={{ maxHeight: "420px", overflowY: "auto", paddingRight: "4px" }}>
                    {filteredKnowledge.map((k, i) => (
                      <div className="admin-knowledge-card" key={i}>
                        <div className="admin-knowledge-header">
                          <div style={{ display: "flex", alignItems: "center", gap: "8px", flex: 1 }}>
                            <input
                              value={k.title}
                              onChange={(e) => {
                                const next = [...editing.knowledge];
                                next[i] = { ...k, title: e.target.value };
                                update({ knowledge: next });
                              }}
                              placeholder="Source Title (e.g. IRC § 162 Expense Deduction Rules)"
                              style={{ fontWeight: 700, fontSize: "13px", padding: "6px 10px" }}
                            />
                            <select
                              value={k.category || "IRS Guidance"}
                              onChange={(e) => {
                                const next = [...editing.knowledge];
                                next[i] = { ...k, category: e.target.value };
                                update({ knowledge: next });
                              }}
                              style={{ width: "auto", fontSize: "11px", padding: "4px 8px" }}
                            >
                              <option value="IRS Guidance">IRS Guidance</option>
                              <option value="Tax Code / Law">Tax Code / Law</option>
                              <option value="Firm SOP">Firm SOP</option>
                              <option value="TCP Training">TCP Training</option>
                              <option value="Platform FAQ">Platform FAQ</option>
                              <option value="General">General</option>
                            </select>
                          </div>

                          <button
                            type="button"
                            onClick={() => update({ knowledge: editing.knowledge.filter((_, j) => j !== i) })}
                            style={{ background: "transparent", border: "none", color: "#ef4444", cursor: "pointer", padding: "4px" }}
                            title="Delete knowledge source"
                          >
                            <Delete02Icon size={16} />
                          </button>
                        </div>

                        <div style={{ margin: "8px 0" }}>
                          <textarea
                            value={k.text}
                            onChange={(e) => {
                              const next = [...editing.knowledge];
                              next[i] = { ...k, text: e.target.value };
                              update({ knowledge: next });
                            }}
                            rows={3}
                            placeholder="Verified source text or regulatory excerpt..."
                            style={{ fontSize: "12px", lineHeight: "1.6" }}
                          />
                        </div>

                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "10px", flexWrap: "wrap", fontSize: "12px" }}>
                          <input
                            value={k.url || ""}
                            onChange={(e) => {
                              const next = [...editing.knowledge];
                              next[i] = { ...k, url: e.target.value };
                              update({ knowledge: next });
                            }}
                            placeholder="Source URL citation (https://irs.gov/...)"
                            style={{ flex: 1, minWidth: "180px", fontSize: "11px", padding: "4px 8px" }}
                          />

                          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                            <label style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "11px" }}>
                              Priority (1-6):
                              <input
                                type="number"
                                min={1}
                                max={6}
                                value={k.priority}
                                onChange={(e) => {
                                  const next = [...editing.knowledge];
                                  next[i] = { ...k, priority: Number(e.target.value) };
                                  update({ knowledge: next });
                                }}
                                style={{ width: "45px", padding: "3px 6px", fontSize: "11px" }}
                              />
                            </label>

                            <label style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "11px", cursor: "pointer" }}>
                              <input
                                type="checkbox"
                                checked={k.approved}
                                onChange={(e) => {
                                  const next = [...editing.knowledge];
                                  next[i] = { ...k, approved: e.target.checked, reviewedAt: new Date().toISOString() };
                                  update({ knowledge: next });
                                }}
                              />
                              Approved
                            </label>
                          </div>
                        </div>
                      </div>
                    ))}

                    {!filteredKnowledge.length && (
                      <p style={{ color: "var(--a-muted)", padding: "20px 0", textAlign: "center", fontSize: "13px" }}>
                        No knowledge sources found. Click "+ Add Source" or choose a template above.
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 4: AI BRAIN & GUARDRAILS */}
              {activeTab === "engine" && (
                <div className="admin-form-grid animate-in fade-in duration-200">
                  <label>
                    AI Provider
                    <select
                      value={editing.provider}
                      onChange={(e) => update({ provider: e.target.value as any })}
                    >
                      <option value="auto">Automatic / Atlas Preference</option>
                      <option value="openai">OpenAI</option>
                      <option value="claude">Anthropic Claude</option>
                    </select>
                  </label>

                  <label>
                    AI Model
                    <select
                      value={editing.model || "auto"}
                      onChange={(e) => update({ model: e.target.value })}
                    >
                      <option value="auto">Default / Auto</option>
                      <option value="gpt-4o">OpenAI GPT-4o (High Intelligence)</option>
                      <option value="gpt-4o-mini">OpenAI GPT-4o Mini (Fast & Efficient)</option>
                      <option value="claude-3-5-sonnet-20241022">Claude 3.5 Sonnet (Nuanced Analysis)</option>
                      <option value="claude-3-5-haiku-20241022">Claude 3.5 Haiku (Fast)</option>
                    </select>
                  </label>

                  <label>
                    Post Tone &amp; Voice
                    <select
                      value={editing.postTone || "authoritative"}
                      onChange={(e) => update({ postTone: e.target.value })}
                    >
                      <option value="authoritative">Authoritative, Calm & Protective</option>
                      <option value="mentor">Coach & Mentor (Clear & Encouraging)</option>
                      <option value="friendly">Warm, Polished & Beginner-Friendly</option>
                      <option value="analytical">Sharp, Analytical & Evidence-Seeking</option>
                      <option value="conversational">Conversational Peer Practitioner</option>
                    </select>
                  </label>

                  <label>
                    Post Length Preference
                    <select
                      value={editing.postLength || "standard"}
                      onChange={(e) => update({ postLength: e.target.value })}
                    >
                      <option value="short">Short & Punchy (2–3 sentences, &lt;45 words)</option>
                      <option value="standard">Standard Community Post (3–4 sentences, 35–65 words)</option>
                      <option value="deep-dive">Technical Deep Dive (4–6 sentences with bullets)</option>
                    </select>
                  </label>

                  <label>
                    Temperature / Strictness ({editing.temperature ?? 0.7})
                    <input
                      type="range"
                      min={0}
                      max={1}
                      step={0.05}
                      value={editing.temperature ?? 0.7}
                      onChange={(e) => update({ temperature: Number(e.target.value) })}
                      style={{ accentColor: "#ffbe24" }}
                    />
                  </label>

                  <label>
                    Max Auto-Replies Per Day
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={editing.maxDailyReplies || 20}
                      onChange={(e) => update({ maxDailyReplies: Number(e.target.value) })}
                    />
                  </label>

                  <label className="wide">
                    Personality &amp; Behavioral Instructions
                    <textarea
                      value={editing.personality}
                      onChange={(e) => update({ personality: e.target.value })}
                      rows={3}
                    />
                  </label>

                  <label className="wide">
                    Boundaries &amp; Safety Constraints (What bot must NEVER say)
                    <textarea
                      value={editing.boundaries}
                      onChange={(e) => update({ boundaries: e.target.value })}
                      rows={3}
                    />
                  </label>

                  <label className="wide">
                    Additional Custom System Instructions (Appended directly to system prompt)
                    <textarea
                      value={editing.customPrompt || ""}
                      onChange={(e) => update({ customPrompt: e.target.value })}
                      rows={2}
                      placeholder="Optional custom instructions, seasonal tax tips, or firm-specific guidance..."
                    />
                  </label>
                </div>
              )}

              {/* TAB 5: TEST PLAYGROUND */}
              {activeTab === "playground" && (
                <div className="animate-in fade-in duration-200">
                  <div style={{ background: "var(--a-inner)", padding: "16px", borderRadius: "14px", border: "1px solid var(--a-line)" }}>
                    <strong style={{ fontSize: "14px", display: "block", marginBottom: "4px" }}>
                      🧪 Interactive Specialist Playground
                    </strong>
                    <span style={{ fontSize: "12px", color: "var(--a-muted)", display: "block", marginBottom: "12px" }}>
                      Test how {editing.user.name} responds with its configured knowledge, persona, and tone before saving changes.
                    </span>

                    <div style={{ display: "flex", gap: "8px", marginBottom: "10px" }}>
                      <input
                        value={testQuestion}
                        onChange={(e) => setTestQuestion(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !testLoading) {
                            e.preventDefault();
                            void runPlaygroundTest();
                          }
                        }}
                        placeholder={`Ask ${editing.user.name} a tax question or scenario...`}
                        style={{ flex: 1, padding: "10px 14px", fontSize: "13px" }}
                      />
                      <button
                        type="button"
                        disabled={testLoading || !testQuestion.trim()}
                        onClick={() => void runPlaygroundTest()}
                        style={{ padding: "10px 20px", borderRadius: "10px", background: "#ffbe24", color: "#0f172a", border: "none", fontWeight: 800, fontSize: "13px", cursor: "pointer" }}
                      >
                        {testLoading ? "Thinking…" : "Test Bot"}
                      </button>
                    </div>

                    {/* Quick sample test questions */}
                    <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginBottom: "12px" }}>
                      <span style={{ fontSize: "11px", color: "var(--a-muted)" }}>Try asking:</span>
                      {[
                        "What due diligence is required for Head of Household?",
                        "My client lost all receipts for Schedule C mileage. What can we do?",
                        "How should I structure pricing for a new tax firm?",
                      ].map((sample, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => { setTestQuestion(sample); }}
                          style={{ padding: "3px 8px", borderRadius: "6px", background: "var(--a-panel)", border: "1px solid var(--a-line)", fontSize: "11px", cursor: "pointer" }}
                        >
                          "{sample.slice(0, 32)}…"
                        </button>
                      ))}
                    </div>

                    {testAnswer && (
                      <div className="admin-playground-response">
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px", borderBottom: "1px solid var(--a-line)", paddingBottom: "6px" }}>
                          <span style={{ fontSize: "12px", fontWeight: 700, color: "var(--a-gold)" }}>
                            🤖 {editing.user.name} Response:
                          </span>
                          {testAnswer.provider && (
                            <span style={{ fontSize: "11px", color: "var(--a-muted)" }}>
                              Provider: {testAnswer.provider}
                            </span>
                          )}
                        </div>
                        <p style={{ margin: 0, fontSize: "13.5px", whiteSpace: "pre-wrap" }}>
                          {testAnswer.text}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Modal Action Footer */}
              <footer style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "24px", paddingTop: "16px", borderTop: "1px solid var(--a-line)" }}>
                <button
                  type="button"
                  onClick={() => setEditing(null)}
                  style={{ background: "transparent", border: "1px solid var(--a-line)", padding: "10px 18px", borderRadius: "10px", cursor: "pointer" }}
                >
                  Cancel
                </button>
                <div style={{ display: "flex", gap: "10px" }}>
                  <button
                    type="submit"
                    className="admin-primary"
                    disabled={busy}
                    style={{ cursor: "pointer" }}
                  >
                    <CheckmarkCircle01Icon size={16} /> {busy ? "Saving…" : "Save Specialist"}
                  </button>
                </div>
              </footer>
            </form>
          </section>
        </div>
      )}

      {/* Draft Editor Dialog */}
      {draft && (
        <div className="admin-dialog-backdrop">
          <section
            className="admin-dialog"
            role="dialog"
            aria-modal="true"
            aria-label="Edit draft"
            style={{ width: "min(720px, 96vw)", maxHeight: "90vh" }}
          >
            <header style={{ borderBottom: "1px solid var(--a-line)", paddingBottom: "14px", marginBottom: "14px" }}>
              <h2>Edit &amp; Publish Specialist Post</h2>
              <button onClick={() => setDraft(null)}>✕</button>
            </header>

            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: "12px", color: "var(--a-muted)" }}>
                  Specialist: <strong>{data?.bots.find((b) => b.id === draft.specialistId)?.user.name || draft.specialistId}</strong>
                </span>
                <button
                  type="button"
                  onClick={() => setShowDraftLinkHelper((v) => !v)}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "4px",
                    background: showDraftLinkHelper ? "#3b82f620" : "transparent",
                    border: "1px solid #3b82f650",
                    color: "#3b82f6",
                    padding: "4px 10px",
                    borderRadius: "6px",
                    fontSize: "11px",
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  <Link01Icon size={13} /> Add Clickable Link
                </button>
              </div>

              {/* Link Helper Popover */}
              {showDraftLinkHelper && (
                <div style={{ background: "var(--a-inner)", border: "1px solid #3b82f640", borderRadius: "10px", padding: "10px", display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" }}>
                  <input
                    type="url"
                    placeholder="URL (https://irs.gov/...)"
                    value={draftLinkUrl}
                    onChange={(e) => setDraftLinkUrl(e.target.value)}
                    style={{ flex: 1, minWidth: "160px", padding: "6px 10px", fontSize: "12px", borderRadius: "6px" }}
                  />
                  <input
                    type="text"
                    placeholder="Display Text (optional)"
                    value={draftLinkText}
                    onChange={(e) => setDraftLinkText(e.target.value)}
                    style={{ flex: 1, minWidth: "140px", padding: "6px 10px", fontSize: "12px", borderRadius: "6px" }}
                  />
                  <button
                    type="button"
                    onClick={insertDraftLink}
                    disabled={!draftLinkUrl.trim()}
                    className="admin-primary"
                    style={{ padding: "6px 12px", fontSize: "11.5px" }}
                  >
                    Insert
                  </button>
                </div>
              )}

              <textarea
                aria-label="Draft content"
                rows={9}
                value={draft.content}
                onChange={(e) => setDraft({ ...draft, content: e.target.value })}
                style={{ fontSize: "14px", lineHeight: "1.6", width: "100%", padding: "12px", borderRadius: "10px" }}
                placeholder="Write or edit specialist post content..."
              />

              {draft.content?.trim() && (
                <div style={{ background: "var(--a-inner)", padding: "10px 12px", borderRadius: "10px", border: "1px solid var(--a-line)" }}>
                  <span style={{ fontSize: "11px", fontWeight: 700, color: "var(--a-gold)", display: "block", marginBottom: "4px" }}>
                    Live Preview:
                  </span>
                  <div style={{ fontSize: "12.5px", lineHeight: "1.6", whiteSpace: "pre-wrap" }}>
                    <LinkifiedText text={draft.content} />
                  </div>
                </div>
              )}
            </div>

            <div className="admin-actions" style={{ marginTop: "18px", display: "flex", justifyContent: "flex-end", gap: "10px" }}>
              <button onClick={() => setDraft(null)} style={{ background: "transparent", border: "1px solid var(--a-line)", padding: "8px 16px", borderRadius: "8px" }}>
                Cancel
              </button>
              <button
                disabled={busy || !draft.content.trim()}
                className="admin-primary"
                onClick={() => action("editDraft", draft.id, { content: draft.content })}
              >
                Save Draft
              </button>
              <button
                disabled={busy || !draft.content.trim()}
                onClick={async () => {
                  await action("editDraft", draft.id, { content: draft.content });
                  await action("publish", draft.id);
                }}
                style={{ background: "#10b981", color: "#fff", border: "none", padding: "8px 16px", borderRadius: "8px", fontWeight: 700, cursor: "pointer" }}
              >
                <SentIcon size={14} /> Publish Live Now
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

"use client";

import { Suspense, useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Loader2,
  Check,
  Zap,
  CreditCard,
  Video,
  Mic,
  Globe,
  Lock,
  Clock,
  Ticket,
  DollarSign,
  Users,
  Plus,
  Trash2,
  Sparkles,
  ShieldCheck,
  Building2,
  AlertCircle,
} from "lucide-react";
import {
  ArrowLeft01Icon,
  CalendarAdd01Icon,
  Radio01Icon,
  Calendar03Icon,
  Mic01Icon,
} from "hugeicons-react";
import { useAppSelector } from "@/store/hooks";
import { PRO_TALK_CATEGORIES } from "@/lib/proTalks";
import "../pro-talks-directory.css";
import "./create-talk.css";

const TITLE_MAX = 120;
const DESC_MAX = 600;

type Mode = "now" | "schedule";
type MediaType = "AUDIO_VIDEO" | "AUDIO";
type AccessType = "FREE" | "PRIVATE" | "PAID";
type RefundPolicy = "NO_REFUNDS" | "REFUNDABLE_UNTIL_DATE";

interface UserNetwork {
  id: string;
  name: string;
  slug: string;
  category: string;
  memberCount: number;
}

function formatWhen(value: string) {
  if (!value) return "Pick a date & time";
  return new Date(value).toLocaleString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

// ── Upgrade options for members who can't host yet ───────────────────────────
function HostAccess() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const payForPass = async () => {
    if (loading) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/stripe/pro-talk-host-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
      else {
        setError(data.error || "Couldn't start checkout. Please try again.");
        setLoading(false);
      }
    } catch {
      setError("Network error. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className="ptc-access">
      <div className="ptc-plan is-best">
        <span className="ptc-plan-tag">Best value · Unlimited</span>
        <p className="ptc-plan-price">
          <strong>$129.99</strong> /month
        </p>
        <h3>VIP + Marketplace Plus</h3>
        <ul>
          <li>
            <Zap className="w-4 h-4" /> Unlimited Pro Talk hosting with video, audio &amp; screenshare
          </li>
          <li>
            <Zap className="w-4 h-4" /> Host Paid / Ticketed workshops &amp; webinars
          </li>
          <li>
            <Zap className="w-4 h-4" /> Full Marketplace seller privileges &amp; verified badge
          </li>
          <li>
            <Zap className="w-4 h-4" /> Keep up to 5 replays on your profile
          </li>
        </ul>
        <Link href="/upgrade" className="ptd-primary">
          Upgrade to Marketplace Plus
        </Link>
      </div>
      <div className="ptc-plan">
        <p className="ptc-plan-price">
          <strong>$99.99</strong> one-time
        </p>
        <h3>Single Session Host Pass</h3>
        <p className="ptc-plan-copy">
          Host one live session with full stage controls, ticketed access, polls and invite links.
        </p>
        <button onClick={payForPass} disabled={loading} className="ptd-secondary">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CreditCard className="w-4 h-4" />} Pay for 1 Host Pass
        </button>
        {error && <p className="ptc-error" role="alert">{error}</p>}
      </div>
    </div>
  );
}

// ── Create form ──────────────────────────────────────────────────────────────
function CreateTalkInner() {
  const router = useRouter();
  const params = useSearchParams();
  const user = useAppSelector((s) => s.auth.user);
  const hostPaid = params.get("host_paid") === "1";
  const hostSessionId = params.get("session_id") ?? undefined;
  const canHost =
    user?.role === "ADMIN" ||
    user?.tier === "MARKETPLACE_PLUS" ||
    (hostPaid && !!hostSessionId);

  const [mode, setMode] = useState<Mode>(
    params.get("mode") === "schedule" ? "schedule" : "now"
  );
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [category, setCategory] = useState(
    PRO_TALK_CATEGORIES[0]?.name ?? "Open Discussion"
  );
  const [mediaType, setMediaType] = useState<MediaType>("AUDIO_VIDEO");
  const [accessType, setAccessType] = useState<AccessType>("FREE");
  const [schedDate, setSchedDate] = useState("");

  // Ticketed Pro Talk fields
  const [ticketPrice, setTicketPrice] = useState("29.99");
  const [ticketCapacity, setTicketCapacity] = useState("25");
  const [salesStartsAt, setSalesStartsAt] = useState("");
  const [salesEndsAt, setSalesEndsAt] = useState("");
  const [refundPolicy, setRefundPolicy] = useState<RefundPolicy>("NO_REFUNDS");
  const [refundUntil, setRefundUntil] = useState("");
  const [whatIsIncluded, setWhatIsIncluded] = useState<string[]>([
    "Live interactive stage access & Q&A with the host",
    "Downloadable resources & practice templates",
    "Full video replay recording access",
  ]);
  const [newIncludedItem, setNewIncludedItem] = useState("");

  // Pro Network exclusivity
  const [isNetworkExclusive, setIsNetworkExclusive] = useState(false);
  const [networkId, setNetworkId] = useState("");
  const [userNetworks, setUserNetworks] = useState<UserNetwork[]>([]);

  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [minDateTime] = useState(() => {
    const d = new Date(Date.now() + 5 * 60_000);
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().slice(0, 16);
  });

  // Fetch host's Pro Networks
  useEffect(() => {
    if (!user?.id) return;
    fetch("/api/pro-networks?filter=mine")
      .then((r) => r.json())
      .then((data) => {
        if (data.networks && Array.isArray(data.networks)) {
          setUserNetworks(data.networks);
          if (data.networks.length > 0 && !networkId) {
            setNetworkId(data.networks[0].id);
          }
        }
      })
      .catch(() => {});
  }, [user?.id, networkId]);

  const ready =
    name.trim().length > 0 &&
    (mode === "now" || !!schedDate) &&
    (accessType !== "PAID" || (parseFloat(ticketPrice) > 0 && parseInt(ticketCapacity, 10) > 0));

  const addIncludedItem = () => {
    if (!newIncludedItem.trim()) return;
    setWhatIsIncluded((prev) => [...prev, newIncludedItem.trim()]);
    setNewIncludedItem("");
  };

  const removeIncludedItem = (index: number) => {
    setWhatIsIncluded((prev) => prev.filter((_, i) => i !== index));
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ready || creating) return;
    setCreating(true);
    setError(null);

    const visibility =
      accessType === "PAID"
        ? "TICKETED"
        : accessType === "PRIVATE"
        ? "PRIVATE"
        : "PUBLIC";

    const body: Record<string, unknown> = {
      name: name.trim(),
      description: desc.trim() || null,
      category,
      mediaType,
      visibility,
      accessType,
    };

    if (accessType === "PAID") {
      body.ticketPrice = parseFloat(ticketPrice) || 29.99;
      body.ticketCapacity = parseInt(ticketCapacity, 10) || 25;
      body.refundPolicy = refundPolicy;
      body.whatIsIncluded = whatIsIncluded;

      if (salesStartsAt) {
        body.salesStartsAt = new Date(salesStartsAt).toISOString();
      }
      if (salesEndsAt) {
        body.salesEndsAt = new Date(salesEndsAt).toISOString();
      }
      if (refundPolicy === "REFUNDABLE_UNTIL_DATE" && refundUntil) {
        body.refundUntil = new Date(refundUntil).toISOString();
      }
      if (isNetworkExclusive && networkId) {
        body.isNetworkExclusive = true;
        body.networkId = networkId;
      } else {
        body.isNetworkExclusive = false;
        body.networkId = null;
      }
    }

    if (hostPaid && hostSessionId) body.hostSessionId = hostSessionId;
    if (mode === "schedule") body.scheduledAt = new Date(schedDate).toISOString();

    try {
      const res = await fetch("/api/spaces", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Couldn't create your Pro Talk.");
        setCreating(false);
        return;
      }
      // Live now → straight onto the stage. Scheduled → back to the directory or talk details.
      router.push(mode === "now" ? `/pro-talks/${data.id}` : `/pro-talks/${data.id}`);
    } catch {
      setError("Network error. Please try again.");
      setCreating(false);
    }
  };

  const selectedNetwork = userNetworks.find((n) => n.id === networkId);

  return (
    <div className="ptd-page">
      <span className="ptd-glow ptd-glow--tl" aria-hidden="true" />
      <span className="ptd-glow ptd-glow--tr" aria-hidden="true" />

      <div className="ptd-container ptc-container">
        <div className="ptd-top">
          <Link href="/pro-talks" className="ptd-top-link">
            <ArrowLeft01Icon size={16} /> <b>Back to Pro Talks</b>
          </Link>
          <span className="ptd-eyebrow">
            <Mic01Icon size={15} /> Host a Pro Talk
          </span>
        </div>

        <header className="ptc-head">
          <span className="ptc-head-mic">
            <Image
              src="/protalk.png"
              alt=""
              fill
              className="object-cover"
              sizes="72px"
              priority
            />
          </span>
          <div>
            <h1>
              Open your <span>stage.</span>
            </h1>
            <p>
              Go live right now or schedule a talk for your audience. Choose whether your session is Free, Private, or a Ticketed paid masterclass.
            </p>
          </div>
        </header>

        {!user ? (
          <div className="ptc-card ptc-signin">
            <strong>Sign in to host a Pro Talk</strong>
            <p>You need a Tax Compliance Pro account to open a stage.</p>
            <Link href="/login?next=/pro-talks/new" className="ptd-primary">
              Sign in
            </Link>
          </div>
        ) : !canHost ? (
          <>
            <p className="ptc-access-intro">
              Hosting is included with <strong>Marketplace Plus</strong>, or grab a one-time pass for a single session.
            </p>
            <HostAccess />
          </>
        ) : (
          <form className="ptc-layout" onSubmit={submit} noValidate>
            <div className="ptc-form">
              {hostPaid && (
                <div className="ptc-banner">
                  <Check className="w-5 h-5" /> Host pass confirmed — you&apos;re ready to open your stage.
                </div>
              )}

              {/* 1. When */}
              <section className="ptc-card">
                <h2>1. Timing</h2>
                <div className="ptc-segment" role="radiogroup" aria-label="When to start">
                  <button
                    type="button"
                    role="radio"
                    aria-checked={mode === "now"}
                    onClick={() => setMode("now")}
                  >
                    <Radio01Icon className="w-4 h-4" /> Go live now
                  </button>
                  <button
                    type="button"
                    role="radio"
                    aria-checked={mode === "schedule"}
                    onClick={() => setMode("schedule")}
                  >
                    <Calendar03Icon className="w-4 h-4" /> Schedule for later
                  </button>
                </div>
                {mode === "schedule" && (
                  <label className="ptc-field">
                    <span>
                      <Clock className="w-3.5 h-3.5" /> Date &amp; start time *
                    </span>
                    <input
                      type="datetime-local"
                      value={schedDate}
                      min={minDateTime}
                      onChange={(e) => setSchedDate(e.target.value)}
                      required
                    />
                  </label>
                )}
              </section>

              {/* 2. Details */}
              <section className="ptc-card">
                <h2>2. Details</h2>
                <label className="ptc-field">
                  <span>
                    Title * <em>{name.length}/{TITLE_MAX}</em>
                  </span>
                  <input
                    value={name}
                    maxLength={TITLE_MAX}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Schedule C Audit Defense: Red Flags & Best Practices"
                    required
                  />
                </label>
                <label className="ptc-field">
                  <span>Category *</span>
                  <select value={category} onChange={(e) => setCategory(e.target.value)}>
                    {PRO_TALK_CATEGORIES.map((c) => (
                      <option key={c.id} value={c.name}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="ptc-field">
                  <span>
                    Description <em>{desc.length}/{DESC_MAX}</em>
                  </span>
                  <textarea
                    value={desc}
                    maxLength={DESC_MAX}
                    onChange={(e) => setDesc(e.target.value)}
                    rows={4}
                    placeholder="What will you cover? What should attendees prepare?"
                  />
                </label>
              </section>

              {/* 3. Access Type (Free / Private / Ticketed) */}
              <section className="ptc-card">
                <h2>3. Access &amp; Pricing</h2>
                <p className="ptc-label">Choose Access Type</p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* Free / Public */}
                  <button
                    type="button"
                    onClick={() => setAccessType("FREE")}
                    className={`p-4 rounded-2xl border text-left transition-all flex flex-col justify-between ${
                      accessType === "FREE"
                        ? "bg-emerald-500/20 border-lime-400 text-white shadow-md shadow-emerald-500/10"
                        : "bg-[#04111f] border-emerald-500/20 text-slate-400 hover:text-white"
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <Globe className="w-5 h-5 text-emerald-400" />
                      <strong className="text-sm font-bold text-white">Free / Public</strong>
                    </div>
                    <small className="text-xs text-slate-300">
                      Open to all members. Anyone can discover and join.
                    </small>
                  </button>

                  {/* Private / Invite Only */}
                  <button
                    type="button"
                    onClick={() => setAccessType("PRIVATE")}
                    className={`p-4 rounded-2xl border text-left transition-all flex flex-col justify-between ${
                      accessType === "PRIVATE"
                        ? "bg-purple-500/20 border-purple-400 text-white shadow-md shadow-purple-500/10"
                        : "bg-[#04111f] border-emerald-500/20 text-slate-400 hover:text-white"
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <Lock className="w-5 h-5 text-purple-300" />
                      <strong className="text-sm font-bold text-white">Private / Invite</strong>
                    </div>
                    <small className="text-xs text-slate-300">
                      Hidden from discovery. Direct invitation link required.
                    </small>
                  </button>

                  {/* Ticketed / Paid */}
                  <button
                    type="button"
                    onClick={() => setAccessType("PAID")}
                    className={`p-4 rounded-2xl border text-left transition-all flex flex-col justify-between relative overflow-hidden ${
                      accessType === "PAID"
                        ? "bg-gradient-to-br from-emerald-500/25 to-teal-500/20 border-lime-400 text-white shadow-lg shadow-emerald-500/20 ring-1 ring-lime-400/50"
                        : "bg-[#04111f] border-emerald-500/20 text-slate-400 hover:text-white"
                    }`}
                  >
                    <span className="absolute top-2 right-2 px-1.5 py-0.5 rounded-full bg-lime-400 text-[#04111f] text-[9px] font-black uppercase">
                      Paid
                    </span>
                    <div className="flex items-center gap-2 mb-2">
                      <Ticket className="w-5 h-5 text-lime-400" />
                      <strong className="text-sm font-bold text-white">Ticketed / Paid</strong>
                    </div>
                    <small className="text-xs text-slate-300">
                      Charge for admission. Verified entry via account ticket.
                    </small>
                  </button>
                </div>

                {/* Additional Fields for Ticketed / Paid */}
                {accessType === "PAID" && (
                  <div className="mt-5 p-5 rounded-3xl bg-[#030d1a] border border-emerald-500/35 space-y-5 animate-fadeIn">
                    <div className="flex items-center justify-between pb-3 border-b border-emerald-500/20">
                      <div className="flex items-center gap-2 text-lime-400 text-xs font-black uppercase tracking-wider">
                        <Sparkles className="w-4 h-4" /> Ticket &amp; Sales Configuration
                      </div>
                      <span className="text-[11px] text-slate-400">
                        Base allowance: <strong>25 tickets included</strong>
                      </span>
                    </div>

                    {/* Price & Capacity Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <label className="ptc-field !m-0">
                        <span>
                          <DollarSign className="w-3.5 h-3.5 text-lime-400" /> Ticket Price ($ USD) *
                        </span>
                        <input
                          type="number"
                          step="0.01"
                          min="1"
                          max="9999"
                          value={ticketPrice}
                          onChange={(e) => setTicketPrice(e.target.value)}
                          placeholder="29.99"
                          required
                        />
                        <small className="text-[11px] text-slate-400">
                          Customers will see <strong>GET TICKET — ${parseFloat(ticketPrice || "0").toFixed(2)}</strong>
                        </small>
                      </label>

                      <label className="ptc-field !m-0">
                        <span>
                          <Users className="w-3.5 h-3.5 text-emerald-400" /> Ticket Capacity *
                        </span>
                        <input
                          type="number"
                          min="1"
                          max="1000"
                          value={ticketCapacity}
                          onChange={(e) => setTicketCapacity(e.target.value)}
                          placeholder="25"
                          required
                        />
                        <small className="text-[11px] text-slate-400">
                          Included base allowance: 25. Expand anytime with capacity boost packs.
                        </small>
                      </label>
                    </div>

                    {/* Sales Window Dates */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                      <label className="ptc-field !m-0">
                        <span>Sales Start Date &amp; Time (Optional)</span>
                        <input
                          type="datetime-local"
                          value={salesStartsAt}
                          onChange={(e) => setSalesStartsAt(e.target.value)}
                        />
                        <small className="text-[11px] text-slate-400">
                          Leave empty to begin ticket sales immediately.
                        </small>
                      </label>

                      <label className="ptc-field !m-0">
                        <span>Sales End Date &amp; Time (Optional)</span>
                        <input
                          type="datetime-local"
                          value={salesEndsAt}
                          onChange={(e) => setSalesEndsAt(e.target.value)}
                        />
                        <small className="text-[11px] text-slate-400">
                          Leave empty to close sales automatically when talk starts.
                        </small>
                      </label>
                    </div>

                    {/* Refund Policy */}
                    <div className="pt-2">
                      <label className="block text-xs font-bold uppercase tracking-wider text-emerald-300 mb-2">
                        Refund Policy *
                      </label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <button
                          type="button"
                          onClick={() => setRefundPolicy("NO_REFUNDS")}
                          className={`p-3 rounded-2xl border text-left text-xs transition-all ${
                            refundPolicy === "NO_REFUNDS"
                              ? "bg-emerald-500/20 border-lime-400 text-white"
                              : "bg-[#040e1c] border-emerald-500/20 text-slate-400 hover:text-white"
                          }`}
                        >
                          <strong className="block text-white font-bold mb-0.5">No Refunds</strong>
                          <span className="text-[11px] text-slate-400">
                            All ticket sales are final once purchased.
                          </span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setRefundPolicy("REFUNDABLE_UNTIL_DATE")}
                          className={`p-3 rounded-2xl border text-left text-xs transition-all ${
                            refundPolicy === "REFUNDABLE_UNTIL_DATE"
                              ? "bg-emerald-500/20 border-lime-400 text-white"
                              : "bg-[#040e1c] border-emerald-500/20 text-slate-400 hover:text-white"
                          }`}
                        >
                          <strong className="block text-white font-bold mb-0.5">
                            Refundable Until Specific Date
                          </strong>
                          <span className="text-[11px] text-slate-400">
                            Attendees can request refund before a chosen cutoff.
                          </span>
                        </button>
                      </div>

                      {refundPolicy === "REFUNDABLE_UNTIL_DATE" && (
                        <div className="mt-3">
                          <label className="ptc-field !m-0">
                            <span>Refund Cutoff Date &amp; Time *</span>
                            <input
                              type="datetime-local"
                              value={refundUntil}
                              onChange={(e) => setRefundUntil(e.target.value)}
                              required
                            />
                          </label>
                        </div>
                      )}
                    </div>

                    {/* What's Included (Key takeaways & perks) */}
                    <div className="pt-2">
                      <label className="block text-xs font-bold uppercase tracking-wider text-emerald-300 mb-2">
                        What&apos;s Included for Ticket Holders
                      </label>
                      <div className="space-y-2 mb-3">
                        {whatIsIncluded.map((item, idx) => (
                          <div
                            key={idx}
                            className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-[#040e1c] border border-emerald-500/20 text-xs text-slate-200"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <Check className="w-3.5 h-3.5 text-lime-400 shrink-0" />
                              <span className="truncate">{item}</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => removeIncludedItem(idx)}
                              className="text-slate-400 hover:text-rose-400 transition-colors p-1"
                              aria-label="Remove item"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>

                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={newIncludedItem}
                          onChange={(e) => setNewIncludedItem(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              addIncludedItem();
                            }
                          }}
                          placeholder="e.g. 1-on-1 Q&A, slide deck PDF, CE credit certificate…"
                          className="flex-1 px-3 py-2 rounded-xl bg-[#040e1c] border border-emerald-500/25 text-xs text-white placeholder:text-slate-500 outline-none focus:border-lime-400"
                        />
                        <button
                          type="button"
                          onClick={addIncludedItem}
                          disabled={!newIncludedItem.trim()}
                          className="px-4 py-2 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-400/40 text-lime-300 text-xs font-bold transition-all disabled:opacity-40 flex items-center gap-1"
                        >
                          <Plus className="w-3.5 h-3.5" /> Add
                        </button>
                      </div>
                    </div>

                    {/* Pro Network Exclusivity Option */}
                    <div className="pt-2 border-t border-emerald-500/20">
                      <div className="flex items-center justify-between mb-2">
                        <label className="block text-xs font-bold uppercase tracking-wider text-emerald-300">
                          Audience Exclusivity
                        </label>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <button
                          type="button"
                          onClick={() => setIsNetworkExclusive(false)}
                          className={`p-3 rounded-2xl border text-left text-xs transition-all ${
                            !isNetworkExclusive
                              ? "bg-emerald-500/20 border-lime-400 text-white"
                              : "bg-[#040e1c] border-emerald-500/20 text-slate-400 hover:text-white"
                          }`}
                        >
                          <strong className="block text-white font-bold mb-0.5">
                            Public Pro Talk
                          </strong>
                          <span className="text-[11px] text-slate-400">
                            Visible to all members across the directory.
                          </span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setIsNetworkExclusive(true)}
                          className={`p-3 rounded-2xl border text-left text-xs transition-all ${
                            isNetworkExclusive
                              ? "bg-emerald-500/20 border-lime-400 text-white"
                              : "bg-[#040e1c] border-emerald-500/20 text-slate-400 hover:text-white"
                          }`}
                        >
                          <strong className="block text-white font-bold mb-0.5 flex items-center gap-1.5">
                            <Building2 className="w-3.5 h-3.5 text-lime-400" /> Network Exclusive
                          </strong>
                          <span className="text-[11px] text-slate-400">
                            Available exclusively to members of a Pro Network.
                          </span>
                        </button>
                      </div>

                      {isNetworkExclusive && (
                        <div className="mt-3 p-3.5 rounded-2xl bg-[#040e1c] border border-emerald-500/25">
                          {userNetworks.length === 0 ? (
                            <div className="text-xs text-slate-400 flex items-center gap-2">
                              <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
                              <span>
                                You haven&apos;t created or joined any Pro Networks yet.{" "}
                                <Link href="/pro-networks/new" className="text-lime-400 underline">
                                  Create a Pro Network
                                </Link>
                              </span>
                            </div>
                          ) : (
                            <label className="ptc-field !m-0">
                              <span>Select Exclusive Pro Network *</span>
                              <select
                                value={networkId}
                                onChange={(e) => setNetworkId(e.target.value)}
                                className="w-full px-3 py-2 rounded-xl bg-[#020812] border border-emerald-500/30 text-white text-xs"
                              >
                                {userNetworks.map((net) => (
                                  <option key={net.id} value={net.id}>
                                    {net.name} ({net.memberCount} members)
                                  </option>
                                ))}
                              </select>
                            </label>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Payout Information Notice */}
                    <div className="p-3.5 rounded-2xl bg-emerald-950/40 border border-emerald-500/25 flex items-center gap-3">
                      <ShieldCheck className="w-5 h-5 text-lime-400 shrink-0" />
                      <p className="text-xs text-slate-300 leading-relaxed">
                        Ticket sales are routed automatically to your connected Stripe account configured under{" "}
                        <Link href="/seller" className="text-lime-400 underline font-semibold">
                          Settings &rarr; Payments
                        </Link>
                        .
                      </p>
                    </div>
                  </div>
                )}
              </section>

              {/* 4. Stage Format */}
              <section className="ptc-card">
                <h2>4. Media Format</h2>
                <div className="ptc-options" role="radiogroup" aria-label="Format">
                  <button
                    type="button"
                    role="radio"
                    aria-checked={mediaType === "AUDIO_VIDEO"}
                    onClick={() => setMediaType("AUDIO_VIDEO")}
                  >
                    <Video className="w-5 h-5" />
                    <strong>Audio + Video</strong>
                    <small>Cameras and screenshare on stage</small>
                  </button>
                  <button
                    type="button"
                    role="radio"
                    aria-checked={mediaType === "AUDIO"}
                    onClick={() => setMediaType("AUDIO")}
                  >
                    <Mic className="w-5 h-5" />
                    <strong>Audio only</strong>
                    <small>A lighter, podcast-style room</small>
                  </button>
                </div>
              </section>

              {error && <p className="ptc-error" role="alert">{error}</p>}
            </div>

            {/* Live preview + submit */}
            <aside className="ptc-side">
              <div className="ptc-preview" aria-label="Preview">
                <span className="ptc-preview-label">Live Card Preview</span>
                <div className="ptc-preview-card">
                  <div className="ptc-preview-top">
                    {mode === "now" ? (
                      <span className="ptc-pill is-live">
                        <span className="ptd-dot" /> Live
                      </span>
                    ) : (
                      <span className="ptc-pill is-up">
                        <Calendar03Icon className="w-3.5 h-3.5" /> Upcoming
                      </span>
                    )}

                    {accessType === "PAID" ? (
                      <span className="ptc-pill !bg-gradient-to-r !from-emerald-500/30 !to-teal-500/30 !border !border-lime-400/50 !text-lime-300 font-black">
                        <Ticket className="w-3 h-3 text-lime-400" />
                        TICKETED — ${parseFloat(ticketPrice || "0").toFixed(2)}
                      </span>
                    ) : accessType === "PRIVATE" ? (
                      <span className="ptc-pill !bg-purple-500/20 !text-purple-300">
                        <Lock className="w-3 h-3 text-purple-300" /> Private
                      </span>
                    ) : (
                      <span className="ptc-pill">Free</span>
                    )}

                    <span className="ptc-pill">
                      {mediaType === "AUDIO_VIDEO" ? (
                        <Video className="w-3.5 h-3.5" />
                      ) : (
                        <Mic className="w-3.5 h-3.5" />
                      )}
                      {mediaType === "AUDIO_VIDEO" ? "Audio + Video" : "Audio only"}
                    </span>
                  </div>

                  {isNetworkExclusive && selectedNetwork && (
                    <div className="mb-2">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-950/80 border border-emerald-400/40 text-lime-300 text-[10px] font-bold">
                        <Building2 className="w-3 h-3 text-lime-400" /> {selectedNetwork.name} Exclusive
                      </span>
                    </div>
                  )}

                  <span className="ptc-preview-cat">{category}</span>
                  <h3>{name.trim() || "Your Pro Talk title"}</h3>
                  {desc.trim() && <p>{desc.trim()}</p>}

                  {accessType === "PAID" && (
                    <div className="mt-3 pt-3 border-t border-emerald-950/60 flex items-center justify-between text-xs">
                      <span className="text-lime-300 font-black">
                        ${parseFloat(ticketPrice || "0").toFixed(2)} Ticket
                      </span>
                      <span className="text-slate-400 font-semibold">
                        {ticketCapacity} Tickets Available
                      </span>
                    </div>
                  )}

                  {mode === "schedule" && (
                    <span className="ptc-preview-when">
                      <Clock className="w-3.5 h-3.5" /> {formatWhen(schedDate)}
                    </span>
                  )}

                  <div className="ptc-preview-host">
                    <span className="ptc-avatar">
                      {user.image ? (
                        <img src={user.image} alt="" />
                      ) : (
                        (user.name || "?")[0]
                      )}
                    </span>
                    <div>
                      <strong>{user.name}</strong>
                      <small>
                        {accessType === "PAID"
                          ? `Ticketed Stage · $${parseFloat(ticketPrice || "0").toFixed(2)}`
                          : accessType === "PRIVATE"
                          ? "Private · invite only"
                          : "Public stage"}
                      </small>
                    </div>
                  </div>
                </div>
              </div>

              <div className="ptc-submit">
                <button
                  type="submit"
                  className="ptd-primary"
                  disabled={!ready || creating}
                >
                  {creating ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" /> Preparing stage…
                    </>
                  ) : mode === "now" ? (
                    <>
                      <Radio01Icon className="w-4 h-4" /> Go live now
                    </>
                  ) : (
                    <>
                      <CalendarAdd01Icon className="w-4 h-4" /> Schedule Pro Talk
                    </>
                  )}
                </button>
                <p>
                  {!name.trim()
                    ? "Add a title to continue."
                    : mode === "schedule" && !schedDate
                    ? "Pick a start time to continue."
                    : accessType === "PAID"
                    ? "Ticket sales will activate according to your schedule."
                    : "Everyone enters muted. You control who speaks."}
                </p>
              </div>
            </aside>
          </form>
        )}
      </div>
    </div>
  );
}

export default function CreateProTalkPage() {
  return (
    <Suspense
      fallback={
        <div className="ptd-page">
          <div className="ptd-loading">
            <Loader2 className="w-8 h-8 animate-spin text-emerald-400" />
          </div>
        </div>
      }
    >
      <CreateTalkInner />
    </Suspense>
  );
}

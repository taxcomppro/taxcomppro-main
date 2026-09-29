"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import {
  Cancel01Icon,
  Mic01Icon,
  Calendar03Icon,
  Radio01Icon,
  Shield01Icon,
  ArrowRight01Icon,
  ArrowLeft01Icon,
  Tick01Icon,
  Copy01Icon,
  Video01Icon,
  UserGroupIcon,
} from "hugeicons-react";
import {
  Ticket,
  DollarSign,
  Users,
  Building2,
  Plus,
  Trash2,
  Check,
} from "lucide-react";
import { PRO_TALK_CATEGORIES } from "@/lib/proTalks";

export interface Talk {
  id: string;
  name: string;
  description: string | null;
  category: string;
  mediaType: string;
  visibility: "PUBLIC" | "PRIVATE";
  accessType?: "FREE" | "PRIVATE" | "PAID";
  ticketPrice?: number | null;
  ticketCapacity?: number | null;
  isLive: boolean;
  scheduledAt: string | null;
  shareToken: string | null;
  totalAttendees: number;
  endedAt: string | null;
  createdAt: string;
  host: {
    id: string;
    name: string;
    image: string | null;
    headline?: string | null;
  };
  _count: { rsvps: number };
  isRsvped?: boolean;
}

function Dialog({
  title,
  onClose,
  children,
  wide = false,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    dialog?.showModal();
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      dialog?.close();
      document.body.style.overflow = previous;
    };
  }, []);
  return (
    <dialog
      ref={ref}
      className={`pt-dialog ${wide ? "pt-dialog-wide" : ""}`}
      aria-label={title}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          const bounds = event.currentTarget.getBoundingClientRect();
          if (
            event.clientX < bounds.left ||
            event.clientX > bounds.right ||
            event.clientY < bounds.top ||
            event.clientY > bounds.bottom
          )
            onClose();
        }
      }}
    >
      <button
        className="pt-dialog-close pt-icon-button"
        onClick={onClose}
        aria-label="Close dialog"
      >
        <Cancel01Icon size={21} />
      </button>
      {children}
    </dialog>
  );
}

const localMinDate = () => {
  const date = new Date(Date.now() + 5 * 60000);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);
};

export function HostTalkDialog({
  initialMode,
  hostSessionId,
  onClose,
  onCreated,
}: {
  initialMode: "now" | "schedule";
  hostSessionId?: string;
  onClose: () => void;
  onCreated: (talk: Talk) => void;
}) {
  const [step, setStep] = useState(1);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("Open Discussion");
  const [mode, setMode] = useState(initialMode);
  const [accessType, setAccessType] = useState<"FREE" | "PRIVATE" | "PAID">("FREE");
  const [mediaType, setMediaType] = useState<"AUDIO_VIDEO" | "AUDIO">(
    "AUDIO_VIDEO",
  );
  const [date, setDate] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [created, setCreated] = useState<Talk | null>(null);
  const [copied, setCopied] = useState(false);
  const stepTitle = useRef<HTMLHeadingElement>(null);

  // Ticketed details
  const [ticketPrice, setTicketPrice] = useState("29.99");
  const [ticketCapacity, setTicketCapacity] = useState("25");
  const [refundPolicy, setRefundPolicy] = useState<"NO_REFUNDS" | "REFUNDABLE_UNTIL_DATE">("NO_REFUNDS");
  const [refundUntil, setRefundUntil] = useState("");
  const [whatIsIncluded, setWhatIsIncluded] = useState<string[]>([
    "Live interactive stage access & Q&A with the host",
    "Downloadable resources & practice templates",
    "Full video replay recording access",
  ]);
  const [newIncludedItem, setNewIncludedItem] = useState("");

  const addIncludedItem = () => {
    if (!newIncludedItem.trim()) return;
    setWhatIsIncluded((prev) => [...prev, newIncludedItem.trim()]);
    setNewIncludedItem("");
  };

  const removeIncludedItem = (index: number) => {
    setWhatIsIncluded((prev) => prev.filter((_, i) => i !== index));
  };

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    if (step === 1) {
      if (!name.trim()) {
        setError("Give your talk a title to continue.");
        return;
      }
      setStep(2);
      requestAnimationFrame(() => stepTitle.current?.focus());
      return;
    }
    if (
      mode === "schedule" &&
      (!date || new Date(date).getTime() <= Date.now())
    ) {
      setError("Choose a start time in the future.");
      return;
    }

    const visibility =
      accessType === "PAID"
        ? "TICKETED"
        : accessType === "PRIVATE"
        ? "PRIVATE"
        : "PUBLIC";

    setBusy(true);
    try {
      const payload: Record<string, unknown> = {
        name: name.trim(),
        description: description.trim() || null,
        category,
        mediaType,
        visibility,
        accessType,
        ...(hostSessionId ? { hostSessionId } : {}),
        ...(mode === "schedule"
          ? { scheduledAt: new Date(date).toISOString() }
          : {}),
      };

      if (accessType === "PAID") {
        payload.ticketPrice = parseFloat(ticketPrice) || 29.99;
        payload.ticketCapacity = parseInt(ticketCapacity, 10) || 25;
        payload.refundPolicy = refundPolicy;
        payload.whatIsIncluded = whatIsIncluded;
        if (refundPolicy === "REFUNDABLE_UNTIL_DATE" && refundUntil) {
          payload.refundUntil = new Date(refundUntil).toISOString();
        }
      }

      const response = await fetch("/api/spaces", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!response.ok)
        throw new Error(
          data.error || "Your talk couldn’t be created. Please try again.",
        );
      setCreated(data);
      onCreated(data);
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Please check your connection and try again.",
      );
    } finally {
      setBusy(false);
    }
  }

  if (created)
    return (
      <Dialog title="Your talk is ready" onClose={onClose}>
        <div className="pt-success">
          <span className="pt-success-icon">
            <Tick01Icon size={32} />
          </span>
          <span className="pt-overline">IT’S ON THE CALENDAR</span>
          <h2>Your room is ready.</h2>
          <p>
            Invite your people to <strong>{created.name}</strong>. We’ll keep a
            ticket for them.
          </p>
          <button
            className="pt-button pt-primary"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(
                  `${window.location.origin}/pro-talks/invite/${created.shareToken}`,
                );
                setCopied(true);
              } catch {
                setError("Couldn’t copy. Open your talk to share its address.");
              }
            }}
          >
            {copied ? <Tick01Icon size={17} /> : <Copy01Icon size={17} />}
            {copied ? "Invitation copied" : "Copy invitation link"}
          </button>
          <Link className="pt-text-button" href={`/pro-talks/${created.id}`}>
            Open your talk <ArrowRight01Icon size={17} />
          </Link>
          {error && (
            <p role="alert" className="pt-error">
              {error}
            </p>
          )}
        </div>
      </Dialog>
    );

  return (
    <Dialog
      title="Host a Pro Talk"
      onClose={() => {
        if (!busy) onClose();
      }}
      wide
    >
      <div className="pt-create-grid">
        <div className="pt-create-main">
          <span className="pt-overline">YOUR IDEAS DESERVE A ROOM</span>
          <h2 ref={stepTitle} tabIndex={-1}>
            Let’s start something.
          </h2>
          <p className="pt-dialog-intro">
            A good conversation begins with a little curiosity.
          </p>
          <div className="pt-steps">
            <span className={step === 1 ? "active" : "complete"}>
              <i>{step > 1 ? <Tick01Icon size={13} /> : "1"}</i>The conversation
            </span>
            <span className={step === 2 ? "active" : ""}>
              <i>2</i>The room &amp; access
            </span>
          </div>
          <form onSubmit={submit}>
            {step === 1 ? (
              <div className="pt-form-fields">
                <label htmlFor="talk-title">
                  What are we talking about?
                  <input
                    id="talk-title"
                    autoFocus
                    required
                    maxLength={140}
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    placeholder="Give your conversation a great title"
                  />
                  <small>
                    Be specific. A good title helps the right people find you.
                  </small>
                </label>
                <label htmlFor="talk-topic">
                  Choose a topic
                  <select
                    id="talk-topic"
                    value={category}
                    onChange={(event) => setCategory(event.target.value)}
                  >
                    {PRO_TALK_CATEGORIES.map((item) => (
                      <option key={item.id} value={item.name}>
                        {item.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label htmlFor="talk-description">
                  Set the scene <span className="pt-optional">Optional</span>
                  <textarea
                    id="talk-description"
                    rows={4}
                    maxLength={2000}
                    value={description}
                    onChange={(event) => setDescription(event.target.value)}
                    placeholder="What will you explore? What should people bring to the conversation?"
                  />
                </label>
              </div>
            ) : (
              <div className="pt-form-fields">
                <fieldset>
                  <legend>When should we meet?</legend>
                  <div className="pt-choice-row">
                    {(["now", "schedule"] as const).map((value) => (
                      <label
                        key={value}
                        className={`pt-choice ${mode === value ? "selected" : ""}`}
                      >
                        <input
                          type="radio"
                          name="timing"
                          checked={mode === value}
                          onChange={() => setMode(value)}
                        />
                        {value === "now" ? (
                          <Radio01Icon size={19} />
                        ) : (
                          <Calendar03Icon size={19} />
                        )}
                        <strong>
                          {value === "now"
                            ? "Go live now"
                            : "Schedule for later"}
                        </strong>
                      </label>
                    ))}
                  </div>
                  {mode === "schedule" && (
                    <label className="pt-date-label" htmlFor="talk-date">
                      Start time · your local timezone
                      <input
                        id="talk-date"
                        type="datetime-local"
                        min={localMinDate()}
                        required
                        value={date}
                        onChange={(event) => setDate(event.target.value)}
                      />
                    </label>
                  )}
                </fieldset>

                <fieldset>
                  <legend>Access &amp; Pricing</legend>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setAccessType("FREE")}
                      className={`p-3 rounded-2xl border text-left text-xs transition-all ${
                        accessType === "FREE"
                          ? "bg-emerald-500/20 border-lime-400 text-white"
                          : "bg-[#040e1c] border-emerald-500/20 text-slate-400"
                      }`}
                    >
                      <strong className="block text-white font-bold mb-1">Free / Public</strong>
                      <span className="text-[11px] text-slate-400">Open to all members.</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setAccessType("PRIVATE")}
                      className={`p-3 rounded-2xl border text-left text-xs transition-all ${
                        accessType === "PRIVATE"
                          ? "bg-purple-500/20 border-purple-400 text-white"
                          : "bg-[#040e1c] border-emerald-500/20 text-slate-400"
                      }`}
                    >
                      <strong className="block text-white font-bold mb-1">Private / Invite</strong>
                      <span className="text-[11px] text-slate-400">Direct invite link only.</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setAccessType("PAID")}
                      className={`p-3 rounded-2xl border text-left text-xs transition-all ${
                        accessType === "PAID"
                          ? "bg-gradient-to-br from-emerald-500/25 to-teal-500/20 border-lime-400 text-white"
                          : "bg-[#040e1c] border-emerald-500/20 text-slate-400"
                      }`}
                    >
                      <strong className="block text-white font-bold mb-1 flex items-center gap-1">
                        <Ticket className="w-3.5 h-3.5 text-lime-400" /> Ticketed / Paid
                      </strong>
                      <span className="text-[11px] text-slate-400">Charge for entry ticket.</span>
                    </button>
                  </div>

                  {accessType === "PAID" && (
                    <div className="mt-3 p-3.5 rounded-2xl bg-[#040e1c] border border-emerald-500/30 space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <label className="block text-xs text-slate-300">
                          Ticket Price ($)
                          <input
                            type="number"
                            step="0.01"
                            value={ticketPrice}
                            onChange={(e) => setTicketPrice(e.target.value)}
                            className="w-full mt-1 px-3 py-2 rounded-xl bg-[#020812] border border-emerald-500/30 text-white text-xs"
                          />
                        </label>
                        <label className="block text-xs text-slate-300">
                          Ticket Capacity (Base: 25)
                          <input
                            type="number"
                            value={ticketCapacity}
                            onChange={(e) => setTicketCapacity(e.target.value)}
                            className="w-full mt-1 px-3 py-2 rounded-xl bg-[#020812] border border-emerald-500/30 text-white text-xs"
                          />
                        </label>
                      </div>

                      <div className="pt-1">
                        <label className="block text-xs text-slate-300 mb-1">
                          What&apos;s Included
                        </label>
                        <div className="space-y-1 mb-2">
                          {whatIsIncluded.map((item, idx) => (
                            <div
                              key={idx}
                              className="flex items-center justify-between gap-1 text-[11px] text-slate-300 bg-white/5 px-2 py-1 rounded-lg"
                            >
                              <span className="truncate">{item}</span>
                              <button
                                type="button"
                                onClick={() => removeIncludedItem(idx)}
                                className="text-slate-400 hover:text-rose-400"
                              >
                                &times;
                              </button>
                            </div>
                          ))}
                        </div>
                        <div className="flex gap-1.5">
                          <input
                            type="text"
                            value={newIncludedItem}
                            onChange={(e) => setNewIncludedItem(e.target.value)}
                            placeholder="Add takeaway/perk…"
                            className="flex-1 px-2.5 py-1.5 rounded-lg bg-[#020812] border border-emerald-500/25 text-xs text-white"
                          />
                          <button
                            type="button"
                            onClick={addIncludedItem}
                            className="px-2.5 py-1 rounded-lg bg-emerald-500/20 text-lime-300 text-xs font-bold"
                          >
                            + Add
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </fieldset>

                <fieldset>
                  <legend>Media Format</legend>
                  <div className="pt-choice-row">
                    {(["AUDIO_VIDEO", "AUDIO"] as const).map((value) => (
                      <label
                        key={value}
                        className={`pt-choice ${mediaType === value ? "selected" : ""}`}
                      >
                        <input
                          type="radio"
                          name="format"
                          checked={mediaType === value}
                          onChange={() => setMediaType(value)}
                        />
                        {value === "AUDIO" ? (
                          <Mic01Icon size={19} />
                        ) : (
                          <Video01Icon size={19} />
                        )}
                        <strong>
                          {value === "AUDIO" ? "Audio only" : "Audio & video"}
                        </strong>
                      </label>
                    ))}
                  </div>
                </fieldset>
                <div className="pt-form-note">
                  <Shield01Icon size={21} />
                  <p>
                    Everyone enters muted. You choose who joins the stage and
                    speaks.
                  </p>
                </div>
              </div>
            )}
            {error && (
              <p role="alert" className="pt-error">
                {error}
              </p>
            )}
            <div className="pt-form-footer">
              {step === 2 ? (
                <button
                  type="button"
                  className="pt-text-button"
                  disabled={busy}
                  onClick={() => {
                    setStep(1);
                    setError("");
                  }}
                >
                  <ArrowLeft01Icon size={16} />
                  Back
                </button>
              ) : (
                <span>Step 1 of 2</span>
              )}
              <button
                className="pt-button pt-primary"
                disabled={busy}
                type="submit"
              >
                {busy
                  ? "Creating your room…"
                  : step === 1
                    ? "Set up your room"
                    : mode === "now"
                      ? "Create & go live"
                      : "Schedule your talk"}
                <span className="pt-arrow">
                  <ArrowRight01Icon size={17} />
                </span>
              </button>
            </div>
          </form>
        </div>
        <aside className="pt-create-preview">
          <span className="pt-overline">A LITTLE PREVIEW</span>
          <div className="pt-preview-art">
            <Mic01Icon size={66} strokeWidth={1} />
            <span className="pt-preview-ring" />
          </div>
          <span className="pt-badge">
            {mode === "now" ? "LIVE CONVERSATION" : "UPCOMING CONVERSATION"}
          </span>
          <span className="pt-preview-category">{category}</span>
          <h3>{name.trim() || "Your next great conversation."}</h3>
          <p>
            {description.trim() ||
              "A fresh perspective. A thoughtful question. A room full of possibilities."}
          </p>
          <div className="pt-preview-meta">
            <UserGroupIcon size={15} />
            {accessType === "PAID"
              ? `Ticketed · $${parseFloat(ticketPrice || "0").toFixed(2)}`
              : accessType === "PRIVATE"
              ? "Invite only"
              : "Open to the community"}
          </div>
          <div className="pt-preview-bottom">YOUR VOICE. YOUR ROOM.</div>
        </aside>
      </div>
    </Dialog>
  );
}

export function HostingAccessDialog({ onClose }: { onClose: () => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function checkout() {
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/stripe/pro-talk-host-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      });
      const data = await response.json();
      if (!response.ok || !data.url)
        throw new Error(
          data.error || "Checkout is unavailable. Please try again.",
        );
      window.location.assign(data.url);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Please try again.");
      setBusy(false);
    }
  }
  return (
    <Dialog
      title="Choose how you host"
      onClose={() => {
        if (!busy) onClose();
      }}
    >
      <div className="pt-access">
        <span className="pt-access-icon">
          <Mic01Icon size={30} />
        </span>
        <span className="pt-overline">TAKE THE MIC</span>
        <h2>A room of your own.</h2>
        <p>
          Choose how you’d like to host. Joining conversations is always free.
        </p>
        <div className="pt-plan">
          <span className="pt-badge">FOR REGULAR CONVERSATIONS</span>
          <h3>Marketplace Plus</h3>
          <p>
            <strong>$129.99</strong> / month
          </p>
          <ul>
            <li>
              <Tick01Icon size={16} /> Unlimited Pro Talk hosting
            </li>
            <li>
              <Tick01Icon size={16} /> Audio, video & screen sharing
            </li>
            <li>
              <Tick01Icon size={16} /> Public, private &amp; paid ticketed rooms
            </li>
          </ul>
          <Link className="pt-button pt-primary" href="/upgrade">
            Explore Marketplace Plus{" "}
            <span className="pt-arrow">
              <ArrowRight01Icon size={17} />
            </span>
          </Link>
        </div>
        <div className="pt-single-pass">
          <div>
            <h3>Just one conversation?</h3>
            <p>A single-session host pass · $99.99</p>
          </div>
          <button
            className="pt-button pt-secondary"
            onClick={checkout}
            disabled={busy}
          >
            {busy ? "Opening…" : "Get a pass"}
          </button>
        </div>
        {error && (
          <p role="alert" className="pt-error">
            {error}
          </p>
        )}
      </div>
    </Dialog>
  );
}

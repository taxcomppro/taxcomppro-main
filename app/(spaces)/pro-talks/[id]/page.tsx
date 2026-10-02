"use client";

import { Fragment, useEffect, useState, useCallback } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  Loader2,
  Calendar,
  Clock,
  Users,
  Check,
  CheckCheck,
  Copy,
  Play,
  Pencil,
  Ticket,
  DollarSign,
  Sparkles,
  Building2,
  ShieldCheck,
  BarChart3,
  AlertCircle,
  Video,
  Mic,
  Lock,
  UserPlus,
} from "lucide-react";
import { Radio01Icon } from "hugeicons-react";
import SpaceRoom from "@/components/spaces/SpaceRoom";
import RsvpPanel from "@/components/spaces/RsvpPanel";
import EditTalkDialog from "@/components/spaces/EditTalkDialog";
import HostTicketSalesModal from "@/components/spaces/HostTicketSalesModal";
import EndedTalkAttendanceSummary from "@/components/spaces/EndedTalkAttendanceSummary";
import AdminRsvpModal from "@/components/spaces/AdminRsvpModal";
import { isTicketedSpace } from "@/lib/ticketedProTalks";
import { accountUrl } from "@/lib/auth-navigation";
import "./talk-room.css";

interface SpaceHost {
  id: string;
  name: string;
  image: string | null;
  headline: string | null;
  role?: string;
  tier?: string;
}

interface Space {
  id: string;
  name: string;
  description: string | null;
  roomName: string;
  category?: string;
  mediaType?: string;
  accessType?: "FREE" | "PRIVATE" | "PAID";
  ticketPrice?: number | null;
  ticketCapacity?: number | null;
  ticketsSold?: number;
  ticketsRemaining?: number;
  hasTicket?: boolean;
  ticketNumber?: string | null;
  salesClosedEarly?: boolean;
  salesStartsAt?: string | null;
  salesEndsAt?: string | null;
  refundPolicy?: string | null;
  refundUntil?: string | null;
  whatIsIncluded?: string[] | null;
  isNetworkExclusive?: boolean;
  network?: { id: string; name: string; slug: string } | null;
  isLive: boolean;
  scheduledAt: string | null;
  shareToken: string | null;
  endedAt: string | null;
  coHostIds?: string[];
  totalAttendees?: number;
  peakAttendees?: number;
  createdAt: string;
  host: SpaceHost;
  hostId: string;
  isRsvped?: boolean;
  rsvps?: { userId: string }[];
  _count?: { rsvps: number; attendances?: number };
}

function formatScheduled(d: string) {
  return new Date(d).toLocaleString(undefined, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function useCountdown(target: string | null) {
  const [left, setLeft] = useState(0);
  useEffect(() => {
    if (!target) return;
    const tick = () => setLeft(Math.max(0, new Date(target).getTime() - Date.now()));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [target]);

  const d = Math.floor(left / 86_400_000);
  const h = Math.floor((left % 86_400_000) / 3_600_000);
  const m = Math.floor((left % 3_600_000) / 60_000);
  const s = Math.floor((left % 60_000) / 1000);
  return { d, h, m, s, expired: left === 0 };
}

function Countdown({ target }: { target: string | null }) {
  const { d, h, m, s, expired } = useCountdown(target);
  if (expired) return <p className="ptr-soon">Starting any moment — the host is opening the stage.</p>;
  const units = [
    ...(d > 0 ? [{ v: d, l: "days" }] : []),
    { v: h, l: "hrs" },
    { v: m, l: "min" },
    { v: s, l: "sec" },
  ];
  return (
    <div className="ptr-countdown" role="timer" aria-label="Time until this Pro Talk starts">
      {units.map((u, i) => (
        <Fragment key={u.l}>
          {i > 0 && <i aria-hidden="true">:</i>}
          <div>
            <strong>{String(u.v).padStart(2, "0")}</strong>
            <small>{u.l}</small>
          </div>
        </Fragment>
      ))}
    </div>
  );
}

// ── Ticket Purchase Showcase Screen ───────────────────────────────────────────
function TicketedPurchaseScreen({
  space,
  currentUserId,
  onBuyTicket,
  buying,
}: {
  space: Space;
  currentUserId: string;
  onBuyTicket: () => void;
  buying: boolean;
}) {
  const isVideo = space.mediaType === "AUDIO_VIDEO";
  const price = space.ticketPrice || 0;
  const isSoldOut = typeof space.ticketsRemaining === "number" && space.ticketsRemaining <= 0;
  const isClosed = Boolean(space.salesClosedEarly);

  return (
    <main className="ptr-screen max-w-2xl text-left">
      <Link href="/pro-talks" className="ptr-back">
        &larr; Pro Talks
      </Link>

      <div className="flex flex-wrap items-center gap-2 mb-3">
        <span className="px-3 py-1 rounded-full bg-gradient-to-r from-emerald-500/30 to-teal-500/25 border border-lime-400/60 text-lime-300 text-xs font-black uppercase tracking-wider flex items-center gap-1.5 shadow-md shadow-emerald-500/15">
          <Ticket className="w-3.5 h-3.5" /> Ticketed Pro Talk
        </span>
        {space.isLive && (
          <span className="ptr-status is-live !m-0">
            <span className="ptr-dot" /> Live now
          </span>
        )}
        {space.isNetworkExclusive && space.network && (
          <span className="px-2.5 py-0.5 rounded-full bg-emerald-950/80 border border-emerald-400/40 text-lime-300 text-[11px] font-bold flex items-center gap-1">
            <Building2 className="w-3 h-3" /> {space.network.name} Exclusive
          </span>
        )}
      </div>

      <div className="flex items-start gap-4 mb-4">
        <span className="ptr-mic !m-0 !w-16 !h-16 shrink-0">
          <Image src="/protalk.png" alt="" fill className="object-cover" sizes="64px" />
        </span>
        <div>
          <h1 className="!text-2xl sm:!text-3xl !text-left font-black tracking-tight">{space.name}</h1>
          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-300 mt-2">
            <span>
              Hosted by <strong>{space.host.name}</strong>
            </span>
            {space.category && <span>&bull; {space.category}</span>}
            <span>&bull; {isVideo ? "Audio + Video Stage" : "Audio Only Stage"}</span>
          </div>
        </div>
      </div>

      {space.description && (
        <p className="ptr-desc !text-left text-slate-300 mb-5 leading-relaxed">{space.description}</p>
      )}

      {/* Date & Time if scheduled */}
      {space.scheduledAt && !space.isLive && (
        <div className="p-4 rounded-2xl bg-emerald-950/40 border border-emerald-500/25 flex items-center gap-3 mb-5">
          <Clock className="w-5 h-5 text-lime-400 shrink-0" />
          <div>
            <div className="text-xs font-bold text-white uppercase tracking-wider">Scheduled Event</div>
            <div className="text-sm font-semibold text-emerald-300">
              {formatScheduled(space.scheduledAt)}
            </div>
          </div>
        </div>
      )}

      {/* Ticket Price & Capacity Status Card */}
      <div className="p-5 rounded-3xl bg-gradient-to-br from-[#06172d] to-[#030d1a] border border-emerald-500/35 mb-5 shadow-lg shadow-emerald-500/10">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-emerald-500/20">
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Admission Ticket
            </span>
            <div className="text-3xl font-black text-lime-300 mt-0.5">
              ${price.toFixed(2)}{" "}
              <span className="text-xs font-normal text-slate-400">USD</span>
            </div>
          </div>
          <div className="sm:text-right">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Availability
            </span>
            <div className="text-sm font-black text-white mt-0.5">
              {isSoldOut ? (
                <span className="text-rose-400">Sold Out</span>
              ) : isClosed ? (
                <span className="text-amber-400">Sales Paused</span>
              ) : (
                <span className="text-emerald-300">
                  {space.ticketsRemaining ?? 25} Tickets Remaining
                </span>
              )}
            </div>
          </div>
        </div>

        {/* What's Included */}
        {Array.isArray(space.whatIsIncluded) && space.whatIsIncluded.length > 0 && (
          <div className="pt-4">
            <div className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-lime-400" /> What&apos;s Included
            </div>
            <ul className="space-y-2">
              {space.whatIsIncluded.map((item, i) => (
                <li key={i} className="flex items-start gap-2.5 text-xs text-slate-200">
                  <Check className="w-4 h-4 text-lime-400 shrink-0 mt-0.5" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Refund Policy Note */}
        <div className="mt-4 pt-3.5 border-t border-emerald-500/15 flex items-center gap-2 text-[11px] text-slate-400">
          <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>
            {space.refundPolicy === "REFUNDABLE_UNTIL_DATE" && space.refundUntil
              ? `Refundable until ${new Date(space.refundUntil).toLocaleDateString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}`
              : "All ticket sales are final (No refunds)."}
          </span>
        </div>
      </div>

      {/* CTA Purchase Button */}
      <div className="space-y-3">
        {currentUserId ? (
          <button
            onClick={onBuyTicket}
            disabled={buying || isSoldOut || isClosed}
            className="w-full py-4 rounded-2xl bg-gradient-to-r from-lime-400 via-emerald-400 to-teal-400 hover:from-lime-300 hover:to-emerald-300 text-[#04111f] font-black text-base shadow-lg shadow-emerald-500/25 transition-all flex items-center justify-center gap-2 disabled:opacity-50 hover:scale-[1.01]"
          >
            {buying ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" /> Preparing Checkout…
              </>
            ) : isSoldOut ? (
              "Event Sold Out"
            ) : isClosed ? (
              "Ticket Sales Closed"
            ) : (
              <>
                <Ticket className="w-5 h-5" /> GET TICKET — ${price.toFixed(2)}
              </>
            )}
          </button>
        ) : (
          <div className="space-y-2">
            <Link
              href={accountUrl("/register", `/pro-talks/${space.id}`)}
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-lime-400 to-emerald-400 text-[#04111f] font-black text-base shadow-lg shadow-emerald-500/25 transition-all flex items-center justify-center gap-2"
            >
              <Ticket className="w-5 h-5" /> Sign Up &amp; Get Ticket — ${price.toFixed(2)}
            </Link>
            <div className="text-center text-xs text-slate-400">
              Already have an account?{" "}
              <Link
                href={accountUrl("/login", `/pro-talks/${space.id}`)}
                className="text-lime-400 font-bold hover:underline"
              >
                Sign In
              </Link>
            </div>
          </div>
        )}
        <p className="text-[11px] text-center text-slate-400">
          Tickets are securely tied to your Tax Compliance Pro account with instant entry authorization.
        </p>
      </div>
    </main>
  );
}

// ── Scheduled (pre-live) Screen ────────────────────────────────────────────────
function ScheduledScreen({
  space,
  isHost,
  isAdmin = false,
  currentUserId,
  onStartNow,
  starting,
  onSpaceUpdated,
  onCancelled,
  onOpenTicketDashboard,
}: {
  space: Space;
  isHost: boolean;
  isAdmin?: boolean;
  currentUserId: string;
  onStartNow: () => void;
  starting: boolean;
  onSpaceUpdated: (updated: Space) => void;
  onCancelled: (id: string) => void;
  onOpenTicketDashboard: () => void;
}) {
  const [showEdit, setShowEdit] = useState(false);
  const [showAdminRsvp, setShowAdminRsvp] = useState(false);
  const [rsvped, setRsvped] = useState(
    Boolean(
      space.isRsvped ||
      (Array.isArray(space.rsvps) && space.rsvps.length > 0)
    )
  );
  const [rsvping, setRsvping] = useState(false);
  const [rsvpCount, setRsvpCount] = useState(space._count?.rsvps ?? 0);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setRsvped(
      Boolean(
        space.isRsvped ||
        (Array.isArray(space.rsvps) && space.rsvps.length > 0)
      )
    );
    setRsvpCount(space._count?.rsvps ?? 0);
  }, [space.isRsvped, space.rsvps, space._count?.rsvps]);

  const isPaid = isTicketedSpace(space);
  const hasTicket = Boolean(space.hasTicket);

  const shareUrl = space.shareToken
    ? typeof window !== "undefined"
      ? `${window.location.origin}/pro-talks/invite/${space.shareToken}`
      : `/pro-talks/invite/${space.shareToken}`
    : null;

  const copyLink = async () => {
    if (!shareUrl) return;
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const toggleRsvp = async () => {
    if (rsvping || !currentUserId) return;
    setRsvping(true);
    if (rsvped) {
      await fetch(`/api/spaces/${space.id}/rsvp`, { method: "DELETE" });
      setRsvped(false);
      setRsvpCount((c) => Math.max(0, c - 1));
    } else {
      const res = await fetch(`/api/spaces/${space.id}/rsvp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (res.ok) {
        setRsvped(true);
        setRsvpCount((c) => c + 1);
      }
    }
    setRsvping(false);
  };

  return (
    <main className="ptr-screen">
      <Link href="/pro-talks" className="ptr-back">
        &larr; Pro Talks
      </Link>

      <div className="flex flex-wrap items-center justify-center gap-2 mb-2">
        <span className="ptr-status is-up">
          <Calendar className="w-4 h-4" /> Scheduled Pro Talk
        </span>
        {isPaid && (
          <span className="px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-lime-300 text-xs font-black uppercase flex items-center gap-1">
            <Ticket className="w-3.5 h-3.5" /> Ticketed Stage · ${(space.ticketPrice || 0).toFixed(2)}
          </span>
        )}
      </div>

      <span className="ptr-mic">
        <Image src="/protalk.png" alt="" fill className="object-cover" sizes="88px" />
      </span>
      <h1>{space.name}</h1>
      {space.description && <p className="ptr-desc">{space.description}</p>}

      <div className="ptr-meta">
        <span>
          Hosted by <strong>{space.host.name}</strong>
        </span>
        {space.category && <span>{space.category}</span>}
        {space.scheduledAt && (
          <span>
            <Clock className="w-4 h-4" /> {formatScheduled(space.scheduledAt)}
          </span>
        )}
        <span>
          <Users className="w-4 h-4" /> {rsvpCount} {rsvpCount === 1 ? "person" : "people"} going
        </span>
      </div>

      {/* Ticket Confirmed Banner for Ticket Holders */}
      {isPaid && hasTicket && (
        <div className="my-4 px-4 py-3 rounded-2xl bg-emerald-500/15 border border-emerald-400/40 text-lime-300 text-xs font-bold flex items-center justify-center gap-2">
          <CheckCheck className="w-4 h-4 text-lime-400 shrink-0" />
          <span>
            Your Ticket Is Confirmed! Ticket #{space.ticketNumber || "CONFIRMED"} &bull; Stage opens at start time.
          </span>
        </div>
      )}

      <Countdown target={space.scheduledAt} />

      <div className="ptr-actions">
        {isHost && (
          <>
            <button
              id="host-start-now-btn"
              onClick={onStartNow}
              disabled={starting}
              className="ptr-btn ptr-btn--live"
            >
              {starting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Play className="w-4 h-4 fill-white" />
              )}
              {starting ? "Starting stage…" : "Go live now"}
            </button>

            {isPaid && (
              <button
                onClick={onOpenTicketDashboard}
                className="ptr-btn !bg-emerald-500/20 !border-emerald-400/50 !text-lime-300 hover:!bg-emerald-500/30"
              >
                <BarChart3 className="w-4 h-4" /> Ticket Sales Dashboard
              </button>
            )}

            <button
              id="host-edit-talk-btn"
              onClick={() => setShowEdit(true)}
              className="ptr-btn ptr-btn--ghost"
            >
              <Pencil className="w-4 h-4" /> Edit Talk
            </button>
          </>
        )}

        {isAdmin && (
          <button
            id="admin-manual-rsvp-btn"
            onClick={() => setShowAdminRsvp(true)}
            className="ptr-btn !bg-gradient-to-r !from-lime-400/20 !to-emerald-400/20 !border-lime-400/60 !text-lime-300 hover:!from-lime-400/30 hover:!to-emerald-400/30 font-black shadow-md shadow-emerald-500/10"
            title="Admin: Search & Manually RSVP Platform Members"
          >
            <UserPlus className="w-4 h-4 text-lime-400" /> Manually RSVP Member
          </button>
        )}

        {currentUserId && !isHost && !isPaid && (
          <button
            id="detail-rsvp-btn"
            onClick={toggleRsvp}
            disabled={rsvping}
            className={`ptr-btn ${rsvped ? "ptr-btn--ghost" : "ptr-btn--primary"}`}
          >
            {rsvping ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : rsvped ? (
              <>
                <CheckCheck className="w-4 h-4" /> RSVP&apos;d
              </>
            ) : (
              <>
                <Check className="w-4 h-4" /> RSVP
              </>
            )}
          </button>
        )}

        {!currentUserId && !isPaid && (
          <>
            <Link
              id="unauth-signup-rsvp-btn"
              href={accountUrl("/register", `/pro-talks/${space.id}`)}
              className="ptr-btn ptr-btn--primary"
            >
              <Radio01Icon className="w-4 h-4" /> Sign Up to RSVP
            </Link>
            <Link
              id="unauth-signin-btn"
              href={accountUrl("/login", `/pro-talks/${space.id}`)}
              className="ptr-btn ptr-btn--ghost"
            >
              Sign In to RSVP
            </Link>
          </>
        )}

        {shareUrl && (
          <button onClick={copyLink} className="ptr-btn ptr-btn--ghost">
            {copied ? <CheckCheck className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            {copied ? "Link copied" : "Copy invite link"}
          </button>
        )}
      </div>

      {(isHost || isAdmin) && !isPaid && (
        <section className="ptr-host" aria-label="Confirmed RSVPs">
          <p>{isAdmin && !isHost ? "Admin · Confirmed RSVPs & Attendees" : "Host · confirmed RSVPs"}</p>
          <RsvpPanel
            spaceId={space.id}
            spaceName={space.name}
            isAdmin={isAdmin}
            onRsvpCountChanged={(c) => setRsvpCount(c)}
          />
        </section>
      )}

      {isHost && (
        <EditTalkDialog
          space={space}
          isOpen={showEdit}
          onClose={() => setShowEdit(false)}
          onSaved={(updated) => onSpaceUpdated(updated)}
          onCancelled={(id) => onCancelled(id)}
        />
      )}

      {isAdmin && (
        <AdminRsvpModal
          spaceId={space.id}
          spaceName={space.name}
          isOpen={showAdminRsvp}
          onClose={() => setShowAdminRsvp(false)}
          onRsvpUpdated={() => {
            fetch(`/api/spaces/${space.id}/rsvp`)
              .then((r) => r.json())
              .then((data) => {
                if (Array.isArray(data)) setRsvpCount(data.length);
              })
              .catch(() => {});
          }}
        />
      )}
    </main>
  );
}

// ── Guest Join Screen (Free Talks Only) ───────────────────────────────────────
function GuestJoinScreen({
  space,
  onJoin,
}: {
  space: Space;
  onJoin: (displayName: string) => void;
}) {
  const [name, setName] = useState("");
  const [joining, setJoining] = useState(false);
  const handleJoin = () => {
    if (!name.trim() || joining) return;
    setJoining(true);
    onJoin(name.trim());
  };
  const isVideo = space.mediaType === "AUDIO_VIDEO";

  return (
    <main className="ptr-screen">
      <Link href="/pro-talks" className="ptr-back">
        &larr; Pro Talks
      </Link>
      <span className="ptr-status is-live">
        <span className="ptr-dot" /> Live now
      </span>
      <span className="ptr-mic">
        <Image src="/protalk.png" alt="" fill className="object-cover" sizes="88px" />
      </span>
      <h1>{space.name}</h1>
      {space.description && <p className="ptr-desc">{space.description}</p>}
      <div className="ptr-meta">
        <span>
          Hosted by <strong>{space.host.name}</strong>
        </span>
        {space.category && <span>{space.category}</span>}
        <span>{isVideo ? "Audio + video" : "Audio only"}</span>
      </div>
      <form
        className="ptr-join"
        onSubmit={(e) => {
          e.preventDefault();
          handleJoin();
        }}
      >
        <label htmlFor="guest-name-input">Your display name</label>
        <input
          id="guest-name-input"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="How should others see you?"
          maxLength={40}
          autoComplete="name"
        />
        <button
          id="guest-join-btn"
          type="submit"
          disabled={!name.trim() || joining}
          className="ptr-btn ptr-btn--primary"
        >
          {joining ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" /> Joining…
            </>
          ) : (
            <>
              <Radio01Icon className="w-4 h-4" /> Join Pro Talk
            </>
          )}
        </button>
      </form>
      <div className="flex items-center justify-center gap-3 text-xs text-slate-400 mt-1">
        <span>Have an account?</span>
        <Link
          href={accountUrl("/login", `/pro-talks/${space.id}`)}
          className="text-lime-400 font-bold hover:underline"
        >
          Sign In
        </Link>
        <span>&bull;</span>
        <Link
          href={accountUrl("/register", `/pro-talks/${space.id}`)}
          className="text-emerald-400 font-bold hover:underline"
        >
          Sign Up
        </Link>
      </div>
      <p className="ptr-fine">Free to join &bull; you&apos;ll enter muted</p>
    </main>
  );
}

// ── Main Page Component ───────────────────────────────────────────────────────
export default function ProTalkPage() {
  const { id } = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();

  const [space, setSpace] = useState<Space | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [userId, setUserId] = useState("");
  const [ending, setEnding] = useState(false);
  const [starting, setStarting] = useState(false);
  const [showGuestForm, setShowGuestForm] = useState(false);
  const [showTicketModal, setShowTicketModal] = useState(false);
  const [buyingTicket, setBuyingTicket] = useState(false);
  const [ticketSuccess, setTicketSuccess] = useState(false);

  const fetchData = useCallback(async () => {
    if (!id) return;
    try {
      // Check if returning from Stripe ticket checkout
      const ticketPaid = searchParams?.get("ticket_success") === "1";
      const sessionId = searchParams?.get("session_id");

      if (ticketPaid && sessionId) {
        await fetch(`/api/spaces/${id}/confirm-ticket`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId }),
        }).catch(() => {});
        setTicketSuccess(true);
      }

      const [spaceData, tokenData, me] = await Promise.all([
        fetch(`/api/spaces/${id}`).then((r) => r.json()),
        fetch(`/api/spaces/${id}/token`, { method: "POST" })
          .then((r) => r.json())
          .catch(() => ({ error: "Token unavailable" })),
        fetch("/api/user/me")
          .then((r) => r.json())
          .catch(() => null),
      ]);

      if (spaceData.error) {
        setError(spaceData.error);
        return;
      }
      setSpace(spaceData as Space);

      if (me?.id) {
        setUserId(me.id);
        setIsAdmin(me.role === "ADMIN");
      }

      if (tokenData.error) {
        // Token error might be because user hasn't bought ticket, or not logged in
        if (spaceData.isLive && !isTicketedSpace(spaceData) && !me?.id) {
          setShowGuestForm(true);
        }
      } else {
        setToken(tokenData.token as string);
        fetch(`/api/spaces/${id}/attendance`, { method: "POST" }).catch(() => {});
      }
    } catch {
      setError("Failed to load Pro Talk");
    } finally {
      setLoading(false);
    }
  }, [id, searchParams]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleBuyTicket = async () => {
    if (!id || buyingTicket) return;
    if (!userId) {
      router.push(accountUrl("/login", `/pro-talks/${id}`));
      return;
    }
    setBuyingTicket(true);
    try {
      const res = await fetch(`/api/spaces/${id}/checkout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (!res.ok || !data.url) {
        throw new Error(data.error || "Checkout unavailable");
      }
      window.location.href = data.url;
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to initiate ticket checkout");
      setBuyingTicket(false);
    }
  };

  const handleGuestJoin = async (displayName: string) => {
    setShowGuestForm(false);
    setLoading(true);
    try {
      const res = await fetch(`/api/spaces/${id}/guest-token`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ displayName }),
      });
      const data = await res.json();
      if (data.error) {
        setError(data.error);
        return;
      }
      setToken(data.token as string);
      fetch(`/api/spaces/${id}/attendance`, { method: "POST" }).catch(() => {});
    } catch {
      setError("Failed to join as guest.");
    } finally {
      setLoading(false);
    }
  };

  const handleEnd = async () => {
    if (ending) return;
    setEnding(true);
    try {
      const res = await fetch(`/api/spaces/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (res.ok && data) {
        setSpace((prev) =>
          prev
            ? {
                ...prev,
                ...data,
                isLive: false,
                endedAt: data.endedAt || new Date().toISOString(),
              }
            : data
        );
      } else {
        setSpace((prev) =>
          prev ? { ...prev, isLive: false, endedAt: new Date().toISOString() } : prev
        );
      }
    } finally {
      setEnding(false);
    }
  };

  const handleStartNow = async () => {
    if (starting || !space) return;
    setStarting(true);
    try {
      const res = await fetch(`/api/spaces/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isLive: true }),
      });
      if (res.ok) {
        const updated = (await res.json()) as Space;
        setSpace(updated);
        const tokenRes = await fetch(`/api/spaces/${id}/token`, { method: "POST" });
        if (tokenRes.ok) {
          const tokenData = await tokenRes.json();
          if (tokenData.token) {
            setToken(tokenData.token);
            fetch(`/api/spaces/${id}/attendance`, { method: "POST" }).catch(() => {});
          }
        }
      }
    } catch {
      // ignore
    } finally {
      setStarting(false);
    }
  };

  if (loading) {
    return (
      <main className="ptr-screen ptr-loading" role="status">
        <span className="ptr-mic">
          <Image src="/protalk.png" alt="" fill className="object-cover" sizes="88px" priority />
        </span>
        <Loader2 className="w-6 h-6 animate-spin text-emerald-400" />
        <p>Connecting to the Pro Talk stage…</p>
      </main>
    );
  }

  // Check if user is host, co-host, or admin
  const isHost = Boolean(
    space &&
      userId &&
      (space.hostId === userId ||
        space.host?.id === userId ||
        (Array.isArray(space.coHostIds) && space.coHostIds.includes(userId)) ||
        isAdmin)
  );

  // Pro Talk has ended -> Show Attendance Summary with CSV Export for Host / Admin
  if (space?.endedAt) {
    if (isHost || isAdmin) {
      return (
        <EndedTalkAttendanceSummary
          space={space}
          isAdmin={isAdmin}
          isHost={isHost}
        />
      );
    }

    return (
      <main className="ptr-screen">
        <span className="ptr-mic">
          <Image src="/protalk.png" alt="" fill className="object-cover" sizes="88px" priority />
        </span>
        <h1>This Pro Talk has concluded</h1>
        <p className="ptr-desc">
          Thank you for participating! Browse live and upcoming sessions in the Pro Talks directory.
        </p>
        <div className="ptr-actions">
          <Link href="/pro-talks" className="ptr-btn ptr-btn--primary">
            Browse Pro Talks
          </Link>
        </div>
      </main>
    );
  }

  // If ticketed talk and attendee doesn't have a ticket yet (and is not host/co-host/admin)
  if (space && isTicketedSpace(space) && !isHost && !space.hasTicket) {
    return (
      <TicketedPurchaseScreen
        space={space}
        currentUserId={userId}
        onBuyTicket={handleBuyTicket}
        buying={buyingTicket}
      />
    );
  }

  // Guest name form for public free live talks only
  if (showGuestForm && space && !isTicketedSpace(space)) return <GuestJoinScreen space={space} onJoin={handleGuestJoin} />;

  // Scheduled screen (both free and ticketed where user has ticket or is host)
  if (space && !space.isLive && !space.endedAt) {
    return (
      <>
        <ScheduledScreen
          space={space}
          isHost={isHost}
          isAdmin={isAdmin}
          currentUserId={userId}
          onStartNow={handleStartNow}
          starting={starting}
          onSpaceUpdated={(updated) => setSpace((s) => (s ? { ...s, ...updated } : updated))}
          onCancelled={() => router.push("/pro-talks")}
          onOpenTicketDashboard={() => setShowTicketModal(true)}
        />
        {isTicketedSpace(space) && (
          <HostTicketSalesModal
            spaceId={space.id}
            spaceName={space.name}
            isOpen={showTicketModal}
            onClose={() => setShowTicketModal(false)}
            onCapacityUpdated={(newCap) =>
              setSpace((s) => (s ? { ...s, ticketCapacity: newCap } : s))
            }
          />
        )}
      </>
    );
  }

  if (error || !space || !token) {
    return (
      <main className="ptr-screen">
        <span className="ptr-mic">
          <Image src="/protalk.png" alt="" fill className="object-cover" sizes="88px" priority />
        </span>
        <h1>Pro Talk unavailable</h1>
        <p className="ptr-desc">
          {error && error !== "Not found"
            ? error
            : "It may have concluded or the link is no longer valid. Browse what's live and upcoming instead."}
        </p>
        <div className="ptr-actions">
          <Link href="/pro-talks" className="ptr-btn ptr-btn--primary">
            Browse Pro Talks
          </Link>
        </div>
      </main>
    );
  }

  return (
    <>
      <SpaceRoom
        space={space}
        token={token}
        isAdmin={isAdmin}
        userId={userId}
        onEnd={handleEnd}
        ending={ending}
      />
      {isHost && isTicketedSpace(space) && (
        <HostTicketSalesModal
          spaceId={space.id}
          spaceName={space.name}
          isOpen={showTicketModal}
          onClose={() => setShowTicketModal(false)}
          onCapacityUpdated={(newCap) =>
            setSpace((s) => (s ? { ...s, ticketCapacity: newCap } : s))
          }
        />
      )}
    </>
  );
}

"use client";

import { useEffect, useState, useMemo, useRef, Suspense } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { useAppSelector } from "@/store/hooks";
import {
  Loader2,
  Copy,
  CheckCheck,
  Calendar,
  Clock,
  Users,
  Mic,
  Video,
  ArrowRight,
  Lock,
  Pencil,
  Ticket,
  Building2,
  Check,
  Receipt,
} from "lucide-react";
import {
  Radio01Icon,
  Add01Icon,
  CalendarAdd01Icon,
  Search01Icon,
  Cancel01Icon,
  GridViewIcon,
  Calendar03Icon,
  StarIcon,
  FireIcon,
  CourtLawIcon,
  CheckListIcon,
  Audit01Icon,
  CreditCardIcon as HugeCreditCardIcon,
  Briefcase01Icon,
  Rocket01Icon,
  Building02Icon,
  ComputerIcon,
  AiBrain01Icon,
  Analytics01Icon,
  UserGroupIcon,
  School01Icon,
  Shield01Icon,
  Clock01Icon,
  News01Icon,
  Award01Icon,
  UserMultiple02Icon,
  QuestionIcon,
  Mic01Icon,
  ArrowRight01Icon,
  ArrowDown01Icon,
} from "hugeicons-react";
import { PRO_TALK_CATEGORIES } from "@/lib/proTalks";
import { isTicketedSpace } from "@/lib/ticketedProTalks";
import EditTalkDialog from "@/components/spaces/EditTalkDialog";
import { accountUrl } from "@/lib/auth-navigation";
import "./pro-talks-directory.css";

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
  hostId?: string;
  roomName: string;
  category: string;
  mediaType: string;
  visibility?: "PUBLIC" | "PRIVATE" | "TICKETED";
  accessType?: "FREE" | "PRIVATE" | "PAID" | "TICKETED";
  ticketPrice?: number | null;
  ticketCapacity?: number | null;
  ticketsSold?: number;
  ticketsRemaining?: number;
  hasTicket?: boolean;
  ticketNumber?: string | null;
  isHost?: boolean;
  salesClosedEarly?: boolean;
  isNetworkExclusive?: boolean;
  networkId?: string | null;
  network?: { id: string; name: string; slug: string } | null;
  whatIsIncluded?: string[] | null;
  refundPolicy?: string | null;
  refundUntil?: string | null;
  isLive: boolean;
  scheduledAt: string | null;
  shareToken: string | null;
  totalAttendees: number;
  peakAttendees: number;
  replayUrl: string | null;
  replayDurationMinutes: number | null;
  isReplay: boolean;
  createdAt: string;
  endedAt: string | null;
  host: SpaceHost;
  _count: { rsvps: number; attendances?: number };
  isRsvped?: boolean;
  hasJoined?: boolean;
}

function CategoryIcon({
  slug,
  className = "w-3.5 h-3.5 shrink-0",
}: {
  slug?: string;
  className?: string;
}) {
  switch (slug) {
    case "tax-law-updates":
      return <CourtLawIcon className={className} />;
    case "due-diligence-compliance":
      return <CheckListIcon className={className} />;
    case "irs-audits-notices":
      return <Audit01Icon className={className} />;
    case "tax-credits-filing-status":
      return <HugeCreditCardIcon className={className} />;
    case "schedule-c-business-returns":
      return <Briefcase01Icon className={className} />;
    case "tax-office-start-up":
      return <Rocket01Icon className={className} />;
    case "tax-office-operations":
      return <Building02Icon className={className} />;
    case "tax-software-technology":
      return <ComputerIcon className={className} />;
    case "ai-automation":
      return <AiBrain01Icon className={className} />;
    case "marketing-business-growth":
      return <Analytics01Icon className={className} />;
    case "client-management":
      return <UserGroupIcon className={className} />;
    case "staffing-training":
      return <School01Icon className={className} />;
    case "efin-ero-discussions":
      return <Shield01Icon className={className} />;
    case "tax-season-talk":
      return <Clock01Icon className={className} />;
    case "industry-news-updates":
      return <News01Icon className={className} />;
    case "professional-development":
      return <Award01Icon className={className} />;
    case "networking-collaboration":
      return <UserMultiple02Icon className={className} />;
    case "expert-qa":
      return <QuestionIcon className={className} />;
    case "open-discussion":
      return <Mic01Icon className={className} />;
    case "all":
    default:
      return <GridViewIcon className={className} />;
  }
}

function getCategoryIconByName(name: string, className = "w-3.5 h-3.5 shrink-0") {
  const cat = PRO_TALK_CATEGORIES.find((c) => c.name === name);
  return <CategoryIcon slug={cat?.slug} className={className} />;
}

type TabType = "my-talks" | "all" | "live" | "upcoming" | "ticketed" | "my-tickets" | "following" | "popular";

function timeAgo(d: string) {
  const s = Math.floor((Date.now() - new Date(d).getTime()) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  return `${Math.floor(s / 3600)}h ago`;
}

function formatScheduled(d: string) {
  return new Date(d).toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function timeUntil(d: string) {
  const ms = new Date(d).getTime() - Date.now();
  if (ms <= 0) return "starting soon";
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  if (h >= 24) return `in ${Math.floor(h / 24)}d ${h % 24}h`;
  if (h > 0) return `in ${h}h ${m}m`;
  return `in ${m}m`;
}

function LiveWave() {
  return (
    <div className="flex items-end gap-[2px] h-3.5">
      {[1, 0.4, 0.8, 0.3, 1, 0.6, 0.4, 0.9, 0.5, 0.9].map((h, i) => (
        <span
          key={i}
          className="w-[2px] bg-emerald-400 rounded-full animate-pulse"
          style={{ height: `${h * 13}px`, animationDelay: `${i * 90}ms` }}
        />
      ))}
    </div>
  );
}

// ── Copy Link Button ──────────────────────────────────────────────────────────
function CopyButton({ text, label = "Share" }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button
      onClick={copy}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 hover:text-white text-xs font-semibold transition-all shrink-0"
    >
      {copied ? <CheckCheck className="w-3.5 h-3.5 text-lime-400" /> : <Copy className="w-3.5 h-3.5" />}
      {copied ? "Copied!" : label}
    </button>
  );
}

// ── Live Session Card ─────────────────────────────────────────────────────────
function LiveCard({ space, currentUserId }: { space: Space; currentUserId: string }) {
  const isVideo = space.mediaType === "AUDIO_VIDEO";
  const isPaid = isTicketedSpace(space);
  const isPrivate = !isPaid && (space.accessType === "PRIVATE" || space.visibility === "PRIVATE");
  const isHost = Boolean(
    currentUserId && (space.hostId === currentUserId || space.host?.id === currentUserId)
  );
  const hasTicket = Boolean(space.hasTicket);

  return (
    <Link
      href={`/pro-talks/${space.id}`}
      className="ptd-card group relative bg-gradient-to-br from-[#061426]/95 via-[#07192f]/90 to-[#040a14]/95 hover:from-[#091e38] hover:to-[#071526] border border-emerald-500/35 hover:border-emerald-400 rounded-3xl p-5 transition-all duration-300 backdrop-blur-md overflow-hidden flex flex-col shadow-[0_4px_25px_rgba(0,0,0,0.5)] hover:shadow-[0_0_35px_rgba(16,185,129,0.25)] hover:-translate-y-1"
    >
      {/* Glow pulse behind card */}
      <div className="absolute -top-16 -right-16 w-36 h-36 bg-emerald-500/10 rounded-full blur-2xl group-hover:bg-emerald-500/20 transition-all pointer-events-none" />

      {/* Badges row */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 bg-emerald-500/25 border border-emerald-400/50 rounded-full px-3 py-1 shadow-[0_0_12px_rgba(16,185,129,0.35)]">
            <span className="w-2 h-2 rounded-full bg-lime-400 animate-pulse" />
            <span className="text-lime-300 text-[11px] font-black uppercase tracking-wide">Live</span>
          </div>

          {/* Access Type Badges */}
          {isPaid ? (
            <div className="flex items-center gap-1 bg-gradient-to-r from-emerald-500/25 to-teal-500/20 border border-lime-400/50 text-lime-300 rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wide">
              <Ticket className="w-3 h-3 text-lime-400" />
              <span>TICKETED — ${(space.ticketPrice || 0).toFixed(2)}</span>
            </div>
          ) : isPrivate ? (
            <div className="flex items-center gap-1 bg-purple-500/20 border border-purple-400/40 text-purple-300 rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wide">
              <Lock className="w-3 h-3 text-purple-300" />
              <span>Private</span>
            </div>
          ) : (
            <div className="flex items-center gap-1 bg-emerald-500/15 border border-emerald-400/30 text-emerald-300 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide">
              <span>Free</span>
            </div>
          )}

          {/* Tickets Remaining Badge */}
          {isPaid && typeof space.ticketsRemaining === "number" && (
            <span className="text-[10px] font-bold text-slate-300 px-2 py-0.5 rounded-full bg-white/5 border border-white/10">
              {space.ticketsRemaining > 0 ? `${space.ticketsRemaining} Tickets Remaining` : "Sold Out"}
            </span>
          )}

          <LiveWave />
        </div>

        <div className="flex items-center gap-1.5">
          <span className="px-2.5 py-0.5 rounded-full bg-white/8 border border-white/10 text-slate-300 text-[10px] font-semibold flex items-center gap-1">
            {isVideo ? <Video className="w-3 h-3 text-emerald-400" /> : <Mic className="w-3 h-3 text-teal-400" />}
            {isVideo ? "Audio + Video" : "Audio Only"}
          </span>
          <span className="text-slate-400 text-xs">{timeAgo(space.createdAt)}</span>
        </div>
      </div>

      {/* Network Exclusivity Badge if applicable */}
      {space.isNetworkExclusive && space.network && (
        <div className="mb-2">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-950/80 border border-emerald-400/40 text-lime-300 text-[10px] font-bold">
            <Building2 className="w-3 h-3 text-lime-400" /> {space.network.name} Exclusive
          </span>
        </div>
      )}

      {/* Category Pill */}
      <div className="mb-2">
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-emerald-950/70 border border-emerald-500/30 text-emerald-300 text-[11px] font-bold">
          {getCategoryIconByName(space.category || "Open Discussion", "w-3 h-3 text-emerald-400")}
          <span>{space.category || "Open Discussion"}</span>
        </span>
      </div>

      {/* Title & Description */}
      <h3 className="text-white font-black text-xl mb-1.5 group-hover:text-lime-300 transition-colors leading-snug">
        {space.name}
      </h3>
      {space.description && (
        <p className="text-slate-300 text-sm leading-relaxed line-clamp-2 mb-4">
          {space.description}
        </p>
      )}

      {/* Host Profile & CTA */}
      <div className="mt-auto flex items-center justify-between gap-3 pt-3.5 border-t border-emerald-900/40">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-full overflow-hidden shrink-0 border border-emerald-400/60 bg-gradient-to-br from-emerald-600 to-teal-800">
            {space.host.image ? (
              <img
                src={space.host.image}
                alt={space.host.name}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="w-full h-full flex items-center justify-center text-white text-xs font-black">
                {space.host.name[0]}
              </span>
            )}
          </div>
          <div className="min-w-0">
            <div className="text-white text-xs font-bold truncate">{space.host.name}</div>
            {space.host.headline && (
              <div className="text-slate-400 text-[10px] truncate">{space.host.headline}</div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className="flex items-center gap-1 text-slate-300 text-xs font-semibold px-2 py-1 rounded-lg bg-white/5">
            <Users className="w-3.5 h-3.5 text-emerald-400" />
            <span>{Math.max(1, space.totalAttendees || 1)}</span>
          </span>

          {isPaid && !hasTicket && !isHost ? (
            <span className="flex items-center gap-1 px-3.5 py-1.5 rounded-full bg-gradient-to-r from-lime-400 to-emerald-500 text-[#060e1a] text-xs font-black shadow-md shadow-emerald-500/20 group-hover:scale-105 transition-all">
              <Ticket className="w-3.5 h-3.5" /> GET TICKET — ${(space.ticketPrice || 0).toFixed(2)}
            </span>
          ) : isPaid && hasTicket ? (
            <span className="flex items-center gap-1 px-4 py-1.5 rounded-full bg-emerald-500/30 border border-lime-400 text-lime-300 text-xs font-black shadow-md shadow-emerald-500/20 group-hover:scale-105 transition-all">
              <Check className="w-3 h-3" /> Enter Live Stage
            </span>
          ) : isHost ? (
            <span className="flex items-center gap-1 px-4 py-1.5 rounded-full bg-gradient-to-r from-lime-400 to-emerald-500 text-[#060e1a] text-xs font-black shadow-md shadow-emerald-500/20 group-hover:scale-105 transition-all">
              Host Stage <ArrowRight className="w-3 h-3" />
            </span>
          ) : (
            <span className="flex items-center gap-1 px-4 py-1.5 rounded-full bg-gradient-to-r from-lime-400 to-emerald-500 text-[#060e1a] text-xs font-black shadow-md shadow-emerald-500/20 group-hover:scale-105 transition-all">
              Join Live <ArrowRight className="w-3 h-3" />
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}

// ── Upcoming Session Card ─────────────────────────────────────────────────────
function UpcomingCard({
  space,
  currentUserId,
  onSpaceUpdated,
  onSpaceCancelled,
}: {
  space: Space;
  currentUserId: string;
  onSpaceUpdated?: (updated: Space) => void;
  onSpaceCancelled?: (spaceId: string) => void;
}) {
  const router = useRouter();
  const [showEdit, setShowEdit] = useState(false);
  const [rsvped, setRsvped] = useState(Boolean(space.isRsvped));
  const [rsvping, setRsvping] = useState(false);
  const [rsvpCount, setRsvpCount] = useState(space._count?.rsvps ?? 0);

  useEffect(() => {
    setRsvped(Boolean(space.isRsvped));
    setRsvpCount(space._count?.rsvps ?? 0);
  }, [space.isRsvped, space._count?.rsvps]);

  const isHost = Boolean(
    currentUserId && (space.hostId === currentUserId || space.host?.id === currentUserId)
  );
  const isPaid = isTicketedSpace(space);
  const isPrivate = !isPaid && (space.accessType === "PRIVATE" || space.visibility === "PRIVATE");
  const hasTicket = Boolean(space.hasTicket);

  const shareUrl = space.shareToken
    ? typeof window !== "undefined"
      ? `${window.location.origin}/pro-talks/invite/${space.shareToken}`
      : `/pro-talks/invite/${space.shareToken}`
    : null;

  const toggleRsvp = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (rsvping) return;
    if (!currentUserId) {
      router.push(accountUrl("/register", `/pro-talks/${space.id}`));
      return;
    }
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

  const handleCardClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest("button") || target.closest("a") || target.closest(".dialog-content")) {
      return;
    }
    router.push(`/pro-talks/${space.id}`);
  };

  return (
    <div
      onClick={handleCardClick}
      className="ptd-card group relative bg-gradient-to-br from-[#061426]/75 to-[#040a14]/75 hover:from-[#091b35]/90 hover:to-[#061224]/90 border border-emerald-500/20 hover:border-emerald-400/50 rounded-3xl p-5 transition-all duration-200 backdrop-blur-sm overflow-hidden flex flex-col cursor-pointer hover:shadow-[0_0_30px_rgba(16,185,129,0.15)] hover:-translate-y-0.5"
    >
      {/* Top row */}
      <div className="flex flex-wrap items-start justify-between gap-2 mb-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 bg-blue-500/20 border border-blue-400/30 rounded-full px-3 py-1">
            <Calendar className="w-3 h-3 text-blue-300" />
            <span className="text-blue-200 text-[11px] font-black uppercase tracking-wide">
              Upcoming
            </span>
          </div>

          {/* Access Badges */}
          {isPaid ? (
            <div className="flex items-center gap-1 bg-gradient-to-r from-emerald-500/25 to-teal-500/20 border border-lime-400/50 text-lime-300 rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wide">
              <Ticket className="w-3 h-3 text-lime-400" />
              <span>TICKETED — ${(space.ticketPrice || 0).toFixed(2)}</span>
            </div>
          ) : isPrivate ? (
            <div className="flex items-center gap-1 bg-purple-500/20 border border-purple-400/40 text-purple-300 rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wide">
              <Lock className="w-3 h-3 text-purple-300" />
              <span>Private</span>
            </div>
          ) : (
            <div className="flex items-center gap-1 bg-emerald-500/15 border border-emerald-400/30 text-emerald-300 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide">
              <span>Free</span>
            </div>
          )}

          {/* Capacity status */}
          {isPaid && typeof space.ticketsRemaining === "number" && (
            <span className="text-[10px] font-bold text-slate-300 px-2 py-0.5 rounded-full bg-white/5 border border-white/10">
              {space.ticketsRemaining > 0 ? `${space.ticketsRemaining} Tickets Remaining` : "Sold Out"}
            </span>
          )}

          {space.scheduledAt && (
            <span className="text-emerald-300/80 text-xs font-semibold">
              {timeUntil(space.scheduledAt)}
            </span>
          )}
        </div>

        {shareUrl && <CopyButton text={shareUrl} label="Share" />}
      </div>

      {/* Network Exclusivity Badge if applicable */}
      {space.isNetworkExclusive && space.network && (
        <div className="mb-2">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-950/80 border border-emerald-400/40 text-lime-300 text-[10px] font-bold">
            <Building2 className="w-3 h-3 text-lime-400" /> {space.network.name} Exclusive
          </span>
        </div>
      )}

      {/* Category */}
      <div className="mb-2">
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-emerald-950/40 border border-emerald-500/20 text-emerald-300 text-[11px] font-semibold">
          {getCategoryIconByName(space.category || "Open Discussion", "w-3 h-3 text-emerald-400")}
          <span>{space.category || "Open Discussion"}</span>
        </span>
      </div>

      {/* Title */}
      <h3 className="text-white font-black text-xl mb-1.5 leading-snug group-hover:text-lime-300 transition-colors">
        {space.name}
      </h3>
      {space.description && (
        <p className="text-slate-300 text-sm leading-relaxed line-clamp-2 mb-3">
          {space.description}
        </p>
      )}

      {/* Date & Time pill */}
      {space.scheduledAt && (
        <div className="flex items-center gap-2 text-xs text-emerald-300 mb-4 bg-emerald-950/30 border border-emerald-500/20 rounded-xl px-3 py-2">
          <Clock className="w-3.5 h-3.5 text-lime-400 shrink-0" />
          <span className="font-semibold">{formatScheduled(space.scheduledAt)}</span>
        </div>
      )}

      {/* Host profile and Actions */}
      <div className="mt-auto flex items-center justify-between gap-3 pt-3 border-t border-emerald-900/30">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-7 h-7 rounded-full overflow-hidden shrink-0 border border-emerald-400/40 bg-gradient-to-br from-emerald-600 to-teal-800">
            {space.host.image ? (
              <img
                src={space.host.image}
                alt={space.host.name}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="w-full h-full flex items-center justify-center text-white text-xs font-bold">
                {space.host.name[0]}
              </span>
            )}
          </div>
          <div className="text-white text-xs font-semibold truncate">{space.host.name}</div>
        </div>

        <div className="flex items-center gap-2">
          {isHost ? (
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setShowEdit(true);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-400/40 text-lime-300 text-xs font-black transition-all"
            >
              <Pencil className="w-3.5 h-3.5" /> Edit
            </button>
          ) : isPaid && hasTicket ? (
            <span className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-500/20 border border-emerald-400 text-lime-300 text-xs font-black">
              <Check className="w-3 h-3" /> Ticket Confirmed
            </span>
          ) : isPaid ? (
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                router.push(`/pro-talks/${space.id}`);
              }}
              className="flex items-center gap-1 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-lime-400 to-emerald-500 hover:from-lime-300 hover:to-emerald-400 text-[#04111f] text-xs font-black shadow-md shadow-emerald-500/20 hover:scale-105 transition-all"
            >
              <Ticket className="w-3.5 h-3.5" /> GET TICKET — ${(space.ticketPrice || 0).toFixed(2)}
            </button>
          ) : (
            <button
              onClick={toggleRsvp}
              disabled={rsvping}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-black transition-all ${
                rsvped
                  ? "bg-emerald-500/25 border border-emerald-400 text-lime-300"
                  : "bg-white/10 hover:bg-white/18 text-white border border-white/10 hover:border-emerald-400/40"
              }`}
            >
              <Users className="w-3 h-3" />
              <span>{rsvped ? "RSVP'd ✓" : "RSVP"}</span>
            </button>
          )}
        </div>
      </div>

      {isHost && (
        <EditTalkDialog
          space={space}
          isOpen={showEdit}
          onClose={() => setShowEdit(false)}
          onSaved={(updated) => onSpaceUpdated?.(updated)}
          onCancelled={(id) => onSpaceCancelled?.(id)}
        />
      )}
    </div>
  );
}

// ── Category dropdown ────────────────────────────────────────────────────────
function CategoryDropdown({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const current = PRO_TALK_CATEGORIES.find((c) => c.name === value);
  const pick = (v: string) => {
    onChange(v);
    setOpen(false);
  };

  return (
    <div ref={rootRef} className="ptd-select">
      <button
        type="button"
        className="ptd-select-btn"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        {current ? (
          <CategoryIcon slug={current.slug} className="w-4 h-4" />
        ) : (
          <GridViewIcon className="w-4 h-4" />
        )}
        <span>{current ? current.name : "All categories"}</span>
        <ArrowDown01Icon className={`w-4 h-4 ptd-caret${open ? " is-open" : ""}`} />
      </button>
      {open && (
        <ul role="listbox" aria-label="Categories" className="ptd-select-menu">
          <li role="option" aria-selected={value === "all"}>
            <button type="button" onClick={() => pick("all")}>
              <GridViewIcon className="w-4 h-4" /> All categories
            </button>
          </li>
          {PRO_TALK_CATEGORIES.map((cat) => (
            <li key={cat.id} role="option" aria-selected={value === cat.name}>
              <button type="button" onClick={() => pick(cat.name)}>
                <CategoryIcon slug={cat.slug} className="w-4 h-4" /> {cat.name}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ── Main Page Inner ───────────────────────────────────────────────────────────
function ProTalksInner() {
  const user = useAppSelector((s) => s.auth.user);
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (searchParams?.get("host_paid") === "1") {
      router.replace(`/pro-talks/new?${searchParams.toString()}`);
    }
  }, [router, searchParams]);

  const [spaces, setSpaces] = useState<Space[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters state
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<TabType>(() => {
    const t = searchParams?.get("tab");
    return t === "live" ||
      t === "upcoming" ||
      t === "ticketed" ||
      t === "my-talks" ||
      t === "my-tickets" ||
      t === "following" ||
      t === "popular"
      ? (t as TabType)
      : "all";
  });
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  useEffect(() => {
    let active = true;
    const params = new URLSearchParams();
    if (selectedCategory && selectedCategory !== "all")
      params.set("category", selectedCategory);
    if (searchQuery.trim()) params.set("search", searchQuery.trim());
    if (activeTab !== "all") params.set("tab", activeTab);

    fetch(`/api/spaces?${params.toString()}`)
      .then((r) => r.json())
      .then((data) => {
        if (active) {
          if (Array.isArray(data)) setSpaces(data);
          else setSpaces([]);
          setLoading(false);
        }
      })
      .catch(() => {
        if (active) {
          setSpaces([]);
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [selectedCategory, searchQuery, activeTab]);

  const handleHostClick = () => router.push("/pro-talks/new");
  const handleScheduleClick = () => router.push("/pro-talks/new?mode=schedule");

  const liveSpaces = useMemo(() => spaces.filter((s) => s.isLive), [spaces]);
  const upcomingSpaces = useMemo(
    () => spaces.filter((s) => !s.isLive && !s.endedAt),
    [spaces]
  );
  const ticketedSpaces = useMemo(
    () => spaces.filter((s) => isTicketedSpace(s)),
    [spaces]
  );

  const tabs = [
    { id: "all", label: "All Talks", icon: GridViewIcon },
    { id: "live", label: "Live Now", icon: Radio01Icon, count: liveSpaces.length, isLive: true },
    { id: "upcoming", label: "Upcoming", icon: Calendar03Icon, count: upcomingSpaces.length },
    { id: "ticketed", label: "Ticketed Workshops", icon: Ticket },
    { id: "my-tickets", label: "My Tickets", icon: Receipt },
    { id: "my-talks", label: "My Talks", icon: Mic },
    { id: "following", label: "Following", icon: StarIcon },
    { id: "popular", label: "Popular / Trending", icon: FireIcon },
  ];

  const scrollToTalks = () =>
    document.getElementById("talks")?.scrollIntoView({ behavior: "smooth", block: "start" });

  const liveEmpty = (
    <div className="ptd-empty">
      <span className="ptd-empty-mic">
        <Image src="/protalk.png" alt="" fill className="object-cover" />
      </span>
      <strong>No live sessions right now</strong>
      <p>Check the upcoming talks or open your own live stage.</p>
      <button onClick={handleHostClick} className="ptd-primary">
        <Add01Icon className="w-4 h-4" /> Start a Pro Talk
      </button>
    </div>
  );

  const upcomingEmpty = (
    <div className="ptd-empty">
      <Calendar03Icon className="w-7 h-7 text-blue-300" />
      <strong>No upcoming talks scheduled</strong>
      <p>Be the first to schedule a session{selectedCategory !== "all" ? " in this category" : ""}.</p>
      <button onClick={handleScheduleClick} className="ptd-secondary">
        <CalendarAdd01Icon className="w-4 h-4" /> Schedule a talk
      </button>
    </div>
  );

  const myTicketsEmpty = (
    <div className="ptd-empty">
      <Receipt className="w-8 h-8 text-emerald-300" />
      <strong>No tickets purchased yet</strong>
      <p>
        Browse ticketed workshops and masterclasses. Once you purchase a ticket, your access appears here.
      </p>
      <button onClick={() => setActiveTab("ticketed")} className="ptd-secondary">
        <Ticket className="w-4 h-4" /> Browse Ticketed Workshops
      </button>
    </div>
  );

  const ticketedEmpty = (
    <div className="ptd-empty">
      <Ticket className="w-8 h-8 text-lime-300" />
      <strong>No ticketed talks available right now</strong>
      <p>Host a paid workshop or masterclass for your community.</p>
      <button onClick={handleHostClick} className="ptd-primary">
        <Add01Icon className="w-4 h-4" /> Host a Ticketed Pro Talk
      </button>
    </div>
  );

  const handleSpaceUpdated = (updated: Space) => {
    setSpaces((prev) => prev.map((s) => (s.id === updated.id ? { ...s, ...updated } : s)));
  };
  const handleSpaceCancelled = (spaceId: string) => {
    setSpaces((prev) => prev.filter((s) => s.id !== spaceId));
  };

  const mixedCards = (list: Space[]) =>
    list.map((space) =>
      space.endedAt && activeTab === "my-talks" ? (
        <article key={space.id} className="ptd-card p-6 flex flex-col gap-4">
          <span className="text-sm opacity-70">Ended · {new Date(space.endedAt).toLocaleDateString()}</span>
          <h3 className="text-xl font-semibold">{space.name}</h3>
          <p className="text-sm opacity-70">Hosted by {space.host.name} · {space._count.attendances ?? space.totalAttendees} joined</p>
          <Link className="ptd-secondary" href={`/pro-talks/${space.id}`}>View attendance & export <ArrowRight className="w-4 h-4" /></Link>
        </article>
      ) : space.isLive ? (
        <LiveCard key={space.id} space={space} currentUserId={user?.id ?? ""} />
      ) : (
        <UpcomingCard
          key={space.id}
          space={space}
          currentUserId={user?.id ?? ""}
          onSpaceUpdated={handleSpaceUpdated}
          onSpaceCancelled={handleSpaceCancelled}
        />
      )
    );

  return (
    <div className="ptd-page">
      <span className="ptd-glow ptd-glow--tl" aria-hidden="true" />
      <span className="ptd-glow ptd-glow--tr" aria-hidden="true" />
      <span className="ptd-glow ptd-glow--mid" aria-hidden="true" />

      <div className="ptd-container">
        {/* Eyebrow bar */}
        <div className="ptd-top">
          <span className="ptd-eyebrow">
            <Mic01Icon size={15} /> The live stage · Pro Talks
          </span>
          <button className="ptd-top-link" onClick={handleHostClick}>
            Have something to share? <b>Host a Pro Talk <ArrowRight01Icon size={15} /></b>
          </button>
        </div>

        {/* Hero */}
        <section className="ptd-hero" aria-labelledby="pro-talks-title">
          <div className="ptd-hero-copy">
            <span className="ptd-kicker">
              <span className="ptd-dot" aria-hidden="true" />
              <strong>{liveSpaces.length} live now</strong>
              · Free and Ticketed Expert Stages
            </span>
            <h1 id="pro-talks-title">
              Tax experts, live.
              <span>Pro Talks.</span>
            </h1>
            <p>
              Real-time audio &amp; video stages with tax masters, EAs, CPAs, and industry leaders. Join live
              discussions, attend paid masterclasses, ask questions, or host your own stage.
            </p>
            <div className="ptd-actions">
              <button onClick={handleHostClick} className="ptd-primary">
                <Add01Icon className="w-4 h-4" /> Host a Pro Talk
              </button>
              <button onClick={scrollToTalks} className="ptd-secondary">
                Browse talks <ArrowRight01Icon className="w-4 h-4" />
              </button>
            </div>
            <div className="ptd-benefits">
              <span>
                <Mic className="w-4 h-4" /> Audio &amp; video stages
              </span>
              <span>
                <Ticket className="w-4 h-4" /> Paid &amp; Free Workshops
              </span>
              <span>
                <QuestionIcon className="w-4 h-4" /> Ask questions live
              </span>
            </div>
          </div>

          <div className="ptd-art">
            <div className="ptd-art-img">
              <Image
                src="/protalk.png"
                alt="Pro Talks microphone"
                fill
                priority
                className="object-cover"
                sizes="(max-width: 760px) 90vw, 520px"
              />
            </div>
            <span className="ptd-art-badge">
              <span className="ptd-dot" aria-hidden="true" /> Live stage
            </span>
            <div className="ptd-art-float">
              <span>
                <Calendar03Icon className="w-5 h-5" />
              </span>
              <span>
                <strong>{upcomingSpaces.length}</strong>
                <small>Upcoming talk{upcomingSpaces.length === 1 ? "" : "s"}</small>
              </span>
            </div>
          </div>
        </section>

        {/* Discovery */}
        <section id="talks" className="ptd-discover" aria-labelledby="talks-title">
          <div className="ptd-section-head">
            <div>
              <span className="ptd-eyebrow">
                <Radio01Icon size={15} /> Find your next talk
              </span>
              <h2 id="talks-title">Live, upcoming &amp; ticketed stages</h2>
              <p>Search by topic, pick a track, and jump into the conversation.</p>
            </div>
          </div>

          {/* One toolbar: view tabs · search · category dropdown */}
          <div className="ptd-toolbar">
            <div role="tablist" aria-label="Filter talks" className="ptd-tabs">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    role="tab"
                    aria-selected={activeTab === tab.id}
                    onClick={() => setActiveTab(tab.id as TabType)}
                    className={`ptd-tab${tab.isLive ? " is-live" : ""}`}
                  >
                    <Icon className="w-4 h-4" /> {tab.label}
                    {typeof tab.count === "number" && tab.count > 0 && <i>{tab.count}</i>}
                  </button>
                );
              })}
            </div>

            <label className="ptd-search">
              <Search01Icon className="w-5 h-5" />
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by topic, keyword or host…"
                aria-label="Search Pro Talks"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  aria-label="Clear search"
                >
                  <Cancel01Icon className="w-3.5 h-3.5" />
                </button>
              )}
            </label>

            <CategoryDropdown value={selectedCategory} onChange={setSelectedCategory} />
          </div>
        </section>

        {/* Catalog */}
        <div className="ptd-catalog">
          {loading ? (
            <div className="ptd-loading" role="status">
              <Loader2 className="w-8 h-8 animate-spin text-emerald-400" />
              Discovering Pro Talks…
            </div>
          ) : activeTab === "all" ? (
            /* Live and upcoming side by side */
            <div className="ptd-split">
              <section className="ptd-col ptd-col--live" aria-labelledby="live-title">
                <div className="ptd-col-head">
                  <h3 id="live-title">
                    <Radio01Icon className="w-4 h-4 animate-pulse" /> Live now <i>{liveSpaces.length}</i>
                  </h3>
                  {liveSpaces.length > 0 && <small>Updated in real time</small>}
                </div>
                {liveSpaces.length === 0 ? (
                  liveEmpty
                ) : (
                  liveSpaces.map((space) => (
                    <LiveCard key={space.id} space={space} currentUserId={user?.id ?? ""} />
                  ))
                )}
              </section>
              <section className="ptd-col ptd-col--up" aria-labelledby="upcoming-title">
                <div className="ptd-col-head">
                  <h3 id="upcoming-title">
                    <Calendar03Icon className="w-4 h-4" /> Upcoming <i>{upcomingSpaces.length}</i>
                  </h3>
                  <small>Soonest first</small>
                </div>
                {upcomingSpaces.length === 0
                  ? upcomingEmpty
                  : upcomingSpaces.map((space) => (
                      <UpcomingCard
                        key={space.id}
                        space={space}
                        currentUserId={user?.id ?? ""}
                        onSpaceUpdated={handleSpaceUpdated}
                        onSpaceCancelled={handleSpaceCancelled}
                      />
                    ))}
              </section>
            </div>
          ) : activeTab === "live" ? (
            liveSpaces.length === 0 ? (
              liveEmpty
            ) : (
              <div className="ptd-grid">
                {liveSpaces.map((space) => (
                  <LiveCard key={space.id} space={space} currentUserId={user?.id ?? ""} />
                ))}
              </div>
            )
          ) : activeTab === "upcoming" ? (
            upcomingSpaces.length === 0 ? (
              upcomingEmpty
            ) : (
              <div className="ptd-grid">
                {upcomingSpaces.map((space) => (
                  <UpcomingCard
                    key={space.id}
                    space={space}
                    currentUserId={user?.id ?? ""}
                    onSpaceUpdated={handleSpaceUpdated}
                    onSpaceCancelled={handleSpaceCancelled}
                  />
                ))}
              </div>
            )
          ) : activeTab === "ticketed" ? (
            spaces.length === 0 ? ticketedEmpty : <div className="ptd-grid">{mixedCards(spaces)}</div>
          ) : activeTab === "my-talks" ? (
            spaces.length === 0 ? <div className="ptd-empty"><strong>No hosted talks found</strong><p>Your hosted and co-hosted talks, including past attendance reports, appear here.</p></div> : <div className="ptd-grid">{mixedCards(spaces)}</div>
          ) : activeTab === "my-tickets" ? (
            spaces.length === 0 ? myTicketsEmpty : <div className="ptd-grid">{mixedCards(spaces)}</div>
          ) : spaces.length === 0 ? (
            <div className="ptd-empty">
              {activeTab === "following" ? (
                <StarIcon className="w-7 h-7 text-amber-300" />
              ) : (
                <FireIcon className="w-7 h-7 text-orange-300" />
              )}
              <strong>
                {activeTab === "following" ? "No talks from hosts you follow yet" : "Nothing trending yet"}
              </strong>
              <p>
                {activeTab === "following"
                  ? "Connect with tax professionals to see their live talks here."
                  : "Popular talks will show up here as members join."}
              </p>
              {activeTab === "following" && (
                <Link href="/find-a-pro" className="ptd-secondary">
                  Browse pros <ArrowRight01Icon className="w-4 h-4" />
                </Link>
              )}
            </div>
          ) : (
            <div className="ptd-grid">{mixedCards(spaces)}</div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ProTalksPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gradient-to-br from-[#040a14] via-[#061224] to-[#0a1c38] flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-400" />
        </div>
      }
    >
      <ProTalksInner />
    </Suspense>
  );
}

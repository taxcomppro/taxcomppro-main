"use client";
import { downloadAttendance } from "@/lib/download-attendance";

import { useState, useCallback, useEffect, useRef } from "react";
import ScreenShareView from "./ScreenShareView";
import { toggleProTalkScreenShare } from "@/lib/proTalkScreenShare";
import { useRouter } from "next/navigation";
import {
  LiveKitRoom,
  useParticipants,
  useLocalParticipant,
  useTracks,
  VideoTrack,
  useRoomContext,
  RoomAudioRenderer,
  StartAudio,
  TrackReference,
  isTrackReference,
} from "@livekit/components-react";
import {
  RoomEvent,
  ParticipantEvent,
  Track,
  ConnectionState,
  RemoteParticipant,
} from "livekit-client";
import {
  Mic01Icon,
  MicOff02Icon,
  PhoneOff01Icon,
  Radio01Icon,
  Message01Icon,
  ShoppingBag01Icon,
  Tag01Icon,
} from "hugeicons-react";
import ProTalkProductSpotlight from "./ProTalkProductSpotlight";
import ProTalkTagProductModal from "./ProTalkTagProductModal";
import { useProTalkAudioRecovery } from "./useProTalkAudioRecovery";
import AudioRecoveryBanner from "./AudioRecoveryBanner";
import {
  Clock,
  Loader2,
  X,
  Hand,
  Send,
  Users,
  Monitor,
  MonitorOff,
  Copy,
  Check,
  Sparkles,
  Video,
  VideoOff,
  Pin,
  Trash2,
  VolumeX,
  BarChart3,
  Flag,
  UserX,
  Crown,
  Award,
  FileSpreadsheet,
  Download,
} from "lucide-react";
import { AUDIENCE_REACTIONS, AudienceReaction, LivePoll } from "@/lib/proTalks";
import "./space-room.css";

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
  category?: string;
  mediaType?: string;
  roomName: string;
  hostId: string;
  host: SpaceHost;
  coHostIds?: string[];
  totalAttendees?: number;
  shareToken?: string | null;
  visibility?: string;
  createdAt?: string;
}

interface DiscussionMsg {
  id: string;
  from: string;
  fromId: string;
  image: string | null;
  role: "HOST" | "CO_HOST" | "SPEAKER" | "ATTENDEE";
  text: string;
  timestamp: number;
}

interface FloatingReaction {
  id: string;
  emoji: string;
  identity: string;
}

interface Props {
  space: Space;
  token: string;
  isAdmin: boolean;
  userId: string;
  onEnd: () => void;
  ending: boolean;
}

const enc = new TextEncoder();
const dec = new TextDecoder();


// ── Helper Hook: Elapsed Session Time ─────────────────────────────────────────
function useElapsedTime(startedAt?: string | null) {
  const [elapsed, setElapsed] = useState("00:00");

  useEffect(() => {
    const startTime = startedAt ? new Date(startedAt).getTime() : Date.now();
    const update = () => {
      const now = Date.now();
      const diffSecs = Math.max(0, Math.floor((now - startTime) / 1000));
      const hours = Math.floor(diffSecs / 3600);
      const minutes = Math.floor((diffSecs % 3600) / 60);
      const seconds = diffSecs % 60;
      if (hours > 0) {
        setElapsed(
          `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`
        );
      } else {
        setElapsed(
          `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`
        );
      }
    };
    update();
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, [startedAt]);

  return elapsed;
}

// ── Exit Screen Component ─────────────────────────────────────────────────────
function ExitScreen({
  spaceName,
  duration,
  onExit,
}: {
  spaceName: string;
  duration?: string;
  onExit: () => void;
}) {
  const [secondsLeft, setSecondsLeft] = useState(4);

  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          clearInterval(timer);
          onExit();
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [onExit]);

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-gradient-to-br from-[#061426]/95 via-[#07192f]/95 to-[#040a14]/95 backdrop-blur-xl animate-fade-in">
      <div className="relative w-full max-w-md bg-[#071729] border border-emerald-500/40 rounded-3xl p-8 shadow-2xl text-center">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-lime-400 to-emerald-600 flex items-center justify-center mx-auto mb-4 text-[#04111f] shadow-lg shadow-emerald-500/25">
          <Radio01Icon className="w-8 h-8" />
        </div>
        <span className="inline-block px-3 py-1 rounded-full bg-rose-500/20 text-rose-300 text-xs font-black uppercase tracking-wider mb-2">
          Pro Talk Ended
        </span>
        <h2 className="text-white font-black text-xl mb-2">
          {spaceName}
        </h2>
        <p className="text-slate-300 text-xs mb-5">
          This Pro Talk has concluded. Thank you for listening and participating!
        </p>
        {duration && (
          <div className="inline-flex items-center gap-1.5 text-xs text-emerald-300 bg-emerald-950/60 border border-emerald-500/20 px-3 py-1 rounded-xl mb-5">
            <Clock className="w-3.5 h-3.5 text-lime-400" />
            <span>Duration: {duration}</span>
          </div>
        )}
        <div className="flex items-center justify-center gap-2 text-xs text-slate-400 mb-6 bg-white/5 border border-white/10 rounded-xl py-2 px-4">
          <span>Redirecting to Pro Talks in</span>
          <strong className="text-lime-300 text-sm font-black">{secondsLeft}s</strong>
        </div>
        <button
          onClick={onExit}
          className="w-full py-3 rounded-xl bg-gradient-to-r from-lime-400 to-emerald-500 text-[#04111f] font-black text-xs hover:scale-[1.02] transition-all shadow-md shadow-emerald-500/20"
        >
          Return to Pro Talks Now
        </button>
      </div>
    </div>
  );
}

// Helper to safely parse participant avatar image from metadata
function getParticipantMetadata(metadata?: string): {
  image: string | null;
  role?: string;
  tier?: string;
  isAdmin?: boolean;
} {
  if (!metadata) return { image: null };
  try {
    const data = JSON.parse(metadata);
    return {
      image: data.image ?? null,
      role: data.role,
      tier: data.tier,
      isAdmin: data.isAdmin === true,
    };
  } catch {
    return { image: null };
  }
}

// ── Speaker Avatar Component ──────────────────────────────────────────────────
function SpeakerAvatar({
  name,
  image,
  roleLabel,
  isSpeaking,
  micOn,
  handUp,
  reaction,
  canManage,
  onDemote,
  onPromoteCoHost,
  onRemoteMute,
  size = "lg",
}: {
  name: string;
  image?: string | null;
  roleLabel: "HOST" | "CO_HOST" | "GUEST SPEAKER" | "ATTENDEE";
  isSpeaking: boolean;
  micOn: boolean;
  handUp: boolean;
  reaction?: FloatingReaction;
  canManage: boolean;
  onDemote?: () => void;
  onPromoteCoHost?: () => void;
  onRemoteMute?: () => void;
  size?: "sm" | "lg";
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const dim = size === "lg" ? "w-16 h-16 sm:w-20 sm:h-20" : "w-12 h-12";
  const text = size === "lg" ? "text-2xl" : "text-base";

  return (
    <div
      className={`sr-speaker group ${isSpeaking && micOn ? "is-speaking" : ""}`}
    >
      <div className="sr-speaker-top">
        <span>
          {roleLabel === "HOST"
            ? "YOUR HOST"
            : roleLabel === "CO_HOST"
              ? "CO-HOST"
              : "ON STAGE"}
        </span>
        <span className="sr-speaker-signal">
          {isSpeaking && micOn ? "Speaking" : micOn ? "Mic on" : "Muted"}
        </span>
      </div>
      <div className="relative">
        {/* Speaking animation glow */}
        {isSpeaking && micOn && (
          <div className="absolute -inset-2 rounded-full bg-gradient-to-r from-lime-400 via-emerald-500 to-teal-500 animate-pulse opacity-90 blur-[2px]" />
        )}

        <div
          className={`sr-avatar relative ${dim} rounded-full flex items-center justify-center overflow-hidden border-2 ${
            isSpeaking && micOn
              ? "border-lime-400 shadow-lg shadow-emerald-500/50 scale-105"
              : roleLabel === "HOST"
                ? "border-lime-400 shadow-md shadow-lime-400/20"
                : roleLabel === "CO_HOST"
                  ? "border-emerald-400"
                  : roleLabel === "GUEST SPEAKER"
                    ? "border-teal-400"
                    : "border-white/20"
          } z-10 transition-all`}
          style={{ background: "linear-gradient(135deg,#0a1f36,#0c2340)" }}
        >
          {image ? (
            <img
              src={image}
              alt={name}
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover"
            />
          ) : (
            <span className={`text-white font-black ${text}`}>
              {name[0]?.toUpperCase()}
            </span>
          )}
        </div>

        {reaction && <span key={reaction.id} className="sr-avatar-reaction" role="img" aria-label={`${name} reacted ${reaction.emoji}`}>{reaction.emoji}</span>}

        {/* Mic status badge */}
        <div
          className={`absolute -bottom-0.5 -right-0.5 w-6 h-6 rounded-full flex items-center justify-center border border-white/20 z-20 shadow-md ${
            micOn
              ? "bg-emerald-500 text-[#04111f]"
              : "bg-[#071729] text-rose-400"
          }`}
        >
          {micOn ? (
            <Mic01Icon className="w-3 h-3" />
          ) : (
            <MicOff02Icon className="w-3 h-3" />
          )}
        </div>

        {/* Hand Raised badge */}
        {handUp && (
          <div
            role="img"
            aria-label={`${name} raised their hand`}
            className="sr-hand absolute -top-1.5 -right-1.5 w-6 h-6 bg-amber-500 rounded-full flex items-center justify-center text-xs z-20"
          >
            ✋
          </div>
        )}
      </div>

      {/* Name and Role Label */}
      <div className="sr-speaker-name text-center">
        <p className="text-white text-xs font-bold leading-tight truncate">
          {name}
        </p>
        <span
          className={`inline-block px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider mt-1 ${
            roleLabel === "HOST"
              ? "bg-lime-400 text-[#04111f]"
              : roleLabel === "CO_HOST"
                ? "bg-emerald-500 text-[#04111f]"
                : roleLabel === "GUEST SPEAKER"
                  ? "bg-teal-500/25 text-teal-300 border border-teal-500/40"
                  : "bg-white/10 text-slate-300"
          }`}
        >
          {roleLabel}
        </span>
      </div>

      {/* Host/Co-Host Moderation Dropdown */}
      {canManage && roleLabel !== "HOST" && (
        <div className="relative">
          <button
            onClick={() => setMenuOpen((v) => !v)}
            aria-expanded={menuOpen}
            className="sr-manage px-2 py-0.5 rounded-lg text-xs"
          >
            Manage ▾
          </button>
          {menuOpen && (
            <div className="absolute top-full mt-1 left-1/2 -translate-x-1/2 z-40 bg-[#071729] border border-emerald-500/30 rounded-xl p-1.5 shadow-2xl min-w-[130px] space-y-1">
              {onRemoteMute && micOn && (
                <button
                  onClick={() => {
                    onRemoteMute();
                    setMenuOpen(false);
                  }}
                  className="w-full text-left px-2.5 py-1 text-xs text-amber-300 hover:bg-amber-500/20 rounded-lg flex items-center gap-1.5"
                >
                  <VolumeX className="w-3 h-3" /> Mute Mic
                </button>
              )}
              {roleLabel !== "CO_HOST" && onPromoteCoHost && (
                <button
                  onClick={() => {
                    onPromoteCoHost();
                    setMenuOpen(false);
                  }}
                  className="w-full text-left px-2.5 py-1 text-xs text-emerald-300 hover:bg-emerald-500/20 rounded-lg flex items-center gap-1.5"
                >
                  <Crown className="w-3 h-3" /> Make Co-Host
                </button>
              )}
              {onDemote && (
                <button
                  onClick={() => {
                    onDemote();
                    setMenuOpen(false);
                  }}
                  className="w-full text-left px-2.5 py-1 text-xs text-rose-300 hover:bg-rose-500/20 rounded-lg flex items-center gap-1.5"
                >
                  <UserX className="w-3 h-3" /> Remove from Stage
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Speaker Video Tile Component ──────────────────────────────────────────────
function SpeakerVideoTile({
  name,
  roleLabel,
  isSpeaking,
  micOn,
  handUp,
  reaction,
  trackRef,
  canManage,
  onDemote,
  onRemoteMute,
}: {
  name: string;
  roleLabel: "HOST" | "CO_HOST" | "GUEST SPEAKER";
  isSpeaking: boolean;
  micOn: boolean;
  handUp: boolean;
  reaction?: FloatingReaction;
  trackRef: TrackReference;
  canManage: boolean;
  onDemote?: () => void;
  onRemoteMute?: () => void;
}) {
  return (
    <div className="sr-video-tile relative aspect-video rounded-3xl overflow-hidden bg-black group">
      <VideoTrack trackRef={trackRef} className="w-full h-full object-cover" />

      {reaction && <span key={reaction.id} className="sr-avatar-reaction sr-video-reaction" role="img" aria-label={`${name} reacted ${reaction.emoji}`}>{reaction.emoji}</span>}

      {/* Speaking border pulse */}
      {isSpeaking && micOn && (
        <div className="absolute inset-0 ring-4 ring-lime-400 ring-inset pointer-events-none rounded-3xl animate-pulse" />
      )}

      {/* Hand Up Alert */}
      {handUp && (
        <div className="absolute top-3 left-3 w-8 h-8 bg-amber-500 rounded-full flex items-center justify-center text-sm shadow-xl animate-bounce">
          ✋
        </div>
      )}

      {/* Bottom info overlay */}
      <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-[#0e1112]/95 via-[#0e1112]/60 to-transparent px-4 py-3 flex items-center justify-between z-20">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-white text-xs sm:text-sm font-bold truncate drop-shadow">
            {name}
          </span>
          <span
            className={`text-[9px] font-black px-2 py-0.5 rounded tracking-wider ${
              roleLabel === "HOST"
                ? "bg-lime-400 text-[#04111f]"
                : roleLabel === "CO_HOST"
                  ? "bg-emerald-500 text-[#04111f]"
                  : "bg-teal-500/40 text-teal-200"
            }`}
          >
            {roleLabel}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <div
            className={`w-6 h-6 rounded-full flex items-center justify-center border border-white/20 ${
              micOn
                ? "bg-emerald-500 text-[#04111f]"
                : "bg-[#071729] text-rose-400"
            }`}
          >
            {micOn ? (
              <Mic01Icon className="w-3 h-3" />
            ) : (
              <MicOff02Icon className="w-3 h-3" />
            )}
          </div>
          <div className="w-6 h-6 rounded-full bg-emerald-500 text-[#04111f] flex items-center justify-center border border-white/20">
            <Video className="w-3 h-3" />
          </div>
        </div>
      </div>

      {/* Quick host controls overlay */}
      {canManage && roleLabel !== "HOST" && (
        <div className="sr-video-manage absolute top-3 right-3 z-30 flex items-center gap-1.5">
          {onRemoteMute && micOn && (
            <button
              onClick={onRemoteMute}
              title="Mute microphone"
              className="px-2.5 py-1 rounded-lg bg-black/80 hover:bg-black text-amber-300 text-xs font-bold border border-amber-500/30 flex items-center gap-1"
            >
              <VolumeX className="w-3 h-3" /> Mute
            </button>
          )}
          {onDemote && (
            <button
              onClick={onDemote}
              title="Move to Attendees"
              className="px-2.5 py-1 rounded-lg bg-rose-600/90 hover:bg-rose-600 text-white text-xs font-bold flex items-center gap-1 shadow-lg"
            >
              <UserX className="w-3 h-3" /> Demote
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ── In-Room Report Modal ──────────────────────────────────────────────────────
function ReportModal({
  spaceId,
  onClose,
  targetName,
  targetUserId,
}: {
  spaceId: string;
  onClose: () => void;
  targetName?: string;
  targetUserId?: string;
}) {
  const [reason, setReason] = useState("Inappropriate language or behavior");
  const [details, setDetails] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      await fetch(`/api/spaces/${spaceId}/report`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason, details, reportedUserId: targetUserId }),
      });
      setSent(true);
      setTimeout(onClose, 2000);
    } catch {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="relative w-full max-w-md bg-[#071729] border border-rose-500/40 rounded-3xl p-6 shadow-2xl">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/60 hover:text-white"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-2xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400">
            <Flag className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-white font-black text-base">
              Report {targetName ? targetName : "Pro Talk"}
            </h3>
            <p className="text-slate-400 text-xs">
              Reports are reviewed directly by TCP moderation
            </p>
          </div>
        </div>

        {sent ? (
          <div className="py-6 text-center text-emerald-300 font-bold text-sm">
            ✓ Report submitted. Thank you for keeping our community safe.
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="block text-slate-300 text-xs font-semibold mb-1.5 uppercase tracking-wide">
                Reason for reporting
              </label>
              <select
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full bg-[#0e1112] border border-white/15 rounded-xl px-3.5 py-2.5 text-white text-xs outline-none focus:border-rose-400 transition-all [color-scheme:dark]"
              >
                <option value="Inappropriate language or behavior">
                  Inappropriate language or behavior
                </option>
                <option value="Harassment or bullying">
                  Harassment or bullying
                </option>
                <option value="Spam or disruptive sales pitch">
                  Spam or disruptive sales pitch
                </option>
                <option value="Misleading or fraudulent tax advice">
                  Misleading or fraudulent tax advice
                </option>
                <option value="Other policy violation">
                  Other policy violation
                </option>
              </select>
            </div>

            <div>
              <label className="block text-slate-300 text-xs font-semibold mb-1.5 uppercase tracking-wide">
                Additional details (optional)
              </label>
              <textarea
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                placeholder="Explain what occurred..."
                rows={3}
                className="w-full bg-[#0e1112] border border-white/15 rounded-xl px-3.5 py-2.5 text-white placeholder-slate-500 text-xs outline-none focus:border-rose-400 transition-all resize-none"
              />
            </div>

            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="w-full py-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs transition-all shadow-lg shadow-rose-600/20 disabled:opacity-50"
            >
              {submitting ? "Submitting…" : "Send Report"}
            </button>
          </div>
        )}
      </div>

    </div>
  );
}

// ── Post-Session Host Summary Modal ───────────────────────────────────────────
function SessionEndModal({
  spaceId,
  summary,
  onClose,
}: {
  spaceId: string;
  summary: {
    totalAttendees: number;
    peakAttendees: number;
    durationMinutes: number;
  };
  onClose: () => void;
}) {
  const [downloading, setDownloading] = useState(false);

  const [exportError, setExportError] = useState("");
  const handleExport = async () => {
    setDownloading(true); setExportError("");
    try { await downloadAttendance(`/api/spaces/${spaceId}/export-attendees?format=csv`); }
    catch (error) { setExportError(error instanceof Error ? error.message : "Export failed. Please retry."); }
    finally { setDownloading(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
      <div className="relative w-full max-w-md bg-gradient-to-br from-[#071729] via-[#091b35] to-[#0e1112] border border-emerald-500/40 rounded-3xl p-7 shadow-2xl text-center">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-lime-400 to-emerald-600 flex items-center justify-center mx-auto mb-4 text-[#04111f] shadow-xl shadow-emerald-500/30">
          <Award className="w-8 h-8" />
        </div>
        <h2 className="text-white font-black text-xl mb-1">
          Pro Talk Concluded
        </h2>
        <p className="text-emerald-300/80 text-xs mb-6">
          Here is how your stage performed
        </p>
        {exportError && <p role="alert" className="text-red-300 mb-4">{exportError}</p>}

        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="bg-white/5 border border-white/10 rounded-2xl p-3">
            <div className="text-2xl font-black text-white">
              {summary.totalAttendees}
            </div>
            <div className="text-[10px] text-slate-400 uppercase font-semibold mt-0.5">
              Total Attendees
            </div>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-2xl p-3">
            <div className="text-2xl font-black text-lime-400">
              {summary.peakAttendees}
            </div>
            <div className="text-[10px] text-slate-400 uppercase font-semibold mt-0.5">
              Peak Listeners
            </div>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-2xl p-3">
            <div className="text-2xl font-black text-emerald-400">
              {summary.durationMinutes}m
            </div>
            <div className="text-[10px] text-slate-400 uppercase font-semibold mt-0.5">
              Duration
            </div>
          </div>
        </div>

        <div className="space-y-2.5">
          <button
            onClick={handleExport}
            disabled={downloading}
            className="w-full py-3.5 rounded-xl bg-gradient-to-r from-lime-400 via-emerald-400 to-teal-400 hover:from-lime-300 hover:to-emerald-300 text-[#04111f] font-black text-sm hover:scale-[1.02] transition-all shadow-lg shadow-emerald-500/25 flex items-center justify-center gap-2"
          >
            <FileSpreadsheet className="w-4 h-4" />
            {downloading ? "Exporting CSV…" : "Export Member Data (CSV)"}
          </button>

          <button
            onClick={onClose}
            className="w-full py-3 rounded-xl bg-white/10 hover:bg-white/15 text-slate-200 font-bold text-xs transition-all"
          >
            View Full Attendance Report
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Live Room Inner ──────────────────────────────────────────────────────
function RoomInner({ space, isAdmin, userId, onEnd, ending }: Props) {
  const router = useRouter();
  const room = useRoomContext();
  const participants = useParticipants();
  const {
    isMicrophoneEnabled,
    isScreenShareEnabled,
    isCameraEnabled,
    localParticipant,
  } = useLocalParticipant();

  const [, setPermissionRevision] = useState(0);
  useEffect(() => {
    const refresh = () => setPermissionRevision((value) => value + 1);
    room.on(RoomEvent.ParticipantPermissionsChanged, refresh);
    room.on(RoomEvent.ParticipantMetadataChanged, refresh);
    localParticipant.on(
      ParticipantEvent.ParticipantPermissionsChanged,
      refresh,
    );
    localParticipant.on(ParticipantEvent.ParticipantMetadataChanged, refresh);
    return () => {
      room.off(RoomEvent.ParticipantPermissionsChanged, refresh);
      room.off(RoomEvent.ParticipantMetadataChanged, refresh);
      localParticipant.off(
        ParticipantEvent.ParticipantPermissionsChanged,
        refresh,
      );
      localParticipant.off(
        ParticipantEvent.ParticipantMetadataChanged,
        refresh,
      );
    };
  }, [room, localParticipant]);

  // Navigation / Drawer state
  const [rightPanelTab, setRightPanelTab] = useState<
    "discussion" | "polls" | "attendees" | null
  >(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const panelRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!rightPanelTab) return;
    const previousFocus = document.activeElement as HTMLElement | null;
    const panel = panelRef.current;
    const mobile = window.matchMedia("(max-width: 950px)").matches;
    if (mobile) panel?.querySelector<HTMLButtonElement>("button")?.focus();
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setRightPanelTab(null);
      if (event.key !== "Tab" || !mobile || !panel) return;
      const controls = Array.from(
        panel.querySelectorAll<HTMLElement>(
          "button:not(:disabled), input:not(:disabled), textarea, select, a[href]",
        ),
      ).filter((element) => element.getClientRects().length > 0);
      const first = controls[0],
        last = controls.at(-1);
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    }
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      if (mobile) previousFocus?.focus();
    };
  }, [rightPanelTab]);

  // Floating Reactions state
  const [floatingReactions, setFloatingReactions] = useState<
    FloatingReaction[]
  >([]);
  const [reactionsEnabled, setReactionsEnabled] = useState(true);
  const lastReactionTimeRef = useRef(0);

  // Live Discussion state
  const [discussion, setDiscussion] = useState<DiscussionMsg[]>([]);
  const [discussionInput, setDiscussionInput] = useState("");
  const [discussionEnabled, setDiscussionEnabled] = useState(true);
  const [pinnedMsg, setPinnedMsg] = useState<DiscussionMsg | null>(null);
  const [mutedFromDiscussion, setMutedFromDiscussion] = useState<Set<string>>(
    new Set(),
  );

  // Live Polls state
  const [activePoll, setActivePoll] = useState<LivePoll | null>(null);
  const [myVotedOptionId, setMyVotedOptionId] = useState<string | null>(null);
  const [showCreatePoll, setShowCreatePoll] = useState(false);
  const [newPollQuestion, setNewPollQuestion] = useState("");
  const [newPollOptions, setNewPollOptions] = useState<string[]>(["", ""]);

  // Raised hands map: identity -> name
  const [raised, setRaised] = useState<Map<string, string>>(new Map());
  const [myHandUp, setMyHandUp] = useState(false);
  const myHandRef = useRef(false);

  // Reporting modal
  const [reportTarget, setReportTarget] = useState<{
    name?: string;
    userId?: string;
  } | null>(null);

  // Session end summary
  const [sessionSummary, setSessionSummary] = useState<{
    totalAttendees: number;
    peakAttendees: number;
    durationMinutes: number;
  } | null>(null);

  // Toasts
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isEndedByHost, setIsEndedByHost] = useState(false);
  const elapsedTalkTime = useElapsedTime(space.createdAt);
  const [inviteToken, setInviteToken] = useState(space.shareToken);
  const [copied, setCopied] = useState(false);
  const [visibility, setVisibility] = useState(space.visibility || "PUBLIC");
  const [visibilityPending, setVisibilityPending] = useState(false);

  // ── Tagged Marketplace Product Spotlight State ──
  const [taggedProduct, setTaggedProduct] = useState<any | null>(null);
  const [showTagProductModal, setShowTagProductModal] = useState(false);
  const taggedProductRef = useRef<any | null>(null);
  taggedProductRef.current = taggedProduct;

  useEffect(() => {
    fetch(`/api/spaces/${space.id}/tagged-product`)
      .then((r) => r.json())
      .then((data) => {
        if (data?.taggedProduct) {
          setTaggedProduct(data.taggedProduct);
        }
      })
      .catch(() => {});
  }, [space.id]);

  const discussionEndRef = useRef<HTMLDivElement>(null);

  const isHost =
    localParticipant?.identity === space.hostId ||
    userId === space.hostId;
  const isCoHost = localParticipant
    ? getParticipantMetadata(localParticipant.metadata).role === "CO_HOST"
    : false;
  const isAuthorizedManager = isHost || isCoHost || isAdmin;
  const isApprovedSpeaker = !!localParticipant.permissions?.canPublish;
  const sharingBusy = useRef(false);
  const [sharingPending, setSharingPending] = useState(false);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  }, []);

  const { audioInterrupted, isResuming, resumeAudio } = useProTalkAudioRecovery({
    room,
    localParticipant,
    isApprovedSpeaker,
    isMicrophoneEnabled,
    onToast: showToast,
  });

  const safePublishData = useCallback(
    (payload: object) => {
      try {
        if (room.state === ConnectionState.Connected && room.localParticipant) {
          void room.localParticipant.publishData(
            enc.encode(JSON.stringify(payload)),
            { reliable: true },
          ).catch(error => console.debug("[ProTalk] DataChannel skipped:", error));
        }
      } catch (err) {
        console.debug("[ProTalk] DataChannel skipped:", err);
      }
    },
    [room],
  );

  // Copy shareable link
  const copyShareLink = useCallback(() => {
    const url = inviteToken
      ? `${window.location.origin}/pro-talks/invite/${inviteToken}`
      : window.location.href;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  }, [inviteToken]);

  // Screen and Camera tracks
  const screenTracks = useTracks([Track.Source.ScreenShare], {
    onlySubscribed: true,
  });
  const cameraTracks = useTracks([Track.Source.Camera], {
    onlySubscribed: false,
  });

  const toggleScreenShare = useCallback(async () => {
    if (!isApprovedSpeaker || sharingBusy.current) return;
    sharingBusy.current = true;
    setSharingPending(true);
    try {
      await toggleProTalkScreenShare(localParticipant);
    } catch (error) {
      if (!(error instanceof DOMException && error.name === "NotAllowedError"))
        showToast("Screen sharing could not start. Please try again.");
    } finally {
      sharingBusy.current = false;
      setSharingPending(false);
    }
  }, [isApprovedSpeaker, localParticipant, showToast]);

  const toggleCamera = useCallback(async () => {
    if (!isApprovedSpeaker) {
      showToast("✋ Only speakers can turn on video. Request to speak first!");
      return;
    }
    try {
      await localParticipant.setCameraEnabled(!isCameraEnabled);
      showToast(!isCameraEnabled ? "Webcam connected 📹" : "Webcam turned off");
    } catch {
      showToast("Please allow camera permission in your browser.");
    }
  }, [isApprovedSpeaker, isCameraEnabled, localParticipant, showToast]);

  // ── Sync Speaker, Co-Host & Room State Broadcast ───────────────────────────
  const broadcastSync = useCallback(() => {
    safePublishData({
      type: "room_sync",
      raisedHands: Array.from(raised.entries()),
      reactionsEnabled,
      discussionEnabled,
      visibility,
      taggedProduct: taggedProductRef.current,
    });
  }, [safePublishData, reactionsEnabled, discussionEnabled, raised, visibility]);

  const updateStage = useCallback(
    async (identity: string, action: "speaker" | "audience" | "cohost") => {
      try {
        const response = await fetch(`/api/spaces/${space.id}/stage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ identity, action }),
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error);
        setRaised((previous) => {
          const next = new Map(previous);
          next.delete(identity);
          return next;
        });
        safePublishData({
          type: "room_sync",
          promoted: action !== "audience" ? identity : undefined,
          demoted: action === "audience" ? identity : undefined,
        });
        showToast(
          action === "audience"
            ? "Moved to audience."
            : "Stage invitation approved. They can now unmute.",
        );
      } catch (error) {
        showToast(
          error instanceof Error ? error.message : "Stage update failed.",
        );
      }
    },
    [space.id, safePublishData, showToast],
  );
  const promoteToSpeaker = useCallback(
    (identity: string) => updateStage(identity, "speaker"),
    [updateStage],
  );
  const demoteSpeaker = useCallback(
    (identity: string) => updateStage(identity, "audience"),
    [updateStage],
  );
  const promoteToCoHost = useCallback(
    (identity: string) => updateStage(identity, "cohost"),
    [updateStage],
  );

  // Remote mute participant
  const remoteMute = useCallback(
    (targetIdentity: string) => {
      if (!isAuthorizedManager) return;
      safePublishData({ type: "remote_mute", targetIdentity });
      showToast("Sent remote mute request.");
    },
    [isAuthorizedManager, safePublishData, showToast],
  );

  // Kick / Remove participant from room
  const kickParticipant = useCallback(
    (targetIdentity: string, ban: boolean = false) => {
      if (!isAuthorizedManager) return;
      safePublishData({ type: "kick_user", targetIdentity, ban });
      showToast(`Participant removed from room.`);
    },
    [isAuthorizedManager, safePublishData, showToast],
  );

  // ── Audience Floating Emoji Reactions ──────────────────────────────────────
  const triggerReaction = useCallback(
    (emoji: AudienceReaction) => {
      if (!reactionsEnabled) {
        showToast("Audience reactions are currently paused by the host.");
        return;
      }
      const now = Date.now();
      if (now - lastReactionTimeRef.current < 350) return; // Anti-spam throttle
      lastReactionTimeRef.current = now;

      const reactionObj = { id: `${now}-${Math.random()}`, emoji, identity: localParticipant.identity };

      setFloatingReactions((p) => [...p.slice(-15), reactionObj]);
      safePublishData({ type: "reaction", emoji });

      // Auto-purge after 2.5s
      setTimeout(() => {
        setFloatingReactions((p) => p.filter((r) => r.id !== reactionObj.id));
      }, 2500);
    },
    [reactionsEnabled, safePublishData, showToast, localParticipant],
  );

  // ── Live Discussion System ──────────────────────────────────────────────────
  const sendDiscussion = useCallback(() => {
    if (!discussionInput.trim() || !localParticipant) return;
    if (!discussionEnabled && !isAuthorizedManager) {
      showToast("Live discussion is currently paused by the host.");
      return;
    }
    if (mutedFromDiscussion.has(localParticipant.identity)) {
      showToast("You are muted from commenting in this session.");
      return;
    }

    const text = discussionInput.trim();
    const myRole = isHost
      ? "HOST"
      : isCoHost
        ? "CO_HOST"
        : isApprovedSpeaker
          ? "SPEAKER"
          : "ATTENDEE";
    const meta = getParticipantMetadata(localParticipant.metadata);

    const msg: DiscussionMsg = {
      id: `${Date.now()}-${Math.random()}`,
      from: localParticipant.name || "Participant",
      fromId: localParticipant.identity,
      image: meta.image,
      role: myRole,
      text,
      timestamp: Date.now(),
    };

    setDiscussion((p) => [...p, msg]);
    safePublishData({ type: "discussion_msg", msg });
    setDiscussionInput("");
  }, [
    discussionInput,
    localParticipant,
    discussionEnabled,
    isAuthorizedManager,
    mutedFromDiscussion,
    isHost,
    isCoHost,
    isApprovedSpeaker,
    safePublishData,
    showToast,
  ]);

  const pinComment = useCallback(
    (msg: DiscussionMsg) => {
      if (!isAuthorizedManager) return;
      setPinnedMsg(msg);
      safePublishData({ type: "pin_comment", msg });
      showToast("Comment pinned to top of discussion 📌");
    },
    [isAuthorizedManager, safePublishData, showToast],
  );

  const deleteComment = useCallback(
    (msgId: string) => {
      if (!isAuthorizedManager) return;
      setDiscussion((p) => p.filter((m) => m.id !== msgId));
      if (pinnedMsg?.id === msgId) setPinnedMsg(null);
      safePublishData({ type: "delete_comment", msgId });
    },
    [isAuthorizedManager, pinnedMsg, safePublishData],
  );

  const muteUserDiscussion = useCallback(
    (targetIdentity: string) => {
      if (!isAuthorizedManager) return;
      setMutedFromDiscussion((p) => new Set(p).add(targetIdentity));
      safePublishData({ type: "mute_user_discussion", targetIdentity });
      showToast("User muted from commenting.");
    },
    [isAuthorizedManager, safePublishData, showToast],
  );

  // ── Live Polls System ───────────────────────────────────────────────────────
  const createPoll = useCallback(() => {
    if (!isAuthorizedManager || !newPollQuestion.trim()) return;
    const validOptions = newPollOptions.filter((o) => o.trim().length > 0);
    if (validOptions.length < 2) {
      showToast("Please provide at least 2 answer choices.");
      return;
    }

    const poll: LivePoll = {
      id: `${Date.now()}`,
      question: newPollQuestion.trim(),
      options: validOptions.map((text, idx) => ({
        id: `opt-${idx}`,
        text: text.trim(),
        votes: 0,
      })),
      totalVotes: 0,
      isActive: true,
      showResultsToAudience: true,
      createdAt: Date.now(),
    };

    setActivePoll(poll);
    setMyVotedOptionId(null);
    setShowCreatePoll(false);
    setNewPollQuestion("");
    setNewPollOptions(["", ""]);
    setRightPanelTab("polls");

    safePublishData({ type: "poll_create", poll });
    showToast("Live poll opened! 📊");
  }, [
    isAuthorizedManager,
    newPollQuestion,
    newPollOptions,
    safePublishData,
    showToast,
  ]);

  const votePoll = useCallback(
    (optionId: string) => {
      if (!activePoll || myVotedOptionId || !activePoll.isActive) return;
      setMyVotedOptionId(optionId);

      setActivePoll((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          totalVotes: prev.totalVotes + 1,
          options: prev.options.map((opt) =>
            opt.id === optionId ? { ...opt, votes: opt.votes + 1 } : opt,
          ),
        };
      });

      safePublishData({
        type: "poll_vote",
        pollId: activePoll.id,
        optionId,
        voterId: localParticipant?.identity,
      });
    },
    [activePoll, myVotedOptionId, localParticipant, safePublishData],
  );

  const closePoll = useCallback(() => {
    if (!isAuthorizedManager || !activePoll) return;
    setActivePoll((prev) => (prev ? { ...prev, isActive: false } : null));
    safePublishData({ type: "poll_close" });
    showToast("Poll ended.");
  }, [isAuthorizedManager, activePoll, safePublishData, showToast]);

  // ── Incoming LiveKit DataChannel Listener ───────────────────────────────────
  useEffect(() => {
    const handler = (data: Uint8Array, sender?: RemoteParticipant) => {
      try {
        const raw = JSON.parse(dec.decode(data)) as Record<string, unknown>;
        const msgType = raw.type as string;
        const senderRole = getParticipantMetadata(sender?.metadata).role;
        const manager =
          sender?.identity === space.hostId ||
          senderRole === "HOST" ||
          senderRole === "CO_HOST" ||
          getParticipantMetadata(sender?.metadata).isAdmin === true;
        if (
          [
            "room_sync",
            "remote_mute",
            "kick_user",
            "pin_comment",
            "delete_comment",
            "mute_user_discussion",
            "poll_create",
            "poll_close",
            "tag_product",
            "untag_product",
          ].includes(msgType) &&
          !manager
        )
          return;

        if (msgType === "reaction") {
          if (!sender || !AUDIENCE_REACTIONS.includes(raw.emoji as AudienceReaction)) return;
          const reactionObj: FloatingReaction = {
            id: `${Date.now()}-${Math.random()}`,
            emoji: raw.emoji as string,
            identity: sender.identity,
          };
          setFloatingReactions((p) => [...p.slice(-15), reactionObj]);
          setTimeout(() => {
            setFloatingReactions((p) =>
              p.filter((r) => r.id !== reactionObj.id),
            );
          }, 2500);
        } else if (msgType === "discussion_msg") {
          setDiscussion((p) => [...p, raw.msg as DiscussionMsg]);
          if (rightPanelTab !== "discussion") setUnreadCount((c) => c + 1);
        } else if (msgType === "pin_comment") {
          setPinnedMsg(raw.msg as DiscussionMsg | null);
        } else if (msgType === "delete_comment") {
          const targetId = raw.msgId as string;
          setDiscussion((p) => p.filter((m) => m.id !== targetId));
          setPinnedMsg((p) => (p?.id === targetId ? null : p));
        } else if (msgType === "mute_user_discussion") {
          const target = raw.targetIdentity as string;
          if (localParticipant?.identity === target) {
            setMutedFromDiscussion((p) => new Set(p).add(target));
            showToast("You have been muted from discussion by a moderator.");
          }
        } else if (msgType === "poll_create") {
          setActivePoll(raw.poll as LivePoll);
          setMyVotedOptionId(null);
          setRightPanelTab("polls");
          showToast(`📊 New Live Poll: "${(raw.poll as LivePoll).question}"`);
        } else if (msgType === "poll_vote") {
          const pollId = raw.pollId as string;
          const optionId = raw.optionId as string;
          setActivePoll((prev) => {
            if (!prev || prev.id !== pollId) return prev;
            return {
              ...prev,
              totalVotes: prev.totalVotes + 1,
              options: prev.options.map((opt) =>
                opt.id === optionId ? { ...opt, votes: opt.votes + 1 } : opt,
              ),
            };
          });
        } else if (msgType === "poll_close") {
          setActivePoll((prev) => (prev ? { ...prev, isActive: false } : null));
        } else if (msgType === "tag_product") {
          setTaggedProduct(raw.product as any);
          showToast(`🔥 Host spotlighted: "${(raw.product as any)?.title || "Featured Product"}"`);
        } else if (msgType === "untag_product") {
          setTaggedProduct(null);
          showToast("Product spotlight removed.");
        } else if (msgType === "remote_mute") {
          if (localParticipant?.identity === raw.targetIdentity) {
            localParticipant.setMicrophoneEnabled(false);
            showToast("Your microphone was muted by the host.");
          }
        } else if (msgType === "kick_user") {
          if (localParticipant?.identity === raw.targetIdentity) {
            alert("You have been removed from this Pro Talk session.");
            router.push("/pro-talks");
          }
        } else if (msgType === "hand") {
          const ident = sender?.identity;
          if (!ident) return;
          if (typeof raw.up !== "boolean") return;
          const upVal = raw.up;
          const nameVal = sender?.name || "Attendee";
          setRaised((prev) => {
            const next = new Map(prev);
            if (upVal) next.set(ident, nameVal);
            else next.delete(ident);
            return next;
          });
        } else if (msgType === "room_sync") {
          if ((sender?.identity === space.hostId || senderRole === "HOST") &&
              (raw.visibility === "PUBLIC" || raw.visibility === "PRIVATE")) setVisibility(raw.visibility);
          if (Array.isArray(raw.raisedHands)) {
            const hands = raw.raisedHands.filter(
              (entry): entry is [string, string] =>
                Array.isArray(entry) &&
                entry.length === 2 &&
                entry.every((value) => typeof value === "string"),
            );
            setRaised(new Map(hands));
          }

          if (typeof raw.reactionsEnabled === "boolean")
            setReactionsEnabled(raw.reactionsEnabled);
          if (typeof raw.discussionEnabled === "boolean")
            setDiscussionEnabled(raw.discussionEnabled);
          if (raw.taggedProduct !== undefined) {
            setTaggedProduct(raw.taggedProduct as any);
          }

          if (raw.promoted)
            setRaised((previous) => {
              const next = new Map(previous);
              next.delete(raw.promoted as string);
              return next;
            });
          if (raw.promoted && localParticipant?.identity === raw.promoted) {
            myHandRef.current = false;
            setMyHandUp(false);
            showToast(
              "🎉 You've been brought onto the Stage as a Guest Speaker! You can now unmute mic and camera.",
            );
          }
          if (raw.demoted && localParticipant?.identity === raw.demoted) {
            void Promise.allSettled([
              localParticipant.setMicrophoneEnabled(false),
              localParticipant.setCameraEnabled(false),
              localParticipant.setScreenShareEnabled(false),
            ]);
            showToast("You have been moved back to Attendees.");
          }
        } else if (msgType === "request_room_sync" && isHost) {
          broadcastSync();
        }
      } catch {}
    };

    room.on(RoomEvent.DataReceived, handler);
    return () => {
      room.off(RoomEvent.DataReceived, handler);
    };
  }, [
    space.hostId,
    room,
    rightPanelTab,
    localParticipant,
    isHost,
    broadcastSync,
    router,
    showToast,
  ]);

  // New arrivals request moderator settings; existing attendees repeat their hand state.
  useEffect(() => {
    safePublishData({ type: "request_room_sync" });
    const onArrival = () => {
      if (myHandRef.current) safePublishData({ type: "hand", up: true });
    };
    const onDeparture = (participant: RemoteParticipant) =>
      setRaised((previous) => {
        const next = new Map(previous);
        next.delete(participant.identity);
        return next;
      });
    room.on(RoomEvent.ParticipantConnected, onArrival);
    room.on(RoomEvent.ParticipantDisconnected, onDeparture);
    return () => {
      room.off(RoomEvent.ParticipantConnected, onArrival);
      room.off(RoomEvent.ParticipantDisconnected, onDeparture);
    };
  }, [room, safePublishData]);

  // Hand raise toggle
  const toggleHand = useCallback(() => {
    if (!localParticipant) return;
    const up = !myHandRef.current;
    myHandRef.current = up;
    setMyHandUp(up);
    safePublishData({
      type: "hand",
      identity: localParticipant.identity,
      name: localParticipant.name ?? "Attendee",
      up,
    });
    setRaised((prev) => {
      const next = new Map(prev);
      if (up) {
        next.set(localParticipant.identity, localParticipant.name || "You");
      } else {
        next.delete(localParticipant.identity);
      }
      return next;
    });
    if (up) {
      showToast(
        "✋ Hand raised! The host has been notified to bring you onto the stage.",
      );
    }
  }, [localParticipant, safePublishData, showToast]);

  // Microphone toggle
  const handleMicToggle = useCallback(async () => {
    if (!isApprovedSpeaker) {
      toggleHand();
      return;
    }
    try {
      await localParticipant.setMicrophoneEnabled(!isMicrophoneEnabled);
    } catch {
      showToast("Microphone access failed. Check your browser permissions.");
    }
  }, [
    isApprovedSpeaker,
    isMicrophoneEnabled,
    localParticipant,
    toggleHand,
    showToast,
  ]);

  useEffect(() => {
    discussionEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [discussion]);

  // Compute speakers vs attendees
  const speakers = participants.filter((p) => !!p.permissions?.canPublish).sort((a, b) => {
    const rank = (p: typeof a) => p.identity === space.hostId ? 0 : getParticipantMetadata(p.metadata).role === "CO_HOST" ? 1 : 2;
    return rank(a) - rank(b);
  });
  const reactionsByParticipant = new Map(floatingReactions.map(reaction => [reaction.identity, reaction]));
  const attendees = participants.filter((p) => !p.permissions?.canPublish);

  // Host End Room with summary modal
  const handleHostEnd = useCallback(async () => {
    if (!isHost && !isAdmin) return;
    try {
      await onEnd();
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Unable to end this room. Please try again.");
    }
  }, [space.id, onEnd, isHost, isAdmin, showToast]);

  return (
    <div
      className={`pro-talk-room sr-room ${rightPanelTab ? "sr-panel-open" : ""}`}
    >
      <RoomAudioRenderer />
      <StartAudio label="Enable stage audio" className="sr-enable-audio" />

      {audioInterrupted && (
        <AudioRecoveryBanner
          onTapToResume={resumeAudio}
          isResuming={isResuming}
        />
      )}

      {isEndedByHost && (
        <ExitScreen
          spaceName={space.name}
          duration={elapsedTalkTime}
          onExit={onEnd}
        />
      )}

      {/* Toast Alert */}
      {toastMessage && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-50 bg-gradient-to-r from-lime-400 via-emerald-500 to-teal-500 text-[#04111f] px-5 py-2 rounded-full shadow-2xl flex items-center gap-2 text-xs font-black animate-fade-in-up">
          <Sparkles className="w-4 h-4 text-[#04111f]" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Report Modal */}
      {reportTarget && (
        <ReportModal
          spaceId={space.id}
          targetName={reportTarget.name}
          targetUserId={reportTarget.userId}
          onClose={() => setReportTarget(null)}
        />
      )}

      {/* Post Session Summary Modal */}
      {sessionSummary && (
        <SessionEndModal
          spaceId={space.id}
          summary={sessionSummary}
          onClose={onEnd}
        />
      )}

      {/* ── Main Stage Area ── */}
      <div className="sr-main">
        {/* Top bar */}
        <div className="sr-topbar">
          <div className="sr-brand-mark">
            <Radio01Icon size={23} />
          </div>

          <div className="sr-room-title">
            <span className="sr-eyebrow">PRO TALKS / LIVE ROOM</span>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-lime-400 animate-pulse" />
              <h1 className="text-white font-bold text-sm truncate">
                {space.name}
              </h1>
              {space.category && (
                <span className="hidden md:inline-block px-2 py-0.5 rounded-full bg-emerald-950/70 border border-emerald-500/30 text-emerald-300 text-[10px] font-bold shrink-0">
                  {space.category}
                </span>
              )}
            </div>
            <p className="text-slate-400 text-xs truncate">
              Hosted by{" "}
              <strong className="text-emerald-400">{space.host.name}</strong>
              {space.host.headline ? ` · ${space.host.headline}` : ""}
            </p>
          </div>

          {isHost && (
            <label className="sr-access">
              Access
              <select
                aria-label="Talk access"
                value={visibility}
                disabled={visibilityPending}
                onChange={async (event) => {
                  const value = event.target.value;
                  setVisibilityPending(true);
                  try {
                    const response = await fetch(`/api/spaces/${space.id}`, {
                      method: "PATCH",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ visibility: value }),
                    });
                    if (!response.ok)
                      throw new Error("Access could not be updated.");
                    const updated = await response.json();
                    setInviteToken(updated.shareToken);
                    setCopied(false);
                    setVisibility(value);
                    safePublishData({ type: "room_sync", visibility: value });
                    showToast(
                      value === "PRIVATE"
                        ? "Invite only. Copy the new invitation link. People already here can stay."
                        : "Your talk is now public.",
                    );
                  } catch {
                    showToast("Access could not be updated. Please try again.");
                  } finally {
                    setVisibilityPending(false);
                  }
                }}
                className="rounded-full bg-[#152638] px-3 py-2 text-white"
              >
                <option value="PUBLIC">Public</option>
                <option value="PRIVATE">Invite only</option>
              </select>
            </label>
          )}
          {/* Right Action Icons */}
          <div className="sr-header-actions">
            <button
              onClick={copyShareLink}
              title="Share invite link"
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                copied
                  ? "bg-emerald-500/20 border border-emerald-400/50 text-lime-300"
                  : "bg-white/8 hover:bg-white/15 text-slate-300 border border-white/10"
              }`}
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-lime-400" /> Copied
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" /> Invite
                </>
              )}
            </button>

            {/* Total Attendees counter */}
            <div className="flex items-center gap-1.5 bg-white/6 rounded-full px-3 py-1.5 border border-white/10 text-xs">
              <Users className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-white font-bold">
                {Math.max(participants.length, 1)}
              </span>
            </div>

            {/* Report Button */}
            <button
              onClick={() => setReportTarget({ name: space.name })}
              title="Report room"
              className="w-8 h-8 rounded-full bg-white/6 hover:bg-rose-500/20 border border-white/10 hover:border-rose-500/30 flex items-center justify-center text-slate-400 hover:text-rose-400 transition-all"
            >
              <Flag className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Host Hand Raise Notification Bar */}
        {isAuthorizedManager && raised.size > 0 && (
          <div className="sr-hand-queue">
            <div className="flex items-center gap-2 text-amber-300 font-bold">
              <Hand className="w-4 h-4 text-amber-400 animate-bounce" />
              <span>
                {raised.size} attendee{raised.size > 1 ? "s" : ""} requested to
                speak on stage
              </span>
            </div>
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
              {Array.from(raised.entries()).map(([reqId, reqName]) => (
                <div
                  key={reqId}
                  className="flex items-center gap-1.5 bg-amber-500/30 px-3 py-1 rounded-xl"
                >
                  <span className="text-white font-semibold truncate max-w-[110px]">
                    {reqName}
                  </span>
                  <button
                    onClick={() => promoteToSpeaker(reqId)}
                    aria-label={`Invite ${reqName} to the stage`}
                    className="bg-emerald-500 hover:bg-emerald-400 text-[#04111f] font-black px-2 py-0.5 rounded text-[10px]"
                  >
                    Invite to stage
                  </button>
                  <button
                    aria-label={`Dismiss request from ${reqName}`}
                    onClick={() =>
                      setRaised((prev) => {
                        const n = new Map(prev);
                        n.delete(reqId);
                        return n;
                      })
                    }
                    className="text-white/60 hover:text-white text-xs px-1"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="sr-scroll-area">
          {/* Screen share area */}
          {screenTracks[0] && <ScreenShareView key={screenTracks[0].publication.trackSid} trackRef={screenTracks[0]} />}

          {/* Stage Content: Video Grid & Speaker Avatars */}
          <div className="sr-workspace">
            {/* 🎤 Stage Speakers */}
            <section className="sr-stage" aria-label="Live stage">
              <div className="sr-section-heading">
                <div className="flex items-center gap-2">
                  <span className="text-slate-400 text-xs font-black uppercase tracking-wider">
                    <span className="sr-live-dot" /> Live stage
                  </span>
                  <span className="bg-emerald-500/20 text-lime-300 px-2.5 py-0.5 rounded-full text-[10px] font-black">
                    {speakers.length}
                  </span>
                </div>
                <span className="sr-stage-caption">
                  A space for good conversation
                </span>
              </div>

              <div
                className={`sr-speaker-grid ${speakers.length === 1 ? "sr-solo-stage" : ""}`}
              >
                {speakers.map((p) => {
                  const pCameraTrack = cameraTracks.find(
                    (t): t is TrackReference =>
                      isTrackReference(t) &&
                      t.participant.identity === p.identity &&
                      !t.publication?.isMuted &&
                      !!t.publication?.track,
                  );
                  const isUserHost = p.identity === space.hostId;
                  const isUserCoHost =
                    getParticipantMetadata(p.metadata).role === "CO_HOST";
                  const roleLabel = isUserHost
                    ? "HOST"
                    : isUserCoHost
                      ? "CO_HOST"
                      : "GUEST SPEAKER";

                  if (pCameraTrack) {
                    return (
                      <SpeakerVideoTile
                        key={p.identity}
                        name={p.name || p.identity}
                        roleLabel={roleLabel}
                        isSpeaking={p.isSpeaking}
                        micOn={p.isMicrophoneEnabled}
                        handUp={raised.has(p.identity)}
                        reaction={reactionsByParticipant.get(p.identity)}
                        trackRef={pCameraTrack}
                        canManage={isAuthorizedManager}
                        onDemote={() => demoteSpeaker(p.identity)}
                        onRemoteMute={() => remoteMute(p.identity)}
                      />
                    );
                  }

                  return (
                    <SpeakerAvatar
                      key={p.identity}
                      name={p.name || p.identity}
                      image={getParticipantMetadata(p.metadata).image}
                      roleLabel={roleLabel}
                      isSpeaking={p.isSpeaking}
                      micOn={p.isMicrophoneEnabled}
                      handUp={raised.has(p.identity)}
                        reaction={reactionsByParticipant.get(p.identity)}
                      canManage={isAuthorizedManager}
                      onDemote={() => demoteSpeaker(p.identity)}
                      onPromoteCoHost={() => promoteToCoHost(p.identity)}
                      onRemoteMute={() => remoteMute(p.identity)}
                    />
                  );
                })}
                {speakers.length === 0 && (
                  <div className="sr-stage-empty">
                    <Mic01Icon size={42} />
                    <h2>The stage is ready.</h2>
                    <p>
                      Your host will be here shortly. Settle in and enjoy the
                      conversation.
                    </p>
                  </div>
                )}
              </div>
              <div className="sr-stage-footer">
                <span>
                  <span className="sr-live-dot" /> Live audio
                  {space.mediaType === "VIDEO" ? " & video" : ""}
                </span>
                <span>
                  {isApprovedSpeaker
                    ? "You’re on stage. Make yourself heard."
                    : "You’re listening. Raise your hand to join the stage."}
                </span>
              </div>
            </section>

            {/* 👥 Attendees */}
            <section
              className="sr-audience"
              aria-label="Audience and room details"
            >
              <div className="sr-section-heading">
                <span className="text-slate-400 text-xs font-black uppercase tracking-wider">
                  Audience · {attendees.length}
                </span>
              </div>

              <p className="sr-audience-intro">
                Good conversations start with listening.
              </p>
              {attendees.length > 0 ? (
                <div className="sr-audience-grid">
                  {attendees.map((p) => (
                    <div
                      key={p.identity}
                      className="flex flex-col items-center gap-1.5 group relative"
                    >
                      <div className="w-11 h-11 rounded-full bg-[#0a1f36] border border-white/15 flex items-center justify-center overflow-hidden">
                        {getParticipantMetadata(p.metadata).image ? (
                          <img
                            src={getParticipantMetadata(p.metadata).image!}
                            alt={p.name || "Attendee"}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span className="text-white text-xs font-bold">
                            {(p.name || "A")[0]}
                          </span>
                        )}
                      </div>
                      <span className="text-slate-300 text-[11px] truncate max-w-[70px]">
                        {p.name || "Attendee"}
                      </span>

                      {reactionsByParticipant.has(p.identity) && (
                        <span key={reactionsByParticipant.get(p.identity)!.id} className="sr-avatar-reaction sr-audience-reaction" role="img" aria-label={`${p.name || "Attendee"} reacted ${reactionsByParticipant.get(p.identity)!.emoji}`}>{reactionsByParticipant.get(p.identity)!.emoji}</span>
                      )}
                      {raised.has(p.identity) && (
                        <span
                          role="img"
                          aria-label={`${p.name || "Attendee"} raised their hand`}
                          className="sr-audience-hand"
                        >
                          ✋
                        </span>
                      )}
                      {/* Host action overlay to invite attendee to stage or kick */}
                      {isAuthorizedManager && (
                        <div className="opacity-100 md:opacity-0 md:group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity absolute -bottom-5 -right-2 z-20 flex gap-1">
                          <button
                            onClick={() => promoteToSpeaker(p.identity)}
                            title="Invite to Stage"
                            className="px-2 py-0.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-[9px] font-black shadow-md"
                          >
                            + Stage
                          </button>
                          <button
                            onClick={() => kickParticipant(p.identity, false)}
                            title="Remove from room"
                            className="px-1.5 py-0.5 rounded bg-rose-600/80 hover:bg-rose-600 text-white text-[9px] font-bold"
                          >
                            ✕
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="sr-audience-empty">
                  <Users size={27} />
                  <h3>Room for more.</h3>
                  <p>
                    Invite someone to pull up a chair and join the conversation.
                  </p>
                  <button onClick={copyShareLink}>
                    <Copy size={14} />
                    {copied ? "Link copied" : "Copy invite link"}
                  </button>
                </div>
              )}
              <div className="sr-room-note">
                <span className="sr-eyebrow">ABOUT THIS CONVERSATION</span>
                <h3>{space.category || "Open discussion"}</h3>
                {space.description && (
                  <p className="sr-description">{space.description}</p>
                )}
                <div>
                  <MicOff02Icon size={17} />
                  <p>
                    Everyone joins muted. The host invites speakers onto the
                    stage.
                  </p>
                </div>
                <div>
                  <Hand size={17} />
                  <p>
                    Have something to add? Raise your hand and we’ll see you.
                  </p>
                </div>
                <span className="sr-access-note">
                  {visibility === "PRIVATE"
                    ? "Invite only · A conversation for your circle"
                    : "Public room · Everyone is welcome"}
                </span>
              </div>
            </section>
          </div>
        </div>

        {/* ── Audience Emoji Floating Bar ── */}
        <div className="sr-reactions">
          <span className="text-slate-500 text-[11px] font-bold uppercase mr-1 hidden sm:inline">
            Send a little appreciation
          </span>
          <button type="button" onClick={toggleHand} aria-pressed={myHandUp}
            aria-label={myHandUp ? "Lower hand" : "Raise hand"}
            title={myHandUp ? "Lower hand" : "Raise hand to request the stage"}
            className={`sr-raise-hand w-9 h-9 rounded-full flex items-center justify-center text-lg ${myHandUp ? "bg-amber-400/25 ring-2 ring-amber-300" : "bg-white/6 hover:bg-white/15"}`}>✋</button>
          {AUDIENCE_REACTIONS.map((emoji) => (
            <button
              key={emoji}
              onClick={() => triggerReaction(emoji)}
              aria-label={`React with ${emoji}`}
              className="w-9 h-9 rounded-full bg-white/6 hover:bg-white/15 active:scale-125 hover:scale-110 flex items-center justify-center text-lg transition-transform"
            >
              {emoji}
            </button>
          ))}
        </div>

        {/* ── Control Bar ── */}
        <div className="sr-controls">
          <div className="flex items-center justify-center gap-2.5 flex-wrap">
            {/* Mic / Request to Speak */}
            {isApprovedSpeaker ? (
              <button
                onClick={handleMicToggle}
                aria-pressed={isMicrophoneEnabled}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl text-xs font-black transition-all ${
                  isMicrophoneEnabled
                    ? "bg-gradient-to-r from-lime-400 via-emerald-500 to-teal-500 text-[#04111f] shadow-lg shadow-emerald-500/30"
                    : "bg-white/10 hover:bg-white/15 text-white"
                }`}
              >
                {isMicrophoneEnabled ? (
                  <>
                    <Mic01Icon className="w-4 h-4" /> Mute
                  </>
                ) : (
                  <>
                    <MicOff02Icon className="w-4 h-4" /> Unmute
                  </>
                )}
              </button>
            ) : (
              <button
                onClick={toggleHand}
                aria-pressed={myHandUp}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl text-xs font-black transition-all ${
                  myHandUp
                    ? "bg-amber-500 text-white shadow-lg shadow-amber-500/30 animate-pulse"
                    : "bg-white/10 hover:bg-white/15 text-white"
                }`}
              >
                <Hand className="w-4 h-4" />{" "}
                {myHandUp ? "Lower Hand" : "Request to Speak"}
              </button>
            )}

            {/* Video Camera toggle (speakers only) */}
            {isApprovedSpeaker && (
              <button
                onClick={toggleCamera}
                aria-pressed={isCameraEnabled}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all ${
                  isCameraEnabled
                    ? "bg-emerald-500 text-[#04111f]"
                    : "bg-white/10 hover:bg-white/15 text-white"
                }`}
              >
                {isCameraEnabled ? (
                  <>
                    <Video className="w-4 h-4" /> Video On
                  </>
                ) : (
                  <>
                    <VideoOff className="w-4 h-4" /> Video Off
                  </>
                )}
              </button>
            )}

            {/* Screen Share toggle (speakers only) */}
            {isApprovedSpeaker && (
              <button
                disabled={sharingPending}
                onClick={toggleScreenShare}
                aria-pressed={isScreenShareEnabled}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all ${
                  isScreenShareEnabled
                    ? "bg-blue-500 text-white"
                    : "bg-white/10 hover:bg-white/15 text-white"
                }`}
              >
                {isScreenShareEnabled ? (
                  <>
                    <MonitorOff className="w-4 h-4" /> Stop Share
                  </>
                ) : (
                  <>
                    <Monitor className="w-4 h-4" /> Share Screen
                  </>
                )}
              </button>
            )}

            {/* Live Discussion Button */}
            <button
              onClick={() =>
                setRightPanelTab((t) =>
                  t === "discussion" ? null : "discussion",
                )
              }
              aria-expanded={rightPanelTab === "discussion"}
              className={`relative flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all ${
                rightPanelTab === "discussion"
                  ? "bg-emerald-500/25 border border-emerald-400 text-lime-300"
                  : "bg-white/10 hover:bg-white/15 text-white"
              }`}
            >
              <Message01Icon className="w-4 h-4" /> Discussion
              {unreadCount > 0 && (
                <span className="w-4 h-4 rounded-full bg-lime-400 text-[#04111f] text-[10px] font-black flex items-center justify-center">
                  {unreadCount}
                </span>
              )}
            </button>

            {/* Live Polls Button */}
            <button
              onClick={() =>
                setRightPanelTab((t) => (t === "polls" ? null : "polls"))
              }
              aria-expanded={rightPanelTab === "polls"}
              className={`relative flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all ${
                rightPanelTab === "polls"
                  ? "bg-blue-500/25 border border-blue-400 text-blue-300"
                  : "bg-white/10 hover:bg-white/15 text-white"
              }`}
            >
              <BarChart3 className="w-4 h-4" /> Polls
              {activePoll && activePoll.isActive && (
                <span className="w-2 h-2 rounded-full bg-lime-400 animate-pulse" />
              )}
            </button>

            {/* Tag / Spotlight Product Button (Host & Co-hosts) */}
            {isAuthorizedManager && (
              <button
                onClick={() => setShowTagProductModal(true)}
                aria-label="Tag Product Live"
                className={`relative flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all ${
                  taggedProduct
                    ? "bg-amber-500/25 border border-amber-400 text-amber-300 shadow-lg shadow-amber-500/20"
                    : "bg-white/10 hover:bg-white/15 text-white"
                }`}
              >
                <ShoppingBag01Icon className="w-4 h-4 text-amber-400" />
                <span>{taggedProduct ? "Product Active" : "Tag Product"}</span>
                {taggedProduct && (
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                )}
              </button>
            )}

            {/* Leave Room Button */}
            <button
              onClick={() => {
                fetch(`/api/spaces/${space.id}/attendance`, { method: "PATCH" }).catch(() => {});
                router.push("/pro-talks");
              }}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-white/8 hover:bg-rose-500/20 text-slate-300 hover:text-rose-300 text-xs font-semibold transition-all"
            >
              <PhoneOff01Icon className="w-4 h-4" /> Leave
            </button>

            {/* Host: End Room Button */}
            {(isAdmin || isHost) && (
              <button
                onClick={handleHostEnd}
                data-danger="true"
                disabled={ending}
                className="flex items-center gap-1.5 px-5 py-2.5 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-black transition-all shadow-lg shadow-rose-600/25 disabled:opacity-40"
              >
                {ending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <PhoneOff01Icon className="w-4 h-4" />
                )}{" "}
                End Room
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Collapsible Right Drawer (Live Discussion & Polls) ── */}
      {rightPanelTab && (
        <button
          className="sr-panel-backdrop"
          aria-label="Close discussion and polls"
          onClick={() => setRightPanelTab(null)}
        />
      )}
      <div
        ref={panelRef}
        role="region"
        className={`sr-panel ${rightPanelTab ? "is-open" : ""}`}
        inert={!rightPanelTab}
        aria-label="Discussion and polls"
      >
        {/* Drawer Header Tabs */}
        <div className="flex items-center justify-between px-4 py-3.5 border-b border-emerald-950/60 bg-[#0e1112]">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setRightPanelTab("discussion")}
              aria-pressed={rightPanelTab === "discussion"}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                rightPanelTab === "discussion"
                  ? "bg-emerald-500/20 border border-emerald-500/40 text-lime-300"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Live Discussion
            </button>
            <button
              onClick={() => setRightPanelTab("polls")}
              aria-pressed={rightPanelTab === "polls"}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                rightPanelTab === "polls"
                  ? "bg-blue-500/20 border border-blue-500/40 text-blue-300"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Polls {activePoll && activePoll.isActive && "🔴"}
            </button>
          </div>

          <button
            onClick={() => setRightPanelTab(null)}
            aria-label="Close side panel"
            className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/60 hover:text-white"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* ── TAB 1: LIVE DISCUSSION ── */}
        {rightPanelTab === "discussion" && (
          <div className="flex-1 flex flex-col min-h-0">
            {/* Host Moderation Controls Banner */}
            {isAuthorizedManager && (
              <div className="bg-[#071729] border-b border-emerald-950/60 px-4 py-2 flex items-center justify-between text-[11px]">
                <span className="text-slate-400 font-semibold">
                  Discussion Controls
                </span>
                <button
                  onClick={() => {
                    const next = !discussionEnabled;
                    setDiscussionEnabled(next);
                    safePublishData({
                      type: "room_sync",
                      discussionEnabled: next,
                    });
                    showToast(
                      next
                        ? "Discussion unpaused"
                        : "Discussion paused for attendees",
                    );
                  }}
                  className={`px-2.5 py-0.5 rounded text-[10px] font-bold ${
                    discussionEnabled
                      ? "bg-amber-500/20 text-amber-300 hover:bg-amber-500/30"
                      : "bg-emerald-500/20 text-lime-300 hover:bg-emerald-500/30"
                  }`}
                >
                  {discussionEnabled ? "Pause Comments" : "Resume Comments"}
                </button>
              </div>
            )}

            {/* Pinned Message */}
            {pinnedMsg && (
              <div className="bg-amber-500/10 border-b border-amber-500/30 px-4 py-2.5 flex items-start gap-2 text-xs">
                <Pin className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-amber-200 text-[11px] truncate">
                      {pinnedMsg.from}
                    </span>
                    <span className="text-[9px] bg-amber-400 text-[#04111f] font-black px-1.5 py-0.2 rounded">
                      PINNED
                    </span>
                  </div>
                  <p className="text-slate-200 text-xs mt-0.5 leading-snug">
                    {pinnedMsg.text}
                  </p>
                </div>
                {isAuthorizedManager && (
                  <button
                    onClick={() => {
                      setPinnedMsg(null);
                      safePublishData({ type: "pin_comment", msg: null });
                    }}
                    className="text-white/40 hover:text-white text-xs"
                  >
                    ✕
                  </button>
                )}
              </div>
            )}

            {/* Messages List */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3.5">
              {discussion.length === 0 && (
                <div className="sr-discussion-empty flex flex-col items-center justify-center h-full py-16 gap-2 text-center">
                  <Message01Icon className="w-8 h-8 text-slate-600" />
                  <p className="text-slate-400 text-xs font-semibold">
                    Keep the conversation going.
                  </p>
                  <p className="text-slate-500 text-[11px]">
                    Share thoughts, questions, and insights.
                  </p>
                </div>
              )}

              {discussion.map((m) => {
                const isMe = m.fromId === localParticipant?.identity;
                return (
                  <div
                    key={m.id}
                    className={`group flex items-start gap-2.5 ${isMe ? "bg-emerald-500/5 -mx-2 px-2 py-1 rounded-xl" : ""}`}
                  >
                    <div className="w-7 h-7 rounded-full overflow-hidden shrink-0 border border-white/15 bg-gradient-to-br from-emerald-600 to-teal-800 flex items-center justify-center text-white text-[11px] font-bold">
                      {m.image ? (
                        <img
                          src={m.image}
                          alt={m.from}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        m.from[0]?.toUpperCase()
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1 mb-0.5">
                        <div className="flex items-center gap-1.5 truncate">
                          <span className="text-white text-xs font-bold truncate">
                            {m.from}{" "}
                            {isMe && (
                              <span className="text-lime-400 text-[10px] font-normal">
                                (You)
                              </span>
                            )}
                          </span>
                          {m.role === "HOST" && (
                            <span className="bg-lime-400 text-[#04111f] text-[8px] font-black px-1.5 py-0.2 rounded">
                              HOST
                            </span>
                          )}
                          {m.role === "CO_HOST" && (
                            <span className="bg-emerald-500 text-[#04111f] text-[8px] font-black px-1.5 py-0.2 rounded">
                              CO-HOST
                            </span>
                          )}
                        </div>

                        {/* Host moderation action menu for comments */}
                        {isAuthorizedManager && (
                          <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                            <button
                              onClick={() => pinComment(m)}
                              title="Pin comment"
                              className="text-slate-400 hover:text-amber-400"
                            >
                              <Pin className="w-3 h-3" />
                            </button>
                            <button
                              onClick={() => deleteComment(m.id)}
                              title="Delete comment"
                              className="text-slate-400 hover:text-rose-400"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                            <button
                              onClick={() => muteUserDiscussion(m.fromId)}
                              title="Mute user from commenting"
                              className="text-slate-400 hover:text-amber-400"
                            >
                              <UserX className="w-3 h-3" />
                            </button>
                          </div>
                        )}
                      </div>

                      <div className="bg-[#061224] border border-white/10 rounded-2xl px-3 py-2 text-xs text-slate-200 leading-relaxed break-words">
                        {m.text}
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={discussionEndRef} />
            </div>

            {/* Input Bar */}
            <div className="p-3.5 border-t border-emerald-950/60 bg-[#0e1112]">
              {!discussionEnabled && !isAuthorizedManager ? (
                <p className="text-center text-slate-500 text-xs py-2 italic">
                  Live discussion has been paused by the host.
                </p>
              ) : (
                <div className="flex items-center gap-2 bg-[#071729] border border-white/15 focus-within:border-emerald-400 rounded-2xl px-3 py-2 transition-all">
                  <input
                    aria-label="Your message"
                    value={discussionInput}
                    onChange={(e) => setDiscussionInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && sendDiscussion()}
                    placeholder="Post to Live Discussion…"
                    className="flex-1 bg-transparent text-white placeholder-slate-500 text-xs outline-none"
                  />
                  <button
                    aria-label="Send message"
                    onClick={sendDiscussion}
                    disabled={!discussionInput.trim()}
                    className="w-7 h-7 rounded-full bg-gradient-to-r from-lime-400 to-emerald-500 text-[#04111f] flex items-center justify-center disabled:opacity-30 hover:scale-105 transition-all shrink-0"
                  >
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── TAB 2: LIVE POLLS ── */}
        {rightPanelTab === "polls" && (
          <div className="flex-1 flex flex-col p-4 overflow-y-auto space-y-4">
            {isHost && !showCreatePoll && (
              <button
                onClick={() => setShowCreatePoll(true)}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-400 hover:to-indigo-500 text-white font-bold text-xs transition-all shadow-md"
              >
                + Create Live Poll
              </button>
            )}

            {/* Create Poll Drawer */}
            {showCreatePoll && (
              <div className="bg-[#061224] border border-blue-500/30 rounded-2xl p-4 space-y-3 shadow-xl">
                <div className="flex items-center justify-between">
                  <h4 className="text-white font-bold text-xs">
                    New Live Poll
                  </h4>
                  <button
                    onClick={() => setShowCreatePoll(false)}
                    className="text-slate-400 hover:text-white"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                <input
                  value={newPollQuestion}
                  onChange={(e) => setNewPollQuestion(e.target.value)}
                  placeholder="Enter your question…"
                  className="w-full bg-[#0e1112] border border-white/15 rounded-xl px-3 py-2 text-white text-xs outline-none focus:border-blue-400"
                />

                <div className="space-y-2">
                  {newPollOptions.map((opt, i) => (
                    <input
                      key={i}
                      value={opt}
                      onChange={(e) => {
                        const copy = [...newPollOptions];
                        copy[i] = e.target.value;
                        setNewPollOptions(copy);
                      }}
                      placeholder={`Choice ${i + 1}`}
                      className="w-full bg-[#0e1112] border border-white/10 rounded-xl px-3 py-1.5 text-white text-xs outline-none focus:border-blue-400"
                    />
                  ))}
                  {newPollOptions.length < 4 && (
                    <button
                      onClick={() => setNewPollOptions((p) => [...p, ""])}
                      className="text-blue-400 hover:text-blue-300 text-[11px] font-semibold"
                    >
                      + Add another choice
                    </button>
                  )}
                </div>

                <button
                  onClick={createPoll}
                  disabled={!newPollQuestion.trim()}
                  className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all disabled:opacity-40"
                >
                  Launch Poll to Attendees
                </button>
              </div>
            )}

            {/* Active Poll Card */}
            {activePoll ? (
              <div className="bg-[#071729] border border-emerald-500/30 rounded-2xl p-4 shadow-xl space-y-3">
                <div className="flex items-center justify-between">
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-lime-300 text-[10px] font-black uppercase">
                    {activePoll.isActive ? "🔴 Live Poll" : "Closed Poll"}
                  </span>
                  <span className="text-slate-400 text-xs">
                    {activePoll.totalVotes} votes
                  </span>
                </div>

                <h4 className="text-white font-bold text-sm leading-snug">
                  {activePoll.question}
                </h4>

                <div className="space-y-2">
                  {activePoll.options.map((opt) => {
                    const pct =
                      activePoll.totalVotes > 0
                        ? Math.round((opt.votes / activePoll.totalVotes) * 100)
                        : 0;
                    const isMyVote = myVotedOptionId === opt.id;

                    return (
                      <button
                        key={opt.id}
                        disabled={!activePoll.isActive || !!myVotedOptionId}
                        onClick={() => votePoll(opt.id)}
                        className={`w-full relative overflow-hidden text-left p-3 rounded-xl border transition-all ${
                          isMyVote
                            ? "border-lime-400 bg-emerald-500/20"
                            : "border-white/10 bg-white/5 hover:border-emerald-500/40"
                        }`}
                      >
                        {/* Progress fill */}
                        <div
                          className="absolute inset-y-0 left-0 bg-gradient-to-r from-emerald-500/20 to-lime-400/20 transition-all duration-500 pointer-events-none"
                          style={{ width: `${pct}%` }}
                        />

                        <div className="relative flex items-center justify-between z-10 text-xs">
                          <span className="font-semibold text-white truncate mr-2">
                            {opt.text}
                          </span>
                          <span className="font-black text-slate-300">
                            {pct}% ({opt.votes})
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {isHost && activePoll.isActive && (
                  <button
                    onClick={closePoll}
                    className="w-full py-2 rounded-xl bg-white/10 hover:bg-white/15 text-slate-300 text-xs font-bold transition-all"
                  >
                    End Poll
                  </button>
                )}
              </div>
            ) : (
              !showCreatePoll && (
                <div className="text-center py-12 text-slate-500 text-xs">
                  No active polls in this session yet.
                </div>
              )
            )}
          </div>
        )}
      </div>

      {/* ── Live Product Spotlight Card (Visible to all attendees & host) ── */}
      <ProTalkProductSpotlight
        spaceId={space.id}
        taggedProduct={taggedProduct}
        isHost={isAuthorizedManager}
        currentUser={{ id: userId }}
        onOpenTagModal={() => setShowTagProductModal(true)}
        onUntag={() => {
          setTaggedProduct(null);
          safePublishData({ type: "untag_product" });
          fetch(`/api/spaces/${space.id}/tagged-product`, { method: "DELETE" }).catch(() => {});
        }}
      />

      {/* ── Host Tag & Spotlight Product Modal ── */}
      {showTagProductModal && (
        <ProTalkTagProductModal
          spaceId={space.id}
          isOpen={showTagProductModal}
          onClose={() => setShowTagProductModal(false)}
          currentTaggedProduct={taggedProduct}
          onProductTagged={(product) => {
            setTaggedProduct(product);
            safePublishData({ type: "tag_product", product });
            showToast(`✨ Spotlighted "${product.title}" live to all attendees!`);
          }}
          onProductUntagged={() => {
            setTaggedProduct(null);
            safePublishData({ type: "untag_product" });
            showToast("Product spotlight removed.");
          }}
        />
      )}
    </div>
  );
}

// ── Exported Component Container ──────────────────────────────────────────────
export default function SpaceRoom({
  space,
  token,
  isAdmin,
  userId,
  onEnd,
  ending,
}: Props) {
  const [connected, setConnected] = useState(false);
  useEffect(() => {
    if (!connected || !userId) return;
    const leave = () => { fetch(`/api/spaces/${space.id}/attendance`, { method: "PATCH", keepalive: true }).catch(() => {}); };
    window.addEventListener("pagehide", leave);
    return () => window.removeEventListener("pagehide", leave);
  }, [connected, userId, space.id]);
  const lkUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL ?? "";
  const router = useRouter();

  return (
    <LiveKitRoom
      serverUrl={lkUrl}
      token={token}
      connect={true}
      audio={false}
      video={false}
      onConnected={() => {
        setConnected(true);
        fetch(`/api/spaces/${space.id}/attendance`, { method: "POST", keepalive: true }).catch(() => {});
      }}
      onDisconnected={async () => {
        fetch(`/api/spaces/${space.id}/attendance`, { method: "PATCH", keepalive: true }).catch(() => {});
        const managesTalk = isAdmin || space.hostId === userId || space.coHostIds?.includes(userId || "");
        if (managesTalk) {
          try {
            const response = await fetch(`/api/spaces/${space.id}`, { cache: "no-store" });
            const ended = await response.json();
            if (response.ok && ended.endedAt) { window.location.replace(`/pro-talks/${space.id}`); return; }
          } catch { /* Return to the directory if the report cannot be loaded. */ }
        }
        router.push("/pro-talks");
      }}
      className="sr-livekit"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 100,
        display: "flex",
        flexDirection: "column",
      }}
    >
      {!connected ? (
        <div className="sr-connecting fixed inset-0 z-[100] flex flex-col items-center justify-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-lime-400 via-emerald-500 to-teal-600 flex items-center justify-center mb-2 shadow-xl shadow-emerald-500/30">
            <Radio01Icon className="w-7 h-7 text-[#04111f]" />
          </div>
          <Loader2 className="w-6 h-6 animate-spin text-emerald-400" />
          <p className="text-slate-400 text-sm">
            Entering{" "}
            <span className="text-white font-medium">{space.name}</span>…
          </p>
        </div>
      ) : (
        <RoomInner
          space={space}
          token={token}
          isAdmin={isAdmin}
          userId={userId}
          onEnd={onEnd}
          ending={ending}
        />
      )}
    </LiveKitRoom>
  );
}

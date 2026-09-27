"use client";

import { Fragment, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Loader2, Calendar, Clock, Users, Check, CheckCheck, Copy, Play, Pencil } from "lucide-react";
import { Radio01Icon } from "hugeicons-react";
import SpaceRoom from "@/components/spaces/SpaceRoom";
import RsvpPanel from "@/components/spaces/RsvpPanel";
import EditTalkDialog from "@/components/spaces/EditTalkDialog";
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
  const units = [...(d > 0 ? [{ v: d, l: "days" }] : []), { v: h, l: "hrs" }, { v: m, l: "min" }, { v: s, l: "sec" }];
  return (
    <div className="ptr-countdown" role="timer" aria-label="Time until this Pro Talk starts">
      {units.map((u, i) => (
        <Fragment key={u.l}>
          {i > 0 && <i aria-hidden="true">:</i>}
          <div><strong>{String(u.v).padStart(2, "0")}</strong><small>{u.l}</small></div>
        </Fragment>
      ))}
    </div>
  );
}

// ── Guest Join Screen ──────────────────────────────────────────────────────────
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
      <Link href="/pro-talks" className="ptr-back">← Pro Talks</Link>
      <span className="ptr-status is-live"><span className="ptr-dot" /> Live now</span>
      <span className="ptr-mic"><Image src="/protalk.png" alt="" fill className="object-cover" sizes="88px" /></span>
      <h1>{space.name}</h1>
      {space.description && <p className="ptr-desc">{space.description}</p>}
      <div className="ptr-meta">
        <span>Hosted by <strong>{space.host.name}</strong></span>
        {space.category && <span>{space.category}</span>}
        <span>{isVideo ? "Audio + video" : "Audio only"}</span>
      </div>
      <form className="ptr-join" onSubmit={e => { e.preventDefault(); handleJoin(); }}>
        <label htmlFor="guest-name-input">Your display name</label>
        <input
          id="guest-name-input"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="How should others see you?"
          maxLength={40}
          autoComplete="name"
        />
        <button id="guest-join-btn" type="submit" disabled={!name.trim() || joining} className="ptr-btn ptr-btn--primary">
          {joining ? <><Loader2 className="w-4 h-4 animate-spin" /> Joining…</> : <><Radio01Icon className="w-4 h-4" /> Join Pro Talk</>}
        </button>
      </form>
      <div className="flex items-center justify-center gap-3 text-xs text-slate-400 mt-1">
        <span>Have an account?</span>
        <Link href={accountUrl("/login", `/pro-talks/${space.id}`)} className="text-lime-400 font-bold hover:underline">
          Sign In
        </Link>
        <span>·</span>
        <Link href={accountUrl("/register", `/pro-talks/${space.id}`)} className="text-emerald-400 font-bold hover:underline">
          Sign Up
        </Link>
      </div>
      <p className="ptr-fine">Free to join · you&apos;ll enter muted</p>
    </main>
  );
}


// ── Exit Screen Component ─────────────────────────────────────────────────────
function ExitScreen({
  space,
  onExit,
}: {
  space: Space;
  onExit: () => void;
}) {
  const [seconds, setSeconds] = useState(4);
  useEffect(() => {
    const timer = setInterval(() => {
      setSeconds((s) => {
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
    <main className="ptr-screen" style={{ textAlign: "center", maxWidth: "480px" }}>
      <span className="ptr-mic">
        <Image src="/protalk.png" alt="" fill className="object-cover" sizes="88px" priority />
      </span>
      <span
        className="ptr-status"
        style={{
          background: "rgba(244,63,94,0.15)",
          borderColor: "rgba(244,63,94,0.3)",
          color: "#fda4af",
        }}
      >
        Pro Talk Concluded
      </span>
      <h1 style={{ fontSize: "24px", marginTop: "12px", marginBottom: "8px" }}>
        {space.name}
      </h1>
      <p className="ptr-desc" style={{ marginBottom: "20px" }}>
        This Pro Talk session has ended. Thank you for participating in the conversation!
      </p>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "8px",
          fontSize: "13px",
          color: "#94a3b8",
          background: "rgba(255,255,255,0.05)",
          border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: "14px",
          padding: "10px 16px",
          marginBottom: "24px",
        }}
      >
        <span>Returning to Pro Talks in</span>
        <strong style={{ color: "#a3e635", fontSize: "16px", minWidth: "16px" }}>
          {seconds}s
        </strong>
      </div>

      <div className="ptr-actions" style={{ justifyContent: "center" }}>
        <button onClick={onExit} className="ptr-btn ptr-btn--primary">
          Return to Pro Talks Now
        </button>
      </div>
    </main>
  );
}

// ── Scheduled (pre-live) Screen ────────────────────────────────────────────────
function ScheduledScreen({
  space,
  isHost,
  currentUserId,
  onStartNow,
  starting,
  onSpaceUpdated,
  onCancelled,
}: {
  space: Space;
  isHost: boolean;
  currentUserId: string;
  onStartNow: () => void;
  starting: boolean;
  onSpaceUpdated: (updated: Space) => void;
  onCancelled: (id: string) => void;
}) {
  const [showEdit, setShowEdit] = useState(false);
  const [rsvped, setRsvped] = useState(false);
  const [rsvping, setRsvping] = useState(false);
  const [rsvpCount, setRsvpCount] = useState(space._count?.rsvps ?? 0);
  const [copied, setCopied] = useState(false);

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
      setRsvpCount(c => Math.max(0, c - 1));
    } else {
      const res = await fetch(`/api/spaces/${space.id}/rsvp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (res.ok) {
        setRsvped(true);
        setRsvpCount(c => c + 1);
      }
    }
    setRsvping(false);
  };

  return (
    <main className="ptr-screen">
      <Link href="/pro-talks" className="ptr-back">← Pro Talks</Link>
      <span className="ptr-status is-up"><Calendar className="w-4 h-4" /> Scheduled Pro Talk</span>
      <span className="ptr-mic"><Image src="/protalk.png" alt="" fill className="object-cover" sizes="88px" /></span>
      <h1>{space.name}</h1>
      {space.description && <p className="ptr-desc">{space.description}</p>}
      <div className="ptr-meta">
        <span>Hosted by <strong>{space.host.name}</strong></span>
        {space.category && <span>{space.category}</span>}
        {space.scheduledAt && <span><Clock className="w-4 h-4" /> {formatScheduled(space.scheduledAt)}</span>}
        {isHost && <span><Users className="w-4 h-4" /> {rsvpCount} {rsvpCount === 1 ? "person" : "people"} going</span>}
      </div>

      <Countdown target={space.scheduledAt} />

      <div className="ptr-actions">
        {isHost && (
          <>
            <button id="host-start-now-btn" onClick={onStartNow} disabled={starting} className="ptr-btn ptr-btn--live">
              {starting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4 fill-white" />}
              {starting ? "Starting stage…" : "Go live now"}
            </button>
            <button id="host-edit-talk-btn" onClick={() => setShowEdit(true)} className="ptr-btn ptr-btn--ghost">
              <Pencil className="w-4 h-4" /> Edit Talk
            </button>
          </>
        )}
        {currentUserId && !isHost && (
          <button id="detail-rsvp-btn" onClick={toggleRsvp} disabled={rsvping} className={`ptr-btn ${rsvped ? "ptr-btn--ghost" : "ptr-btn--primary"}`}>
            {rsvping ? <Loader2 className="w-4 h-4 animate-spin" /> : rsvped ? <><CheckCheck className="w-4 h-4" /> RSVP&apos;d</> : <><Check className="w-4 h-4" /> RSVP</>}
          </button>
        )}
        {!currentUserId && (
          <>
            <Link
              id="unauth-signup-rsvp-btn"
              href={accountUrl("/register", `/pro-talks/${space.id}`)}
              className="ptr-btn ptr-btn--primary"
            >
              <Radio01Icon className="w-4 h-4" /> Sign Up to RSVP &amp; Join
            </Link>
            <Link
              id="unauth-signin-btn"
              href={accountUrl("/login", `/pro-talks/${space.id}`)}
              className="ptr-btn ptr-btn--ghost"
            >
              Sign In
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

      {isHost && (
        <section className="ptr-host" aria-label="Confirmed RSVPs">
          <p>Host · confirmed RSVPs</p>
          <RsvpPanel spaceId={space.id} />
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
    </main>
  );
}

// ── Main Page Component ───────────────────────────────────────────────────────
export default function ProTalkPage() {
  const { id } = useParams<{ id: string }>();
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
  const [showExitScreen, setShowExitScreen] = useState(false);

  useEffect(() => {
    if (!id) return;
    let isCancelled = false;

    async function fetchData() {
      try {
        const [spaceData, tokenData, me] = await Promise.all([
          fetch(`/api/spaces/${id}`).then(r => r.json()),
          fetch(`/api/spaces/${id}/token`, { method: "POST" }).then(r => r.json()),
          fetch("/api/user/me").then(r => r.json()).catch(() => null),
        ]);

        if (isCancelled) return;

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
          if (spaceData.isLive && !me?.id) setShowGuestForm(true);
        } else {
          setToken(tokenData.token as string);
          fetch(`/api/spaces/${id}/attendance`, { method: "POST" }).catch(() => {});
        }
      } catch {
        if (!isCancelled) setError("Failed to load Pro Talk");
      } finally {
        if (!isCancelled) setLoading(false);
      }
    }

    fetchData();

    return () => {
      isCancelled = true;
    };
  }, [id]);

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
      await fetch(`/api/spaces/${id}`, { method: "DELETE" });
    } finally {
      router.push("/pro-talks");
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
        <span className="ptr-mic"><Image src="/protalk.png" alt="" fill className="object-cover" sizes="88px" priority /></span>
        <Loader2 className="w-6 h-6 animate-spin text-emerald-400" />
        <p>Connecting to the Pro Talk stage…</p>
      </main>
    );
  }

  // Guest name form
  if (showGuestForm && space) return <GuestJoinScreen space={space} onJoin={handleGuestJoin} />;

    // Exit screen on conclusion
  if (showExitScreen && space) {
    return <ExitScreen space={space} onExit={() => router.push("/pro-talks")} />;
  }

  // Scheduled screen
  if (space && !space.isLive && !space.endedAt) {
    const isHostUser = Boolean(userId && (space.hostId === userId || space.host?.id === userId));
    return (
      <ScheduledScreen
        space={space}
        isHost={isHostUser}
        currentUserId={userId}
        onStartNow={handleStartNow}
        starting={starting}
        onSpaceUpdated={(updated) => setSpace(s => s ? { ...s, ...updated } : updated)}
        onCancelled={() => router.push("/pro-talks")}
      />
    );
  }

  if (error || !space || !token) {
    return (
      <main className="ptr-screen">
        <span className="ptr-mic"><Image src="/protalk.png" alt="" fill className="object-cover" sizes="88px" /></span>
        <h1>{space?.endedAt ? "This Pro Talk has ended" : "Pro Talk unavailable"}</h1>
        <p className="ptr-desc">{error && error !== "Not found" ? error : "It may have ended or the link is no longer valid. Browse what's live and upcoming instead."}</p>
        <div className="ptr-actions">
          <Link href="/pro-talks" className="ptr-btn ptr-btn--primary">Browse Pro Talks</Link>
        </div>
      </main>
    );
  }

  return (
    <SpaceRoom
      space={space}
      token={token}
      isAdmin={isAdmin}
      userId={userId}
      onEnd={handleEnd}
      ending={ending}
    />
  );
}

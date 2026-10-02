"use client";

import { useEffect, useState, useCallback } from "react";
import { Loader2, Download, Users, UserPlus, Trash2, ShieldCheck } from "lucide-react";
import { UserGroupIcon } from "hugeicons-react";
import BrandAmbassadorBadge from "@/components/badges/BrandAmbassadorBadge";
import AdminRsvpModal from "@/components/spaces/AdminRsvpModal";

interface RsvpEntry {
  id: string;
  name: string;
  email: string | null;
  createdAt: string;
  user?: {
    id: string;
    name: string;
    image: string | null;
    headline: string | null;
    phone?: string | null;
    email?: string | null;
    role?: string;
    tier?: string;
    isBrandAmbassador?: boolean;
  } | null;
}

interface RsvpPanelProps {
  spaceId: string;
  spaceName?: string;
  isAdmin?: boolean;
  /** Poll interval in ms, default 30 000 */
  pollMs?: number;
  onRsvpCountChanged?: (count: number) => void;
}

function timeAgo(d: string) {
  const s = Math.floor((Date.now() - new Date(d).getTime()) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  return `${Math.floor(s / 3600)}h ago`;
}

export default function RsvpPanel({
  spaceId,
  spaceName = "Pro Talk",
  isAdmin = false,
  pollMs = 30_000,
  onRsvpCountChanged,
}: RsvpPanelProps) {
  const [rsvps, setRsvps] = useState<RsvpEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchRsvps = useCallback(async () => {
    try {
      const res = await fetch(`/api/spaces/${spaceId}/rsvp`);
      if (res.ok) {
        const data = await res.json();
        setRsvps(data);
        onRsvpCountChanged?.(Array.isArray(data) ? data.length : 0);
      }
    } finally {
      setLoading(false);
    }
  }, [spaceId, onRsvpCountChanged]);

  useEffect(() => {
    fetchRsvps();
    const interval = setInterval(fetchRsvps, pollMs);
    return () => clearInterval(interval);
  }, [fetchRsvps, pollMs]);

  // Admin remove RSVP
  const handleAdminRemoveRsvp = async (r: RsvpEntry) => {
    if (!isAdmin || deletingId) return;
    setDeletingId(r.id);
    try {
      const res = await fetch(
        `/api/spaces/${spaceId}/rsvp?rsvpId=${encodeURIComponent(r.id)}`,
        { method: "DELETE" }
      );
      if (res.ok) {
        setRsvps((prev) => prev.filter((item) => item.id !== r.id));
        onRsvpCountChanged?.(Math.max(0, rsvps.length - 1));
      }
    } finally {
      setDeletingId(null);
    }
  };

  // Build & download CSV
  const downloadCsv = () => {
    const rows = [
      ["Name", "Email", "Phone Number", "Member?", "Tier", "Brand Ambassador?", "RSVP Time"],
      ...rsvps.map((r) => [
        r.name,
        r.email || r.user?.email || "",
        r.user?.phone || "",
        r.user ? "Yes" : "No",
        r.user?.tier || "FREE",
        r.user?.isBrandAmbassador ? "Yes" : "No",
        new Date(r.createdAt).toLocaleString(),
      ]),
    ];
    const csv = rows
      .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `pro-talk-rsvps-${spaceId}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <div className="bg-gradient-to-br from-[#061426] to-[#040a14] border border-emerald-500/25 rounded-3xl overflow-hidden shadow-xl">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between px-5 py-4 border-b border-emerald-950/60 gap-3">
          <div className="flex items-center gap-2">
            <UserGroupIcon className="w-4 h-4 text-emerald-400" />
            <span className="text-white font-bold text-sm">Attendees &amp; RSVPs</span>
            {!loading && (
              <span className="ml-1 px-2 py-0.5 rounded-full bg-emerald-500/20 text-lime-300 text-xs font-bold">
                {rsvps.length}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {isAdmin && (
              <button
                onClick={() => setShowAdminModal(true)}
                className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-gradient-to-r from-lime-400/20 to-emerald-400/20 hover:from-lime-400/30 hover:to-emerald-400/30 border border-lime-400/50 text-lime-300 text-xs font-black shadow-xs transition-all hover:scale-105"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>+ Manually RSVP</span>
              </button>
            )}

            {rsvps.length > 0 && (
              <button
                onClick={downloadCsv}
                title="Download CSV"
                className="flex items-center gap-1.5 text-slate-400 hover:text-lime-300 text-xs transition-colors font-medium px-2 py-1 rounded-lg hover:bg-slate-800/60"
              >
                <Download className="w-3.5 h-3.5" />
                Export
              </button>
            )}
          </div>
        </div>

        {/* Body */}
        <div className="max-h-80 overflow-y-auto divide-y divide-emerald-950/40">
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-5 h-5 animate-spin text-emerald-400" />
            </div>
          ) : rsvps.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-10">
              <Users className="w-8 h-8 text-slate-600" />
              <p className="text-slate-400 text-sm">No RSVPs yet</p>
              <p className="text-slate-500 text-xs">
                {isAdmin
                  ? "Share the invite link or manually add members above"
                  : "Share the invite link to get people to RSVP"}
              </p>
            </div>
          ) : (
            rsvps.map((r) => (
              <div key={r.id} className="flex items-center gap-3 px-5 py-3 hover:bg-white/[0.02] transition-colors">
                {/* Avatar */}
                <div className="relative shrink-0">
                  <div
                    className="w-8 h-8 rounded-full shrink-0 flex items-center justify-center text-white text-xs font-bold overflow-hidden border border-emerald-500/40"
                    style={{ background: "linear-gradient(135deg,#06172e,#0a2e4c)" }}
                  >
                    {r.user?.image ? (
                      <img
                        src={r.user.image}
                        alt={r.name}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      (r.name || "?")[0]?.toUpperCase()
                    )}
                  </div>
                  {r.user?.isBrandAmbassador && (
                    <div className="absolute -bottom-1 -right-1 drop-shadow-[0_2px_4px_rgba(0,0,0,0.65)] z-10">
                      <BrandAmbassadorBadge size={12} showTooltip={false} />
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-white/90 text-sm font-semibold truncate">{r.name}</span>
                    {r.user?.isBrandAmbassador && (
                      <BrandAmbassadorBadge size={14} showTooltip={false} />
                    )}
                    {r.user && (
                      <span className="shrink-0 px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-lime-300 text-[10px] font-bold">
                        Member
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap text-slate-400 text-xs mt-0.5">
                    {(r.email || r.user?.email) && (
                      <span className="truncate">{r.email || r.user?.email}</span>
                    )}
                    {r.user?.phone && (
                      <span className="text-slate-400/90 truncate">
                        {(r.email || r.user?.email) ? "· " : ""}
                        {r.user.phone}
                      </span>
                    )}
                  </div>
                </div>

                {/* Time & Admin Actions */}
                <div className="shrink-0 flex items-center gap-2">
                  <span className="text-slate-500 text-xs">{timeAgo(r.createdAt)}</span>
                  {isAdmin && (
                    <button
                      onClick={() => handleAdminRemoveRsvp(r)}
                      disabled={deletingId === r.id}
                      title="Admin: Remove RSVP"
                      className="p-1 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-950/30 transition-colors disabled:opacity-50"
                    >
                      {deletingId === r.id ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="w-3.5 h-3.5" />
                      )}
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {isAdmin && (
        <AdminRsvpModal
          spaceId={spaceId}
          spaceName={spaceName}
          isOpen={showAdminModal}
          onClose={() => setShowAdminModal(false)}
          onRsvpUpdated={fetchRsvps}
        />
      )}
    </>
  );
}

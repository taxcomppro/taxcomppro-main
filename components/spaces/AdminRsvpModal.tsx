"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Search,
  UserCheck,
  UserPlus,
  Trash2,
  Loader2,
  X,
  ShieldCheck,
  Check,
  AlertCircle,
  Users,
} from "lucide-react";
import BrandAmbassadorBadge from "@/components/badges/BrandAmbassadorBadge";

interface MemberResult {
  id: string;
  name: string;
  email: string | null;
  image: string | null;
  headline: string | null;
  role: string;
  tier: string;
  isBrandAmbassador: boolean;
  isRsvped: boolean;
  rsvpId: string | null;
}

interface AdminRsvpModalProps {
  spaceId: string;
  spaceName: string;
  isOpen: boolean;
  onClose: () => void;
  onRsvpUpdated?: () => void;
}

const tierLabels: Record<string, { label: string; color: string }> = {
  FREE: { label: "Free Member", color: "bg-slate-800 text-slate-300 border-slate-700" },
  VIP: { label: "VIP Pro", color: "bg-purple-900/40 text-purple-300 border-purple-600/40" },
  MARKETPLACE: { label: "Marketplace", color: "bg-blue-900/40 text-blue-300 border-blue-500/40" },
  MARKETPLACE_PLUS: { label: "Marketplace Plus", color: "bg-emerald-950/70 text-lime-300 border-emerald-500/50" },
};

export default function AdminRsvpModal({
  spaceId,
  spaceName,
  isOpen,
  onClose,
  onRsvpUpdated,
}: AdminRsvpModalProps) {
  const [search, setSearch] = useState("");
  const [users, setUsers] = useState<MemberResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionUserId, setActionUserId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const fetchUsers = useCallback(async (query: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/spaces/${spaceId}/rsvp/search-users?q=${encodeURIComponent(query)}&limit=30`
      );
      if (!res.ok) {
        throw new Error("Failed to search members");
      }
      const data = await res.json();
      setUsers(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error loading members");
    } finally {
      setLoading(false);
    }
  }, [spaceId]);

  useEffect(() => {
    if (!isOpen) {
      setSearch("");
      setSuccessMsg(null);
      setError(null);
      return;
    }
    const timer = setTimeout(() => {
      fetchUsers(search);
    }, 250);
    return () => clearTimeout(timer);
  }, [search, isOpen, fetchUsers]);

  if (!isOpen) return null;

  const handleAddRsvp = async (user: MemberResult) => {
    setActionUserId(user.id);
    setError(null);
    setSuccessMsg(null);
    try {
      const res = await fetch(`/api/spaces/${spaceId}/rsvp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetUserId: user.id }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to add RSVP");
      }

      setUsers((prev) =>
        prev.map((u) => (u.id === user.id ? { ...u, isRsvped: true, rsvpId: data.id } : u))
      );
      setSuccessMsg(`RSVP confirmed for ${user.name || "member"}!`);
      onRsvpUpdated?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to RSVP member");
    } finally {
      setActionUserId(null);
    }
  };

  const handleRemoveRsvp = async (user: MemberResult) => {
    setActionUserId(user.id);
    setError(null);
    setSuccessMsg(null);
    try {
      const res = await fetch(
        `/api/spaces/${spaceId}/rsvp?targetUserId=${encodeURIComponent(user.id)}`,
        {
          method: "DELETE",
        }
      );
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to remove RSVP");
      }

      setUsers((prev) =>
        prev.map((u) => (u.id === user.id ? { ...u, isRsvped: false, rsvpId: null } : u))
      );
      setSuccessMsg(`RSVP removed for ${user.name || "member"}.`);
      onRsvpUpdated?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to remove RSVP");
    } finally {
      setActionUserId(null);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-gradient-to-br from-[#07152b] via-[#091b35] to-[#040c1a] border border-emerald-500/40 rounded-3xl w-full max-w-2xl max-h-[88vh] flex flex-col shadow-2xl overflow-hidden ring-1 ring-emerald-400/20">
        {/* Header */}
        <div className="px-6 py-5 border-b border-emerald-500/20 flex items-center justify-between bg-[#040e1c]/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border border-emerald-400/40 flex items-center justify-center text-lime-400 shadow-inner">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-black text-white tracking-tight">
                  Admin RSVP Manager
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-black uppercase tracking-wider border border-amber-500/30">
                  Site Admin
                </span>
              </div>
              <p className="text-xs text-slate-300 font-medium truncate max-w-md mt-0.5">
                Manually search and add members to RSVP for <strong className="text-lime-300">&ldquo;{spaceName}&rdquo;</strong>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Notifications */}
        {error && (
          <div className="mx-6 mt-4 p-3 rounded-2xl bg-rose-950/70 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{error}</span>
          </div>
        )}
        {successMsg && (
          <div className="mx-6 mt-4 p-3 rounded-2xl bg-emerald-950/70 border border-emerald-500/40 text-lime-300 text-xs flex items-center gap-2">
            <Check className="w-4 h-4 shrink-0 text-lime-400" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Search Bar */}
        <div className="p-6 pb-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search members by name or email…"
              className="w-full pl-10 pr-10 py-3 rounded-2xl bg-[#061224] border border-emerald-500/30 text-white placeholder-slate-500 text-sm focus:outline-hidden focus:border-lime-400 focus:ring-2 focus:ring-lime-400/20 transition-all"
              autoFocus
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-400 mt-2 px-1">
            <span>Type any name or email to find platform members</span>
            <span>{users.length} members found</span>
          </div>
        </div>

        {/* User Results List */}
        <div className="flex-1 overflow-y-auto px-6 pb-6 space-y-2.5 divide-y divide-transparent max-h-[50vh]">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 text-slate-400 gap-2">
              <Loader2 className="w-6 h-6 animate-spin text-lime-400" />
              <span className="text-xs">Searching platform members…</span>
            </div>
          ) : users.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-slate-400 gap-2 bg-[#061224]/50 rounded-2xl border border-emerald-500/15">
              <Users className="w-8 h-8 text-slate-600" />
              <p className="text-sm font-semibold text-slate-300">
                {search ? "No members match your search" : "No members found"}
              </p>
              <p className="text-xs text-slate-500">
                Try searching by first name, last name, or exact email address.
              </p>
            </div>
          ) : (
            users.map((u) => {
              const tierConfig = tierLabels[u.tier] || tierLabels.FREE;
              const isActing = actionUserId === u.id;

              return (
                <div
                  key={u.id}
                  className={`p-3.5 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                    u.isRsvped
                      ? "bg-emerald-950/30 border-emerald-500/40 shadow-sm shadow-emerald-500/10"
                      : "bg-[#061426]/70 border-emerald-500/20 hover:border-emerald-500/40"
                  }`}
                >
                  {/* Left: Avatar & User Info */}
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="relative shrink-0">
                      <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#0a1628] to-[#1a3a6b] border border-emerald-500/40 overflow-hidden flex items-center justify-center text-white font-bold text-sm shadow-sm">
                        {u.image ? (
                          <img
                            src={u.image}
                            alt={u.name || ""}
                            className="w-full h-full object-cover"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          (u.name || "?")[0]?.toUpperCase()
                        )}
                      </div>
                      {u.isBrandAmbassador && (
                        <div className="absolute -bottom-1 -right-1 drop-shadow-[0_2px_4px_rgba(0,0,0,0.65)] z-10">
                          <BrandAmbassadorBadge size={14} showTooltip={false} />
                        </div>
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-sm font-bold text-white truncate">
                          {u.name || "Anonymous Member"}
                        </span>
                        {u.isBrandAmbassador && (
                          <BrandAmbassadorBadge size={14} showTooltip={false} />
                        )}
                        <span
                          className={`text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded-md border ${tierConfig.color}`}
                        >
                          {tierConfig.label}
                        </span>
                        {u.role === "ADMIN" && (
                          <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/40">
                            Admin
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5 truncate">
                        {u.email && <span className="truncate">{u.email}</span>}
                        {u.headline && (
                          <>
                            <span className="text-slate-600">&bull;</span>
                            <span className="truncate text-slate-400">{u.headline}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right: Action Button */}
                  <div className="shrink-0">
                    {u.isRsvped ? (
                      <div className="flex items-center gap-1.5">
                        <span className="px-3 py-1.5 rounded-xl bg-emerald-500/20 border border-emerald-400/50 text-lime-300 font-bold text-xs flex items-center gap-1 shadow-xs">
                          <UserCheck className="w-3.5 h-3.5 text-lime-400" />
                          RSVP&apos;d
                        </span>
                        <button
                          onClick={() => handleRemoveRsvp(u)}
                          disabled={isActing}
                          title="Remove RSVP"
                          className="p-1.5 rounded-xl bg-rose-950/40 hover:bg-rose-900/60 border border-rose-500/30 text-rose-300 hover:text-rose-200 transition-colors disabled:opacity-50"
                        >
                          {isActing ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Trash2 className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => handleAddRsvp(u)}
                        disabled={isActing}
                        className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-lime-400 to-emerald-400 hover:from-lime-300 hover:to-emerald-300 text-[#04111f] font-black text-xs shadow-md shadow-emerald-500/20 transition-all flex items-center gap-1.5 disabled:opacity-50 hover:scale-105 active:scale-95"
                      >
                        {isActing ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" /> Adding…
                          </>
                        ) : (
                          <>
                            <UserPlus className="w-3.5 h-3.5" /> + Add RSVP
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-emerald-500/20 bg-[#040e1c]/80 flex items-center justify-between text-xs text-slate-400">
          <span className="flex items-center gap-1.5 text-slate-300">
            <ShieldCheck className="w-4 h-4 text-lime-400" /> Site Admin Privilege · RSVPs update instantly
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

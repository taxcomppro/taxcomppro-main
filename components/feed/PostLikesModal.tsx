"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import ReactionIcon from "./ReactionIcon";
import { REACTIONS, isReaction } from "@/lib/reactions";
import { Cancel01Icon as X, Loading03Icon as Loader2, Search01Icon as Search } from "hugeicons-react";
import { ThumbsUpIcon } from "hugeicons-react";
import DueDiligenceBadge from "@/components/badges/DueDiligenceBadge";
import BrandAmbassadorBadge from "@/components/badges/BrandAmbassadorBadge";

interface LikeUser {
  id: string;
  name: string;
  image: string | null;
  headline: string | null;
  role: string;
  tier: string;
  hasDueDiligenceBadge?: boolean;
  isBrandAmbassador?: boolean;
}

interface LikeEntry {
  reaction?: string;
  id: string;
  createdAt: string;
  user: LikeUser;
}

interface PostLikesModalProps {
  postId: string;
  isOpen: boolean;
  onClose: () => void;
  initialCount?: number;
}

const tierBadge: Record<string, { label: string; cls: string }> = {
  VIP: { label: "VIP", cls: "bg-amber-100 text-amber-700 border-amber-200" },
  MARKETPLACE: { label: "Marketplace", cls: "bg-indigo-100 text-indigo-700 border-indigo-200" },
  MARKETPLACE_PLUS: { label: "Plus", cls: "bg-emerald-100 text-emerald-700 border-emerald-200" },
};

export default function PostLikesModal({ postId, isOpen, onClose, initialCount }: PostLikesModalProps) {
  const [likes, setLikes] = useState<LikeEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;


    fetch(`/api/feed/${postId}/like`, { cache: "no-store" })
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load likes");
        return res.json();
      })
      .then((data) => {
        if (isMounted) {
          setLikes(data.likes || []);
          setLoading(false);
        }
      })
      .catch((err) => {
        console.error("Error fetching likes:", err);
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, postId]);

  // Close on escape key
  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, onClose]);

  const filteredLikes = useMemo(() => {
    if (!searchQuery.trim()) return likes;
    const q = searchQuery.toLowerCase();
    return likes.filter(
      (item) =>
        item.user.name.toLowerCase().includes(q) ||
        item.user.headline?.toLowerCase().includes(q) ||
        item.user.role.toLowerCase().includes(q)
    );
  }, [likes, searchQuery]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden border border-slate-200 flex flex-col max-h-[80vh] animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header — Facebook style */}
        <div className="px-4 py-3.5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {/* Active reaction tab pill */}
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-50 text-[#1877F2] text-sm font-bold border border-blue-100">
              <span className="w-5 h-5 rounded-full bg-[#1877F2] text-white flex items-center justify-center shrink-0 shadow-xs">
                <ThumbsUpIcon className="w-3 h-3 " />
              </span>
              <span>All</span>
              <span className="text-slate-500 font-semibold text-xs ml-0.5">
                {loading ? initialCount ?? "…" : likes.length}
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-colors"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Optional Search bar if > 5 likes */}
        {!loading && likes.length > 5 && (
          <div className="px-4 pt-3 pb-1">
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-700">
              <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <input
                type="text"
                placeholder="Search who liked..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-transparent outline-none placeholder-slate-400 font-[inherit]"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery("")} className="text-slate-400 hover:text-slate-600">
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>
        )}

        {/* Users List */}
        <div className="overflow-y-auto flex-1 divide-y divide-slate-100 p-2">
          {loading ? (
            <div className="py-8 space-y-4 px-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-3 animate-pulse">
                  <div className="w-11 h-11 rounded-full bg-slate-200 shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3.5 bg-slate-200 rounded-md w-32" />
                    <div className="h-2.5 bg-slate-100 rounded-md w-24" />
                  </div>
                  <div className="w-16 h-7 bg-slate-100 rounded-lg shrink-0" />
                </div>
              ))}
            </div>
          ) : filteredLikes.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-sm">
              {searchQuery ? "No members match your search." : "No reactions yet."}
            </div>
          ) : (
            filteredLikes.map(({ user, reaction }) => {
              const badge = tierBadge[user.tier];
              const isAdmin = user.role === "ADMIN";

              return (
                <div
                  key={user.id}
                  className="flex items-center justify-between gap-3 p-2.5 rounded-xl hover:bg-slate-50 transition-colors group"
                >
                  <Link
                    href={`/member/${user.id}`}
                    onClick={onClose}
                    className="flex items-center gap-3 min-w-0 flex-1"
                  >
                    {/* Avatar with Facebook-style reaction bubble */}
                    <div className="relative shrink-0">
                      <div className="w-11 h-11 rounded-full bg-[#0a1628] flex items-center justify-center overflow-hidden border border-slate-200">
                        {user.image ? (
                          <img
                            src={user.image}
                            alt={user.name}
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span className="text-white text-sm font-bold">
                            {user.name?.[0]?.toUpperCase() || "?"}
                          </span>
                        )}
                      </div>
                      {/* Thumbs up badge attached to avatar corner */}
                      <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-[#1877F2] text-white flex items-center justify-center border-2 border-white shadow-xs">
                        <span aria-label={REACTIONS.find(item => item.type === reaction)?.label ?? "Like"}><ReactionIcon type={isReaction(reaction) ? reaction : "LIKE"} active size={22} /></span>
                      </span>
                    </div>

                    {/* Name & Details */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-bold text-sm text-[#0a1628] group-hover:text-blue-600 transition-colors truncate">
                          {user.name}
                        </span>

                        {user.isBrandAmbassador && (
                          <BrandAmbassadorBadge size={16} />
                        )}

                        {user.hasDueDiligenceBadge && (
                          <DueDiligenceBadge size={16} showTooltip={false} />
                        )}

                        {isAdmin && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-rose-100 text-rose-700 border border-rose-200">
                            Admin
                          </span>
                        )}

                        {!isAdmin && badge && (
                          <span
                            className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md border ${badge.cls}`}
                          >
                            {badge.label}
                          </span>
                        )}
                      </div>

                      {user.headline && (
                        <p className="text-xs text-slate-500 truncate mt-0.5 font-normal">
                          {user.headline}
                        </p>
                      )}
                    </div>
                  </Link>

                  {/* Profile Link Button */}
                  <Link
                    href={`/member/${user.id}`}
                    onClick={onClose}
                    className="shrink-0 text-xs font-semibold px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:text-[#0a1628] hover:bg-slate-100 hover:border-slate-300 transition-all flex items-center gap-1"
                  >
                    <span>Profile</span>
                  </Link>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

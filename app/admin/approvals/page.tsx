"use client";

import { useEffect, useState } from "react";
import {
  CheckCircle2,
  XCircle,
  Loader2,
  Megaphone,
  MonitorPlay,
  Star,
} from "lucide-react";

function timeAgo(d: string) {
  const s = Math.floor((Date.now() - new Date(d).getTime()) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

export default function AdminApprovalsPage() {
  const [activeTab, setActiveTab] = useState<"blasts" | "proads" | "featured">("blasts");

  /* pro ads state */
  interface ProAdItem {
    id: string;
    title: string;
    description: string | null;
    imageUrl: string;
    linkUrl: string;
    placement: string;
    durationMonths: number;
    priceUsd: number;
    status: string;
    createdAt: string;
    rejectionReason: string | null;
    user: { id: string; name: string; email: string; image: string | null };
  }
  const [proAds, setProAds] = useState<ProAdItem[]>([]);
  const [proAdsLoad, setProAdsLoad] = useState(true);
  const [adActing, setAdActing] = useState<Record<string, boolean>>({});
  const [adRejectReasons, setAdRejectReasons] = useState<Record<string, string>>({});

  /* featured listings state */
  interface FeaturedItem {
    id: string;
    durationMonths: number;
    priceUsd: number;
    status: string;
    createdAt: string;
    rejectionReason: string | null;
    user: { id: string; name: string; email: string; image: string | null };
    listing: { id: string; title: string; category: string; images: string[]; description: string };
  }
  const [featItems, setFeatItems] = useState<FeaturedItem[]>([]);
  const [featLoad, setFeatLoad] = useState(true);
  const [featActing, setFeatActing] = useState<Record<string, boolean>>({});
  const [featReasons, setFeatReasons] = useState<Record<string, string>>({});

  /* blasts state */
  interface Blast {
    id: string;
    subject: string;
    content: string;
    recipientCount: number;
    priceUsd: number;
    status: string;
    createdAt: string;
    rejectionReason: string | null;
    sender: { id: string; name: string; email: string; image: string | null };
  }
  const [blasts, setBlasts] = useState<Blast[]>([]);
  const [blastLoad, setBlastLoad] = useState(true);
  const [blastActing, setBlastActing] = useState<Record<string, boolean>>({});
  const [rejectReasons, setRejectReasons] = useState<Record<string, string>>({});

  useEffect(() => {
    fetch("/api/admin/message-blasts?status=PENDING_APPROVAL")
      .then((r) => r.json())
      .then((d) => setBlasts(Array.isArray(d) ? d : []))
      .catch(() => {})
      .finally(() => setBlastLoad(false));
    fetch("/api/admin/pro-ads?status=PENDING_APPROVAL")
      .then((r) => r.json())
      .then((d) => setProAds(Array.isArray(d) ? d : []))
      .catch(() => {})
      .finally(() => setProAdsLoad(false));
    fetch("/api/admin/featured-listings?status=PENDING_APPROVAL")
      .then((r) => r.json())
      .then((d) => setFeatItems(Array.isArray(d) ? d : []))
      .catch(() => {})
      .finally(() => setFeatLoad(false));
  }, []);

  const approveProAd = async (id: string) => {
    setAdActing((p) => ({ ...p, [id]: true }));
    const res = await fetch(`/api/admin/pro-ads/${id}/approve`, { method: "POST" });
    if (res.ok) setProAds((p) => p.filter((a) => a.id !== id));
    setAdActing((p) => ({ ...p, [id]: false }));
  };
  const rejectProAd = async (id: string) => {
    setAdActing((p) => ({ ...p, [id]: true }));
    await fetch(`/api/admin/pro-ads/${id}/reject`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason: adRejectReasons[id] ?? "" }),
    });
    setProAds((p) => p.filter((a) => a.id !== id));
    setAdActing((p) => ({ ...p, [id]: false }));
  };

  const approveFeatured = async (id: string) => {
    setFeatActing((p) => ({ ...p, [id]: true }));
    const res = await fetch(`/api/admin/featured-listings/${id}/approve`, { method: "POST" });
    if (res.ok) setFeatItems((p) => p.filter((f) => f.id !== id));
    setFeatActing((p) => ({ ...p, [id]: false }));
  };
  const rejectFeatured = async (id: string) => {
    setFeatActing((p) => ({ ...p, [id]: true }));
    await fetch(`/api/admin/featured-listings/${id}/reject`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason: featReasons[id] ?? "" }),
    });
    setFeatItems((p) => p.filter((f) => f.id !== id));
    setFeatActing((p) => ({ ...p, [id]: false }));
  };

  const approveBlast = async (id: string) => {
    setBlastActing((p) => ({ ...p, [id]: true }));
    const res = await fetch(`/api/admin/message-blasts/${id}/approve`, { method: "POST" });
    if (res.ok) setBlasts((p) => p.filter((b) => b.id !== id));
    setBlastActing((p) => ({ ...p, [id]: false }));
  };
  const rejectBlast = async (id: string) => {
    setBlastActing((p) => ({ ...p, [id]: true }));
    const res = await fetch(`/api/admin/message-blasts/${id}/reject`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason: rejectReasons[id] ?? "" }),
    });
    if (res.ok) setBlasts((p) => p.filter((b) => b.id !== id));
    setBlastActing((p) => ({ ...p, [id]: false }));
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12">
      <div>
        <h1 className="text-2xl font-black text-white">Approvals</h1>
        <p className="text-slate-400 text-sm mt-0.5">Review message blasts, ads, and featured requests</p>
      </div>

      {/* Tab switch */}
      <div className="flex gap-2 bg-slate-800/80 border border-white/10 rounded-2xl p-1.5 w-full sm:w-fit overflow-x-auto backdrop-blur-sm shadow-xl">
        <button
          onClick={() => setActiveTab("blasts")}
          className={`flex items-center gap-2 px-4 sm:px-5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap shrink-0 ${
            activeTab === "blasts"
              ? "bg-[#ffbe24] text-[#0a1628] shadow-md shadow-amber-400/20"
              : "text-slate-400 hover:text-white"
          }`}
        >
          <Megaphone className="w-4 h-4" /> Message Blasts
          {blasts.length > 0 && (
            <span className="bg-red-500 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full">
              {blasts.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab("proads")}
          className={`flex items-center gap-2 px-4 sm:px-5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap shrink-0 ${
            activeTab === "proads"
              ? "bg-[#ffbe24] text-[#0a1628] shadow-md shadow-amber-400/20"
              : "text-slate-400 hover:text-white"
          }`}
        >
          <MonitorPlay className="w-4 h-4" /> Banner Pro Ads
          {proAds.length > 0 && (
            <span className="bg-red-500 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full">
              {proAds.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab("featured")}
          className={`flex items-center gap-2 px-4 sm:px-5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap shrink-0 ${
            activeTab === "featured"
              ? "bg-[#ffbe24] text-[#0a1628] shadow-md shadow-amber-400/20"
              : "text-slate-400 hover:text-white"
          }`}
        >
          <Star className="w-4 h-4" /> Featured Listings
          {featItems.length > 0 && (
            <span className="bg-red-500 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full">
              {featItems.length}
            </span>
          )}
        </button>
      </div>

      {/* ─── BLASTS TAB ─── */}
      {activeTab === "blasts" && (
        <div className="space-y-4">
          {blastLoad ? (
            <div className="flex justify-center py-16">
              <Loader2 className="w-8 h-8 animate-spin text-amber-400" />
            </div>
          ) : blasts.length === 0 ? (
            <div className="text-center py-16 text-slate-400 bg-slate-800/40 rounded-2xl border border-white/8">
              <Megaphone className="w-8 h-8 mx-auto mb-3 opacity-30 text-slate-500" />
              <p className="font-semibold text-white">No pending blasts</p>
              <p className="text-sm text-slate-400 mt-1">All message blast submissions are up to date.</p>
            </div>
          ) : (
            blasts.map((b) => (
              <div key={b.id} className="bg-slate-800/60 rounded-2xl border border-white/8 p-5 space-y-4 shadow-xl">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-600 to-indigo-700 overflow-hidden flex items-center justify-center shrink-0 shadow">
                    {b.sender.image ? (
                      <img
                        src={b.sender.image}
                        alt={b.sender.name}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-white font-black text-sm">{b.sender.name[0]}</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className="font-bold text-white text-sm">{b.sender.name}</span>
                      <span className="text-xs text-slate-400">{b.sender.email}</span>
                      <span className="text-xs bg-blue-500/15 text-blue-300 border border-blue-500/20 font-semibold px-2.5 py-0.5 rounded-full">
                        {b.recipientCount.toLocaleString()} recipients
                      </span>
                      <span className="text-xs bg-emerald-500/15 text-emerald-300 border border-emerald-500/20 font-bold px-2.5 py-0.5 rounded-full">
                        ${b.priceUsd} paid
                      </span>
                      <span className="text-xs text-slate-400">{timeAgo(b.createdAt)}</span>
                    </div>
                    <p className="font-bold text-white">{b.subject}</p>
                    <p className="text-sm text-slate-300 mt-1 whitespace-pre-wrap line-clamp-5 bg-slate-900/60 rounded-xl p-3 border border-white/5">
                      {b.content}
                    </p>
                  </div>
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">
                    Rejection Reason (optional)
                  </p>
                  <input
                    value={rejectReasons[b.id] ?? ""}
                    onChange={(e) => setRejectReasons((p) => ({ ...p, [b.id]: e.target.value }))}
                    placeholder="Reason shown to sender if rejected…"
                    className="w-full text-xs bg-slate-700/50 border border-white/10 rounded-xl px-3 py-2 outline-none focus:border-amber-400 text-white placeholder:text-slate-500 transition-all"
                  />
                </div>
                <div className="flex gap-2">
                  {blastActing[b.id] ? (
                    <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
                  ) : (
                    <>
                      <button
                        onClick={() => approveBlast(b.id)}
                        className="flex items-center gap-1.5 text-xs font-black bg-emerald-500 hover:bg-emerald-400 text-slate-950 px-4 py-2 rounded-xl transition-all"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" /> Approve &amp; Deliver
                      </button>
                      <button
                        onClick={() => rejectBlast(b.id)}
                        className="flex items-center gap-1.5 text-xs font-bold bg-red-500/15 text-red-400 border border-red-500/20 px-4 py-2 rounded-xl hover:bg-red-500/30 transition-all"
                      >
                        <XCircle className="w-3.5 h-3.5" /> Reject
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* ─── PRO ADS TAB ─── */}
      {activeTab === "proads" && (
        <div className="space-y-4">
          {proAdsLoad ? (
            <div className="flex justify-center py-16">
              <Loader2 className="w-8 h-8 animate-spin text-amber-400" />
            </div>
          ) : proAds.length === 0 ? (
            <div className="text-center py-16 text-slate-400 bg-slate-800/40 rounded-2xl border border-white/8">
              <MonitorPlay className="w-8 h-8 mx-auto mb-3 opacity-30 text-slate-500" />
              <p className="font-semibold text-white">No pending ads</p>
              <p className="text-sm text-slate-400 mt-1">All advertising submissions are up to date.</p>
            </div>
          ) : (
            proAds.map((ad) => (
              <div key={ad.id} className="bg-slate-800/60 rounded-2xl border border-white/8 p-5 space-y-4 shadow-xl">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-600 to-orange-700 overflow-hidden flex items-center justify-center shrink-0 shadow">
                    {ad.user.image ? (
                      <img
                        src={ad.user.image}
                        alt={ad.user.name}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-white font-black text-sm">{ad.user.name[0]}</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className="font-bold text-white text-sm">{ad.user.name}</span>
                      <span className="text-xs text-slate-400">{ad.user.email}</span>
                      <span className="text-xs bg-purple-500/15 text-purple-300 border border-purple-500/20 font-semibold px-2.5 py-0.5 rounded-full">
                        {ad.placement === "CENTER_COLUMN" ? "Center Column" : "Left Column"}
                      </span>
                      <span className="text-xs bg-blue-500/15 text-blue-300 border border-blue-500/20 font-semibold px-2.5 py-0.5 rounded-full">
                        {ad.durationMonths} month{ad.durationMonths > 1 ? "s" : ""}
                      </span>
                      <span className="text-xs bg-emerald-500/15 text-emerald-300 border border-emerald-500/20 font-bold px-2.5 py-0.5 rounded-full">
                        ${ad.priceUsd} paid
                      </span>
                      <span className="text-xs text-slate-400">{timeAgo(ad.createdAt)}</span>
                    </div>
                    <p className="font-bold text-white">{ad.title}</p>
                    {ad.description && <p className="text-sm text-slate-400 mt-0.5">{ad.description}</p>}
                    <a
                      href={ad.linkUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-amber-400 hover:underline mt-0.5 block truncate"
                    >
                      {ad.linkUrl}
                    </a>
                  </div>
                </div>
                {/* Banner preview */}
                <div className="rounded-xl overflow-hidden border border-white/10 bg-slate-900">
                  <img
                    src={ad.imageUrl}
                    alt={ad.title}
                    className="w-full max-h-56 object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).alt = "Image failed to load";
                    }}
                  />
                  <div className="px-3 py-1.5 text-[10px] text-slate-400 font-medium">
                    {ad.placement === "CENTER_COLUMN"
                      ? "Center Column — 1200 × 628 px"
                      : "Left Column — 300 × 600 px"}
                  </div>
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">
                    Rejection Reason (optional)
                  </p>
                  <input
                    value={adRejectReasons[ad.id] ?? ""}
                    onChange={(e) => setAdRejectReasons((p) => ({ ...p, [ad.id]: e.target.value }))}
                    placeholder="Reason shown to advertiser if rejected…"
                    className="w-full text-xs bg-slate-700/50 border border-white/10 rounded-xl px-3 py-2 outline-none focus:border-amber-400 text-white placeholder:text-slate-500 transition-all"
                  />
                </div>
                <div className="flex gap-2">
                  {adActing[ad.id] ? (
                    <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
                  ) : (
                    <>
                      <button
                        onClick={() => approveProAd(ad.id)}
                        className="flex items-center gap-1.5 text-xs font-black bg-emerald-500 hover:bg-emerald-400 text-slate-950 px-4 py-2 rounded-xl transition-all"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" /> Approve &amp; Activate
                      </button>
                      <button
                        onClick={() => rejectProAd(ad.id)}
                        className="flex items-center gap-1.5 text-xs font-bold bg-red-500/15 text-red-400 border border-red-500/20 px-4 py-2 rounded-xl hover:bg-red-500/30 transition-all"
                      >
                        <XCircle className="w-3.5 h-3.5" /> Reject
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* ─── FEATURED LISTINGS TAB ─── */}
      {activeTab === "featured" && (
        <div className="space-y-4">
          {featLoad ? (
            <div className="flex justify-center py-16">
              <Loader2 className="w-8 h-8 animate-spin text-amber-400" />
            </div>
          ) : featItems.length === 0 ? (
            <div className="text-center py-16 text-slate-400 bg-slate-800/40 rounded-2xl border border-white/8">
              <Star className="w-10 h-10 mx-auto mb-3 opacity-30 text-slate-500" />
              <p className="font-semibold text-white">No pending featured listing requests</p>
            </div>
          ) : (
            featItems.map((f) => (
              <div key={f.id} className="bg-slate-800/60 rounded-2xl border border-white/8 p-6 space-y-4 shadow-xl">
                <div className="flex items-start gap-4">
                  {/* Listing thumbnail */}
                  <div className="w-20 h-14 rounded-xl overflow-hidden bg-slate-900 border border-white/10 shrink-0">
                    {f.listing.images[0] ? (
                      <img src={f.listing.images[0]} alt={f.listing.title} className="w-full h-full object-cover" />
                    ) : (
                      <Star className="w-5 h-5 text-slate-500 m-4.5" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-black text-white">{f.listing.title}</span>
                      <span className="text-[10px] font-bold bg-amber-400/15 text-amber-300 border border-amber-400/20 px-2 py-0.5 rounded-full">
                        {f.listing.category}
                      </span>
                      <span className="text-[10px] font-bold bg-blue-500/15 text-blue-300 border border-blue-500/20 px-2 py-0.5 rounded-full">
                        {f.durationMonths} month{f.durationMonths > 1 ? "s" : ""}
                      </span>
                      <span className="text-[10px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                        ${f.priceUsd} paid
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-1 line-clamp-2">{f.listing.description}</p>
                    <div className="flex items-center gap-2 mt-2">
                      {f.user.image && (
                        <img src={f.user.image} alt={f.user.name} className="w-5 h-5 rounded-full object-cover" />
                      )}
                      <span className="text-xs text-slate-400">
                        {f.user.name} · {f.user.email} · {new Date(f.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                    Rejection Reason (optional)
                  </p>
                  <input
                    value={featReasons[f.id] ?? ""}
                    onChange={(e) => setFeatReasons((p) => ({ ...p, [f.id]: e.target.value }))}
                    placeholder="Reason shown to member if rejected…"
                    className="w-full text-xs bg-slate-700/50 border border-white/10 rounded-xl px-3 py-2 outline-none focus:border-amber-400 text-white placeholder:text-slate-500 transition-all"
                  />
                </div>
                <div className="flex gap-2">
                  {featActing[f.id] ? (
                    <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
                  ) : (
                    <>
                      <button
                        onClick={() => approveFeatured(f.id)}
                        className="flex items-center gap-1.5 text-xs font-black bg-amber-400 hover:bg-amber-300 text-slate-950 px-4 py-2 rounded-xl transition-all"
                      >
                        <Star className="w-3.5 h-3.5" /> Approve &amp; Feature
                      </button>
                      <button
                        onClick={() => rejectFeatured(f.id)}
                        className="flex items-center gap-1.5 text-xs font-bold bg-red-500/15 text-red-400 border border-red-500/20 px-4 py-2 rounded-xl hover:bg-red-500/30 transition-all"
                      >
                        <XCircle className="w-3.5 h-3.5" /> Reject
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

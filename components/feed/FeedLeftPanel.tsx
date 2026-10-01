"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { setUser } from "@/store/slices/authSlice";
import {
  UserGroupIcon, Rocket01Icon, Notification01Icon,
  ShoppingBag01Icon, Chart01Icon, BookOpen01Icon,
  UserAdd01Icon, Home01Icon, Edit01Icon, Tick01Icon, Cancel01Icon,
} from "hugeicons-react";
import { ComputerVideoIcon as MonitorPlay, ArrowUpRight01Icon as ExternalLink } from "hugeicons-react";
import DueDiligenceBadge from "@/components/badges/DueDiligenceBadge";
import BrandAmbassadorBadge from "@/components/badges/BrandAmbassadorBadge";

const tierLabel: Record<string, string> = {
  FREE: "Free Member", VIP: "VIP Member",
  MARKETPLACE: "Marketplace Pro", MARKETPLACE_PLUS: "Marketplace Plus",
  ADMIN: "Admin",
};
const tierColor: Record<string, string> = {
  FREE: "bg-slate-100 text-slate-600",
  VIP: "bg-amber-100 text-amber-700",
  MARKETPLACE: "bg-indigo-100 text-indigo-700",
  MARKETPLACE_PLUS: "bg-emerald-100 text-emerald-700",
  ADMIN: "bg-rose-100 text-rose-700",
};

export default function FeedLeftPanel() {
  const dispatch  = useAppDispatch();
  const user      = useAppSelector(s => s.auth.user);

  const [editing,         setEditing]         = useState(false);
  const [headline,        setHeadline]        = useState(user?.headline ?? "");
  const [bio,             setBio]             = useState(user?.bio ?? "");
  const [saving,          setSaving]          = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const [coverImage,      setCoverImage]      = useState(user?.coverImage ?? "");
  const [leftAds,         setLeftAds]         = useState<{id:string;title:string;description:string|null;imageUrl:string;linkUrl:string;user:{name:string}}[]>([]);

  useEffect(() => {
    fetch("/api/pro-ads/active?placement=LEFT_COLUMN")
      .then(r => r.json()).then(d => setLeftAds(Array.isArray(d) ? d : []))
      .catch(() => {});
  }, []);

  if (!user) return null;

  const isAdmin = user.role === "ADMIN";
  const canSell = isAdmin || user.tier === "MARKETPLACE" || user.tier === "MARKETPLACE_PLUS";
  // Admins display as their own tier label, not "Free Member"
  const tier = isAdmin ? "ADMIN" : (user.tier ?? "FREE");

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ headline: headline.trim(), bio: bio.trim() }),
      });
      if (res.ok) {
        dispatch(setUser({ ...user, headline: headline.trim(), bio: bio.trim() }));
        setEditing(false);
      }
    } catch { /* ignore */ }
    finally { setSaving(false); }
  };

  const handleBannerUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingBanner(true);
    try {
      // Upload to Cloudinary
      const fd = new FormData();
      fd.append("file", file);
      fd.append("upload_preset", process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET ?? "ml_default");
      const cloud = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
      const upRes = await fetch(`https://api.cloudinary.com/v1_1/${cloud}/image/upload`, { method: "POST", body: fd });
      const upData = await upRes.json();
      const url: string = upData.secure_url;
      if (!url) return;
      // Save to DB
      await fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ coverImage: url }),
      });
      setCoverImage(url);
      dispatch(setUser({ ...user, coverImage: url }));
    } catch { /* ignore */ }
    finally { setUploadingBanner(false); }
  };

  const handleCancel = () => {
    setHeadline(user.headline ?? "");
    setBio(user.bio ?? "");
    setEditing(false);
  };

  return (
    <aside className="w-full space-y-2.5">

      {/* ── Profile card ── */}
      <div className="feed-surface feed-profile overflow-hidden">

        {/* Cover banner — displays coverImage set from profile page, or falls back to gradient */}
        <div className="h-24 relative">
          {user.coverImage
            ? <div className="absolute inset-0 overflow-hidden">
                <img src={user.coverImage} alt="Profile banner" className="w-full h-full object-cover" />
              </div>
            : <div className="absolute inset-0 bg-gradient-to-br from-[#0a1628] via-[#1a3a6b] to-[#0d2a50]">
                <div className="absolute inset-0 opacity-10"
                  style={{ backgroundImage: "radial-gradient(circle at 20% 50%, white 1px, transparent 1px), radial-gradient(circle at 80% 20%, white 1px, transparent 1px)", backgroundSize: "24px 24px" }} />
              </div>
          }
          {/* Avatar — positioned to straddle the banner bottom edge */}
          <div className="absolute -bottom-9 left-4">
            <div className="w-[72px] h-[72px] rounded-2xl bg-[#0a1628] border-[3px] border-white overflow-hidden flex items-center justify-center shadow-md">
              {user.image
                ? <img src={user.image} alt={user.name ?? ""} referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                : <span className="text-white font-black text-2xl">{user.name?.[0]?.toUpperCase()}</span>}
            </div>
            {user.isBrandAmbassador && (
              <div className="absolute -bottom-1 -right-1 bg-[#071326] rounded-full p-0.5 border border-amber-400 shadow-md">
                <BrandAmbassadorBadge size={20} showTooltip={false} />
              </div>
            )}
          </div>
        </div>

        {/* Info below banner */}
        <div className="px-4 pt-12 pb-4">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="font-extrabold text-[#0a1628] dark:text-white text-lg leading-tight truncate">{user.name}</span>
              {user.isBrandAmbassador && <BrandAmbassadorBadge size={20} />}
              {user.hasDueDiligenceBadge && <DueDiligenceBadge size={22} />}
            </div>
              <div className="mt-1.5">
                <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${tierColor[tier]}`}>
                  {tierLabel[tier]}
                </span>
              </div>
            </div>
            {/* Edit toggle */}
            <button
              onClick={() => setEditing(e => !e)}
              className="shrink-0 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-white/10 text-slate-400 hover:text-[#0a1628] dark:hover:text-white transition-all mt-0.5"
              title="Edit headline & bio">
              <Edit01Icon className="w-4 h-4" />
            </button>
          </div>

          {/* Headline + Bio — view or edit */}
          {editing ? (
            <div className="mt-3 space-y-2">
              <input
                type="text"
                value={headline}
                onChange={e => setHeadline(e.target.value)}
                placeholder="e.g. CPA | Tax Attorney | Enrolled Agent"
                maxLength={100}
                className="w-full text-xs font-[inherit] border border-slate-200 dark:border-white/10 rounded-lg px-3 py-2 outline-none focus:border-[#0a1628] focus:ring-2 focus:ring-[#0a1628]/10 transition-all"
              />
              <textarea
                value={bio}
                onChange={e => setBio(e.target.value)}
                placeholder="Tell the community about yourself…"
                rows={3}
                maxLength={300}
                className="w-full text-xs font-[inherit] border border-slate-200 dark:border-white/10 rounded-lg px-3 py-2 outline-none focus:border-[#0a1628] focus:ring-2 focus:ring-[#0a1628]/10 transition-all resize-none"
              />
              <div className="flex gap-2">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex-1 flex items-center justify-center gap-1.5 text-xs font-bold bg-[#0a1628] dark:bg-white dark:text-[#0a1628] text-white py-2 rounded-lg hover:bg-[#1a3a6b] transition-all disabled:opacity-50">
                  <Tick01Icon className="w-3.5 h-3.5" />
                  {saving ? "Saving…" : "Save"}
                </button>
                <button
                  onClick={handleCancel}
                  className="flex items-center justify-center gap-1.5 px-3 text-xs font-bold text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-white/10 py-2 rounded-lg hover:bg-slate-50 dark:hover:bg-white/5 transition-all">
                  <Cancel01Icon className="w-3.5 h-3.5" />
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="mt-2.5 space-y-1">
              {user.headline
                ? <p className="text-sm font-semibold text-slate-600 dark:text-slate-300 leading-snug">{user.headline}</p>
                : <p className="text-sm text-slate-400 dark:text-slate-500 italic">Add a headline to introduce yourself.</p>}
              {user.bio && <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed line-clamp-3">{user.bio}</p>}
            </div>
          )}

          {/* View profile link */}
          <Link href="/profile"
            className="feed-sidebar-button feed-profile-button mt-3 block text-center text-xs font-bold text-[#0a1628] dark:text-white border border-[#0a1628]/20 dark:border-white/20 rounded-lg py-2 hover:bg-[#0a1628] hover:text-white dark:hover:bg-white/10 transition-all">
            View & edit profile
          </Link>
        </div>
      </div>

      {/* ── Navigation links ── */}
      <nav aria-label="Your account" className="feed-surface feed-navigation p-3">
        <p className="feed-sidebar-label">Your workspace</p>
        <div className="space-y-0.5">
          {[
            { icon: Home01Icon,           label: "Feed",                    href: "/feed" },
            { icon: UserGroupIcon,        label: "My Network",              href: "/pro-networks?filter=mine" },
            { icon: Notification01Icon,   label: "Notifications",           href: "/notifications" },
            { icon: UserAdd01Icon,        label: "Connections",             href: "/connections" },
            { icon: BookOpen01Icon,       label: "Marketplace Purchases",   href: "/marketplace-purchases", isExternal: false },
            ...(canSell ? [{ icon: ShoppingBag01Icon, label: "My Listings",  href: "/my-listings", isExternal: false }] : []),
            ...(!canSell ? [{ icon: Rocket01Icon,     label: "Upgrade Plan", href: "/upgrade", isExternal: false }] : []),
            ...(user.role === "ADMIN" ? [{ icon: Chart01Icon, label: "Admin Panel", href: "/admin", isExternal: false }] : []),
          ].map(l => (
            <Link key={l.href} href={l.href}
              aria-current={l.href === "/feed" ? "page" : undefined}
              className="flex items-center gap-3 px-3 py-3 rounded-xl text-slate-600 dark:text-slate-300 text-base font-medium hover:bg-slate-50 dark:hover:bg-white/5 hover:text-[#0a1628] dark:hover:text-white transition-all group">
              <l.icon className="w-5 h-5 text-slate-400 dark:text-slate-400 group-hover:text-[#0a1628] dark:group-hover:text-white transition-colors" />
              {l.label}
            </Link>
          ))}
          
          {/* Access Academy with custom icon */}
          <a
            href="https://academy.taxcomppro.com"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 px-3 py-3 rounded-xl text-slate-600 dark:text-slate-300 text-base font-medium hover:bg-slate-50 dark:hover:bg-white/5 hover:text-[#0a1628] dark:hover:text-white transition-all group"
          >
            <div className="w-7 h-7 flex items-center justify-center flex-shrink-0">
              <img 
                src="/icon.png" 
                alt="Academy" 
                className="w-full h-full object-contain"
              />
            </div>
            Access Academy
            <ExternalLink className="w-3.5 h-3.5 ml-auto opacity-40" />
          </a>
        </div>
      </nav>

      {/* ── Upgrade promo (free users only) ── */}
      {!canSell && (
        <div className="feed-upgrade bg-gradient-to-br from-[#0a1628] to-[#1a3a6b] rounded-2xl p-4 text-white">
          <div className="text-xs font-black uppercase tracking-widest text-[#ffbe24] mb-1">Go Pro</div>
          <div className="text-sm font-bold leading-snug mb-2">Unlock marketplace selling & premium courses</div>
          <Link href="/upgrade"
            className="feed-sidebar-button block text-center text-xs font-bold bg-[#ffbe24] text-[#0a1628] rounded-lg py-2 hover:bg-[#ffbe24] transition-all">
            Upgrade Now
          </Link>
        </div>
      )}
      {/* ── Left-column ads ── */}
      {leftAds.map(ad => (
        <div key={ad.id} className="relative">
          {/* Sponsored badge above */}
          <div className="flex items-center gap-1.5 mb-1.5 ml-1">
            <MonitorPlay className="w-3 h-3 text-amber-500" />
            <span className="text-[9px] font-black text-amber-600 uppercase tracking-widest">Sponsored</span>
          </div>
          <a href={ad.linkUrl} target="_blank" rel="noopener noreferrer"
            className="block relative rounded-2xl overflow-hidden group shadow-sm hover:shadow-lg transition-all">
            <div className="w-full aspect-[16/9] overflow-hidden">
              <img src={ad.imageUrl} alt={ad.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                onError={e => { (e.target as HTMLImageElement).style.display="none"; }} />
            </div>
            {/* Hover overlay */}
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/50 to-transparent px-3 py-2
              translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out">
              <p className="font-bold text-white text-xs leading-tight truncate">{ad.title}</p>
              {ad.description && <p className="text-white/70 text-[10px] mt-0.5 line-clamp-1">{ad.description}</p>}
              <span className="inline-flex items-center gap-1 text-amber-400 text-[9px] font-bold mt-1">
                <ExternalLink className="w-2.5 h-2.5" /> Visit →
              </span>
            </div>
          </a>
        </div>
      ))}
    </aside>
  );
}

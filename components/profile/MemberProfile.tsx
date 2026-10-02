"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { setUser } from "@/store/slices/authSlice";
import {
  Loading03Icon as Loader2,
  Location01Icon as MapPin,
  UserCheck01Icon as UserCheck,
  Share08Icon as Share2,
  Award01Icon as Award,
  BookOpen01Icon as BookOpen,
  FolderDownloadIcon as FolderDown,
  Shield01Icon as ShieldCheck,
  Tick02Icon as Check,
  CrownIcon as Crown,
  ArrowRight01Icon as ChevronRight,
  Camera01Icon as Camera,
  SparklesIcon as Sparkles,
  Edit01Icon as Edit3,
  Download01Icon as Download,
  Cancel01Icon as X,
  Link01Icon as Link2,
  Mail01Icon as Mail,
  UserGroupIcon as Users,
  UserMultipleIcon as Users2,
  StarIcon as Star,
  BubbleChatIcon as MessageSquare,
  Video01Icon as Video,
  Megaphone01Icon as Megaphone,
  Copy01Icon as Copy,
  LinkSquare02Icon as ExternalLink,
  Image01Icon as ImageIcon
} from "hugeicons-react";
import BalancedColumns, { Column } from "@/components/profile/BalancedColumns";
import ProfileMediaStrip, { type FeedMedia } from "@/components/profile/ProfileMediaStrip";
import NetworkEmblem from "@/components/networks/NetworkEmblem";
import NetworksViewAllMenu from "@/components/profile/NetworksViewAllMenu";
import { PROFESSIONAL_TITLES } from "@/lib/professionalTitles";
import EditProfileModal, { type ProfileFormData } from "@/components/profile/EditProfileModal";
import BrandAmbassadorBadge from "@/components/badges/BrandAmbassadorBadge";

interface Purchase {
  id: string;
  toolkitId: string;
  name: string;
  emoji: string;
  membershipTier: string;
  membershipMonths: number;
  createdAt: string;
  downloadUrl: string | null;
}

const MEMBER_SIDEBAR_TABS = [
  { id: "overview", label: "Overview", icon: UserCheck },
  { id: "basic", label: "Basic Info", icon: Edit3 },
  { id: "learning", label: "My Learning & Courses", icon: BookOpen },
  { id: "badges", label: "Due Diligence & Badges", icon: ShieldCheck },
  { id: "purchases", label: "Toolkits & Downloads", icon: FolderDown },
  { id: "membership", label: "Membership Plan", icon: Crown },
] as const;

export default function MemberProfile() {
  const dispatch = useAppDispatch();
  const user = useAppSelector((s) => s.auth.user);

  const [activeTab, setActiveTab] = useState<typeof MEMBER_SIDEBAR_TABS[number]["id"]>("overview");
  const [loading, setLoading] = useState(true);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [savingInPage, setSavingInPage] = useState(false);
  const [saveToast, setSaveToast] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [coverUploading, setCoverUploading] = useState(false);

  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [purchasesLoading, setPurchasesLoading] = useState(false);

  const avatarInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  const [profile, setProfile] = useState<ProfileFormData>({
    name: user?.name ?? "",
    headline: user?.headline ?? "",
    bio: user?.bio ?? "",
    mission: user?.mission ?? "",
    location: user?.location ?? "",
    yearsExperience: user?.yearsExperience ? String(user?.yearsExperience) : "",
    website: user?.website ?? "",
    linkedIn: user?.linkedIn ?? "",
    twitter: user?.twitter ?? "",
    facebook: user?.facebook ?? "",
    image: user?.image ?? null,
    coverImage: user?.coverImage ?? null,
    specialties: user?.specialties?.length ? user.specialties : [],
    certifications: user?.certifications?.length ? user.certifications : [],
    languages: user?.languages?.length ? user.languages : [],
    mediaPhotos: user?.mediaPhotos ?? [],
    voiceMemoUrl: user?.voiceMemoUrl ?? null,
  });

  const [stats, setStats] = useState({
    completedCourses: 0,
    totalEnrollments: 0,
    toolkitPurchases: 0,
    memberSince: "",
    tierName: "STANDARD MEMBER",
    validThru: "",
  });

  const [proStats, setProStats] = useState({
    followers: 0,
    connections: 0,
    proNetworkMembers: 0,
    proNetworksOwned: 0,
    proNetworksJoined: 0,
    discussionsStarted: 0,
    proTalksHosted: 0,
    primaryNetworkSlug: null as string | null,
    primaryNetworkName: null as string | null,
  });
  const [promoteModalOpen, setPromoteModalOpen] = useState(false);
  const [networkCopied, setNetworkCopied] = useState(false);

  // Pro Networks, Badges, and Primary Network
  const [feedPhotos, setFeedPhotos] = useState<FeedMedia[]>([]);
  const [proNetworks, setProNetworks] = useState<Array<{
    id: string;
    role?: string;
    name: string;
    slug: string;
    tagline?: string | null;
    description?: string | null;
    monthlyPrice?: number;
    memberCount: number;
    followerCount?: number;
    logoImage?: string | null;
    coverImage?: string | null;
    memberBenefits?: string[];
    badgeShape?: string;
    badgeInitials?: string | null;
    badgeText?: string;
    badgeIcon?: string;
    badgeBgColor?: string;
    badgeTextColor?: string;
    badgeBorderColor?: string;
    badgeCustomImage?: string | null;
  }>>([]);

  const [myBadges, setMyBadges] = useState<Array<{
    id: string;
    networkId: string;
    networkName: string;
    networkSlug: string;
    role: string;
    ownerName?: string | null;
    ownerImage?: string | null;
    shape: string;
    initials: string | null;
    text: string;
    icon: string;
    bgColor: string;
    textColor: string;
    borderColor: string;
    customImage: string | null;
    logoImage?: string | null;
  }>>([]);

  const [primaryNetwork, setPrimaryNetwork] = useState<{
    id: string;
    name: string;
    slug: string;
    tagline?: string | null;
    description?: string | null;
    monthlyPrice?: number;
    memberCount: number;
    logoImage?: string | null;
    ownerName?: string | null;
    ownerImage?: string | null;
    memberBenefits?: string[];
  } | null>(null);

  const loadUserData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/user/me");
      if (res.ok) {
        const u = await res.json();
        setProfile({
          name: u.name || "",
          professionalTitle: u.professionalTitle || "",
          headline: u.headline || "",
          bio: u.bio || "",
          mission: u.mission || "",
          location: u.location || "",
          yearsExperience: u.yearsExperience != null ? String(u.yearsExperience) : "",
          website: u.website || "",
          linkedIn: u.linkedIn || "",
          twitter: u.twitter || "",
          facebook: u.facebook || "",
          image: u.image || null,
          coverImage: u.coverImage || null,
          specialties: u.specialties?.length ? u.specialties : [],
          certifications: u.certifications?.length ? u.certifications : [],
          languages: u.languages?.length ? u.languages : [],
          mediaPhotos: u.mediaPhotos || [],
          voiceMemoUrl: u.voiceMemoUrl || null,
        });

        const createdDate = u.createdAt ? new Date(u.createdAt) : new Date();
        const memberSinceStr = createdDate.toLocaleDateString("en-US", { month: "short", year: "numeric" });

        const tierLabel =
          u.tier === "VIP" ? "VIP MEMBER"
            : u.tier === "MARKETPLACE_PLUS" ? "MARKETPLACE PLUS"
            : u.tier === "MARKETPLACE" ? "MARKETPLACE MEMBER"
            : "STANDARD MEMBER";

        setStats({
          completedCourses: u.stats?.completedCourses ?? 0,
          totalEnrollments: u.stats?.totalEnrollments ?? 0,
          toolkitPurchases: u.stats?.toolkitPurchases ?? 0,
          memberSince: memberSinceStr,
          tierName: tierLabel,
          validThru: u.subscription?.currentPeriodEnd
            ? new Date(u.subscription.currentPeriodEnd).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
            : "",
        });

        if (u.stats) {
          setProStats({
            followers: u.stats.followers ?? 0,
            connections: u.stats.connections ?? 0,
            proNetworkMembers: u.stats.proNetworkMembers ?? 0,
            proNetworksOwned: u.stats.proNetworksOwned ?? 0,
            proNetworksJoined: u.stats.proNetworksJoined ?? 0,
            discussionsStarted: u.stats.discussionsStarted ?? 0,
            proTalksHosted: u.stats.proTalksHosted ?? 0,
            primaryNetworkSlug: u.stats.primaryNetworkSlug ?? null,
            primaryNetworkName: u.stats.primaryNetworkName ?? null,
          });
        }

        if (Array.isArray(u.feedPhotos)) {
          setFeedPhotos(u.feedPhotos);
        }
        if (Array.isArray(u.proNetworks)) {
          setProNetworks(u.proNetworks);
        }
        if (Array.isArray(u.myBadges)) {
          setMyBadges(u.myBadges);
        }
        if (u.primaryNetwork) {
          setPrimaryNetwork(u.primaryNetwork);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadUserData(); }, [loadUserData]);

  useEffect(() => {
    if (activeTab === "purchases" && purchases.length === 0) {
      setPurchasesLoading(true);
      fetch("/api/user/purchases").then((r) => r.json()).then((d) => setPurchases(Array.isArray(d) ? d : [])).catch(() => {}).finally(() => setPurchasesLoading(false));
    }
  }, [activeTab, purchases.length]);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarUploading(true);
    const fd = new FormData();
    fd.append("files", file);
    fd.append("type", "avatar");
    try {
      const res = await fetch("/api/upload/profile", { method: "POST", body: fd });
      if (res.ok) {
        const { urls } = (await res.json()) as { urls: string[] };
        const url = urls[0];
        await fetch("/api/user/profile", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ image: url }) });
        setProfile((p) => ({ ...p, image: url }));
        if (user) dispatch(setUser({ ...user, image: url }));
      }
    } catch (err) { console.error(err); }
    finally { setAvatarUploading(false); e.target.value = ""; }
  };

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCoverUploading(true);
    const fd = new FormData();
    fd.append("files", file);
    fd.append("type", "cover");
    try {
      const res = await fetch("/api/upload/profile", { method: "POST", body: fd });
      if (res.ok) {
        const { urls } = (await res.json()) as { urls: string[] };
        const url = urls[0];
        await fetch("/api/user/profile", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ coverImage: url }) });
        setProfile((p) => ({ ...p, coverImage: url }));
        if (user) dispatch(setUser({ ...user, coverImage: url }));
      }
    } catch (err) { console.error(err); }
    finally { setCoverUploading(false); e.target.value = ""; }
  };

  // The My Pro Networks box lists only networks this user created (joined ones show as badges)
  const ownedNetworks = proNetworks.filter((net) => net.role === "OWNER");

  const saveInPageProfile = async () => {
    setSavingInPage(true);
    try {
      const res = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...profile, yearsExperience: profile.yearsExperience ? Number(profile.yearsExperience) : null }),
      });
      if (res.ok) {
        setSaveToast(true);
        window.dispatchEvent(new Event("profile-updated"));
        if (user) dispatch(setUser({ ...user, name: profile.name, headline: profile.headline, bio: profile.bio, image: profile.image, coverImage: profile.coverImage }));
        setTimeout(() => setSaveToast(false), 2500);
      }
    } catch (err) { console.error(err); }
    finally { setSavingInPage(false); }
  };

  useEffect(() => {
    const refresh = () => { void loadUserData(); };
    window.addEventListener("profile-updated", refresh);
    return () => window.removeEventListener("profile-updated", refresh);
  }, [loadUserData]);

  const profileShareUrl = typeof window !== "undefined" ? `${window.location.origin}/member/${user?.profileSlug || user?.id || ""}` : "";
  const shareText = `Check out ${profile.name || "my"} profile on TaxComPro!`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(profileShareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const onProfileUpdated = (updated: ProfileFormData) => {
    setProfile(updated);
    if (user) dispatch(setUser({ ...user, name: updated.name, headline: updated.headline, bio: updated.bio, image: updated.image, coverImage: updated.coverImage }));
  };

  if (loading) {
    return <div className="min-h-[70vh] flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-[#1E56A0]" /></div>;
  }

  // Listed on Find a Pro: professionals and anyone on a Marketplace plan
  const isListed = user?.tier === "MARKETPLACE" || user?.tier === "MARKETPLACE_PLUS";

  return (
    <div className="profile-editor max-w-[1440px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div className="profile-editor-heading"><div><p>Your professional identity</p><h1>Make your profile yours<span>.</span></h1></div><Link href={`/member/${user?.profileSlug || user?.id}`} className="profile-primary"><ExternalLink size={18} /> View public profile</Link></div>
      <input type="file" ref={avatarInputRef} onChange={handleAvatarUpload} accept="image/*" className="hidden" />
      <input type="file" ref={coverInputRef} onChange={handleCoverUpload} accept="image/*" className="hidden" />

      {/* Mobile Horizontal Tabs */}
      <div className="lg:hidden w-full overflow-x-auto scrollbar-none pb-1 flex gap-2">
        {MEMBER_SIDEBAR_TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap flex items-center gap-2 shrink-0 transition-all border ${
                isActive
                  ? "bg-[#ffbe24] text-[#0a1628] border-[#ffbe24] shadow-sm font-black"
                  : "bg-white dark:bg-[#172135] text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-800"
              }`}
            >
              <tab.icon className={`w-4 h-4 shrink-0 ${isActive ? "text-[#0a1628]" : "text-slate-400 dark:text-slate-500"}`} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      <div className="flex flex-col lg:flex-row gap-6 items-start w-full min-w-0">
        {/* ── DESKTOP SIDEBAR ────────────────────────────────────────────── */}
        <aside className="hidden lg:block w-72 shrink-0 sticky top-[92px] max-h-[calc(100vh-104px)] overflow-y-auto scrollbar-none self-start space-y-5 z-20">
          <div className="bg-white dark:bg-[#172135] rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-sm p-3.5 space-y-1">
            <div className="px-3.5 py-2 text-[11px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">PROFILE MENU</div>
            {MEMBER_SIDEBAR_TABS.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl text-sm font-bold tracking-normal transition-all text-left group ${isActive ? "profile-menu-active" : "text-slate-600 dark:text-slate-300 hover:text-[#0A1628] dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800/50"}`}
                >
                  <div className="flex items-center gap-3.5">
                    <tab.icon className={`w-5 h-5 shrink-0 transition-colors ${isActive ? "profile-accent" : "text-slate-400 dark:text-slate-500 group-hover:text-slate-600 dark:group-hover:text-slate-300"}`} />
                    <span className="leading-snug">{tab.label}</span>
                  </div>
                  {isActive && <ChevronRight className="w-4 h-4 profile-accent shrink-0" />}
                </button>
              );
            })}
          </div>

          {/* Become a Pro CTA - only if not already Pro or VIP */}
          {!isListed && (
            <div className="rounded-2xl bg-gradient-to-br from-[#0A1628] to-[#1A3A6B] p-5 sm:p-6 text-white border border-slate-800 shadow-md">
              <span className="text-[11px] font-black uppercase tracking-widest text-amber-400">GROW YOUR PRACTICE</span>
              <h4 className="text-sm font-extrabold text-white leading-snug mt-1.5 mb-2">Get Listed on Find a Pro</h4>
              <p className="text-xs text-slate-300 font-medium mb-5 leading-relaxed">Upgrade to a Marketplace plan and your profile is added to Find a Pro automatically.</p>
              <Link href="/upgrade" className="w-full block text-center py-3 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-[#0A1628] font-black text-xs uppercase tracking-wider transition-all active:scale-[0.98] shadow-sm">
                UPGRADE TO GET LISTED
              </Link>
            </div>
          )}
        </aside>

        {/* ── MAIN CONTENT ────────────────────────────────────────────────── */}
        <div className="w-full flex-1 min-w-0 space-y-6">

          {/* HERO CARD */}
          <div className="rounded-3xl bg-white dark:bg-[#172135] border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
            {/* Cover */}
            {profile.coverImage ? (
              <div className="relative h-40 sm:h-48 w-full overflow-hidden">
                <img src={profile.coverImage} alt="Cover" className="w-full h-full object-cover" />
                <button onClick={() => coverInputRef.current?.click()} disabled={coverUploading} title="Recommended: 1400 × 400 px (3.5:1 ratio) • JPG, PNG, WebP up to 5 MB" className="absolute top-3 right-3 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-black/50 hover:bg-black/70 backdrop-blur-sm text-white text-xs font-bold border border-white/20 transition-all">
                  {coverUploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Camera className="w-3.5 h-3.5" />}
                  Change Cover
                </button>
              </div>
            ) : (
              <div className="relative h-28 sm:h-32 w-full bg-slate-100 dark:bg-slate-800 flex flex-col items-center justify-center gap-1.5">
                <button onClick={() => coverInputRef.current?.click()} disabled={coverUploading} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-200 text-xs font-bold hover:border-[#1E56A0] hover:text-[#1E56A0] transition-all">
                  {coverUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
                  Add Cover Photo
                </button>
                <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Recommended: 1400 × 400 px (3.5:1 ratio) • up to 5 MB</span>
              </div>
            )}

            {/* Profile Info */}
            <div className="px-4 py-4 sm:px-8 sm:py-5">
              <div className="flex flex-col sm:flex-row gap-5">
                {/* Square Avatar */}
                <div className="relative shrink-0 w-24 h-24 sm:w-28 sm:h-28 -mt-14 sm:-mt-16 group self-start">
                  <div className="w-full h-full rounded-2xl overflow-hidden bg-gradient-to-br from-[#0A1628] to-[#1E56A0] ring-4 ring-white dark:ring-[#172135] shadow-lg flex items-center justify-center">
                    {profile.image ? (
                      <img src={profile.image} alt={profile.name} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-white font-black text-3xl">{(profile.name || "?")[0]?.toUpperCase()}</span>
                    )}
                  </div>
                  <button
                    onClick={() => avatarInputRef.current?.click()}
                    disabled={avatarUploading}
                    className="absolute inset-0 rounded-2xl bg-black/40 text-white flex flex-col items-center justify-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer z-10"
                    title="Change photo (Recommended: 400 × 400 px square • JPG, PNG, WebP up to 5 MB)"
                  >
                    {avatarUploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Camera className="w-5 h-5" />}
                  </button>
                  {user?.isBrandAmbassador ? (
                    <div
                      className="absolute -bottom-2 -right-2 drop-shadow-[0_2px_8px_rgba(0,0,0,0.65)] z-20 transition-transform duration-200 hover:scale-110"
                      title="Official TCP Brand Ambassador"
                    >
                      <BrandAmbassadorBadge size={30} showTooltip={false} />
                    </div>
                  ) : (
                    <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-emerald-500 border-[3px] border-white dark:border-[#172135] z-20 pointer-events-none" />
                  )}
                </div>

                {/* Name & meta */}
                <div className="flex-1 min-w-0 space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <div className="flex items-center gap-2">
                      <h1 className="text-xl sm:text-2xl font-black text-[#0A1628] dark:text-white tracking-tight truncate">{profile.name || "Your Name"}</h1>
                      {user?.isBrandAmbassador && (
                        <BrandAmbassadorBadge size={24} tooltipPosition="top" />
                      )}
                    </div>
                    {user?.isBrandAmbassador && (
                      <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-gradient-to-r from-amber-500/15 via-yellow-500/10 to-amber-500/15 text-amber-600 dark:text-amber-300 border border-amber-500/40 text-[10px] font-black tracking-wider uppercase shadow-[0_0_12px_rgba(245,158,11,0.2)]">
                        <BrandAmbassadorBadge size={14} showTooltip={false} />
                        Brand Ambassador
                      </span>
                    )}
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-blue-50 dark:bg-blue-500/20 text-[#1E56A0] dark:text-blue-300 border border-blue-200 dark:border-blue-500/30 text-[10px] font-black tracking-wider uppercase">
                      <ShieldCheck className="w-3 h-3" />
                      {stats.tierName}
                    </span>
                  </div>
                  {profile.headline && <p className="text-sm font-medium text-slate-600 dark:text-slate-300">{profile.headline}</p>}
                  <div className="flex flex-wrap items-center gap-4 text-xs font-semibold text-slate-500 dark:text-slate-400 pt-0.5">
                    {profile.location && <span className="flex items-center gap-1 profile-accent"><MapPin className="w-3.5 h-3.5" />{profile.location}</span>}
                    {stats.memberSince && <span className="text-slate-400 dark:text-slate-500">Member Since: {stats.memberSince}</span>}
                  </div>

                  {/* Actions */}
                  <div className="flex flex-wrap items-center gap-2.5 pt-3">
                    <button onClick={() => setEditModalOpen(true)} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#1E56A0] hover:bg-[#16437E] text-white text-xs font-bold transition-all shadow-sm cursor-pointer">
                      <Edit3 className="w-3.5 h-3.5" /> EDIT PROFILE
                    </button>
                    {!isListed && (
                      <Link href="/upgrade" className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-[#0A1628] text-xs font-black uppercase tracking-wider transition-all shadow-sm cursor-pointer">
                        <Sparkles className="w-3.5 h-3.5" /> GET LISTED
                      </Link>
                    )}
                    <button
                      onClick={() => setShareDialogOpen(true)}
                      className="flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-[#1E56A0] hover:text-[#1E56A0] bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-200 text-xs font-bold transition-all cursor-pointer"
                    >
                      <Share2 className="w-3.5 h-3.5" />
                      SHARE
                    </button>
                    <button
                      onClick={() => setPromoteModalOpen(true)}
                      className="flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-[#1E56A0] hover:text-[#1E56A0] bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-200 text-xs font-bold transition-all shadow-sm cursor-pointer"
                    >
                      <Megaphone className="w-3.5 h-3.5 text-amber-500" />
                      PROMOTE NETWORK
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ── PRO NETWORK STATS BAR (100% DYNAMIC) ────────────────────────── */}
          <div className="rounded-3xl bg-white dark:bg-[#172135] border border-slate-200/90 dark:border-slate-800 p-3 sm:p-5 shadow-xs mb-6 transition-colors overflow-hidden">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-0 sm:divide-x divide-slate-100 dark:divide-slate-800/80">
              {/* 1. CONNECTIONS */}
              <div className="flex items-center gap-2.5 sm:gap-3.5 p-2 sm:p-0 sm:px-3 sm:first:pl-2 rounded-xl bg-slate-50/60 dark:bg-slate-800/40 sm:bg-transparent min-w-0">
                <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-full border border-blue-500/25 bg-blue-500/10 dark:bg-blue-500/20 text-[#1E56A0] dark:text-blue-400 flex items-center justify-center shrink-0">
                  <Users className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-base sm:text-2xl font-black text-[#0A1628] dark:text-white leading-tight tracking-tight truncate">
                    {proStats.connections.toLocaleString()}
                  </p>
                  <p className="text-[9px] sm:text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                    CONNECTIONS
                  </p>
                </div>
              </div>

              {/* 2. PRO NETWORK MEMBERS */}
              <div className="flex items-center gap-2.5 sm:gap-3.5 p-2 sm:p-0 sm:px-3 sm:pl-4 rounded-xl bg-slate-50/60 dark:bg-slate-800/40 sm:bg-transparent min-w-0">
                <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-full border border-blue-500/25 bg-blue-500/10 dark:bg-blue-500/20 text-[#1E56A0] dark:text-blue-400 flex items-center justify-center shrink-0">
                  <Users2 className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-base sm:text-2xl font-black text-[#0A1628] dark:text-white leading-tight tracking-tight truncate">
                    {proStats.proNetworkMembers.toLocaleString()}
                  </p>
                  <p className="text-[9px] sm:text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                    PRO NETWORK MEMBERS
                  </p>
                </div>
              </div>

              {/* 3. PRO NETWORKS OWNED */}
              <div className="flex items-center gap-2.5 sm:gap-3.5 p-2 sm:p-0 sm:px-3 sm:pl-4 rounded-xl bg-slate-50/60 dark:bg-slate-800/40 sm:bg-transparent min-w-0">
                <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-full border border-blue-500/25 bg-blue-500/10 dark:bg-blue-500/20 text-[#1E56A0] dark:text-blue-400 flex items-center justify-center shrink-0">
                  <Star className="w-4 h-4 sm:w-5 sm:h-5 fill-[#1E56A0]/20 dark:fill-blue-400/20" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-base sm:text-2xl font-black text-[#0A1628] dark:text-white leading-tight tracking-tight truncate">
                    {(proStats.proNetworksOwned + proStats.proNetworksJoined).toLocaleString()}
                  </p>
                  <p className="text-[9px] sm:text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                    PRO NETWORKS
                  </p>
                </div>
              </div>

              {/* 4. DISCUSSIONS STARTED */}
              <div className="flex items-center gap-2.5 sm:gap-3.5 p-2 sm:p-0 sm:px-3 sm:pl-4 rounded-xl bg-slate-50/60 dark:bg-slate-800/40 sm:bg-transparent min-w-0">
                <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-full border border-blue-500/25 bg-blue-500/10 dark:bg-blue-500/20 text-[#1E56A0] dark:text-blue-400 flex items-center justify-center shrink-0">
                  <MessageSquare className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-base sm:text-2xl font-black text-[#0A1628] dark:text-white leading-tight tracking-tight truncate">
                    {proStats.discussionsStarted.toLocaleString()}
                  </p>
                  <p className="text-[9px] sm:text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                    DISCUSSIONS
                  </p>
                </div>
              </div>

              {/* 5. PRO TALKS HOSTED */}
              <div className="col-span-2 sm:col-span-1 flex items-center gap-2.5 sm:gap-3.5 p-2 sm:p-0 sm:px-3 sm:last:pr-2 rounded-xl bg-slate-50/60 dark:bg-slate-800/40 sm:bg-transparent min-w-0">
                <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-full border border-blue-500/25 bg-blue-500/10 dark:bg-blue-500/20 text-[#1E56A0] dark:text-blue-400 flex items-center justify-center shrink-0">
                  <Video className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-base sm:text-2xl font-black text-[#0A1628] dark:text-white leading-tight tracking-tight truncate">
                    {proStats.proTalksHosted.toLocaleString()}
                  </p>
                  <p className="text-[9px] sm:text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                    PRO TALKS HOSTED
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* ── OVERVIEW ──────────────────────────────────────────────────── */}
          {activeTab === "overview" && (
          <div className="profile-overview">
            <BalancedColumns>
              <Column>
                <div className="profile-overview-about rounded-3xl bg-white dark:bg-[#172135] border border-slate-200 dark:border-slate-800 p-6 shadow-xs space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                    <h3 className="text-xs font-black text-[#0A1628] dark:text-white uppercase tracking-widest flex items-center gap-2"><UserCheck className="w-4 h-4 profile-accent" /> ABOUT ME</h3>
                    <button onClick={() => setActiveTab("basic")} className="text-xs font-bold profile-accent hover:underline flex items-center gap-1"><Edit3 className="w-3 h-3" /> Edit</button>
                  </div>
                  {profile.bio ? (
                    <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">{profile.bio}</p>
                  ) : (
                    <p className="text-sm text-slate-400 dark:text-slate-500 italic">No bio added yet. Click Edit to add your summary.</p>
                  )}

                  {/* Real stats only */}
                  {(stats.completedCourses > 0 || stats.totalEnrollments > 0 || stats.toolkitPurchases > 0) && (
                    <div className="flex flex-wrap gap-3 pt-2">
                      {stats.completedCourses > 0 && (
                        <div className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-100 dark:border-slate-700/80">
                          <BookOpen className="w-4 h-4 profile-accent" />
                          <div>
                            <p className="text-sm font-black text-[#0A1628] dark:text-white">{stats.completedCourses}</p>
                            <p className="text-[10px] font-bold text-slate-400 dark:text-slate-400">Courses Done</p>
                          </div>
                        </div>
                      )}
                      {stats.totalEnrollments > 0 && (
                        <div className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-100 dark:border-slate-700/80">
                          <Award className="w-4 h-4 text-amber-500" />
                          <div>
                            <p className="text-sm font-black text-[#0A1628] dark:text-white">{stats.totalEnrollments}</p>
                            <p className="text-[10px] font-bold text-slate-400 dark:text-slate-400">Enrollments</p>
                          </div>
                        </div>
                      )}
                      {stats.toolkitPurchases > 0 && (
                        <div className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-100 dark:border-slate-700/80">
                          <FolderDown className="w-4 h-4 text-purple-500" />
                          <div>
                            <p className="text-sm font-black text-[#0A1628] dark:text-white">{stats.toolkitPurchases}</p>
                            <p className="text-[10px] font-bold text-slate-400 dark:text-slate-400">Toolkits</p>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                  {/* Focus areas live inside About — one card */}
                  {profile.specialties.length > 0 && (
                  <div className="profile-about-section">
                    <div className="profile-about-section-head"><span>Tax Focus Areas</span></div>
                    <div className="flex flex-wrap gap-2">
                      {profile.specialties.map((spec) => (
                        <span key={spec} className="px-3 py-1.5 rounded-lg text-xs font-bold bg-[#EAF2FC] dark:bg-blue-500/15 text-[#1E56A0] dark:text-blue-300 border border-[#1E56A0]/20 dark:border-blue-500/30">{spec}</span>
                      ))}
                    </div>
                  </div>
                )}
                </div>

                {!isListed && (
                  <div className="rounded-2xl bg-gradient-to-br from-[#0A1628] to-[#1A3A6B] p-6 text-white border border-slate-800 space-y-3">
                    <span className="text-[10px] font-black uppercase tracking-widest text-amber-400">GROW YOUR PRACTICE</span>
                    <h3 className="text-sm font-extrabold text-white">Are you a Tax Professional?</h3>
                    <p className="text-xs text-slate-300 leading-relaxed">Upgrade to a Marketplace plan and you&apos;re listed on Find a Pro automatically.</p>
                    <Link href="/upgrade" className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 text-[#0A1628] font-black text-xs uppercase tracking-wider transition-all active:scale-98">
                      UPGRADE TO GET LISTED <ChevronRight className="w-4 h-4" />
                    </Link>
                  </div>
                )}
              </Column>
              <Column>
                <div className="rounded-3xl bg-white dark:bg-[#172135] border border-slate-200 dark:border-slate-800 p-4 sm:p-6 shadow-xs space-y-4">
                  <h3 className="text-xs font-black text-[#0A1628] dark:text-white uppercase tracking-widest flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
                    <Crown className="w-4 h-4 text-amber-500 shrink-0" />
                    <span>MEMBERSHIP STATUS</span>
                  </h3>
                  <div className="flex items-center justify-between gap-2.5 p-3 sm:p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 min-w-0">
                    <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                      <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-[#0A1628] text-amber-400 flex items-center justify-center shrink-0">
                        <Crown className="w-4 h-4 sm:w-5 sm:h-5" />
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-xs sm:text-sm font-black text-[#0A1628] dark:text-white truncate">{stats.tierName}</h4>
                        {stats.validThru && (
                          <p className="text-[10px] sm:text-[11px] font-semibold text-slate-500 dark:text-slate-400 truncate">Valid Thru: {stats.validThru}</p>
                        )}
                      </div>
                    </div>
                    <Link
                      href="/upgrade"
                      className="px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-lg bg-[#1E56A0] hover:bg-[#16437E] text-white text-[11px] sm:text-xs font-bold transition-all shrink-0"
                    >
                      UPGRADE
                    </Link>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-bold text-slate-700 dark:text-slate-300 pt-1">
                    {["Free Platform Access", "Training Library", "Community Forums", "Find a Pro Directory", "Certificates Record", "Support Center"].map((b) => (
                      <div key={b} className="flex items-center gap-1.5 min-w-0">
                        <span className="profile-accent shrink-0">✓</span>
                        <span className="truncate">{b}</span>
                      </div>
                    ))}
                  </div>
                </div>

              <div className="rounded-3xl bg-white dark:bg-[#172135] border border-slate-200 dark:border-slate-800 p-4 sm:p-6 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 gap-2">
                  <h3 className="text-xs font-black text-[#0A1628] dark:text-white uppercase tracking-widest flex items-center gap-2 shrink-0">
                    <Crown className="w-4 h-4 text-amber-500" />
                    <span>MY BADGES</span>
                  </h3>
                  <Link
                    href={primaryNetwork ? `/pro-networks/${primaryNetwork.slug}` : "/pro-networks/create"}
                    className="text-xs font-bold profile-accent hover:underline shrink-0"
                  >
                    Manage Badges
                  </Link>
                </div>

                <div className="flex flex-wrap items-center gap-4 sm:gap-6 pt-2">
                  {myBadges.map((badge) => (
                    <Link
                      key={badge.id}
                      href={`/pro-networks/${badge.networkSlug}`}
                      className="flex flex-col items-center gap-2 group cursor-pointer"
                    >
                      <NetworkEmblem
                        name={badge.networkName}
                        image={badge.customImage || badge.logoImage || badge.ownerImage || profile.image}
                        initials={badge.initials}
                        role={badge.role}
                        shape={badge.shape}
                        bgColor={badge.bgColor}
                        textColor={badge.textColor}
                        borderColor={badge.borderColor}
                      />

                      <div className="flex flex-col items-center text-center max-w-[110px] sm:max-w-[125px] pt-1">
                        <span className="text-xs font-black text-[#0A1628] dark:text-white line-clamp-1 group-hover:text-[#1E56A0] dark:group-hover:text-[#60a5fa] transition-colors">
                          {badge.networkName}
                        </span>
                        {badge.role === "OWNER" ? (
                          <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 line-clamp-1">
                            Owner: {badge.ownerName || profile.name}
                          </span>
                        ) : (
                          <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 line-clamp-1">
                            Member • {badge.ownerName ? `By ${badge.ownerName}` : "Active"}
                          </span>
                        )}
                      </div>
                    </Link>
                  ))}

                  {/* Decorative empty badge slot (no action) */}
                  <svg aria-hidden="true" width="76" height="88" viewBox="0 0 100 116" className="text-slate-300 dark:text-slate-600 shrink-0">
                    <path d="M50 3 L93 17 V55 C93 84 73 103 50 113 C27 103 7 84 7 55 V17 Z" fill="currentColor" fillOpacity="0.08" stroke="currentColor" strokeWidth="2" strokeDasharray="6 5" />
                    <path d="M50 44 V68 M38 56 H62" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
                  </svg>
                </div>
              </div>

                <div className="rounded-3xl bg-white dark:bg-[#172135] border border-slate-200 dark:border-slate-800 p-6 shadow-xs space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                    <h3 className="text-xs font-black text-[#0A1628] dark:text-white uppercase tracking-widest flex items-center gap-2">
                      <Crown className="w-4 h-4 text-amber-500" />
                      MY PRO NETWORKS
                    </h3>
                    <NetworksViewAllMenu />
                  </div>

                  {ownedNetworks.length > 0 ? (
                    <div className="space-y-3">
                      {ownedNetworks.map((net) => (
                        <div
                          key={net.id}
                          className="p-3.5 rounded-xl border border-slate-200/90 dark:border-slate-700/80 bg-slate-50/70 dark:bg-slate-800/60 hover:bg-white dark:hover:bg-slate-800 transition-all flex items-center justify-between gap-3"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-11 h-11 rounded-xl bg-[#0a1628] border border-amber-500/30 text-amber-400 font-black text-xs flex items-center justify-center shrink-0 shadow-xs overflow-hidden">
                              {net.logoImage ? (
                                <img src={net.logoImage} alt={net.name} className="w-full h-full object-cover" />
                              ) : (
                                net.name.slice(0, 3).toUpperCase()
                              )}
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <h4 className="text-xs font-black text-[#0A1628] dark:text-white truncate">
                                  {net.name}
                                </h4>
                                {net.role === "OWNER" ? (
                                  <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-black bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 shrink-0">
                                    👑 Owner
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-black bg-blue-500/15 text-[#1E56A0] dark:text-blue-300 border border-blue-500/30 shrink-0">
                                    Member
                                  </span>
                                )}
                              </div>
                              <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1 mt-0.5">
                                {net.tagline || net.description || "Advanced strategies, resources, and training for tax professionals."}
                              </p>
                              <div className="flex items-center gap-2 mt-1">
                                <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500">
                                  +{net.memberCount} Members
                                </span>
                              </div>
                            </div>
                          </div>

                          <Link
                            href={`/pro-networks/${net.slug}`}
                            className="px-3 py-1.5 rounded-lg bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200 hover:border-[#1E56A0] hover:text-[#1E56A0] text-xs font-bold transition-all shrink-0 uppercase tracking-wider"
                          >
                            {net.role === "OWNER" ? "MANAGE" : "VIEW"}
                          </Link>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-4 space-y-2">
                      <p className="text-xs text-slate-400">You haven&apos;t created any Pro Networks yet.</p>
                    </div>
                  )}

                  {/* Create New Pro Network Button */}
                  <Link
                    href="/pro-networks/create"
                    className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-[#1E56A0] hover:bg-[#16437E] text-white text-xs font-black uppercase tracking-wider transition-all shadow-sm"
                  >
                    <span>+ CREATE NEW PRO NETWORK</span>
                  </Link>
                </div>
              </Column>
            </BalancedColumns>

            {/* MEDIA GALLERY — view only, filterable */}
            {profile.mediaPhotos.length + feedPhotos.length > 0 && (
              <ProfileMediaStrip uploads={profile.mediaPhotos} feed={feedPhotos} />
            )}

            {/* Disclaimer */}
            <div className="profile-overview-note">
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  All services and resources offered on the{" "}
                  <span className="font-bold text-slate-700 dark:text-slate-300">
                    {primaryNetwork?.name || "member’s profile"}
                  </span>{" "}
                  are independent offerings by{" "}
                  <span className="font-bold text-slate-700 dark:text-slate-300">{profile.name || "this member"}</span>.{" "}
                  <span className="font-semibold text-slate-700 dark:text-slate-300">Tax Compliance Pro</span>{" "}
                  does not endorse or moderate these services.
                </p>
            </div>
          </div>
        )}

          {/* ── BASIC INFO ────────────────────────────────────────────────── */}
          {activeTab === "basic" && (
            <div className="rounded-3xl bg-white dark:bg-[#172135] border border-slate-200 dark:border-slate-800 p-6 sm:p-8 shadow-xs space-y-6">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
                <h2 className="text-base font-black text-[#0A1628] dark:text-white uppercase tracking-wider flex items-center gap-2"><Edit3 className="w-5 h-5 profile-accent" /> Basic Information</h2>
                <button onClick={saveInPageProfile} disabled={savingInPage} className="px-5 py-2.5 rounded-xl bg-[#1E56A0] hover:bg-[#16437E] text-white text-xs font-bold transition-all disabled:opacity-50 flex items-center gap-1.5">
                  {savingInPage ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                  {saveToast ? "Saved!" : "Save Changes"}
                </button>
              </div>
              <div className="grid sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">Full Name</label>
                  <input type="text" value={profile.name} onChange={(e) => setProfile((p) => ({ ...p, name: e.target.value }))} className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm font-medium focus:border-[#1E56A0] focus:ring-2 focus:ring-[#1E56A0]/10 outline-none" />
                </div>
                <div>
                  <label htmlFor="editor-professional-title" className="block text-sm font-semibold mb-2">Professional title / role</label>
                  <select id="editor-professional-title" value={profile.professionalTitle || ""} onChange={e => setProfile(p => ({ ...p, professionalTitle: e.target.value }))} className="w-full rounded-xl border border-slate-200 dark:border-slate-700 px-3.5 py-3 text-sm">
                    <option value="">Select your title</option>
                    {PROFESSIONAL_TITLES.map(title => <option key={title}>{title}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">Location</label>
                  <input type="text" value={profile.location} onChange={(e) => setProfile((p) => ({ ...p, location: e.target.value }))} placeholder="e.g. Houston, Texas" className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm font-medium focus:border-[#1E56A0] focus:ring-2 focus:ring-[#1E56A0]/10 outline-none" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">About Me / Bio</label>
                <textarea rows={4} value={profile.bio} onChange={(e) => setProfile((p) => ({ ...p, bio: e.target.value }))} className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm font-medium focus:border-[#1E56A0] focus:ring-2 focus:ring-[#1E56A0]/10 outline-none resize-none" />
              </div>
            </div>
          )}

          {/* ── LEARNING ──────────────────────────────────────────────────── */}
          {activeTab === "learning" && (
            <div className="rounded-3xl bg-white dark:bg-[#172135] border border-slate-200 dark:border-slate-800 p-6 sm:p-8 shadow-xs space-y-6">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
                <h2 className="text-base font-black text-[#0A1628] dark:text-white uppercase tracking-wider flex items-center gap-2"><BookOpen className="w-5 h-5 profile-accent" /> My Courses</h2>
                <Link href="/courses" className="px-4 py-2 rounded-xl bg-[#1E56A0] text-white text-xs font-bold hover:bg-[#16437E] transition-all">Browse Courses</Link>
              </div>
              <div className="p-5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div>
                  <h3 className="text-sm font-extrabold text-[#0A1628] dark:text-white">Course Dashboard</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Access your training materials, quizzes, and certificates.</p>
                </div>
                <Link href="/my-courses" className="px-4 py-2 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-xs font-bold text-slate-800 dark:text-white rounded-xl hover:border-[#1E56A0] hover:text-[#1E56A0] transition-colors">Go to Dashboard →</Link>
              </div>
            </div>
          )}

          {/* ── BADGES ────────────────────────────────────────────────────── */}
          {activeTab === "badges" && (
            <div className="rounded-3xl bg-white dark:bg-[#172135] border border-slate-200 dark:border-slate-800 p-6 sm:p-8 shadow-xs space-y-6">
              <div className="border-b border-slate-100 dark:border-slate-800 pb-4">
                <h2 className="text-base font-black text-[#0A1628] dark:text-white uppercase tracking-wider flex items-center gap-2"><ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400" /> Badges & Due Diligence</h2>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Your verified compliance credentials.</p>
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-500/20 flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 flex items-center justify-center shrink-0"><ShieldCheck className="w-6 h-6" /></div>
                  <div>
                    <h4 className="text-sm font-black text-[#0A1628] dark:text-white">Due Diligence Verified</h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Earned by completing compliance training</p>
                  </div>
                </div>
                <div className="p-4 rounded-xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-500/20 flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-blue-100 dark:bg-blue-500/20 text-[#1E56A0] dark:text-blue-400 flex items-center justify-center shrink-0"><Check className="w-6 h-6" /></div>
                  <div>
                    <h4 className="text-sm font-black text-[#0A1628] dark:text-white">Verified Member</h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Account and email verified</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── PURCHASES ─────────────────────────────────────────────────── */}
          {activeTab === "purchases" && (
            <div className="rounded-3xl bg-white dark:bg-[#172135] border border-slate-200 dark:border-slate-800 p-6 sm:p-8 shadow-xs space-y-6">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
                <div>
                  <h2 className="text-base font-black text-[#0A1628] dark:text-white uppercase tracking-wider flex items-center gap-2"><FolderDown className="w-5 h-5 profile-accent" /> Purchased Toolkits</h2>
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Download your IRS compliance toolkits.</p>
                </div>
                <Link href="/toolkits" className="px-4 py-2 rounded-xl bg-[#1E56A0] text-white text-xs font-bold hover:bg-[#16437E] transition-all">Explore Toolkits</Link>
              </div>
              {purchasesLoading ? (
                <div className="py-12 flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-[#1E56A0]" /></div>
              ) : purchases.length > 0 ? (
                <div className="grid sm:grid-cols-2 gap-4">
                  {purchases.map((p) => (
                    <div key={p.id} className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{p.emoji || "📦"}</span>
                        <div>
                          <h4 className="text-xs font-bold text-[#0A1628] dark:text-white">{p.name}</h4>
                          <p className="text-[10px] text-slate-400 dark:text-slate-500">{new Date(p.createdAt).toLocaleDateString()}</p>
                        </div>
                      </div>
                      {p.downloadUrl && <a href={p.downloadUrl} target="_blank" rel="noreferrer" className="p-2 bg-[#1E56A0] text-white rounded-xl hover:bg-[#16437E] transition-colors"><Download className="w-4 h-4" /></a>}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="py-8 text-center text-slate-400 dark:text-slate-500 text-xs">No toolkits purchased yet.</p>
              )}
            </div>
          )}

          {/* ── MEMBERSHIP ────────────────────────────────────────────────── */}
          {activeTab === "membership" && (
            <div className="rounded-3xl bg-white dark:bg-[#172135] border border-slate-200 dark:border-slate-800 p-6 sm:p-8 shadow-xs space-y-6">
              <div className="border-b border-slate-100 dark:border-slate-800 pb-4">
                <h2 className="text-base font-black text-[#0A1628] dark:text-white uppercase tracking-wider flex items-center gap-2"><Crown className="w-5 h-5 text-amber-500" /> Membership Plan</h2>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Manage your plan and benefits.</p>
              </div>
              <div className="p-5 rounded-xl bg-gradient-to-r from-amber-500/10 to-amber-600/10 dark:from-amber-500/15 dark:to-amber-600/15 border border-amber-300/40 dark:border-amber-500/30 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-amber-700 dark:text-amber-400">CURRENT TIER</span>
                  <h3 className="text-lg font-black text-[#0A1628] dark:text-white">{stats.tierName}</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Access to standard member features</p>
                </div>
                <Link href="/upgrade" className="px-5 py-2.5 bg-gradient-to-r from-amber-400 to-amber-500 text-[#0A1628] font-black text-xs uppercase tracking-wider rounded-xl shadow-md transition-all">UPGRADE TO VIP</Link>
              </div>
            </div>
          )}
        </div>
      </div>

      <EditProfileModal isOpen={editModalOpen} onClose={() => setEditModalOpen(false)} initialData={profile} userId={user?.id || ""} role={user?.role || "MEMBER"} onSaveSuccess={onProfileUpdated} />

      {/* Share Profile Dialog */}
      {shareDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShareDialogOpen(false)} />
          <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 p-6 space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-black text-[#0A1628] tracking-tight">Share Your Profile</h3>
              <button onClick={() => setShareDialogOpen(false)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex items-center gap-2 p-3 rounded-xl bg-slate-50 border border-slate-200">
              <Link2 className="w-4 h-4 text-slate-400 shrink-0" />
              <p className="text-xs font-medium text-slate-600 truncate flex-1">{profileShareUrl}</p>
              <button
                onClick={handleCopyLink}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 ${
                  copied ? "bg-emerald-100 text-emerald-700" : "bg-[#1E56A0] text-white hover:bg-[#16437E]"
                }`}
              >
                {copied ? "Copied!" : "Copy"}
              </button>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <a
                href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(profileShareUrl)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-col items-center gap-2 p-4 rounded-xl border border-slate-200 hover:border-blue-300 hover:bg-blue-50 transition-all group"
              >
                <div className="w-10 h-10 rounded-full bg-[#1877F2] flex items-center justify-center text-white shadow-md group-hover:scale-110 transition-transform">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" /></svg>
                </div>
                <span className="text-[11px] font-bold text-slate-600">Facebook</span>
              </a>

              <a
                href={`https://twitter.com/intent/tweet?url=${encodeURIComponent(profileShareUrl)}&text=${encodeURIComponent(shareText)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-col items-center gap-2 p-4 rounded-xl border border-slate-200 hover:border-slate-400 hover:bg-slate-50 transition-all group"
              >
                <div className="w-10 h-10 rounded-full bg-black flex items-center justify-center text-white shadow-md group-hover:scale-110 transition-transform">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" /></svg>
                </div>
                <span className="text-[11px] font-bold text-slate-600">X / Twitter</span>
              </a>

              <a
                href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(profileShareUrl)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-col items-center gap-2 p-4 rounded-xl border border-slate-200 hover:border-blue-300 hover:bg-blue-50 transition-all group"
              >
                <div className="w-10 h-10 rounded-full bg-[#0A66C2] flex items-center justify-center text-white shadow-md group-hover:scale-110 transition-transform">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" /></svg>
                </div>
                <span className="text-[11px] font-bold text-slate-600">LinkedIn</span>
              </a>

              <a
                href={`https://api.whatsapp.com/send?text=${encodeURIComponent(shareText + " " + profileShareUrl)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-col items-center gap-2 p-4 rounded-xl border border-slate-200 hover:border-green-300 hover:bg-green-50 transition-all group"
              >
                <div className="w-10 h-10 rounded-full bg-[#25D366] flex items-center justify-center text-white shadow-md group-hover:scale-110 transition-transform">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" /></svg>
                </div>
                <span className="text-[11px] font-bold text-slate-600">WhatsApp</span>
              </a>

              <a
                href={`mailto:?subject=${encodeURIComponent(shareText)}&body=${encodeURIComponent(shareText + "\n\n" + profileShareUrl)}`}
                className="flex flex-col items-center gap-2 p-4 rounded-xl border border-slate-200 hover:border-red-300 hover:bg-red-50 transition-all group"
              >
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center text-white shadow-md group-hover:scale-110 transition-transform">
                  <Mail className="w-5 h-5" />
                </div>
                <span className="text-[11px] font-bold text-slate-600">Email</span>
              </a>

              <button
                onClick={handleCopyLink}
                className="flex flex-col items-center gap-2 p-4 rounded-xl border border-slate-200 hover:border-[#1E56A0]/30 hover:bg-blue-50 transition-all group"
              >
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white shadow-md group-hover:scale-110 transition-transform ${copied ? "bg-emerald-500" : "bg-[#1E56A0]"}`}>
                  {copied ? <Check className="w-5 h-5" /> : <Link2 className="w-5 h-5" />}
                </div>
                <span className="text-[11px] font-bold text-slate-600">{copied ? "Copied!" : "Copy Link"}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── PROMOTE NETWORK MODAL ────────────────────────────────────────── */}
      {promoteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-[#172135] border border-slate-200 dark:border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
                  <Megaphone className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-black text-[#0A1628] dark:text-white">Promote Pro Network</h3>
                  <p className="text-[11px] font-bold text-slate-400">Share your network with clients &amp; peers</p>
                </div>
              </div>
              <button
                onClick={() => setPromoteModalOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {proStats.proNetworksOwned > 0 && proStats.primaryNetworkSlug ? (
              <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700/60 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-[#0A1628] dark:text-white truncate">
                      {proStats.primaryNetworkName || "Your Pro Network"}
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 uppercase">
                      ACTIVE
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Invite professionals and clients to join your private mastermind, unlock your resources, and attend your live Pro Talks.
                  </p>
                </div>

                {/* Direct Link box */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    Direct Network Link
                  </label>
                  <div className="flex items-center gap-2 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50">
                    <input
                      type="text"
                      readOnly
                      value={`${typeof window !== "undefined" ? window.location.origin : "https://taxcomppro.com"}/pro-networks/${proStats.primaryNetworkSlug}`}
                      className="flex-1 bg-transparent text-xs font-mono font-medium text-slate-700 dark:text-slate-300 outline-none truncate select-all"
                    />
                    <button
                      onClick={() => {
                        const url = `${window.location.origin}/pro-networks/${proStats.primaryNetworkSlug}`;
                        navigator.clipboard.writeText(url);
                        setNetworkCopied(true);
                        setTimeout(() => setNetworkCopied(false), 2000);
                      }}
                      className="px-3 py-1.5 rounded-lg bg-[#1E56A0] hover:bg-[#16437E] text-white text-xs font-bold transition-all shrink-0 cursor-pointer flex items-center gap-1.5"
                    >
                      {networkCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{networkCopied ? "Copied!" : "Copy"}</span>
                    </button>
                  </div>
                </div>

                {/* Quick Social Share Buttons */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    Share Instantly
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    <a
                      href={`https://twitter.com/intent/tweet?url=${encodeURIComponent(`${typeof window !== "undefined" ? window.location.origin : "https://taxcomppro.com"}/pro-networks/${proStats.primaryNetworkSlug}`)}&text=${encodeURIComponent(`Join my private Pro Network "${proStats.primaryNetworkName || "on Tax Compliance Pro"}" for exclusive compliance tools and masterclasses:`)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex flex-col items-center gap-1.5 p-3 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all text-slate-700 dark:text-slate-300"
                    >
                      <div className="w-8 h-8 rounded-full bg-black text-white flex items-center justify-center">
                        <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" /></svg>
                      </div>
                      <span className="text-[10px] font-bold">X</span>
                    </a>

                    <a
                      href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(`${typeof window !== "undefined" ? window.location.origin : "https://taxcomppro.com"}/pro-networks/${proStats.primaryNetworkSlug}`)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex flex-col items-center gap-1.5 p-3 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-blue-300 hover:bg-blue-50 dark:hover:bg-blue-950/30 transition-all text-slate-700 dark:text-slate-300"
                    >
                      <div className="w-8 h-8 rounded-full bg-[#0A66C2] text-white flex items-center justify-center">
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" /></svg>
                      </div>
                      <span className="text-[10px] font-bold">LinkedIn</span>
                    </a>

                    <a
                      href={`https://api.whatsapp.com/send?text=${encodeURIComponent(`Join my private Pro Network "${proStats.primaryNetworkName || "on Tax Compliance Pro"}": ${typeof window !== "undefined" ? window.location.origin : "https://taxcomppro.com"}/pro-networks/${proStats.primaryNetworkSlug}`)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex flex-col items-center gap-1.5 p-3 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 transition-all text-slate-700 dark:text-slate-300"
                    >
                      <div className="w-8 h-8 rounded-full bg-[#25D366] text-white flex items-center justify-center">
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" /></svg>
                      </div>
                      <span className="text-[10px] font-bold">WhatsApp</span>
                    </a>

                    <Link
                      href={`/pro-networks/${proStats.primaryNetworkSlug}`}
                      className="flex flex-col items-center gap-1.5 p-3 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950/30 transition-all text-slate-700 dark:text-slate-300"
                    >
                      <div className="w-8 h-8 rounded-full bg-amber-500 text-[#0A1628] flex items-center justify-center">
                        <ExternalLink className="w-4 h-4" />
                      </div>
                      <span className="text-[10px] font-bold">Open Hub</span>
                    </Link>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-6 space-y-4">
                <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center mx-auto">
                  <Star className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-sm font-black text-[#0A1628] dark:text-white">You haven&apos;t created a Pro Network yet</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs mx-auto">
                    Launch your private subscription mastermind with custom badges, live Pro Talks, and discussion feeds.
                  </p>
                </div>
                <Link
                  href="/pro-networks/create"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#ffbe24] to-[#ffbe24] text-[#0a1628] font-black text-xs shadow-md hover:shadow-lg transition-all"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Launch Pro Network</span>
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

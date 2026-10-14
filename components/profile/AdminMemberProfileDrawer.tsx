"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import { MemberAccessPanel } from "./MemberAccessPanel";
import "./member-management.css";
import {
  X,
  Mail,
  Calendar,
  Shield,
  Crown,
  CreditCard,
  Gift,
  KeyRound,
  Trash2,
  ExternalLink,
  DollarSign,
  UserCheck,
  Clock,
  AlertCircle,
  FileText,
  Loader2,
  ShieldCheck,
  Unlock,
  Package,
} from "lucide-react";
import { getToolkit } from "@/lib/toolkits";
import { BrandAmbassadorBadge } from "@/components/badges/BrandAmbassadorBadge";

interface AdminMemberProfileDrawerProps {
  userId: string | null;
  initialTab?: "overview" | "access" | "membership" | "affiliate" | "payments" | "courses" | "card";
  onClose: () => void;
  onGiftMembership?: (user: any) => void;
  onResetPassword?: (user: any) => void;
  onUpdateRoleTier?: (user: any) => void;
  onDeleteUser?: (user: any) => void;
  onAccessUpdated?: () => void;
}

const roleBadges: Record<string, { label: string; className: string; icon: React.ElementType }> = {
  MEMBER: { label: "Member", className: "bg-slate-800 text-slate-300 border-slate-700", icon: Shield },
  ADMIN:  { label: "Admin",  className: "bg-amber-500/15 text-amber-400 border-amber-500/30", icon: Crown },
};

const tierBadges: Record<string, { label: string; className: string }> = {
  FREE:             { label: "Free Plan",        className: "bg-slate-800 text-slate-400 border-slate-700" },
  VIP:              { label: "VIP Member",       className: "bg-amber-500/15 text-amber-400 border-amber-500/30" },
  MARKETPLACE:      { label: "Marketplace",      className: "bg-indigo-500/15 text-indigo-400 border-indigo-500/30" },
  MARKETPLACE_PLUS: { label: "Marketplace Plus", className: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" },
};

export function AdminMemberProfileDrawer({
  userId,
  initialTab = "overview",
  onClose,
  onGiftMembership,
  onResetPassword,
  onDeleteUser,
  onAccessUpdated,
}: AdminMemberProfileDrawerProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const userRequest = useRef<AbortController | null>(null);
  const accessRequest = useRef<AbortController | null>(null);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<
    "overview" | "access" | "membership" | "affiliate" | "payments" | "courses" | "card"
  >(initialTab);
  const [togglingAmbassador, setTogglingAmbassador] = useState(false);

  // Access & Entitlements State
  const [accessData, setAccessData] = useState<any>(null);
  const [loadingAccess, setLoadingAccess] = useState(false);
  const [accessError, setAccessError] = useState<string | null>(null);
  const [accessActionBusy, setAccessActionBusy] = useState<string | null>(null);
  const [accessNotice, setAccessNotice] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [revokeConfirm, setRevokeConfirm] = useState<{ itemType: string; itemId: string; name: string } | null>(null);

  // Custom Grant Modal inside drawer
  const [grantModalOpen, setGrantModalOpen] = useState(false);
  const [grantItemType, setGrantItemType] = useState<"bundle" | "toolkit" | "course">("bundle");
  const [grantItemId, setGrantItemId] = useState<string>("ultimate-bundle-plus");
  const [grantBonusMonths, setGrantBonusMonths] = useState(0);
  const [grantStaffSeats, setGrantStaffSeats] = useState(10);
  const [grantNotify, setGrantNotify] = useState(true);

  // Load User details
  const loadUser = useCallback(() => {
    if (!userId) {
      setUser(null);
      return;
    }
    userRequest.current?.abort();
    const controller = new AbortController();
    userRequest.current = controller;
    setLoading(true);
    setError(null);
    fetch(`/api/admin/users/${userId}`, { signal: controller.signal })
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch user details");
        return res.json();
      })
      .then((data) => setUser(data))
      .catch((err) => { if (!controller.signal.aborted) setError(err.message || "Failed to load user"); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
  }, [userId]);

  // Load User Access Matrix
  const loadAccess = useCallback(() => {
    if (!userId) return;
    accessRequest.current?.abort();
    const controller = new AbortController();
    accessRequest.current = controller;
    setLoadingAccess(true);
    setAccessError(null);
    fetch(`/api/admin/users/${userId}/access`, { signal: controller.signal })
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load user access matrix");
        return res.json();
      })
      .then((data) => setAccessData(data))
      .catch((err) => { if (!controller.signal.aborted) setAccessError(err.message || "Could not load access records"); })
      .finally(() => { if (!controller.signal.aborted) setLoadingAccess(false); });
  }, [userId]);

  useEffect(() => {
    setUser(null);
    setAccessData(null);
    loadUser();
    return () => { userRequest.current?.abort(); accessRequest.current?.abort(); };
  }, [loadUser]);

  useEffect(() => {
    if (userId && (activeTab === "access" || activeTab === "overview" || activeTab === "courses")) {
      loadAccess();
    }
  }, [userId, activeTab, loadAccess]);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab, userId]);

  useEffect(() => {
    if (!userId) return;
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panelRef.current?.focus();
    const trap = (event: KeyboardEvent) => {
      if (event.key !== "Tab") return;
      const nodes = Array.from((panelRef.current?.querySelector<HTMLElement>("[data-member-subdialog]") ?? panelRef.current)?.querySelectorAll<HTMLElement>('button:not(:disabled), a[href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex="0"]') ?? []).filter(node => node.getClientRects().length);
      const first = nodes[0], last = nodes[nodes.length - 1];
      if (!first) { event.preventDefault(); return; }
      if (event.shiftKey && (document.activeElement === first || document.activeElement === panelRef.current)) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && (document.activeElement === last || document.activeElement === panelRef.current)) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener("keydown", trap);
    return () => { document.body.style.overflow = overflow; document.removeEventListener("keydown", trap); previous?.focus(); };
  }, [userId]);

  // Handle ESC key to close drawer
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (revokeConfirm) {
          setRevokeConfirm(null);
        } else if (grantModalOpen) {
          setGrantModalOpen(false);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose, revokeConfirm, grantModalOpen]);

  // Grant Access Handler
  const handleGrantAccess = async (
    itemType: "bundle" | "toolkit" | "course",
    itemId: string,
    options?: { months?: number; seats?: number; notify?: boolean }
  ) => {
    if (!userId) return;
    setAccessActionBusy(`${itemType}:${itemId}`);
    setAccessNotice(null);

    try {
      const res = await fetch(`/api/admin/users/${userId}/access`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          itemType,
          itemId,
          grantMembershipBonus: (options?.months ?? 0) > 0,
          membershipMonths: options?.months ?? 0,
          membershipTier: "MARKETPLACE_PLUS",
          staffSeats: options?.seats ?? (itemId === "ultimate-bundle-plus" ? 10 : 5),
          notifyUser: options?.notify ?? true,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to grant access");

      setGrantModalOpen(false);
      setAccessNotice({ type: "success", text: data.message || "Access successfully granted!" });
      loadAccess();
      loadUser();
      onAccessUpdated?.();
    } catch (err: any) {
      setAccessNotice({ type: "error", text: err.message || "Grant operation failed" });
    } finally {
      setAccessActionBusy(null);
    }
  };

  // Revoke Access Handler
  const handleRevokeAccess = async (itemType: string, itemId: string) => {
    if (!userId) return;
    setAccessActionBusy(`${itemType}:${itemId}`);
    setAccessNotice(null);

    try {
      const res = await fetch(`/api/admin/users/${userId}/access`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemType, itemId }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to revoke access");

      setAccessNotice({ type: "success", text: data.message || "Access revoked successfully." });
      loadAccess();
      loadUser();
      onAccessUpdated?.();
    } catch (err: any) {
      setAccessNotice({ type: "error", text: err.message || "Revoke operation failed" });
    } finally {
      setAccessActionBusy(null);
      setRevokeConfirm(null);
    }
  };

  const handleToggleBrandAmbassador = async () => {
    if (!user) return;
    setTogglingAmbassador(true);
    try {
      const res = await fetch(`/api/admin/users/${user.id}/role`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isBrandAmbassador: !user.isBrandAmbassador }),
      });
      if (res.ok) {
        const updated = await res.json();
        setUser((prev: any) => ({ ...prev, isBrandAmbassador: updated.isBrandAmbassador }));
        onAccessUpdated?.();
      } else { throw new Error("Could not update ambassador status."); }
    } catch (err: any) {
      setAccessNotice({ type: "error", text: err.message });
    } finally {
      setTogglingAmbassador(false);
    }
  };

  if (!userId) return null;

  const role = user?.role || "MEMBER";
  const tier = user?.tier || "FREE";
  const rc = roleBadges[role] || roleBadges.MEMBER;
  const tc = tierBadges[tier] || tierBadges.FREE;
  const RoleIcon = rc.icon;
  const sub = user?.subscription;
  const card = user?.digitalCard;
  const hasCard = card?.isPurchased || card?.isActivated;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="member-panel w-full max-w-5xl bg-slate-900 border-l border-slate-800 shadow-2xl flex flex-col h-full overflow-hidden text-slate-200 animate-in slide-in-from-right duration-300"
        ref={panelRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label="Member details"
      >
        {/* TOP HEADER */}
        <div className="flex flex-wrap gap-3 items-center justify-between px-6 py-4 border-b border-slate-800 bg-[#081220] shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 font-bold">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-white leading-tight">Member details</h2>
              <p className="text-xs text-slate-400 font-mono">ID: {userId}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleToggleBrandAmbassador}
              disabled={togglingAmbassador}
              className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                user?.isBrandAmbassador
                  ? "bg-amber-500/20 text-amber-300 border-amber-500/40 hover:bg-amber-500/30 shadow-sm shadow-amber-500/10"
                  : "bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700"
              }`}
              title="Toggle Brand Ambassador status for this member"
            >
              <img
                src="/brand-ambassador-badge.png"
                alt=""
                className="w-3.5 h-3.5 object-contain shrink-0"
              />
              <span className="hidden sm:inline">
                {user?.isBrandAmbassador ? "Ambassador Active" : "Make Ambassador"}
              </span>
            </button>

            {onGiftMembership && (
              <button
                onClick={() => onGiftMembership(user)}
                className="px-3 py-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                title="Gift Free Membership"
              >
                <Gift className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Gift Membership</span>
              </button>
            )}

            {onResetPassword && (
              <button
                onClick={() => onResetPassword(user)}
                className="px-3 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/20 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                title="Reset User Password"
              >
                <KeyRound className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Reset Password</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              aria-label="Close drawer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* BODY AREA */}
        {loading ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 py-20">
            <Loader2 className="w-8 h-8 text-amber-400 animate-spin" />
            <p className="text-sm font-medium text-slate-400">Loading user profile &amp; entitlements…</p>
          </div>
        ) : error || !user ? (
          <div className="p-8 text-center space-y-3">
            <AlertCircle className="w-10 h-10 text-red-400 mx-auto" />
            <h3 className="text-base font-bold text-white">{error || "User not found"}</h3>
            <button
              onClick={loadUser}
              className="px-4 py-2 rounded-xl bg-slate-800 text-xs font-bold text-slate-200 hover:bg-slate-700"
            >
              Try Again
            </button>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            {/* USER HERO BANNER */}
            <div className="p-6 bg-gradient-to-b from-[#091527] to-slate-900 border-b border-slate-800">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                {/* Avatar */}
                <div className="relative shrink-0">
                  {user.image ? (
                    <img
                      src={user.image}
                      alt={user.name}
                      className="w-16 h-16 rounded-2xl object-cover border-2 border-slate-700 shadow-md"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-500 to-amber-700 text-slate-950 font-black text-2xl flex items-center justify-center border border-amber-400/40 shadow-md">
                      {user.name?.charAt(0)?.toUpperCase() || "U"}
                    </div>
                  )}
                  {hasCard && (
                    <span
                      title="ProConnect Card Active"
                      className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-emerald-500 border-2 border-slate-900 flex items-center justify-center text-slate-950"
                    >
                      <CreditCard className="w-3 h-3" />
                    </span>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0 space-y-1.5">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <h3 className="text-xl font-black text-white truncate">{user.name}</h3>
                    {user.isBrandAmbassador && <BrandAmbassadorBadge size="md" />}
                    {/* Role Badge */}
                    <span
                      className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${rc.className}`}
                    >
                      <RoleIcon className="w-3 h-3" />
                      <span>{rc.label}</span>
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400">
                    <span className="flex items-center gap-1.5 text-slate-300 font-medium">
                      <Mail className="w-3.5 h-3.5 text-slate-400" />
                      <span>{user.email}</span>
                    </span>
                    {user.phone && (
                      <span className="text-slate-400">· {user.phone}</span>
                    )}
                    {user.headline && (
                      <span className="text-slate-400 truncate max-w-xs">· {user.headline}</span>
                    )}
                  </div>

                  {/* Tier & Sub info */}
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <span
                      className={`inline-flex items-center text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${tc.className}`}
                    >
                      {tc.label}
                    </span>

                    {sub?.currentPeriodEnd && new Date(sub.currentPeriodEnd) > new Date() && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                        <Clock className="w-3 h-3" />
                        <span>Valid until {new Date(sub.currentPeriodEnd).toLocaleDateString()}</span>
                      </span>
                    )}

                    <span className="text-[11px] text-slate-400 flex items-center gap-1 ml-auto">
                      <Calendar className="w-3 h-3 text-slate-400" />
                      <span>Joined {new Date(user.createdAt).toLocaleDateString()}</span>
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* NAVIGATION TABS */}
            <div className="flex items-center gap-1 px-6 border-b border-slate-800 bg-[#060f1e] overflow-x-auto">
              {[
                { id: "overview", label: "Overview", icon: UserCheck },
                { id: "access", label: "Learning access", icon: KeyRound },
                { id: "membership", label: "Membership", icon: Crown },
                { id: "payments", label: `Purchases (${user.toolkitPurchases?.length + (user.marketplacePurchases?.length || 0)})`, icon: DollarSign },
                { id: "card", label: "Connect Card", icon: CreditCard },
              ].map((tab) => {
                const Icon = tab.icon;
                const active = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`flex items-center gap-2 py-3 px-3.5 text-xs font-semibold whitespace-nowrap border-b-2 transition-all cursor-pointer ${
                      active
                        ? "border-amber-500 text-amber-400 bg-amber-500/5 font-bold"
                        : "border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {/* NOTICES */}
            {accessNotice && (
              <div
                className={`mx-6 mt-4 p-3 rounded-xl border flex items-center justify-between text-xs font-medium ${
                  accessNotice.type === "success"
                    ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-300"
                    : "bg-red-500/15 border-red-500/30 text-red-300"
                }`}
              >
                <span>{accessNotice.text}</span>
                <button
                  onClick={() => setAccessNotice(null)}
                  className="p-1 text-slate-400 hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* TAB CONTENTS */}
            <div className="p-6 space-y-6">
              {/* ═════════════════════════════════════════════════════════════════════════════════ */}
              {/* TAB: ACCESS & ENTITLEMENTS (PRIMARY FOCUS) */}
              {/* ═════════════════════════════════════════════════════════════════════════════════ */}
              {(activeTab === "access" || activeTab === "courses") && <MemberAccessPanel data={accessData} loading={loadingAccess} error={accessError} onRefresh={loadAccess} onGrant={(type, id) => { setGrantItemType(type); setGrantItemId(id); setGrantModalOpen(true); }} />}
              {activeTab === "overview" && (
                <div className="space-y-6 animate-in fade-in duration-150">
                  <section className="member-access"><h3>Account status</h3><div className="member-access-row"><span>Email</span><strong>{user.emailVerified ? "Verified" : "Not verified"}</strong><span>Phone</span><strong>{user.phone ? "Provided" : "Missing"}</strong></div><details><summary className="cursor-pointer py-3">Recent sign-ins</summary>{user.sessions?.length ? user.sessions.map((session: { id: string; createdAt: string; expiresAt: string; userAgent?: string }) => <div className="member-access-row" key={session.id}><div className="member-access-product"><strong>{new Date(session.createdAt).toLocaleString()}</strong><small className="break-all">{session.userAgent || "Device unavailable"}</small></div><span>{new Date(session.expiresAt) > new Date() ? "Active session" : "Expired"}</span></div>) : <p>No recent sessions recorded.</p>}</details></section>
                  {/* Stats Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="bg-slate-900/70 border border-slate-800 p-3.5 rounded-2xl">
                      <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Posts</div>
                      <div className="text-xl font-bold text-white mt-1">{user._count?.posts || 0}</div>
                    </div>
                    <div className="bg-slate-900/70 border border-slate-800 p-3.5 rounded-2xl">
                      <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Communities</div>
                      <div className="text-xl font-bold text-white mt-1">{user._count?.communityMembers || 0}</div>
                    </div>
                    <div className="bg-slate-900/70 border border-slate-800 p-3.5 rounded-2xl">
                      <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Courses</div>
                      <div className="text-xl font-bold text-amber-400 mt-1">{user._count?.enrollments || user.enrollments?.length || 0}</div>
                    </div>
                    <div className="bg-slate-900/70 border border-slate-800 p-3.5 rounded-2xl">
                      <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Toolkits</div>
                      <div className="text-xl font-bold text-emerald-400 mt-1">{user.toolkitPurchases?.length || 0}</div>
                    </div>
                  </div>

                  {/* Profile Details */}
                  <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 space-y-4">
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-amber-400" />
                      <span>Account Information</span>
                    </h4>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                      <div>
                        <span className="text-slate-400 block mb-0.5">Full Name</span>
                        <span className="font-semibold text-white">{user.name}</span>
                      </div>

                      <div>
                        <span className="text-slate-400 block mb-0.5">Email Address</span>
                        <span className="font-semibold text-white">{user.email}</span>
                      </div>

                      <div>
                        <span className="text-slate-400 block mb-0.5">Phone</span>
                        <span className="font-semibold text-white">{user.phone || "—"}</span>
                      </div>

                      <div>
                        <span className="text-slate-400 block mb-0.5">Location</span>
                        <span className="font-semibold text-white">{user.location || "—"}</span>
                      </div>

                      <div>
                        <span className="text-slate-400 block mb-0.5">Professional Title</span>
                        <span className="font-semibold text-white">{user.professionalTitle || "—"}</span>
                      </div>

                      <div>
                        <span className="text-slate-400 block mb-0.5">Years of Experience</span>
                        <span className="font-semibold text-white">{user.yearsExperience ? `${user.yearsExperience} yrs` : "—"}</span>
                      </div>
                    </div>

                    {user.bio && (
                      <div className="pt-3 border-t border-slate-800 text-xs">
                        <span className="text-slate-400 block mb-1">Biography</span>
                        <p className="text-slate-300 leading-relaxed">{user.bio}</p>
                      </div>
                    )}
                  </div>

                  {/* Danger Zone */}
                  {onDeleteUser && (
                    <div className="bg-red-500/5 border border-red-500/20 rounded-2xl p-5 space-y-3">
                      <h4 className="text-xs font-bold text-red-400 uppercase tracking-wider flex items-center gap-1.5">
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Danger Zone</span>
                      </h4>
                      <p className="text-xs text-slate-400 leading-relaxed">
                        Permanently delete this user account, subscription, sessions, Connect Card, and all related database records. This action cannot be undone.
                      </p>
                      <div className="pt-1">
                        <button
                          type="button"
                          onClick={() => onDeleteUser(user)}
                          className="px-4 py-2 rounded-xl bg-red-500/10 hover:bg-red-600 text-red-400 hover:text-white border border-red-500/30 hover:border-red-600 text-xs font-bold flex items-center gap-2 transition-all cursor-pointer shadow-sm"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Delete User Account</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ═════════════════════════════════════════════════════════════════════════════════ */}
              {/* TAB 2: MEMBERSHIP */}
              {/* ═════════════════════════════════════════════════════════════════════════════════ */}
              {activeTab === "membership" && (
                <div className="space-y-6 animate-in fade-in duration-150">
                  <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                          <Crown className="w-5 h-5" />
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-white">Current Tier: {tc.label}</h4>
                          <p className="text-xs text-slate-400">
                            Status: <span className="text-emerald-400 font-semibold">{sub?.status || "Active"}</span>
                          </p>
                        </div>
                      </div>

                      {onGiftMembership && (
                        <button
                          onClick={() => onGiftMembership(user)}
                          className="px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer"
                        >
                          <Gift className="w-3.5 h-3.5" />
                          <span>Add Free Months</span>
                        </button>
                      )}
                    </div>

                    {sub?.currentPeriodEnd && (
                      <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800 text-xs space-y-1">
                        <div className="flex justify-between text-slate-400">
                          <span>Subscription Expires / Renews</span>
                          <span className="font-mono text-emerald-400 font-bold">
                            {new Date(sub.currentPeriodEnd).toLocaleDateString("en-US", {
                              month: "long",
                              day: "numeric",
                              year: "numeric",
                            })}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ═════════════════════════════════════════════════════════════════════════════════ */}
              {activeTab === "payments" && (
                <div className="space-y-6 animate-in fade-in duration-150">
                  <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 space-y-3">
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                      <span>Toolkits &amp; Bundles Recorded ({user.toolkitPurchases?.length || 0})</span>
                    </h4>

                    {user.toolkitPurchases?.length === 0 ? (
                      <p className="text-xs text-slate-400">No toolkit purchases found.</p>
                    ) : (
                      <div className="space-y-2">
                        {user.toolkitPurchases.map((p: any) => {
                          const tk = getToolkit(p.toolkitId);
                          return (
                            <div
                              key={p.id}
                              className="bg-slate-950/60 border border-slate-800 p-3 rounded-xl flex items-center justify-between text-xs"
                            >
                              <div className="flex items-center gap-2.5">
                                <Package className="w-5 h-5" aria-hidden="true" />
                                <div>
                                  <div className="font-bold text-white">{tk?.name || p.toolkitId}</div>
                                  <div className="text-[11px] text-slate-400">
                                    {new Date(p.createdAt).toLocaleDateString()} · {p.membershipMonths} mo {p.membershipTier}
                                  </div>
                                </div>
                              </div>
                              <span className="font-mono text-[10px] text-slate-400 truncate max-w-[150px]">
                                {p.stripeSessionId?.startsWith("admin_") ? "Admin Grant" : p.stripeSessionId}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ═════════════════════════════════════════════════════════════════════════════════ */}
              {/* TAB 5: COURSES */}
              {/* ═════════════════════════════════════════════════════════════════════════════════ */}
              {activeTab === "card" && (
                <div className="space-y-6 animate-in fade-in duration-150">
                  {hasCard ? (
                    <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                            <CreditCard className="w-5 h-5" />
                          </div>
                          <div>
                            <h4 className="text-sm font-bold text-white">
                              {card.businessName || card.professionalTitle || "Digital Connect Card"}
                            </h4>
                            <p className="text-xs text-emerald-400 font-mono">@{card.username}</p>
                          </div>
                        </div>

                        {card.username && (
                          <Link
                            href={`/connect/${card.username}`}
                            target="_blank"
                            className="px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer"
                          >
                            <span>View Live</span>
                            <ExternalLink className="w-3 h-3" />
                          </Link>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-8 text-center space-y-2">
                      <CreditCard className="w-10 h-10 text-slate-400 mx-auto opacity-50 mb-2" />
                      <h4 className="text-sm font-bold text-white">No Connect Card</h4>
                      <p className="text-xs text-slate-400 max-w-sm mx-auto">
                        This user has not yet purchased or activated a Digital Connect Card.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ═════════════════════════════════════════════════════════════════════════════════ */}
        {/* REVOCATION CONFIRMATION MODAL */}
        {/* ═════════════════════════════════════════════════════════════════════════════════ */}
        {revokeConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-100">
            <div className="bg-slate-900 border border-red-500/30 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
              <div className="flex items-center gap-3 text-red-400">
                <AlertCircle className="w-6 h-6 shrink-0" />
                <h3 className="text-base font-black text-white">Revoke {revokeConfirm.name}?</h3>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed">
                Are you sure you want to revoke manual access to <strong className="text-white">{revokeConfirm.name}</strong> for {user?.name}? The member will no longer have access to downloads or lessons associated with this {revokeConfirm.itemType}.
              </p>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  onClick={() => setRevokeConfirm(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleRevokeAccess(revokeConfirm.itemType, revokeConfirm.itemId)}
                  disabled={!!accessActionBusy}
                  className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-black flex items-center gap-1.5 shadow-lg shadow-red-600/30 cursor-pointer"
                >
                  {accessActionBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                  <span>Revoke Access</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ═════════════════════════════════════════════════════════════════════════════════ */}
        {/* CUSTOM GRANT MODAL */}
        {/* ═════════════════════════════════════════════════════════════════════════════════ */}
        {grantModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-100">
            <div data-member-subdialog role="dialog" aria-modal="true" aria-label="Grant product access" className="bg-slate-900 border border-amber-500/30 rounded-2xl p-6 max-w-lg w-full shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2.5 text-amber-400">
                  <ShieldCheck className="w-5 h-5" />
                  <h3 className="text-base font-black text-white">Grant Product Access</h3>
                </div>
                <button
                  onClick={() => setGrantModalOpen(false)}
                  className="p-1 text-slate-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-4 text-xs">
                {/* Product Type Selector */}
                <div>
                  <label className="block text-slate-400 font-bold mb-1.5 uppercase tracking-wider text-[10px]">
                    Select Category
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: "bundle", label: "Flagship Bundle" },
                      { id: "toolkit", label: "Practice Toolkit" },
                      { id: "course", label: "Video Course" },
                    ].map((type) => (
                      <button
                        key={type.id}
                        type="button"
                        onClick={() => {
                          setGrantItemType(type.id as any);
                          if (type.id === "bundle") setGrantItemId("ultimate-bundle-plus");
                          else if (type.id === "toolkit") setGrantItemId("irs-fine-defense");
                          else setGrantItemId("irs-fine-defense-masterclass");
                        }}
                        className={`py-2 px-3 rounded-xl font-bold text-center border transition-all cursor-pointer ${
                          grantItemType === type.id
                            ? "bg-amber-500/20 border-amber-500 text-amber-400 font-black"
                            : "bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700"
                        }`}
                      >
                        {type.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Specific Item Selector */}
                <div>
                  <label className="block text-slate-400 font-bold mb-1.5 uppercase tracking-wider text-[10px]">
                    Choose Product
                  </label>
                  <select
                    value={grantItemId}
                    onChange={(e) => setGrantItemId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white font-medium text-xs focus:outline-none focus:border-amber-500/50 cursor-pointer"
                  >
                    {grantItemType === "bundle" && (
                      <>
                        <option value="ultimate-bundle-plus"> Ultimate Bundle PLUS (All 6 Toolkits + All 6 Courses + 10 Seats)</option>
                        <option value="ultimate-bundle"> Ultimate Bundle (All 6 Toolkits + 5 Staff Seats)</option>
                      </>
                    )}
                    {grantItemType === "toolkit" &&
                      (accessData?.toolkits || []).map((t: any) => (
                        <option key={t.id} value={t.id}>
                           {t.name} (${t.price})
                        </option>
                      ))}
                    {grantItemType === "course" &&
                      (accessData?.courses || []).map((c: any) => (
                        <option key={c.id} value={c.id}>
                           {c.title} (${c.price})
                        </option>
                      ))}
                  </select>
                </div>

                {/* Staff Seats & Membership Bonus */}
                <div className="grid grid-cols-2 gap-3 pt-2">
                  <div>
                    <label className="block text-slate-400 font-bold mb-1 text-[10px] uppercase">
                      Staff Training Seats
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={100}
                      value={grantStaffSeats}
                      onChange={(e) => setGrantStaffSeats(parseInt(e.target.value, 10) || 5)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-white font-mono text-xs focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-400 font-bold mb-1 text-[10px] uppercase">
                      Bonus Months (Plus Tier)
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={24}
                      value={grantBonusMonths}
                      onChange={(e) => setGrantBonusMonths(parseInt(e.target.value, 10) || 0)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-white font-mono text-xs focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="grantNotify"
                    checked={grantNotify}
                    onChange={(e) => setGrantNotify(e.target.checked)}
                    className="rounded border-slate-700 bg-slate-950 text-amber-500"
                  />
                  <label htmlFor="grantNotify" className="text-slate-300 text-xs cursor-pointer">
                    Notify member in the app
                  </label>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setGrantModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() =>
                    handleGrantAccess(grantItemType, grantItemId, {
                      months: grantBonusMonths,
                      seats: grantStaffSeats,
                      notify: grantNotify,
                    })
                  }
                  disabled={!!accessActionBusy}
                  className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black flex items-center gap-1.5 shadow-lg shadow-amber-500/20 cursor-pointer"
                >
                  {accessActionBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Unlock className="w-3.5 h-3.5" />}
                  <span>Confirm &amp; Grant Access</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

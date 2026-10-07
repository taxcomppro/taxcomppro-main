"use client";

import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import {
  Search,
  ChevronDown,
  Shield,
  Briefcase,
  Crown,
  Check,
  Loader2,
  Trash2,
  CreditCard,
  AlertTriangle,
  ExternalLink,
  KeyRound,
  Lock,
  Eye,
  EyeOff,
  Copy,
  Sparkles,
  Gift,
  CalendarCheck,
  Clock,
  User as UserIcon,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Filter,
  X,
  Download,
  SlidersHorizontal,
  CheckSquare,
  Square,
  MinusSquare,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  RotateCcw,
  Package,
  Zap,
} from "lucide-react";
import { AdminMemberProfileDrawer } from "@/components/profile/AdminMemberProfileDrawer";
import { BrandAmbassadorBadge } from "@/components/badges/BrandAmbassadorBadge";

type Role = "MEMBER" | "ADMIN";
type Tier = "FREE" | "VIP" | "MARKETPLACE" | "MARKETPLACE_PLUS";

interface DigitalCardInfo {
  isPurchased?: boolean;
  isActivated?: boolean;
  username?: string | null;
}

interface UserSubscription {
  plan: string;
  status: string;
  currentPeriodEnd: string | null;
}

export interface UserToolkitPurchase {
  id: string;
  toolkitId: string;
  createdAt: string;
  membershipTier?: string;
  membershipMonths?: number;
  stripeSessionId?: string;
}

export interface UserEnrollment {
  id: string;
  courseId: string;
  completedAt?: string | null;
  createdAt: string;
  course?: {
    id: string;
    title: string;
    slug: string;
  };
}

export interface UserTrainingLicense {
  id: string;
  toolkitId: string;
  totalSeats: number;
  expiresAt: string;
}

interface User {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  role: Role;
  tier: Tier;
  isBrandAmbassador?: boolean;
  image: string | null;
  createdAt: string;
  digitalCard?: DigitalCardInfo | null;
  subscription?: UserSubscription | null;
  toolkitPurchases?: UserToolkitPurchase[];
  enrollments?: UserEnrollment[];
  trainingLicenses?: UserTrainingLicense[];
}

type SortField = "user" | "email" | "card" | "role" | "tier" | "access" | "joined";
type SortDirection = "asc" | "desc";

interface SortConfig {
  field: SortField;
  direction: SortDirection;
}

type PresetTab = "ALL" | "BRAND_AMBASSADORS" | "CONNECT_CARD" | "MEMBER" | "ADMIN" | "PAID_TIERS" | "BUNDLES_ACTIVE";
type CardFilter = "ALL" | "ACTIVE" | "PENDING" | "NONE";
type AccessFilter = "ALL" | "HAS_ANY" | "ULTIMATE_BUNDLE_PLUS" | "ULTIMATE_BUNDLE" | "HAS_TOOLKIT" | "HAS_COURSE" | "NO_PRODUCTS";
type SubStatusFilter = "ALL" | "ACTIVE" | "EXPIRING_SOON" | "EXPIRED" | "FREE";
type JoinedFilter = "ALL" | "TODAY" | "7_DAYS" | "30_DAYS" | "90_DAYS" | "OLDER_90";
type AvatarFilter = "ALL" | "WITH_AVATAR" | "NO_AVATAR";

function getUserProductSummary(u: User) {
  const tks = u.toolkitPurchases || [];
  const enrs = u.enrollments || [];
  const hasBundlePlus = tks.some(
    (t) => t.toolkitId === "bundle:ultimate-bundle-plus" || t.toolkitId === "ultimate-bundle-plus"
  );
  const hasBundle = tks.some(
    (t) => t.toolkitId === "bundle:ultimate-bundle" || t.toolkitId === "ultimate-bundle"
  );

  const standardToolkits = tks.filter(
    (t) => !t.toolkitId.startsWith("bundle:") && t.toolkitId !== "admin_free_months"
  );
  const toolkitsCount = hasBundlePlus || hasBundle ? 6 : standardToolkits.length;
  const coursesCount = hasBundlePlus ? 6 : enrs.length;

  return {
    hasBundlePlus,
    hasBundle,
    toolkitsCount,
    coursesCount,
    totalCount: toolkitsCount + coursesCount,
  };
}

const roleConfig: Record<Role, { label: string; className: string; icon: React.ElementType }> = {
  MEMBER: { label: "Member", className: "bg-slate-800/60 text-slate-400 border border-slate-700/30", icon: Shield },
  ADMIN:  { label: "Admin",  className: "bg-amber-500/15 text-amber-400 border border-amber-500/20", icon: Crown },
};

const tierConfig: Record<Tier, { label: string; className: string }> = {
  FREE:             { label: "Free",        className: "bg-slate-850 text-slate-500 border border-slate-800" },
  VIP:              { label: "VIP",         className: "bg-amber-500/10 text-amber-400 border border-amber-500/20" },
  MARKETPLACE:      { label: "Marketplace", className: "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20" },
  MARKETPLACE_PLUS: { label: "Plus",        className: "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" },
};

function timeAgo(d: string) {
  const s = Math.floor((Date.now() - new Date(d).getTime()) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  if (s < 86400 * 30) return `${Math.floor(s / 86400)}d ago`;
  return new Date(d).toLocaleDateString();
}

/** Dropdown rendered into document.body via portal — escapes any overflow:hidden container */
function UserEditDropdown({
  userId,
  currentRole,
  currentTier,
  isBrandAmbassador = false,
  anchor,
  anchorEl,
  onClose,
  onSelectRole,
  onSelectTier,
  onToggleBrandAmbassador,
  onRequestViewProfile,
  onRequestManageAccess,
  onRequestAddMembership,
  onRequestResetPassword,
  onRequestDelete,
}: {
  userId: string;
  currentRole: Role;
  currentTier: Tier;
  isBrandAmbassador?: boolean;
  anchor: DOMRect;
  anchorEl?: HTMLElement | null;
  onClose: () => void;
  onSelectRole: (role: Role) => void;
  onSelectTier: (tier: Tier) => void;
  onToggleBrandAmbassador: (val: boolean) => void;
  onRequestViewProfile: () => void;
  onRequestManageAccess: () => void;
  onRequestAddMembership: () => void;
  onRequestResetPassword: () => void;
  onRequestDelete: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  // Dynamic positioning: compute whether to flip above or below
  const spaceBelow = typeof window !== "undefined" ? window.innerHeight - anchor.bottom : 500;
  const spaceAbove = typeof window !== "undefined" ? anchor.top : 500;
  // If space below is less than 440px and there's more space above, open upwards
  const isAbove = spaceBelow < 440 && spaceAbove > spaceBelow;

  useEffect(() => {
    function handleMousedown(e: MouseEvent) {
      if (ref.current && ref.current.contains(e.target as Node)) return;
      // If clicking on the trigger button itself, let the button's toggle logic handle it
      if (anchorEl && anchorEl.contains(e.target as Node)) return;
      onClose();
    }

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }

    function handleScroll(e: Event) {
      // If scrolling happens outside the dropdown (e.g. scrolling table or page), close dropdown
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    }

    document.addEventListener("mousedown", handleMousedown);
    document.addEventListener("keydown", handleKeyDown);
    window.addEventListener("scroll", handleScroll, true);
    window.addEventListener("resize", onClose);

    return () => {
      document.removeEventListener("mousedown", handleMousedown);
      document.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("scroll", handleScroll, true);
      window.removeEventListener("resize", onClose);
    };
  }, [onClose, anchorEl]);

  const right = Math.max(12, Math.min(window.innerWidth - 220, window.innerWidth - anchor.right));
  const style: React.CSSProperties = {
    position: "fixed",
    ...(isAbove
      ? {
          bottom: window.innerHeight - anchor.top + 6,
          maxHeight: Math.max(180, anchor.top - 16),
        }
      : {
          top: anchor.bottom + 6,
          maxHeight: Math.max(180, spaceBelow - 16),
        }),
    right,
    zIndex: 9999,
    minWidth: 220,
    maxWidth: "calc(100vw - 24px)",
    overflowY: "auto",
    scrollbarWidth: "thin",
    scrollbarColor: "#334155 transparent",
  };

  return createPortal(
    <div
      ref={ref}
      style={style}
      className={`bg-slate-900 border border-slate-800 rounded-xl shadow-2xl p-3 flex flex-col gap-3 text-slate-200 animate-in fade-in ${
        isAbove ? "slide-in-from-bottom-2" : "slide-in-from-top-2"
      } duration-100 overscroll-contain`}
    >
      {/* View Full Profile */}
      <div>
        <button
          onClick={() => {
            onClose();
            onRequestViewProfile();
          }}
          className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs font-bold text-amber-400 hover:bg-amber-500/10 border-0 bg-transparent text-left cursor-pointer transition-all"
        >
          <UserIcon className="w-3.5 h-3.5 text-amber-400" />
          <span>View Member Profile</span>
        </button>
      </div>

      {/* Manage Access & Entitlements */}
      <div>
        <button
          onClick={() => {
            onClose();
            onRequestManageAccess();
          }}
          className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs font-bold text-emerald-400 hover:bg-emerald-500/10 border-0 bg-transparent text-left cursor-pointer transition-all"
        >
          <KeyRound className="w-3.5 h-3.5 text-emerald-400" />
          <span>Manage Access &amp; Toolkits</span>
        </button>
      </div>

      <div className="h-px bg-slate-800" />

      {/* Role Section */}
      <div>
        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 px-2">Assign Role</p>
        <div className="flex flex-col gap-0.5">
          {(["MEMBER", "ADMIN"] as Role[]).map((r) => {
            const rc = roleConfig[r];
            const Icon = rc.icon;
            return (
              <button
                key={r}
                onClick={() => onSelectRole(r)}
                className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all hover:bg-slate-800 text-slate-300 border-0 bg-transparent text-left cursor-pointer"
              >
                <Icon className="w-3.5 h-3.5 text-slate-500" />
                <span className="flex-1">{rc.label}</span>
                {currentRole === r && <Check className="w-3 h-3 text-emerald-500 ml-auto" />}
              </button>
            );
          })}
        </div>
      </div>

      <div className="h-px bg-slate-800" />

      {/* Brand Ambassador Section */}
      <div>
        <p className="text-[10px] font-bold text-amber-500 uppercase tracking-wider mb-1.5 px-2 flex items-center justify-between">
          <span>Brand Ambassador</span>
        </p>
        <button
          onClick={() => onToggleBrandAmbassador(!isBrandAmbassador)}
          className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-xs font-semibold transition-all border text-left cursor-pointer ${
            isBrandAmbassador
              ? "bg-amber-500/15 text-amber-300 border-amber-500/30 hover:bg-amber-500/25 shadow-sm shadow-amber-500/10"
              : "hover:bg-slate-800 text-slate-400 border-slate-800 hover:text-slate-200"
          }`}
        >
          <div className="flex items-center gap-2">
            <img
              src="/brand-ambassador-badge.png"
              alt="Brand Ambassador"
              className="w-4 h-4 object-contain shrink-0"
            />
            <span>Brand Ambassador</span>
          </div>
          {isBrandAmbassador ? (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30">
              Active
            </span>
          ) : (
            <span className="text-[10px] text-slate-500 font-normal">Off</span>
          )}
        </button>
      </div>

      {/* Separator */}
      <div className="h-px bg-slate-800" />

      {/* Tier Section */}
      <div>
        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 px-2">Assign Tier</p>
        <div className="flex flex-col gap-0.5">
          {(["FREE", "VIP", "MARKETPLACE", "MARKETPLACE_PLUS"] as Tier[]).map((t) => {
            const tc = tierConfig[t];
            return (
              <button
                key={t}
                onClick={() => onSelectTier(t)}
                className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all hover:bg-slate-800 text-slate-300 border-0 bg-transparent text-left cursor-pointer"
              >
                <span className="flex-1">{tc.label}</span>
                {currentTier === t && <Check className="w-3 h-3 text-emerald-500 ml-auto" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* Separator */}
      <div className="h-px bg-slate-800" />

      {/* Add Free Membership Months */}
      <div>
        <button
          onClick={() => {
            onClose();
            onRequestAddMembership();
          }}
          className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs font-semibold text-emerald-400 hover:bg-emerald-500/10 border-0 bg-transparent text-left cursor-pointer transition-all"
        >
          <Gift className="w-3.5 h-3.5 text-emerald-400" />
          <span>Gift Free Membership</span>
        </button>
      </div>

      {/* Separator */}
      <div className="h-px bg-slate-800" />

      {/* Reset Password */}
      <div>
        <button
          onClick={() => {
            onClose();
            onRequestResetPassword();
          }}
          className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs font-semibold text-amber-400 hover:bg-amber-500/10 border-0 bg-transparent text-left cursor-pointer transition-all"
        >
          <KeyRound className="w-3.5 h-3.5 text-amber-400" />
          <span>Reset Password</span>
        </button>
      </div>

      {/* Separator */}
      <div className="h-px bg-slate-800" />

      {/* Danger Zone: Delete User */}
      <div>
        <button
          onClick={() => {
            onClose();
            onRequestDelete();
          }}
          className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs font-semibold text-red-400 hover:bg-red-500/15 border-0 bg-transparent text-left cursor-pointer transition-all"
        >
          <Trash2 className="w-3.5 h-3.5 text-red-400" />
          <span>Delete User</span>
        </button>
      </div>
    </div>,
    document.body
  );
}

/** Popover for column-level filter controls rendered in portal to avoid overflow clipping */
function ColumnFilterPopover({
  title,
  anchor,
  onClose,
  onClear,
  children,
}: {
  title: string;
  anchor: DOMRect;
  onClose: () => void;
  onClear?: () => void;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("mousedown", handle);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handle);
      document.removeEventListener("keydown", handleKey);
    };
  }, [onClose]);

  const left = Math.max(12, Math.min(window.innerWidth - 270, anchor.left));
  const style: React.CSSProperties = {
    position: "fixed",
    top: anchor.bottom + 6,
    left,
    zIndex: 9998,
    width: 260,
    maxHeight: "calc(100vh - 24px)",
    overflowY: "auto",
  };

  return createPortal(
    <div
      ref={ref}
      style={style}
      className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-3.5 text-slate-200 animate-in fade-in zoom-in-95 duration-100"
    >
      <div className="flex items-center justify-between pb-2 mb-2.5 border-b border-slate-800">
        <span className="text-xs font-bold text-white flex items-center gap-1.5">
          <Filter className="w-3.5 h-3.5 text-amber-400" />
          {title}
        </span>
        <button
          onClick={onClose}
          className="text-slate-500 hover:text-slate-300 p-0.5 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
      <div className="space-y-2">{children}</div>
      {onClear && (
        <div className="pt-2 mt-2.5 border-t border-slate-800 flex justify-end">
          <button
            onClick={() => {
              onClear();
              onClose();
            }}
            className="text-[11px] font-semibold text-slate-400 hover:text-amber-400 transition-colors cursor-pointer"
          >
            Reset Filter
          </button>
        </div>
      )}
    </div>,
    document.body
  );
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Global & column filters
  const [search, setSearch] = useState("");
  const [presetTab, setPresetTab] = useState<PresetTab>("ALL");
  const [roleFilter, setRoleFilter] = useState<Role | "ALL">("ALL");
  const [tierFilter, setTierFilter] = useState<Tier | "ALL">("ALL");
  const [cardFilter, setCardFilter] = useState<CardFilter>("ALL");
  const [accessFilter, setAccessFilter] = useState<AccessFilter>("ALL");
  const [subStatusFilter, setSubStatusFilter] = useState<SubStatusFilter>("ALL");
  const [joinedFilter, setJoinedFilter] = useState<JoinedFilter>("ALL");
  const [userAvatarFilter, setUserAvatarFilter] = useState<AvatarFilter>("ALL");

  // Sorting state
  const [sortConfig, setSortConfig] = useState<SortConfig | null>({
    field: "joined",
    direction: "desc",
  });

  // Table display & pagination
  const [density, setDensity] = useState<"comfortable" | "compact">("comfortable");
  const [pageSize, setPageSize] = useState<number>(25);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set());

  // Popovers & Drawers
  const [activeColFilter, setActiveColFilter] = useState<{
    col: "user" | "card" | "role" | "tier" | "access" | "joined";
    rect: DOMRect;
  } | null>(null);
  const [openDropdown, setOpenDropdown] = useState<{ id: string; rect: DOMRect; btnEl: HTMLButtonElement } | null>(null);
  const [selectedProfileUserId, setSelectedProfileUserId] = useState<string | null>(null);
  const [selectedDrawerTab, setSelectedDrawerTab] = useState<
    "overview" | "access" | "membership" | "affiliate" | "payments" | "courses" | "card"
  >("overview");

  // Bulk Grant Modal state
  const [bulkGrantModalOpen, setBulkGrantModalOpen] = useState(false);
  const [bulkItemType, setBulkItemType] = useState<"bundle" | "toolkit" | "course">("bundle");
  const [bulkItemId, setBulkItemId] = useState<string>("ultimate-bundle-plus");
  const [bulkBonusMonths, setBulkBonusMonths] = useState<number>(2);
  const [bulkStaffSeats, setBulkStaffSeats] = useState<number>(10);
  const [bulkNotify, setBulkNotify] = useState<boolean>(true);
  const [bulkActionBusy, setBulkActionBusy] = useState<boolean>(false);
  const [bulkSuccessMsg, setBulkSuccessMsg] = useState<string | null>(null);
  const [bulkErrorMsg, setBulkErrorMsg] = useState<string | null>(null);

  // Membership Gifting modal state
  const [userToAddMembership, setUserToAddMembership] = useState<User | null>(null);
  const [giftMonths, setGiftMonths] = useState<number>(1);
  const [giftTier, setGiftTier] = useState<Tier>("VIP");
  const [giftingMembership, setGiftingMembership] = useState(false);
  const [giftSuccess, setGiftSuccess] = useState<string | null>(null);
  const [giftError, setGiftError] = useState<string | null>(null);

  // Password reset modal state
  const [userToResetPassword, setUserToResetPassword] = useState<User | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [resettingPassword, setResettingPassword] = useState(false);
  const [resetSuccess, setResetSuccess] = useState<string | null>(null);
  const [resetError, setResetError] = useState<string | null>(null);
  const [copiedCredentials, setCopiedCredentials] = useState(false);

  // Delete modal state
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Fetch users from API (requesting up to 1000 so admin has comprehensive access)
  const fetchUsers = useCallback(() => {
    setLoading(true);
    fetch("/api/admin/users?limit=1000")
      .then((r) => r.json())
      .then((d) => setUsers(Array.isArray(d) ? d : []))
      .catch(() => setUsers([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // Reset page to 1 whenever filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [
    search,
    presetTab,
    roleFilter,
    tierFilter,
    cardFilter,
    accessFilter,
    subStatusFilter,
    joinedFilter,
    userAvatarFilter,
    pageSize,
  ]);

  const handleOpenAccessDrawer = (userId: string) => {
    setSelectedProfileUserId(userId);
    setSelectedDrawerTab("access");
  };

  const handleOpenOverviewDrawer = (userId: string) => {
    setSelectedProfileUserId(userId);
    setSelectedDrawerTab("overview");
  };

  // Bulk Grant Handler
  const handleExecuteBulkGrant = async () => {
    if (selectedUserIds.size === 0) return;
    setBulkActionBusy(true);
    setBulkErrorMsg(null);
    setBulkSuccessMsg(null);

    try {
      const res = await fetch("/api/admin/users/bulk-access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userIds: Array.from(selectedUserIds),
          action: "GRANT",
          itemType: bulkItemType,
          itemId: bulkItemId,
          grantMembershipBonus: true,
          membershipMonths: bulkBonusMonths,
          membershipTier: "MARKETPLACE_PLUS",
          staffSeats: bulkStaffSeats,
          notifyUsers: bulkNotify,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to grant bulk access");

      setBulkSuccessMsg(
        `Successfully granted access to ${data.results?.successful?.length || selectedUserIds.size} user(s)!`
      );
      fetchUsers();
      setTimeout(() => {
        setBulkGrantModalOpen(false);
        setSelectedUserIds(new Set());
      }, 1500);
    } catch (err: any) {
      setBulkErrorMsg(err.message || "Bulk grant failed.");
    } finally {
      setBulkActionBusy(false);
    }
  };

  // Multi-field search and filter logic
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const prodSummary = getUserProductSummary(u);

      // 1. Preset tabs
      if (presetTab === "CONNECT_CARD") {
        if (!u.digitalCard?.isPurchased && !u.digitalCard?.isActivated) return false;
      } else if (presetTab === "BRAND_AMBASSADORS" && !u.isBrandAmbassador) {
        return false;
      } else if (presetTab === "MEMBER" && u.role !== "MEMBER") {
        return false;
      } else if (presetTab === "ADMIN" && u.role !== "ADMIN") {
        return false;
      } else if (presetTab === "PAID_TIERS" && u.tier === "FREE") {
        return false;
      } else if (presetTab === "BUNDLES_ACTIVE") {
        if (!prodSummary.hasBundle && !prodSummary.hasBundlePlus) return false;
      }

      // 2. Access Filter
      if (accessFilter === "HAS_ANY") {
        if (prodSummary.totalCount === 0) return false;
      } else if (accessFilter === "ULTIMATE_BUNDLE_PLUS") {
        if (!prodSummary.hasBundlePlus) return false;
      } else if (accessFilter === "ULTIMATE_BUNDLE") {
        if (!prodSummary.hasBundle && !prodSummary.hasBundlePlus) return false;
      } else if (accessFilter === "HAS_TOOLKIT") {
        if (prodSummary.toolkitsCount === 0) return false;
      } else if (accessFilter === "HAS_COURSE") {
        if (prodSummary.coursesCount === 0) return false;
      } else if (accessFilter === "NO_PRODUCTS") {
        if (prodSummary.totalCount > 0) return false;
      }

      // 3. Global text search
      if (search.trim()) {
        const q = search.toLowerCase().trim();
        const matchesName = u.name?.toLowerCase().includes(q);
        const matchesEmail = u.email?.toLowerCase().includes(q);
        const matchesPhone = u.phone?.toLowerCase().includes(q);
        const matchesCardHandle = u.digitalCard?.username?.toLowerCase().includes(q);
        if (!matchesName && !matchesEmail && !matchesPhone && !matchesCardHandle) return false;
      }

      // 4. Role filter
      if (roleFilter !== "ALL" && u.role !== roleFilter) return false;

      // 5. Tier filter
      if (tierFilter !== "ALL" && u.tier !== tierFilter) return false;

      // 6. Connect Card filter
      if (cardFilter === "ACTIVE") {
        if (!u.digitalCard?.isActivated || !u.digitalCard?.username) return false;
      } else if (cardFilter === "PENDING") {
        if (!u.digitalCard?.isPurchased || (u.digitalCard?.isActivated && u.digitalCard?.username)) return false;
      } else if (cardFilter === "NONE") {
        if (u.digitalCard?.isPurchased || u.digitalCard?.isActivated) return false;
      }

      // 7. Subscription status filter
      const now = new Date();
      const hasFutureEnd = u.subscription?.currentPeriodEnd
        ? new Date(u.subscription.currentPeriodEnd) > now
        : false;

      if (subStatusFilter === "ACTIVE") {
        const isActive = hasFutureEnd || (u.tier !== "FREE" && (!u.subscription || u.subscription.status === "active"));
        if (!isActive) return false;
      } else if (subStatusFilter === "EXPIRING_SOON") {
        if (!u.subscription?.currentPeriodEnd) return false;
        const endDate = new Date(u.subscription.currentPeriodEnd);
        const diffDays = (endDate.getTime() - now.getTime()) / (1000 * 3600 * 24);
        if (diffDays <= 0 || diffDays > 14) return false;
      } else if (subStatusFilter === "EXPIRED") {
        if (!u.subscription?.currentPeriodEnd) return false;
        const endDate = new Date(u.subscription.currentPeriodEnd);
        if (endDate > now) return false;
      } else if (subStatusFilter === "FREE") {
        if (u.tier !== "FREE" || hasFutureEnd) return false;
      }

      // 8. Avatar filter
      if (userAvatarFilter === "WITH_AVATAR" && !u.image) return false;
      if (userAvatarFilter === "NO_AVATAR" && u.image) return false;

      // 9. Joined Date filter
      if (joinedFilter !== "ALL") {
        const createdTime = new Date(u.createdAt).getTime();
        const diffMs = Date.now() - createdTime;
        const oneDay = 86400 * 1000;
        if (joinedFilter === "TODAY" && diffMs > oneDay) return false;
        if (joinedFilter === "7_DAYS" && diffMs > 7 * oneDay) return false;
        if (joinedFilter === "30_DAYS" && diffMs > 30 * oneDay) return false;
        if (joinedFilter === "90_DAYS" && diffMs > 90 * oneDay) return false;
        if (joinedFilter === "OLDER_90" && diffMs <= 90 * oneDay) return false;
      }

      return true;
    });
  }, [
    users,
    search,
    presetTab,
    roleFilter,
    tierFilter,
    roleFilter,
    tierFilter,
    cardFilter,
    accessFilter,
    subStatusFilter,
    userAvatarFilter,
    joinedFilter,
  ]);

  // Sorting logic
  const sortedUsers = useMemo(() => {
    if (!sortConfig) return filteredUsers;
    const { field, direction } = sortConfig;
    const mult = direction === "asc" ? 1 : -1;

    return [...filteredUsers].sort((a, b) => {
      switch (field) {
        case "user":
          return mult * (a.name || "").localeCompare(b.name || "");
        case "email":
          return mult * (a.email || "").localeCompare(b.email || "");
        case "card": {
          const getScore = (u: User) => {
            if (u.digitalCard?.isActivated && u.digitalCard?.username) return 2;
            if (u.digitalCard?.isPurchased) return 1;
            return 0;
          };
          return mult * (getScore(a) - getScore(b));
        }
        case "role": {
          const rank: Record<Role, number> = { ADMIN: 2, MEMBER: 1 };
          return mult * ((rank[a.role] || 0) - (rank[b.role] || 0));
        }
        case "tier": {
          const rank: Record<Tier, number> = { MARKETPLACE_PLUS: 4, MARKETPLACE: 3, VIP: 2, FREE: 1 };
          return mult * ((rank[a.tier] || 0) - (rank[b.tier] || 0));
        }
        case "access": {
          return mult * (getUserProductSummary(a).totalCount - getUserProductSummary(b).totalCount);
        }
        case "joined": {
          const dateA = new Date(a.createdAt).getTime();
          const dateB = new Date(b.createdAt).getTime();
          return mult * (dateA - dateB);
        }
        default:
          return 0;
      }
    });
  }, [filteredUsers, sortConfig]);

  // Pagination calculations
  const totalItems = sortedUsers.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages);
  const startIndex = (safeCurrentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalItems);
  const paginatedUsers = sortedUsers.slice(startIndex, endIndex);

  // Statistics across all loaded users
  const connectCardCount = useMemo(
    () => users.filter((u) => u.digitalCard?.isPurchased || u.digitalCard?.isActivated).length,
    [users]
  );
  const memberCount = useMemo(() => users.filter((u) => u.role === "MEMBER").length, [users]);
  const adminCount = useMemo(() => users.filter((u) => u.role === "ADMIN").length, [users]);
  const ambassadorCount = useMemo(() => users.filter((u) => u.isBrandAmbassador).length, [users]);
  const paidCount = useMemo(() => users.filter((u) => u.tier !== "FREE").length, [users]);
  const bundleActiveCount = useMemo(
    () =>
      users.filter((u) => {
        const s = getUserProductSummary(u);
        return s.hasBundle || s.hasBundlePlus;
      }).length,
    [users]
  );

  // Header click sorting handler
  const handleSort = (field: SortField) => {
    if (sortConfig?.field === field) {
      if (sortConfig.direction === "asc") {
        setSortConfig({ field, direction: "desc" });
      } else {
        // Toggle to asc
        setSortConfig({ field, direction: "asc" });
      }
    } else {
      // Natural initial sort
      const defaultDesc = ["joined", "role", "tier", "card", "access"].includes(field);
      setSortConfig({ field, direction: defaultDesc ? "desc" : "asc" });
    }
  };

  // Open Column Filter Popover
  const toggleColumnFilter = (
    col: "user" | "card" | "role" | "tier" | "access" | "joined",
    btn: HTMLElement
  ) => {
    if (activeColFilter?.col === col) {
      setActiveColFilter(null);
    } else {
      setActiveColFilter({ col, rect: btn.getBoundingClientRect() });
    }
  };

  // Selection logic for bulk actions
  const allVisibleSelected =
    paginatedUsers.length > 0 && paginatedUsers.every((u) => selectedUserIds.has(u.id));
  const someVisibleSelected =
    paginatedUsers.some((u) => selectedUserIds.has(u.id)) && !allVisibleSelected;

  const toggleSelectAllVisible = () => {
    const next = new Set(selectedUserIds);
    if (allVisibleSelected) {
      paginatedUsers.forEach((u) => next.delete(u.id));
    } else {
      paginatedUsers.forEach((u) => next.add(u.id));
    }
    setSelectedUserIds(next);
  };

  const toggleSelectUser = (id: string) => {
    const next = new Set(selectedUserIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedUserIds(next);
  };

  // Export to CSV functionality
  const exportUsersToCSV = (targetUsers: User[]) => {
    if (targetUsers.length === 0) return;
    const headers = [
      "User ID",
      "Name",
      "Email",
      "Phone",
      "Role",
      "Tier",
      "Connect Card Status",
      "Connect Card Username",
      "Subscription Plan",
      "Subscription Status",
      "Subscription Expiry Date",
      "Joined Date (ISO)",
    ];

    const escapeCSV = (val: string | null | undefined) => {
      if (!val) return '""';
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    };

    const rows = targetUsers.map((u) => {
      const cardStatus =
        u.digitalCard?.isActivated && u.digitalCard?.username
          ? "Active"
          : u.digitalCard?.isPurchased
          ? "Purchased (Pending Setup)"
          : "None";
      const cardUsername = u.digitalCard?.username || "";
      const subPlan = u.subscription?.plan || u.tier;
      const subStatus = u.subscription?.status || (u.tier !== "FREE" ? "active" : "none");
      const subEnd = u.subscription?.currentPeriodEnd
        ? new Date(u.subscription.currentPeriodEnd) > new Date()
          ? new Date(u.subscription.currentPeriodEnd).toISOString()
          : ""
        : "";
      const joined = new Date(u.createdAt).toISOString();

      return [
        escapeCSV(u.id),
        escapeCSV(u.name),
        escapeCSV(u.email),
        escapeCSV(u.phone),
        escapeCSV(u.role),
        escapeCSV(u.tier),
        escapeCSV(cardStatus),
        escapeCSV(cardUsername),
        escapeCSV(subPlan),
        escapeCSV(subStatus),
        escapeCSV(subEnd),
        escapeCSV(joined),
      ].join(",");
    });

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `taxcomppro_users_${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Clear all filters back to default
  const handleResetAllFilters = () => {
    setSearch("");
    setPresetTab("ALL");
    setRoleFilter("ALL");
    setTierFilter("ALL");
    setCardFilter("ALL");
    setAccessFilter("ALL");
    setSubStatusFilter("ALL");
    setJoinedFilter("ALL");
    setUserAvatarFilter("ALL");
    setSortConfig({ field: "joined", direction: "desc" });
    setSelectedUserIds(new Set());
  };

  // Determine which filters are currently active for badges and chips
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (search.trim()) count++;
    if (presetTab !== "ALL") count++;
    if (roleFilter !== "ALL") count++;
    if (tierFilter !== "ALL") count++;
    if (cardFilter !== "ALL") count++;
    if (accessFilter !== "ALL") count++;
    if (subStatusFilter !== "ALL") count++;
    if (joinedFilter !== "ALL") count++;
    if (userAvatarFilter !== "ALL") count++;
    return count;
  }, [
    search,
    presetTab,
    roleFilter,
    tierFilter,
    cardFilter,
    accessFilter,
    subStatusFilter,
    joinedFilter,
    userAvatarFilter,
  ]);

  // Manage Dropdown toggle
  const toggleDropdown = useCallback(
    (userId: string, btn: HTMLButtonElement) => {
      if (openDropdown?.id === userId) {
        setOpenDropdown(null);
        return;
      }
      setOpenDropdown({ id: userId, rect: btn.getBoundingClientRect(), btnEl: btn });
    },
    [openDropdown]
  );

  // Update role or tier
  const updateUser = async (userId: string, updates: { role?: Role; tier?: Tier; isBrandAmbassador?: boolean }) => {
    setLoadingId(userId);
    setActionError(null);
    try {
      const res = await fetch(`/api/admin/users/${userId}/role`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      if (res.ok) {
        const updated = await res.json();
        setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, ...updated } : u)));
      } else {
        const err = await res.json();
        setActionError(err.error || "Failed to update user");
      }
    } catch {
      setActionError("Failed to update user");
    } finally {
      setLoadingId(null);
    }
  };

  // Delete user
  const handleDeleteUser = async () => {
    if (!userToDelete) return;
    setDeleting(true);
    setDeleteError(null);
    setActionError(null);
    try {
      const res = await fetch(`/api/admin/users/${userToDelete.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (res.ok) {
        setUsers((prev) => prev.filter((u) => u.id !== userToDelete.id));
        setUserToDelete(null);
        setDeleteError(null);
      } else {
        const errMsg = data.error || "Failed to delete user";
        setDeleteError(errMsg);
        setActionError(errMsg);
      }
    } catch {
      const errMsg = "Network error while deleting user";
      setDeleteError(errMsg);
      setActionError(errMsg);
    } finally {
      setDeleting(false);
    }
  };

  // Gift membership modal handlers
  const handleOpenGiftModal = (user: User) => {
    setUserToAddMembership(user);
    setGiftMonths(1);
    setGiftTier(user.tier !== "FREE" ? user.tier : "VIP");
    setGiftSuccess(null);
    setGiftError(null);
  };

  const handleCloseGiftModal = () => {
    setUserToAddMembership(null);
    setGiftMonths(1);
    setGiftSuccess(null);
    setGiftError(null);
  };

  const handleGiftMembership = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userToAddMembership) return;
    if (!giftMonths || giftMonths < 1) {
      setGiftError("Please enter at least 1 month.");
      return;
    }

    setGiftingMembership(true);
    setGiftError(null);
    setGiftSuccess(null);

    try {
      const res = await fetch(`/api/admin/users/${userToAddMembership.id}/membership`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ months: giftMonths, tier: giftTier }),
      });
      const data = await res.json();
      if (res.ok) {
        setGiftSuccess(data.message || "Free membership months added successfully!");
        setUsers((prev) =>
          prev.map((u) =>
            u.id === userToAddMembership.id
              ? { ...u, tier: data.user?.tier ?? giftTier, subscription: data.subscription }
              : u
          )
        );
      } else {
        setGiftError(data.error || "Failed to add free membership months.");
      }
    } catch {
      setGiftError("Network error while adding free membership months.");
    } finally {
      setGiftingMembership(false);
    }
  };

  // Password reset handlers
  const generateRandomPassword = () => {
    const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
    const lower = "abcdefghjkmnpqrstuvwxyz";
    const digits = "23456789";
    const symbols = "!@#$%&*";
    let pwd = "";
    pwd += upper[Math.floor(Math.random() * upper.length)];
    pwd += lower[Math.floor(Math.random() * lower.length)];
    pwd += digits[Math.floor(Math.random() * digits.length)];
    pwd += symbols[Math.floor(Math.random() * symbols.length)];
    const all = upper + lower + digits + symbols;
    for (let i = 4; i < 12; i++) {
      pwd += all[Math.floor(Math.random() * all.length)];
    }
    const shuffled = pwd
      .split("")
      .sort(() => 0.5 - Math.random())
      .join("");
    setNewPassword(shuffled);
    setConfirmPassword(shuffled);
    setShowPassword(true);
    setResetError(null);
  };

  const handleOpenResetModal = (user: User) => {
    setUserToResetPassword(user);
    setNewPassword("");
    setConfirmPassword("");
    setShowPassword(false);
    setResetSuccess(null);
    setResetError(null);
    setCopiedCredentials(false);
  };

  const handleCloseResetModal = () => {
    setUserToResetPassword(null);
    setNewPassword("");
    setConfirmPassword("");
    setResetSuccess(null);
    setResetError(null);
    setCopiedCredentials(false);
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userToResetPassword) return;
    if (newPassword.length < 8) {
      setResetError("Password must be at least 8 characters long.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setResetError("Passwords do not match.");
      return;
    }

    setResettingPassword(true);
    setResetError(null);
    setResetSuccess(null);

    try {
      const res = await fetch(`/api/admin/users/${userToResetPassword.id}/password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: newPassword }),
      });
      const data = await res.json();
      if (res.ok) {
        setResetSuccess(data.message || "Password updated successfully!");
      } else {
        setResetError(data.error || "Failed to reset password.");
      }
    } catch {
      setResetError("Network error while resetting password.");
    } finally {
      setResettingPassword(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-5 pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2.5">
            <span>User Management</span>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-amber-600 dark:text-amber-400 border border-slate-200 dark:border-slate-700">
              {users.length} Total
            </span>
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-0.5">
            View, filter, sort, and manage all platform members, Connect Card buyers, roles, and subscriptions
          </p>
        </div>

        {/* Global Action Tools */}
        <div className="flex items-center gap-2.5 shrink-0">
          <button
            onClick={() => setDensity((d) => (d === "comfortable" ? "compact" : "comfortable"))}
            className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl bg-white dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700/60 transition-all cursor-pointer shadow-sm"
            title={`Toggle density: currently ${density}`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-slate-400" />
            <span className="capitalize">{density}</span>
          </button>

          <button
            onClick={() => exportUsersToCSV(sortedUsers)}
            disabled={sortedUsers.length === 0}
            className="flex items-center gap-1.5 text-xs font-bold px-3.5 py-2 rounded-xl bg-white dark:bg-slate-800 text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-500/10 border border-amber-500/30 hover:border-amber-500/50 transition-all disabled:opacity-50 cursor-pointer shadow-sm"
          >
            <Download className="w-3.5 h-3.5 text-amber-500" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {actionError && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl p-3.5 text-xs flex items-center justify-between">
          <span>{actionError}</span>
          <button onClick={() => setActionError(null)} className="text-slate-400 hover:text-white text-xs cursor-pointer">
            Dismiss
          </button>
        </div>
      )}

      {/* Main Filter Section */}
      <div className="bg-white dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 space-y-3.5 shadow-xl transition-colors">
        {/* Row 1: Search + Preset Pills */}
        <div className="flex flex-col lg:flex-row gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by name, email, or @handle..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-slate-50 dark:bg-[#060f1e] text-slate-900 dark:text-slate-100 text-sm pl-10 pr-9 py-2.5 border border-slate-200 dark:border-slate-800 rounded-xl outline-none focus:border-amber-500/50 focus:ring-2 focus:ring-amber-500/10 transition-all font-[inherit]"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5 rounded cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Quick Segmented Preset Tabs */}
          <div className="flex gap-1.5 flex-wrap items-center">
            {[
              { id: "ALL", label: "All Users", count: users.length },
              { id: "BRAND_AMBASSADORS", label: "🛡️ Ambassadors", count: ambassadorCount },
              { id: "BUNDLES_ACTIVE", label: "👑 Bundles & Toolkits", count: bundleActiveCount },
              { id: "CONNECT_CARD", label: "💳 Connect Cards", count: connectCardCount },
              { id: "MEMBER", label: "Members", count: memberCount },
              { id: "ADMIN", label: "Admins", count: adminCount },
              { id: "PAID_TIERS", label: "⭐ Paid Tiers", count: paidCount },
            ].map((tab) => {
              const active = presetTab === tab.id;
              const isCard = tab.id === "CONNECT_CARD";
              const isBundle = tab.id === "BUNDLES_ACTIVE";
              const isAmbassador = tab.id === "BRAND_AMBASSADORS";
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    setPresetTab(tab.id as PresetTab);
                    // Sync role filter if a role tab is selected
                    if (["MEMBER", "ADMIN"].includes(tab.id)) {
                      setRoleFilter(tab.id as Role);
                    } else if (tab.id === "ALL") {
                      setRoleFilter("ALL");
                    }
                  }}
                  className={`text-xs font-semibold px-3.5 py-2 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer ${
                    active
                      ? isAmbassador
                        ? "bg-gradient-to-r from-amber-500 to-amber-300 text-slate-950 shadow-lg shadow-amber-500/30 font-black"
                        : isBundle
                        ? "bg-gradient-to-r from-amber-500 to-amber-400 text-slate-950 shadow-lg shadow-amber-500/20 font-black"
                        : isCard
                        ? "bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/20 font-black"
                        : "bg-amber-500 text-[#0a1628] shadow-lg shadow-amber-500/10 font-bold"
                      : "bg-slate-100 dark:bg-slate-800/90 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700/80 border border-slate-200 dark:border-slate-700/40"
                  }`}
                >
                  <span>{tab.label}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                      active ? "bg-black/20 text-slate-900 font-bold" : "bg-slate-200 dark:bg-slate-900 text-slate-700 dark:text-slate-400"
                    }`}
                  >
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Row 2: Secondary / Advanced Dropdown Filters */}
        <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-200 dark:border-slate-800/80">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mr-1">
            Filter:
          </span>

          {/* Access / Product Filter */}
          <select
            value={accessFilter}
            onChange={(e) => setAccessFilter(e.target.value as AccessFilter)}
            className="bg-slate-50 dark:bg-[#060f1e] text-xs font-medium text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 rounded-lg px-2.5 py-1.5 outline-none focus:border-amber-500/50 cursor-pointer"
          >
            <option value="ALL">All Product Access</option>
            <option value="HAS_ANY">Has Any Product / Bundle</option>
            <option value="ULTIMATE_BUNDLE_PLUS">👑 Ultimate Bundle PLUS ($2,400)</option>
            <option value="ULTIMATE_BUNDLE">🏆 Ultimate Bundle ($1,200)</option>
            <option value="HAS_TOOLKIT">📦 Has Toolkits</option>
            <option value="HAS_COURSE">🎓 Has Masterclasses</option>
            <option value="NO_PRODUCTS">No Products Owned</option>
          </select>

          {/* Role Filter */}
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value as Role | "ALL")}
            className="bg-slate-50 dark:bg-[#060f1e] text-xs font-medium text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 rounded-lg px-2.5 py-1.5 outline-none focus:border-amber-500/50 cursor-pointer"
          >
            <option value="ALL">All Roles</option>
            <option value="MEMBER">Member</option>
            <option value="ADMIN">Admin</option>
          </select>

          {/* Tier Filter */}
          <select
            value={tierFilter}
            onChange={(e) => setTierFilter(e.target.value as Tier | "ALL")}
            className="bg-slate-50 dark:bg-[#060f1e] text-xs font-medium text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 rounded-lg px-2.5 py-1.5 outline-none focus:border-amber-500/50 cursor-pointer"
          >
            <option value="ALL">All Tiers</option>
            <option value="FREE">Free</option>
            <option value="VIP">VIP</option>
            <option value="MARKETPLACE">Marketplace</option>
            <option value="MARKETPLACE_PLUS">Plus (Marketplace Plus)</option>
          </select>

          {/* Connect Card Filter */}
          <select
            value={cardFilter}
            onChange={(e) => setCardFilter(e.target.value as CardFilter)}
            className="bg-slate-50 dark:bg-[#060f1e] text-xs font-medium text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 rounded-lg px-2.5 py-1.5 outline-none focus:border-amber-500/50 cursor-pointer"
          >
            <option value="ALL">All Connect Cards</option>
            <option value="ACTIVE">Active Card (@handle)</option>
            <option value="PENDING">Purchased (Pending Setup)</option>
            <option value="NONE">No Card</option>
          </select>

          {/* Subscription Status Filter */}
          <select
            value={subStatusFilter}
            onChange={(e) => setSubStatusFilter(e.target.value as SubStatusFilter)}
            className="bg-slate-50 dark:bg-[#060f1e] text-xs font-medium text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 rounded-lg px-2.5 py-1.5 outline-none focus:border-amber-500/50 cursor-pointer"
          >
            <option value="ALL">All Subscriptions</option>
            <option value="ACTIVE">Active Paid Subscriptions</option>
            <option value="EXPIRING_SOON">Expiring Soon (within 14 days)</option>
            <option value="EXPIRED">Expired Subscriptions</option>
            <option value="FREE">Free / No Subscription</option>
          </select>

          {/* Joined Date Filter */}
          <select
            value={joinedFilter}
            onChange={(e) => setJoinedFilter(e.target.value as JoinedFilter)}
            className="bg-slate-50 dark:bg-[#060f1e] text-xs font-medium text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 rounded-lg px-2.5 py-1.5 outline-none focus:border-amber-500/50 cursor-pointer"
          >
            <option value="ALL">All Joined Dates</option>
            <option value="TODAY">Today (Past 24h)</option>
            <option value="7_DAYS">Past 7 Days</option>
            <option value="30_DAYS">Past 30 Days</option>
            <option value="90_DAYS">Past 90 Days</option>
            <option value="OLDER_90">Older than 90 Days</option>
          </select>

          {/* User Avatar Filter */}
          <select
            value={userAvatarFilter}
            onChange={(e) => setUserAvatarFilter(e.target.value as AvatarFilter)}
            className="bg-slate-50 dark:bg-[#060f1e] text-xs font-medium text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 rounded-lg px-2.5 py-1.5 outline-none focus:border-amber-500/50 cursor-pointer"
          >
            <option value="ALL">All Avatars</option>
            <option value="WITH_AVATAR">Has Profile Image</option>
            <option value="NO_AVATAR">Initials Only</option>
          </select>

          {activeFiltersCount > 0 && (
            <button
              onClick={handleResetAllFilters}
              className="flex items-center gap-1 text-xs font-bold text-amber-400 hover:text-amber-300 px-2.5 py-1 rounded-lg hover:bg-amber-500/10 transition-colors ml-auto cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset All ({activeFiltersCount})</span>
            </button>
          )}
        </div>

        {/* Row 3: Active Filter Chips */}
        {activeFiltersCount > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 pt-1 text-xs">
            <span className="text-slate-500 text-[11px] font-medium">Active filters:</span>

            {search && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-200 border border-slate-700">
                Search: &quot;{search}&quot;
                <button onClick={() => setSearch("")} className="text-slate-400 hover:text-white cursor-pointer">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {presetTab !== "ALL" && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-800 text-amber-400 border border-amber-500/30">
                Tab: {presetTab}
                <button onClick={() => setPresetTab("ALL")} className="text-slate-400 hover:text-white cursor-pointer">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {accessFilter !== "ALL" && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-800 text-amber-400 border border-amber-500/30">
                Access: {accessFilter}
                <button onClick={() => setAccessFilter("ALL")} className="text-slate-400 hover:text-white cursor-pointer">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {roleFilter !== "ALL" && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-800 text-blue-400 border border-blue-500/30">
                Role: {roleFilter}
                <button onClick={() => setRoleFilter("ALL")} className="text-slate-400 hover:text-white cursor-pointer">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {tierFilter !== "ALL" && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-800 text-indigo-400 border border-indigo-500/30">
                Tier: {tierFilter}
                <button onClick={() => setTierFilter("ALL")} className="text-slate-400 hover:text-white cursor-pointer">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {cardFilter !== "ALL" && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-800 text-emerald-400 border border-emerald-500/30">
                Card: {cardFilter}
                <button onClick={() => setCardFilter("ALL")} className="text-slate-400 hover:text-white cursor-pointer">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {subStatusFilter !== "ALL" && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                Sub: {subStatusFilter}
                <button onClick={() => setSubStatusFilter("ALL")} className="text-slate-400 hover:text-white cursor-pointer">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {joinedFilter !== "ALL" && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                Joined: {joinedFilter}
                <button onClick={() => setJoinedFilter("ALL")} className="text-slate-400 hover:text-white cursor-pointer">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {userAvatarFilter !== "ALL" && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                Avatar: {userAvatarFilter}
                <button onClick={() => setUserAvatarFilter("ALL")} className="text-slate-400 hover:text-white cursor-pointer">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
          </div>
        )}
      </div>

      {/* Bulk Action Bar when items selected */}
      {selectedUserIds.size > 0 && (
        <div className="bg-amber-500/15 border border-amber-500/40 rounded-2xl px-5 py-3 flex items-center justify-between gap-4 animate-in slide-in-from-top-2 duration-150">
          <div className="flex items-center gap-2 text-sm text-amber-300 font-semibold">
            <CheckSquare className="w-4 h-4 text-amber-400" />
            <span>
              <strong>{selectedUserIds.size}</strong> user
              {selectedUserIds.size > 1 ? "s" : ""} selected
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setBulkGrantModalOpen(true);
                setBulkSuccessMsg(null);
                setBulkErrorMsg(null);
              }}
              className="px-3.5 py-1.5 text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-lg shadow-emerald-500/20"
            >
              <Zap className="w-3.5 h-3.5 text-slate-950" />
              <span>Grant Product Access ({selectedUserIds.size})</span>
            </button>
            <button
              onClick={() => {
                const selectedUsers = users.filter((u) => selectedUserIds.has(u.id));
                exportUsersToCSV(selectedUsers);
              }}
              className="px-3 py-1.5 text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>
            <button
              onClick={() => setSelectedUserIds(new Set())}
              className="px-3 py-1.5 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition-all cursor-pointer"
            >
              Deselect All
            </button>
          </div>
        </div>
      )}

      {/* Live Counter & Summary */}
      <div className="flex items-center justify-between text-xs text-slate-400 px-1">
        <div>
          Showing <strong className="text-white">{sortedUsers.length}</strong> of{" "}
          <strong className="text-white">{users.length}</strong> users
          {sortedUsers.length !== users.length && (
            <span className="text-amber-400/90 ml-1">
              ({users.length - sortedUsers.length} filtered out)
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <span>
            Sorted by:{" "}
            <strong className="text-amber-400 capitalize">
              {sortConfig ? `${sortConfig.field} (${sortConfig.direction})` : "Default"}
            </strong>
          </span>
        </div>
      </div>

      {/* Table Container */}
      {loading ? (
        <div className="flex justify-center py-28">
          <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-2xl transition-colors">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead className="bg-slate-50 dark:bg-slate-900/80 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 text-xs select-none">
                <tr>
                  {/* Select All Checkbox */}
                  <th className="px-4 py-3.5 w-10 text-center">
                    <button
                      type="button"
                      onClick={toggleSelectAllVisible}
                      className="p-1 text-slate-400 hover:text-white transition-colors cursor-pointer"
                      title={allVisibleSelected ? "Deselect page" : "Select all on page"}
                    >
                      {allVisibleSelected ? (
                        <CheckSquare className="w-4 h-4 text-amber-400" />
                      ) : someVisibleSelected ? (
                        <MinusSquare className="w-4 h-4 text-amber-400/70" />
                      ) : (
                        <Square className="w-4 h-4 text-slate-600" />
                      )}
                    </button>
                  </th>

                  {/* USER Column Header */}
                  <th className="text-left px-5 py-3.5">
                    <div className="flex items-center justify-between gap-2">
                      <button
                        onClick={() => handleSort("user")}
                        className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-xs hover:text-white transition-colors group cursor-pointer text-left"
                      >
                        <span className={sortConfig?.field === "user" ? "text-amber-400 font-extrabold" : ""}>
                          User
                        </span>
                        {sortConfig?.field === "user" ? (
                          sortConfig.direction === "asc" ? (
                            <ArrowUp className="w-3.5 h-3.5 text-amber-400" />
                          ) : (
                            <ArrowDown className="w-3.5 h-3.5 text-amber-400" />
                          )
                        ) : (
                          <ArrowUpDown className="w-3 h-3 text-slate-600 opacity-40 group-hover:opacity-100 transition-opacity" />
                        )}
                      </button>
                      <button
                        onClick={(e) => toggleColumnFilter("user", e.currentTarget)}
                        className={`p-1 rounded-md transition-all cursor-pointer relative ${
                          userAvatarFilter !== "ALL"
                            ? "text-amber-400 bg-amber-500/15 border border-amber-500/30"
                            : "text-slate-500 hover:text-slate-300 hover:bg-slate-800"
                        }`}
                        title="Filter User Column"
                      >
                        <Filter className="w-3 h-3" />
                        {userAvatarFilter !== "ALL" && (
                          <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-amber-400 ring-2 ring-slate-900" />
                        )}
                      </button>
                    </div>
                  </th>

                  {/* CONNECT CARD Column Header */}
                  <th className="text-left px-5 py-3.5">
                    <div className="flex items-center justify-between gap-2">
                      <button
                        onClick={() => handleSort("card")}
                        className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-xs hover:text-white transition-colors group cursor-pointer text-left"
                      >
                        <span className={sortConfig?.field === "card" ? "text-emerald-400 font-extrabold" : ""}>
                          Connect Card
                        </span>
                        {sortConfig?.field === "card" ? (
                          sortConfig.direction === "asc" ? (
                            <ArrowUp className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <ArrowDown className="w-3.5 h-3.5 text-emerald-400" />
                          )
                        ) : (
                          <ArrowUpDown className="w-3 h-3 text-slate-600 opacity-40 group-hover:opacity-100 transition-opacity" />
                        )}
                      </button>
                      <button
                        onClick={(e) => toggleColumnFilter("card", e.currentTarget)}
                        className={`p-1 rounded-md transition-all cursor-pointer relative ${
                          cardFilter !== "ALL"
                            ? "text-emerald-400 bg-emerald-500/15 border border-emerald-500/30"
                            : "text-slate-500 hover:text-slate-300 hover:bg-slate-800"
                        }`}
                        title="Filter Connect Cards"
                      >
                        <Filter className="w-3 h-3" />
                        {cardFilter !== "ALL" && (
                          <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-emerald-400 ring-2 ring-slate-900" />
                        )}
                      </button>
                    </div>
                  </th>

                  {/* ROLE Column Header */}
                  <th className="text-left px-5 py-3.5">
                    <div className="flex items-center justify-between gap-2">
                      <button
                        onClick={() => handleSort("role")}
                        className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-xs hover:text-white transition-colors group cursor-pointer text-left"
                      >
                        <span className={sortConfig?.field === "role" ? "text-amber-400 font-extrabold" : ""}>
                          Role
                        </span>
                        {sortConfig?.field === "role" ? (
                          sortConfig.direction === "asc" ? (
                            <ArrowUp className="w-3.5 h-3.5 text-amber-400" />
                          ) : (
                            <ArrowDown className="w-3.5 h-3.5 text-amber-400" />
                          )
                        ) : (
                          <ArrowUpDown className="w-3 h-3 text-slate-600 opacity-40 group-hover:opacity-100 transition-opacity" />
                        )}
                      </button>
                      <button
                        onClick={(e) => toggleColumnFilter("role", e.currentTarget)}
                        className={`p-1 rounded-md transition-all cursor-pointer relative ${
                          roleFilter !== "ALL"
                            ? "text-blue-400 bg-blue-500/15 border border-blue-500/30"
                            : "text-slate-500 hover:text-slate-300 hover:bg-slate-800"
                        }`}
                        title="Filter Role"
                      >
                        <Filter className="w-3 h-3" />
                        {roleFilter !== "ALL" && (
                          <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-blue-400 ring-2 ring-slate-900" />
                        )}
                      </button>
                    </div>
                  </th>

                  {/* TIER Column Header */}
                  <th className="text-left px-5 py-3.5">
                    <div className="flex items-center justify-between gap-2">
                      <button
                        onClick={() => handleSort("tier")}
                        className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-xs hover:text-white transition-colors group cursor-pointer text-left"
                      >
                        <span className={sortConfig?.field === "tier" ? "text-amber-400 font-extrabold" : ""}>
                          Tier
                        </span>
                        {sortConfig?.field === "tier" ? (
                          sortConfig.direction === "asc" ? (
                            <ArrowUp className="w-3.5 h-3.5 text-amber-400" />
                          ) : (
                            <ArrowDown className="w-3.5 h-3.5 text-amber-400" />
                          )
                        ) : (
                          <ArrowUpDown className="w-3 h-3 text-slate-600 opacity-40 group-hover:opacity-100 transition-opacity" />
                        )}
                      </button>
                      <button
                        onClick={(e) => toggleColumnFilter("tier", e.currentTarget)}
                        className={`p-1 rounded-md transition-all cursor-pointer relative ${
                          tierFilter !== "ALL" || subStatusFilter !== "ALL"
                            ? "text-indigo-400 bg-indigo-500/15 border border-indigo-500/30"
                            : "text-slate-500 hover:text-slate-300 hover:bg-slate-800"
                        }`}
                        title="Filter Tier & Subscriptions"
                      >
                        <Filter className="w-3 h-3" />
                        {(tierFilter !== "ALL" || subStatusFilter !== "ALL") && (
                          <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-indigo-400 ring-2 ring-slate-900" />
                        )}
                      </button>
                    </div>
                  </th>

                  {/* ACCESS & TOOLKITS Column Header */}
                  <th className="text-left px-5 py-3.5">
                    <div className="flex items-center justify-between gap-2">
                      <button
                        onClick={() => handleSort("access")}
                        className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-xs hover:text-white transition-colors group cursor-pointer text-left"
                      >
                        <span className={sortConfig?.field === "access" ? "text-amber-400 font-extrabold" : ""}>
                          Access &amp; Toolkits
                        </span>
                        {sortConfig?.field === "access" ? (
                          sortConfig.direction === "asc" ? (
                            <ArrowUp className="w-3.5 h-3.5 text-amber-400" />
                          ) : (
                            <ArrowDown className="w-3.5 h-3.5 text-amber-400" />
                          )
                        ) : (
                          <ArrowUpDown className="w-3 h-3 text-slate-600 opacity-40 group-hover:opacity-100 transition-opacity" />
                        )}
                      </button>
                      <button
                        onClick={(e) => toggleColumnFilter("access", e.currentTarget)}
                        className={`p-1 rounded-md transition-all cursor-pointer relative ${
                          accessFilter !== "ALL"
                            ? "text-amber-400 bg-amber-500/15 border border-amber-500/30"
                            : "text-slate-500 hover:text-slate-300 hover:bg-slate-800"
                        }`}
                        title="Filter Product Access"
                      >
                        <Filter className="w-3 h-3" />
                        {accessFilter !== "ALL" && (
                          <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-amber-400 ring-2 ring-slate-900" />
                        )}
                      </button>
                    </div>
                  </th>

                  {/* JOINED Column Header */}
                  <th className="text-left px-5 py-3.5">
                    <div className="flex items-center justify-between gap-2">
                      <button
                        onClick={() => handleSort("joined")}
                        className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-xs hover:text-white transition-colors group cursor-pointer text-left"
                      >
                        <span className={sortConfig?.field === "joined" ? "text-amber-400 font-extrabold" : ""}>
                          Joined
                        </span>
                        {sortConfig?.field === "joined" ? (
                          sortConfig.direction === "asc" ? (
                            <ArrowUp className="w-3.5 h-3.5 text-amber-400" />
                          ) : (
                            <ArrowDown className="w-3.5 h-3.5 text-amber-400" />
                          )
                        ) : (
                          <ArrowUpDown className="w-3 h-3 text-slate-600 opacity-40 group-hover:opacity-100 transition-opacity" />
                        )}
                      </button>
                      <button
                        onClick={(e) => toggleColumnFilter("joined", e.currentTarget)}
                        className={`p-1 rounded-md transition-all cursor-pointer relative ${
                          joinedFilter !== "ALL"
                            ? "text-amber-400 bg-amber-500/15 border border-amber-500/30"
                            : "text-slate-500 hover:text-slate-300 hover:bg-slate-800"
                        }`}
                        title="Filter Joined Date"
                      >
                        <Filter className="w-3 h-3" />
                        {joinedFilter !== "ALL" && (
                          <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-amber-400 ring-2 ring-slate-900" />
                        )}
                      </button>
                    </div>
                  </th>

                  {/* ACTION Header */}
                  <th className="text-right px-5 py-3.5 uppercase tracking-wider font-bold text-xs">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80 text-sm">
                {paginatedUsers.map((u) => {
                  const rc = roleConfig[u.role] || roleConfig.MEMBER;
                  const tc = tierConfig[u.tier] || tierConfig.FREE;
                  const RoleIcon = rc.icon;
                  const card = u.digitalCard;
                  const hasCard = card?.isPurchased || card?.isActivated;
                  const isSelected = selectedUserIds.has(u.id);

                  const cellPadding = density === "comfortable" ? "px-5 py-4" : "px-5 py-2.5";
                  const avatarSize = density === "comfortable" ? "w-9 h-9" : "w-7 h-7 text-xs";

                  return (
                    <tr
                      key={u.id}
                      className={`transition-colors ${
                        isSelected
                          ? "bg-amber-500/10 hover:bg-amber-500/15"
                          : "hover:bg-slate-900/60"
                      }`}
                    >
                      {/* Row Checkbox */}
                      <td className="px-4 py-3 text-center">
                        <button
                          type="button"
                          onClick={() => toggleSelectUser(u.id)}
                          className="p-1 text-slate-400 hover:text-white transition-colors cursor-pointer"
                        >
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4 text-amber-400" />
                          ) : (
                            <Square className="w-4 h-4 text-slate-600 hover:text-slate-400" />
                          )}
                        </button>
                      </td>

                      {/* USER Cell */}
                      <td
                        className={`${cellPadding} cursor-pointer group`}
                        onClick={() => setSelectedProfileUserId(u.id)}
                        title="Click to view detailed member profile"
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`${avatarSize} rounded-xl bg-slate-800 overflow-hidden flex items-center justify-center shrink-0 border border-slate-700/50 group-hover:border-amber-500/50 transition-all`}
                          >
                            {u.image ? (
                              <img
                                src={u.image}
                                alt={u.name}
                                className="w-full h-full object-cover"
                                referrerPolicy="no-referrer"
                              />
                            ) : (
                              <span className="text-white font-bold group-hover:text-amber-400 transition-colors">
                                {u.name?.[0]?.toUpperCase() || "U"}
                              </span>
                            )}
                          </div>
                          <div>
                            <div className="font-semibold text-slate-100 text-sm group-hover:text-amber-400 transition-colors flex items-center gap-1.5 flex-wrap">
                              <span>{u.name || "Unnamed User"}</span>
                              {u.isBrandAmbassador && <BrandAmbassadorBadge size="sm" />}
                              <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-70 transition-opacity text-amber-400" />
                            </div>
                            <div className="text-xs text-slate-500 group-hover:text-slate-400 transition-colors">
                              {u.email}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* CONNECT CARD Cell */}
                      <td className={cellPadding}>
                        {hasCard ? (
                          card?.isActivated && card?.username ? (
                            <Link
                              href={`/connect/${card.username}`}
                              target="_blank"
                              className="inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 transition-all"
                            >
                              <CreditCard className="w-3 h-3 text-emerald-400" />
                              <span>Active</span>
                              <span className="text-emerald-500/70 font-mono text-[10px]">
                                @{card.username}
                              </span>
                              <ExternalLink className="w-2.5 h-2.5 opacity-60" />
                            </Link>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
                              <CreditCard className="w-3 h-3 text-amber-400" />
                              <span>Purchased (Pending Setup)</span>
                            </span>
                          )
                        ) : (
                          <span className="text-xs text-slate-600 font-medium">—</span>
                        )}
                      </td>

                      {/* ROLE Cell */}
                      <td className={cellPadding}>
                        <span
                          className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border ${rc.className}`}
                        >
                          <RoleIcon className="w-3 h-3" />
                          {rc.label}
                        </span>
                      </td>

                      {/* TIER Cell */}
                      <td className={cellPadding}>
                        <div className="flex flex-col items-start gap-1">
                          <span
                            className={`inline-flex items-center text-xs font-semibold px-2.5 py-1 rounded-full ${tc.className}`}
                          >
                            {tc.label}
                          </span>
                          {u.subscription?.currentPeriodEnd &&
                            new Date(u.subscription.currentPeriodEnd) > new Date() && (
                              <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400/90 font-medium">
                                <Clock className="w-2.5 h-2.5 text-emerald-400" />
                                <span>
                                  Valid till{" "}
                                  {new Date(u.subscription.currentPeriodEnd).toLocaleDateString()}
                                </span>
                              </span>
                            )}
                        </div>
                      </td>

                      {/* ACCESS & TOOLKITS Cell */}
                      <td className={cellPadding}>
                        {(() => {
                          const summary = getUserProductSummary(u);
                          if (summary.hasBundlePlus) {
                            return (
                              <div className="flex flex-col items-start gap-1">
                                <button
                                  type="button"
                                  onClick={() => handleOpenAccessDrawer(u.id)}
                                  className="inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full bg-gradient-to-r from-amber-500/20 via-purple-500/20 to-amber-500/20 text-amber-300 border border-amber-500/40 hover:border-amber-400 transition-all cursor-pointer shadow-sm group/btn"
                                  title="Click to manage user's product access"
                                >
                                  <Crown className="w-3 h-3 text-amber-400 animate-pulse" />
                                  <span>Ultimate PLUS</span>
                                  <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-amber-500/20 font-mono text-amber-200">
                                    All Access
                                  </span>
                                </button>
                                <span className="text-[10px] text-slate-400 pl-1">
                                  6 Toolkits • 6 Courses • 10 Seats
                                </span>
                              </div>
                            );
                          }

                          if (summary.hasBundle) {
                            return (
                              <div className="flex flex-col items-start gap-1">
                                <button
                                  type="button"
                                  onClick={() => handleOpenAccessDrawer(u.id)}
                                  className="inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30 hover:border-amber-400 transition-all cursor-pointer shadow-sm"
                                  title="Click to manage user's product access"
                                >
                                  <Sparkles className="w-3 h-3 text-amber-400" />
                                  <span>Ultimate Bundle</span>
                                  <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-amber-500/20 font-mono text-amber-300">
                                    6 TKs
                                  </span>
                                </button>
                                {summary.coursesCount > 0 && (
                                  <span className="text-[10px] text-slate-400 pl-1">
                                    + {summary.coursesCount} Course{summary.coursesCount > 1 ? "s" : ""}
                                  </span>
                                )}
                              </div>
                            );
                          }

                          if (summary.toolkitsCount > 0 || summary.coursesCount > 0) {
                            return (
                              <div className="flex flex-wrap items-center gap-1.5">
                                {summary.toolkitsCount > 0 && (
                                  <button
                                    type="button"
                                    onClick={() => handleOpenAccessDrawer(u.id)}
                                    className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-lg bg-indigo-500/10 text-indigo-300 border border-indigo-500/30 hover:bg-indigo-500/20 transition-colors cursor-pointer"
                                    title="View & manage toolkits"
                                  >
                                    <Package className="w-3 h-3 text-indigo-400" />
                                    <span>{summary.toolkitsCount} TK{summary.toolkitsCount > 1 ? "s" : ""}</span>
                                  </button>
                                )}
                                {summary.coursesCount > 0 && (
                                  <button
                                    type="button"
                                    onClick={() => handleOpenAccessDrawer(u.id)}
                                    className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-lg bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/20 transition-colors cursor-pointer"
                                    title="View & manage courses"
                                  >
                                    <Briefcase className="w-3 h-3 text-emerald-400" />
                                    <span>{summary.coursesCount} Course{summary.coursesCount > 1 ? "s" : ""}</span>
                                  </button>
                                )}
                              </div>
                            );
                          }

                          return (
                            <button
                              type="button"
                              onClick={() => handleOpenAccessDrawer(u.id)}
                              className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-amber-400 py-0.5 px-1.5 rounded hover:bg-slate-800/60 transition-colors cursor-pointer"
                              title="Click to grant toolkits, courses, or bundles"
                            >
                              <KeyRound className="w-3 h-3 text-slate-600 hover:text-amber-400" />
                              <span>Grant Access</span>
                            </button>
                          );
                        })()}
                      </td>

                      {/* JOINED Cell */}
                      <td className={`${cellPadding} text-xs text-slate-400`}>
                        <span title={new Date(u.createdAt).toLocaleString()}>
                          {timeAgo(u.createdAt)}
                        </span>
                      </td>

                      {/* ACTION Cell */}
                      <td className={`${cellPadding} text-right`}>
                        <button
                          onClick={(e) => toggleDropdown(u.id, e.currentTarget)}
                          disabled={loadingId === u.id}
                          className="flex items-center gap-1.5 text-xs font-semibold border border-slate-800 bg-[#060f1e] text-slate-300 px-3 py-1.5 rounded-lg hover:border-amber-500/50 hover:text-amber-500 transition-all disabled:opacity-50 ml-auto cursor-pointer"
                        >
                          {loadingId === u.id ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            "Manage"
                          )}
                          <ChevronDown className="w-3 h-3" />
                        </button>
                      </td>
                    </tr>
                  );
                })}

                {/* Empty State */}
                {paginatedUsers.length === 0 && (
                  <tr>
                    <td colSpan={8} className="text-center py-20 px-4">
                      <div className="max-w-md mx-auto flex flex-col items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-slate-800/80 border border-slate-700/50 flex items-center justify-center text-slate-500">
                          <Filter className="w-6 h-6 text-slate-400" />
                        </div>
                        <h3 className="text-base font-bold text-white">No users match your criteria</h3>
                        <p className="text-xs text-slate-400 text-center leading-relaxed">
                          We couldn&apos;t find any users matching your active filters or search terms. Try
                          adjusting or resetting them.
                        </p>
                        <button
                          onClick={handleResetAllFilters}
                          className="mt-2 px-4 py-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 transition-all cursor-pointer shadow-lg shadow-amber-500/20 flex items-center gap-1.5"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>Clear All Filters</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Table Footer with Pagination & Page Size */}
          <div className="bg-slate-50 dark:bg-slate-900/90 border-t border-slate-200 dark:border-slate-800 px-5 py-3.5 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600 dark:text-slate-400">
            {/* Page info & size select */}
            <div className="flex items-center gap-4">
              <span>
                Showing <strong className="text-slate-900 dark:text-slate-200">{totalItems === 0 ? 0 : startIndex + 1}</strong>{" "}
                to <strong className="text-slate-900 dark:text-slate-200">{endIndex}</strong> of{" "}
                <strong className="text-slate-900 dark:text-slate-200">{totalItems}</strong> users
              </span>

              <div className="flex items-center gap-1.5">
                <span className="text-slate-500">Per page:</span>
                <select
                  value={pageSize}
                  onChange={(e) => setPageSize(Number(e.target.value))}
                  className="bg-white dark:bg-[#060f1e] text-slate-800 dark:text-slate-200 font-semibold border border-slate-200 dark:border-slate-800 rounded-lg px-2 py-1 outline-none focus:border-amber-500 cursor-pointer"
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                  <option value={9999}>All</option>
                </select>
              </div>
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center gap-1">
                {/* First Page */}
                <button
                  onClick={() => setCurrentPage(1)}
                  disabled={safeCurrentPage <= 1}
                  className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#060f1e] text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer"
                  title="First page"
                >
                  <ChevronsLeft className="w-3.5 h-3.5" />
                </button>

                {/* Prev Page */}
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={safeCurrentPage <= 1}
                  className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#060f1e] text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer"
                  title="Previous page"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>

                {/* Page numbers */}
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter((p) => {
                    if (totalPages <= 7) return true;
                    if (p === 1 || p === totalPages) return true;
                    if (Math.abs(p - safeCurrentPage) <= 1) return true;
                    return false;
                  })
                  .map((p, idx, arr) => {
                    const prev = arr[idx - 1];
                    const showEllipsis = prev && p - prev > 1;

                    return (
                      <span key={p} className="flex items-center">
                        {showEllipsis && <span className="px-1.5 text-slate-600">…</span>}
                        <button
                          onClick={() => setCurrentPage(p)}
                          className={`min-w-7 h-7 px-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                            safeCurrentPage === p
                              ? "bg-amber-500 text-slate-950 font-black shadow-md shadow-amber-500/20"
                              : "border border-slate-800 bg-[#060f1e] text-slate-300 hover:bg-slate-800"
                          }`}
                        >
                          {p}
                        </button>
                      </span>
                    );
                  })}

                {/* Next Page */}
                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={safeCurrentPage >= totalPages}
                  className="p-1.5 rounded-lg border border-slate-800 bg-[#060f1e] hover:bg-slate-800 disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer"
                  title="Next page"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>

                {/* Last Page */}
                <button
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={safeCurrentPage >= totalPages}
                  className="p-1.5 rounded-lg border border-slate-800 bg-[#060f1e] hover:bg-slate-800 disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer"
                  title="Last page"
                >
                  <ChevronsRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Column Filter Popovers */}
      {activeColFilter && (
        <>
          {/* USER Column Filter */}
          {activeColFilter.col === "user" && (
            <ColumnFilterPopover
              title="Filter by User"
              anchor={activeColFilter.rect}
              onClose={() => setActiveColFilter(null)}
              onClear={() => setUserAvatarFilter("ALL")}
            >
              <div className="space-y-1.5">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Avatar Status
                </p>
                {[
                  { id: "ALL", label: "All Users" },
                  { id: "WITH_AVATAR", label: "Has Profile Picture" },
                  { id: "NO_AVATAR", label: "Initials Only (No Picture)" },
                ].map((item) => (
                  <button
                    key={item.id}
                    onClick={() => {
                      setUserAvatarFilter(item.id as AvatarFilter);
                      setActiveColFilter(null);
                    }}
                    className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium text-left transition-colors cursor-pointer ${
                      userAvatarFilter === item.id
                        ? "bg-amber-500/15 text-amber-300 font-bold"
                        : "hover:bg-slate-800 text-slate-300"
                    }`}
                  >
                    <span>{item.label}</span>
                    {userAvatarFilter === item.id && <Check className="w-3.5 h-3.5 text-amber-400" />}
                  </button>
                ))}
              </div>
            </ColumnFilterPopover>
          )}

          {/* CONNECT CARD Column Filter */}
          {activeColFilter.col === "card" && (
            <ColumnFilterPopover
              title="Filter Connect Cards"
              anchor={activeColFilter.rect}
              onClose={() => setActiveColFilter(null)}
              onClear={() => setCardFilter("ALL")}
            >
              <div className="space-y-1.5">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Card Status
                </p>
                {[
                  { id: "ALL", label: "All Users" },
                  { id: "ACTIVE", label: "Active (@handle)" },
                  { id: "PENDING", label: "Purchased (Pending Setup)" },
                  { id: "NONE", label: "No Connect Card" },
                ].map((item) => (
                  <button
                    key={item.id}
                    onClick={() => {
                      setCardFilter(item.id as CardFilter);
                      setActiveColFilter(null);
                    }}
                    className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium text-left transition-colors cursor-pointer ${
                      cardFilter === item.id
                        ? "bg-emerald-500/15 text-emerald-300 font-bold"
                        : "hover:bg-slate-800 text-slate-300"
                    }`}
                  >
                    <span>{item.label}</span>
                    {cardFilter === item.id && <Check className="w-3.5 h-3.5 text-emerald-400" />}
                  </button>
                ))}
              </div>
            </ColumnFilterPopover>
          )}

          {/* ROLE Column Filter */}
          {activeColFilter.col === "role" && (
            <ColumnFilterPopover
              title="Filter by Role"
              anchor={activeColFilter.rect}
              onClose={() => setActiveColFilter(null)}
              onClear={() => setRoleFilter("ALL")}
            >
              <div className="space-y-1.5">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Select Role
                </p>
                {[
                  { id: "ALL", label: "All Roles" },
                  { id: "MEMBER", label: "Member" },
                  { id: "ADMIN", label: "Admin" },
                ].map((item) => (
                  <button
                    key={item.id}
                    onClick={() => {
                      setRoleFilter(item.id as Role | "ALL");
                      setActiveColFilter(null);
                    }}
                    className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium text-left transition-colors cursor-pointer ${
                      roleFilter === item.id
                        ? "bg-blue-500/15 text-blue-300 font-bold"
                        : "hover:bg-slate-800 text-slate-300"
                    }`}
                  >
                    <span>{item.label}</span>
                    {roleFilter === item.id && <Check className="w-3.5 h-3.5 text-blue-400" />}
                  </button>
                ))}
              </div>
            </ColumnFilterPopover>
          )}

          {/* TIER Column Filter */}
          {activeColFilter.col === "tier" && (
            <ColumnFilterPopover
              title="Filter by Tier"
              anchor={activeColFilter.rect}
              onClose={() => setActiveColFilter(null)}
              onClear={() => {
                setTierFilter("ALL");
                setSubStatusFilter("ALL");
              }}
            >
              <div className="space-y-1.5">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Membership Tier
                </p>
                {[
                  { id: "ALL", label: "All Tiers" },
                  { id: "FREE", label: "Free" },
                  { id: "VIP", label: "VIP" },
                  { id: "MARKETPLACE", label: "Marketplace" },
                  { id: "MARKETPLACE_PLUS", label: "Plus" },
                ].map((item) => (
                  <button
                    key={item.id}
                    onClick={() => {
                      setTierFilter(item.id as Tier | "ALL");
                      setActiveColFilter(null);
                    }}
                    className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium text-left transition-colors cursor-pointer ${
                      tierFilter === item.id
                        ? "bg-indigo-500/15 text-indigo-300 font-bold"
                        : "hover:bg-slate-800 text-slate-300"
                    }`}
                  >
                    <span>{item.label}</span>
                    {tierFilter === item.id && <Check className="w-3.5 h-3.5 text-indigo-400" />}
                  </button>
                ))}

                <div className="pt-2 border-t border-slate-800">
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Subscription
                  </p>
                  <button
                    onClick={() => {
                      setSubStatusFilter((s) => (s === "ACTIVE" ? "ALL" : "ACTIVE"));
                      setActiveColFilter(null);
                    }}
                    className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium text-left transition-colors cursor-pointer ${
                      subStatusFilter === "ACTIVE"
                        ? "bg-emerald-500/15 text-emerald-300 font-bold"
                        : "hover:bg-slate-800 text-slate-300"
                    }`}
                  >
                    <span>Active Subscription Only</span>
                    {subStatusFilter === "ACTIVE" && (
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                    )}
                  </button>
                </div>
              </div>
            </ColumnFilterPopover>
          )}

          {/* ACCESS Column Filter */}
          {activeColFilter.col === "access" && (
            <ColumnFilterPopover
              title="Filter by Product Access"
              anchor={activeColFilter.rect}
              onClose={() => setActiveColFilter(null)}
              onClear={() => setAccessFilter("ALL")}
            >
              <div className="space-y-1.5">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Product / Bundle Access
                </p>
                {[
                  { id: "ALL", label: "All Users" },
                  { id: "HAS_ANY", label: "Has Any Product / Bundle" },
                  { id: "ULTIMATE_BUNDLE_PLUS", label: "👑 Ultimate Bundle PLUS" },
                  { id: "ULTIMATE_BUNDLE", label: "🏆 Ultimate Bundle ($1,200)" },
                  { id: "HAS_TOOLKIT", label: "📦 Has Toolkits" },
                  { id: "HAS_COURSE", label: "🎓 Has Masterclasses" },
                  { id: "NO_PRODUCTS", label: "No Products Owned" },
                ].map((item) => (
                  <button
                    key={item.id}
                    onClick={() => {
                      setAccessFilter(item.id as AccessFilter);
                      setActiveColFilter(null);
                    }}
                    className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium text-left transition-colors cursor-pointer ${
                      accessFilter === item.id
                        ? "bg-amber-500/15 text-amber-300 font-bold"
                        : "hover:bg-slate-800 text-slate-300"
                    }`}
                  >
                    <span>{item.label}</span>
                    {accessFilter === item.id && <Check className="w-3.5 h-3.5 text-amber-400" />}
                  </button>
                ))}
              </div>
            </ColumnFilterPopover>
          )}

          {/* JOINED Column Filter */}
          {activeColFilter.col === "joined" && (
            <ColumnFilterPopover
              title="Filter by Join Date"
              anchor={activeColFilter.rect}
              onClose={() => setActiveColFilter(null)}
              onClear={() => setJoinedFilter("ALL")}
            >
              <div className="space-y-1.5">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Joined Timeframe
                </p>
                {[
                  { id: "ALL", label: "All Time" },
                  { id: "TODAY", label: "Today (Past 24 hours)" },
                  { id: "7_DAYS", label: "Past 7 Days" },
                  { id: "30_DAYS", label: "Past 30 Days" },
                  { id: "90_DAYS", label: "Past 90 Days" },
                  { id: "OLDER_90", label: "Older than 90 Days" },
                ].map((item) => (
                  <button
                    key={item.id}
                    onClick={() => {
                      setJoinedFilter(item.id as JoinedFilter);
                      setActiveColFilter(null);
                    }}
                    className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium text-left transition-colors cursor-pointer ${
                      joinedFilter === item.id
                        ? "bg-amber-500/15 text-amber-300 font-bold"
                        : "hover:bg-slate-800 text-slate-300"
                    }`}
                  >
                    <span>{item.label}</span>
                    {joinedFilter === item.id && <Check className="w-3.5 h-3.5 text-amber-400" />}
                  </button>
                ))}
              </div>
            </ColumnFilterPopover>
          )}
        </>
      )}

      {/* Portal dropdown — renders outside overflow:hidden container */}
      {openDropdown && (
        <UserEditDropdown
          userId={openDropdown.id}
          currentRole={users.find((u) => u.id === openDropdown.id)?.role ?? "MEMBER"}
          currentTier={users.find((u) => u.id === openDropdown.id)?.tier ?? "FREE"}
          isBrandAmbassador={users.find((u) => u.id === openDropdown.id)?.isBrandAmbassador ?? false}
          anchor={openDropdown.rect}
          anchorEl={openDropdown.btnEl}
          onClose={() => setOpenDropdown(null)}
          onSelectRole={(role) => updateUser(openDropdown.id, { role })}
          onSelectTier={(tier) => updateUser(openDropdown.id, { tier })}
          onToggleBrandAmbassador={(isBrandAmbassador) =>
            updateUser(openDropdown.id, { isBrandAmbassador })
          }
          onRequestViewProfile={() => {
            const targetId = openDropdown.id;
            handleOpenOverviewDrawer(targetId);
          }}
          onRequestManageAccess={() => {
            const targetId = openDropdown.id;
            handleOpenAccessDrawer(targetId);
          }}
          onRequestAddMembership={() => {
            const target = users.find((u) => u.id === openDropdown.id);
            if (target) handleOpenGiftModal(target);
          }}
          onRequestResetPassword={() => {
            const target = users.find((u) => u.id === openDropdown.id);
            if (target) handleOpenResetModal(target);
          }}
          onRequestDelete={() => {
            const target = users.find((u) => u.id === openDropdown.id);
            if (target) setUserToDelete(target);
          }}
        />
      )}

      {/* Bulk Grant Product Access Modal */}
      {bulkGrantModalOpen && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl text-slate-100 max-h-[90vh] overflow-y-auto">
            {/* Header Icon */}
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center justify-center mb-4">
              <Zap className="w-6 h-6" />
            </div>

            <h3 className="text-xl font-bold text-white mb-1">Bulk Grant Product Access</h3>
            <p className="text-xs text-slate-400 leading-relaxed mb-4">
              Grant instant access to toolkits, masterclasses, or flagship bundles for{" "}
              <strong className="text-amber-400">{selectedUserIds.size}</strong> selected user
              {selectedUserIds.size > 1 ? "s" : ""}.
            </p>

            {bulkSuccessMsg ? (
              <div className="space-y-4">
                <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-2xl p-4 text-xs space-y-2">
                  <div className="flex items-center gap-2 font-bold text-sm">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Access Granted!</span>
                  </div>
                  <p className="text-slate-200">{bulkSuccessMsg}</p>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setBulkGrantModalOpen(false);
                      setSelectedUserIds(new Set());
                    }}
                    className="px-6 py-2.5 rounded-xl text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-slate-950 transition-all cursor-pointer shadow-lg shadow-emerald-500/20"
                  >
                    Done
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {bulkErrorMsg && (
                  <div className="bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl p-3 text-xs flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>{bulkErrorMsg}</span>
                  </div>
                )}

                {/* Step 1: Choose Type */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    1. Select Product Category
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { type: "bundle" as const, label: "👑 Flagship Bundle", defaultId: "ultimate-bundle-plus" },
                      { type: "toolkit" as const, label: "📦 Canonical Toolkit", defaultId: "30-day-tax-office" },
                      { type: "course" as const, label: "🎓 Masterclass Course", defaultId: "30-day-tax-office-launch" },
                    ].map((cat) => (
                      <button
                        key={cat.type}
                        type="button"
                        onClick={() => {
                          setBulkItemType(cat.type);
                          setBulkItemId(cat.defaultId);
                          if (cat.type === "bundle") {
                            setBulkBonusMonths(cat.defaultId === "ultimate-bundle-plus" ? 2 : 1);
                            setBulkStaffSeats(cat.defaultId === "ultimate-bundle-plus" ? 10 : 5);
                          } else if (cat.type === "toolkit") {
                            setBulkBonusMonths(0);
                            setBulkStaffSeats(5);
                          } else {
                            setBulkBonusMonths(0);
                            setBulkStaffSeats(0);
                          }
                        }}
                        className={`py-2.5 px-3 rounded-xl text-xs font-bold transition-all border text-center cursor-pointer ${
                          bulkItemType === cat.type
                            ? "bg-amber-500 text-slate-950 border-amber-400 shadow-md shadow-amber-500/20"
                            : "bg-[#060f1e] text-slate-400 border-slate-800 hover:border-slate-700 hover:text-slate-200"
                        }`}
                      >
                        {cat.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Step 2: Choose Specific Item */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    2. Select Item
                  </label>
                  {bulkItemType === "bundle" && (
                    <div className="space-y-2">
                      {[
                        {
                          id: "ultimate-bundle-plus",
                          title: "👑 Ultimate Bundle PLUS ($2,400)",
                          desc: "Unlocks all 6 toolkits + 6 courses + 10 staff training seats + 2 months Marketplace Plus",
                          months: 2,
                          seats: 10,
                        },
                        {
                          id: "ultimate-bundle",
                          title: "🏆 Ultimate Bundle ($1,200)",
                          desc: "Unlocks all 6 toolkits + 5 staff training seats + 1 month VIP",
                          months: 1,
                          seats: 5,
                        },
                      ].map((bundle) => (
                        <div
                          key={bundle.id}
                          onClick={() => {
                            setBulkItemId(bundle.id);
                            setBulkBonusMonths(bundle.months);
                            setBulkStaffSeats(bundle.seats);
                          }}
                          className={`p-3 rounded-xl border cursor-pointer transition-all ${
                            bulkItemId === bundle.id
                              ? "bg-amber-500/10 border-amber-500/50 text-amber-300"
                              : "bg-[#060f1e] border-slate-800 text-slate-300 hover:border-slate-700"
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold">{bundle.title}</span>
                            {bulkItemId === bundle.id && (
                              <Check className="w-3.5 h-3.5 text-amber-400" />
                            )}
                          </div>
                          <p className="text-[11px] text-slate-400 mt-1">{bundle.desc}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  {bulkItemType === "toolkit" && (
                    <select
                      value={bulkItemId}
                      onChange={(e) => setBulkItemId(e.target.value)}
                      className="w-full bg-[#060f1e] text-slate-100 text-xs px-3.5 py-2.5 border border-slate-800 rounded-xl outline-none focus:border-amber-500"
                    >
                      <option value="30-day-tax-office">30-Day Tax Office Launch ($497)</option>
                      <option value="due-diligence-course">Staff Audit-Ready Due Diligence ($497)</option>
                      <option value="irs-fine-defense">IRS Fine Defense &amp; Penalty Abatement ($497)</option>
                      <option value="schedule-c-reconstruction">Schedule C Income Reconstruction ($497)</option>
                      <option value="audit-playbook">IRS Audit &amp; Examination Playbook ($497)</option>
                      <option value="credits-filing-status">Tax Credits &amp; Filing Status Deep Dive ($497)</option>
                    </select>
                  )}

                  {bulkItemType === "course" && (
                    <select
                      value={bulkItemId}
                      onChange={(e) => setBulkItemId(e.target.value)}
                      className="w-full bg-[#060f1e] text-slate-100 text-xs px-3.5 py-2.5 border border-slate-800 rounded-xl outline-none focus:border-amber-500"
                    >
                      <option value="30-day-tax-office-launch">30-Day Tax Office Launch Masterclass</option>
                      <option value="irs-fine-defense-masterclass">IRS Fine Defense Masterclass</option>
                      <option value="schedule-c-reconstruction-course">Schedule C Reconstruction Masterclass</option>
                      <option value="irs-audit-playbook-course">IRS Audit Playbook Masterclass</option>
                      <option value="credits-filing-status-course">Tax Credits &amp; Filing Status Masterclass</option>
                      <option value="staff-audit-ready-due-diligence">Staff Audit-Ready Due Diligence Masterclass</option>
                    </select>
                  )}
                </div>

                {/* Step 3: Optional Entitlement Configurations */}
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                      Staff Training Seats
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={bulkStaffSeats}
                      onChange={(e) => setBulkStaffSeats(Math.max(0, parseInt(e.target.value, 10) || 0))}
                      className="w-full bg-[#060f1e] text-slate-100 text-xs px-3 py-2 border border-slate-800 rounded-xl outline-none focus:border-amber-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                      Bonus Membership (Mos)
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={24}
                      value={bulkBonusMonths}
                      onChange={(e) => setBulkBonusMonths(Math.max(0, parseInt(e.target.value, 10) || 0))}
                      className="w-full bg-[#060f1e] text-slate-100 text-xs px-3 py-2 border border-slate-800 rounded-xl outline-none focus:border-amber-500"
                    />
                  </div>
                </div>

                {/* Notify users toggle */}
                <div className="flex items-center gap-2 pt-2">
                  <input
                    type="checkbox"
                    id="bulkNotifyCheck"
                    checked={bulkNotify}
                    onChange={(e) => setBulkNotify(e.target.checked)}
                    className="rounded border-slate-700 bg-slate-800 text-amber-500 cursor-pointer"
                  />
                  <label htmlFor="bulkNotifyCheck" className="text-xs text-slate-300 cursor-pointer select-none">
                    Send in-app notification to users informing them of unlocked access
                  </label>
                </div>

                {/* Footer Buttons */}
                <div className="flex gap-3 justify-end pt-3 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setBulkGrantModalOpen(false)}
                    disabled={bulkActionBusy}
                    className="px-4 py-2.5 rounded-xl text-xs font-semibold bg-slate-800 text-slate-300 hover:bg-slate-700 transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleExecuteBulkGrant}
                    disabled={bulkActionBusy || selectedUserIds.size === 0}
                    className="px-5 py-2.5 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 transition-all shadow-lg shadow-amber-500/20 flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                  >
                    {bulkActionBusy ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Zap className="w-3.5 h-3.5" />
                    )}
                    <span>
                      {bulkActionBusy
                        ? "Granting Access..."
                        : `Grant Access to ${selectedUserIds.size} User(s)`}
                    </span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Gift Free Membership Modal */}
      {userToAddMembership && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl text-slate-100">
            {/* Header Icon */}
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center mb-4">
              <Gift className="w-6 h-6" />
            </div>

            <h3 className="text-xl font-bold text-white mb-1">Add Free Membership Months</h3>
            <p className="text-xs text-slate-400 leading-relaxed mb-4">
              Grant complimentary membership months to{" "}
              <strong className="text-white">{userToAddMembership.name}</strong> (
              <span className="text-slate-300">{userToAddMembership.email}</span>).
            </p>

            {giftSuccess ? (
              <div className="space-y-4">
                <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-2xl p-4 text-xs space-y-2">
                  <div className="flex items-center gap-2 font-bold text-sm">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Free Membership Granted!</span>
                  </div>
                  <p className="text-slate-200">{giftSuccess}</p>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="button"
                    onClick={handleCloseGiftModal}
                    className="px-6 py-2.5 rounded-xl text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-slate-950 transition-all cursor-pointer shadow-lg shadow-emerald-500/20"
                  >
                    Done
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleGiftMembership} className="space-y-4">
                {giftError && (
                  <div className="bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl p-3 text-xs flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>{giftError}</span>
                  </div>
                )}

                {/* Select Tier */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Membership Tier
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {(["VIP", "MARKETPLACE", "MARKETPLACE_PLUS"] as Tier[]).map((t) => {
                      const tc = tierConfig[t];
                      const selected = giftTier === t;
                      return (
                        <button
                          key={t}
                          type="button"
                          onClick={() => setGiftTier(t)}
                          className={`py-2 px-3 rounded-xl text-xs font-bold transition-all border text-center cursor-pointer ${
                            selected
                              ? "bg-emerald-500 text-slate-950 border-emerald-400 shadow-md shadow-emerald-500/20"
                              : "bg-[#060f1e] text-slate-400 border-slate-800 hover:border-slate-700 hover:text-slate-200"
                          }`}
                        >
                          {tc.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Select Duration */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Duration (Months)
                  </label>
                  <div className="grid grid-cols-5 gap-1.5 mb-2">
                    {[1, 2, 3, 6, 12].map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setGiftMonths(m)}
                        className={`py-1.5 rounded-lg text-xs font-semibold transition-all border cursor-pointer ${
                          giftMonths === m
                            ? "bg-amber-500 text-slate-950 border-amber-400 font-bold"
                            : "bg-[#060f1e] text-slate-400 border-slate-800 hover:border-slate-700 hover:text-slate-200"
                        }`}
                      >
                        +{m} {m === 1 ? "Mo" : "Mos"}
                      </button>
                    ))}
                  </div>

                  <div className="relative">
                    <input
                      type="number"
                      min={1}
                      max={120}
                      value={giftMonths || ""}
                      onChange={(e) =>
                        setGiftMonths(Math.max(1, parseInt(e.target.value, 10) || 1))
                      }
                      placeholder="Custom number of months"
                      className="w-full bg-[#060f1e] text-slate-100 text-sm px-3.5 py-2 border border-slate-800 rounded-xl outline-none focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/10 transition-all font-mono"
                    />
                    <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-slate-500">
                      months
                    </span>
                  </div>
                </div>

                {/* Summary / Preview Box */}
                <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-3.5 text-xs space-y-1.5">
                  <div className="flex items-center justify-between text-slate-400">
                    <span>Current Tier:</span>
                    <span className="font-semibold text-slate-200">{userToAddMembership.tier}</span>
                  </div>
                  {userToAddMembership.subscription?.currentPeriodEnd && (
                    <div className="flex items-center justify-between text-slate-400">
                      <span>Current Expiry:</span>
                      <span className="font-mono text-slate-300">
                        {new Date(
                          userToAddMembership.subscription.currentPeriodEnd
                        ).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                  <div className="flex items-center justify-between text-emerald-400 font-semibold pt-1 border-t border-slate-800">
                    <span className="flex items-center gap-1">
                      <CalendarCheck className="w-3.5 h-3.5" />
                      <span>New Expiration:</span>
                    </span>
                    <span className="font-mono font-bold">
                      {(() => {
                        const now = new Date();
                        const existing = userToAddMembership.subscription?.currentPeriodEnd
                          ? new Date(userToAddMembership.subscription.currentPeriodEnd)
                          : null;
                        const base = existing && existing > now ? new Date(existing) : new Date(now);
                        base.setMonth(base.getMonth() + (giftMonths || 1));
                        return base.toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        });
                      })()}
                    </span>
                  </div>
                </div>

                <div className="flex gap-3 justify-end pt-3 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={handleCloseGiftModal}
                    disabled={giftingMembership}
                    className="px-4 py-2.5 rounded-xl text-xs font-semibold bg-slate-800 text-slate-300 hover:bg-slate-700 transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={giftingMembership || !giftMonths}
                    className="px-5 py-2.5 rounded-xl text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-slate-950 transition-all shadow-lg shadow-emerald-500/20 flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                  >
                    {giftingMembership ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Gift className="w-3.5 h-3.5" />
                    )}
                    <span>
                      {giftingMembership ? "Adding Months..." : `Grant +${giftMonths} Mo ${giftTier}`}
                    </span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {userToResetPassword && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl text-slate-100">
            {/* Header Icon */}
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center justify-center mb-4">
              <KeyRound className="w-6 h-6" />
            </div>

            <h3 className="text-xl font-bold text-white mb-1">Set / Reset Password</h3>
            <p className="text-xs text-slate-400 leading-relaxed mb-4">
              Directly set a new password for{" "}
              <strong className="text-white">{userToResetPassword.name}</strong> (
              <span className="text-slate-300">{userToResetPassword.email}</span>).
            </p>

            {resetSuccess ? (
              <div className="space-y-4">
                <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-2xl p-4 text-xs space-y-2">
                  <div className="flex items-center gap-2 font-bold text-sm">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Password Updated Successfully</span>
                  </div>
                  <p className="text-slate-300">
                    The user can now sign in using their email and this new password:
                  </p>
                  <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3 flex items-center justify-between font-mono text-sm text-amber-400">
                    <span>{newPassword}</span>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(
                          `Email: ${userToResetPassword.email}\nPassword: ${newPassword}`
                        );
                        setCopiedCredentials(true);
                        setTimeout(() => setCopiedCredentials(false), 2000);
                      }}
                      className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 rounded-lg flex items-center gap-1 transition-all cursor-pointer"
                    >
                      {copiedCredentials ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                      <span>{copiedCredentials ? "Copied!" : "Copy"}</span>
                    </button>
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="button"
                    onClick={handleCloseResetModal}
                    className="px-6 py-2.5 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 transition-all cursor-pointer shadow-lg shadow-amber-500/20"
                  >
                    Done
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleResetPassword} className="space-y-4">
                {resetError && (
                  <div className="bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl p-3 text-xs flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>{resetError}</span>
                  </div>
                )}

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-semibold text-slate-300">
                      New Password
                    </label>
                    <button
                      type="button"
                      onClick={generateRandomPassword}
                      className="text-[11px] font-semibold text-amber-400 hover:text-amber-300 flex items-center gap-1 cursor-pointer transition-colors"
                    >
                      <Sparkles className="w-3 h-3" />
                      <span>Generate Strong Password</span>
                    </button>
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input
                      type={showPassword ? "text" : "password"}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Minimum 8 characters"
                      required
                      minLength={8}
                      className="w-full bg-[#060f1e] text-slate-100 text-sm pl-10 pr-10 py-2.5 border border-slate-800 rounded-xl outline-none focus:border-amber-500/50 focus:ring-2 focus:ring-amber-500/10 transition-all font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((p) => !p)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 p-1 cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Confirm Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input
                      type={showPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Re-enter password"
                      required
                      minLength={8}
                      className="w-full bg-[#060f1e] text-slate-100 text-sm pl-10 pr-4 py-2.5 border border-slate-800 rounded-xl outline-none focus:border-amber-500/50 focus:ring-2 focus:ring-amber-500/10 transition-all font-mono"
                    />
                  </div>
                </div>

                <div className="flex gap-3 justify-end pt-3 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={handleCloseResetModal}
                    disabled={resettingPassword}
                    className="px-4 py-2.5 rounded-xl text-xs font-semibold bg-slate-800 text-slate-300 hover:bg-slate-700 transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={resettingPassword || !newPassword}
                    className="px-5 py-2.5 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 transition-all shadow-lg shadow-amber-500/20 flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                  >
                    {resettingPassword ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <KeyRound className="w-3.5 h-3.5" />
                    )}
                    <span>{resettingPassword ? "Saving..." : "Set Password"}</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {userToDelete && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl text-slate-100">
            <div className="w-12 h-12 rounded-2xl bg-red-500/10 text-red-400 border border-red-500/20 flex items-center justify-center mb-4">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <h3 className="text-xl font-bold text-white mb-1.5">Delete User Account</h3>
            <p className="text-xs text-slate-400 leading-relaxed mb-4">
              Are you sure you want to delete <strong className="text-white">{userToDelete.name}</strong> (
              <span className="text-slate-300">{userToDelete.email}</span>)? This will permanently remove their
              account, sessions, Connect Card, and all related records.
            </p>

            {deleteError && (
              <div className="mb-4 bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl p-3 text-xs flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <span className="leading-relaxed">{deleteError}</span>
              </div>
            )}

            <div className="flex gap-3 justify-end pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => {
                  setUserToDelete(null);
                  setDeleteError(null);
                }}
                disabled={deleting}
                className="px-4 py-2.5 rounded-xl text-xs font-semibold bg-slate-800 text-slate-300 hover:bg-slate-700 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteUser}
                disabled={deleting}
                className="px-5 py-2.5 rounded-xl text-xs font-bold bg-red-600 hover:bg-red-500 text-white transition-all shadow-lg shadow-red-600/20 flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
              >
                {deleting ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Trash2 className="w-3.5 h-3.5" />
                )}
                <span>{deleting ? "Deleting..." : "Confirm Delete"}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Detailed Member Profile Drawer */}
      {selectedProfileUserId && (
        <AdminMemberProfileDrawer
          userId={selectedProfileUserId}
          initialTab={selectedDrawerTab}
          onClose={() => {
            setSelectedProfileUserId(null);
            setSelectedDrawerTab("overview");
          }}
          onAccessUpdated={fetchUsers}
          onGiftMembership={(target) => {
            if (target) handleOpenGiftModal(target);
          }}
          onResetPassword={(target) => {
            if (target) handleOpenResetModal(target);
          }}
          onUpdateRoleTier={() => {
            fetchUsers();
          }}
          onDeleteUser={(target) => {
            if (target) {
              setUserToDelete(target);
              setSelectedProfileUserId(null);
            }
          }}
        />
      )}
    </div>
  );
}

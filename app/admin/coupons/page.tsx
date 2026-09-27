"use client";

import { useEffect, useState } from "react";
import {
  Ticket,
  Plus,
  Search,
  Check,
  Copy,
  Trash2,
  Edit2,
  Calendar,
  AlertTriangle,
  Loader2,
  TrendingUp,
  Percent,
  DollarSign,
  Sparkles,
  ShieldCheck,
  Tag,
  CheckCircle2,
  X,
  ToggleLeft,
  ToggleRight,
  ExternalLink,
  Layers,
  ShoppingBag,
  BookOpen,
  Crown,
  Package,
  Users,
  ShieldAlert,
  Clock,
} from "lucide-react";

interface Coupon {
  id: string;
  code: string;
  discountType: "PERCENT" | "FIXED";
  discountValue: number;
  durationMonths?: number | null;
  maxUses: number | null;
  usedCount: number;
  expiresAt: string | null;
  isActive: boolean;
  sellerId: string;
  listingId: string | null;
  createdAt: string;
  seller?: {
    id: string;
    name: string;
    email: string;
    role: string;
    image: string | null;
  };
  listing?: {
    id: string;
    title: string;
    price: number | null;
    category: string;
  } | null;
}

interface StatsGroup {
  total: number;
  active: number;
  redemptions: number;
}

interface Stats {
  admin: StatsGroup;
  seller: StatsGroup;
}

const APPLIES_TO_OPTIONS = [
  { value: "ALL", label: "All Platform Checkouts (Universal)", icon: Layers },
  { value: "MEMBERSHIP", label: "Membership Upgrades & Tiers", icon: Crown },
  { value: "COURSES", label: "Academy Courses", icon: BookOpen },
  { value: "TOOLKITS", label: "Success Toolkits & Bundles", icon: Package },
  { value: "MARKETPLACE", label: "Marketplace Digital Items", icon: ShoppingBag },
];

export default function AdminCouponsPage() {
  const [adminCoupons, setAdminCoupons] = useState<Coupon[]>([]);
  const [sellerCoupons, setSellerCoupons] = useState<Coupon[]>([]);
  const [stats, setStats] = useState<Stats>({
    admin: { total: 0, active: 0, redemptions: 0 },
    seller: { total: 0, active: 0, redemptions: 0 },
  });
  const [loading, setLoading] = useState(true);

  // Top-level tab: "ADMIN_PROMOS" vs "SELLER_COUPONS"
  const [mainTab, setMainTab] = useState<"ADMIN_PROMOS" | "SELLER_COUPONS">("ADMIN_PROMOS");

  // Search & sub-filter
  const [search, setSearch] = useState("");
  const [subFilter, setSubFilter] = useState<"ALL" | "ACTIVE" | "INACTIVE" | "MEMBERSHIP" | "COURSES" | "TOOLKITS">("ALL");

  // Modal State for Admin Promo Codes
  const [showModal, setShowModal] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null);
  const [code, setCode] = useState("");
  const [discountType, setDiscountType] = useState<"PERCENT" | "FIXED">("PERCENT");
  const [discountValue, setDiscountValue] = useState("");
  const [appliesTo, setAppliesTo] = useState("ALL");
  const [durationMonths, setDurationMonths] = useState("1");
  const [maxUses, setMaxUses] = useState("");
  const [isUnlimitedUses, setIsUnlimitedUses] = useState(true);
  const [expiresAt, setExpiresAt] = useState("");
  const [isNeverExpires, setIsNeverExpires] = useState(true);
  const [isActive, setIsActive] = useState(true);
  const [saving, setSaving] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  // Delete modal state
  const [couponToDelete, setCouponToDelete] = useState<Coupon | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Copy code feedback
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const fetchCoupons = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/coupons");
      const data = await res.json();
      if (res.ok) {
        setAdminCoupons(data.adminCoupons || []);
        setSellerCoupons(data.sellerCoupons || []);
        setStats(data.stats || {
          admin: { total: 0, active: 0, redemptions: 0 },
          seller: { total: 0, active: 0, redemptions: 0 },
        });
      }
    } catch (err) {
      console.error("Failed to load coupons:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCoupons();
  }, []);

  const handleOpenCreateModal = () => {
    setEditingCoupon(null);
    setCode("");
    setDiscountType("PERCENT");
    setDiscountValue("");
    setAppliesTo("ALL");
    setDurationMonths("1");
    setMaxUses("");
    setIsUnlimitedUses(true);
    setExpiresAt("");
    setIsNeverExpires(true);
    setIsActive(true);
    setModalError(null);
    setShowModal(true);
  };

  const handleOpenEditModal = (coupon: Coupon) => {
    setEditingCoupon(coupon);
    setCode(coupon.code);
    setDiscountType(coupon.discountType);
    setDiscountValue(String(coupon.discountValue));
    setAppliesTo(coupon.listingId || "ALL");
    setDurationMonths(coupon.durationMonths != null ? String(coupon.durationMonths) : "1");
    setMaxUses(coupon.maxUses != null ? String(coupon.maxUses) : "");
    setIsUnlimitedUses(coupon.maxUses == null);
    setExpiresAt(coupon.expiresAt ? coupon.expiresAt.split("T")[0] : "");
    setIsNeverExpires(!coupon.expiresAt);
    setIsActive(coupon.isActive);
    setModalError(null);
    setShowModal(true);
  };

  const generateRandomCode = () => {
    const prefixes = ["PROMO", "TAXPRO", "VIP", "SAVE", "DISCOUNT", "LAUNCH"];
    const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    const randomNum = Math.floor(10 + Math.random() * 90);
    setCode(`${prefix}${randomNum}`);
  };

  const handleSaveCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError(null);

    if (!code.trim()) {
      setModalError("Please enter a coupon code.");
      return;
    }

    const val = parseFloat(discountValue);
    if (isNaN(val) || val <= 0) {
      setModalError("Please enter a valid positive discount amount.");
      return;
    }

    if (discountType === "PERCENT" && val > 100) {
      setModalError("Percentage discount cannot exceed 100%.");
      return;
    }

    const parsedDuration = parseInt(durationMonths, 10);
    if ((appliesTo === "MEMBERSHIP" || appliesTo === "ALL") && (isNaN(parsedDuration) || parsedDuration < 1 || parsedDuration > 120)) {
      setModalError("Please select or enter a valid duration between 1 and 120 months.");
      return;
    }

    setSaving(true);

    const payload = {
      code: code.trim().toUpperCase(),
      discountType,
      discountValue: val,
      appliesTo,
      durationMonths: isNaN(parsedDuration) || parsedDuration < 1 ? 1 : parsedDuration,
      maxUses: isUnlimitedUses ? null : maxUses ? parseInt(maxUses, 10) : null,
      expiresAt: isNeverExpires ? null : expiresAt ? new Date(expiresAt).toISOString() : null,
      isActive,
    };

    try {
      const url = editingCoupon ? `/api/admin/coupons/${editingCoupon.id}` : "/api/admin/coupons";
      const method = editingCoupon ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (res.ok) {
        setShowModal(false);
        fetchCoupons();
      } else {
        setModalError(data.error || "Failed to save coupon.");
      }
    } catch {
      setModalError("Network error while saving coupon.");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (coupon: Coupon) => {
    try {
      const res = await fetch(`/api/admin/coupons/${coupon.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !coupon.isActive }),
      });
      if (res.ok) {
        if (coupon.seller?.role === "ADMIN") {
          setAdminCoupons((prev) =>
            prev.map((c) => (c.id === coupon.id ? { ...c, isActive: !c.isActive } : c))
          );
        } else {
          setSellerCoupons((prev) =>
            prev.map((c) => (c.id === coupon.id ? { ...c, isActive: !c.isActive } : c))
          );
        }
      }
    } catch (err) {
      console.error("Failed to toggle coupon status:", err);
    }
  };

  const handleDeleteCoupon = async () => {
    if (!couponToDelete) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/coupons/${couponToDelete.id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setAdminCoupons((prev) => prev.filter((c) => c.id !== couponToDelete.id));
        setSellerCoupons((prev) => prev.filter((c) => c.id !== couponToDelete.id));
        setCouponToDelete(null);
      }
    } catch (err) {
      console.error("Failed to delete coupon:", err);
    } finally {
      setDeleting(false);
    }
  };

  const copyCode = (c: string) => {
    navigator.clipboard.writeText(c);
    setCopiedCode(c);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  // Active list based on main tab
  const activeList = mainTab === "ADMIN_PROMOS" ? adminCoupons : sellerCoupons;

  // Filter coupons
  const filteredCoupons = activeList.filter((c) => {
    const matchesSearch =
      c.code.toLowerCase().includes(search.toLowerCase()) ||
      c.seller?.name?.toLowerCase().includes(search.toLowerCase()) ||
      c.seller?.email?.toLowerCase().includes(search.toLowerCase()) ||
      (c.listing?.title && c.listing.title.toLowerCase().includes(search.toLowerCase()));

    if (!matchesSearch) return false;

    if (subFilter === "ACTIVE") return c.isActive && (!c.expiresAt || new Date() <= new Date(c.expiresAt));
    if (subFilter === "INACTIVE") return !c.isActive || (c.expiresAt && new Date() > new Date(c.expiresAt));
    if (subFilter === "MEMBERSHIP") return c.listingId === "MEMBERSHIP" || c.listingId === "UPGRADE" || !c.listingId;
    if (subFilter === "COURSES") return c.listingId === "COURSES" || !c.listingId;
    if (subFilter === "TOOLKITS") return c.listingId === "TOOLKITS" || !c.listingId;

    return true;
  });

  const currentStats = mainTab === "ADMIN_PROMOS" ? stats.admin : stats.seller;

  return (
    <div className="max-w-7xl mx-auto space-y-6 text-slate-100">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white flex items-center gap-2.5">
            <Ticket className="w-7 h-7 text-amber-500" />
            <span>Coupons & Promotions</span>
          </h1>
          <p className="text-slate-400 text-sm mt-0.5">
            Manage official platform promotional discount codes and oversee user-created seller coupons
          </p>
        </div>

        <button
          onClick={handleOpenCreateModal}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-lg shadow-amber-500/20 transition-all cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Create Promo Code</span>
        </button>
      </div>

      {/* Main Category Switcher Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2 overflow-x-auto">
        <button
          onClick={() => {
            setMainTab("ADMIN_PROMOS");
            setSubFilter("ALL");
          }}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
            mainTab === "ADMIN_PROMOS"
              ? "bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/20"
              : "bg-slate-900/80 text-slate-400 hover:text-white border border-slate-800 hover:bg-slate-800"
          }`}
        >
          <Sparkles className="w-4 h-4" />
          <span>Admin Platform Promo Codes</span>
          <span
            className={`text-[10px] px-2 py-0.5 rounded-full ${
              mainTab === "ADMIN_PROMOS" ? "bg-slate-950/30 text-slate-950 font-black" : "bg-slate-800 text-slate-400"
            }`}
          >
            {stats.admin.total}
          </span>
        </button>

        <button
          onClick={() => {
            setMainTab("SELLER_COUPONS");
            setSubFilter("ALL");
          }}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
            mainTab === "SELLER_COUPONS"
              ? "bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/20"
              : "bg-slate-900/80 text-slate-400 hover:text-white border border-slate-800 hover:bg-slate-800"
          }`}
        >
          <Users className="w-4 h-4" />
          <span>User / Seller Marketplace Coupons</span>
          <span
            className={`text-[10px] px-2 py-0.5 rounded-full ${
              mainTab === "SELLER_COUPONS" ? "bg-slate-950/30 text-slate-950 font-black" : "bg-slate-800 text-slate-400"
            }`}
          >
            {stats.seller.total}
          </span>
        </button>
      </div>

      {/* Metrics Summary Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 flex items-center justify-between">
          <div>
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              {mainTab === "ADMIN_PROMOS" ? "Active Platform Codes" : "Active Seller Codes"}
            </div>
            <div className="text-2xl font-black text-emerald-400 mt-1">{currentStats.active}</div>
            <div className="text-[11px] text-slate-500 mt-0.5">Out of {currentStats.total} total codes</div>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <Sparkles className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 flex items-center justify-between">
          <div>
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Redemptions</div>
            <div className="text-2xl font-black text-amber-400 mt-1">{currentStats.redemptions}</div>
            <div className="text-[11px] text-slate-500 mt-0.5">Discounts claimed by customers</div>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
            <TrendingUp className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 flex items-center justify-between">
          <div>
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Channel Scope</div>
            <div className="text-2xl font-black text-white mt-1">
              {mainTab === "ADMIN_PROMOS" ? "Universal" : "Marketplace Items"}
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">
              {mainTab === "ADMIN_PROMOS"
                ? "Memberships, Courses, Toolkits, & Platform"
                : "Individual seller digital items"}
            </div>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
            {mainTab === "ADMIN_PROMOS" ? <Layers className="w-6 h-6" /> : <ShoppingBag className="w-6 h-6" />}
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            placeholder={
              mainTab === "ADMIN_PROMOS"
                ? "Search admin promo codes…"
                : "Search seller codes, seller name, or listing title…"
            }
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-[#060f1e] text-slate-100 text-sm pl-10 pr-4 py-2.5 border border-slate-800 rounded-xl outline-none focus:border-amber-500/50 focus:ring-2 focus:ring-amber-500/10 transition-all font-[inherit]"
          />
        </div>

        <div className="flex gap-1.5 flex-wrap">
          {[
            { id: "ALL", label: "All Codes" },
            { id: "ACTIVE", label: "Active" },
            { id: "INACTIVE", label: "Inactive / Expired" },
            ...(mainTab === "ADMIN_PROMOS"
              ? [
                  { id: "MEMBERSHIP", label: "Memberships" },
                  { id: "COURSES", label: "Courses" },
                  { id: "TOOLKITS", label: "Toolkits" },
                ]
              : []),
          ].map((f) => (
            <button
              key={f.id}
              onClick={() => setSubFilter(f.id as any)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                subFilter === f.id
                  ? "bg-amber-500 text-slate-950 font-bold"
                  : "bg-slate-800/80 text-slate-400 hover:text-white hover:bg-slate-700"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Notice Banner for Seller Coupons View */}
      {mainTab === "SELLER_COUPONS" && (
        <div className="bg-blue-500/10 border border-blue-500/20 rounded-2xl p-4 flex items-center gap-3 text-xs text-blue-300">
          <ShoppingBag className="w-5 h-5 text-blue-400 shrink-0" />
          <p>
            These coupons are created by members/vendors on their <strong>Seller Dashboard</strong> for their individual marketplace listings. Admins can view and moderate these codes.
          </p>
        </div>
      )}

      {/* Coupons Table */}
      {loading ? (
        <div className="flex justify-center py-24">
          <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
        </div>
      ) : (
        <div className="bg-slate-900/40 border border-slate-800 rounded-2xl overflow-x-auto shadow-xl">
          <table className="w-full min-w-[750px] border-collapse text-left">
            <thead className="bg-slate-900/80 border-b border-slate-800">
              <tr>
                <th className="text-xs font-bold text-slate-400 px-5 py-3.5 uppercase tracking-wider">Coupon Code</th>
                <th className="text-xs font-bold text-slate-400 px-5 py-3.5 uppercase tracking-wider">Discount</th>
                <th className="text-xs font-bold text-slate-400 px-5 py-3.5 uppercase tracking-wider">
                  {mainTab === "ADMIN_PROMOS" ? "Applies To Scope" : "Seller & Listing"}
                </th>
                <th className="text-xs font-bold text-slate-400 px-5 py-3.5 uppercase tracking-wider">Usage & Limits</th>
                <th className="text-xs font-bold text-slate-400 px-5 py-3.5 uppercase tracking-wider">Expires</th>
                <th className="text-xs font-bold text-slate-400 px-5 py-3.5 uppercase tracking-wider">Status</th>
                <th className="text-right text-xs font-bold text-slate-400 px-5 py-3.5 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-xs">
              {filteredCoupons.map((c) => {
                const isExpired = c.expiresAt && new Date() > new Date(c.expiresAt);
                const isMaxedOut = c.maxUses != null && c.usedCount >= c.maxUses;
                const isUsable = c.isActive && !isExpired && !isMaxedOut;

                const appliesLabel =
                  !c.listingId || c.listingId === "ALL"
                    ? "All Checkouts (Universal)"
                    : c.listingId === "MEMBERSHIP" || c.listingId === "UPGRADE"
                    ? "Membership Upgrades"
                    : c.listingId === "COURSES"
                    ? "Academy Courses"
                    : c.listingId === "TOOLKITS"
                    ? "Success Toolkits"
                    : c.listingId === "MARKETPLACE"
                    ? "Marketplace"
                    : c.listing?.title || c.listingId;

                return (
                  <tr key={c.id} className="hover:bg-slate-900/60 transition-colors">
                    {/* Code Column */}
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <div className="font-mono font-black text-sm text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-lg">
                          {c.code}
                        </div>
                        <button
                          type="button"
                          onClick={() => copyCode(c.code)}
                          title="Copy promo code"
                          className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                        >
                          {copiedCode === c.code ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                      <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
                        {c.seller?.role === "ADMIN" ? (
                          <span className="text-amber-400 font-bold text-[10px] bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.2 rounded">
                            Admin Official
                          </span>
                        ) : (
                          <span>By {c.seller?.name || "Seller"}</span>
                        )}
                      </div>
                    </td>

                    {/* Discount Column */}
                    <td className="px-5 py-4">
                      <div className="flex flex-col items-start gap-1">
                        <span
                          className={`inline-flex items-center gap-1 font-bold px-2.5 py-1 rounded-full text-xs ${
                            c.discountType === "PERCENT"
                              ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                              : "bg-blue-500/15 text-blue-400 border border-blue-500/30"
                          }`}
                        >
                          {c.discountType === "PERCENT" ? <Percent className="w-3 h-3" /> : <DollarSign className="w-3 h-3" />}
                          <span>{c.discountType === "PERCENT" ? `${c.discountValue}% OFF` : `$${c.discountValue.toFixed(2)} OFF`}</span>
                        </span>
                        {c.discountType === "PERCENT" && c.discountValue >= 100 && (
                          <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded">
                            🎁 100% Free Pass
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Scope / Seller Column */}
                    <td className="px-5 py-4">
                      {mainTab === "ADMIN_PROMOS" ? (
                        <div>
                          <div className="font-semibold text-slate-200">{appliesLabel}</div>
                          {(c.listingId === "MEMBERSHIP" || c.listingId === "UPGRADE" || !c.listingId || c.listingId === "ALL") && (
                            <div className="text-[11px] text-amber-400/90 font-medium mt-0.5 flex items-center gap-1">
                              <Clock className="w-3 h-3 text-amber-400" />
                              <span>{c.durationMonths || 1} Month{(c.durationMonths || 1) > 1 ? "s" : ""} Duration</span>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div>
                          <div className="font-semibold text-white">{c.seller?.name || "Seller"}</div>
                          <div className="text-[11px] text-slate-400">
                            {c.listing?.title ? `Listing: ${c.listing.title}` : "All seller listings"}
                          </div>
                        </div>
                      )}
                    </td>

                    {/* Usage Progress Column */}
                    <td className="px-5 py-4">
                      <div className="font-semibold text-white">
                        {c.usedCount} {c.maxUses != null ? `/ ${c.maxUses} used` : "uses (Unlimited)"}
                      </div>
                      {c.maxUses != null && (
                        <div className="w-28 bg-slate-800 h-1.5 rounded-full mt-1.5 overflow-hidden">
                          <div
                            className="bg-amber-500 h-full rounded-full transition-all"
                            style={{ width: `${Math.min(100, (c.usedCount / c.maxUses) * 100)}%` }}
                          />
                        </div>
                      )}
                    </td>

                    {/* Expiration Column */}
                    <td className="px-5 py-4">
                      {c.expiresAt ? (
                        <span className={isExpired ? "text-red-400 font-medium" : "text-slate-300"}>
                          {new Date(c.expiresAt).toLocaleDateString()}
                        </span>
                      ) : (
                        <span className="text-slate-400">Never Expires</span>
                      )}
                    </td>

                    {/* Status Column */}
                    <td className="px-5 py-4">
                      <button
                        type="button"
                        onClick={() => handleToggleActive(c)}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${
                          isUsable
                            ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/25"
                            : "bg-slate-800 text-slate-400 border border-slate-700 hover:bg-slate-700"
                        }`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${isUsable ? "bg-emerald-400" : "bg-slate-500"}`} />
                        <span>{isUsable ? "Active" : isExpired ? "Expired" : "Inactive"}</span>
                      </button>
                    </td>

                    {/* Actions Column */}
                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {c.seller?.role === "ADMIN" && (
                          <button
                            type="button"
                            onClick={() => handleOpenEditModal(c)}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
                            title="Edit coupon"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => setCouponToDelete(c)}
                          className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-colors cursor-pointer"
                          title="Delete coupon"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {filteredCoupons.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center py-16 text-slate-400">
                    {mainTab === "ADMIN_PROMOS"
                      ? "No official Admin platform promo codes found. Click '+ Create Promo Code' above to create one."
                      : "No seller marketplace coupons found."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* CREATE / EDIT MODAL */}
      {showModal && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl text-slate-100 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">
                    {editingCoupon ? "Edit Platform Promo Code" : "Create Official Platform Promo Code"}
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Applies to Membership Upgrades, Courses, Toolkits, or Platform-wide
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {modalError && (
              <div className="bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl p-3 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{modalError}</span>
              </div>
            )}

            <form onSubmit={handleSaveCoupon} className="space-y-4 text-xs">
              {/* Code */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="font-semibold text-slate-300">Promo Code</label>
                  <button
                    type="button"
                    onClick={generateRandomCode}
                    className="text-amber-400 hover:text-amber-300 flex items-center gap-1 font-semibold cursor-pointer"
                  >
                    <Sparkles className="w-3 h-3" />
                    <span>Generate Code</span>
                  </button>
                </div>
                <input
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  placeholder="e.g. SUMMER50"
                  required
                  className="w-full bg-[#060f1e] text-slate-100 text-sm px-3.5 py-2.5 border border-slate-800 rounded-xl outline-none focus:border-amber-500/50 focus:ring-2 focus:ring-amber-500/10 uppercase font-mono font-bold"
                />
              </div>

              {/* Discount Type & Value */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-300 block mb-1.5">Discount Type</label>
                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      type="button"
                      onClick={() => setDiscountType("PERCENT")}
                      className={`py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                        discountType === "PERCENT"
                          ? "bg-amber-500 text-slate-950 border-amber-400"
                          : "bg-[#060f1e] text-slate-400 border-slate-800 hover:border-slate-700"
                      }`}
                    >
                      Percent (%)
                    </button>
                    <button
                      type="button"
                      onClick={() => setDiscountType("FIXED")}
                      className={`py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                        discountType === "FIXED"
                          ? "bg-amber-500 text-slate-950 border-amber-400"
                          : "bg-[#060f1e] text-slate-400 border-slate-800 hover:border-slate-700"
                      }`}
                    >
                      Fixed ($)
                    </button>
                  </div>
                </div>

                <div>
                  <label className="font-semibold text-slate-300 block mb-1.5">
                    Discount Amount {discountType === "PERCENT" ? "(%)" : "($)"}
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    max={discountType === "PERCENT" ? "100" : undefined}
                    value={discountValue}
                    onChange={(e) => setDiscountValue(e.target.value)}
                    placeholder={discountType === "PERCENT" ? "20" : "50.00"}
                    required
                    className="w-full bg-[#060f1e] text-slate-100 text-sm px-3.5 py-2.5 border border-slate-800 rounded-xl outline-none focus:border-amber-500/50 focus:ring-2 focus:ring-amber-500/10 font-mono font-bold"
                  />
                </div>
              </div>

              {/* Scope / Applies To */}
              <div>
                <label className="font-semibold text-slate-300 block mb-1.5">Applies To Scope</label>
                <select
                  value={appliesTo}
                  onChange={(e) => setAppliesTo(e.target.value)}
                  className="w-full bg-[#060f1e] text-slate-100 text-xs px-3.5 py-2.5 border border-slate-800 rounded-xl outline-none focus:border-amber-500/50 cursor-pointer"
                >
                  {APPLIES_TO_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Membership / Subscription Duration (Months) */}
              {(appliesTo === "MEMBERSHIP" || appliesTo === "ALL") && (
                <div className="bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-500/25 rounded-2xl p-3.5 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 font-semibold text-amber-300 text-xs">
                      <Clock className="w-3.5 h-3.5 text-amber-400" />
                      <span>Membership Duration (Months)</span>
                    </div>
                    <span className="text-[11px] font-bold text-amber-400 bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 rounded-full">
                      {durationMonths} {Number(durationMonths) === 1 ? "Month" : "Months"}
                    </span>
                  </div>

                  {/* Preset Duration Buttons */}
                  <div className="grid grid-cols-6 gap-1.5">
                    {[
                      { value: "1", label: "1 Mo" },
                      { value: "2", label: "2 Mo" },
                      { value: "3", label: "3 Mo" },
                      { value: "6", label: "6 Mo" },
                      { value: "12", label: "1 Year" },
                      { value: "CUSTOM", label: "Custom" },
                    ].map((preset) => {
                      const isSelected =
                        preset.value === "CUSTOM"
                          ? !["1", "2", "3", "6", "12"].includes(String(durationMonths))
                          : String(durationMonths) === preset.value;
                      return (
                        <button
                          key={preset.value}
                          type="button"
                          onClick={() => {
                            if (preset.value === "CUSTOM") {
                              if (["1", "2", "3", "6", "12"].includes(String(durationMonths))) {
                                setDurationMonths("4");
                              }
                            } else {
                              setDurationMonths(preset.value);
                            }
                          }}
                          className={`py-1.5 px-1 rounded-xl text-[11px] font-bold border transition-all cursor-pointer text-center ${
                            isSelected
                              ? "bg-amber-500 text-slate-950 border-amber-400 shadow-sm shadow-amber-500/30"
                              : "bg-[#060f1e]/80 text-slate-400 border-slate-800 hover:border-slate-700 hover:text-white"
                          }`}
                        >
                          {preset.label}
                        </button>
                      );
                    })}
                  </div>

                  {/* Custom Input when custom is active */}
                  {!["1", "2", "3", "6", "12"].includes(String(durationMonths)) && (
                    <div className="pt-1 flex items-center gap-2">
                      <label className="text-slate-400 text-[11px] whitespace-nowrap">Enter Duration (1 - 120 Months):</label>
                      <input
                        type="number"
                        min="1"
                        max="120"
                        value={durationMonths}
                        onChange={(e) => setDurationMonths(e.target.value)}
                        placeholder="e.g. 4"
                        required
                        className="w-24 bg-[#060f1e] text-slate-100 text-xs px-2.5 py-1.5 border border-amber-500/40 rounded-xl outline-none focus:border-amber-400 font-mono font-bold"
                      />
                      <span className="text-[11px] text-slate-400">months</span>
                    </div>
                  )}

                  {/* Informative helper callout */}
                  <div className="text-[11px] leading-relaxed bg-[#060f1e]/80 rounded-xl p-2.5 border border-amber-500/20">
                    {discountType === "PERCENT" && Number(discountValue) >= 100 ? (
                      <p className="text-emerald-400 font-medium">
                        ✨ <strong>100% OFF</strong>: Directly grants <strong>{durationMonths || 1} month{Number(durationMonths) > 1 ? "s" : ""}</strong> of VIP/Platform membership without requiring credit card checkout.
                      </p>
                    ) : (
                      <p className="text-slate-300">
                        🎟️ Applies <strong>{discountValue || 0}{discountType === "PERCENT" ? "%" : "$"} off</strong> for <strong>{durationMonths || 1} month{Number(durationMonths) > 1 ? "s" : ""}</strong> of membership billing.
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Usage Limit */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="font-semibold text-slate-300">Usage Limit</label>
                  <label className="flex items-center gap-1.5 text-slate-400 cursor-pointer text-[11px]">
                    <input
                      type="checkbox"
                      checked={isUnlimitedUses}
                      onChange={(e) => setIsUnlimitedUses(e.target.checked)}
                      className="rounded accent-amber-500"
                    />
                    <span>Unlimited Uses</span>
                  </label>
                </div>
                {!isUnlimitedUses && (
                  <input
                    type="number"
                    min="1"
                    value={maxUses}
                    onChange={(e) => setMaxUses(e.target.value)}
                    placeholder="Maximum total redemptions (e.g. 50)"
                    required={!isUnlimitedUses}
                    className="w-full bg-[#060f1e] text-slate-100 text-sm px-3.5 py-2 border border-slate-800 rounded-xl outline-none focus:border-amber-500/50 font-mono"
                  />
                )}
              </div>

              {/* Expiry Date */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="font-semibold text-slate-300">Expiration Date</label>
                  <label className="flex items-center gap-1.5 text-slate-400 cursor-pointer text-[11px]">
                    <input
                      type="checkbox"
                      checked={isNeverExpires}
                      onChange={(e) => setIsNeverExpires(e.target.checked)}
                      className="rounded accent-amber-500"
                    />
                    <span>Never Expires</span>
                  </label>
                </div>
                {!isNeverExpires && (
                  <input
                    type="date"
                    value={expiresAt}
                    onChange={(e) => setExpiresAt(e.target.value)}
                    required={!isNeverExpires}
                    className="w-full bg-[#060f1e] text-slate-100 text-sm px-3.5 py-2 border border-slate-800 rounded-xl outline-none focus:border-amber-500/50"
                  />
                )}
              </div>

              {/* Active Toggle */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-800">
                <span className="font-semibold text-slate-300">Status</span>
                <button
                  type="button"
                  onClick={() => setIsActive((p) => !p)}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border transition-all cursor-pointer ${
                    isActive
                      ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                      : "bg-slate-800 text-slate-400 border-slate-700"
                  }`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${isActive ? "bg-emerald-400" : "bg-slate-500"}`} />
                  <span>{isActive ? "Active Now" : "Inactive / Draft"}</span>
                </button>
              </div>

              {/* Buttons */}
              <div className="flex gap-3 justify-end pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  disabled={saving}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold shadow-lg shadow-amber-500/20 flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                >
                  {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                  <span>{saving ? "Saving..." : editingCoupon ? "Save Changes" : "Create Platform Code"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {couponToDelete && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl text-slate-100">
            <div className="w-12 h-12 rounded-2xl bg-red-500/10 text-red-400 border border-red-500/20 flex items-center justify-center mb-4">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <h3 className="text-xl font-bold text-white mb-1.5">Delete Promo Code</h3>
            <p className="text-xs text-slate-400 leading-relaxed mb-4">
              Are you sure you want to delete coupon <strong className="text-amber-400 font-mono">{couponToDelete.code}</strong>?
              This will permanently revoke any unused redemptions.
            </p>

            <div className="flex gap-3 justify-end pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setCouponToDelete(null)}
                disabled={deleting}
                className="px-4 py-2.5 rounded-xl text-xs font-semibold bg-slate-800 text-slate-300 hover:bg-slate-700 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteCoupon}
                disabled={deleting}
                className="px-5 py-2.5 rounded-xl text-xs font-bold bg-red-600 hover:bg-red-500 text-white transition-all shadow-lg shadow-red-600/20 flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
              >
                {deleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                <span>{deleting ? "Deleting..." : "Confirm Delete"}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

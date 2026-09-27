"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ShoppingBag01Icon as ShoppingBag,
  Add01Icon as Plus,
  Search01Icon as Search,
  CheckmarkCircle02Icon as CheckCircle2,
  LockIcon as Lock,
  CrownIcon as Crown,
  SparklesIcon as Sparkles,
  LinkSquare02Icon as ExternalLink,
  Loading03Icon as Loader2,
  Cancel01Icon as X,
  Settings01Icon as Settings,
  Tag01Icon as Tag,
  Download01Icon as Download,
  ViewIcon as Eye,
  AlertCircleIcon as AlertCircle,
  FolderDownloadIcon as FolderDown,
  File01Icon as FileText,
  Video01Icon as Video,
  Layers01Icon as Layers,
  PencilEdit01Icon as Edit,
  Delete02Icon as Trash,
  CheckmarkBadge01Icon as VerifiedBadge,
} from "hugeicons-react";
import "./network-shop.css";

export interface NetworkShopProduct {
  id: string;
  listingId: string;
  slug: string;
  title: string;
  description: string;
  category: "SERVICE" | "PRODUCT" | "NETWORK" | "TRAINING";
  price: number | null;
  images: string[];
  tags: string[];
  isFeatured: boolean;
  isNetworkExclusive: boolean;
  status: string;
  order: number;
  createdAt: string;
  isPurchased?: boolean;
  metadata?: any;
  user?: {
    id: string;
    name: string;
    image: string | null;
    headline: string | null;
    stripeAccountId?: string | null;
    stripeOnboarded?: boolean;
  };
}

export interface OwnerListingOption {
  id: string;
  slug: string;
  title: string;
  description: string;
  category: "SERVICE" | "PRODUCT" | "NETWORK" | "TRAINING";
  price: number | null;
  images: string[];
  tags: string[];
  status: string;
  isNetworkExclusive: boolean;
  isInNetworkShop: boolean;
}

interface NetworkShopProps {
  slug: string;
  network: {
    id: string;
    name: string;
    slug: string;
    isOwner: boolean;
    isMember: boolean;
    owner?: {
      id: string;
      name: string;
      image: string | null;
    };
  };
  currentUser?: any;
}

export default function NetworkShop({ slug, network, currentUser }: NetworkShopProps) {
  const router = useRouter();

  const [products, setProducts] = useState<NetworkShopProduct[]>([]);
  const [ownerAvailableListings, setOwnerAvailableListings] = useState<OwnerListingOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<
    "ALL" | "EXCLUSIVE" | "PRODUCT" | "SERVICE" | "TRAINING"
  >("ALL");

  // Owner Management Modal State
  const [showManageModal, setShowManageModal] = useState(false);
  const [modalSearch, setModalSearch] = useState("");
  const [modifyingListingId, setModifyingListingId] = useState<string | null>(null);

  // In-Network Checkout Modal State
  const [checkoutProduct, setCheckoutProduct] = useState<NetworkShopProduct | null>(null);
  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<any | null>(null);
  const [applyingCoupon, setApplyingCoupon] = useState(false);
  const [couponError, setCouponError] = useState("");
  const [checkingOut, setCheckingOut] = useState(false);
  const [checkoutError, setCheckoutError] = useState("");

  // Purchased Banner
  const [purchaseSuccessMsg, setPurchaseSuccessMsg] = useState("");

  const isOwner = Boolean(network.isOwner);
  const isMember = Boolean(network.isMember || isOwner);

  // Check URL params for return from Stripe checkout
  useEffect(() => {
    if (typeof window !== "undefined") {
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get("purchased") === "true") {
        setPurchaseSuccessMsg("🎉 Thank you for your purchase! Your product has been added to your account and is ready to access.");
        // Clear param from URL without full reload
        const newUrl = window.location.pathname + "?tab=shop";
        window.history.replaceState({}, document.title, newUrl);
      }
    }
  }, []);

  const fetchShopData = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/pro-networks/${slug}/products`);
      if (res.ok) {
        const data = await res.json();
        setProducts(data.products || []);
        if (data.ownerAvailableListings) {
          setOwnerAvailableListings(data.ownerAvailableListings);
        }
      } else {
        const err = await res.json().catch(() => ({}));
        setError(err.error || "Failed to load storefront products.");
      }
    } catch (err: any) {
      console.error("Error fetching network products:", err);
      setError("Unable to connect to network storefront.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (slug) {
      fetchShopData();
    }
  }, [slug]);

  // Toggle listing in/out of network shop
  const handleToggleProductInShop = async (
    listingId: string,
    currentlyInShop: boolean,
    isExclusive = false,
    isFeatured = false
  ) => {
    setModifyingListingId(listingId);
    try {
      if (currentlyInShop) {
        // Remove
        const res = await fetch(`/api/pro-networks/${slug}/products`, {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ listingId }),
        });
        if (res.ok) {
          setProducts((prev) => prev.filter((p) => p.listingId !== listingId));
          setOwnerAvailableListings((prev) =>
            prev.map((l) => (l.id === listingId ? { ...l, isInNetworkShop: false } : l))
          );
        }
      } else {
        // Add
        const res = await fetch(`/api/pro-networks/${slug}/products`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            listingId,
            isNetworkExclusive: isExclusive,
            isFeatured,
          }),
        });
        if (res.ok) {
          await fetchShopData();
        }
      }
    } catch (err) {
      console.error(err);
      alert("Failed to update product in storefront.");
    } finally {
      setModifyingListingId(null);
    }
  };

  // Update exclusivity or featured status
  const handleUpdateProductSettings = async (
    listingId: string,
    updates: { isFeatured?: boolean; isNetworkExclusive?: boolean }
  ) => {
    setModifyingListingId(listingId);
    try {
      const res = await fetch(`/api/pro-networks/${slug}/products`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ listingId, ...updates }),
      });
      if (res.ok) {
        setProducts((prev) =>
          prev.map((p) =>
            p.listingId === listingId
              ? {
                  ...p,
                  ...(updates.isFeatured !== undefined ? { isFeatured: updates.isFeatured } : {}),
                  ...(updates.isNetworkExclusive !== undefined
                    ? { isNetworkExclusive: updates.isNetworkExclusive }
                    : {}),
                }
              : p
          )
        );
        setOwnerAvailableListings((prev) =>
          prev.map((l) =>
            l.id === listingId
              ? {
                  ...l,
                  ...(updates.isNetworkExclusive !== undefined
                    ? { isNetworkExclusive: updates.isNetworkExclusive }
                    : {}),
                }
              : l
          )
        );
      }
    } catch (err) {
      console.error(err);
    } finally {
      setModifyingListingId(null);
    }
  };

  // Open In-Network Checkout Modal
  const handleInitiatePurchase = (product: NetworkShopProduct) => {
    if (!currentUser) {
      router.push(`/login?returnUrl=/pro-networks/${slug}?tab=shop`);
      return;
    }
    setCheckoutProduct(product);
    setCouponCode("");
    setAppliedCoupon(null);
    setCouponError("");
    setCheckoutError("");
  };

  // Validate Promo Coupon Code
  const handleApplyCoupon = async () => {
    if (!couponCode.trim() || !checkoutProduct) return;
    setApplyingCoupon(true);
    setCouponError("");
    try {
      const res = await fetch("/api/coupons/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: couponCode.trim(),
          listingId: checkoutProduct.listingId,
          sellerId: checkoutProduct.user?.id || network.owner?.id,
          subtotal: checkoutProduct.price || 0,
        }),
      });
      const data = await res.json();
      if (res.ok && data.valid) {
        setAppliedCoupon(data);
      } else {
        setCouponError(data.error || "Invalid promo code");
      }
    } catch (err: any) {
      setCouponError(err.message || "Failed to validate code");
    } finally {
      setApplyingCoupon(false);
    }
  };

  // Execute in-network purchase
  const handleExecutePurchase = async () => {
    if (!checkoutProduct) return;
    setCheckingOut(true);
    setCheckoutError("");

    try {
      const res = await fetch("/api/stripe/marketplace-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          listingId: checkoutProduct.listingId,
          couponCode: appliedCoupon?.code || (couponCode.trim() ? couponCode.trim() : undefined),
          source: "PRO_NETWORK",
          networkId: network.id,
          networkSlug: slug,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Checkout failed. Please try again.");
      }

      // If $0 / Free
      if (data.isFree || data.success) {
        setPurchaseSuccessMsg(`🎉 Successfully acquired "${checkoutProduct.title}"! You now have full access.`);
        setCheckoutProduct(null);
        await fetchShopData();
        return;
      }

      // If Paid item with Stripe Checkout URL
      if (data.url) {
        window.location.href = data.url;
        return;
      }

      if (data.alreadyPurchased) {
        alert("You already own this product!");
        setCheckoutProduct(null);
        await fetchShopData();
      }
    } catch (err: any) {
      console.error("In-network checkout error:", err);
      setCheckoutError(err.message || "An unexpected error occurred during checkout.");
    } finally {
      setCheckingOut(false);
    }
  };

  // Filtered products
  const filteredProducts = products.filter((p) => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchesTitle = p.title.toLowerCase().includes(q);
      const matchesDesc = p.description?.toLowerCase().includes(q);
      const matchesTag = p.tags?.some((t) => t.toLowerCase().includes(q));
      if (!matchesTitle && !matchesDesc && !matchesTag) return false;
    }

    if (selectedCategory === "EXCLUSIVE") {
      return p.isNetworkExclusive;
    }
    if (selectedCategory !== "ALL") {
      return p.category === selectedCategory;
    }
    return true;
  });

  const getCategoryLabel = (cat: string) => {
    switch (cat) {
      case "PRODUCT":
        return "Digital Product & Templates";
      case "SERVICE":
        return "Professional Service";
      case "TRAINING":
        return "Course & Masterclass";
      default:
        return "Marketplace Item";
    }
  };

  return (
    <div className="pn-shop-container">
      {/* ── Success Alert Banner ── */}
      {purchaseSuccessMsg && (
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-bold flex items-center justify-between shadow-lg animate-fadeIn">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            <span>{purchaseSuccessMsg}</span>
          </div>
          <button
            type="button"
            onClick={() => setPurchaseSuccessMsg("")}
            className="text-slate-400 hover:text-white p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ── Storefront Hero Banner ── */}
      <div className="pn-shop-hero">
        <div className="pn-shop-hero-bg" />
        <div className="pn-shop-hero-content">
          <div className="space-y-2 max-w-2xl">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="pn-shop-badge pn-shop-badge-exclusive">
                <Crown className="w-3.5 h-3.5" />
                <span>{network.name} Shop</span>
              </span>
              <span className="pn-shop-badge pn-shop-badge-featured">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Unified Marketplace Engine</span>
              </span>
            </div>

            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              Official Network Storefront
            </h2>
            <p className="text-xs text-slate-300/90 leading-relaxed">
              Explore templates, calculators, audit roadmaps, and exclusive resources curated directly by{" "}
              <strong className="text-white">{network.owner?.name || "the network owner"}</strong>. Buy seamlessly
              inside the network with 1-click checkout.
            </p>
          </div>

          {/* Owner Action Buttons */}
          {isOwner && (
            <div className="flex items-center gap-2.5 flex-wrap shrink-0">
              <button
                type="button"
                onClick={() => setShowManageModal(true)}
                className="bg-[#f59e0b] hover:bg-[#d97706] text-slate-950 font-black text-xs px-4 py-2.5 rounded-xl flex items-center gap-2 shadow-lg transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                <Plus className="w-4 h-4 stroke-[2.5]" />
                <span>Manage Shop Products</span>
              </button>

              <Link
                href="/seller-dashboard"
                target="_blank"
                className="bg-white/10 hover:bg-white/15 text-slate-200 hover:text-white font-bold text-xs px-3.5 py-2.5 rounded-xl border border-white/10 flex items-center gap-1.5 transition-all"
                title="View sales and order reporting in Seller Dashboard"
              >
                <ExternalLink className="w-4 h-4" />
                <span className="hidden sm:inline">Seller Dashboard</span>
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* ── Search & Filter Controls ── */}
      <div className="pn-shop-filter-bar">
        {/* Category Pills */}
        <div className="pn-shop-pills">
          <button
            type="button"
            onClick={() => setSelectedCategory("ALL")}
            className={`pn-shop-pill ${selectedCategory === "ALL" ? "active" : ""}`}
          >
            <ShoppingBag className="w-3.5 h-3.5" />
            <span>All Items ({products.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setSelectedCategory("EXCLUSIVE")}
            className={`pn-shop-pill ${selectedCategory === "EXCLUSIVE" ? "active" : ""}`}
          >
            <Crown className="w-3.5 h-3.5 text-amber-400" />
            <span>Network Exclusives</span>
          </button>

          <button
            type="button"
            onClick={() => setSelectedCategory("PRODUCT")}
            className={`pn-shop-pill ${selectedCategory === "PRODUCT" ? "active" : ""}`}
          >
            <FolderDown className="w-3.5 h-3.5" />
            <span>Products &amp; Toolkits</span>
          </button>

          <button
            type="button"
            onClick={() => setSelectedCategory("SERVICE")}
            className={`pn-shop-pill ${selectedCategory === "SERVICE" ? "active" : ""}`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Services &amp; Advisory</span>
          </button>

          <button
            type="button"
            onClick={() => setSelectedCategory("TRAINING")}
            className={`pn-shop-pill ${selectedCategory === "TRAINING" ? "active" : ""}`}
          >
            <Video className="w-3.5 h-3.5" />
            <span>Courses &amp; Training</span>
          </button>
        </div>

        {/* Search input inside Shop */}
        <div className="relative min-w-[220px] flex-1 max-w-xs">
          <input
            type="text"
            placeholder="Search products in shop..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-3 pr-8 py-1.5 rounded-xl border border-white/10 bg-white/5 text-xs text-white placeholder:text-slate-400 focus:outline-none focus:border-amber-400"
          />
          <Search className="w-4 h-4 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>
      </div>

      {/* ── Product Listings Grid ── */}
      {loading ? (
        <div className="py-20 text-center space-y-3">
          <Loader2 className="w-8 h-8 text-amber-400 animate-spin mx-auto" />
          <p className="text-xs text-slate-400 font-bold">Loading storefront items...</p>
        </div>
      ) : error ? (
        <div className="p-6 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-center space-y-3">
          <AlertCircle className="w-8 h-8 text-rose-400 mx-auto" />
          <p className="text-xs font-bold text-rose-300">{error}</p>
          <button
            type="button"
            onClick={fetchShopData}
            className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold"
          >
            Retry
          </button>
        </div>
      ) : filteredProducts.length === 0 ? (
        /* Empty Storefront State */
        <div className="pn-v2-card py-16 text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-amber-400/10 border border-amber-400/20 flex items-center justify-center mx-auto text-amber-400">
            <ShoppingBag className="w-8 h-8" />
          </div>

          <div className="space-y-1 max-w-md mx-auto">
            <h3 className="text-base font-black text-white">
              {searchQuery ? "No matching products found" : "Storefront is being stocked"}
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              {searchQuery
                ? `No items in this shop match "${searchQuery}". Try a different search or filter.`
                : isOwner
                ? "You haven't added any Marketplace listings to your Pro Network shop yet. Click below to add existing products or create a new one."
                : "The network owner hasn't added products to the shop yet. Check back soon for exclusive templates and toolkits!"}
            </p>
          </div>

          {isOwner && (
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowManageModal(true)}
                className="bg-[#f59e0b] hover:bg-[#d97706] text-slate-950 font-black text-xs px-5 py-2.5 rounded-xl inline-flex items-center gap-2 shadow-lg"
              >
                <Plus className="w-4 h-4 stroke-[2.5]" />
                <span>Add Marketplace Products</span>
              </button>

              <Link
                href="/marketplace/create"
                target="_blank"
                className="bg-white/10 hover:bg-white/15 text-white font-bold text-xs px-4 py-2.5 rounded-xl border border-white/10 inline-flex items-center gap-1.5"
              >
                <span>Create New Product</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </Link>
            </div>
          )}
        </div>
      ) : (
        <div className="pn-shop-grid">
          {filteredProducts.map((product) => {
            const hasPurchased = Boolean(product.isPurchased);
            const isExclusive = Boolean(product.isNetworkExclusive);
            const isFeatured = Boolean(product.isFeatured);
            const priceVal = product.price ?? 0;
            const priceDisplay = priceVal > 0 ? `$${priceVal.toFixed(2)}` : "FREE";
            const coverImg = product.images?.[0] || "/courses-hero.webp";

            return (
              <div key={product.id} className="pn-product-card group">
                {/* Product Cover Image / Preview */}
                <div className="pn-product-img-wrap">
                  <img
                    src={coverImg}
                    alt={product.title}
                    className="pn-product-img"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = "/courses-hero.webp";
                    }}
                  />

                  {/* Badges Overlay */}
                  <div className="absolute top-2.5 left-2.5 flex flex-col gap-1.5 z-10">
                    {isExclusive && (
                      <span className="pn-shop-badge pn-shop-badge-exclusive backdrop-blur-md shadow-md">
                        <Crown className="w-3 h-3" />
                        <span>Exclusive</span>
                      </span>
                    )}
                    {isFeatured && (
                      <span className="pn-shop-badge pn-shop-badge-featured backdrop-blur-md shadow-md">
                        <Sparkles className="w-3 h-3" />
                        <span>Featured</span>
                      </span>
                    )}
                  </div>

                  {hasPurchased && (
                    <div className="absolute top-2.5 right-2.5 z-10">
                      <span className="pn-shop-badge pn-shop-badge-purchased backdrop-blur-md shadow-md">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>Purchased</span>
                      </span>
                    </div>
                  )}
                </div>

                {/* Card Body */}
                <div className="pn-product-body">
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between gap-2 text-[10px] font-bold text-amber-400 uppercase tracking-wider">
                      <span>{getCategoryLabel(product.category)}</span>
                      {product.tags?.[0] && (
                        <span className="text-slate-400 normal-case font-medium">
                          #{product.tags[0]}
                        </span>
                      )}
                    </div>

                    <h4 className="text-sm font-black text-white line-clamp-2 group-hover:text-amber-300 transition-colors">
                      {product.title}
                    </h4>

                    <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                      {product.description || "No description provided."}
                    </p>
                  </div>

                  {/* Owner Controls Row (if owner) */}
                  {isOwner && (
                    <div className="pt-2 border-t border-white/5 flex items-center justify-between gap-2 text-[11px]">
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() =>
                            handleUpdateProductSettings(product.listingId, {
                              isFeatured: !product.isFeatured,
                            })
                          }
                          disabled={modifyingListingId === product.listingId}
                          className={`px-2 py-0.5 rounded-md font-bold text-[10px] border transition-colors ${
                            product.isFeatured
                              ? "bg-blue-500/20 text-blue-300 border-blue-500/30"
                              : "bg-white/5 text-slate-400 border-white/5 hover:text-white"
                          }`}
                          title="Pin as featured in this shop"
                        >
                          {product.isFeatured ? "★ Featured" : "Feature"}
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            handleUpdateProductSettings(product.listingId, {
                              isNetworkExclusive: !product.isNetworkExclusive,
                            })
                          }
                          disabled={modifyingListingId === product.listingId}
                          className={`px-2 py-0.5 rounded-md font-bold text-[10px] border transition-colors ${
                            product.isNetworkExclusive
                              ? "bg-amber-500/20 text-amber-300 border-amber-500/30"
                              : "bg-white/5 text-slate-400 border-white/5 hover:text-white"
                          }`}
                          title="Toggle Network Exclusive"
                        >
                          {product.isNetworkExclusive ? "👑 Exclusive" : "Public Mkt"}
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          handleToggleProductInShop(product.listingId, true)
                        }
                        disabled={modifyingListingId === product.listingId}
                        className="text-rose-400 hover:text-rose-300 p-1 rounded-md hover:bg-rose-500/10"
                        title="Remove from Network Shop"
                      >
                        <Trash className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}

                  {/* Card Footer: Price + Buy Now */}
                  <div className="pn-product-footer">
                    <div>
                      <div className="text-[10px] text-slate-400 font-medium">Price</div>
                      <div className="text-base font-black text-amber-400">
                        {priceDisplay}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {hasPurchased ? (
                        <Link
                          href={`/${product.slug}`}
                          className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-3.5 py-2 rounded-xl flex items-center gap-1.5 shadow-md transition-all hover:scale-105"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>Access</span>
                        </Link>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleInitiatePurchase(product)}
                          className="bg-[#1a56db] hover:bg-blue-600 text-white font-black text-xs px-4 py-2 rounded-xl flex items-center gap-1.5 shadow-md transition-all hover:scale-105 active:scale-95"
                        >
                          <ShoppingBag className="w-3.5 h-3.5" />
                          <span>{priceVal <= 0 ? "Claim Free" : "Buy Now"}</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ═════════ MODAL 1: OWNER STOREFRONT MANAGER ═════════ */}
      {showManageModal && isOwner && (
        <div className="pn-shop-modal-overlay animate-fadeIn">
          <div className="pn-shop-modal-panel">
            {/* Modal Header */}
            <div className="pn-shop-modal-header">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
                  <ShoppingBag className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white">
                    Manage Network Shop Products
                  </h3>
                  <p className="text-xs text-slate-400">
                    Add or remove your Marketplace products to your Pro Network shop.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowManageModal(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="pn-shop-modal-body">
              {/* Search + Create Shortcut */}
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="relative flex-1 min-w-[220px]">
                  <input
                    type="text"
                    placeholder="Search your marketplace products..."
                    value={modalSearch}
                    onChange={(e) => setModalSearch(e.target.value)}
                    className="w-full pl-3 pr-8 py-2 rounded-xl border border-white/10 bg-white/5 text-xs text-white placeholder:text-slate-400 focus:outline-none focus:border-amber-400"
                  />
                  <Search className="w-4 h-4 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>

                <Link
                  href="/marketplace/create"
                  target="_blank"
                  className="bg-white/10 hover:bg-white/15 text-amber-300 font-bold text-xs px-3.5 py-2 rounded-xl border border-amber-400/20 flex items-center gap-1.5 transition-all"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Create New Listing</span>
                </Link>
              </div>

              {/* Owner Listings List */}
              <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-1">
                {ownerAvailableListings.length === 0 ? (
                  <div className="text-center py-12 text-slate-400 space-y-3">
                    <ShoppingBag className="w-10 h-10 mx-auto opacity-40 text-slate-400" />
                    <p className="text-xs font-bold">You have no Marketplace products yet.</p>
                    <Link
                      href="/marketplace/create"
                      target="_blank"
                      className="inline-flex items-center gap-1.5 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-xl"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Create Your First Product</span>
                    </Link>
                  </div>
                ) : (
                  ownerAvailableListings
                    .filter((l) => {
                      if (!modalSearch.trim()) return true;
                      return (
                        l.title.toLowerCase().includes(modalSearch.toLowerCase()) ||
                        l.description?.toLowerCase().includes(modalSearch.toLowerCase())
                      );
                    })
                    .map((listing) => {
                      const inShop = listing.isInNetworkShop;
                      const isExclusive = listing.isNetworkExclusive;
                      const isModifying = modifyingListingId === listing.id;

                      return (
                        <div
                          key={listing.id}
                          className={`p-3.5 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                            inShop
                              ? "bg-white/[0.04] border-amber-500/30 shadow-xs"
                              : "bg-white/[0.01] border-white/5 opacity-85 hover:opacity-100"
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            <img
                              src={listing.images?.[0] || "/courses-hero.webp"}
                              alt=""
                              className="w-12 h-12 rounded-xl object-cover shrink-0 border border-white/10"
                              onError={(e) => {
                                (e.target as HTMLImageElement).src = "/courses-hero.webp";
                              }}
                            />
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <h5 className="text-xs font-black text-white truncate">
                                  {listing.title}
                                </h5>
                                {inShop && (
                                  <span className="text-[9px] font-extrabold px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                    In Shop
                                  </span>
                                )}
                                {isExclusive && (
                                  <span className="text-[9px] font-extrabold px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                    👑 Exclusive
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                                <span className="font-bold text-amber-400">
                                  {listing.price ? `$${listing.price.toFixed(2)}` : "FREE"}
                                </span>
                                <span>•</span>
                                <span>{getCategoryLabel(listing.category)}</span>
                              </div>
                            </div>
                          </div>

                          {/* Action Controls */}
                          <div className="flex items-center gap-2 shrink-0">
                            {inShop ? (
                              <button
                                type="button"
                                onClick={() => handleToggleProductInShop(listing.id, true)}
                                disabled={isModifying}
                                className="px-3 py-1.5 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 text-xs font-bold transition-all disabled:opacity-50 flex items-center gap-1"
                              >
                                {isModifying ? (
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                  <Trash className="w-3.5 h-3.5" />
                                )}
                                <span>Remove</span>
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() =>
                                  handleToggleProductInShop(listing.id, false, false, false)
                                }
                                disabled={isModifying}
                                className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black transition-all shadow-md disabled:opacity-50 flex items-center gap-1"
                              >
                                {isModifying ? (
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                  <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                                )}
                                <span>Add to Shop</span>
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="pn-shop-modal-footer">
              <button
                type="button"
                onClick={() => setShowManageModal(false)}
                className="px-5 py-2.5 rounded-xl bg-[#1a56db] hover:bg-blue-600 text-white font-black text-xs transition-all"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═════════ MODAL 2: IN-NETWORK SEAMLESS CHECKOUT ═════════ */}
      {checkoutProduct && (
        <div className="pn-shop-modal-overlay animate-fadeIn">
          <div className="pn-shop-modal-panel max-w-lg">
            {/* Modal Header */}
            <div className="pn-shop-modal-header">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center">
                  <ShoppingBag className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white">
                    In-Network Checkout
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Directly powered by Tax Comp Pro Marketplace
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setCheckoutProduct(null)}
                className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="pn-shop-modal-body space-y-4">
              {checkoutError && (
                <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs font-bold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{checkoutError}</span>
                </div>
              )}

              {/* Product Preview Card */}
              <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 flex items-start gap-3">
                <img
                  src={checkoutProduct.images?.[0] || "/courses-hero.webp"}
                  alt=""
                  className="w-16 h-16 rounded-xl object-cover shrink-0 border border-white/10"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = "/courses-hero.webp";
                  }}
                />
                <div className="min-w-0 flex-1">
                  <span className="text-[10px] font-bold text-amber-400 uppercase">
                    {getCategoryLabel(checkoutProduct.category)}
                  </span>
                  <h4 className="text-sm font-black text-white line-clamp-2 mt-0.5">
                    {checkoutProduct.title}
                  </h4>
                  <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-1.5">
                    <span>Seller: {checkoutProduct.user?.name || network.owner?.name}</span>
                    <VerifiedBadge className="w-3.5 h-3.5 text-blue-400" />
                  </div>
                </div>
              </div>

              {/* Coupon / Promo Code Input */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  Have a Promo / Discount Code?
                </label>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      placeholder="ENTER CODE (e.g. VIP2026)"
                      value={couponCode}
                      onChange={(e) => {
                        setCouponCode(e.target.value.toUpperCase());
                        setAppliedCoupon(null);
                        setCouponError("");
                      }}
                      className="w-full pl-3 pr-3 py-2 rounded-xl border border-white/10 bg-white/5 text-xs font-bold text-white uppercase placeholder:text-slate-500 focus:outline-none focus:border-amber-400"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleApplyCoupon}
                    disabled={applyingCoupon || !couponCode.trim()}
                    className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white font-bold text-xs rounded-xl border border-white/10 transition-all disabled:opacity-50 flex items-center gap-1"
                  >
                    {applyingCoupon && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    <span>Apply</span>
                  </button>
                </div>

                {appliedCoupon && (
                  <div className="mt-2 text-xs font-bold text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Promo applied: {appliedCoupon.code} ({appliedCoupon.discountFormatted || "Discount Applied"})</span>
                  </div>
                )}
                {couponError && (
                  <p className="mt-1.5 text-xs text-rose-400 font-medium">{couponError}</p>
                )}
              </div>

              {/* Price Breakdown */}
              <div className="p-3.5 rounded-2xl bg-black/30 border border-white/5 space-y-2 text-xs">
                <div className="flex items-center justify-between text-slate-400">
                  <span>Item Price</span>
                  <span className="font-bold text-white">
                    {checkoutProduct.price ? `$${checkoutProduct.price.toFixed(2)}` : "FREE"}
                  </span>
                </div>

                {appliedCoupon && (
                  <div className="flex items-center justify-between text-emerald-400">
                    <span>Discount</span>
                    <span className="font-bold">
                      -{appliedCoupon.discountFormatted || "Applied"}
                    </span>
                  </div>
                )}

                <div className="pt-2 border-t border-white/10 flex items-center justify-between text-sm">
                  <span className="font-bold text-white">Total Due</span>
                  <span className="font-black text-amber-400 text-base">
                    {appliedCoupon?.finalPrice !== undefined
                      ? appliedCoupon.finalPrice <= 0
                        ? "FREE"
                        : `$${appliedCoupon.finalPrice.toFixed(2)}`
                      : checkoutProduct.price
                      ? `$${checkoutProduct.price.toFixed(2)}`
                      : "FREE"}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 text-[11px] text-slate-400">
                <Lock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span>Encrypted 256-bit Stripe Connect checkout. Payouts route directly to the host.</span>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="pn-shop-modal-footer">
              <button
                type="button"
                onClick={() => setCheckoutProduct(null)}
                className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-400 hover:text-white"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleExecutePurchase}
                disabled={checkingOut}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs shadow-lg transition-all flex items-center gap-2 disabled:opacity-50"
              >
                {checkingOut ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Processing Order...</span>
                  </>
                ) : (
                  <>
                    <ShoppingBag className="w-4 h-4 stroke-[2.5]" />
                    <span>
                      {(checkoutProduct.price ?? 0) <= 0 ? "Claim Item" : "Proceed to Buy Now"}
                    </span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

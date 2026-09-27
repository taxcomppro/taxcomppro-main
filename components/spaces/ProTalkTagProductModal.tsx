"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  ShoppingBag01Icon as ShoppingBag,
  Add01Icon as Plus,
  Search01Icon as Search,
  CheckmarkCircle02Icon as CheckCircle2,
  Cancel01Icon as X,
  SparklesIcon as Sparkles,
  LinkSquare02Icon as ExternalLink,
  Loading03Icon as Loader2,
  CrownIcon as Crown,
  Delete02Icon as Trash,
} from "hugeicons-react";
import "./pro-talk-product.css";

interface HostProductOption {
  id: string;
  listingId: string;
  slug: string;
  title: string;
  description: string;
  category: string;
  price: number | null;
  images: string[];
  tags: string[];
  status: string;
  isNetworkExclusive?: boolean;
}

interface ProTalkTagProductModalProps {
  spaceId: string;
  isOpen: boolean;
  onClose: () => void;
  currentTaggedProduct: any | null;
  onProductTagged: (product: any) => void;
  onProductUntagged: () => void;
}

export default function ProTalkTagProductModal({
  spaceId,
  isOpen,
  onClose,
  currentTaggedProduct,
  onProductTagged,
  onProductUntagged,
}: ProTalkTagProductModalProps) {
  const [listings, setListings] = useState<HostProductOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [taggingId, setTaggingId] = useState<string | null>(null);
  const [untagging, setUntagging] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (isOpen) {
      fetchListings();
    }
  }, [isOpen, spaceId]);

  const fetchListings = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/spaces/${spaceId}/tagged-product`);
      if (res.ok) {
        const data = await res.json();
        setListings(data.hostAvailableListings || []);
      } else {
        setError("Failed to load your marketplace listings.");
      }
    } catch (err: any) {
      setError(err.message || "Network error loading products.");
    } finally {
      setLoading(false);
    }
  };

  const handleTagProduct = async (listing: HostProductOption) => {
    setTaggingId(listing.id);
    setError("");
    try {
      const res = await fetch(`/api/spaces/${spaceId}/tagged-product`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ listingId: listing.id }),
      });
      const data = await res.json();
      if (res.ok && data.taggedProduct) {
        onProductTagged(data.taggedProduct);
        onClose();
      } else {
        setError(data.error || "Failed to tag product live.");
      }
    } catch (err: any) {
      setError(err.message || "Failed to tag product.");
    } finally {
      setTaggingId(null);
    }
  };

  const handleUntag = async () => {
    setUntagging(true);
    setError("");
    try {
      const res = await fetch(`/api/spaces/${spaceId}/tagged-product`, {
        method: "DELETE",
      });
      if (res.ok) {
        onProductUntagged();
        onClose();
      } else {
        setError("Failed to remove spotlight.");
      }
    } catch (err: any) {
      setError(err.message || "Network error.");
    } finally {
      setUntagging(false);
    }
  };

  if (!isOpen) return null;

  const filteredListings = listings.filter((l) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return l.title.toLowerCase().includes(q) || l.description?.toLowerCase().includes(q);
  });

  return (
    <div className="pt-product-modal-overlay">
      <div className="pt-product-modal-panel">
        {/* Modal Header */}
        <div className="pt-product-modal-header">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-white flex items-center gap-2">
                <span>Tag &amp; Spotlight Product</span>
                <span className="text-[10px] uppercase font-black px-2 py-0.5 rounded-full bg-amber-400 text-slate-950">
                  Live
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Pin and highlight a product live for all attendees in this Pro Talk.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="pt-product-modal-body">
          {error && (
            <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs font-bold">
              {error}
            </div>
          )}

          {/* Currently Tagged Product Notice */}
          {currentTaggedProduct && (
            <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <img
                  src={currentTaggedProduct.images?.[0] || "/courses-hero.webp"}
                  alt=""
                  className="w-11 h-11 rounded-xl object-cover shrink-0 border border-amber-400/30"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = "/courses-hero.webp";
                  }}
                />
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 text-[10px] font-black text-amber-400 uppercase">
                    <Crown className="w-3 h-3" />
                    <span>Currently Spotlighted Live</span>
                  </div>
                  <h5 className="text-xs font-black text-white truncate mt-0.5">
                    {currentTaggedProduct.title}
                  </h5>
                  <span className="text-[11px] font-bold text-amber-300">
                    {currentTaggedProduct.price
                      ? `$${currentTaggedProduct.price.toFixed(2)}`
                      : "FREE"}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleUntag}
                disabled={untagging}
                className="px-3 py-1.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 text-xs font-bold transition-all shrink-0 flex items-center gap-1"
              >
                {untagging ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Trash className="w-3.5 h-3.5" />
                )}
                <span>Untag</span>
              </button>
            </div>
          )}

          {/* Search + Create New */}
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <input
                type="text"
                placeholder="Search your marketplace products..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-3 pr-8 py-2 rounded-xl border border-white/10 bg-white/5 text-xs text-white placeholder:text-slate-400 focus:outline-none focus:border-amber-400"
              />
              <Search className="w-4 h-4 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            <Link
              href="/marketplace/create"
              target="_blank"
              className="bg-white/10 hover:bg-white/15 text-slate-200 hover:text-white font-bold text-xs px-3.5 py-2 rounded-xl border border-white/10 flex items-center gap-1.5 transition-all shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create Product</span>
            </Link>
          </div>

          {/* Listings List */}
          <div className="space-y-2 max-h-[45vh] overflow-y-auto pr-1">
            {loading ? (
              <div className="py-12 text-center text-slate-400 space-y-2">
                <Loader2 className="w-6 h-6 animate-spin text-amber-400 mx-auto" />
                <p className="text-xs font-bold">Loading your listings...</p>
              </div>
            ) : filteredListings.length === 0 ? (
              <div className="text-center py-10 text-slate-400 space-y-3">
                <ShoppingBag className="w-9 h-9 mx-auto opacity-40" />
                <p className="text-xs font-bold">
                  {search ? "No products match your search." : "You have no Marketplace products yet."}
                </p>
                <Link
                  href="/marketplace/create"
                  target="_blank"
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-xl"
                >
                  <Plus className="w-4 h-4 stroke-[2.5]" />
                  <span>Create Listing First</span>
                </Link>
              </div>
            ) : (
              filteredListings.map((listing) => {
                const isTagged = currentTaggedProduct?.listingId === listing.id || currentTaggedProduct?.id === listing.id;
                const isTagging = taggingId === listing.id;

                return (
                  <div
                    key={listing.id}
                    className={`p-3 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                      isTagged
                        ? "bg-amber-500/10 border-amber-500/40 shadow-xs"
                        : "bg-white/[0.02] border-white/5 hover:border-white/15"
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
                        <div className="flex items-center gap-2">
                          <h5 className="text-xs font-black text-white truncate">
                            {listing.title}
                          </h5>
                          {isTagged && (
                            <span className="text-[9px] font-extrabold px-1.5 py-0.2 rounded bg-amber-400 text-slate-950">
                              Live
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                          <span className="font-bold text-amber-400">
                            {listing.price ? `$${listing.price.toFixed(2)}` : "FREE"}
                          </span>
                          <span>•</span>
                          <span>{listing.category}</span>
                        </div>
                      </div>
                    </div>

                    <div className="shrink-0">
                      {isTagged ? (
                        <span className="text-xs font-bold text-amber-400 flex items-center gap-1 px-3 py-1.5 rounded-xl bg-amber-400/15 border border-amber-400/30">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Active</span>
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleTagProduct(listing)}
                          disabled={isTagging}
                          className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs transition-all shadow-md flex items-center gap-1.5 disabled:opacity-50"
                        >
                          {isTagging ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Sparkles className="w-3.5 h-3.5 stroke-[2.5]" />
                          )}
                          <span>Spotlight Live</span>
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
        <div className="pt-product-modal-footer">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white font-bold text-xs transition-all"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

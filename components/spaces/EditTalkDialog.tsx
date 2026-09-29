"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  Loader2,
  X,
  Trash2,
  Calendar,
  Clock,
  Video,
  Mic,
  Globe,
  Lock,
  Check,
  Ticket,
  DollarSign,
  Users,
  Plus,
  Building2,
  ShieldCheck,
} from "lucide-react";
import { PRO_TALK_CATEGORIES } from "@/lib/proTalks";
import { isTicketedSpace } from "@/lib/ticketedProTalks";

interface SpaceData {
  id: string;
  name: string;
  description: string | null;
  category?: string | null;
  mediaType?: string | null;
  visibility?: "PUBLIC" | "PRIVATE" | string;
  accessType?: "FREE" | "PRIVATE" | "PAID" | string;
  ticketPrice?: number | null;
  ticketCapacity?: number | null;
  salesStartsAt?: string | null;
  salesEndsAt?: string | null;
  refundPolicy?: "NO_REFUNDS" | "REFUNDABLE_UNTIL_DATE" | string | null;
  refundUntil?: string | null;
  whatIsIncluded?: string[] | null;
  isNetworkExclusive?: boolean | null;
  networkId?: string | null;
  scheduledAt: string | null;
}

interface UserNetwork {
  id: string;
  name: string;
  memberCount: number;
}

interface EditTalkDialogProps {
  space: SpaceData;
  isOpen: boolean;
  onClose: () => void;
  onSaved: (updated: any) => void;
  onCancelled: (spaceId: string) => void;
}

export default function EditTalkDialog({
  space,
  isOpen,
  onClose,
  onSaved,
  onCancelled,
}: EditTalkDialogProps) {
  const [mounted, setMounted] = useState(false);
  const [name, setName] = useState(space.name);
  const [description, setDescription] = useState(space.description || "");
  const [category, setCategory] = useState(space.category || "Open Discussion");
  const [mediaType, setMediaType] = useState<"AUDIO_VIDEO" | "AUDIO">(
    space.mediaType === "AUDIO" ? "AUDIO" : "AUDIO_VIDEO"
  );
  const [accessType, setAccessType] = useState<"FREE" | "PRIVATE" | "PAID">(
    (space.accessType as any) || (space.visibility === "PRIVATE" ? "PRIVATE" : "FREE")
  );
  const [scheduledAt, setScheduledAt] = useState(() => {
    if (!space.scheduledAt) return "";
    const d = new Date(space.scheduledAt);
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().slice(0, 16);
  });

  // Ticketed Fields
  const [ticketPrice, setTicketPrice] = useState(
    space.ticketPrice !== undefined && space.ticketPrice !== null ? String(space.ticketPrice) : "29.99"
  );
  const [ticketCapacity, setTicketCapacity] = useState(
    space.ticketCapacity !== undefined && space.ticketCapacity !== null ? String(space.ticketCapacity) : "25"
  );
  const [salesStartsAt, setSalesStartsAt] = useState(() => {
    if (!space.salesStartsAt) return "";
    const d = new Date(space.salesStartsAt);
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().slice(0, 16);
  });
  const [salesEndsAt, setSalesEndsAt] = useState(() => {
    if (!space.salesEndsAt) return "";
    const d = new Date(space.salesEndsAt);
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().slice(0, 16);
  });
  const [refundPolicy, setRefundPolicy] = useState<"NO_REFUNDS" | "REFUNDABLE_UNTIL_DATE">(
    (space.refundPolicy as any) || "NO_REFUNDS"
  );
  const [refundUntil, setRefundUntil] = useState(() => {
    if (!space.refundUntil) return "";
    const d = new Date(space.refundUntil);
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().slice(0, 16);
  });
  const [whatIsIncluded, setWhatIsIncluded] = useState<string[]>(
    Array.isArray(space.whatIsIncluded) && space.whatIsIncluded.length > 0
      ? space.whatIsIncluded
      : [
          "Live interactive stage access & Q&A with the host",
          "Downloadable resources & practice templates",
          "Full video replay recording access",
        ]
  );
  const [newIncludedItem, setNewIncludedItem] = useState("");
  const [isNetworkExclusive, setIsNetworkExclusive] = useState(Boolean(space.isNetworkExclusive));
  const [networkId, setNetworkId] = useState(space.networkId || "");
  const [userNetworks, setUserNetworks] = useState<UserNetwork[]>([]);

  const [saving, setSaving] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
    fetch("/api/pro-networks?filter=mine")
      .then((r) => r.json())
      .then((data) => {
        if (data.networks && Array.isArray(data.networks)) {
          setUserNetworks(data.networks);
          if (data.networks.length > 0 && !networkId) {
            setNetworkId(data.networks[0].id);
          }
        }
      })
      .catch(() => {});
  }, [networkId]);

  useEffect(() => {
    if (isOpen) {
      setName(space.name);
      setDescription(space.description || "");
      setCategory(space.category || "Open Discussion");
      setMediaType(space.mediaType === "AUDIO" ? "AUDIO" : "AUDIO_VIDEO");
      setAccessType(
        isTicketedSpace(space)
          ? "PAID"
          : (space.accessType as any) ||
            (space.visibility === "PRIVATE" ? "PRIVATE" : "FREE")
      );
      if (space.scheduledAt) {
        const d = new Date(space.scheduledAt);
        d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
        setScheduledAt(d.toISOString().slice(0, 16));
      } else {
        setScheduledAt("");
      }

      setTicketPrice(
        space.ticketPrice !== undefined && space.ticketPrice !== null ? String(space.ticketPrice) : "29.99"
      );
      setTicketCapacity(
        space.ticketCapacity !== undefined && space.ticketCapacity !== null ? String(space.ticketCapacity) : "25"
      );
      if (space.salesStartsAt) {
        const d = new Date(space.salesStartsAt);
        d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
        setSalesStartsAt(d.toISOString().slice(0, 16));
      } else setSalesStartsAt("");

      if (space.salesEndsAt) {
        const d = new Date(space.salesEndsAt);
        d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
        setSalesEndsAt(d.toISOString().slice(0, 16));
      } else setSalesEndsAt("");

      setRefundPolicy((space.refundPolicy as any) || "NO_REFUNDS");
      if (space.refundUntil) {
        const d = new Date(space.refundUntil);
        d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
        setRefundUntil(d.toISOString().slice(0, 16));
      } else setRefundUntil("");

      setWhatIsIncluded(
        Array.isArray(space.whatIsIncluded) && space.whatIsIncluded.length > 0
          ? space.whatIsIncluded
          : [
              "Live interactive stage access & Q&A with the host",
              "Downloadable resources & practice templates",
              "Full video replay recording access",
            ]
      );
      setIsNetworkExclusive(Boolean(space.isNetworkExclusive));
      setNetworkId(space.networkId || "");
      setConfirmCancel(false);
      setError(null);
    }
  }, [isOpen, space]);

  // Lock body scroll and handle Escape key
  useEffect(() => {
    if (!isOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen || !mounted) return null;

  const addIncludedItem = () => {
    if (!newIncludedItem.trim()) return;
    setWhatIsIncluded((prev) => [...prev, newIncludedItem.trim()]);
    setNewIncludedItem("");
  };

  const removeIncludedItem = (index: number) => {
    setWhatIsIncluded((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || saving) return;
    setSaving(true);
    setError(null);

    try {
      const visibility =
        accessType === "PAID"
          ? "TICKETED"
          : accessType === "PRIVATE"
          ? "PRIVATE"
          : "PUBLIC";
      const payload: Record<string, any> = {
        name: name.trim(),
        description: description.trim() || null,
        category,
        mediaType,
        visibility,
        accessType,
      };

      if (scheduledAt) {
        payload.scheduledAt = new Date(scheduledAt).toISOString();
      }

      if (accessType === "PAID") {
        payload.ticketPrice = parseFloat(ticketPrice) || 29.99;
        payload.ticketCapacity = parseInt(ticketCapacity, 10) || 25;
        payload.refundPolicy = refundPolicy;
        payload.whatIsIncluded = whatIsIncluded;

        if (salesStartsAt) {
          payload.salesStartsAt = new Date(salesStartsAt).toISOString();
        } else {
          payload.salesStartsAt = null;
        }

        if (salesEndsAt) {
          payload.salesEndsAt = new Date(salesEndsAt).toISOString();
        } else {
          payload.salesEndsAt = null;
        }

        if (refundPolicy === "REFUNDABLE_UNTIL_DATE" && refundUntil) {
          payload.refundUntil = new Date(refundUntil).toISOString();
        } else {
          payload.refundUntil = null;
        }

        if (isNetworkExclusive && networkId) {
          payload.isNetworkExclusive = true;
          payload.networkId = networkId;
        } else {
          payload.isNetworkExclusive = false;
          payload.networkId = null;
        }
      }

      const res = await fetch(`/api/spaces/${space.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to update talk.");
        return;
      }

      onSaved(data);
      onClose();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleCancelTalk = async () => {
    if (cancelling) return;
    setCancelling(true);
    setError(null);

    try {
      const res = await fetch(`/api/spaces/${space.id}?action=cancel`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Failed to cancel talk.");
        setCancelling(false);
        return;
      }

      onCancelled(space.id);
      onClose();
    } catch {
      setError("Network error while cancelling talk.");
      setCancelling(false);
    }
  };

  const modalContent = (
    <div
      className="fixed inset-0 z-[100000] flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md animate-fadeIn"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="relative w-full max-w-2xl bg-gradient-to-b from-[#0a192f] via-[#071324] to-[#040c18] border border-emerald-500/40 rounded-3xl p-5 sm:p-7 shadow-[0_20px_70px_rgba(0,0,0,0.95)] overflow-hidden max-h-[92vh] flex flex-col z-[100001]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-emerald-500/20 mb-4">
          <div className="flex items-center gap-2.5">
            <span className="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-400/30 flex items-center justify-center text-emerald-400">
              <Calendar className="w-4 h-4" />
            </span>
            <div>
              <h2 className="text-white text-lg font-black tracking-tight">Edit Pro Talk Details</h2>
              <p className="text-slate-400 text-xs">Update your stage settings, pricing, or cancel this session</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
            aria-label="Close dialog"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {error && (
          <div className="mb-4 px-4 py-2.5 rounded-xl bg-red-500/15 border border-red-500/30 text-red-300 text-xs font-semibold">
            {error}
          </div>
        )}

        {/* Form body */}
        <form onSubmit={handleSave} className="space-y-4 overflow-y-auto pr-1 flex-1">
          {/* Title */}
          <div>
            <label className="block text-slate-300 text-xs font-bold uppercase tracking-wider mb-1.5">
              Talk Title <span className="text-lime-400">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Navigating ERC Audits & Appeals"
              maxLength={120}
              required
              className="w-full px-4 py-3 rounded-2xl bg-[#040e1c] border border-emerald-500/30 focus:border-lime-400 text-white text-sm outline-none transition-all placeholder:text-slate-500"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-slate-300 text-xs font-bold uppercase tracking-wider mb-1.5">
              Description / Agenda
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What will you cover in this session?"
              rows={3}
              maxLength={600}
              className="w-full px-4 py-3 rounded-2xl bg-[#040e1c] border border-emerald-500/30 focus:border-lime-400 text-white text-sm outline-none transition-all placeholder:text-slate-500 resize-none"
            />
          </div>

          {/* Category & Media Type Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-slate-300 text-xs font-bold uppercase tracking-wider mb-1.5">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3.5 py-3 rounded-2xl bg-[#040e1c] border border-emerald-500/30 focus:border-lime-400 text-white text-sm outline-none transition-all"
              >
                {PRO_TALK_CATEGORIES.map((c) => (
                  <option key={c.id} value={c.name} className="bg-[#071324] text-white">
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-slate-300 text-xs font-bold uppercase tracking-wider mb-1.5">
                Media Format
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setMediaType("AUDIO_VIDEO")}
                  className={`flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-2xl border text-xs font-bold transition-all ${
                    mediaType === "AUDIO_VIDEO"
                      ? "bg-emerald-500/20 border-lime-400 text-lime-300"
                      : "bg-[#040e1c] border-emerald-500/20 text-slate-400 hover:text-white"
                  }`}
                >
                  <Video className="w-3.5 h-3.5" /> Video + Audio
                </button>
                <button
                  type="button"
                  onClick={() => setMediaType("AUDIO")}
                  className={`flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-2xl border text-xs font-bold transition-all ${
                    mediaType === "AUDIO"
                      ? "bg-emerald-500/20 border-lime-400 text-lime-300"
                      : "bg-[#040e1c] border-emerald-500/20 text-slate-400 hover:text-white"
                  }`}
                >
                  <Mic className="w-3.5 h-3.5" /> Audio Only
                </button>
              </div>
            </div>
          </div>

          {/* Scheduled Date & Time */}
          <div>
            <label className="block text-slate-300 text-xs font-bold uppercase tracking-wider mb-1.5">
              Scheduled Date &amp; Time
            </label>
            <input
              type="datetime-local"
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
              className="w-full px-4 py-3 rounded-2xl bg-[#040e1c] border border-emerald-500/30 focus:border-lime-400 text-white text-sm outline-none transition-all"
            />
          </div>

          {/* Access Type (Free / Private / Ticketed) */}
          <div>
            <label className="block text-slate-300 text-xs font-bold uppercase tracking-wider mb-1.5">
              Access Type
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setAccessType("FREE")}
                className={`p-3 rounded-2xl border text-left text-xs transition-all ${
                  accessType === "FREE"
                    ? "bg-emerald-500/20 border-lime-400 text-white shadow-sm"
                    : "bg-[#040e1c] border-emerald-500/20 text-slate-400 hover:text-white"
                }`}
              >
                <Globe className="w-4 h-4 text-emerald-400 mb-1" />
                <div className="font-bold text-white">Free / Public</div>
                <div className="text-[10px] text-slate-400">Discoverable to all</div>
              </button>

              <button
                type="button"
                onClick={() => setAccessType("PRIVATE")}
                className={`p-3 rounded-2xl border text-left text-xs transition-all ${
                  accessType === "PRIVATE"
                    ? "bg-purple-500/20 border-purple-400 text-white shadow-sm"
                    : "bg-[#040e1c] border-emerald-500/20 text-slate-400 hover:text-white"
                }`}
              >
                <Lock className="w-4 h-4 text-purple-300 mb-1" />
                <div className="font-bold text-white">Private / Invite</div>
                <div className="text-[10px] text-slate-400">Invite link only</div>
              </button>

              <button
                type="button"
                onClick={() => setAccessType("PAID")}
                className={`p-3 rounded-2xl border text-left text-xs transition-all ${
                  accessType === "PAID"
                    ? "bg-gradient-to-br from-emerald-500/25 to-teal-500/20 border-lime-400 text-white shadow-sm"
                    : "bg-[#040e1c] border-emerald-500/20 text-slate-400 hover:text-white"
                }`}
              >
                <Ticket className="w-4 h-4 text-lime-400 mb-1" />
                <div className="font-bold text-white">Ticketed / Paid</div>
                <div className="text-[10px] text-slate-400">Verified ticket</div>
              </button>
            </div>
          </div>

          {/* Ticketed Configuration when accessType === "PAID" */}
          {accessType === "PAID" && (
            <div className="p-4 rounded-2xl bg-[#030d1a] border border-emerald-500/30 space-y-4 animate-fadeIn">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 text-xs font-bold uppercase tracking-wider mb-1">
                    Ticket Price ($ USD)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="1"
                    value={ticketPrice}
                    onChange={(e) => setTicketPrice(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#040e1c] border border-emerald-500/30 focus:border-lime-400 text-white text-xs outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 text-xs font-bold uppercase tracking-wider mb-1">
                    Ticket Capacity
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={ticketCapacity}
                    onChange={(e) => setTicketCapacity(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#040e1c] border border-emerald-500/30 focus:border-lime-400 text-white text-xs outline-none"
                  />
                </div>
              </div>

              {/* Sales Window Dates */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 text-xs font-bold uppercase tracking-wider mb-1">
                    Sales Start Time (Optional)
                  </label>
                  <input
                    type="datetime-local"
                    value={salesStartsAt}
                    onChange={(e) => setSalesStartsAt(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#040e1c] border border-emerald-500/30 text-white text-xs"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 text-xs font-bold uppercase tracking-wider mb-1">
                    Sales End Time (Optional)
                  </label>
                  <input
                    type="datetime-local"
                    value={salesEndsAt}
                    onChange={(e) => setSalesEndsAt(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#040e1c] border border-emerald-500/30 text-white text-xs"
                  />
                </div>
              </div>

              {/* Refund Policy */}
              <div>
                <label className="block text-slate-300 text-xs font-bold uppercase tracking-wider mb-1">
                  Refund Policy
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setRefundPolicy("NO_REFUNDS")}
                    className={`p-2.5 rounded-xl border text-xs text-left ${
                      refundPolicy === "NO_REFUNDS"
                        ? "bg-emerald-500/20 border-lime-400 text-white"
                        : "bg-[#040e1c] border-emerald-500/20 text-slate-400"
                    }`}
                  >
                    No Refunds
                  </button>
                  <button
                    type="button"
                    onClick={() => setRefundPolicy("REFUNDABLE_UNTIL_DATE")}
                    className={`p-2.5 rounded-xl border text-xs text-left ${
                      refundPolicy === "REFUNDABLE_UNTIL_DATE"
                        ? "bg-emerald-500/20 border-lime-400 text-white"
                        : "bg-[#040e1c] border-emerald-500/20 text-slate-400"
                    }`}
                  >
                    Refundable Until Date
                  </button>
                </div>
                {refundPolicy === "REFUNDABLE_UNTIL_DATE" && (
                  <div className="mt-2">
                    <input
                      type="datetime-local"
                      value={refundUntil}
                      onChange={(e) => setRefundUntil(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-[#040e1c] border border-emerald-500/30 text-white text-xs"
                    />
                  </div>
                )}
              </div>

              {/* What's Included */}
              <div>
                <label className="block text-slate-300 text-xs font-bold uppercase tracking-wider mb-1">
                  What&apos;s Included
                </label>
                <div className="space-y-1.5 mb-2">
                  {whatIsIncluded.map((item, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between gap-2 p-2 rounded-lg bg-[#040e1c] border border-emerald-500/20 text-xs text-slate-200"
                    >
                      <span className="truncate">{item}</span>
                      <button
                        type="button"
                        onClick={() => removeIncludedItem(idx)}
                        className="text-slate-400 hover:text-rose-400"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newIncludedItem}
                    onChange={(e) => setNewIncludedItem(e.target.value)}
                    placeholder="Add an item…"
                    className="flex-1 px-3 py-1.5 rounded-xl bg-[#040e1c] border border-emerald-500/25 text-xs text-white"
                  />
                  <button
                    type="button"
                    onClick={addIncludedItem}
                    disabled={!newIncludedItem.trim()}
                    className="px-3 py-1.5 rounded-xl bg-emerald-500/20 text-lime-300 text-xs font-bold flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" /> Add
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Bottom Actions */}
          <div className="pt-4 border-t border-emerald-500/20 flex flex-col sm:flex-row items-center justify-between gap-3">
            {confirmCancel ? (
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={handleCancelTalk}
                  disabled={cancelling}
                  className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-black shadow-lg shadow-red-600/30 transition-all"
                >
                  {cancelling ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                  Confirm Cancel Talk
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmCancel(false)}
                  className="px-3 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-slate-300 text-xs font-semibold"
                >
                  Keep Talk
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmCancel(true)}
                className="flex items-center gap-1.5 text-red-400 hover:text-red-300 text-xs font-bold transition-colors py-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" /> Cancel Scheduled Talk
              </button>
            )}

            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-2xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white text-xs font-bold transition-all"
              >
                Close
              </button>
              <button
                type="submit"
                disabled={saving || !name.trim()}
                className="flex items-center gap-1.5 px-6 py-2.5 rounded-2xl bg-gradient-to-r from-lime-400 to-emerald-500 hover:from-lime-300 hover:to-emerald-400 text-[#060e1a] text-xs font-black shadow-md shadow-emerald-500/25 transition-all disabled:opacity-50"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving…
                  </>
                ) : (
                  <>
                    <Check className="w-3.5 h-3.5" /> Save Changes
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}

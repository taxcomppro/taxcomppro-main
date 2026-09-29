"use client";

import { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import {
  X,
  Loader2,
  Ticket,
  DollarSign,
  Users,
  Download,
  Search,
  PlusCircle,
  AlertCircle,
  CheckCircle2,
  RotateCcw,
  Lock,
  Unlock,
  Sparkles,
  TrendingUp,
  Receipt,
  ExternalLink,
} from "lucide-react";
import { TICKET_CAPACITY_PACKS } from "@/lib/ticketedProTalks";

interface TicketAttendee {
  id: string;
  ticketNumber: string;
  status: "CONFIRMED" | "REFUNDED" | "PENDING" | "CANCELLED";
  pricePaid: number;
  currency: string;
  createdAt: string;
  refundedAt?: string | null;
  user: {
    id: string;
    name: string;
    email: string;
    image: string | null;
    headline?: string | null;
  };
}

interface TicketMetrics {
  ticketsSold: number;
  ticketCapacity: number;
  baseTicketAllowance: number;
  bonusTicketCapacity: number;
  ticketsRemaining: number;
  grossSales: number;
  netEarnings: number;
  refundsTotal: number;
  confirmedCount: number;
  refundedCount: number;
  ticketPrice: number;
  salesClosedEarly: boolean;
  salesStartsAt?: string | null;
  salesEndsAt?: string | null;
  refundPolicy?: string | null;
  refundUntil?: string | null;
}

interface HostTicketSalesModalProps {
  spaceId: string;
  spaceName: string;
  isOpen: boolean;
  onClose: () => void;
  onCapacityUpdated?: (newCapacity: number) => void;
}

export default function HostTicketSalesModal({
  spaceId,
  spaceName,
  isOpen,
  onClose,
  onCapacityUpdated,
}: HostTicketSalesModalProps) {
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [metrics, setMetrics] = useState<TicketMetrics | null>(null);
  const [attendees, setAttendees] = useState<TicketAttendee[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [buyingPackId, setBuyingPackId] = useState<string | null>(null);
  const [togglingSales, setTogglingSales] = useState(false);
  const [refundingId, setRefundingId] = useState<string | null>(null);
  const [refundConfirmId, setRefundConfirmId] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const loadData = useCallback(async () => {
    if (!spaceId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/spaces/${spaceId}/tickets`);
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to load ticket metrics");
      }
      setMetrics(data.metrics);
      setAttendees(data.attendees || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load ticket sales");
    } finally {
      setLoading(false);
    }
  }, [spaceId]);

  useEffect(() => {
    if (isOpen) {
      loadData();
      setActionSuccess(null);
      setRefundConfirmId(null);
    }
  }, [isOpen, loadData]);

  // Lock body scroll
  useEffect(() => {
    if (!isOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  const handleToggleSales = async () => {
    if (!metrics || togglingSales) return;
    setTogglingSales(true);
    setError(null);
    try {
      const res = await fetch(`/api/spaces/${spaceId}/sales-toggle`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ closeEarly: !metrics.salesClosedEarly }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update sales status");
      setMetrics((prev) =>
        prev ? { ...prev, salesClosedEarly: data.salesClosedEarly } : prev
      );
      setActionSuccess(
        data.salesClosedEarly
          ? "Ticket sales have been closed early."
          : "Ticket sales are now re-opened."
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to toggle sales");
    } finally {
      setTogglingSales(false);
    }
  };

  const handleBuyCapacity = async (packId: string) => {
    if (buyingPackId) return;
    setBuyingPackId(packId);
    setError(null);
    try {
      const res = await fetch(`/api/spaces/${spaceId}/capacity-checkout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ packId }),
      });
      const data = await res.json();
      if (!res.ok || !data.url) {
        throw new Error(data.error || "Failed to initiate capacity checkout");
      }
      window.location.href = data.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start capacity checkout");
      setBuyingPackId(null);
    }
  };

  const handleRefundAttendee = async (ticketId: string) => {
    if (refundingId) return;
    setRefundingId(ticketId);
    setError(null);
    try {
      const res = await fetch(`/api/spaces/${spaceId}/tickets/${ticketId}/refund`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to refund ticket");
      setActionSuccess("Ticket refunded successfully.");
      setRefundConfirmId(null);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not process refund");
    } finally {
      setRefundingId(null);
    }
  };

  const handleExportCsv = () => {
    window.open(`/api/spaces/${spaceId}/tickets?format=csv`, "_blank");
  };

  if (!isOpen || !mounted) return null;

  const filteredAttendees = attendees.filter((a) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      a.ticketNumber.toLowerCase().includes(q) ||
      a.user.name?.toLowerCase().includes(q) ||
      a.user.email?.toLowerCase().includes(q)
    );
  });

  const percentSold = metrics
    ? Math.min(100, Math.round((metrics.ticketsSold / (metrics.ticketCapacity || 1)) * 100))
    : 0;

  const modalContent = (
    <div
      className="fixed inset-0 z-[100000] flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md animate-fadeIn"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="relative w-full max-w-4xl bg-gradient-to-b from-[#08172c] via-[#051122] to-[#030914] border border-emerald-500/40 rounded-3xl p-5 sm:p-7 shadow-[0_25px_80px_rgba(0,0,0,0.95)] overflow-hidden max-h-[92vh] flex flex-col z-[100001]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Glow Header */}
        <div className="absolute top-0 left-1/4 w-96 h-32 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Top Header */}
        <div className="flex items-start justify-between pb-4 border-b border-emerald-500/20 mb-5 relative">
          <div className="flex items-center gap-3">
            <span className="w-11 h-11 rounded-2xl bg-gradient-to-br from-emerald-500/25 to-teal-500/15 border border-emerald-400/40 flex items-center justify-center text-emerald-300 shadow-md shadow-emerald-500/20">
              <Ticket className="w-5 h-5" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-lime-300 text-[10px] font-black uppercase tracking-wider">
                  Host Dashboard
                </span>
                {metrics?.salesClosedEarly && (
                  <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 border border-amber-400/40 text-amber-300 text-[10px] font-bold">
                    Sales Paused
                  </span>
                )}
              </div>
              <h2 className="text-white text-xl font-black tracking-tight mt-0.5">
                Ticket Sales &amp; Attendees
              </h2>
              <p className="text-slate-400 text-xs truncate max-w-md">{spaceName}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportCsv}
              disabled={loading || attendees.length === 0}
              className="hidden sm:flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white text-xs font-bold transition-all disabled:opacity-40"
              title="Export attendee list to CSV"
            >
              <Download className="w-3.5 h-3.5 text-emerald-400" /> Export CSV
            </button>
            <button
              onClick={onClose}
              className="w-9 h-9 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
              aria-label="Close dialog"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Action / Error notices */}
        {actionSuccess && (
          <div className="mb-4 px-4 py-2.5 rounded-2xl bg-emerald-500/15 border border-emerald-400/40 text-emerald-300 text-xs font-semibold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-lime-400 shrink-0" />
            <span>{actionSuccess}</span>
          </div>
        )}
        {error && (
          <div className="mb-4 px-4 py-2.5 rounded-2xl bg-red-500/15 border border-red-500/30 text-red-300 text-xs font-semibold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-3 text-slate-400 text-sm">
            <Loader2 className="w-8 h-8 animate-spin text-emerald-400" />
            <p>Loading ticket sales and attendee data…</p>
          </div>
        ) : (
          <div className="overflow-y-auto pr-1 flex-1 space-y-6">
            {/* Metrics Overview Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {/* Tickets Sold */}
              <div className="p-4 rounded-2xl bg-[#040e1c]/90 border border-emerald-500/25 relative overflow-hidden">
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Tickets Sold
                </div>
                <div className="flex items-baseline gap-1 mt-1">
                  <span className="text-2xl font-black text-white">
                    {metrics?.ticketsSold || 0}
                  </span>
                  <span className="text-xs text-slate-400 font-semibold">
                    / {metrics?.ticketCapacity || 25}
                  </span>
                </div>
                <div className="mt-2.5 w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-lime-400 to-emerald-400 h-full transition-all duration-500 rounded-full"
                    style={{ width: `${percentSold}%` }}
                  />
                </div>
                <span className="text-[10px] text-lime-300 font-bold mt-1 block">
                  {metrics?.ticketsRemaining || 0} tickets remaining
                </span>
              </div>

              {/* Gross Sales */}
              <div className="p-4 rounded-2xl bg-[#040e1c]/90 border border-emerald-500/25">
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                  <TrendingUp className="w-3 h-3 text-emerald-400" /> Gross Sales
                </div>
                <div className="text-2xl font-black text-emerald-300 mt-1">
                  ${((metrics?.grossSales || 0) / 100).toFixed(2)}
                </div>
                <span className="text-[10px] text-slate-400 mt-1 block">
                  ${(metrics?.ticketPrice || 0).toFixed(2)} per ticket
                </span>
              </div>

              {/* Net Earnings */}
              <div className="p-4 rounded-2xl bg-[#040e1c]/90 border border-emerald-500/25">
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                  <DollarSign className="w-3 h-3 text-lime-400" /> Net Earnings
                </div>
                <div className="text-2xl font-black text-lime-400 mt-1">
                  ${((metrics?.netEarnings || 0) / 100).toFixed(2)}
                </div>
                <span className="text-[10px] text-slate-400 mt-1 block">
                  Connected Stripe Payout
                </span>
              </div>

              {/* Refunds Total */}
              <div className="p-4 rounded-2xl bg-[#040e1c]/90 border border-emerald-500/25">
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                  <Receipt className="w-3 h-3 text-rose-400" /> Refunds
                </div>
                <div className="text-2xl font-black text-slate-200 mt-1">
                  ${((metrics?.refundsTotal || 0) / 100).toFixed(2)}
                </div>
                <span className="text-[10px] text-slate-400 mt-1 block">
                  {metrics?.refundedCount || 0} refunded ticket{metrics?.refundedCount === 1 ? "" : "s"}
                </span>
              </div>
            </div>

            {/* Sales Control & Capacity Notice */}
            <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-950/40 via-teal-950/30 to-[#04111f] border border-emerald-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="w-8 h-8 rounded-xl bg-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
                  {metrics?.salesClosedEarly ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
                </span>
                <div>
                  <div className="text-xs font-bold text-white">
                    Sales Status:{" "}
                    <span className={metrics?.salesClosedEarly ? "text-amber-400" : "text-lime-400"}>
                      {metrics?.salesClosedEarly ? "Closed Early" : "Open & Selling"}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400">
                    {metrics?.salesClosedEarly
                      ? "Customers currently cannot purchase new tickets."
                      : "Tickets are actively available for purchase by attendees."}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={handleToggleSales}
                disabled={togglingSales}
                className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 ${
                  metrics?.salesClosedEarly
                    ? "bg-emerald-500 hover:bg-emerald-400 text-black shadow-md shadow-emerald-500/25"
                    : "bg-white/10 hover:bg-white/15 text-slate-200 border border-white/10"
                }`}
              >
                {togglingSales ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : metrics?.salesClosedEarly ? (
                  <Unlock className="w-3.5 h-3.5" />
                ) : (
                  <Lock className="w-3.5 h-3.5" />
                )}
                {metrics?.salesClosedEarly ? "Re-Open Ticket Sales" : "Close Sales Early"}
              </button>
            </div>

            {/* Capacity Upgrade Section */}
            <div className="p-5 rounded-3xl bg-gradient-to-br from-[#06172d] to-[#040d1a] border border-emerald-500/35 relative overflow-hidden">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3.5">
                <div>
                  <div className="flex items-center gap-1.5 text-lime-400 text-xs font-black uppercase tracking-wider">
                    <Sparkles className="w-3.5 h-3.5" /> Boost Your Capacity
                  </div>
                  <h3 className="text-white text-base font-black">
                    Want to open more tickets?
                  </h3>
                  <p className="text-slate-400 text-xs">
                    Standard host allowance includes 25 tickets. Expand capacity anytime to maximize event earnings.
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-[11px] text-slate-400">Current Total Capacity</span>
                  <div className="text-lg font-black text-white">
                    {metrics?.ticketCapacity || 25} Tickets
                  </div>
                </div>
              </div>

              {/* Capacity packs buttons */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 pt-1">
                {TICKET_CAPACITY_PACKS.map((pack) => {
                  const isBuying = buyingPackId === pack.id;
                  return (
                    <button
                      key={pack.id}
                      type="button"
                      disabled={Boolean(buyingPackId)}
                      onClick={() => handleBuyCapacity(pack.id)}
                      className="group relative p-3 rounded-2xl bg-[#040e1c] hover:bg-[#071930] border border-emerald-500/25 hover:border-lime-400/80 transition-all text-left flex flex-col justify-between shadow-sm hover:shadow-lg hover:shadow-emerald-500/10 hover:-translate-y-0.5"
                    >
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase block">
                          {pack.name}
                        </span>
                        <div className="text-sm font-black text-lime-300 mt-0.5">
                          +{pack.bonusCapacity} Tickets
                        </div>
                      </div>
                      <div className="mt-2.5 pt-2 border-t border-emerald-950/60 flex items-center justify-between">
                        <span className="text-xs font-black text-white">
                          ${pack.price.toFixed(2)}
                        </span>
                        {isBuying ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin text-lime-400" />
                        ) : (
                          <PlusCircle className="w-3.5 h-3.5 text-emerald-400 group-hover:text-lime-300 transition-colors" />
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Attendee List Table */}
            <div>
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-3">
                <div>
                  <h3 className="text-white text-base font-black flex items-center gap-2">
                    <Users className="w-4 h-4 text-emerald-400" /> Registered Attendees (
                    {attendees.length})
                  </h3>
                  <p className="text-slate-400 text-xs">
                    Confirmed ticket holders with authorized entry to this Pro Talk
                  </p>
                </div>

                <div className="relative w-full sm:w-64">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search attendee or ticket #…"
                    className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-[#040e1c] border border-emerald-500/30 text-white text-xs placeholder:text-slate-500 outline-none focus:border-lime-400 transition-all"
                  />
                </div>
              </div>

              {filteredAttendees.length === 0 ? (
                <div className="py-12 rounded-2xl bg-[#040e1c]/60 border border-emerald-500/15 text-center text-slate-400 text-xs">
                  {searchQuery ? "No attendees matching search." : "No tickets sold yet."}
                </div>
              ) : (
                <div className="overflow-x-auto rounded-2xl border border-emerald-500/20 bg-[#040e1c]/80">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#030914] text-slate-400 uppercase tracking-wider text-[10px] font-bold border-b border-emerald-500/20">
                      <tr>
                        <th className="px-4 py-3">Attendee</th>
                        <th className="px-4 py-3">Ticket Number</th>
                        <th className="px-4 py-3">Purchased</th>
                        <th className="px-4 py-3">Amount</th>
                        <th className="px-4 py-3">Status</th>
                        <th className="px-4 py-3 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-emerald-500/10">
                      {filteredAttendees.map((item) => {
                        const isRefunding = refundingId === item.id;
                        const isConfirming = refundConfirmId === item.id;
                        return (
                          <tr key={item.id} className="hover:bg-white/[0.02] transition-colors">
                            {/* Attendee */}
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2.5">
                                <div className="w-7 h-7 rounded-full overflow-hidden shrink-0 border border-emerald-400/40 bg-gradient-to-br from-emerald-600 to-teal-800 flex items-center justify-center text-white text-[10px] font-bold">
                                  {item.user.image ? (
                                    <img
                                      src={item.user.image}
                                      alt={item.user.name}
                                      className="w-full h-full object-cover"
                                    />
                                  ) : (
                                    (item.user.name || "?")[0]
                                  )}
                                </div>
                                <div className="min-w-0">
                                  <div className="text-white font-bold truncate">
                                    {item.user.name || "Member"}
                                  </div>
                                  <div className="text-slate-400 text-[10px] truncate">
                                    {item.user.email}
                                  </div>
                                </div>
                              </div>
                            </td>

                            {/* Ticket Number */}
                            <td className="px-4 py-3 font-mono text-emerald-300 font-semibold">
                              {item.ticketNumber}
                            </td>

                            {/* Purchased Date */}
                            <td className="px-4 py-3 text-slate-300">
                              {new Date(item.createdAt).toLocaleDateString(undefined, {
                                month: "short",
                                day: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </td>

                            {/* Amount */}
                            <td className="px-4 py-3 font-bold text-white">
                              ${(item.pricePaid || 0).toFixed(2)}
                            </td>

                            {/* Status */}
                            <td className="px-4 py-3">
                              {item.status === "CONFIRMED" ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-500/20 text-lime-300 border border-emerald-400/30 text-[10px] font-bold">
                                  Confirmed
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-rose-500/20 text-rose-300 border border-rose-400/30 text-[10px] font-bold">
                                  Refunded
                                </span>
                              )}
                            </td>

                            {/* Actions */}
                            <td className="px-4 py-3 text-right">
                              {item.status === "CONFIRMED" ? (
                                isConfirming ? (
                                  <div className="inline-flex items-center gap-1.5">
                                    <button
                                      type="button"
                                      disabled={isRefunding}
                                      onClick={() => handleRefundAttendee(item.id)}
                                      className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-[10px] font-black shadow-md transition-all"
                                    >
                                      {isRefunding ? (
                                        <Loader2 className="w-3 h-3 animate-spin" />
                                      ) : (
                                        "Confirm Refund"
                                      )}
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setRefundConfirmId(null)}
                                      className="px-2 py-1 rounded-lg bg-white/10 hover:bg-white/15 text-slate-300 text-[10px] font-semibold"
                                    >
                                      Cancel
                                    </button>
                                  </div>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => setRefundConfirmId(item.id)}
                                    className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-rose-500/20 border border-white/10 hover:border-rose-500/40 text-slate-400 hover:text-rose-300 text-[10px] font-bold transition-all inline-flex items-center gap-1"
                                  >
                                    <RotateCcw className="w-3 h-3" /> Refund
                                  </button>
                                )
                              ) : (
                                <span className="text-[10px] text-slate-500 italic">
                                  {item.refundedAt
                                    ? new Date(item.refundedAt).toLocaleDateString()
                                    : "Refunded"}
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="pt-4 border-t border-emerald-500/20 mt-4 flex items-center justify-between">
          <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-lime-400 animate-pulse" />
            Payouts deposit automatically to your connected Stripe account.
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-bold transition-all"
          >
            Close Dashboard
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}

"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import { downloadAttendance } from "@/lib/download-attendance";
import {
  Download,
  Users,
  Search,
  Radio,
  Calendar,
  Briefcase,
  Mail,
  Phone,
  FileSpreadsheet,
  Loader2,
  RefreshCw,
  ArrowLeft,
  Building2,
  ShieldCheck,
} from "lucide-react";

interface MemberAttendanceRow {
  userId: string;
  fullName: string;
  company: string;
  title: string;
  email: string;
  phone: string;
  rsvpStatus: string;
  timeIn: string;
  timeOut: string;
  timeInIso: string | null;
  timeOutIso: string | null;
  durationMinutes: number | null;
  isHost: boolean;
  roleTier: string;
}

interface EndedTalkAttendanceSummaryProps {
  space: {
    id: string;
    name: string;
    description?: string | null;
    category?: string | null;
    mediaType?: string | null;
    totalAttendees?: number;
    peakAttendees?: number;
    createdAt?: string | null;
    scheduledAt?: string | null;
    endedAt?: string | null;
    host?: {
      id: string;
      name: string;
      image?: string | null;
      headline?: string | null;
    } | null;
  };
  isAdmin?: boolean;
  isHost?: boolean;
}

export default function EndedTalkAttendanceSummary({
  space,
  isAdmin,
  isHost,
}: EndedTalkAttendanceSummaryProps) {
  const [members, setMembers] = useState<MemberAttendanceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [exporting, setExporting] = useState(false);

  const fetchMembers = useCallback(() => {
    return fetch(`/api/spaces/${space.id}/export-attendees?format=json`, { cache: "no-store" })
      .then(async response => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Failed to load attendee records");
        return data;
      })
      .then(data => { setMembers(data.members || []); setError(null); })
      .catch(err => setError(err instanceof Error ? err.message : "Failed to load attendee data"))
      .finally(() => setLoading(false));
  }, [space.id]);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  const handleExportCsv = async () => {
    setExporting(true); setError(null);
    try { await downloadAttendance(`/api/spaces/${space.id}/export-attendees?format=csv`); }
    catch (err) { setError(err instanceof Error ? err.message : "Export failed. Please retry."); }
    finally { setExporting(false); }
  };

  const filteredMembers = useMemo(() => {
    return members.filter((m) => {
      const query = search.toLowerCase().trim();
      const matchesSearch =
        !query ||
        m.fullName.toLowerCase().includes(query) ||
        m.email.toLowerCase().includes(query) ||
        m.company.toLowerCase().includes(query) ||
        m.title.toLowerCase().includes(query) ||
        m.phone.toLowerCase().includes(query);

      const matchesStatus =
        statusFilter === "ALL" ||
        (statusFilter === "ATTENDED" && m.timeIn !== "Did Not Join") ||
        (statusFilter === "NO_SHOW" && m.timeIn === "Did Not Join") ||
        (statusFilter === "TICKET" && m.rsvpStatus.toLowerCase().includes("ticket"));

      return matchesSearch && matchesStatus;
    });
  }, [members, search, statusFilter]);

  const attendedCount = members.filter((m) => m.timeIn !== "Did Not Join").length;
  const noShowCount = members.filter((m) => m.timeIn === "Did Not Join").length;

  return (
    <div className="w-full max-w-6xl mx-auto px-4 py-8 animate-fade-in text-left">
      {/* Top Breadcrumb & Navigation */}
      <div className="flex items-center justify-between gap-4 mb-6">
        <Link
          href="/pro-talks?tab=my-talks"
          className="inline-flex items-center gap-2 text-xs font-bold text-emerald-400 hover:text-emerald-300 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Pro Talks
        </Link>
        <div className="flex items-center gap-2">
          {(isAdmin || isHost) && (
            <span className="px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-lime-300 text-xs font-bold flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-lime-400" /> Host &amp; Admin Panel
            </span>
          )}
        </div>
      </div>

      {/* Header Banner */}
      <div className="relative rounded-3xl bg-gradient-to-br from-[#06172d] via-[#041021] to-[#020710] border border-emerald-500/35 p-6 sm:p-8 shadow-2xl shadow-black/60 mb-8 overflow-hidden">
        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <span className="px-3 py-1 rounded-full bg-rose-500/20 border border-rose-500/30 text-rose-300 text-xs font-black uppercase tracking-wider flex items-center gap-1.5">
                <Radio className="w-3.5 h-3.5" /> Pro Talk Concluded
              </span>
              {space.category && (
                <span className="px-3 py-1 rounded-full bg-emerald-950/80 border border-emerald-500/30 text-emerald-300 text-xs font-semibold">
                  {space.category}
                </span>
              )}
            </div>

            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight mb-2">
              {space.name}
            </h1>

            <div className="flex flex-wrap items-center gap-y-2 gap-x-4 text-xs text-slate-300">
              {space.host && (
                <span>
                  Hosted by <strong className="text-white">{space.host.name}</strong>
                </span>
              )}
              {space.endedAt && (
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-lime-400" /> Concluded on{" "}
                  {new Date(space.endedAt).toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </span>
              )}
            </div>
          </div>

          {/* Export Action Button */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
            <button
              onClick={handleExportCsv}
              disabled={exporting || loading || members.length === 0}
              className="px-6 py-3.5 rounded-2xl bg-gradient-to-r from-lime-400 via-emerald-400 to-teal-400 hover:from-lime-300 hover:to-emerald-300 text-[#04111f] font-black text-sm shadow-lg shadow-emerald-500/25 transition-all flex items-center justify-center gap-2 disabled:opacity-50 hover:scale-[1.02]"
              title="Download full CSV of all members with Name, Company, Title, Email, Phone, RSVP Status, Time In, and Time Out"
            >
              {exporting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Exporting…
                </>
              ) : (
                <>
                  <FileSpreadsheet className="w-4 h-4" /> Export Member Data (CSV)
                </>
              )}
            </button>
            <button
              onClick={() => { setLoading(true); setError(null); fetchMembers(); }}
              disabled={loading}
              className="p-3.5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white transition-all flex items-center justify-center"
              title="Refresh attendance records"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-6 border-t border-emerald-500/20">
          <div className="p-3.5 rounded-2xl bg-[#030d1a]/80 border border-emerald-500/20">
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Total Members
            </div>
            <div className="text-2xl font-black text-white mt-1">{members.length}</div>
          </div>

          <div className="p-3.5 rounded-2xl bg-[#030d1a]/80 border border-emerald-500/20">
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Live Attendees
            </div>
            <div className="text-2xl font-black text-lime-300 mt-1">{attendedCount}</div>
          </div>

          <div className="p-3.5 rounded-2xl bg-[#030d1a]/80 border border-emerald-500/20">
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Peak Attendance
            </div>
            <div className="text-2xl font-black text-teal-300 mt-1">
              {space.peakAttendees || attendedCount}
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-[#030d1a]/80 border border-emerald-500/20">
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              No Shows / RSVPs
            </div>
            <div className="text-2xl font-black text-slate-300 mt-1">{noShowCount}</div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, email, company, title, or phone…"
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#06172d]/90 border border-emerald-500/25 text-white text-xs placeholder:text-slate-500 focus:outline-none focus:border-emerald-400 transition-colors"
          />
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setStatusFilter("ALL")}
            className={`px-3 py-2 rounded-xl text-xs font-bold transition-all ${
              statusFilter === "ALL"
                ? "bg-emerald-500/25 text-lime-300 border border-lime-400/50"
                : "bg-white/5 text-slate-400 border border-white/10 hover:text-white"
            }`}
          >
            All ({members.length})
          </button>
          <button
            onClick={() => setStatusFilter("ATTENDED")}
            className={`px-3 py-2 rounded-xl text-xs font-bold transition-all ${
              statusFilter === "ATTENDED"
                ? "bg-emerald-500/25 text-lime-300 border border-lime-400/50"
                : "bg-white/5 text-slate-400 border border-white/10 hover:text-white"
            }`}
          >
            Attended ({attendedCount})
          </button>
          <button
            onClick={() => setStatusFilter("NO_SHOW")}
            className={`px-3 py-2 rounded-xl text-xs font-bold transition-all ${
              statusFilter === "NO_SHOW"
                ? "bg-emerald-500/25 text-lime-300 border border-lime-400/50"
                : "bg-white/5 text-slate-400 border border-white/10 hover:text-white"
            }`}
          >
            No Shows ({noShowCount})
          </button>
        </div>
      </div>

      {error && <p role="alert" className="mb-4 rounded-xl border border-red-400/40 bg-red-500/10 p-4 text-red-300">{error}</p>}
      {/* Data Table */}
      <div className="rounded-3xl bg-[#051324]/90 border border-emerald-500/30 overflow-hidden shadow-xl shadow-black/40">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-[#030a14] text-slate-400 border-b border-emerald-500/20 font-bold uppercase tracking-wider text-[11px]">
                <th className="py-3.5 px-4">Full Name</th>
                <th className="py-3.5 px-4">Company / Brand</th>
                <th className="py-3.5 px-4">Title / Role</th>
                <th className="py-3.5 px-4">Email</th>
                <th className="py-3.5 px-4">Phone</th>
                <th className="py-3.5 px-4">RSVP Status</th>
                <th className="py-3.5 px-4">Time In (UTC)</th>
                <th className="py-3.5 px-4">Time Out (UTC)</th>
                <th className="py-3.5 px-4 text-right">First-to-last visit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-emerald-500/10 text-slate-200">
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    <Loader2 className="w-6 h-6 animate-spin text-emerald-400 mx-auto mb-2" />
                    <span>Loading member attendance data…</span>
                  </td>
                </tr>
              ) : filteredMembers.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    <Users className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                    <p className="font-semibold text-slate-300">No member records found</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      {search ? "Try adjusting your search query." : "No attendees or RSVPs recorded for this session."}
                    </p>
                  </td>
                </tr>
              ) : (
                filteredMembers.map((m, idx) => (
                  <tr
                    key={m.userId + idx}
                    className="hover:bg-emerald-500/5 transition-colors group"
                  >
                    <td className="py-3.5 px-4 font-bold text-white whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <span>{m.fullName}</span>
                        {m.isHost && (
                          <span className="px-1.5 py-0.5 rounded bg-amber-400/20 border border-amber-400/40 text-amber-300 text-[10px] font-black uppercase">
                            Host
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-slate-300 whitespace-nowrap">
                      {m.company !== "—" ? (
                        <span className="flex items-center gap-1.5">
                          <Building2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                          <span>{m.company}</span>
                        </span>
                      ) : (
                        <span className="text-slate-500">—</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-slate-300 whitespace-nowrap">
                      {m.title !== "—" ? (
                        <span className="flex items-center gap-1.5">
                          <Briefcase className="w-3.5 h-3.5 text-teal-400 shrink-0" />
                          <span>{m.title}</span>
                        </span>
                      ) : (
                        <span className="text-slate-500">—</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-slate-300 whitespace-nowrap">
                      {m.email !== "—" ? (
                        <a
                          href={`mailto:${m.email}`}
                          className="hover:text-lime-300 hover:underline flex items-center gap-1"
                        >
                          <Mail className="w-3 h-3 text-slate-400 shrink-0" />
                          <span>{m.email}</span>
                        </a>
                      ) : (
                        <span className="text-slate-500">—</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-slate-300 whitespace-nowrap">
                      {m.phone !== "—" ? (
                        <span className="flex items-center gap-1 text-slate-300">
                          <Phone className="w-3 h-3 text-emerald-400 shrink-0" />
                          <span>{m.phone}</span>
                        </span>
                      ) : (
                        <span className="text-slate-500">—</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold ${
                          m.rsvpStatus.includes("Ticket")
                            ? "bg-amber-500/20 text-amber-300 border border-amber-400/40"
                            : m.rsvpStatus.includes("Attended")
                            ? "bg-emerald-500/20 text-lime-300 border border-emerald-400/40"
                            : "bg-slate-500/20 text-slate-400 border border-slate-500/30"
                        }`}
                      >
                        {m.rsvpStatus}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-300 whitespace-nowrap font-mono text-[11px]">
                      {m.timeIn !== "Did Not Join" ? (
                        <span className="text-emerald-300">{m.timeIn}</span>
                      ) : (
                        <span className="text-slate-500">Did Not Join</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-slate-300 whitespace-nowrap font-mono text-[11px]">
                      {m.timeOut !== "—" ? (
                        <span className="text-teal-300">{m.timeOut}</span>
                      ) : (
                        <span className="text-slate-500">—</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono text-slate-300 whitespace-nowrap">
                      {m.durationMinutes !== null ? (
                        <span className="font-bold text-white">{m.durationMinutes} min</span>
                      ) : (
                        <span className="text-slate-500">—</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Footer Summary */}
        <div className="p-4 bg-[#030a14] border-t border-emerald-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-400">
          <div>
            Showing <strong className="text-white">{filteredMembers.length}</strong> of{" "}
            <strong className="text-white">{members.length}</strong> recorded members
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={handleExportCsv}
              disabled={exporting || members.length === 0}
              className="text-lime-400 hover:text-lime-300 font-bold flex items-center gap-1.5 transition-colors"
            >
              <Download className="w-3.5 h-3.5" /> Download CSV
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

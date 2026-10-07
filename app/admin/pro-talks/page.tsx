"use client";

import { useEffect, useState } from "react";
import { downloadAttendance } from "@/lib/download-attendance";
import "./attendance.css";

type Talk = { id: string; name: string; isLive: boolean; endedAt: string | null; createdAt: string; host: { name: string; email: string }; _count: { attendances: number; rsvps: number; tickets: number } };
type Member = { userId: string; fullName: string; email: string; phone: string; company: string; title: string; attended: boolean; rsvpStatus: string; timeInIso: string | null; timeOutIso: string | null; durationMinutes: number | null; ticketNumber: string; ticketStatus: string; paymentStatus: string };
type Report = { space: { id: string; name: string }; members: Member[] };
const endpoint = "/api/admin/pro-talks/attendance";
const date = (value: string | null) => value ? new Date(value).toLocaleString() : "—";

export default function AdminProTalksPage() {
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [revision, setRevision] = useState(0);
  const [list, setList] = useState<{ talks: Talk[]; total: number; pages: number } | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState("");
  const [detailError, setDetailError] = useState("");
  const [exportError, setExportError] = useState("");
  const [exporting, setExporting] = useState(false);
  const [scope, setScope] = useState("joined");
  const [memberSearch, setMemberSearch] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    fetch(`${endpoint}?${new URLSearchParams({ q: search, status, page: String(page) })}`, { signal: controller.signal, cache: "no-store" })
      .then(async res => { const data = await res.json(); if (!res.ok) throw new Error(data.error || "Unable to load talks"); return data; })
      .then(data => { if (!controller.signal.aborted) setList(data); }).catch(err => { if (!controller.signal.aborted) { setError(err.message); setList(null); } })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [search, status, page, revision]);

  useEffect(() => {
    if (!selected) return;
    const controller = new AbortController();
    fetch(`${endpoint}?${new URLSearchParams({ talkId: selected })}`, { signal: controller.signal, cache: "no-store" })
      .then(async res => { const data = await res.json(); if (!res.ok) throw new Error(data.error || "Unable to load attendees"); return data; })
      .then(data => { if (!controller.signal.aborted) setReport(data); }).catch(err => { if (!controller.signal.aborted) setDetailError(err.message); })
      .finally(() => { if (!controller.signal.aborted) setDetailLoading(false); });
    return () => controller.abort();
  }, [selected, revision]);

  function refresh() { setLoading(true); setError(""); setDetailError(""); if (selected) setDetailLoading(true); setRevision(value => value + 1); }
  function openTalk(id: string) { if (id === selected) return; setReport(null); setDetailError(""); setMemberSearch(""); setDetailLoading(true); setSelected(id); }
  function changePage(next: number) { setLoading(true); setError(""); setPage(next); }
  async function exportCsv(talkId?: string) {
    setExporting(true); setExportError("");
    try { await downloadAttendance(`${endpoint}?${new URLSearchParams({ format: "csv", scope, ...(talkId ? { talkId } : { q: search, status }) })}`); }
    catch (err) { setExportError(err instanceof Error ? err.message : "Export failed. Please retry."); }
    finally { setExporting(false); }
  }
  const members = (report?.members || []).filter(member => (scope === "all" || member.attended) && [member.fullName, member.email, member.company, member.phone, member.ticketNumber].join(" ").toLowerCase().includes(memberSearch.toLowerCase()));

  return <main className="ata-page">
    <header className="ata-heading"><div><span className="ata-eyebrow">ADMIN · PRO TALKS</span><h1>Attendance & exports</h1><p>See who joined each talk and download attendance records.</p></div><button onClick={refresh} disabled={loading}>Refresh</button></header>
    <section className="ata-panel">
      <form className="ata-toolbar" onSubmit={event => { event.preventDefault(); setLoading(true); setError(""); setSearch(query); setPage(1); setRevision(value => value + 1); }}>
        <label>Find a talk<input value={query} onChange={event => setQuery(event.target.value)} placeholder="Talk title or host name" /></label>
        <label>Status<select value={status} onChange={event => { setLoading(true); setError(""); setStatus(event.target.value); setPage(1); }}><option value="">All talks</option><option value="live">Live</option><option value="upcoming">Upcoming</option><option value="ended">Ended</option></select></label>
        <button type="submit">Search</button>
        <label>Include in view & export<select value={scope} onChange={event => setScope(event.target.value)}><option value="joined">People who joined</option><option value="all">Everyone, including RSVPs & tickets</option></select></label>
        <button type="button" className="ata-primary" disabled={loading || exporting || !list?.total} onClick={() => exportCsv()}>{exporting ? "Preparing CSV…" : "Export matching talks"}</button>
      </form>
      <p className="ata-note">Exports include all matching talks across every page. Member search below only filters the on-screen table. Times display in your local timezone; CSV times use UTC.</p>
      {exportError && <p role="alert" className="ata-error">{exportError}</p>}
      {error ? <p role="alert" className="ata-error">{error} <button onClick={refresh}>Retry</button></p> : loading ? <p role="status" className="ata-empty">Loading talks…</p> : <>
        <div className="ata-scroll"><table><thead><tr><th>Talk</th><th>Host</th><th>Status</th><th>Joined</th><th>RSVPs</th><th>Tickets</th><th><span className="sr-only">Actions</span></th></tr></thead><tbody>{list?.talks.map(talk => <tr key={talk.id} className={selected === talk.id ? "ata-selected" : ""}><td><strong>{talk.name}</strong><small>{date(talk.endedAt || talk.createdAt)}</small></td><td>{talk.host.name}<small>{talk.host.email}</small></td><td>{talk.endedAt ? "Ended" : talk.isLive ? "Live" : "Upcoming"}</td><td>{talk._count.attendances}</td><td>{talk._count.rsvps}</td><td>{talk._count.tickets}</td><td><button aria-pressed={selected === talk.id} onClick={() => openTalk(talk.id)}>View attendees</button></td></tr>)}</tbody></table></div>
        {!list?.talks.length && <p className="ata-empty">No talks match these filters.</p>}
        <footer className="ata-pagination"><span>{list?.total || 0} talks · Page {page} of {list?.pages || 1}</span><button disabled={page <= 1} onClick={() => changePage(page - 1)}>Previous</button><button disabled={page >= (list?.pages || 1)} onClick={() => changePage(page + 1)}>Next</button></footer>
      </>}
    </section>
    {selected && <section className="ata-panel" aria-label="Talk attendees">
      <header className="ata-heading"><div><h2>{report?.space.name || "Talk attendees"}</h2><p>Attendance, registration and ticket details</p></div><button onClick={() => setSelected(null)}>Close</button></header>
      {detailError ? <p role="alert" className="ata-error">{detailError} <button onClick={refresh}>Retry</button></p> : detailLoading ? <p role="status">Loading attendees…</p> : report && <>
        <div className="ata-toolbar"><label>Search members<input value={memberSearch} onChange={event => setMemberSearch(event.target.value)} placeholder="Name, email, company or ticket" /></label><span>{members.length} shown · {report.members.filter(member => member.attended).length} joined</span><button className="ata-primary" disabled={exporting} onClick={() => exportCsv(report.space.id)}>Export this talk</button></div>
        <div className="ata-scroll"><table><thead><tr><th>Member</th><th>Contact</th><th>Company / title</th><th>Attendance</th><th>Joined / left</th><th>Ticket / payment</th></tr></thead><tbody>{members.map(member => <tr key={member.userId}><td><strong>{member.fullName}</strong></td><td>{member.email || "—"}<small>{member.phone}</small></td><td>{member.company || "—"}<small>{member.title}</small></td><td>{member.rsvpStatus}</td><td>{date(member.timeInIso)}<small>{date(member.timeOutIso)}</small></td><td>{member.ticketNumber || "—"}<small>{[member.ticketStatus, member.paymentStatus].filter(Boolean).join(" · ")}</small></td></tr>)}</tbody></table></div>
        {!members.length && <p className="ata-empty">No members match this view. Choose “Everyone” to include registrations without a recorded join.</p>}
        <p className="ata-note">Reports use saved attendance records. Missing historical joins and anonymous guest contact details cannot be reconstructed.</p>
      </>}
    </section>}
  </main>;
}

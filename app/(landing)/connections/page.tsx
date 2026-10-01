"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { useAppSelector } from "@/store/hooks";
import { Search01Icon, UserAdd01Icon, UserCheck01Icon, UserGroupIcon, Clock01Icon, Tick02Icon, Cancel01Icon, Message01Icon, ArrowRight01Icon, Home01Icon, Location01Icon } from "hugeicons-react";
import UpgradeGate from "@/components/ui/UpgradeGate";
import BrandAmbassadorBadge from "@/components/badges/BrandAmbassadorBadge";
import "./connections.css";

interface Person { id: string; profileSlug?: string | null; name: string; image: string | null; headline: string | null; professionalTitle?: string | null; location?: string | null; isBrandAmbassador?: boolean; }
interface Connection { id: string; requester: Person; receiver: Person; }
interface Data { connections: Connection[]; received: Connection[]; sent: Connection[]; }
type Tab = "home" | "requests" | "suggestions" | "connected" | "sent";
const labels: Record<Tab, string> = { home: "Your connections", requests: "Connection requests", suggestions: "People you may know", connected: "All connections", sent: "Sent requests" };

const AVATAR_GRADIENTS = [
  "linear-gradient(135deg, #6366f1 0%, #4338ca 100%)", // Indigo
  "linear-gradient(135deg, #06b6d4 0%, #0e7490 100%)", // Cyan
  "linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)", // Purple/Violet
  "linear-gradient(135deg, #ec4899 0%, #be185d 100%)", // Pink
  "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)", // Amber/Gold
  "linear-gradient(135deg, #10b981 0%, #047857 100%)", // Emerald
  "linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)", // Blue
  "linear-gradient(135deg, #14b8a6 0%, #0f766e 100%)", // Teal
  "linear-gradient(135deg, #f43f5e 0%, #be123c 100%)", // Rose
  "linear-gradient(135deg, #84cc16 0%, #4d7c0f 100%)", // Lime
  "linear-gradient(135deg, #a855f7 0%, #7e22ce 100%)", // Fuchsia
  "linear-gradient(135deg, #0284c7 0%, #0369a1 100%)", // Sky
];

function getAvatarGradient(seed: string) {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = seed.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % AVATAR_GRADIENTS.length;
  return AVATAR_GRADIENTS[index];
}

function PersonCard({ person, children }: { person: Person; children: ReactNode }) {
  const [failed, setFailed] = useState(false);
  const href = `/member/${person.profileSlug || person.id}`;
  const hasImage = Boolean(person.image && !failed);
  const initial = (person.name.trim().charAt(0) || "U").toUpperCase();
  const avatarBg = getAvatarGradient(person.id || person.name);

  return <article className="cn-card">
    <div className="relative">
      <Link
        href={href}
        className="cn-photo"
        style={!hasImage ? { background: avatarBg, color: "#ffffff" } : undefined}
        aria-label={`View ${person.name}'s profile`}
      >
        {hasImage ? (
          <img
            src={person.image!}
            alt=""
            loading="lazy"
            referrerPolicy="no-referrer"
            onError={() => setFailed(true)}
          />
        ) : (
          <span style={{ color: "#ffffff", fontWeight: 800, textShadow: "0 2px 10px rgba(0,0,0,0.25)" }}>
            {initial}
          </span>
        )}
      </Link>
      {person.isBrandAmbassador && (
        <div className="absolute top-2 right-2 bg-[#071326] rounded-full p-1 border border-amber-400/80 shadow-lg z-10">
          <BrandAmbassadorBadge size={18} showTooltip={false} />
        </div>
      )}
    </div>
    <div className="cn-card-body">
      <div className="flex items-center gap-1.5 flex-wrap">
        <Link href={href} className="cn-name">{person.name}</Link>
        {person.isBrandAmbassador && <BrandAmbassadorBadge size={16} />}
      </div>
      <p className="cn-role">{person.professionalTitle || person.headline || "Community member"}</p>
      <p className="cn-detail">{person.location ? <><Location01Icon size={14} />{person.location}</> : <><UserGroupIcon size={14} />TaxCompPro community</>}</p>
      <div className="cn-actions">{children}</div>
    </div>
  </article>;
}
function Skeletons() { return <div className="cn-grid" role="status" aria-label="Loading connections">{Array.from({ length: 6 }, (_, i) => <div className="cn-card cn-skeleton" key={i}><div className="cn-photo" /><div className="cn-card-body"><span /><span /><span /><span /></div></div>)}</div>; }
function Empty({ title, children }: { title: string; children: ReactNode }) { return <div className="cn-empty"><div><UserGroupIcon size={28} /></div><h3>{title}</h3><p>{children}</p></div>; }

export default function ConnectionsPage() {
  const user = useAppSelector(s => s.auth.user);
  const allowed = !!user && (user.tier !== "FREE" || user.role === "ADMIN");
  const [tab, setTab] = useState<Tab>("home");
  const [search, setSearch] = useState("");
  const [data, setData] = useState<Data>({ connections: [], received: [], sent: [] });
  const [people, setPeople] = useState<Person[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [retry, setRetry] = useState(0);
  const [acting, setActing] = useState<Record<string, boolean>>({});
  const [hidden, setHidden] = useState<string[]>([]);
  const [limit, setLimit] = useState(24);
  const userId = user?.id;
  useEffect(() => {
    if (!allowed || !userId) return;
    const controller = new AbortController();
    async function load() {
      setLoading(true); setError("");
      try {
        const responses = await Promise.all([fetch("/api/connections", { signal: controller.signal }), fetch("/api/connections/people", { signal: controller.signal })]);
        if (responses.some(r => !r.ok)) throw new Error("We couldn’t load your connections. Please try again.");
        const [connections, suggestions] = await Promise.all(responses.map(r => r.json()));
        if (!controller.signal.aborted) { setData(connections); setPeople(suggestions);
    try { const saved = JSON.parse(localStorage.getItem(`connections-hidden:${userId}`) || "[]"); if (Array.isArray(saved)) setHidden(saved.filter(v => typeof v === "string")); } catch { /* Storage is optional. */ } }
      } catch (e) { if (!controller.signal.aborted) setError(e instanceof Error ? e.message : "Couldn’t load connections."); }
      finally { if (!controller.signal.aborted) setLoading(false); }
    }
    void load();
    return () => controller.abort();
  }, [allowed, userId, retry]);
  function navigate(next: Tab) { setTab(next); setSearch(""); setLimit(24); }
  function dismiss(id: string) { const next = [...hidden, id]; setHidden(next); try { localStorage.setItem(`connections-hidden:${userId}`, JSON.stringify(next)); } catch { /* Keep dismissal for this visit. */ } }
  async function act(key: string, url: string, method: string, body: unknown, success: () => void, message: string) {
    setActing(a => ({ ...a, [key]: true })); setNotice(""); setError("");
    try {
      const response = await fetch(url, { method, ...(body ? { headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) } : {}) });
      if (!response.ok) { const result = await response.json().catch(() => ({})); throw new Error(result.error || "That action failed. Please try again."); }
      await response.json(); success(); setNotice(message);
    } catch (e) { setError(e instanceof Error ? e.message : "Please try again."); }
    finally { setActing(a => ({ ...a, [key]: false })); }
  }
  async function send(person: Person) {
    setActing(a => ({ ...a, [person.id]: true })); setError("");
    try {
      const response = await fetch("/api/connections", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ receiverId: person.id }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Couldn’t send your request.");
      setData(d => ({ ...d, sent: [{ ...result, receiver: person }, ...d.sent] }));
      setPeople(p => p.filter(v => v.id !== person.id)); setNotice(`Request sent to ${person.name}.`);
    } catch (e) { setError(e instanceof Error ? e.message : "Please try again."); }
    finally { setActing(a => ({ ...a, [person.id]: false })); }
  }
  const matches = (p: Person) => `${p.name} ${p.headline || ""} ${p.professionalTitle || ""} ${p.location || ""}`.toLowerCase().includes(search.trim().toLowerCase());
  const excluded = new Set([...data.received.map(c => c.requester.id), ...data.sent.map(c => c.receiver.id), ...data.connections.map(c => c.requester.id === userId ? c.receiver.id : c.requester.id)]);
  const suggestions = people.filter(p => !hidden.includes(p.id) && !excluded.has(p.id) && matches(p));
  const received = data.received.filter(c => matches(c.requester));
  const sent = data.sent.filter(c => matches(c.receiver));
  const connected = data.connections.filter(c => matches(c.requester.id === userId ? c.receiver : c.requester));
  const nav = [{ id: "home" as Tab, icon: Home01Icon, label: "Home" }, { id: "requests" as Tab, icon: UserAdd01Icon, label: "Connection requests", count: data.received.length }, { id: "suggestions" as Tab, icon: UserGroupIcon, label: "Suggestions" }, { id: "connected" as Tab, icon: UserCheck01Icon, label: "All connections", count: data.connections.length }, { id: "sent" as Tab, icon: Clock01Icon, label: "Sent requests", count: data.sent.length }];
  if (!user) return <div className="cn-page cn-signed-out"><Empty title="Sign in to connect">Meet your professional community.<br /><Link href="/login" className="cn-primary">Sign in</Link></Empty></div>;
  if (!allowed) return <UpgradeGate feature="Connections & Networking" description="Connect and build your professional network with other tax professionals. Available exclusively for VIP members." />;
  const requestCards = received.slice(0, tab === "home" ? 6 : limit).map(c => <PersonCard person={c.requester} key={c.id}>
    <button className="cn-primary" disabled={acting[c.id]} onClick={() => act(c.id, `/api/connections/${c.id}`, "PATCH", { action: "accept" }, () => setData(d => ({ ...d, received: d.received.filter(r => r.id !== c.id), connections: [{ ...c, receiver: user as Person }, ...d.connections] })), `You’re now connected with ${c.requester.name}.`)}><Tick02Icon size={16} />{acting[c.id] ? "Updating…" : "Confirm"}</button>
    <button className="cn-secondary" disabled={acting[c.id]} onClick={() => act(c.id, `/api/connections/${c.id}`, "PATCH", { action: "decline" }, () => setData(d => ({ ...d, received: d.received.filter(r => r.id !== c.id) })), "Request removed.")}>Delete request</button>
  </PersonCard>);
  return <div className="cn-page">
    <aside className="cn-sidebar"><h1>Connections</h1><p>Good people. Great possibilities.</p><nav aria-label="Connections navigation">{nav.map(n => <button key={n.id} aria-current={tab === n.id ? "page" : undefined} onClick={() => navigate(n.id)}><n.icon size={21} /><span>{n.label}</span>{n.count !== undefined && !loading && <small>{n.count}</small>}</button>)}</nav>
      <div className="cn-sidebar-bottom"><p>KEEP THE CONVERSATION GOING</p><Link href="/messages"><Message01Icon size={20} />Messages<ArrowRight01Icon size={16} /></Link><Link href="/groups"><UserGroupIcon size={20} />Explore groups<ArrowRight01Icon size={16} /></Link><Link href="/find-a-pro"><UserCheck01Icon size={20} />Find a Pro<ArrowRight01Icon size={16} /></Link></div>
    </aside>
    <div className="cn-main"><header className="cn-heading"><div><span className="cn-eyebrow">YOUR PROFESSIONAL CIRCLE</span><h2>{labels[tab]}<span>.</span></h2><p>Connect with peers, share expertise, and grow together.</p></div><label className="cn-search"><Search01Icon size={20} /><input aria-label="Search connections and people" placeholder="Search people…" value={search} onChange={e => { setSearch(e.target.value); setLimit(24); }} />{search && <button aria-label="Clear search" onClick={() => setSearch("")}><Cancel01Icon size={17} /></button>}</label></header>
      {error && <div className="cn-alert" role="alert">{error}<button onClick={() => setRetry(r => r + 1)}>Refresh</button></div>}{notice && <p className="cn-notice" role="status">{notice}</p>}
      {loading ? <Skeletons /> : <>
        {(tab === "home" || tab === "requests") && <section className="cn-section"><div className="cn-section-title"><h3>Connection requests <small>{received.length}</small></h3>{tab === "home" && <button onClick={() => navigate("requests")}>See all<ArrowRight01Icon size={16} /></button>}</div>{received.length ? <div className="cn-grid">{requestCards}</div> : <Empty title={search ? "No matching requests" : "You’re all caught up"}>New connection requests will appear here.</Empty>}</section>}
        {(tab === "home" || tab === "suggestions") && <section className="cn-section"><div className="cn-section-title"><h3>People you may know</h3>{tab === "home" && <button onClick={() => navigate("suggestions")}>See all<ArrowRight01Icon size={16} /></button>}</div>{suggestions.length ? <div className="cn-grid">{suggestions.slice(0, tab === "home" ? 12 : limit).map(p => <PersonCard person={p} key={p.id}><button className="cn-primary" disabled={acting[p.id]} onClick={() => send(p)}><UserAdd01Icon size={16} />{acting[p.id] ? "Sending…" : "Connect"}</button><button className="cn-secondary" disabled={acting[p.id]} onClick={() => dismiss(p.id)}>Remove suggestion</button></PersonCard>)}</div> : <Empty title={search ? "No people found" : "No new suggestions right now"}>Try another search or explore your professional community.</Empty>}{tab === "suggestions" && hidden.length > 0 && <button className="cn-text-button" onClick={() => { setHidden([]); try { localStorage.removeItem(`connections-hidden:${userId}`); } catch {} }}>Restore removed suggestions</button>}</section>}
        {tab === "connected" && <section className="cn-section">{connected.length ? <div className="cn-grid">{connected.slice(0, limit).map(c => { const p = c.requester.id === userId ? c.receiver : c.requester; return <PersonCard person={p} key={c.id}><Link className="cn-primary" href={`/messages?user=${p.id}`}><Message01Icon size={16} />Message</Link><button className="cn-secondary" disabled={acting[c.id]} onClick={() => act(c.id, `/api/connections/${c.id}`, "DELETE", null, () => { setData(d => ({ ...d, connections: d.connections.filter(r => r.id !== c.id) })); setPeople(v => [...v.filter(a => a.id !== p.id), p]); }, "Connection removed.")}>{acting[c.id] ? "Removing…" : "Remove connection"}</button></PersonCard>; })}</div> : <Empty title={search ? "No matching connections" : "Your circle starts here"}>Explore suggestions and connect with someone new.<br /><button className="cn-primary" onClick={() => navigate("suggestions")}>Discover people</button></Empty>}</section>}
        {tab === "sent" && <section className="cn-section">{sent.length ? <div className="cn-grid">{sent.slice(0, limit).map(c => <PersonCard person={c.receiver} key={c.id}><span className="cn-pending"><Clock01Icon size={16} />Request pending</span><button className="cn-secondary" disabled={acting[c.id]} onClick={() => act(c.id, `/api/connections/${c.id}`, "DELETE", null, () => { setData(d => ({ ...d, sent: d.sent.filter(r => r.id !== c.id) })); setPeople(v => [...v.filter(p => p.id !== c.receiver.id), c.receiver]); }, "Request canceled.")}>{acting[c.id] ? "Canceling…" : "Cancel request"}</button></PersonCard>)}</div> : <Empty title={search ? "No matching requests" : "No sent requests"}>Requests you send will appear here until they’re accepted.</Empty>}</section>}
        {tab !== "home" && (tab === "suggestions" ? suggestions.length : tab === "requests" ? received.length : tab === "sent" ? sent.length : connected.length) > limit && <button className="cn-secondary cn-more" onClick={() => setLimit(l => l + 24)}>Show more</button>}
      </>}
    </div>
  </div>;
}

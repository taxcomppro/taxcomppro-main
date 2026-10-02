"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useAppSelector } from "@/store/hooks";
import { Room, RoomEvent } from "livekit-client";
import { SentIcon, Message01Icon, ArrowLeft01Icon, Tick02Icon, Search01Icon, Attachment01Icon, Cancel01Icon, File01Icon, UserGroupIcon, ArrowRight01Icon, UserCircleIcon, RefreshIcon } from "hugeicons-react";
import UpgradeGate from "@/components/ui/UpgradeGate";
import BrandAmbassadorBadge from "@/components/badges/BrandAmbassadorBadge";
import "./messages.css";

type Person = { id: string; profileSlug?: string | null; name: string; image: string | null; headline?: string | null; isBrandAmbassador?: boolean };
type Message = { id: string; senderId: string; receiverId: string; content: string; fileUrl?: string | null; fileName?: string | null; fileType?: string | null; isRead: boolean; isSponsored?: boolean; createdAt: string };
type Thread = Message & { partner: Person; unreadCount: number };
const AVATAR_GRADIENTS = [
  "linear-gradient(135deg, #6366f1 0%, #4338ca 100%)",
  "linear-gradient(135deg, #06b6d4 0%, #0e7490 100%)",
  "linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)",
  "linear-gradient(135deg, #ec4899 0%, #be185d 100%)",
  "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
  "linear-gradient(135deg, #10b981 0%, #047857 100%)",
  "linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)",
  "linear-gradient(135deg, #14b8a6 0%, #0f766e 100%)",
  "linear-gradient(135deg, #f43f5e 0%, #be123c 100%)",
  "linear-gradient(135deg, #84cc16 0%, #4d7c0f 100%)",
  "linear-gradient(135deg, #a855f7 0%, #7e22ce 100%)",
  "linear-gradient(135deg, #0284c7 0%, #0369a1 100%)",
];

function getAvatarGradient(seed: string) {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = seed.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_GRADIENTS[Math.abs(hash) % AVATAR_GRADIENTS.length];
}

function Avatar({ person }: { person: Person }) {
  const [failed, setFailed] = useState(false);
  const hasImage = Boolean(person.image && !failed);
  const initial = (person.name.trim().charAt(0) || "U").toUpperCase();
  const avatarBg = getAvatarGradient(person.id || person.name);
  return (
    <span className="relative inline-block">
      <span
        className="ms-avatar"
        style={!hasImage ? { background: avatarBg, color: "#ffffff", display: "inline-flex", alignItems: "center", justifyContent: "center", fontWeight: 700 } : undefined}
      >
        {hasImage ? (
          <img src={person.image!} alt="" loading="lazy" onError={() => setFailed(true)} />
        ) : (
          initial
        )}
      </span>
      {person.isBrandAmbassador && (
        <span className="absolute -bottom-1.5 -right-1.5 drop-shadow-[0_2px_4px_rgba(0,0,0,0.65)] z-10 transition-transform duration-200 hover:scale-110" title="Official TCP Brand Ambassador">
          <BrandAmbassadorBadge size={16} showTooltip={false} />
        </span>
      )}
    </span>
  );
}
function time(value: string) { const d = new Date(value); return d.toDateString() === new Date().toDateString() ? d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }) : d.toLocaleDateString([], { month: "short", day: "numeric" }); }
function Empty({ title, text }: { title: string; text: string }) { return <div className="ms-empty"><span><Message01Icon size={30} /></span><h2>{title}</h2><p>{text}</p></div>; }
function Loading() { return <div className="ms-loading" role="status" aria-label="Loading messages">{[0, 1, 2, 3].map(i => <div key={i}><span /><span /></div>)}</div>; }
async function json(response: Response) { const result = await response.json(); if (!response.ok) throw new Error(result.error || "Something went wrong. Please try again."); return result; }

function Chat({ partnerId, me, onBack, onUpdate }: { partnerId: string; me: Person; onBack: () => void; onUpdate: () => void }) {
  const [partner, setPartner] = useState<Person | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [draft, setDraft] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [sending, setSending] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [olderLoading, setOlderLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [showLatest, setShowLatest] = useState(false);
  const viewport = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLTextAreaElement>(null);
  const upload = useRef<HTMLInputElement>(null);
  const room = useRef<Room | null>(null);
  const mounted = useRef(true);
  const nearBottom = useRef(true);
  const busy = useRef(false);
  const olderCursor = useRef<string | null>(null);
  const loaded = useRef(false);
  const lastMessageId = useRef<string | null>(null);
  const draftKey = `message-draft:${me.id}:${partnerId}`;
  const scrollToBottom = () => { requestAnimationFrame(() => { if (viewport.current) viewport.current.scrollTop = viewport.current.scrollHeight; }); };
  const refresh = useCallback(async (signal?: AbortSignal) => {
    try {
      const data = await json(await fetch(`/api/messages/${partnerId}`, { signal }));
      if (!mounted.current || signal?.aborted) return;
      setPartner(data.partner);
      setMessages(previous => { const all = new Map(previous.map(m => [m.id, m])); for (const m of data.messages as Message[]) all.set(m.id, m); return [...all.values()].sort((a,b) => a.createdAt.localeCompare(b.createdAt)); });
      if (!loaded.current) { setHasMore(data.hasMore); olderCursor.current = data.nextCursor; loaded.current = true; }
      const newest = data.messages.at(-1)?.id || null;
      if (newest !== lastMessageId.current) { if (nearBottom.current) scrollToBottom(); else setShowLatest(true); lastMessageId.current = newest; }
    } catch (e) { if (mounted.current && !signal?.aborted) setError(e instanceof Error ? e.message : "Couldn’t load this conversation."); }
    finally { if (mounted.current && !signal?.aborted) setLoading(false); }
  }, [partnerId]);
  useEffect(() => {
    mounted.current = true;
    const controller = new AbortController();
    async function start() { await refresh(controller.signal); if (!controller.signal.aborted) { onUpdate(); try { setDraft(sessionStorage.getItem(draftKey) || ""); } catch {} } }
    void start();
    const interval = setInterval(() => { if (document.visibilityState === "visible") void refresh(controller.signal); }, 8000);
    const current = new Room(); room.current = current;
    current.on(RoomEvent.DataReceived, () => { void refresh(controller.signal); onUpdate(); });
    void (async () => { try { const data = await json(await fetch("/api/messages/token", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ partnerId }), signal: controller.signal })); if (!controller.signal.aborted) { await current.connect(data.url, data.token); if (controller.signal.aborted) void current.disconnect(); } } catch { /* Polling keeps messages updated if realtime is unavailable. */ } })();
    return () => { mounted.current = false; controller.abort(); clearInterval(interval); void current.disconnect(); room.current = null; };
  }, [partnerId, refresh, onUpdate, draftKey]);
  function changeDraft(value: string) { setDraft(value); try { sessionStorage.setItem(draftKey, value); } catch {} }
  async function older() {
    setOlderLoading(true);
    const height = viewport.current?.scrollHeight || 0;
    try { const data = await json(await fetch(`/api/messages/${partnerId}?before=${encodeURIComponent(olderCursor.current || "")}`)); if (!mounted.current) return; setMessages(previous => [...data.messages, ...previous.filter(m => !data.messages.some((old: Message) => old.id === m.id))]); setHasMore(data.hasMore); olderCursor.current = data.nextCursor; requestAnimationFrame(() => { if (viewport.current) viewport.current.scrollTop += viewport.current.scrollHeight - height; }); } catch { setError("Couldn’t load older messages. Please try again."); } finally { if (mounted.current) setOlderLoading(false); }
  }
  async function send() {
    if (busy.current || (!draft.trim() && !file) || !partner) return;
    busy.current = true; setSending(true); setError("");
    try {
      let attachment = {};
      if (file) { const body = new FormData(); body.append("file", file); const result = await json(await fetch("/api/upload/message", { method: "POST", body })); attachment = { fileUrl: result.url, fileType: result.fileType, fileName: file.name }; }
      const message: Message = await json(await fetch(`/api/messages/${partnerId}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ content: draft.trim(), ...attachment }) }));
      try { sessionStorage.removeItem(draftKey); } catch {}
      if (mounted.current) { setMessages(previous => previous.some(m => m.id === message.id) ? previous : [...previous, message]); setDraft(""); setFile(null); nearBottom.current = true; scrollToBottom(); input.current?.focus(); }
      void room.current?.localParticipant.publishData(new TextEncoder().encode(JSON.stringify({ id: message.id })), { reliable: true }).catch(() => {});
      onUpdate();
    } catch (e) { if (mounted.current) setError(e instanceof Error ? e.message : "Message wasn’t sent. Your draft is saved—please try again."); }
    finally { busy.current = false; if (mounted.current) setSending(false); }
  }
  const shown = messages.filter(m => !search || `${m.content} ${m.fileName || ""}`.toLowerCase().includes(search.toLowerCase()));
  return <section className="ms-chat" aria-label="Conversation">
    <header className="ms-chat-header"><button className="ms-icon ms-back" aria-label="Back to inbox" onClick={onBack}><ArrowLeft01Icon size={20} /></button>{partner ? <Link className="ms-partner" href={`/member/${partner.profileSlug || partner.id}`}><Avatar person={partner} /><span><strong className="flex items-center gap-1">{partner.name}{partner.isBrandAmbassador && <BrandAmbassadorBadge size={16} />}</strong><small>{partner.headline || "View member profile"}</small></span></Link> : <span>Loading conversation…</span>}<div className="ms-header-actions"><button className="ms-icon" aria-label="Search this conversation" aria-pressed={searchOpen} onClick={() => { setSearchOpen(v => !v); setSearch(""); }}><Search01Icon size={20} /></button>{partner && <Link className="ms-icon" aria-label="View profile" href={`/member/${partner.profileSlug || partner.id}`}><UserCircleIcon size={21} /></Link>}</div></header>
    {searchOpen && <label className="ms-chat-search"><Search01Icon size={18} /><input aria-label="Search loaded messages" placeholder="Search loaded messages or files…" value={search} onChange={e => setSearch(e.target.value)} autoFocus /><small>{shown.length} results</small></label>}
    {error && <div className="ms-error" role="alert">{error}<button onClick={() => { setError(""); void refresh(); }}>Retry</button><button aria-label="Dismiss error" onClick={() => setError("")}><Cancel01Icon size={16} /></button></div>}
    <div className="ms-history" ref={viewport} onScroll={() => { const el = viewport.current; if (el) { nearBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 100; if (nearBottom.current) setShowLatest(false); } }}>
      {hasMore && <button className="ms-load-older" disabled={olderLoading} onClick={older}>{olderLoading ? "Loading…" : "Load earlier messages"}</button>}
      {loading ? <Loading /> : !shown.length ? <Empty title={search ? "No matching messages" : `Start a conversation${partner ? ` with ${partner.name.split(" ")[0]}` : ""}`} text={search ? "Try another word, or load earlier messages." : "Share an idea, ask a question, or introduce yourself."} /> : shown.map((m,i) => {
        const mine = m.senderId === me.id;
        const day = new Date(m.createdAt).toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" });
        const dateChanged = i === 0 || new Date(shown[i-1].createdAt).toDateString() !== new Date(m.createdAt).toDateString();
        return <div key={m.id}>{dateChanged && <div className="ms-day"><span>{day}</span></div>}<div className={`ms-message ${mine ? "is-mine" : ""}`}><div className={`ms-bubble ${m.isSponsored ? "is-sponsored" : ""}`}>{m.isSponsored && <small className="ms-sponsored">Sponsored</small>}{m.fileUrl && <a className="ms-attachment" href={m.fileUrl} target="_blank" rel="noopener noreferrer">{m.fileType?.startsWith("image/") ? <img src={m.fileUrl} alt={m.fileName || "Shared image"} loading="lazy" /> : <><File01Icon size={24} /><span>{m.fileName || "Open attachment"}</span><ArrowRight01Icon size={16} /></>}</a>}{m.content && <p>{m.content}</p>}<div className="ms-message-meta"><time dateTime={m.createdAt}>{time(m.createdAt)}</time>{mine && <span title={m.isRead ? "Read" : "Sent"}><Tick02Icon size={13} />{m.isRead ? "Read" : "Sent"}</span>}</div></div></div></div>;
      })}
    </div>
    {showLatest && <button className="ms-latest" onClick={() => { nearBottom.current = true; setShowLatest(false); scrollToBottom(); }}>Jump to latest<ArrowRight01Icon size={15} /></button>}
    <form className="ms-composer" onSubmit={e => { e.preventDefault(); void send(); }}>
      {file && <div className="ms-file-preview"><File01Icon size={20} /><span><strong>{file.name}</strong><small>{(file.size / 1024 / 1024).toFixed(1)} MB · Ready to send</small></span><button type="button" disabled={sending} aria-label="Remove attachment" onClick={() => setFile(null)}><Cancel01Icon size={18} /></button></div>}
      <div className="ms-compose-row"><input ref={upload} type="file" hidden accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.zip" onChange={e => { const selected = e.target.files?.[0]; if (selected) { if (selected.size > 25 * 1024 * 1024) setError("Choose a file smaller than 25 MB."); else { setFile(selected); setError(""); } } e.target.value = ""; }} /><button type="button" disabled={sending} className="ms-icon" aria-label="Attach file, up to 25 MB" onClick={() => upload.current?.click()}><Attachment01Icon size={22} /></button><textarea ref={input} value={draft} disabled={sending || !partner} rows={2} maxLength={10000} aria-label="Message" placeholder={file ? "Add a caption…" : "Write a message…"} onChange={e => changeDraft(e.target.value)} onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); void send(); } }} /><button type="submit" className="ms-send" disabled={sending || !partner || (!draft.trim() && !file)} aria-label={sending ? "Sending message" : "Send message"}>{sending ? <RefreshIcon className="ms-spin" size={20} /> : <SentIcon size={21} />}</button></div><div className="ms-compose-hint"><span>Enter to send · Shift + Enter for a new line</span><span>{sending ? "Sending…" : "Files up to 25 MB"}</span></div>
    </form>
  </section>;
}

function MessagesContent() {
  const params = useSearchParams();
  const me = useAppSelector(s => s.auth.user);
  const allowed = !!me && (me.tier !== "FREE" || me.role === "ADMIN");
  const [active, setActive] = useState<string | null>(params.get("user"));
  const [threads, setThreads] = useState<Thread[]>([]);
  const [contacts, setContacts] = useState<Person[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "unread" | "contacts">("all");
  const [error, setError] = useState("");
  const meId = me?.id;
  const [retry, setRetry] = useState(0);
  const refresh = useCallback(async (signal?: AbortSignal) => { if (!allowed) return; try { const result = await json(await fetch("/api/messages", { signal })); if (!signal?.aborted) setThreads(result); } catch { if (!signal?.aborted) setError("Couldn’t refresh your inbox."); } finally { if (!signal?.aborted) setLoading(false); } }, [allowed]);
  const onUpdate = useCallback(() => { void refresh(); }, [refresh]);
  useEffect(() => { if (!allowed) return; const controller = new AbortController(); void (async () => { await refresh(controller.signal); })(); void fetch("/api/connections", { signal: controller.signal }).then(json).then(data => { if (!controller.signal.aborted) setContacts(data.connections.map((c: { requester: Person; receiver: Person }) => c.requester.id === meId ? c.receiver : c.requester)); }).catch(() => { if (!controller.signal.aborted) setError("Couldn’t load your contacts. Try refreshing."); }); const timer = setInterval(() => { if (document.visibilityState === "visible") void refresh(controller.signal); }, 10000); return () => { controller.abort(); clearInterval(timer); }; }, [allowed, meId, refresh, retry]);
  const initialPartner = params.get("user");
  useEffect(() => { if (initialPartner) { const timer = setTimeout(() => setActive(initialPartner), 0); return () => clearTimeout(timer); } }, [initialPartner]);
  function choose(id: string) { setActive(id); setThreads(rows => rows.map(t => t.partner.id === id ? { ...t, unreadCount: 0 } : t)); }
  const unread = threads.reduce((n,t) => n + (t.unreadCount || 0), 0);
  const visible = threads.filter(t => (filter !== "unread" || t.unreadCount > 0) && `${t.partner.name} ${t.content} ${t.fileName || ""}`.toLowerCase().includes(search.toLowerCase()));
  const people = contacts.filter(p => `${p.name} ${p.headline || ""}`.toLowerCase().includes(search.toLowerCase()));
  if (!me) return <div className="ms-page ms-login"><Empty title="Your conversations start here" text="Sign in to message your professional community." /><Link className="ms-primary" href="/login">Sign in</Link></div>;
  if (!allowed) return <UpgradeGate feature="Private Messaging" description="Send and receive private messages with your connections. Available exclusively for VIP members." />;
  return <div className={`ms-page ${active ? "has-chat" : ""}`}><aside className="ms-sidebar"><div className="ms-sidebar-heading"><div><h1>Messages</h1><p>Your people. Your conversations.</p></div><button className="ms-icon" aria-label="New conversation" onClick={() => { setFilter("contacts"); setSearch(""); setActive(null); }}><SentIcon size={22} /></button></div><label className="ms-search"><Search01Icon size={18} /><input aria-label="Search conversations" placeholder="Search people or messages…" value={search} onChange={e => setSearch(e.target.value)} />{search && <button aria-label="Clear search" onClick={() => setSearch("")}><Cancel01Icon size={15} /></button>}</label><nav className="ms-filters" aria-label="Inbox filters">{([['all','All chats'],['unread','Unread'],['contacts','Contacts']] as const).map(([id,label]) => <button key={id} aria-pressed={filter === id} onClick={() => setFilter(id)}>{label}{id === 'unread' && unread > 0 && <small>{unread}</small>}</button>)}</nav>
    {error && <div className="ms-error" role="alert">{error}<button onClick={() => { setError(""); setRetry(v => v + 1); }}>Retry</button></div>}
    <div className="ms-threads">{loading ? <Loading /> : filter === "contacts" ? people.length ? people.map(p => <button className="ms-thread" key={p.id} onClick={() => choose(p.id)}><Avatar person={p} /><span className="ms-thread-text"><strong>{p.name}</strong><small>{p.headline || "Start a conversation"}</small></span><ArrowRight01Icon size={16} /></button>) : <Empty title="No contacts found" text="Connect with members to start a conversation." /> : visible.length ? visible.map(t => <button key={t.partner.id} className={`ms-thread ${active === t.partner.id ? 'is-active' : ''} ${t.unreadCount ? 'is-unread' : ''}`} onClick={() => choose(t.partner.id)}><Avatar person={t.partner} /><span className="ms-thread-text"><strong>{t.partner.name}</strong><small>{t.senderId === me.id ? "You: " : ""}{t.content || t.fileName || "Attachment"}</small></span><span className="ms-thread-meta"><time>{time(t.createdAt)}</time>{t.unreadCount > 0 && <b>{t.unreadCount}</b>}</span></button>) : <Empty title={search ? "No conversations found" : filter === "unread" ? "You’re all caught up" : "Say hello"} text={search ? "Try another name or word." : "Choose Contacts to start a conversation."} />}</div>
    <footer className="ms-sidebar-footer"><Link href="/connections"><UserGroupIcon size={19} />Your connections<ArrowRight01Icon size={16} /></Link></footer></aside>
    {active ? <Chat key={`${me.id}:${active}`} partnerId={active} me={me as Person} onBack={() => setActive(null)} onUpdate={onUpdate} /> : <section className="ms-welcome"><div className="ms-welcome-art"><Message01Icon size={54} /></div><span className="ms-eyebrow">BETTER TOGETHER</span><h2>A good conversation<br />opens new doors<span>.</span></h2><p>Share ideas, exchange resources, and stay connected with your professional circle.</p><button className="ms-primary" onClick={() => { setFilter("contacts"); setSearch(""); }}>Start a conversation<ArrowRight01Icon size={18} /></button><Link href="/connections">Find your next connection</Link></section>}
  </div>;
}
export default function MessagesPage() { return <Suspense fallback={<div className="ms-page"><Loading /></div>}><MessagesContent /></Suspense>; }

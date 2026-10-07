"use client";

import { useEffect, useState, useCallback, use } from "react";
import Link from "next/link";
import { useAppSelector } from "@/store/hooks";
import {
  ArrowUp, ArrowDown, MessageSquare, Plus, Loader2,
  ChevronLeft, Lock, TrendingUp, Clock, Star, Pin, X, Check, RefreshCw,
} from "lucide-react";

interface Post {
  id: string; title: string; body: string; votes: number; isPinned: boolean;
  author: { id: string; name: string; image: string | null };
  _count: { comments: number };
  createdAt: string;
}
interface Forum {
  id: string; name: string; slug: string; description: string | null;
  image: string | null; isAdminOnly: boolean; isPinned: boolean; badge: string | null;
  _count: { posts: number };
}

const DEFAULT_FORUM_IMAGE = "/prohub/LATEST%20UPDATES.png";

const FORUM_IMAGE_FALLBACKS: Record<string, string> = {
  // IRS & Updates
  "irs-news-room": "/prohub/LATEST%20UPDATES.png",
  "irs-newsroom": "/prohub/LATEST%20UPDATES.png",
  "irs-updates": "/prohub/LATEST%20UPDATES.png",
  "industry-updates--regulatory-changes": "/prohub/LATEST%20UPDATES.png",
  "industry-updates": "/prohub/LATEST%20UPDATES.png",

  // Audits & Due Diligence
  "irs-audits--due-diligence": "/prohub/IRS%20AUDITS%20_%20DUE.png",
  "irs-audits-due-diligence": "/prohub/IRS%20AUDITS%20_%20DUE.png",
  "irs-audits": "/prohub/IRS%20AUDITS%20_%20DUE.png",
  "audit-defense--irs-notices": "/prohub/Marketplace%20Announcements%20(6).png",
  "audit-defense-irs-notices": "/prohub/Marketplace%20Announcements%20(6).png",
  "audit-defense": "/prohub/Marketplace%20Announcements%20(6).png",

  // Operations & Workflow
  "tax-office-operations--workflow": "/prohub/TAX%20OFFICE%20OPERATIONS.png",
  "tax-office-operations-workflow": "/prohub/TAX%20OFFICE%20OPERATIONS.png",
  "tax-office-operations": "/prohub/TAX%20OFFICE%20OPERATIONS.png",

  // Compliance & Record Retention
  "compliance--record-retention": "/prohub/RECORD%20RETENSION.png",
  "compliance-record-retention": "/prohub/RECORD%20RETENSION.png",
  "compliance--record-retension": "/prohub/RECORD%20RETENSION.png",
  "due-diligence--compliance": "/prohub/DUE%20DILIGENCE.png",
  "due-diligence-compliance": "/prohub/DUE%20DILIGENCE.png",
  "due-diligence": "/prohub/DUE%20DILIGENCE.png",

  // Marketplace Announcements
  "marketplace-announcements": "/prohub/Marketplace%20Announcements%20(3).png",
  "marketplace": "/prohub/Marketplace%20Announcements%20(3).png",

  // Marketing & Client Acquisition
  "marketing--client-acquisition": "/prohub/MARKETING.png",
  "marketing-client-acquisition": "/prohub/MARKETING.png",
  "marketing": "/prohub/MARKETING.png",

  // Hiring, Training & Staff Management
  "hiring-training--staff-management": "/prohub/HIRING%20TRAINING.png",
  "hiring-training-staff-management": "/prohub/HIRING%20TRAINING.png",
  "hiring-training": "/prohub/HIRING%20TRAINING.png",

  // Tax Software & Technology
  "tax-software--technology": "/prohub/TAX%20SOFTWARE.png",
  "tax-software-technology": "/prohub/TAX%20SOFTWARE.png",
  "tax-software": "/prohub/TAX%20SOFTWARE.png",

  // Banking & Refund Products
  "banking--refund-products": "/prohub/BAKING%20_%20REFUND.png",
  "banking-refund-products": "/prohub/BAKING%20_%20REFUND.png",
  "baking--refund-products": "/prohub/BAKING%20_%20REFUND.png",

  // Business Growth & Expansion
  "business-growth--expansion": "/prohub/BUSINESS%20GROWTH).png",
  "business-growth-expansion": "/prohub/BUSINESS%20GROWTH).png",
  "business-growth": "/prohub/BUSINESS%20GROWTH).png",

  // Schedule C & Self Employment
  "schedule-c--self-employment-returns": "/prohub/SCHEDULE%20C(12).png",
  "schedule-c-self-employment-returns": "/prohub/SCHEDULE%20C(12).png",
  "schedule-c": "/prohub/SCHEDULE%20C(12).png",

  // Forms
  "new-forms": "/prohub/FORMS.png",
  "forms": "/prohub/FORMS.png",
};

function getForumImageUrl(forum: { slug?: string; name?: string; image?: string | null }): string {
  if (forum.slug && FORUM_IMAGE_FALLBACKS[forum.slug]) {
    return FORUM_IMAGE_FALLBACKS[forum.slug];
  }
  if (
    forum.image &&
    forum.image.trim() &&
    !forum.image.includes("taxcomppro.com/wp-content") &&
    !forum.image.includes("pexels.com")
  ) {
    return forum.image;
  }
  return DEFAULT_FORUM_IMAGE;
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  return `${Math.floor(d / 30)}mo ago`;
}

/* ─── New Post Modal ─── */
function NewPostModal({ forumSlug, onSave, onClose }: {
  forumSlug: string;
  onSave: (post: Post) => void;
  onClose: () => void;
}) {
  const [title, setTitle] = useState("");
  const [body,  setBody]  = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState("");

  const handleSave = async () => {
    if (!title.trim() || !body.trim()) { setError("Title and body are required"); return; }
    setSaving(true); setError("");
    try {
      const res = await fetch(`/api/pro-hub/${forumSlug}/posts`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, body }),
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error ?? "Failed"); }
      const post = await res.json();
      onSave(post);
      onClose();
    } catch (e: unknown) { setError(e instanceof Error ? e.message : "Failed");
    } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="font-black text-[#0a1628] text-lg">New Discussion</h2>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-slate-100 transition-colors">
            <X className="w-4 h-4 text-slate-500" />
          </button>
        </div>
        <div className="p-6 space-y-4">
          {error && <div className="bg-red-50 text-red-600 text-sm px-4 py-2.5 rounded-xl">{error}</div>}
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">Title *</label>
            <input value={title} onChange={e => setTitle(e.target.value)}
              placeholder="What do you want to discuss?"
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#0a1628]" />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">Body *</label>
            <textarea value={body} onChange={e => setBody(e.target.value)} rows={6}
              placeholder="Share your thoughts, questions, or insights…"
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm resize-none focus:outline-none focus:border-[#0a1628]" />
          </div>
        </div>
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-100">
          <button onClick={onClose} className="text-sm font-semibold text-slate-500 px-4 py-2 rounded-xl hover:bg-slate-50 transition-all">Cancel</button>
          <button onClick={handleSave} disabled={saving}
            className="flex items-center gap-2 bg-[#0a1628] text-white font-bold text-sm px-5 py-2.5 rounded-xl hover:bg-[#1a3a6b] transition-all disabled:opacity-60">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            {saving ? "Posting…" : "Post Discussion"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Post Row ─── */
function PostRow({ p, forumSlug, onVote }: {
  p: Post; forumSlug: string;
  onVote: (id: string, v: 1 | -1) => void;
}) {
  return (
    <div className="flex items-start gap-4 px-5 py-5 border-b border-slate-100 last:border-0 hover:bg-slate-50/60 transition-colors group">
      {/* Vote */}
      <div className="flex flex-col items-center gap-0.5 pt-1 shrink-0">
        <button onClick={() => onVote(p.id, 1)}
          className="p-1.5 rounded-lg hover:bg-emerald-50 text-slate-400 hover:text-emerald-600 transition-colors">
          <ArrowUp className="w-4 h-4" />
        </button>
        <span className="text-sm font-black text-[#0a1628] tabular-nums">{p.votes}</span>
        <button onClick={() => onVote(p.id, -1)}
          className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-400 transition-colors">
          <ArrowDown className="w-4 h-4" />
        </button>
      </div>

      {/* Content */}
      <Link href={`/pro-hub/${forumSlug}/${p.id}`} className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
          {p.isPinned && <Pin className="w-3.5 h-3.5 text-amber-500 shrink-0" />}
          <h3 className="font-bold text-[#0a1628] text-base leading-snug group-hover:text-[#1a3a6b] transition-colors">{p.title}</h3>
        </div>
        <p className="text-sm text-slate-500 line-clamp-2 mb-2.5 leading-relaxed">{p.body}</p>
        <div className="flex items-center gap-4 text-sm text-slate-400">
          <div className="flex items-center gap-1.5">
            {p.author.image
              ? <img src={p.author.image} alt="" className="w-5 h-5 rounded-full object-cover" />
              : <div className="w-5 h-5 rounded-full bg-[#0a1628] flex items-center justify-center text-white text-[9px] font-black">{p.author.name[0]}</div>}
            <span className="font-medium text-slate-600">{p.author.name}</span>
          </div>
          <span className="flex items-center gap-1"><MessageSquare className="w-3.5 h-3.5" />{p._count.comments} comments</span>
          <span>{timeAgo(p.createdAt)}</span>
        </div>
      </Link>
    </div>
  );
}

/* ─── Page ─── */
export default function ForumDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const user     = useAppSelector(s => s.auth.user);

  const [forum,      setForum]      = useState<Forum | null>(null);
  const [posts,      setPosts]      = useState<Post[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [sort,       setSort]       = useState<"hot" | "new" | "top">("hot");
  const [showNew,    setShowNew]    = useState(false);
  const [syncing,    setSyncing]    = useState(false);
  const [syncMsg,    setSyncMsg]    = useState("");
  const [initializing, setInitializing] = useState(slug === "irs-updates");

  const canPost = user && (!forum?.isAdminOnly || user.role === "ADMIN");

  const load = useCallback(() => {
    setLoading(true);
    fetch(`/api/pro-hub/${slug}?sort=${sort}`)
      .then(r => r.json())
      .then(d => { setForum(d.forum ?? null); setPosts(Array.isArray(d.posts) ? d.posts : []); })
      .finally(() => setLoading(false));
  }, [slug, sort]);

  useEffect(() => {
    if (slug === "irs-updates") return; // handled by auto-init effect
    load();
  }, [load]);

  const handleVote = async (postId: string, value: 1 | -1) => {
    if (!user) return;
    const res = await fetch(`/api/pro-hub/${slug}/posts/${postId}/vote`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ value }),
    });
    if (res.ok) {
      const data = await res.json();
      setPosts(prev => prev.map(p => p.id === postId ? { ...p, votes: data.votes } : p));
    }
  };

  const handleSyncIrs = async () => {
    setSyncing(true); setSyncMsg("");
    try {
      const res = await fetch(`/api/pro-hub/${slug}/sync-irs`, { method: "POST" });
      const data = await res.json();
      if (data.created > 0) {
        setSyncMsg(`✅ Synced ${data.created} new IRS update${data.created !== 1 ? "s" : ""}`);
        load(); // reload posts
      } else if (data.error) {
        setSyncMsg(`❌ ${data.error}`);
      } else {
        setSyncMsg("✅ Already up to date");
      }
    } catch {
      setSyncMsg("❌ Sync failed");
    } finally {
      setSyncing(false);
      setTimeout(() => setSyncMsg(""), 4000);
    }
  };

  const isIrsForum = forum?.badge?.toLowerCase().includes("irs") || slug === "irs-updates";

  // Auto-init: for irs-updates forum, ensure forum+posts exist before loading
  useEffect(() => {
    if (slug !== "irs-updates") { setInitializing(false); return; }
    if (user?.role !== "ADMIN") { setInitializing(false); load(); return; }
    fetch("/api/pro-hub/irs-updates/auto-init", { method: "POST" })
      .finally(() => { setInitializing(false); load(); });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug, user?.role]);

  return (
    <div className="min-h-screen bg-[#f4f6fb]">
      {/* Initializing overlay for IRS forum first visit */}
      {initializing && (
        <div className="fixed inset-0 z-50 bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center gap-4">
          <div className="text-5xl">🏛️</div>
          <div className="flex items-center gap-2 text-[#0a1628] font-black text-lg">
            <Loader2 className="w-5 h-5 animate-spin" />
            Syncing…
          </div>
        </div>
      )}
      {/* Banner */}
      <div className="relative h-48 bg-gradient-to-br from-[#0a1628] to-[#1a3a6b] overflow-hidden">
        <img
          src={forum ? getForumImageUrl(forum) : DEFAULT_FORUM_IMAGE}
          alt={forum?.name ?? "Forum Banner"}
          className="absolute inset-0 w-full h-full object-cover opacity-35"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0a1628] via-[#0a1628]/60 to-transparent" />
        <div className="absolute inset-0 flex flex-col justify-end px-6 pb-5">
          <Link href="/pro-hub" className="flex items-center gap-1.5 text-slate-300 hover:text-white text-xs font-semibold mb-3 w-fit transition-colors">
            <ChevronLeft className="w-3.5 h-3.5" /> Pro Hub
          </Link>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-3xl font-black text-white">{forum?.name ?? "Loading…"}</h1>
            {forum?.isAdminOnly && (
              <span className="flex items-center gap-1 text-[10px] font-black bg-red-500 text-white px-2 py-0.5 rounded-full">
                <Lock className="w-2.5 h-2.5" /> Admin Posts Only
              </span>
            )}
            {forum?.badge && (
              <span className="text-[10px] font-black bg-[#ffbe24] text-[#0a1628] px-2 py-0.5 rounded-full">{forum.badge}</span>
            )}
          </div>
          {forum?.description && <p className="text-slate-300 text-base mt-2 max-w-2xl line-clamp-2">{forum.description}</p>}
        </div>
      </div>

      <div className="max-w-[900px] mx-auto px-4 py-6">
        {/* Toolbar */}
        <div className="flex items-center justify-between mb-4 gap-3">
          <div className="flex items-center gap-1 bg-white border border-slate-100 rounded-xl p-1">
            {([["hot", TrendingUp, "Hot"], ["new", Clock, "New"], ["top", Star, "Top"]] as const).map(([key, Icon, label]) => (
              <button key={key} onClick={() => setSort(key)}
                className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg transition-all ${sort === key ? "bg-[#0a1628] text-white" : "text-slate-500 hover:bg-slate-50"}`}>
                <Icon className="w-3 h-3" /> {label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            {/* Sync IRS News button — admin only, shown for IRS forums */}
            {user?.role === "ADMIN" && isIrsForum && (
              <div className="flex items-center gap-2">
                <button onClick={handleSyncIrs} disabled={syncing}
                  className="flex items-center gap-2 bg-blue-600 text-white font-bold text-sm px-4 py-2.5 rounded-xl hover:bg-blue-700 transition-all disabled:opacity-60">
                  {syncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                  {syncing ? "Syncing…" : "Sync IRS News"}
                </button>
                {syncMsg && <span className="text-xs font-semibold text-slate-600 bg-white px-3 py-1.5 rounded-xl border border-slate-200">{syncMsg}</span>}
              </div>
            )}
            {canPost && !isIrsForum && (
              <button onClick={() => setShowNew(true)}
                className="flex items-center gap-2 bg-[#0a1628] text-white font-bold text-sm px-4 py-2.5 rounded-xl hover:bg-[#1a3a6b] transition-all">
                <Plus className="w-4 h-4" /> New Discussion
              </button>
            )}
          </div>
        </div>

        {/* Posts */}
        <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-50 flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">All Discussions</span>
            <span className="text-xs text-slate-400">{loading ? "…" : `${posts.length} post${posts.length !== 1 ? "s" : ""}`}</span>
          </div>

          {loading ? (
            <div className="divide-y divide-slate-50">
              {[1,2,3].map(i => (
                <div key={i} className="flex items-start gap-4 px-5 py-4 animate-pulse">
                  <div className="w-6 flex flex-col items-center gap-1 pt-1">
                    <div className="w-4 h-4 bg-slate-200 rounded" />
                    <div className="w-3 h-3 bg-slate-200 rounded" />
                    <div className="w-4 h-4 bg-slate-200 rounded" />
                  </div>
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-slate-200 rounded w-2/3" />
                    <div className="h-3 bg-slate-200 rounded w-full" />
                    <div className="h-3 bg-slate-200 rounded w-1/3" />
                  </div>
                </div>
              ))}
            </div>
          ) : posts.length === 0 ? (
            <div className="py-16 text-center">
              <MessageSquare className="w-10 h-10 text-slate-200 mx-auto mb-3" />
              <p className="text-sm font-bold text-slate-400">No discussions yet</p>
              <p className="text-xs text-slate-300 mt-1">Be the first to start a conversation.</p>
              {canPost && (
                <button onClick={() => setShowNew(true)}
                  className="inline-flex items-center gap-2 mt-4 bg-[#0a1628] text-white font-bold text-sm px-5 py-2.5 rounded-xl hover:bg-[#1a3a6b] transition-all">
                  <Plus className="w-4 h-4" /> New Discussion
                </button>
              )}
            </div>
          ) : (
            <div>
              {posts.map(p => (
                <PostRow key={p.id} p={p} forumSlug={slug} onVote={handleVote} />
              ))}
            </div>
          )}
        </div>
      </div>

      {showNew && (
        <NewPostModal forumSlug={slug}
          onSave={post => setPosts(prev => [post, ...prev])}
          onClose={() => setShowNew(false)}
        />
      )}
    </div>
  );
}

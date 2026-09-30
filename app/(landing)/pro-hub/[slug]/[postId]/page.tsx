"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { useAppSelector } from "@/store/hooks";
import {
  ArrowUp, ArrowDown, MessageSquare, ChevronLeft,
  Loader2, Send, Trash2, CornerDownRight,
} from "lucide-react";
import LinkifiedText from "@/components/ui/LinkifiedText";

interface Author { id: string; name: string; image: string | null; headline?: string | null; }

interface CommentData {
  id: string; body: string; votes: number; createdAt: string;
  author: Author;
  replies: CommentData[];
}

interface PostData {
  id: string; title: string; body: string; votes: number; createdAt: string;
  author: Author;
  forum: { id: string; name: string; slug: string; image: string | null };
  comments: CommentData[];
  _count: { comments: number };
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

function Avatar({ user, size = 8 }: { user: Author; size?: number }) {
  const cls = `w-${size} h-${size} rounded-full object-cover`;
  if (user.image) return <img src={user.image} alt={user.name} className={cls} />;
  return (
    <div className={`w-${size} h-${size} rounded-full bg-[#0a1628] flex items-center justify-center shrink-0`}>
      <span className="text-white font-black text-xs">{user.name[0]?.toUpperCase()}</span>
    </div>
  );
}

/* ─── Comment Composer ─── */
function CommentComposer({ onSubmit, placeholder = "Write a comment…", compact = false }: {
  onSubmit: (body: string) => Promise<void>;
  placeholder?: string;
  compact?: boolean;
}) {
  const [body, setBody]       = useState("");
  const [saving, setSaving]   = useState(false);
  const user = useAppSelector(s => s.auth.user);
  if (!user) return null;

  const handleSubmit = async () => {
    if (!body.trim()) return;
    setSaving(true);
    await onSubmit(body.trim());
    setBody("");
    setSaving(false);
  };

  return (
    <div className={`flex items-start gap-3 ${compact ? "" : "p-5"}`}>
      <Avatar user={{ id: user.id, name: user.name ?? "?", image: user.image ?? null }} size={8} />
      <div className="flex-1">
        <textarea
          value={body} onChange={e => setBody(e.target.value)}
          placeholder={placeholder} rows={compact ? 2 : 3}
          className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm resize-none focus:outline-none focus:border-[#0a1628] bg-slate-50 focus:bg-white transition-colors"
        />
        <div className="flex justify-end mt-2">
          <button onClick={handleSubmit} disabled={saving || !body.trim()}
            className="flex items-center gap-2 bg-[#0a1628] text-white font-bold text-xs px-4 py-2 rounded-xl hover:bg-[#1a3a6b] transition-all disabled:opacity-50">
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
            {saving ? "Posting…" : "Comment"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Single Comment ─── */
function Comment({ c, slug, postId, onReply, onDelete, depth = 0 }: {
  c: CommentData; slug: string; postId: string;
  onReply: (parentId: string, body: string) => Promise<void>;
  onDelete: (id: string) => void;
  depth?: number;
}) {
  const [showReply, setShowReply] = useState(false);
  const user = useAppSelector(s => s.auth.user);
  const canDelete = user && (user.id === c.author.id || user.role === "ADMIN");

  return (
    <div className={`${depth > 0 ? "ml-6 border-l-2 border-slate-100 pl-4" : ""} mt-3`}>
      <div className="flex items-start gap-3">
        <Avatar user={c.author} size={7} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-[#0a1628] text-xs">{c.author.name}</span>
            <span className="text-[10px] text-slate-400">{timeAgo(c.createdAt)}</span>
          </div>
          <div className="text-sm text-slate-600 mt-1 leading-relaxed whitespace-pre-wrap break-words">
            <LinkifiedText text={c.body} />
          </div>
          <div className="flex items-center gap-3 mt-1.5">
            {user && depth < 2 && (
              <button onClick={() => setShowReply(v => !v)}
                className="flex items-center gap-1 text-[10px] font-bold text-slate-400 hover:text-[#0a1628] transition-colors">
                <CornerDownRight className="w-3 h-3" /> Reply
              </button>
            )}
            {canDelete && (
              <button onClick={() => onDelete(c.id)}
                className="flex items-center gap-1 text-[10px] font-bold text-red-400 hover:text-red-600 transition-colors">
                <Trash2 className="w-3 h-3" /> Delete
              </button>
            )}
          </div>

          {showReply && (
            <div className="mt-2">
              <CommentComposer
                placeholder={`Reply to ${c.author.name}…`}
                compact
                onSubmit={async body => { await onReply(c.id, body); setShowReply(false); }}
              />
            </div>
          )}
        </div>
      </div>

      {/* Nested replies */}
      {c.replies?.map(r => (
        <Comment key={r.id} c={r} slug={slug} postId={postId} onReply={onReply} onDelete={onDelete} depth={depth + 1} />
      ))}
    </div>
  );
}

/* ─── Page ─── */
export default function DiscussionPage({ params }: { params: Promise<{ slug: string; postId: string }> }) {
  const { slug, postId } = use(params);
  const user = useAppSelector(s => s.auth.user);

  const [post,    setPost]    = useState<PostData | null>(null);
  const [loading, setLoading] = useState(true);
  const [votes,   setVotes]   = useState(0);
  const [myVote,  setMyVote]  = useState(0);

  useEffect(() => {
    fetch(`/api/pro-hub/${slug}/posts/${postId}`)
      .then(r => r.json())
      .then(d => { setPost(d); setVotes(d.votes ?? 0); })
      .finally(() => setLoading(false));
  }, [slug, postId]);

  const handleVote = async (value: 1 | -1) => {
    if (!user) return;
    const res = await fetch(`/api/pro-hub/${slug}/posts/${postId}/vote`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ value }),
    });
    if (res.ok) {
      const data = await res.json();
      setVotes(data.votes);
      setMyVote(data.myVote);
    }
  };

  const handleComment = async (body: string, parentId?: string) => {
    const res = await fetch(`/api/pro-hub/${slug}/posts/${postId}/comments`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ body, parentId }),
    });
    if (res.ok) {
      const comment = await res.json();
      setPost(prev => {
        if (!prev) return prev;
        if (!parentId) {
          return { ...prev, comments: [comment, ...prev.comments] };
        }
        // Insert reply into correct parent
        const insertReply = (comments: CommentData[]): CommentData[] =>
          comments.map(c => c.id === parentId
            ? { ...c, replies: [...(c.replies ?? []), comment] }
            : { ...c, replies: insertReply(c.replies ?? []) }
          );
        return { ...prev, comments: insertReply(prev.comments) };
      });
    }
  };

  const handleDeleteComment = async (id: string) => {
    if (!confirm("Delete this comment?")) return;
    await fetch(`/api/pro-hub/${slug}/posts/${postId}/comments/${id}`, { method: "DELETE" });
    const removeComment = (comments: CommentData[]): CommentData[] =>
      comments.filter(c => c.id !== id).map(c => ({ ...c, replies: removeComment(c.replies ?? []) }));
    setPost(prev => prev ? { ...prev, comments: removeComment(prev.comments) } : prev);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f4f6fb] pt-10">
        <div className="max-w-[800px] mx-auto px-4 space-y-4 animate-pulse">
          <div className="h-6 bg-slate-200 rounded w-1/3" />
          <div className="bg-white rounded-2xl p-6 space-y-3">
            <div className="h-7 bg-slate-200 rounded w-3/4" />
            <div className="h-4 bg-slate-200 rounded w-full" />
            <div className="h-4 bg-slate-200 rounded w-5/6" />
          </div>
        </div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="min-h-screen bg-[#f4f6fb] flex items-center justify-center">
        <div className="text-center">
          <MessageSquare className="w-12 h-12 text-slate-200 mx-auto mb-3" />
          <p className="font-bold text-slate-400">Discussion not found</p>
          <Link href="/pro-hub" className="text-[#0a1628] font-bold text-sm mt-3 inline-block hover:underline">← Back to Pro Hub</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f4f6fb] py-6">
      <div className="max-w-[800px] mx-auto px-4 space-y-4">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <Link href="/pro-hub" className="hover:text-[#0a1628] font-semibold transition-colors">Pro Hub</Link>
          <span>/</span>
          <Link href={`/pro-hub/${slug}`} className="hover:text-[#0a1628] font-semibold transition-colors">{post.forum.name}</Link>
          <span>/</span>
          <span className="text-slate-500 truncate max-w-[200px]">{post.title}</span>
        </div>

        {/* Post card */}
        <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
          <div className="flex gap-4 p-5">
            {/* Vote column */}
            <div className="flex flex-col items-center gap-1 shrink-0">
              <button onClick={() => handleVote(1)}
                className={`p-1.5 rounded-lg transition-colors ${myVote === 1 ? "bg-emerald-100 text-emerald-600" : "hover:bg-emerald-50 text-slate-400 hover:text-emerald-600"}`}>
                <ArrowUp className="w-4 h-4" />
              </button>
              <span className={`text-sm font-black tabular-nums ${votes > 0 ? "text-emerald-600" : votes < 0 ? "text-red-400" : "text-slate-500"}`}>
                {votes}
              </span>
              <button onClick={() => handleVote(-1)}
                className={`p-1.5 rounded-lg transition-colors ${myVote === -1 ? "bg-red-100 text-red-500" : "hover:bg-red-50 text-slate-400 hover:text-red-400"}`}>
                <ArrowDown className="w-4 h-4" />
              </button>
            </div>

            {/* Post content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-3 flex-wrap">
                <Link href={`/pro-hub/${slug}`}
                  className="text-[10px] font-black bg-[#0a1628] text-white px-2 py-0.5 rounded-full hover:bg-[#1a3a6b] transition-colors">
                  {post.forum.name}
                </Link>
                <span className="text-[11px] text-slate-400">Posted by</span>
                <div className="flex items-center gap-1">
                  <Avatar user={post.author} size={5} />
                  <span className="text-[11px] font-bold text-slate-600">{post.author.name}</span>
                </div>
                <span className="text-[11px] text-slate-400">{timeAgo(post.createdAt)}</span>
              </div>

              <h1 className="text-xl font-black text-[#0a1628] mb-3 leading-snug">{post.title}</h1>
              <div className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">
                <LinkifiedText text={post.body} />
              </div>

              <div className="flex items-center gap-3 mt-4 pt-4 border-t border-slate-50">
                <span className="flex items-center gap-1.5 text-[11px] text-slate-400 font-medium">
                  <MessageSquare className="w-3.5 h-3.5" />
                  {post._count.comments} comment{post._count.comments !== 1 ? "s" : ""}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Comment composer */}
        {user && (
          <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-50">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Add a Comment</span>
            </div>
            <CommentComposer onSubmit={body => handleComment(body)} />
          </div>
        )}

        {/* Comments */}
        <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-50 flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">
              {post._count.comments} Comment{post._count.comments !== 1 ? "s" : ""}
            </span>
          </div>

          {post.comments.length === 0 ? (
            <div className="py-12 text-center">
              <MessageSquare className="w-8 h-8 text-slate-200 mx-auto mb-2" />
              <p className="text-sm text-slate-400">No comments yet. Be the first!</p>
            </div>
          ) : (
            <div className="px-5 py-4 divide-y divide-slate-50">
              {post.comments.map(c => (
                <Comment key={c.id} c={c} slug={slug} postId={postId}
                  onReply={(parentId, body) => handleComment(body, parentId)}
                  onDelete={handleDeleteComment}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

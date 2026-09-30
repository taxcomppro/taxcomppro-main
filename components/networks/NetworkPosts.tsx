"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { NetworkPostSkeleton } from "./NetworkSkeleton";
import { BubbleChatIcon, LockIcon, PinIcon, SentIcon, Loading03Icon, UserCircleIcon, Image01Icon, Video01Icon, Cancel01Icon, Link01Icon } from "hugeicons-react";
import LinkifiedText from "@/components/ui/LinkifiedText";

type Person = { id?: string; name?: string; image?: string | null; profileSlug?: string | null };

export type NetworkPost = { images?: string[]; videoUrl?: string | null; id: string; title: string; content: string; category: string; createdAt: string; isPinned?: boolean; isMembersOnly?: boolean; isLocked?: boolean; author: Person | string; _count?: { replies: number }; replyCount?: number };

type Reply = { id: string; content: string; author: Person | string };

function Avatar({ person }: { person?: Person | string | null }) {
  if (!person) return <span className="np-avatar np-avatar-fallback"><UserCircleIcon size={24} /></span>;
  const image = typeof person === "object" ? person.image : null;
  return image ? <img className="np-avatar" src={image} alt="" /> : <span className="np-avatar np-avatar-fallback"><UserCircleIcon size={24} /></span>;
}

function profile(person?: Person | string | null) {
  if (!person) return "#";
  if (typeof person === "string") return `/member/${person}`;
  return `/member/${person.profileSlug || person.id || ""}`;
}

function authorName(person?: Person | string | null) {
  if (!person) return "Member";
  if (typeof person === "string") return person;
  return person.name || "Member";
}

function Post({ post, slug }: { post: NetworkPost; slug: string }) {
  const [expanded, setExpanded] = useState(false);
  const [open, setOpen] = useState(false);
  const [replies, setReplies] = useState<Reply[] | null>(null);
  const [count, setCount] = useState(post._count?.replies ?? post.replyCount ?? 0);
  const [content, setContent] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const sending = useRef(false);

  const endpoint = `/api/pro-networks/${slug}/discussions/${post.id}/replies`;

  async function loadComments() {
    setOpen(true); setLoading(true); setError("");
    try {
      const res = await fetch(endpoint); const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not load comments.");
      setReplies(data.replies); setCount(data.replies.length);
    } catch (err) { setError(err instanceof Error ? err.message : "Could not load comments."); }
    finally { setLoading(false); }
  }

  async function comment(event: React.FormEvent) {
    event.preventDefault(); if (!content.trim() || sending.current) return;
    sending.current = true; setBusy(true); setError("");
    try {
      const res = await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ content: content.trim() }) });
      const data = await res.json(); if (!res.ok) throw new Error(data.error || "Could not add comment.");
      setReplies(previous => [...(previous || []), data.reply]); setCount(previous => previous + 1); setContent("");
    } catch (err) { setError(err instanceof Error ? err.message : "Could not add comment."); }
    finally { setBusy(false); sending.current = false; }
  }

  const automaticTitle = post.content.replace(/\s+/g, " ").slice(0, 100);

  return <article className="np-card">
    {post.isPinned && <div className="np-pinned"><PinIcon size={14} /> Featured post</div>}
    <header className="np-post-header"><Link href={profile(post.author)}><Avatar person={post.author} /></Link><div><Link className="np-author" href={profile(post.author)}>{authorName(post.author)}</Link><div className="np-meta"><time dateTime={post.createdAt}>{new Date(post.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</time><span>·</span><LockIcon size={12} /><span>{post.isMembersOnly ? "Members only" : "Network post"}</span></div></div><span className="np-category">{post.category}</span></header>
    <div className="np-post-content">
      {post.title !== automaticTitle && <h3>{post.title}</h3>}
      <p className="whitespace-pre-wrap"><LinkifiedText text={expanded || post.content.length < 650 ? post.content : `${post.content.slice(0, 650)}…`} /></p>
      {post.content.length >= 650 && <button className="np-text-button" onClick={() => setExpanded(!expanded)}>{expanded ? "Show less" : "See more"}</button>}
    </div>
    {Boolean(post.images?.length) && <div className="np-post-images">{post.images!.map(url => <a href={url} target="_blank" rel="noopener noreferrer" key={url}><img src={url} alt="Post attachment" loading="lazy" /></a>)}</div>}
    {post.videoUrl && <video className="np-post-video" src={post.videoUrl} controls preload="metadata" playsInline />}
    <div className="np-post-footer"><span>{count} {count === 1 ? "comment" : "comments"}</span><button onClick={() => open ? setOpen(false) : loadComments()} aria-expanded={open}><BubbleChatIcon size={19} /> Comment</button></div>
    {open && <section className="np-comments" aria-label="Comments">
      {loading && <p role="status">Loading comments…</p>}
      {error && <p role="alert" className="np-error">{error} {!replies && <button onClick={loadComments}>Try again</button>}</p>}
      {replies?.map(reply => <div className="np-comment" key={reply.id}><Link href={profile(reply.author)}><Avatar person={reply.author} /></Link><div><Link className="np-author" href={profile(reply.author)}>{authorName(reply.author)}</Link><p className="whitespace-pre-wrap"><LinkifiedText text={reply.content} /></p></div></div>)}
      {replies?.length === 0 && <p className="np-meta">Be the first to comment.</p>}
      {replies !== null && <form onSubmit={comment} className="np-comment-form"><textarea aria-label="Write a comment" placeholder="Write a comment…" value={content} maxLength={5000} onChange={e => setContent(e.target.value)} rows={2} /><button className="pn-button pn-primary" disabled={busy || !content.trim()} aria-label="Post comment">{busy ? <Loading03Icon size={18} /> : <SentIcon size={18} />}</button></form>}
    </section>}
  </article>;
}

export default function NetworkPosts({ slug, posts, user, canPost, onCreated, searching, loading, loadError, onRetry }: { slug: string; posts: NetworkPost[]; user?: Person; canPost: boolean; onCreated: (post: NetworkPost) => void; searching: boolean; loading: boolean; loadError: string; onRetry: () => void }) {
  const [content, setContent] = useState("");
  const [category, setCategory] = useState("General");
  const [images, setImages] = useState<string[]>([]);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const uploadingRef = useRef(false);

  // Link inserter state
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const [linkText, setLinkText] = useState("");

  const insertLink = () => {
    let url = linkUrl.trim();
    if (!url) return;
    if (!url.startsWith("http://") && !url.startsWith("https://") && !url.startsWith("/")) {
      url = "https://" + url;
    }
    const text = linkText.trim();
    const snippet = text ? `[${text}](${url})` : url;
    setContent(prev => (prev ? `${prev} ${snippet}` : snippet));
    setLinkUrl("");
    setLinkText("");
    setShowLinkInput(false);
  };

  async function upload(files: FileList | null, video: boolean) {
    if (!files?.length || uploadingRef.current) return;
    const selected = Array.from(files);
    if ((!video && images.length + selected.length > 4) || (video && selected.length > 1)) { setError("Choose up to four photos or one video."); return; }
    if (selected.some(file => video ? !["video/mp4", "video/webm", "video/quicktime"].includes(file.type) || file.size > 100 * 1024 * 1024 : !["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > 10 * 1024 * 1024)) { setError("Photos: JPG, PNG or WebP up to 10 MB. Videos: MP4, WebM or MOV up to 100 MB."); return; }
    uploadingRef.current = true; setUploading(true); setError("");
    try {
      for (const file of selected) {
        const form = new FormData(); form.append("file", file);
        let endpoint = "/api/upload";
        if (video) {
          const ticket = await fetch("/api/upload-video");
          const data = await ticket.json(); if (!ticket.ok) throw new Error(data.error || "Unable to start video upload.");
          for (const key of ["timestamp", "signature", "folder"]) form.append(key, String(data[key]));
          form.append("api_key", data.apiKey);
          endpoint = `https://api.cloudinary.com/v1_1/${data.cloudName}/video/upload`;
        }
        const res = await fetch(endpoint, {method:"POST", body:form}); const data = await res.json();
        const url = video ? data.secure_url : data.url;
        if (!res.ok || !url) throw new Error("Upload failed. Please try again.");
        if (video) setVideoUrl(url); else setImages(previous => [...previous, url]);
      }
    } catch (err) {setError(err instanceof Error ? err.message : "Upload failed.");}
    finally {uploadingRef.current = false; setUploading(false);}
  }

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [visible, setVisible] = useState(10);
  const sending = useRef(false);

  async function publish(event: React.FormEvent) {
    event.preventDefault(); if (!content.trim() || sending.current) return;
    sending.current = true; setBusy(true); setError(""); setNotice("");
    try {
      const res = await fetch(`/api/pro-networks/${slug}/discussions`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title: content.trim().replace(/\s+/g, " ").slice(0, 100) || "Shared media", content: content.trim(), category, images, videoUrl }) });
      const data = await res.json(); if (!res.ok) throw new Error(data.error || "Could not publish your post.");
      onCreated(data.discussion); setContent(""); setImages([]); setVideoUrl(null); setNotice("Your post is published.");
    } catch (err) { setError(err instanceof Error ? err.message : "Could not publish your post."); }
    finally { sending.current = false; setBusy(false); }
  }

  return <div className="np-feed">
    {canPost && user && <form className="np-card np-composer" onSubmit={publish}>
      <div className="np-compose-row"><Avatar person={user} /><div><label htmlFor="network-post">Share with your network</label><textarea id="network-post" placeholder={`What's on your mind, ${(user.name || "there").split(" ")[0]}?`} value={content} onChange={e => setContent(e.target.value)} maxLength={10000} rows={3} /></div></div>

      {showLinkInput && (
        <div style={{ background: "var(--a-inner, #f8fafc)", border: "1px solid var(--a-line, #e2e8f0)", borderRadius: "10px", padding: "10px", margin: "10px 0", display: "flex", flexDirection: "column", gap: "8px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "12px", fontWeight: 700 }}>Add Link</span>
            <button type="button" onClick={() => setShowLinkInput(false)} style={{ background: "transparent", border: "none", cursor: "pointer", fontSize: "14px" }}>✕</button>
          </div>
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            <input
              type="url"
              placeholder="https://example.com"
              value={linkUrl}
              onChange={e => setLinkUrl(e.target.value)}
              style={{ flex: 1, minWidth: "160px", padding: "6px 10px", fontSize: "12px", borderRadius: "6px", border: "1px solid #cbd5e1" }}
            />
            <input
              type="text"
              placeholder="Link text (optional)"
              value={linkText}
              onChange={e => setLinkText(e.target.value)}
              style={{ flex: 1, minWidth: "140px", padding: "6px 10px", fontSize: "12px", borderRadius: "6px", border: "1px solid #cbd5e1" }}
            />
            <button
              type="button"
              onClick={insertLink}
              disabled={!linkUrl.trim()}
              className="pn-button pn-primary"
              style={{ padding: "6px 12px", fontSize: "12px" }}
            >
              Insert
            </button>
          </div>
        </div>
      )}

      <div className="np-attachments">{images.map(url => <div key={url}><img src={url} alt="Photo ready to post" /><button type="button" aria-label="Remove photo" disabled={busy || uploading} onClick={() => setImages(previous => previous.filter(image => image !== url))}><Cancel01Icon size={16} /></button></div>)}{videoUrl && <div><video src={videoUrl} controls preload="metadata" /><button type="button" aria-label="Remove video" disabled={busy || uploading} onClick={() => setVideoUrl(null)}><Cancel01Icon size={16} /></button></div>}</div>
      <div className="np-upload-controls">
        <label><Image01Icon size={19} /> Photo<input className="sr-only" type="file" accept="image/jpeg,image/png,image/webp" multiple disabled={busy || uploading || images.length >= 4} onChange={e => {void upload(e.target.files, false);e.target.value="";}} /></label>
        <label><Video01Icon size={19} /> Video<input className="sr-only" type="file" accept="video/mp4,video/webm,video/quicktime" disabled={busy || uploading || Boolean(videoUrl)} onChange={e => {void upload(e.target.files, true);e.target.value="";}} /></label>
        <button type="button" onClick={() => setShowLinkInput(v => !v)} style={{ display: "inline-flex", alignItems: "center", gap: "6px", background: "transparent", border: "none", cursor: "pointer", fontSize: "13px", color: "inherit" }}>
          <Link01Icon size={19} /> Link
        </button>
        {uploading && <span role="status">Uploading attachment…</span>}
      </div>
      <div className="np-composer-footer"><label className="np-topic">Topic<select aria-label="Post topic" value={category} onChange={e => setCategory(e.target.value)}>{["General", "Tax Strategy", "Questions", "Resources", "Announcements"].map(topic => <option key={topic}>{topic}</option>)}</select></label><span className="np-audience"><LockIcon size={14} /> Members only</span><button className="pn-button pn-primary" disabled={busy || uploading || (!content.trim() && !images.length && !videoUrl)}><SentIcon size={17} />{busy ? "Posting…" : "Post"}</button></div>

      {error && <p role="alert" className="np-error">{error}</p>}{notice && <p role="status" className="np-meta">{notice}</p>}
    </form>}

    <div className="np-feed-heading"><h2>Posts</h2><span>Featured first · Newest posts</span></div>

    {loading ? <div role="status" aria-label="Loading posts"><NetworkPostSkeleton /><span className="sr-only">Loading posts…</span></div> : loadError ? <div className="np-card np-empty" role="alert"><p>{loadError}</p><button className="pn-button pn-secondary" onClick={onRetry}>Try again</button></div> : posts.length === 0 ? <div className="np-card np-empty"><BubbleChatIcon size={30} /><h3>{searching ? "No matching posts" : "Start the conversation"}</h3><p>{searching ? "Try another name, topic, or keyword." : "Share a question, an idea, or an update with your network."}</p></div> : posts.slice(0, visible).map(post => <Post key={post.id} post={post} slug={slug} />)}

    {posts.length > visible && <button className="pn-button pn-secondary" onClick={() => setVisible(previous => previous + 10)}>Show more posts</button>}
  </div>;
}

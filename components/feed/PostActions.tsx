"use client";
import { useEffect, useRef, useState } from "react";
import { Cancel01Icon, ArrowDown01Icon, RepeatIcon } from "hugeicons-react";
import Link from "next/link";
import FeedIcon from "./FeedIcon";
import ReactionIcon from "./ReactionIcon";
import { REACTIONS, isReaction, type ReactionType, type ReactionCounts } from "@/lib/reactions";

export default function PostActions({ postId, content, initialReaction, initialCounts, initialCount, commentCount, canReact, onRequireUpgrade, onComments, onShowReactions, onCountChange, privateGroup = false, repostSourceId, viewerRepostId, repostCount = 0, canRepost = false, signedIn = false, onRepost }: {
  repostSourceId?: string; viewerRepostId?: string | null; repostCount?: number; canRepost?: boolean; signedIn?: boolean; onRepost?: () => void;
  postId: string; content: string; initialReaction?: string | null; initialCounts?: ReactionCounts; initialCount: number; commentCount: number;
  canReact: boolean; onRequireUpgrade: () => void; onComments: () => void; onShowReactions: () => void; onCountChange: (count: number) => void; privateGroup?: boolean;
}) {
  const [reaction, setReaction] = useState<ReactionType | null>(isReaction(initialReaction) ? initialReaction : null);
  const [counts, setCounts] = useState<ReactionCounts>(initialCounts ?? (initialCount ? { LIKE: initialCount } : {}));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [shareOpen, setShareOpen] = useState(false);
  const [shareStatus, setShareStatus] = useState("");
  const [myRepostId, setMyRepostId] = useState(viewerRepostId || null);
  const [reposts, setReposts] = useState(repostCount);
  const [reposting, setReposting] = useState(false);
  const repostPending = useRef(false);
  const [repostText, setRepostText] = useState("");
  async function repost() {
    if (repostPending.current || !signedIn) return;
    repostPending.current = true; setReposting(true); setShareStatus("");
    try {
      const response = await fetch(`/api/feed/${repostSourceId || postId}/repost`, {
        method: myRepostId ? "DELETE" : "POST", headers: { "Content-Type": "application/json" },
        ...(myRepostId ? {} : { body: JSON.stringify({ content: repostText }) }),
      });
      const data = await response.json();
      if (!response.ok) throw Error(data.error || "Couldn’t repost. Please try again.");
      setReposts(n => Math.max(0, n + (myRepostId ? -1 : 1)));
      setShareStatus(myRepostId ? "Your repost was removed." : "Reposted to your feed.");
      setMyRepostId(myRepostId ? null : data.id);
      setRepostText("");
      onRepost?.();
    } catch (e) { setShareStatus(e instanceof Error ? e.message : "Couldn’t repost. Please try again."); }
    finally { repostPending.current = false; setReposting(false); }
  }


  const [peopleOpen, setPeopleOpen] = useState(false);
  const [people, setPeople] = useState<{ id: string; reaction?: string; user: { name: string } }[]>([]);
  const [peopleLoading, setPeopleLoading] = useState(false);
  const [peopleError, setPeopleError] = useState(false);
  const peopleLoaded = useRef(false);
  const peoplePending = useRef(false);
  const hoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pending = useRef(false);
  const picker = useRef<HTMLDetailsElement>(null);
  const dialog = useRef<HTMLDialogElement>(null);

  const total = Object.values(counts).reduce((sum, count) => sum + (count ?? 0), 0);
  const selected = REACTIONS.find(item => item.type === reaction);
  const top = REACTIONS.filter(item => (counts[item.type] ?? 0) > 0).sort((a,b) => (counts[b.type] ?? 0) - (counts[a.type] ?? 0));

  useEffect(() => {
    if (!shareOpen) return;
    const element = dialog.current;
    element?.showModal();
    return () => { element?.close(); };
  }, [shareOpen]);

  useEffect(() => () => { if (hoverTimer.current) clearTimeout(hoverTimer.current); }, []);
  const openPicker = () => {
    if (hoverTimer.current) clearTimeout(hoverTimer.current);
    if (picker.current) picker.current.open = true;
  };
  const closePicker = () => {
    if (hoverTimer.current) clearTimeout(hoverTimer.current);
    hoverTimer.current = setTimeout(() => { if (picker.current) picker.current.open = false; }, 180);
  };
  const showPeople = async () => {
    setPeopleOpen(true);
    if (peopleLoaded.current || peoplePending.current) return;
    peoplePending.current = true; setPeopleLoading(true); setPeopleError(false);
    try {
      const response = await fetch(`/api/feed/${postId}/like`);
      if (!response.ok) throw new Error("Unable to load reactions");
      const data = await response.json();
      setPeople(Array.isArray(data.likes) ? data.likes.slice(0, 6) : []);
      peopleLoaded.current = true;
    } catch { setPeopleError(true); }
    finally { peoplePending.current = false; setPeopleLoading(false); }
  };

  const react = async (type: ReactionType) => {
    if (picker.current) picker.current.open = false;
    if (!canReact) { onRequireUpgrade(); return; }
    if (pending.current) return;
    pending.current = true; setBusy(true); setError("");
    try {
      const response = await fetch(`/api/feed/${postId}/like`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ reaction: reaction === type ? null : type }) });
      const data = await response.json();
      if (!response.ok) throw new Error("Reaction failed");
      setReaction(isReaction(data.reaction) ? data.reaction : null);
      setCounts(data.reactionCounts ?? {});
      onCountChange(data.totalCount ?? 0);
      peopleLoaded.current = false;
    } catch { setError("Your reaction wasn’t saved. Please try again."); }
    finally { pending.current = false; setBusy(false); }
  };
  const openShare = () => { setShareStatus(""); setShareOpen(true); };
  return <>
    {(total > 0 || commentCount > 0 || reposts > 0) && <div className="feed-reaction-stats">
      {total > 0 && <div className="feed-people-hover" onMouseEnter={showPeople} onMouseLeave={() => setPeopleOpen(false)} onFocus={showPeople} onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setPeopleOpen(false); }} onKeyDown={event => { if (event.key === "Escape") setPeopleOpen(false); }}>
        <button type="button" className="feed-reaction-summary" onClick={onShowReactions} aria-describedby={peopleOpen ? `reaction-people-${postId}` : undefined} aria-label={`${total} reactions. View who reacted.`}>
          {top.slice(0,3).map(item => <span key={item.type} aria-hidden="true"><ReactionIcon type={item.type} active size={20} /></span>)}<strong>{total}</strong>
        </button>
        {peopleOpen && <div className="feed-people-tooltip" id={`reaction-people-${postId}`} role="tooltip">
          <h3>People who reacted</h3>
          {peopleLoading ? <p>Loading reactions…</p> : peopleError ? <p>Couldn’t load names. Click to try the full list.</p> : <><ul>{people.map(person => <li key={person.id}><span aria-label={REACTIONS.find(item => item.type === person.reaction)?.label ?? "Like"}><ReactionIcon type={isReaction(person.reaction) ? person.reaction : "LIKE"} active size={20} /></span>{person.user.name}</li>)}</ul>{total > people.length && <p>And {total - people.length} more · click to view all</p>}</>}
        </div>}
      </div>}
      {commentCount > 0 && <button type="button" className="feed-comment-total" onClick={onComments}>{commentCount} comment{commentCount === 1 ? "" : "s"}</button>}
      {reposts > 0 && <span className="feed-comment-total">{reposts} repost{reposts === 1 ? "" : "s"}</span>}
    </div>}
    <div className="feed-social-bar">
      <div className="feed-social-actions">
        <div className="feed-reaction-control" onMouseEnter={openPicker} onMouseLeave={closePicker}>
          <button type="button" onClick={() => react(reaction ?? "LIKE")} disabled={busy} aria-pressed={!!reaction} aria-label={selected ? `Remove ${selected.label} reaction` : "Like post"} className={reaction ? "is-reacted" : ""}><ReactionIcon type={reaction ?? "LIKE"} active={!!reaction} size={23} /><span>{selected?.label ?? "Like"}</span></button>
          <details ref={picker} className="feed-reaction-picker" onKeyDown={event => { if (event.key === "Escape" && picker.current) picker.current.open = false; }}>
            <summary aria-label="Choose a reaction"><ArrowDown01Icon size={14} /></summary>
            <div className="feed-reaction-options" role="group" aria-label="Post reactions">{REACTIONS.map(item => <button key={item.type} type="button" title={item.label} aria-label={item.label} aria-pressed={reaction === item.type} disabled={busy} onClick={() => react(item.type)}><span aria-hidden="true"><ReactionIcon type={item.type} active={reaction === item.type} size={28} /></span><small>{item.label}</small></button>)}</div>
          </details>
        </div>
        <button type="button" onClick={onComments} aria-label={`${commentCount} comments`}><FeedIcon name="message" size={23} /><span>Comment</span></button>
        {(canRepost || myRepostId) && !privateGroup && <button type="button" onClick={openShare} aria-label={myRepostId ? "Manage repost" : "Repost post"} aria-pressed={!!myRepostId}><RepeatIcon size={23} /><span>{myRepostId ? "Reposted" : "Repost"}</span></button>}
      </div>
    </div>
    {error && <p className="feed-action-error" role="alert">{error}</p>}
    {shareOpen && <dialog ref={dialog} className="feed-share-dialog feed-repost-dialog" aria-labelledby={`repost-title-${postId}`} onCancel={() => setShareOpen(false)} onClick={event => { if (event.target === event.currentTarget) setShareOpen(false); }}>
      <div className="feed-share-content">
        <header><h2 id={`repost-title-${postId}`}>{myRepostId ? "Your repost" : "Repost to your feed"}</h2><button type="button" aria-label="Close repost dialog" onClick={() => setShareOpen(false)}><Cancel01Icon size={22} /></button></header>
        <p className="feed-repost-intro">{myRepostId ? "This conversation is on your feed." : "Bring this conversation to your community."}</p>
        <section className="feed-repost-compose" aria-label="Repost options">
          {signedIn ? <>
            {!myRepostId && <><label htmlFor={`repost-caption-${postId}`}>Add your thoughts <span>(optional)</span></label><textarea autoFocus disabled={reposting} id={`repost-caption-${postId}`} maxLength={3000} rows={3} value={repostText} onChange={e => setRepostText(e.target.value)} placeholder="What would you like to add?" /><small className="feed-repost-counter">{repostText.length.toLocaleString()} / 3,000</small></>}
            <blockquote className="feed-repost-preview"><span>Original post</span><p>{content ? content.slice(0, 240) + (content.length > 240 ? "…" : "") : "A media post from your community"}</p></blockquote>
            {shareStatus && <p role="status" className="feed-repost-status">{shareStatus}</p>}
            <div className="feed-repost-footer"><button type="button" className="feed-repost-cancel" onClick={() => setShareOpen(false)}>Close</button><button type="button" disabled={reposting} onClick={repost}><RepeatIcon size={18} />{reposting ? "Saving…" : myRepostId ? "Remove repost" : "Repost"}</button></div>
            {myRepostId && <Link href={`/feed?post=${myRepostId}`} onClick={() => setShareOpen(false)}>View your repost →</Link>}
          </> : <Link href={`/login?redirect=${encodeURIComponent(`/feed?post=${postId}`)}`}>Sign in to repost</Link>}
        </section>
      </div>
    </dialog>}

  </>;
}

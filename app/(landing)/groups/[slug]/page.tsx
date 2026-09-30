"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useAppSelector } from "@/store/hooks";
import {
  ArrowLeft01Icon, UserGroupIcon, Message01Icon, LockIcon, GlobeIcon,
  MailSend01Icon, ThumbsUpIcon, Clock01Icon, Tick02Icon, UserCircleIcon,
  Loading03Icon as Loader2, ArrowRight01Icon, Add01Icon,
} from "hugeicons-react";
import { GroupDetailSkeleton, GroupPostSkeleton } from "@/components/groups/GroupSkeletons";
import { GroupsSidebar, type GroupSummary } from "@/components/groups/GroupsSidebar";
import { GroupMembers } from "@/components/groups/GroupMembers";
import "@/components/groups/groups-social.css";
import { GroupPostContent } from "@/components/groups/GroupPostContent";
import { GroupComments } from "@/components/groups/GroupComments";
import { GroupEmptyState } from "@/components/groups/GroupEmptyState";
import GroupSettingsPanel from "@/components/groups/GroupSettingsPanel";
import "@/components/groups/groups.css";
import "@/components/groups/group-detail.css";

interface CommunityDetail {
  id: string; name: string; slug: string; description: string;
  icon: string | null; coverImage: string | null; isPublic: boolean; memberCount: number; createdAt: string;
  isMember: boolean; canManage: boolean;
  creator: { id: string; name: string; image: string | null };
  _count: { members: number; posts: number };
  members: { user: { id: string; name: string; image: string | null } }[];
}

interface Post {
  id: string; content: string; createdAt: string; isLiked?: boolean;
  author: { id: string; name: string; image: string | null; headline: string | null };
  _count: { comments: number; likes: number };
}

function Avatar({ name, src, size = 40 }: { name: string; src?: string | null; size?: number }) {
  return <span className="gd-avatar" style={{ width: size, height: size }}>{src ? <Image src={src} alt="" width={size} height={size} unoptimized /> : name.slice(0, 1).toUpperCase()}</span>;
}

function timeAgo(date: string) {
  const s = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s/60)}m ago`;
  if (s < 86400) return `${Math.floor(s/3600)}h ago`;
  return `${Math.floor(s/86400)}d ago`;
}

export default function CommunityDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  return <GroupDetail key={slug} slug={slug} />;
}

function GroupDetail({ slug }: { slug: string }) {
  const user     = useAppSelector(s => s.auth.user);

  const [community,    setCommunity]    = useState<CommunityDetail | null>(null);
  const [posts,        setPosts]        = useState<Post[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [postsLoading, setPostsLoading] = useState(true);
  const [isNotFound,   setIsNotFound]  = useState(false);
  const [isMember,     setIsMember]     = useState(false);
  const [joining,      setJoining]      = useState(false);
  const [leaving,      setLeaving]      = useState(false);
  const [draft,        setDraft]        = useState("");
  const [posting,      setPosting]      = useState(false);
  const [activeTab,    setActiveTab]    = useState<"posts"|"members"|"about"|"settings">("posts");
  const [likedPosts,   setLikedPosts]   = useState<Record<string, boolean>>({});
  const [actionError, setActionError] = useState("");
  const [postsError, setPostsError] = useState(false);
  const [retry, setRetry] = useState(0);
  const [sidebarGroups, setSidebarGroups] = useState<GroupSummary[]>([]);
  const [postSearch, setPostSearch] = useState("");
  const [shareMessage, setShareMessage] = useState("");
  const likeRequests = useRef(new Set<string>());
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/communities", { signal: controller.signal }).then(r => r.ok ? r.json() : []).then(setSidebarGroups).catch(() => {});
    return () => controller.abort();
  }, []);

  useEffect(() => {
    window.scrollTo(0, 0);
    fetch(`/api/communities/${slug}`)
      .then(r => { if (!r.ok) { setIsNotFound(true); return null; } return r.json(); })
      .then((data: CommunityDetail | null) => {
        if (data) { setCommunity(data); setIsMember(data.isMember); }
      })
      .catch(() => setIsNotFound(true))
      .finally(() => setLoading(false));
  }, [slug]);

  useEffect(() => {
    fetch(`/api/communities/${slug}/posts`)
      .then(r => { if (!r.ok) throw new Error("Unable to load discussions"); return r.json(); })
      .then(data => { const items: Post[] = Array.isArray(data) ? data : []; setPosts(items); setLikedPosts(Object.fromEntries(items.map(post => [post.id, !!post.isLiked]))); if (window.location.hash.startsWith("#post-")) requestAnimationFrame(() => document.getElementById(window.location.hash.slice(1))?.scrollIntoView()); })
      .catch(() => setPostsError(true))
      .finally(() => setPostsLoading(false));
  }, [slug, retry]);

  const handleJoin = async () => {
    if (!user) { window.location.href = `/login?redirect=/groups/${slug}`; return; }
    setActionError("");
    setJoining(true);
    try {
      const res = await fetch("/api/communities/join", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ communityId: community?.id }),
      });
      if (res.ok || res.status === 409) {
        setIsMember(true);
        if (res.ok) setCommunity(c => c ? { ...c, memberCount: c.memberCount + 1 } : c);
      }
      else setActionError("We couldn’t join this group. Please try again.");
    } catch { setActionError("We couldn’t join this group. Please try again."); } finally { setJoining(false); }
  };

  const handleLeave = async () => {
    if (!user || !community) return;
    setActionError("");
    setLeaving(true);
    try {
      const res = await fetch("/api/communities/join", {
        method: "DELETE", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ communityId: community.id }),
      });
      if (res.ok) {
        setIsMember(false);
        setCommunity(c => c ? { ...c, memberCount: Math.max(0, c.memberCount - 1) } : c);
      }
      else setActionError("We couldn’t leave this group. Please try again.");
    } catch { setActionError("We couldn’t leave this group. Please try again."); } finally { setLeaving(false); }
  };

  const handlePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft.trim() || posting) return;
    setActionError("");
    setPosting(true);
    try {
      const res = await fetch(`/api/communities/${slug}/posts`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: draft }),
      });
      if (res.ok) {
        const newPost = await res.json();
        setPosts(prev => [newPost, ...prev]);
        setDraft("");
        setCommunity(c => c ? { ...c, _count: { ...c._count, posts: c._count.posts + 1 } } : c);
      }
      else setActionError("Your post wasn’t published. Your draft is saved here—please try again.");
    } catch { setActionError("Your post wasn’t published. Please try again."); } finally { setPosting(false); }
  };

  const handleLike = async (postId: string) => {
    if (!user || !isMember || likeRequests.current.has(postId)) return;
    likeRequests.current.add(postId);
    const wasLiked = !!likedPosts[postId];
    setActionError("");
    try {
      const response = await fetch(`/api/feed/${postId}/like`, { method: "POST" });
      if (!response.ok) throw new Error();
      const data = await response.json();
      setLikedPosts(p => ({ ...p, [postId]: data.liked }));
      setPosts(items => items.map(p => p.id === postId ? { ...p, _count: { ...p._count, likes: Math.max(0, p._count.likes + (data.liked === wasLiked ? 0 : data.liked ? 1 : -1)) } } : p));
    } catch { setActionError("Couldn’t update your reaction. Please try again."); }
    finally { likeRequests.current.delete(postId); }
  };

  if (loading) return <GroupDetailSkeleton />;

  if (isNotFound || !community) {
    notFound();
  }

  const isEmoji = community.icon && community.icon.length <= 4;
  function startDiscussion(text = "") {
    setActiveTab("posts");
    if (text && !draft.trim()) setDraft(text);
    requestAnimationFrame(() => { textareaRef.current?.focus(); textareaRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }); });
  }

  return (
    <div className="gp-page gd-page gf-shell">
      <GroupsSidebar groups={sidebarGroups} userId={user?.id} canCreate={user?.role === "ADMIN"}>
        <div className="gf-current-group"><strong>{community.name}</strong><p>{community.isPublic ? "Public" : "Private"} group · {community.memberCount} members</p></div>
        <nav aria-label="This group"><button aria-current={activeTab === "posts" ? "page" : undefined} onClick={() => setActiveTab("posts")}><Message01Icon size={21} />Group home</button><button aria-current={activeTab === "members" ? "page" : undefined} onClick={() => setActiveTab("members")}><UserGroupIcon size={21} />People</button><button aria-current={activeTab === "about" ? "page" : undefined} onClick={() => setActiveTab("about")}><GlobeIcon size={21} />About this group</button>{community.canManage && <button aria-current={activeTab === "settings" ? "page" : undefined} onClick={() => setActiveTab("settings")}><UserCircleIcon size={21} />Group settings</button>}</nav>
      </GroupsSidebar>
      <div className="gf-group-content">
        <Link href="/groups" className="gp-back"><ArrowLeft01Icon size={17} /> All groups</Link>
        <header className="gd-hero">
          <div className="gd-cover">
            {community.coverImage ? <Image src={community.coverImage} alt="" fill unoptimized sizes="(max-width:1440px) 100vw, 1344px" /> : <div className="gd-cover-art"><UserGroupIcon size={90} /><span>A place for your people.</span></div>}
            {community.canManage && <button className="gd-edit-cover" onClick={() => { setActiveTab("settings"); requestAnimationFrame(() => document.getElementById("group-cover")?.focus()); }}>Edit cover photo</button>}
            <span className="gd-visibility">{community.isPublic ? <GlobeIcon size={14} /> : <LockIcon size={14} />}{community.isPublic ? "Public group" : "Private group"}</span>
          </div>
          <div className="gd-identity">
            <div className="gd-group-icon">{isEmoji ? <span>{community.icon}</span> : community.icon ? <Image src={community.icon} alt="" width={76} height={76} unoptimized /> : <UserGroupIcon size={34} />}</div>
            <div className="gd-identity-copy"><span className="gp-eyebrow">SHARED INTERESTS. REAL CONNECTIONS.</span><h1>{community.name}</h1><p>{community.description}</p>
              <div className="gd-meta"><span><UserGroupIcon size={15} />{community.memberCount.toLocaleString()} {community.memberCount === 1 ? "member" : "members"}</span><span><Message01Icon size={15} />{community._count.posts} {community._count.posts === 1 ? "discussion" : "discussions"}</span>{isMember && <span className="gd-member"><Tick02Icon size={15} />You’re a member</span>}</div>
              <div className="gf-member-stack" aria-label="Some group members">{community.members.slice(0, 8).map(({ user: member }) => <Avatar key={member.id} name={member.name} src={member.image} size={30} />)}</div>
            </div>
            <div className="gd-actions"><button className="gd-secondary" onClick={async () => { try { await navigator.clipboard.writeText(`${window.location.origin}/groups/${community.slug}`); setShareMessage("Group link copied. Share it with the people you’d like to invite."); } catch { setShareMessage("Couldn’t copy the link. You can copy this page’s URL from your browser."); } }}>Share group</button>{isMember ? <><button className="gp-join" onClick={() => startDiscussion()}><Add01Icon size={17} />Start a discussion</button><button className="gd-leave" onClick={handleLeave} disabled={leaving}>{leaving ? "Leaving…" : "Leave group"}</button></> : <button className="gp-join" onClick={handleJoin} disabled={joining}><UserGroupIcon size={17} />{joining ? "Joining…" : "Join group"}</button>}</div>
          </div>
        </header>
        {shareMessage && <p role="status" className="gf-notice">{shareMessage}</p>}
        {actionError && <div className="gp-form-error" role="alert">{actionError}</div>}
        <nav className="gd-tabs" aria-label="Group sections">
          {([{ id: "posts", label: "Discussions", Icon: Message01Icon }, { id: "members", label: "Members", Icon: UserGroupIcon }, { id: "about", label: "About", Icon: GlobeIcon }] as const).map(({ id, label, Icon }) => <button key={id} aria-pressed={activeTab === id} onClick={() => setActiveTab(id)}><Icon size={17} />{label}{id === "members" && <span>{community.memberCount}</span>}</button>)}
          {community.canManage && <button aria-pressed={activeTab === "settings"} onClick={() => setActiveTab("settings")}>Settings</button>}
        </nav>
        <div className="gd-layout">
          <section className="gd-main" aria-label={activeTab === "posts" ? "Group discussions" : activeTab === "members" ? "Group members" : activeTab === "settings" ? "Group settings" : "About the group"}>
            {activeTab === "settings" && community.canManage && <GroupSettingsPanel group={community} onSaved={value => setCommunity(current => current ? { ...current, name: value.name, description: value.description, coverImage: value.coverImage } : current)} onCancel={() => setActiveTab("posts")} />}
            {activeTab === "posts" && <>
              {isMember ? <form onSubmit={handlePost} className="gd-panel gd-composer">
                <div className="gd-panel-heading"><Avatar name={user?.name || "Member"} src={user?.image} /><div><h2>What’s on your mind?</h2><p>Ask a question, share a thought, or introduce yourself.</p></div></div>
                <label className="sr-only" htmlFor="group-discussion">Write a discussion</label>
                <textarea id="group-discussion" ref={textareaRef} value={draft} onChange={e => setDraft(e.target.value)} rows={3} placeholder={"Share something with " + community.name + "…"} />
                <footer><span>Posting to this group</span><button type="submit" className="gp-join" disabled={posting || !draft.trim()}>{posting ? <Loader2 size={17} className="animate-spin" /> : <MailSend01Icon size={17} />}{posting ? "Publishing…" : "Publish post"}</button></footer>
              </form> : <div className="gd-panel gd-join-prompt"><UserCircleIcon size={36} /><div><h2>Be part of the conversation.</h2><p>Join the group to share ideas and connect with its members.</p></div><button className="gp-join" disabled={joining} onClick={handleJoin}>{joining ? "Joining…" : "Join group"}</button></div>}
              <div className="gd-section-heading"><h2>Discussions</h2><label className="gf-search gf-discussion-search"><input aria-label="Search recent discussions" placeholder="Search recent discussions…" value={postSearch} onChange={e => setPostSearch(e.target.value)} /></label></div>
              {postsLoading ? <div role="status" aria-busy="true" className="gd-main"><span className="sr-only">Loading discussions…</span><GroupPostSkeleton /><GroupPostSkeleton /></div> : postsError ? <GroupEmptyState kind="feed" title="Let’s try that again" description="We couldn’t load the discussions. Please try again."><button className="gp-join" onClick={() => { setPostsError(false); setPostsLoading(true); setRetry(v => v + 1); }}>Try again</button></GroupEmptyState> : posts.length === 0 ? <GroupEmptyState kind="feed" title="A good conversation starts with you" description="Introduce yourself, ask a question, or share something you’ve learned. Give your group a place to begin.">
                {isMember ? <div className="gd-starters"><button onClick={() => startDiscussion("Hi everyone! I’m ")}>Introduce yourself <ArrowRight01Icon size={15} /></button><button onClick={() => startDiscussion("I’d love your thoughts on ")}>Ask a question <ArrowRight01Icon size={15} /></button></div> : <button className="gp-join" disabled={joining} onClick={handleJoin}>Join the conversation</button>}
              </GroupEmptyState> : posts.filter(post => `${post.content} ${post.author.name}`.toLowerCase().includes(postSearch.toLowerCase())).map(post => <article id={`post-${post.id}`} key={post.id} className="gd-panel gd-post">
                <header><Avatar name={post.author.name} src={post.author.image} /><div><strong>{post.author.name}</strong>{post.author.headline && <p>{post.author.headline}</p>}<time dateTime={post.createdAt}><Clock01Icon size={12} />{timeAgo(post.createdAt)}</time></div></header>
                <GroupPostContent postId={post.id} content={post.content} canEdit={post.author.id === user?.id} canDelete={post.author.id === user?.id || community.canManage || user?.role === "ADMIN"} onSaved={content => setPosts(items => items.map(p => p.id === post.id ? { ...p, content } : p))} onDeleted={() => { setPosts(items => items.filter(p => p.id !== post.id)); setCommunity(c => c ? { ...c, _count: { ...c._count, posts: Math.max(0, c._count.posts - 1) } } : c); }} />
                <GroupComments likeAction={<button disabled={!isMember} aria-pressed={!!likedPosts[post.id]} onClick={() => handleLike(post.id)}><ThumbsUpIcon size={17} />{post._count.likes} {post._count.likes === 1 ? "like" : "likes"}</button>} postId={post.id} count={post._count.comments} canPost={isMember} onAdded={() => setPosts(items => items.map(p => p.id === post.id ? { ...p, _count: { ...p._count, comments: p._count.comments + 1 } } : p))} />
              </article>)}
              {!postsLoading && posts.length > 0 && !posts.some(post => `${post.content} ${post.author.name}`.toLowerCase().includes(postSearch.toLowerCase())) && <GroupEmptyState kind="search" title="No matching discussions" description="Try another word or clear your search to see recent discussions."><button className="gp-join" onClick={() => setPostSearch("")}>Clear search</button></GroupEmptyState>}
            </>}
            {activeTab === "members" && <GroupMembers slug={community.slug} creatorId={community.creator.id} />}
            {activeTab === "about" && <div className="gd-panel gd-about"><span className="gp-eyebrow">GET TO KNOW YOUR GROUP</span><h2>About {community.name}</h2><p>{community.description}</p><dl><div><dt>Hosted by</dt><dd>{community.creator.name}</dd></div><div><dt>Visibility</dt><dd>{community.isPublic ? "Public group" : "Private group"}</dd></div><div><dt>Created</dt><dd>{new Date(community.createdAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</dd></div></dl></div>}
          </section>
          <aside className="gd-sidebar">
            <section className="gd-panel"><span className="gp-eyebrow">ABOUT THIS GROUP</span><h2>A shared place to grow.</h2><p className="gd-about-snippet">{community.description}</p><div className="gd-host"><Avatar name={community.creator.name} src={community.creator.image} /><div><span>Hosted by</span><strong>{community.creator.name}</strong></div></div><button className="gd-text-button" onClick={() => setActiveTab("about")}>More about this group <ArrowRight01Icon size={16} /></button></section>
            <section className="gd-panel"><div className="gd-section-heading"><h2>Your people</h2><UserGroupIcon size={20} /></div><div className="gd-member-preview">{community.members.slice(0, 4).map(({ user: member }) => <div key={member.id}><Avatar name={member.name} src={member.image} size={34} /><span>{member.name}</span>{member.id === community.creator.id && <small>Host</small>}</div>)}</div><button className="gd-text-button" onClick={() => setActiveTab("members")}>Meet the members <ArrowRight01Icon size={16} /></button></section>
          </aside>
        </div>
      </div>
    </div>
  );
}

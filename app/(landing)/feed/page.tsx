"use client";

import { Fragment, useEffect, useState, useCallback, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";

import FirstPostCelebration from "@/components/feed/FirstPostCelebration";
import PostComposer from "@/components/feed/PostComposer";
import PostCard, { type FeedPost } from "@/components/feed/PostCard";
import FeedLeftPanel from "@/components/feed/FeedLeftPanel";
import FeedRightPanel from "@/components/feed/FeedRightPanel";
import ScheduledPostsPanel from "@/components/feed/ScheduledPostsPanel";
import { PostSkeleton, LeftPanelSkeleton, ComposerSkeleton } from "@/components/feed/FeedSkeletons";
import { RefreshIcon as RefreshCw, ComputerVideoIcon as MonitorPlay, ArrowUpRight01Icon as ExternalLink, SparklesIcon as Sparkles, Cancel01Icon as X } from "hugeicons-react";
import Link from "next/link";
import "@/components/feed/feed.css";
import "@/components/feed/social-feed.css";
import { NoteEditIcon } from "hugeicons-react";
import { useAppSelector, useAppDispatch } from "@/store/hooks";
import { setUser } from "@/store/slices/authSlice";

function FeedContent() {
  const searchParams = useSearchParams();
  const dispatch = useAppDispatch();
  const sharedPost = searchParams.get("post");
  const requestedFilter = searchParams.get("filter");
  const feedFilter = requestedFilter === "connections" || requestedFilter === "following" ? requestedFilter : "all";
  const isWelcome = searchParams.get("welcome") === "1" || searchParams.get("registered") === "1" || searchParams.get("upgraded") === "1";
  const [celebrateFirstPost, setCelebrateFirstPost] = useState(false);
  const closeCelebration = useCallback(() => setCelebrateFirstPost(false), []);
  const [showWelcomeBanner, setShowWelcomeBanner] = useState(isWelcome);
  const user = useAppSelector(s => s.auth.user);
  const [posts, setPosts]             = useState<FeedPost[]>([]);
  const [loading, setLoading]         = useState(true);
  const [feedError, setFeedError] = useState("");
  const [loadingMore, setLoadingMore] = useState(false);
  const [moreError, setMoreError] = useState("");
  const moreRequest = useRef<AbortController | null>(null);
  const [nextCursor, setNextCursor]   = useState<string | null>(null);
  const [hasNew, setHasNew]           = useState(false);
  const [centerAds, setCenterAds]     = useState<{id:string;title:string;description:string|null;imageUrl:string;linkUrl:string;user:{name:string}}[]>([]);

  // Always re-sync fresh user profile from DB on feed mount to avoid stale tier cache
  useEffect(() => {
    fetch("/api/user/me", { cache: "no-store", headers: { "Cache-Control": "no-cache, no-store" } })
      .then(r => r.ok ? r.json() : null)
      .then(u => {
        if (u?.id) {
          dispatch(setUser({
            id: u.id, email: u.email, name: u.name,
            role: u.role ?? "MEMBER", tier: u.tier ?? "FREE",
            image: u.image ?? null, coverImage: u.coverImage ?? null,
            bio: u.bio ?? null, headline: u.headline ?? null,
            hasDueDiligenceBadge: u.hasDueDiligenceBadge ?? false,
          }));
        }
      })
      .catch(() => {});
  }, [dispatch]);

  // Handle Stripe checkout return with session_id
  useEffect(() => {
    const sessionId = searchParams.get("session_id");
    if (!sessionId) return;

    window.history.replaceState({}, "", "/feed");

    fetch("/api/stripe/verify-session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId }),
    })
      .then(r => r.json())
      .then((data: { tier?: string }) => {
        if (data.tier && data.tier !== "FREE") {
          setShowWelcomeBanner(true);
          fetch("/api/user/me", { cache: "no-store", headers: { "Cache-Control": "no-cache, no-store" } })
            .then(r => r.ok ? r.json() : null)
            .then(u => {
              if (u?.id) {
                dispatch(setUser({
                  id: u.id, email: u.email, name: u.name,
                  role: u.role ?? "MEMBER", tier: u.tier ?? "FREE",
                  image: u.image ?? null, coverImage: u.coverImage ?? null,
                  bio: u.bio ?? null, headline: u.headline ?? null,
                  hasDueDiligenceBadge: u.hasDueDiligenceBadge ?? false,
                }));
              }
            });
        }
      })
      .catch(() => {});
  }, [searchParams, dispatch]);
  const [scheduleRefreshKey, setScheduleRefreshKey] = useState(0);
  const loaderRef    = useRef<HTMLDivElement>(null);
  const pollingRef   = useRef<NodeJS.Timeout | null>(null);
  const latestIdRef  = useRef<string | null>(null);
  const currentRequest = useRef<AbortController | null>(null);

  const fetchFeed = useCallback(async (cursor?: string, signal?: AbortSignal) => {
    const params = new URLSearchParams(sharedPost ? { post: sharedPost } : { filter: feedFilter });
    if (cursor && !sharedPost) params.set("cursor", cursor);
    const url = `/api/feed?${params}`;
    const res = await fetch(url, { signal });
    if (!res.ok) throw new Error("Feed unavailable");
    const data = await res.json() as { posts?: FeedPost[]; nextCursor?: string | null };
    return {
      posts: Array.isArray(data.posts) ? data.posts : [],
      nextCursor: data.nextCursor ?? null,
    };
  }, [sharedPost, feedFilter]);

  // Initial load
  useEffect(() => {
    window.scrollTo(0, 0);
    let active = true;
    moreRequest.current?.abort(); moreRequest.current = null;
    currentRequest.current?.abort();
    const controller = new AbortController();
    currentRequest.current = controller;
    latestIdRef.current = null;
    fetchFeed(undefined, controller.signal)
      .then(({ posts: p, nextCursor: nc }) => {
        if (!active) return;
        setFeedError("");
        setPosts(p);
        setNextCursor(nc);
        if (p[0]) latestIdRef.current = p[0].id;
      })
      .catch(() => { if (active) setFeedError("We couldn’t load your feed. Please try again."); })
      .finally(() => { if (active) setLoading(false); });
    // Fetch center column ads
    fetch("/api/pro-ads/active?placement=CENTER_COLUMN")
      .then(r => r.json()).then(d => setCenterAds(Array.isArray(d) ? d : []))
      .catch(() => {});
    return () => { active = false; controller.abort(); };
  }, [fetchFeed]);

  // Poll every 30s for new posts
  useEffect(() => {
    let active = true;
    pollingRef.current = setInterval(async () => {
      try {
        const { posts: fresh } = await fetchFeed();
        if (active && fresh[0] && fresh[0].id !== latestIdRef.current) setHasNew(true);
      } catch { /* ignore */ }
    }, 30_000);
    return () => { active = false; if (pollingRef.current) clearInterval(pollingRef.current); };
  }, [fetchFeed]);

  const refreshFeed = async () => {
    currentRequest.current?.abort();
    const controller = new AbortController();
    currentRequest.current = controller;
    moreRequest.current?.abort();
    moreRequest.current = null;
    setLoadingMore(false);
    setMoreError("");
    setHasNew(false);
    setLoading(true);
    setFeedError("");
    try {
      const { posts: p, nextCursor: nc } = await fetchFeed(undefined, controller.signal);
      if (controller.signal.aborted) return;
      setPosts(p);
      setNextCursor(nc);
      if (p[0]) latestIdRef.current = p[0].id;
    } catch { if (!controller.signal.aborted) setFeedError("We couldn’t load your feed. Please try again."); }
    finally { if (!controller.signal.aborted) setLoading(false); }
  };

  const loadMore = useCallback(async () => {
    if (!nextCursor || loading || sharedPost || moreRequest.current) return;
    const controller = new AbortController();
    moreRequest.current = controller;
    setLoadingMore(true);
    setMoreError("");
    try {
      const { posts: more, nextCursor: nc } = await fetchFeed(nextCursor, controller.signal);
      if (controller.signal.aborted) return;
      setPosts(previous => {
        const existing = new Set(previous.map(post => post.id));
        return [...previous, ...more.filter(post => !existing.has(post.id))];
      });
      setNextCursor(nc);
    } catch {
      if (!controller.signal.aborted) setMoreError("We couldn’t load more posts. Please try again.");
    } finally {
      if (moreRequest.current === controller) {
        moreRequest.current = null;
        setLoadingMore(false);
      }
    }
  }, [fetchFeed, nextCursor, loading, sharedPost]);

  useEffect(() => () => { moreRequest.current?.abort(); currentRequest.current?.abort(); }, []);

  useEffect(() => {
    if (!loaderRef.current || !nextCursor || loading || loadingMore || moreError || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) void loadMore();
    }, { rootMargin: "400px" });
    observer.observe(loaderRef.current);
    return () => observer.disconnect();
  }, [loadMore, nextCursor, loading, loadingMore, moreError]);

  const handlePostCreated = (post: FeedPost) => {
    if (!sharedPost && feedFilter === "all") {
      setPosts(prev => [post, ...prev]);
      latestIdRef.current = post.id;
    }
    if (post.isFirstPost) setCelebrateFirstPost(true);
  };

  const handlePostUpdate = (updated: FeedPost) =>
    setPosts(prev => prev.map(p => p.id === updated.id ? updated : p));

  const handlePostDelete = (id: string) =>
    setPosts(prev => prev.filter(p => p.id !== id));

  return (
    <>
        {celebrateFirstPost && <FirstPostCelebration onClose={closeCelebration} />}
        {/* Welcome Celebration Banner */}
        {showWelcomeBanner && (
          <div className="mb-6 bg-gradient-to-r from-amber-500 via-[#ffbe24] to-amber-600 rounded-3xl p-5 sm:p-6 text-[#0a1628] shadow-xl flex items-center justify-between gap-4 animate-in fade-in slide-in-from-top-4 duration-300">
            <div className="flex items-start sm:items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-[#0a1628] text-amber-400 flex items-center justify-center shrink-0 shadow-lg">
                <Sparkles className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-lg sm:text-xl font-black leading-tight">
                  Welcome to Tax Compliance Pro! 🎉
                </h2>
                <p className="text-xs sm:text-sm font-semibold opacity-90 mt-0.5 max-w-2xl">
                  Your membership is activated. You now have full access to professional tax feeds, due diligence toolkits, directory networking, and discussions.
                </p>
              </div>
            </div>
            <button
              aria-label="Dismiss welcome message"
              onClick={() => setShowWelcomeBanner(false)}
              className="p-2 rounded-xl bg-[#0a1628]/10 hover:bg-[#0a1628]/20 transition-all text-[#0a1628] shrink-0"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        )}

            {sharedPost && <Link className="feed-back" href="/feed">← Back to your feed</Link>}
            <nav className="feed-mobile-links" aria-label="Community shortcuts"><Link href="/connections">Connections</Link><Link href="/pro-networks">Pro Networks</Link><Link href="/pro-talks">Pro Talks</Link><Link href="/find-a-pro">Find a Pro</Link></nav>
            {!user && loading && <ComposerSkeleton />}
            {/* Post Composer starts showing immediately at top for logged-in users */}
            {user && <PostComposer onPostCreated={handlePostCreated} onScheduled={() => setScheduleRefreshKey(k => k + 1)} />}
            {!sharedPost && <nav className="feed-filter-tabs" aria-label="Filter feed posts">
              {([["all", "Discover"], ["connections", "Connections"], ["following", "Following"]] as const).map(([value,label]) =>
                <Link key={value} href={value === "all" ? "/feed" : `/feed?filter=${value}`} aria-current={feedFilter === value ? "page" : undefined}>{label}</Link>)}
              <button type="button" className="feed-refresh" onClick={refreshFeed} disabled={loading} aria-label="Refresh feed"><RefreshCw size={18} /></button>
            </nav>}

            {/* Scheduled posts snippet — only for logged-in users */}
            {user && !loading && <ScheduledPostsPanel refreshKey={scheduleRefreshKey} />}

            {/* New posts banner */}
            {hasNew && (
              <button onClick={refreshFeed}
                className="w-full flex items-center justify-center gap-2 bg-[#0a1628] text-white text-sm font-bold py-3 rounded-2xl hover:bg-[#1a3a6b] transition-all">
                <RefreshCw className="w-4 h-4" /> New posts — click to refresh
              </button>
            )}

            {/* Main feed list / skeleton */}
            {loading ? (
              <div className="space-y-4">
                <PostSkeleton />
                <PostSkeleton />
                <PostSkeleton />
              </div>
            ) : feedError ? (
              <div className="feed-empty" role="alert"><NoteEditIcon size={30} /><h2>{!user && feedFilter !== "all" ? "Sign in to personalize your feed" : "Your feed will be right back."}</h2><p>{!user && feedFilter !== "all" ? "See posts from your connections and people you follow." : feedError}</p>{!user && feedFilter !== "all" ? <Link href={`/login?redirect=${encodeURIComponent(`/feed?filter=${feedFilter}`)}`}>Sign in</Link> : <button onClick={refreshFeed}>Try again</button>}</div>
            ) : posts.length === 0 ? (
              <div className="feed-empty">
                <div className="w-16 h-16 rounded-2xl bg-amber-50 dark:bg-amber-400/10 border border-amber-200/80 dark:border-amber-400/20 flex items-center justify-center mb-4 text-[#ffbe24] dark:text-[#ffbe24] shadow-sm">
                  <NoteEditIcon className="w-8 h-8" />
                </div>
                <h3 className="font-black text-[#0a1628] dark:text-white text-xl mb-2">{sharedPost ? "This post isn’t available" : feedFilter === "all" ? "Start a conversation" : feedFilter === "connections" ? "No connection posts yet" : "No posts from people you follow yet"}</h3>
                <p className="text-slate-400 dark:text-slate-500 text-sm max-w-sm">{sharedPost ? "The post may have been removed, or you may need to sign in and join its group to view it." : feedFilter === "all" ? "Share an insight, ask a question, or find a group of professionals who share your interests." : "Discover professionals and follow or connect with them to see their posts here."}</p>
                {!sharedPost && feedFilter !== "all" && <Link href="/find-a-pro">Find people to follow</Link>}
              </div>
            ) : (
              <>
                {posts.map((post, idx) => {
                  const adIdx = Math.floor(idx / 5);
                  const showAd = idx > 0 && idx % 5 === 0 && centerAds.length > 0;
                  const ad = showAd ? centerAds[adIdx % centerAds.length] : null;
                  return (
                    <Fragment key={post.id}>
                      {ad && (
                        <div className="relative">
                          {/* Sponsored badge — above the card */}
                          <div className="flex items-center gap-1.5 mb-1.5 ml-1">
                            <MonitorPlay className="w-3 h-3 text-amber-500" />
                            <span className="text-[10px] font-black text-amber-600 uppercase tracking-widest">Sponsored</span>
                            <span className="text-[10px] text-slate-400 ml-auto mr-1">by {ad.user.name}</span>
                          </div>
                          {/* Banner card */}
                          <a href={ad.linkUrl} target="_blank" rel="noopener noreferrer"
                            className="block relative rounded-2xl overflow-hidden group shadow-sm hover:shadow-lg transition-all">
                            {/* Image */}
                            <div className="w-full aspect-[16/9] overflow-hidden">
                              <img src={ad.imageUrl} alt={ad.title} loading="lazy" decoding="async"
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                onError={e => { (e.target as HTMLImageElement).style.display="none"; }} />
                            </div>
                            {/* Hover overlay — title + desc slide up from bottom */}
                            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/50 to-transparent px-4 py-3
                              translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out">
                              <p className="font-bold text-white text-sm leading-tight">{ad.title}</p>
                              {ad.description && <p className="text-white/70 text-xs mt-0.5 line-clamp-1">{ad.description}</p>}
                              <span className="inline-flex items-center gap-1 text-amber-400 text-[10px] font-bold mt-1">
                                <ExternalLink className="w-3 h-3" /> Visit →
                              </span>
                            </div>
                          </a>
                        </div>
                      )}
                      <PostCard post={post} onUpdate={handlePostUpdate} onDelete={handlePostDelete} onRepost={() => setHasNew(true)} />
                    </Fragment>
                  );
                })}

                {nextCursor ? (
                  <div ref={loaderRef} className="feed-load-more" aria-busy={loadingMore}>
                    {loadingMore ? <div role="status" aria-label="Loading more posts"><PostSkeleton /></div> : <>
                      {moreError && <p role="alert">{moreError}</p>}
                      <button type="button" onClick={loadMore}>{moreError ? "Try again" : "Load more posts"}</button>
                    </>}
                  </div>
                ) : !sharedPost && (
                  <div className="feed-end" role="status"><Sparkles size={28} /><h2>You’re all caught up</h2><p>You’ve reached the end of your feed. Check back for new conversations.</p><button type="button" onClick={() => window.scrollTo({ top: 0, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" })}>Back to top</button></div>
                )}
              </>
            )}
    </>
  );
}

function FeedRoute() {
  const params = useSearchParams();
  return <FeedContent key={`${params.get("post") ?? "feed"}:${params.get("filter") ?? "all"}`} />;
}

export default function FeedPage() {
  const user = useAppSelector(state => state.auth.user);
  return (
    <div className="feed-page"><div className="feed-container"><div className="feed-layout">
      <aside className="feed-sidebar" aria-label="Your profile and navigation">{user ? <FeedLeftPanel /> : <LeftPanelSkeleton />}</aside>
      <div className="feed-center space-y-4">
        <Suspense fallback={<><ComposerSkeleton /><PostSkeleton /><PostSkeleton /></>}>
          <FeedRoute />
        </Suspense>
      </div>
      <aside className="feed-sidebar" aria-label="Community updates"><FeedRightPanel /></aside>
    </div></div></div>
  );
}

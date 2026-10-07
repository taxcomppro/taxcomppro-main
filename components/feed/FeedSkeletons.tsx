import "./feed.css";
import "./social-feed.css";

function Line({ short = false }: { short?: boolean }) {
  return <span className={`feed-skeleton-block feed-skeleton-line ${short ? "feed-skeleton-short" : ""}`} />;
}
export function ComposerSkeleton() {
  return <div className="feed-skeleton-card feed-skeleton-row" role="status" aria-label="Loading post composer"><span className="feed-skeleton-block feed-skeleton-avatar" /><span className="feed-skeleton-block feed-skeleton-input" /></div>;
}
export function PostSkeleton() {
  return <div className="feed-skeleton-card" role="status" aria-label="Loading post">
    <div aria-hidden="true">
      <div className="feed-skeleton-row"><span className="feed-skeleton-block feed-skeleton-avatar" /><div className="feed-skeleton-author"><Line /><Line short /></div></div>
      <div className="feed-skeleton-copy"><Line /><Line /><Line short /></div>
      <div className="feed-skeleton-block feed-skeleton-media" />
      <div className="feed-skeleton-actions">{[0,1,2].map(i => <span key={i} className="feed-skeleton-block" />)}</div>
    </div>
  </div>;
}
export function LeftPanelSkeleton() {
  return <div className="feed-skeleton-stack" role="status" aria-label="Loading your profile">
    <div className="feed-skeleton-card feed-skeleton-profile" aria-hidden="true"><div className="feed-skeleton-block feed-skeleton-cover" /><div className="feed-skeleton-profile-content"><span className="feed-skeleton-block feed-skeleton-profile-avatar" /><Line /><Line short /><div className="feed-skeleton-block feed-skeleton-input" /></div></div>
    <div className="feed-skeleton-card feed-skeleton-stack" aria-hidden="true">{[0,1,2,3,4].map(i => <div className="feed-skeleton-row" key={i}><span className="feed-skeleton-block feed-skeleton-nav-icon" /><Line /></div>)}</div>
  </div>;
}
export function RightPanelSkeleton() {
  return <div className="feed-skeleton-stack" role="status" aria-label="Loading community suggestions">{[0,1,2].map(section => <div key={section} className="feed-skeleton-card feed-skeleton-stack" aria-hidden="true"><Line short />{[0,1,2].map(row => <div key={row} className="feed-skeleton-row"><span className="feed-skeleton-block feed-skeleton-avatar" /><div className="feed-skeleton-author"><Line /><Line short /></div></div>)}</div>)}</div>;
}
export function FeedPageSkeleton() {
  return <div className="feed-page" aria-busy="true"><div className="feed-container"><div className="feed-layout"><aside className="feed-sidebar"><LeftPanelSkeleton /></aside><div className="feed-center feed-skeleton-stack"><div className="feed-skeleton-heading"><Line short /></div><ComposerSkeleton /><PostSkeleton /><PostSkeleton /></div><aside className="feed-sidebar"><RightPanelSkeleton /></aside></div></div></div>;
}

"use client";
import AcademyVideoPlayer from "@/components/AcademyVideoPlayer";
import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useSession } from "@/lib/auth-client";
import NetworkBadge from "@/components/networks/NetworkBadge";
import {
  Search,
  Plus,
  Users,
  Shield,
  Lock,
  ArrowRight,
  Crown,
  BookOpen,
  MessageSquare,
  Radio,
  Loader2,
  ArrowUpRight,
  X,
  Compass,
  Bell,
} from "lucide-react";
import "@/components/networks/networks.css";
import "@/components/networks/networks-light.css";
import "@/components/networks/networks-directory.css";
interface ProNetworkItem {
  id: string;
  name: string;
  slug: string;
  tagline: string | null;
  description: string;
  category: string;
  coverImage: string | null;
  logoImage: string | null;
  monthlyPrice: number;
  memberCount: number;
  memberPreviews?: { id: string; name: string | null; image: string | null }[];
  followerCount: number;
  memberBenefits: string[];
  badgeShape: string;
  badgeInitials: string | null;
  badgeText: string;
  badgeIcon: string;
  badgeBgColor: string;
  badgeTextColor: string;
  badgeBorderColor: string;
  badgeCustomImage: string | null;
  isOwner: boolean;
  isMember: boolean;
  isFollowing: boolean;
  owner: {
    id: string;
    name: string;
    image: string | null;
    role: string;
    tier: string;
    headline: string | null;
    digitalCard?: { username: string } | null;
  };
  _count: {
    members: number;
    discussions: number;
    resources: number;
    media: number;
    events: number;
  };
}

const categories = [
  "All",
  "Tax Strategy",
  "Tax Office Growth",
  "Due Diligence",
  "CPA Practice",
  "Audit Defense",
  "Marketing & Growth",
  "Software & Systems",
];

const views = [
  { id: "all", label: "Discover", icon: Compass },
  { id: "joined", label: "Joined", icon: Users },
  { id: "mine", label: "My networks", icon: Crown },
  { id: "following", label: "Following", icon: Bell },
] as const;
export default function ProNetworksDirectoryPage() {
  return <Suspense fallback={<div className="pn-page" role="status">Loading networks…</div>}><ProNetworksDirectory /></Suspense>;
}
function ProNetworksDirectory() {
  const searchParams = useSearchParams();
  const directoryRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const navbar = document.querySelector(".site-navbar");
    if (!navbar) return;
    const updateOffset = () => {
      directoryRef.current?.style.setProperty(
        "--pn-nav-height",
        `${navbar.getBoundingClientRect().height}px`,
      );
    };
    updateOffset();
    const observer = new ResizeObserver(updateOffset);
    observer.observe(navbar);
    return () => observer.disconnect();
  }, []);
  const { data: session } = useSession();
  const userId = session?.user?.id;
  const [networks, setNetworks] = useState<ProNetworkItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const [category, setCategory] = useState("All");
  const [query, setQuery] = useState("");
  const [view, setView] = useState<"all" | "joined" | "mine" | "following">(
    searchParams.get("filter") === "mine" ? "mine" : "all",
  );
  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setLoading(true);
      setError("");
      try {
        const params = new URLSearchParams();
        if (category !== "All") params.set("category", category);
        if (view !== "all") params.set("filter", view);
        if (query.trim()) params.set("q", query.trim());
        const response = await fetch("/api/pro-networks?" + params, {
          signal: controller.signal,
        });
        if (!response.ok)
          throw new Error("We couldn’t load the networks. Please try again.");
        const data = await response.json();
        if (!controller.signal.aborted) setNetworks(data.networks || []);
      } catch (error) {
        if (!controller.signal.aborted)
          setError(
            error instanceof Error ? error.message : "Unable to load networks.",
          );
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 200);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [category, view, query, retry, userId]);
  function reset() {
    setCategory("All");
    setQuery("");
    setView("all");
  }
  return (
    <div className="pn-page pn-directory" ref={directoryRef}>
      <div className="pn-container">
        <div className="pn-page-top">
          <span className="pn-eyebrow">THE PROFESSIONAL COMMUNITY</span>
          <Link href="/pro-networks/create">
            Build your own circle <ArrowUpRight size={15} />
          </Link>
        </div>
        <section className="pn-hero">
          <div>
            <span className="pn-kicker">
              <i />
              GOOD PEOPLE. SHARED AMBITION.
            </span>
            <h1>
              Your People.
              <br />
              <em>Your Network.</em>
            </h1>
            <p>
              Build a network that grows with you. Create or join a network,
              make valuable connections, share expertise, and turn your network
              into opportunities — including the ability to earn monthly
              residual income with no platform fees.
            </p>
            <div className="pn-hero-actions">
              <a className="pn-button pn-primary" href="#explore">
                Explore networks{" "}
                <span>
                  <ArrowRight size={18} />
                </span>
              </a>
              <Link className="pn-text-link" href="/pro-networks/create">
                <Plus size={16} />
                Create a network
              </Link>
            </div>
          </div>
          <AcademyVideoPlayer src="https://assets.cdn.filesafe.space/Qp3wj1F0Tcd4205IDKf3/media/6acf1944ed5644a05f0d83d9.mp4" title="Pro Networks" />
        </section>
        <div className="pn-value-strip">
          <span>
            <Users size={17} />A community around your expertise
          </span>
          <span>
            <Shield size={17} />
            Your own member identity
          </span>
          <span>
            <Lock size={17} />
            Private spaces to connect
          </span>
          <span>
            <Radio size={17} />
            Conversations that matter
          </span>
        </div>
        <main id="explore" className="pn-explore">
          <div className="pn-section-title">
            <div>
              <span className="pn-eyebrow">FIND YOUR CIRCLE</span>
              <h2>Good company starts here.</h2>
            </div>
            <p>Explore a network. Get to know your people.</p>
          </div>
          <div className="pn-sticky-filters" role="region" aria-label="Find networks">
            <div className="pn-discovery-toolbar">
              {session?.user && (
                <div className="pn-view-tabs" aria-label="Network views">
                  {views.map((item) => (
                    <button
                      key={item.id}
                      aria-pressed={view === item.id}
                      onClick={() => setView(item.id)}
                    >
                      <item.icon size={16} />
                      {item.label}
                    </button>
                  ))}
                </div>
              )}
              <div className="pn-search">
                <Search size={19} />
                <input
                  aria-label="Search pro networks"
                  placeholder="Search networks, topics, or hosts…"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                />
                {query && (
                  <button
                    aria-label="Clear network search"
                    onClick={() => setQuery("")}
                  >
                    <X size={17} />
                  </button>
                )}
              </div>
            </div>
            <div className="pn-categories" aria-label="Network categories">
              {categories.map((item) => (
                <button
                  key={item}
                  aria-pressed={category === item}
                  onClick={() => setCategory(item)}
                >
                  {item === "All" ? "All interests" : item}
                </button>
              ))}
            </div>
          </div>
          <div className="pn-result-info" aria-live="polite">
            <span>
              {loading
                ? "Finding your people…"
                : error
                  ? "Directory unavailable"
                  : networks.length +
                  " network" +
                  (networks.length === 1 ? "" : "s") +
                  " to explore"}
            </span>
            {(query || category !== "All" || view !== "all") && (
              <button onClick={reset}>
                Reset filters <X size={13} />
              </button>
            )}
            <span>Community starts with a connection.</span>
          </div>
          {loading ? (
            <div className="pn-loading" role="status">
              <Loader2 size={25} className="animate-spin" />
              Loading networks…
            </div>
          ) : error ? (
            <div className="pn-empty" role="alert">
              <h3>Let’s try that again.</h3>
              <p>{error}</p>
              <button
                className="pn-button pn-primary"
                onClick={() => setRetry((value) => value + 1)}
              >
                Try again{" "}
                <span>
                  <ArrowRight size={17} />
                </span>
              </button>
            </div>
          ) : networks.length === 0 ? (
            <div className="pn-empty">
              <Users size={34} />
              <h3>
                {view === "mine"
                  ? "Your community starts with you."
                  : "Your circle is still out there."}
              </h3>
              <p>
                {view === "mine"
                  ? "Create a network and bring people together around what you know."
                  : "Try another topic or reset your filters to explore more networks."}
              </p>
              {query || category !== "All" || view !== "all" ? (
                <button className="pn-button pn-primary" onClick={reset}>
                  Explore all networks{" "}
                  <span>
                    <ArrowRight size={17} />
                  </span>
                </button>
              ) : (
                <Link
                  className="pn-button pn-primary"
                  href="/pro-networks/create"
                >
                  Create a network{" "}
                  <span>
                    <Plus size={17} />
                  </span>
                </Link>
              )}
            </div>
          ) : (
            <div className="pn-network-grid">
              {networks.map((net) => (
                <article className="pn-network-card" key={net.id}>
                  <div className="pn-card-core">
                    <div className="pn-card-backdrop" aria-hidden="true">
                      {net.coverImage ? (
                        <Image
                          src={net.coverImage}
                          alt=""
                          fill
                          unoptimized
                          sizes="(max-width:700px) 100vw, 450px"
                        />
                      ) : (
                        null
                      )}
                    </div>
                    <div className="pn-card-header">
                      <Link href={"/pro-networks/" + net.slug} className="pn-card-photo" aria-label={`Explore ${net.name}`}>
                        {net.logoImage || net.coverImage ? (
                          <Image src={net.logoImage || net.coverImage!} alt="" fill unoptimized sizes="126px" />
                        ) : (
                          <Users size={40} aria-hidden="true" />
                        )}
                      </Link>
                      <div className="pn-card-intro">
                        <p>{net.tagline || net.description}</p>
                        <span className="pn-card-price">
                          {net.monthlyPrice > 0
                            ? "$" + net.monthlyPrice.toFixed(2) + "/mo"
                            : "Free to join"}
                        </span>
                      </div>
                    </div>
                    <div className="pn-network-body">
                      <h3>
                        <Link href={"/pro-networks/" + net.slug}>{net.name}</Link>
                      </h3>
                      <div className="pn-card-labels">
                        <span className="pn-card-category">{net.category}</span>
                        <NetworkBadge
                          shape={net.badgeShape}
                          initials={net.badgeInitials}
                          text={net.badgeText}
                          icon={net.badgeIcon}
                          bgColor={net.badgeBgColor}
                          textColor={net.badgeTextColor}
                          borderColor={net.badgeBorderColor}
                          customImage={net.badgeCustomImage}
                          size="sm"
                        />
                      </div>
                      <div className="pn-network-owner">
                        <span>
                          {net.owner.image ? (
                            <Image
                              src={net.owner.image}
                              alt=""
                              width={32}
                              height={32}
                              unoptimized
                            />
                          ) : (
                            net.owner.name[0]
                          )}
                        </span>
                        <div>
                          <small>HOSTED BY</small>
                          <strong>{net.owner.name}</strong>
                        </div>
                        {net.isOwner && (
                          <span className="pn-member-tag">Your network</span>
                        )}
                        {!net.isOwner && net.isMember && (
                          <span className="pn-member-tag">Member</span>
                        )}
                      </div>
                      <div className="pn-benefits">
                        {net.memberBenefits?.slice(0, 2).map((benefit, i) => (
                          <span key={i}>{benefit}</span>
                        ))}
                      </div>
                      <footer>
                        <span className="pn-card-members">
                          {!!net.memberPreviews?.length && (
                            <span className="pn-member-avatars">
                              {net.memberPreviews.map((member) => (
                                <span className="pn-member-avatar" key={member.id} title={member.name || "Member"}>
                                  <span aria-hidden="true">{(member.name || "Member").trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase()}</span>
                                  {member.image && (
                                    <Image src={member.image} alt={member.name || "Member"} fill sizes="32px" unoptimized onError={(event) => { event.currentTarget.style.display = "none"; }} />
                                  )}
                                </span>
                              ))}
                            </span>
                          )}
                          <span>
                          {net.memberCount.toLocaleString()}{" "}
                          {net.memberCount === 1 ? "member" : "members"}
                          </span>
                        </span>
                        <Link href={"/pro-networks/" + net.slug}>
                          {net.isMember || net.isOwner
                            ? "Open network"
                            : "Explore"}
                          <span>
                            <ArrowUpRight size={17} />
                          </span>
                        </Link>
                      </footer>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </main>
        <section className="pn-create-banner">
          <span className="pn-create-icon">
            <Crown size={32} />
          </span>
          <div>
            <span className="pn-eyebrow">BRING YOUR PEOPLE TOGETHER</span>
            <h2>Make room for your community.</h2>
            <p>
              A dedicated home for your knowledge, conversations, and
              connections.
            </p>
          </div>
          <Link className="pn-button pn-primary" href="/pro-networks/create">
            Create a network{" "}
            <span>
              <ArrowUpRight size={18} />
            </span>
          </Link>
        </section>
      </div>
    </div>
  );
}

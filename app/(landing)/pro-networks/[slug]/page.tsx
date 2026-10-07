"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import { useSession } from "@/lib/auth-client";
import { useAppSelector } from "@/store/hooks";
import { networkAccentInk } from "@/lib/networkBranding";
import NetworkDetailsSettings from "@/components/networks/NetworkDetailsSettings";
import NetworkBranding from "@/components/networks/NetworkBranding";
import NetworkEvents from "@/components/networks/NetworkEvents";
import ProfessionalTitleEditor from "@/components/networks/ProfessionalTitleEditor";
import "@/components/networks/network-settings.css";
import NetworkBadge from "@/components/networks/NetworkBadge";
import "@/components/networks/networks.css";
import "@/components/networks/networks-light.css";
import "@/components/networks/network-hub-v2.css";
import NetworkSkeleton from "@/components/networks/NetworkSkeleton";
import NetworkPosts from "@/components/networks/NetworkPosts";
import "@/components/networks/network-posts.css";
import MemberBubbleCloud from "@/components/networks/MemberBubbleCloud";
import NetworkAnalytics from "@/components/networks/NetworkAnalytics";
import NetworkModeration from "@/components/networks/NetworkModeration";
import NetworkShop from "@/components/networks/NetworkShop";
import { Trash2 } from "lucide-react";
import {
  Home01Icon as Home,
  BubbleChatIcon as MessageSquare,
  Image01Icon as Images,
  FolderDownloadIcon as FolderDown,
  LiveStreaming01Icon as Radio,
  Calendar03Icon as Calendar,
  UserGroupIcon as Users,
  GridViewIcon as LayoutGrid,
  BubbleChatIcon as MessagesSquare,
  Settings01Icon as Settings,
  Edit01Icon as Pencil,
  ChartHistogramIcon as BarChart2,
  Shield01Icon as Shield,
  Mail01Icon as Mail,
  HeadphonesIcon as Headphones,
  Notification01Icon as Bell,
  MoreHorizontalIcon as MoreHorizontal,
  Search01Icon as Search,
  Add01Icon as Plus,
  PlayIcon as Play,
  File01Icon as FileText,
  Download01Icon as Download,
  CheckmarkCircle02Icon as CheckCircle2,
  LockIcon as Lock,
  ArrowRight01Icon as ChevronRight,
  ArrowLeft01Icon as ChevronLeft,
  CrownIcon as Crown,
  Share08Icon as Share2,
  Cancel01Icon as X,
  SentIcon as Send,
  Loading03Icon as Loader2,
  ArrowRight02Icon as ArrowRight,
  SparklesIcon as Sparkles,
  LinkSquare02Icon as ExternalLink,
  BubbleChatIcon as MessageCircle,
  Call02Icon as Phone,
  HelpCircleIcon as HelpCircle,
  ViewIcon as Eye,
  Dollar01Icon as DollarSign,
  ChartIncreaseIcon as TrendingUp,
  UserAdd01Icon as UserPlus,
  Upload01Icon as Upload,
  Video01Icon as Video,
  File01Icon as File,
  Image01Icon as ImageIcon,
  Mic01Icon as Mic,
  AlertCircleIcon as AlertCircle,
  StarIcon as Star,
  ShoppingBag01Icon as ShoppingBag,
} from "hugeicons-react";

interface ProNetworkDetails {
  id: string;
  name: string;
  slug: string;
  tagline: string | null;
  description: string;
  category: string;
  coverImage: string | null;
  logoImage: string | null;
  monthlyPrice: number;
  accentColor: string;
  memberCount: number;
  followerCount: number;
  memberBenefits: string[];
  rules: string | null;
  welcomeMessage: string | null;
  badgeShape: string;
  badgeInitials: string | null;
  badgeText: string;
  badgeIcon: string;
  badgeBgColor: string;
  badgeTextColor: string;
  badgeBorderColor: string;
  badgeCustomImage: string | null;
  allowDirectMessage: boolean;
  allowDirectText: boolean;
  directTextPhone: string | null;
  allowQuestions: boolean;
  allowConsultations: boolean;
  consultationUrl: string | null;
  isOwner: boolean;
  isMember: boolean;
  membershipRole: string | null;
  canManage: boolean;
  isFollowing: boolean;
  owner: {
    id: string;
    name: string;
    email: string;
    image: string | null;
    role: string;
    tier: string;
    headline: string | null;
    bio: string | null;
    location: string | null;
    specialties: string[];
    certifications: string[];
    digitalCard?: { username: string } | null;
  };
  _count: {
    members: number;
    followers: number;
    discussions: number;
    media: number;
    resources: number;
    events: number;
  };
}

interface StripeStatus {
  connected: boolean;
  onboarded: boolean;
  accountId: string | null;
  accountDetails: {
    id: string;
    email: string | null;
    country: string | null;
    chargesEnabled: boolean;
    payoutsEnabled: boolean;
    onboarded: boolean;
  } | null;
}

// Fallback high-fidelity seed data matching reference screenshot
const DEFAULT_ANNOUNCEMENT = {
  title: "Welcome to the Pro Network! 👋",
  content:
    "Introduce yourself in the #introduce-yourself discussion and let us know what you'd like to learn more about.",
  author: "Tonique Clay",
  date: "2d ago",
};

const DEFAULT_DISCUSSIONS = [
  {
    id: "disc-1",
    title: "IRS Appeals: What tax pros need to know",
    author: "Tonique Clay",
    authorImage: "/pros/tonique-clay.jpg",
    replies: 24,
    time: "2h ago",
    isPinned: true,
  },
  {
    id: "disc-2",
    title: "Common deduction mistakes to avoid in 2026",
    author: "Michael R.",
    authorImage: "/pros/michael-williams.jpg",
    replies: 18,
    time: "5h ago",
    isPinned: false,
  },
  {
    id: "disc-3",
    title: "Client Audit Guidance: Best practices",
    author: "Jessica M.",
    authorImage: "/pros/diana-reyes.jpg",
    replies: 31,
    time: "1d ago",
    isPinned: false,
  },
  {
    id: "disc-4",
    title: "1099 Reporting: Tips for accuracy",
    author: "Robert T.",
    authorImage: "/pros/kevin-johnson.jpg",
    replies: 12,
    time: "2d ago",
    isPinned: false,
  },
  {
    id: "disc-5",
    title: "Systems & Tools That Save Time",
    author: "Amanda L.",
    authorImage: "/pros/chastity-trice.jpg",
    replies: 9,
    time: "3d ago",
    isPinned: false,
  },
];

const DEFAULT_MEDIA = [
  {
    id: "media-1",
    title: "Live Q&A Recap",
    date: "May 10, 2026",
    duration: "12:45",
    type: "VIDEO",
    thumbnailUrl: "/pros/tonique-clay.jpg",
  },
  {
    id: "media-2",
    title: "Tax Season Workshop Highlights",
    date: "May 8, 2026",
    duration: "8:16",
    type: "VIDEO",
    thumbnailUrl: "/prohub/HIRING TRAINING.png",
  },
  {
    id: "media-3",
    title: "Behind the Scenes: New Training",
    date: "May 5, 2026",
    duration: "6:32",
    type: "VIDEO",
    thumbnailUrl: "/courses-hero.webp",
  },
  {
    id: "media-4",
    title: "Client Success Celebration",
    date: "Apr 30, 2026",
    duration: "3:48",
    type: "VIDEO",
    thumbnailUrl: "/pros/michael-williams.jpg",
  },
  {
    id: "media-5",
    title: "Tax Prep Checklist Photo",
    date: "Apr 28, 2026",
    duration: "",
    type: "PHOTO",
    thumbnailUrl: "/book-mockup.webp",
  },
];

const DEFAULT_PRO_TALKS = [
  {
    id: "talk-1",
    title: "Entity Selection Strategies That Save Thousands",
    date: "May 24, 2026 • 12:00 PM CT",
    isLive: true,
    isRegistered: true,
    speaker: "Tonique Clay",
    speakerImage: "/pros/tonique-clay.jpg",
  },
  {
    id: "talk-2",
    title: "Advanced Tax Planning Workshop",
    date: "May 31, 2026 • 1:00 PM CT",
    isLive: false,
    isRegistered: false,
    speaker: "Michael R.",
    speakerImage: "/pros/michael-williams.jpg",
  },
];

const DEFAULT_RESOURCES = [
  {
    id: "res-1",
    title: "S Corp Salary vs. Distributions Guide (2026)",
    type: "PDF",
    color: "red",
  },
  {
    id: "res-2",
    title: "Q2 Tax Planning Checklist",
    type: "PDF",
    color: "blue",
  },
  {
    id: "res-3",
    title: "Client Intake Questionnaire Template",
    type: "DOCX",
    color: "green",
  },
  {
    id: "res-4",
    title: "1031 Exchange Basics for Tax Pros",
    type: "VIDEO",
    color: "purple",
  },
];

const DEFAULT_MEMBERS = [
  {
    id: "mem-1",
    name: "Jessica M.",
    location: "Houston, TX",
    image: "/pros/diana-reyes.jpg",
    status: "Active",
  },
  {
    id: "mem-2",
    name: "Robert T.",
    location: "Dallas, TX",
    image: "/pros/michael-williams.jpg",
    status: "Active",
  },
  {
    id: "mem-3",
    name: "Michael R.",
    location: "Miami, FL",
    image: "/pros/kevin-johnson.jpg",
    status: "Active",
  },
  {
    id: "mem-4",
    name: "Amanda L.",
    location: "Austin, TX",
    image: "/pros/chastity-trice.jpg",
    status: "Active",
  },
  {
    id: "mem-5",
    name: "Kevin C.",
    location: "Chicago, IL",
    image: "/pros/emily-carter.jpg",
    status: "Active",
  },
];

const DEFAULT_NETWORK_COVER =
  "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=1200&auto=format&fit=crop&q=80";

function NetworkHeaderLogo({
  customLogo,
  coverImage,
  networkName,
}: {
  customLogo?: string | null;
  coverImage?: string | null;
  networkName?: string;
}) {
  const displayImage = customLogo || coverImage || DEFAULT_NETWORK_COVER;

  return (
    <div className="flex items-center gap-2">
      <div className="w-10 h-10 rounded-xl overflow-hidden ring-1 ring-white/20 bg-white/10 shadow-sm shrink-0 flex items-center justify-center">
        <img
          src={displayImage}
          alt={networkName || "Network"}
          className="w-full h-full object-cover"
          onError={(e) => {
            (e.target as HTMLImageElement).src = DEFAULT_NETWORK_COVER;
          }}
        />
      </div>
    </div>
  );
}

export default function ProNetworkHubPage({
  params,
}: {
  params?: Promise<{ slug: string }>;
}) {
  const routeParams = useParams<{ slug: string }>();
  const slug = routeParams?.slug || "";
  const router = useRouter();
  const { data: session } = useSession();
  const storeUser = useAppSelector((state) => state.auth.user);
  const currentUser = storeUser || session?.user;

  const [network, setNetwork] = useState<ProNetworkDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [activeTab, setActiveTab] = useState<
    | "home"
    | "discussions"
    | "media"
    | "resources"
    | "protalks"
    | "events"
    | "members"
    | "chat"
    | "shop"
    | "manage"
    | "analytics"
    | "moderation"
  >("home");

  // Host Stripe Connect State
  const [stripeStatus, setStripeStatus] = useState<StripeStatus | null>(null);
  useEffect(() => {
    const url = new URL(window.location.href);
    const sessionId = url.searchParams.get("session_id");
    const stripeAccount = url.searchParams.get("stripe_account");
    if (!sessionId || !stripeAccount) return;
    let cancelled = false;
    fetch("/api/stripe/verify-session", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId, stripeAccount }),
    }).then(async response => {
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Payment confirmation is pending. Reload to retry.");
      if (!cancelled) {
        url.searchParams.delete("session_id");
        url.searchParams.delete("stripe_account");
        window.location.replace(url.pathname + url.search);
      }
    }).catch(error => { if (!cancelled) alert(error.message); });
    return () => { cancelled = true; };
  }, [slug]);

  const [connectingStripe, setConnectingStripe] = useState(false);
  const [disconnectingStripe, setDisconnectingStripe] = useState(false);

  // Dynamic Data States
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [discussions, setDiscussions] = useState<any[]>([]);
  const [postsLoading, setPostsLoading] = useState(true);
  const [postsError, setPostsError] = useState("");
  const [mediaList, setMediaList] = useState<any[]>([]);
  const [resourcesList, setResourcesList] = useState<any[]>([]);
  const [eventsList, setEventsList] = useState<any[]>([]);
  const [membersList, setMembersList] = useState<any[]>([]);
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [chatChannel, setChatChannel] = useState("general");
  const [newChatMessage, setNewChatMessage] = useState("");

  // Modals
  const [showUploadMediaModal, setShowUploadMediaModal] = useState(false);
  const [mediaTitle, setMediaTitle] = useState("");
  const [mediaType, setMediaType] = useState<"PHOTO" | "VIDEO" | "FILE" | "AUDIO">("VIDEO");
  const [mediaDuration, setMediaDuration] = useState("");
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaThumbnailFile, setMediaThumbnailFile] = useState<File | null>(null);
  const [uploadingMedia, setUploadingMedia] = useState(false);

  const [showUploadResourceModal, setShowUploadResourceModal] = useState(false);
  const [resourceTitle, setResourceTitle] = useState("");
  const [resourceDesc, setResourceDesc] = useState("");
  const [resourceFileType, setResourceFileType] = useState("PDF");
  const [resourceFile, setResourceFile] = useState<File | null>(null);
  const [uploadingResource, setUploadingResource] = useState(false);

  const [showHostProTalkModal, setShowHostProTalkModal] = useState(false);
  const [proTalkTitle, setProTalkTitle] = useState("");
  const [proTalkDesc, setProTalkDesc] = useState("");
  const [proTalkScheduleDate, setProTalkScheduleDate] = useState("");
  const [isGoLiveImmediate, setIsGoLiveImmediate] = useState(true);
  const [creatingProTalk, setCreatingProTalk] = useState(false);

  const [showInviteModal, setShowInviteModal] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const [selectedMediaItem, setSelectedMediaItem] = useState<any | null>(null);
  const [joining, setJoining] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showMoreMenu, setShowMoreMenu] = useState(false);

  // New discussion modal
  const [showNewDiscussionModal, setShowNewDiscussionModal] = useState(false);
  const [newDiscussionTitle, setNewDiscussionTitle] = useState("");
  const [newDiscussionContent, setNewDiscussionContent] = useState("");
  const [creatingDiscussion, setCreatingDiscussion] = useState(false);

  // Delete Network modal & state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmInput, setDeleteConfirmInput] = useState("");
  const [isDeletingNetwork, setIsDeletingNetwork] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  // Media filter & carousel
  const [mediaFilter, setMediaFilter] = useState<"ALL" | "PHOTOS" | "VIDEOS" | "FILES">("ALL");
  const mediaCarouselRef = useRef<HTMLDivElement>(null);

  const scrollMedia = (direction: "left" | "right") => {
    if (mediaCarouselRef.current) {
      const scrollAmount = direction === "left" ? -280 : 280;
      mediaCarouselRef.current.scrollBy({ left: scrollAmount, behavior: "smooth" });
    }
  };

  // Pricing Update State
  const [showEditPricingModal, setShowEditPricingModal] = useState(false);
  const [editPriceType, setEditPriceType] = useState<"free" | "paid">("paid");
  const [editMonthlyPrice, setEditMonthlyPrice] = useState("19.99");
  const [savingPrice, setSavingPrice] = useState(false);
  const [pricingSuccessMsg, setPricingSuccessMsg] = useState("");

  const openEditPricingModal = () => {
    if (network) {
      if (network.monthlyPrice <= 0) {
        setEditPriceType("free");
        setEditMonthlyPrice("0");
      } else {
        setEditPriceType("paid");
        setEditMonthlyPrice(network.monthlyPrice.toString());
      }
    }
    setShowEditPricingModal(true);
  };

  const handleSavePricing = async () => {
    const finalPrice =
      editPriceType === "free" ? 0 : Math.max(0, parseFloat(editMonthlyPrice || "0"));
    if (!Number.isFinite(finalPrice) || (editPriceType === "paid" && finalPrice <= 0)) {
      alert("Enter a monthly price greater than zero, or choose Free.");
      return;
    }
    setSavingPrice(true);
    try {
      const res = await fetch(`/api/pro-networks/${slug}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ monthlyPrice: finalPrice }),
      });
      const data = await res.json();
      if (res.ok) {
        setNetwork((prev) => (prev ? { ...prev, monthlyPrice: finalPrice } : prev));
        setShowEditPricingModal(false);
        setPricingSuccessMsg(
          `Network pricing successfully updated to ${finalPrice <= 0 ? "FREE" : `$${finalPrice.toFixed(2)}/mo`}!`,
        );
        setTimeout(() => setPricingSuccessMsg(""), 5000);
      } else {
        alert(data.error || "Failed to update network pricing.");
      }
    } catch (err) {
      console.error(err);
      alert("Failed to update pricing.");
    } finally {
      setSavingPrice(false);
    }
  };

  // Member View Mode
  const [memberViewMode, setMemberViewMode] = useState<"bubble" | "grid">("bubble");

  const fetchStripeStatus = async () => {
    try {
      const res = await fetch("/api/seller/stripe-connect");
      if (res.ok) {
        const data = await res.json();
        setStripeStatus(data);
      }
    } catch (err) {
      console.error("Failed to load Stripe status:", err);
    }
  };

  const handleConnectStripe = async () => {
    setConnectingStripe(true);
    try {
      const res = await fetch("/api/seller/stripe-connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ returnUrl: `/pro-networks/${slug}?tab=manage` }),
      });
      const data = await res.json().catch(() => null);
      if (res.ok && data?.url) {
        window.location.href = data.url;
      } else {
        alert(data?.error || "Failed to start Stripe onboarding. Please check your Stripe settings.");
      }
    } catch (err: any) {
      alert(err?.message || "Network error. Please try again.");
    } finally {
      setConnectingStripe(false);
    }
  };

  const handleDisconnectStripe = async () => {
    if (
      !confirm(
        "Disconnect your Stripe account? Member subscription payments won't be transferred directly to you.",
      )
    )
      return;
    setDisconnectingStripe(true);
    try {
      await fetch("/api/seller/stripe-connect", { method: "DELETE" });
      setStripeStatus({
        connected: false,
        onboarded: false,
        accountId: null,
        accountDetails: null,
      });
    } finally {
      setDisconnectingStripe(false);
    }
  };

  const handleDeleteNetwork = async () => {
    if (!network) return;
    setIsDeletingNetwork(true);
    setDeleteError("");
    try {
      const res = await fetch(`/api/pro-networks/${slug}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to delete Pro Network.");
      }
      setShowDeleteModal(false);
      router.push("/pro-networks");
    } catch (err: any) {
      setDeleteError(err.message || "An unexpected error occurred while deleting.");
      setIsDeletingNetwork(false);
    }
  };

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("tab") === "manage") {
        setActiveTab("manage");
      } else if (params.get("tab") === "analytics") {
        setActiveTab("analytics");
      } else if (params.get("tab") === "moderation") {
        setActiveTab("moderation");
      } else if (params.get("tab") === "shop" || params.get("purchased") === "true") {
        setActiveTab("shop");
      }
      if (params.get("stripe") === "success" || params.get("stripe") === "refresh") {
        setActiveTab("manage");
        fetchStripeStatus();
      }
    }
  }, []);

  useEffect(() => {
    if (slug) {
      fetchNetworkDetails();
    }
  }, [slug]);

  const fetchNetworkDetails = async () => {
    if (!slug) return;
    setLoading(true);
    setLoadError("");
    try {
      const res = await fetch(`/api/pro-networks/${slug}`);
      if (res.ok) {
        const data = await res.json();
        setNetwork(data.network);
        if (data.network?.isOwner) {
          fetchStripeStatus();
        }
        fetchAllTabData();
      } else {
        const errData = await res.json().catch(() => null);
        setLoadError(
          res.status === 404
            ? "This Pro Network could not be found or has been moved."
            : (errData?.error || "We couldn’t load this network. Please try again.")
        );
      }
    } catch (err) {
      console.error("Failed to load network:", err);
      setLoadError("We couldn’t load this network. Please check your connection and try again.");
    } finally {
      setLoading(false);
    }
  };

  const fetchPosts = async () => {
    if (!slug) return;
    setPostsLoading(true);
    setPostsError("");
    try {
      const res = await fetch(`/api/pro-networks/${slug}/discussions`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not load posts.");
      setDiscussions(data.discussions || []);
    } catch (error) {
      setPostsError(error instanceof Error ? error.message : "Could not load posts.");
    } finally {
      setPostsLoading(false);
    }
  };

  const fetchAllTabData = async () => {
    if (!slug) return;
    void fetchPosts();
    try {
      const [annRes, mediaRes, resRes, eventRes, memRes] = await Promise.all([
        fetch(`/api/pro-networks/${slug}/announcements`).catch(() => null),
        fetch(`/api/pro-networks/${slug}/media`).catch(() => null),
        fetch(`/api/pro-networks/${slug}/resources`).catch(() => null),
        fetch(`/api/pro-networks/${slug}/events`).catch(() => null),
        fetch(`/api/pro-networks/${slug}/members`).catch(() => null),
      ]);

      if (annRes && annRes.ok) {
        const d = await annRes.json().catch(() => null);
        setAnnouncements(d?.announcements || []);
      }
      if (mediaRes && mediaRes.ok) {
        const d = await mediaRes.json().catch(() => null);
        setMediaList(d?.media || []);
      }
      if (resRes && resRes.ok) {
        const d = await resRes.json().catch(() => null);
        setResourcesList(d?.resources || []);
      }
      if (eventRes && eventRes.ok) {
        const d = await eventRes.json().catch(() => null);
        setEventsList(d?.events || []);
      }
      if (memRes && memRes.ok) {
        const d = await memRes.json().catch(() => null);
        setMembersList(d?.members || []);
      }
    } catch (err) {
      console.error("Error loading tab data:", err);
    }
  };

  useEffect(() => {
    if (activeTab === "chat" && network?.isMember) {
      fetchChatMessages();
    }
  }, [activeTab, chatChannel, network?.isMember]);

  const fetchChatMessages = async () => {
    try {
      const res = await fetch(`/api/pro-networks/${slug}/chat?channel=${chatChannel}`);
      if (res.ok) {
        const data = await res.json();
        setChatMessages(data.messages || []);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSendChatMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChatMessage.trim()) return;

    try {
      const res = await fetch(`/api/pro-networks/${slug}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channel: chatChannel,
          content: newChatMessage.trim(),
        }),
      });
      if (res.ok) {
        setNewChatMessage("");
        fetchChatMessages();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleJoinNetwork = async () => {
    if (!session?.user) {
      router.push(`/login?next=/pro-networks/${slug}`);
      return;
    }

    setJoining(true);
    try {
      const res = await fetch(`/api/pro-networks/${slug}/checkout`, {
        method: "POST",
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else if (data.redirectUrl) {
        fetchNetworkDetails();
      } else if (data.error) {
        alert(data.error);
      }
    } catch (err) {
      alert("Failed to join network.");
    } finally {
      setJoining(false);
    }
  };

  const handleToggleFollow = async () => {
    if (!session?.user) {
      router.push(`/login?next=/pro-networks/${slug}`);
      return;
    }
    try {
      const res = await fetch(`/api/pro-networks/${slug}/follow`, {
        method: "POST",
      });
      if (res.ok) {
        const data = await res.json();
        setNetwork((prev) =>
          prev
            ? {
                ...prev,
                isFollowing: data.following,
                followerCount: data.following
                  ? prev.followerCount + 1
                  : Math.max(0, prev.followerCount - 1),
              }
            : null,
        );
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleEventRsvp = async (eventId: string) => {
    if (!network?.isMember) return;
    try {
      const res = await fetch(`/api/pro-networks/${slug}/events/${eventId}/rsvp`, {
        method: "POST",
      });
      if (res.ok) {
        const data = await res.json();
        setEventsList((prev) =>
          prev.map((e) =>
            e.id === eventId
              ? {
                  ...e,
                  isRegistered: data.registered,
                  rsvpCount: data.registered ? e.rsvpCount + 1 : Math.max(0, e.rsvpCount - 1),
                }
              : e,
          ),
        );
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleUploadMedia = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mediaFile || !mediaTitle.trim()) {
      alert("Please provide a title and select a file.");
      return;
    }

    setUploadingMedia(true);
    try {
      const fd = new FormData();
      fd.append("file", mediaFile);
      fd.append("folder", "taxcomppro/networks/media");

      const uploadRes = await fetch("/api/upload", {
        method: "POST",
        body: fd,
      });

      if (!uploadRes.ok) throw new Error("File upload failed");
      const uploadData = await uploadRes.json();
      const fileUrl = uploadData.url;

      let thumbUrl = null;
      if (mediaThumbnailFile) {
        const thumbFd = new FormData();
        thumbFd.append("file", mediaThumbnailFile);
        thumbFd.append("folder", "taxcomppro/networks/media");
        const thumbRes = await fetch("/api/upload", {
          method: "POST",
          body: thumbFd,
        });
        if (thumbRes.ok) {
          const thumbData = await thumbRes.json();
          thumbUrl = thumbData.url;
        }
      }

      const res = await fetch(`/api/pro-networks/${slug}/media`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: mediaTitle.trim(),
          type: mediaType,
          url: fileUrl,
          thumbnailUrl: thumbUrl,
          duration: mediaDuration.trim() || null,
          isMembersOnly: true,
        }),
      });

      if (res.ok) {
        setShowUploadMediaModal(false);
        setMediaTitle("");
        setMediaDuration("");
        setMediaFile(null);
        setMediaThumbnailFile(null);
        const refreshRes = await fetch(`/api/pro-networks/${slug}/media`);
        if (refreshRes.ok) setMediaList((await refreshRes.json()).media || []);
      }
    } catch (err) {
      console.error(err);
      alert("Failed to upload media item.");
    } finally {
      setUploadingMedia(false);
    }
  };

  const handleUploadResource = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resourceFile || !resourceTitle.trim()) {
      alert("Please provide a resource title and choose a file.");
      return;
    }

    setUploadingResource(true);
    try {
      const fd = new FormData();
      fd.append("file", resourceFile);
      fd.append("folder", "taxcomppro/networks/resources");

      const uploadRes = await fetch("/api/upload", {
        method: "POST",
        body: fd,
      });

      if (!uploadRes.ok) throw new Error("Resource file upload failed");
      const uploadData = await uploadRes.json();
      const fileUrl = uploadData.url;

      const sizeStr = `${(resourceFile.size / (1024 * 1024)).toFixed(1)} MB`;

      const res = await fetch(`/api/pro-networks/${slug}/resources`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: resourceTitle.trim(),
          description: resourceDesc.trim() || null,
          fileUrl,
          fileType: resourceFileType,
          fileSize: sizeStr,
          isMembersOnly: true,
        }),
      });

      if (res.ok) {
        setShowUploadResourceModal(false);
        setResourceTitle("");
        setResourceDesc("");
        setResourceFile(null);
        const refreshRes = await fetch(`/api/pro-networks/${slug}/resources`);
        if (refreshRes.ok) setResourcesList((await refreshRes.json()).resources || []);
      }
    } catch (err) {
      console.error(err);
      alert("Failed to upload resource file.");
    } finally {
      setUploadingResource(false);
    }
  };

  const handleHostProTalk = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!proTalkTitle.trim()) {
      alert("Please enter a title for the Pro Talk session.");
      return;
    }

    setCreatingProTalk(true);
    try {
      const res = await fetch(`/api/pro-networks/${slug}/events`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: proTalkTitle.trim(),
          description: proTalkDesc.trim() || null,
          type: "PRO_TALK",
          startDate: isGoLiveImmediate ? new Date().toISOString() : proTalkScheduleDate,
          endDate: isGoLiveImmediate
            ? new Date(Date.now() + 60 * 60 * 1000).toISOString()
            : proTalkScheduleDate,
          isLiveNow: isGoLiveImmediate,
          isMembersOnly: true,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setShowHostProTalkModal(false);
        setProTalkTitle("");
        setProTalkDesc("");
        if (isGoLiveImmediate) {
          router.push(`/pro-networks/${slug}/protalks/${data.event.id}`);
        } else {
          setActiveTab("events");
          const refreshRes = await fetch(`/api/pro-networks/${slug}/events`);
          if (refreshRes.ok) setEventsList((await refreshRes.json()).events || []);
        }
      }
    } catch (err) {
      console.error(err);
      alert("Failed to create Pro Talk.");
    } finally {
      setCreatingProTalk(false);
    }
  };

  const handleCreateDiscussion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDiscussionTitle.trim()) return;
    if (!network?.isMember && !network?.isOwner) {
      handleJoinNetwork();
      return;
    }
    setCreatingDiscussion(true);
    try {
      const res = await fetch(`/api/pro-networks/${slug}/discussions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newDiscussionTitle.trim(),
          content: newDiscussionContent.trim() || newDiscussionTitle.trim(),
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setDiscussions((prev) => [data.discussion, ...prev]);
        setShowNewDiscussionModal(false);
        setNewDiscussionTitle("");
        setNewDiscussionContent("");
        setActiveTab("discussions");
      } else {
        const err = await res.json().catch(() => null);
        alert(err?.error || "Failed to create discussion.");
      }
    } catch (err) {
      console.error(err);
      alert("Network error.");
    } finally {
      setCreatingDiscussion(false);
    }
  };

  const handleCopyInviteLink = () => {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(window.location.href);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    }
  };

  const searchTerm = searchQuery.toLowerCase().trim();
  const matchesSearch = (...fields: (string | null | undefined)[]) => {
    if (!searchTerm) return true;
    return fields.some((f) => f && f.toLowerCase().includes(searchTerm));
  };

  const filteredDiscussions = discussions.filter((item) =>
    matchesSearch(item.title, item.content, item.author?.name),
  );
  const filteredMedia = mediaList.filter((item) => matchesSearch(item.title, item.type));
  const filteredResources = resourcesList.filter((item) =>
    matchesSearch(item.title, item.description, item.fileType),
  );
  const filteredEvents = eventsList.filter((item) =>
    matchesSearch(item.title, item.description),
  );
  const filteredMembers = membersList.filter((item) =>
    matchesSearch(
      item.user?.name,
      item.user?.professionalTitle,
      item.user?.headline,
      item.user?.location,
    ),
  );
  const filteredChat = chatMessages.filter((item) =>
    matchesSearch(item.content, item.sender?.name),
  );

  // Real database collections for this specific network
  const displayDiscussions = filteredDiscussions;

  const displayMedia = filteredMedia.filter(
    (m) => {
      if (!matchesSearch(m.title, m.type)) return false;
      if (mediaFilter === "ALL") return true;
      if (mediaFilter === "PHOTOS") return m.type === "PHOTO";
      if (mediaFilter === "VIDEOS") return m.type === "VIDEO";
      if (mediaFilter === "FILES") return m.type === "FILE";
      return true;
    },
  );

  const displayProTalks = filteredEvents
    .filter((e) => e?.type === "PRO_TALK" || e?.eventType === "PRO_TALK" || e?.isLiveNow || e?.isLive)
    .map((e) => {
      const dateVal = e.scheduledAt || e.startDate || e.createdAt;
      let formattedDate = "Upcoming";
      try {
        if (dateVal) {
          formattedDate = new Date(dateVal).toLocaleString([], {
            month: "short",
            day: "numeric",
            year: "numeric",
            hour: "numeric",
            minute: "2-digit",
          });
        }
      } catch {
        formattedDate = "Upcoming";
      }
      return {
        id: e.id,
        title: e.title || "Pro Talk Session",
        date: formattedDate,
        isLive: Boolean(e.isLiveNow || e.isLive),
        isRegistered: Boolean(e.isRegistered),
        speaker: network?.owner?.name || "Host",
        speakerImage: network?.owner?.image || "/pros/tonique-clay.jpg",
      };
    });

  const displayResources = filteredResources;

  const displayMembers =
    filteredMembers.length > 0
      ? filteredMembers
      : network?.owner
      ? [
          {
            id: network.owner.id,
            role: "OWNER",
            status: "ACTIVE",
            user: {
              id: network.owner.id,
              name: network.owner.name,
              image: network.owner.image,
              headline: network.owner.headline,
              location: network.owner.location,
              role: network.owner.role,
              tier: network.owner.tier,
              digitalCard: network.owner.digitalCard,
            },
          },
        ]
      : [];

  if (!loading && (loadError || !network)) {
    return (
      <div className="min-h-screen bg-[#08101e] flex flex-col items-center justify-center p-6 text-white text-center">
        <div className="max-w-md w-full bg-[#0d1627] border border-white/10 rounded-3xl p-8 sm:p-10 shadow-2xl space-y-6">
          <div className="w-16 h-16 rounded-2xl bg-amber-400/10 border border-amber-400/20 text-amber-400 mx-auto flex items-center justify-center shadow-lg shadow-amber-400/10">
            <Lock className="w-8 h-8 text-amber-400" />
          </div>
          <div className="space-y-2">
            <h1 className="text-xl sm:text-2xl font-black">{loadError || "This network is unavailable."}</h1>
            <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
              The network link you followed could not be found or has changed.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <button
              onClick={fetchNetworkDetails}
              className="w-full sm:w-auto px-6 py-3 rounded-xl bg-[#1a56db] hover:bg-blue-600 text-white font-black text-xs transition-all active:scale-95"
            >
              Try again
            </button>
            <Link
              href="/pro-networks"
              className="w-full sm:w-auto px-5 py-3 rounded-xl bg-white/10 hover:bg-white/15 text-slate-200 font-bold text-xs transition-all"
            >
              Back to all networks
            </Link>
          </div>
        </div>
      </div>
    );
  }


  if (loading || !network) return <NetworkSkeleton />;

  const canManage = network.canManage === true;
  const adminTabs = ["manage", "analytics", "moderation"];
  const currentTab = adminTabs.includes(activeTab) && !canManage ? "home" : activeTab;

  const renderPaywall = (title?: string, desc?: string) => (
    <div className="pn-v2-card space-y-6 text-center py-10 relative overflow-hidden">
      <div className="inline-flex items-center gap-2 bg-amber-400/15 border border-amber-400/30 text-amber-500 text-xs font-black uppercase tracking-widest px-4 py-1.5 rounded-full">
        <Lock className="w-3.5 h-3.5 text-amber-400" />
        <span>Members-Only Access Required</span>
      </div>
      <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
        Join <span className="text-[#1a56db]">{network?.name}</span> to Unlock{" "}
        {title || "Full Access"}
      </h2>
      <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-lg mx-auto leading-relaxed">
        {desc ||
          network?.tagline ||
          "Join fellow tax practitioners and gain direct access to private feeds, document vaults, live Pro Talks, and exclusive templates."}
      </p>

      <div className="max-w-md mx-auto bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl p-5 text-center space-y-2">
        <div className="flex items-baseline justify-center gap-1.5">
          <span className="text-3xl sm:text-4xl font-black text-[#1a56db]">
            {network.monthlyPrice > 0 ? `$${network.monthlyPrice.toFixed(2)}` : "FREE"}
          </span>
          {network.monthlyPrice > 0 && (
            <span className="text-xs font-bold text-slate-500">/ month</span>
          )}
        </div>
        <p className="text-xs font-semibold text-emerald-600">
          {network.monthlyPrice > 0
            ? "0% TCP platform cut • 100% direct host transfer"
            : "100% free for all verified tax professionals"}
        </p>
      </div>

      <div>
        <button
          type="button"
          disabled={joining}
          onClick={handleJoinNetwork}
          className="bg-[#1a56db] hover:bg-blue-700 text-white font-black text-sm px-8 py-3.5 rounded-xl shadow-lg transition-all hover:scale-105 active:scale-95 disabled:opacity-50 inline-flex items-center gap-2"
        >
          {joining ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Connecting to Checkout...</span>
            </>
          ) : (
            <>
              <Crown className="w-4 h-4 text-amber-300" />
              <span>
                {network.monthlyPrice > 0
                  ? `Join Now — $${network.monthlyPrice.toFixed(2)}/mo`
                  : "Join Now & Unlock Free Access"}
              </span>
            </>
          )}
        </button>
      </div>
    </div>
  );

  return (
    <div className="pn-v2-shell">
      {/* ── LEFT DARK SIDEBAR (Fixed) ── */}
      <aside className="pn-v2-sidebar">
        <div>
          {/* My Profile Header (Logged-in user profile) */}
          <Link
            href="/profile"
            className="flex items-center gap-3 p-2 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors mb-6 group cursor-pointer block text-left"
            title="View your profile"
          >
            <div className="relative shrink-0">
              {currentUser?.image ? (
                <img
                  src={currentUser.image}
                  alt={currentUser.name || "My Profile"}
                  className="w-12 h-12 rounded-xl object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = "/pros/tonique-clay.jpg";
                  }}
                />
              ) : (
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-800 flex items-center justify-center text-white font-bold text-base shadow-sm">
                  {currentUser?.name?.[0]?.toUpperCase() || "U"}
                </div>
              )}
              <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-emerald-500 rounded-full border-2 border-[#08101e]" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-bold text-white truncate group-hover:text-amber-400 transition-colors">
                {currentUser?.name || "My Profile"}
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5 truncate">
                {network.isOwner ? "Network Owner" : network.isMember ? "Network Member" : "Active Member"}
              </div>
            </div>
          </Link>

          {/* Section: MY NETWORK */}
          <div className="space-y-1">
            <p className="pn-v2-nav-label">MY NETWORK</p>
            {[
              { id: "home", label: "Network Home", icon: Home },
              { id: "discussions", label: "Discussions", icon: MessageSquare },
              { id: "media", label: "Media Gallery", icon: Images },
              { id: "resources", label: "Resources", icon: FolderDown },
              { id: "protalks", label: "Pro Talks", icon: Radio },
              { id: "events", label: "Events", icon: Calendar },
              { id: "members", label: "Members", icon: Users },
              { id: "chat", label: "Members Chat", icon: MessagesSquare },
              { id: "shop", label: "Shop", icon: ShoppingBag },
            ].map((item) => {
              const Icon = item.icon;
              const isActive = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setActiveTab(item.id as any);
                    setSearchQuery("");
                  }}
                  className={`pn-v2-nav-item ${isActive ? "active" : ""}`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>

          {/* Section: NETWORK TOOLS (Admins & Owners only) */}
          {canManage && (
            <div className="space-y-1 pt-6">
              <p className="pn-v2-nav-label">NETWORK TOOLS</p>
              <button
                type="button"
                onClick={() => {
                  setActiveTab("manage");
                  setSearchQuery("");
                }}
                className={`pn-v2-nav-item ${currentTab === "manage" ? "active" : ""}`}
              >
                <Settings className="w-4 h-4 shrink-0" />
                <span>Manage Network</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveTab("manage");
                  setSearchQuery("");
                }}
                className="pn-v2-nav-item"
              >
                <Pencil className="w-4 h-4 shrink-0" />
                <span>Network Settings</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveTab("analytics");
                  setSearchQuery("");
                }}
                className={`pn-v2-nav-item ${currentTab === "analytics" ? "active" : ""}`}
              >
                <BarChart2 className="w-4 h-4 shrink-0" />
                <span>Analytics</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveTab("moderation");
                  setSearchQuery("");
                }}
                className={`pn-v2-nav-item ${currentTab === "moderation" ? "active" : ""}`}
              >
                <Shield className="w-4 h-4 shrink-0" />
                <span>Moderation</span>
              </button>
            </div>
          )}
        </div>

        {/* Section: Need Help Support Box */}
        <div className="pt-4">
          <Link
            href="/contact"
            className="flex items-center justify-between p-3 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all text-xs font-bold text-slate-300"
          >
            <span className="flex items-center gap-2.5">
              <Headphones className="w-4 h-4 text-blue-400" />
              <span>
                Need Help? <br />
                <span className="text-[10px] font-normal text-slate-400">
                  Contact Support
                </span>
              </span>
            </span>
            <ChevronRight className="w-4 h-4 text-slate-500" />
          </Link>
        </div>
      </aside>

      {/* ── MAIN CONTENT AREA ── */}
      <div className="pn-v2-main-content flex-1 flex flex-col min-w-0 min-h-screen bg-[#08101e]">
        {/* ── TOP HEADER BAR (WITH COVER IMAGE BACKGROUND) ── */}
        <header className="relative overflow-hidden min-h-[125px] sm:min-h-[145px] px-4 sm:px-7 py-5 flex items-center justify-between gap-4 border-b border-white/10 bg-[#08101e]">
          {/* Cover Image Backdrop */}
          <img
            src={network.coverImage || DEFAULT_NETWORK_COVER}
            alt=""
            className="absolute inset-0 w-full h-full object-cover object-center pointer-events-none opacity-40"
            onError={(e) => {
              (e.target as HTMLImageElement).src = DEFAULT_NETWORK_COVER;
            }}
          />
          {/* Dark Overlay for readability */}
          <div className="absolute inset-0 bg-gradient-to-r from-[#08101e]/90 via-[#08101e]/75 to-[#08101e]/90 backdrop-blur-[2px] pointer-events-none" />

          {/* Left: Back to Networks & Network Logo / Cover */}
          <div className="flex items-center gap-2.5 sm:gap-3.5 z-10 relative shrink-0">
            <Link
              href="/pro-networks"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-slate-200 hover:text-white font-bold text-xs backdrop-blur-md transition-all border border-white/10 shadow-xs"
              title="Back to all Pro Networks"
            >
              <ChevronLeft className="w-4 h-4 text-slate-300" />
              <span className="hidden sm:inline">Networks</span>
            </Link>
            <NetworkHeaderLogo
              customLogo={network.logoImage}
              coverImage={network.coverImage}
              networkName={network.name}
            />
          </div>

          {/* Center: Network Name, Count & Tagline */}
          <div className="text-center z-10 relative flex-1 min-w-0 px-2 max-w-xl">
            <div className="flex items-center justify-center gap-2 flex-wrap">
              <h1 className="text-lg sm:text-2xl font-black text-white tracking-tight drop-shadow-md truncate">
                {network.name}
              </h1>
              <span className="text-amber-400 text-sm sm:text-base">👑</span>
            </div>
            <div className="flex items-center justify-center gap-2 text-[11px] sm:text-xs text-slate-300 mt-1 font-medium">
              <span className="inline-flex items-center gap-1">
                <Lock className="w-3.5 h-3.5 text-amber-400/80 shrink-0" />
                <span>Private Network</span>
              </span>
              <span>•</span>
              <span>{(network.memberCount || 1).toLocaleString()} {network.memberCount === 1 ? "Member" : "Members"}</span>
            </div>
            {network.tagline && (
              <p className="text-xs text-slate-300/90 mt-1 line-clamp-1 max-w-md mx-auto drop-shadow-sm hidden sm:block">
                {network.tagline}
              </p>
            )}
          </div>

          {/* Right: Actions & User Avatar (Notification Bell removed) */}
          <div className="flex items-center gap-2.5 sm:gap-3 z-10 relative shrink-0">
            {network.isMember || network.isOwner ? (
              <button
                type="button"
                onClick={() => setShowInviteModal(true)}
                className="bg-[#1a56db] hover:bg-blue-600 text-white font-bold text-xs px-3 sm:px-4 py-2 rounded-xl flex items-center gap-1.5 shadow-md transition-all active:scale-95"
              >
                <UserPlus className="w-4 h-4" />
                <span className="hidden sm:inline">Invite Members</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleJoinNetwork}
                className="bg-[#1a56db] hover:bg-blue-600 text-white font-bold text-xs px-3.5 py-2 rounded-xl flex items-center gap-1.5 shadow-md transition-all active:scale-95"
              >
                <Crown className="w-4 h-4 text-amber-300" />
                <span>
                  {network.monthlyPrice > 0
                    ? `Join $${network.monthlyPrice.toFixed(2)}/mo`
                    : "Join for Free"}
                </span>
              </button>
            )}

            {/* More Options Dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowMoreMenu(!showMoreMenu)}
                className="p-2 rounded-xl text-slate-300 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 transition-colors"
                aria-label="More options"
              >
                <MoreHorizontal className="w-5 h-5" />
              </button>
              {showMoreMenu && (
                <div className="absolute right-0 mt-2 w-48 rounded-xl bg-[#0f172a] border border-white/10 p-1.5 text-xs text-slate-200 shadow-xl z-50">
                  <Link
                    href="/pro-networks"
                    className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-white/10 transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    <span>All Pro Networks</span>
                  </Link>
                  <button
                    type="button"
                    onClick={() => {
                      setShowInviteModal(true);
                      setShowMoreMenu(false);
                    }}
                    className="w-full text-left flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-white/10 transition-colors"
                  >
                    <Share2 className="w-4 h-4" />
                    <span>Share Network</span>
                  </button>
                  {canManage && (
                    <button
                      type="button"
                      onClick={() => {
                        setActiveTab("manage");
                        setShowMoreMenu(false);
                      }}
                      className="w-full text-left flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-white/10 transition-colors text-amber-400"
                    >
                      <Settings className="w-4 h-4" />
                      <span>Manage Settings</span>
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Profile Avatar */}
            <div className="relative shrink-0">
              <img
                src={
                  session?.user?.image ||
                  network.owner?.image ||
                  "/pros/tonique-clay.jpg"
                }
                alt={session?.user?.name || network.owner?.name || "User"}
                className="w-9 h-9 rounded-full object-cover ring-2 ring-white/20"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = "/pros/tonique-clay.jpg";
                }}
              />
              <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 rounded-full border border-[#08101e]" />
            </div>
          </div>
        </header>

        {/* ── SUB-NAVIGATION TAB BAR ── */}
        <nav className="pn-v2-subnav">
          <div className="flex items-center gap-1 overflow-x-auto scrollbar-none py-1">
            {[
              { id: "home", label: "Home", icon: Home },
              { id: "discussions", label: "Discussions", icon: MessageSquare },
              { id: "media", label: "Media", icon: Images },
              { id: "resources", label: "Resources", icon: FolderDown },
              { id: "protalks", label: "Pro Talks", icon: Radio },
              { id: "events", label: "Events", icon: Calendar },
              { id: "members", label: "Members", icon: Users },
              { id: "chat", label: "Members Chat", icon: MessagesSquare },
              { id: "shop", label: "Shop", icon: ShoppingBag },
              ...(canManage
                ? [
                    { id: "analytics", label: "Analytics", icon: BarChart2 },
                    { id: "moderation", label: "Moderation", icon: Shield },
                  ]
                : []),
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = currentTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => {
                    setActiveTab(tab.id as any);
                    setSearchQuery("");
                  }}
                  className={`pn-v2-tab-btn ${isActive ? "active" : ""}`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Right: Search Input */}
          <div className="relative hidden md:block">
            <input
              type="text"
              placeholder="Search this network..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-64 pl-3.5 pr-9 py-1.5 rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-black/20 text-xs text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
            />
            <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </nav>

        {/* ── VIEWPORT CONTENT CONTAINER ── */}
        <div className="p-6 flex-1 max-w-[1600px] w-full mx-auto">
          {/* ═════════ TAB 1: HOME (2-COLUMN DASHBOARD) ═════════ */}
          {currentTab === "home" && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* ── LEFT COLUMN (8 cols / ~66%) ── */}
              <div className="lg:col-span-8 space-y-6">
                {/* 1. ANNOUNCEMENT CARD */}
                <div className="pn-v2-card">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-white/5">
                    <div className="flex items-center gap-2">
                      <span className="text-sm">📢</span>
                      <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-white">
                        ANNOUNCEMENT
                      </h3>
                    </div>
                    <button
                      type="button"
                      onClick={() => setActiveTab("discussions")}
                      className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      View All
                    </button>
                  </div>

                  <div className="pt-3">
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                      {announcements[0]?.title || DEFAULT_ANNOUNCEMENT.title}
                    </h4>
                    <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                      {announcements[0]?.content || DEFAULT_ANNOUNCEMENT.content}
                    </p>
                    <div className="text-[11px] text-slate-400 mt-2.5">
                      {announcements[0]?.author?.name ||
                        (typeof announcements[0]?.author === "string"
                          ? announcements[0].author
                          : null) ||
                        network.owner?.name ||
                        DEFAULT_ANNOUNCEMENT.author}{" "}
                      •{" "}
                      {announcements[0]?.createdAt
                        ? new Date(announcements[0].createdAt).toLocaleDateString()
                        : DEFAULT_ANNOUNCEMENT.date}
                    </div>
                  </div>
                </div>

                {/* 2. DISCUSSIONS FEED CARD */}
                <div className="pn-v2-card">
                  <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-white/5">
                    <div className="flex items-center gap-2">
                      <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-white">
                        DISCUSSIONS FEED
                      </h3>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowNewDiscussionModal(true)}
                      className="bg-[#1a56db] hover:bg-blue-700 text-white font-bold text-xs px-3.5 py-1.5 rounded-lg flex items-center gap-1.5 shadow-sm transition-all"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>New Discussion</span>
                    </button>
                  </div>

                  {/* Discussions list */}
                  <div className="divide-y divide-slate-100 dark:divide-white/5">
                    {displayDiscussions.length === 0 ? (
                      <div className="py-8 text-center space-y-2">
                        <MessageSquare className="w-7 h-7 text-slate-400 mx-auto" />
                        <p className="text-xs font-bold text-slate-700 dark:text-slate-300">No discussions posted yet.</p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">Be the first to start a conversation or ask a question.</p>
                        <button
                          type="button"
                          onClick={() => setShowNewDiscussionModal(true)}
                          className="mt-2 bg-[#1a56db] hover:bg-blue-600 text-white font-bold text-xs px-3.5 py-1.5 rounded-lg inline-flex items-center gap-1.5 shadow-xs transition-all active:scale-95"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Start Discussion</span>
                        </button>
                      </div>
                    ) : (
                      displayDiscussions.slice(0, 5).map((disc: any, idx: number) => (
                        <div
                          key={disc.id || idx}
                          onClick={() => setActiveTab("discussions")}
                          className="py-3.5 flex items-center justify-between gap-4 hover:bg-slate-50/80 dark:hover:bg-white/[0.02] px-2 -mx-2 rounded-xl transition-colors cursor-pointer group"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            {disc.isPinned || idx === 0 ? (
                              <Star className="w-4 h-4 text-amber-400 fill-amber-400 shrink-0" />
                            ) : (
                              <span className="w-2 h-2 rounded-full bg-slate-300 dark:bg-slate-600 shrink-0 ml-1 mr-1" />
                            )}
                            <img
                              src={
                                disc.authorImage ||
                                disc.author?.image ||
                                "/pros/tonique-clay.jpg"
                              }
                              alt=""
                              className="w-8 h-8 rounded-full object-cover shrink-0"
                              onError={(e) => {
                                (e.target as HTMLImageElement).src = "/pros/tonique-clay.jpg";
                              }}
                            />
                            <div className="min-w-0">
                              <h5 className="text-xs font-bold text-slate-900 dark:text-white truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                {disc.title}
                              </h5>
                              <div className="text-[11px] text-slate-400 mt-0.5 truncate">
                                Started by {(typeof disc.author === "string" ? disc.author : disc.author?.name) || "Tonique Clay"}{" "}
                                • {disc.replies ?? disc._count?.comments ?? 0} Replies •{" "}
                                {disc.time || "2h ago"}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-3 shrink-0">
                            <div className="flex items-center gap-1 text-slate-400 text-xs">
                              <MessageSquare className="w-3.5 h-3.5" />
                              <span>{disc.replies ?? disc._count?.comments ?? 0}</span>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  <div className="pt-3 border-t border-slate-100 dark:border-white/5 text-center">
                    <button
                      type="button"
                      onClick={() => setActiveTab("discussions")}
                      className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      View All Discussions
                    </button>
                  </div>
                </div>

                {/* 3. MEDIA GALLERY CARD */}
                <div className="pn-v2-card">
                  <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-white/5">
                    <div className="flex items-center gap-2">
                      <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-white">
                        MEDIA GALLERY
                      </h3>
                    </div>
                    <button
                      type="button"
                      onClick={() => setActiveTab("media")}
                      className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      View All
                    </button>
                  </div>

                  {/* Filter pills & navigation arrows */}
                  <div className="flex items-center justify-between py-3">
                    <div className="flex items-center gap-1.5">
                      {(["ALL", "PHOTOS", "VIDEOS", "FILES"] as const).map((filter) => (
                        <button
                          key={filter}
                          type="button"
                          onClick={() => setMediaFilter(filter)}
                          className={`px-3 py-1 rounded-md text-xs font-bold capitalize transition-all ${
                            mediaFilter === filter
                              ? "bg-[#1a56db] text-white shadow-xs"
                              : "bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-white/10"
                          }`}
                        >
                          {filter === "ALL"
                            ? "All"
                            : filter === "PHOTOS"
                            ? "Photos"
                            : filter === "VIDEOS"
                            ? "Videos"
                            : "Files"}
                        </button>
                      ))}
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => scrollMedia("left")}
                        className="pn-v2-carousel-btn"
                        aria-label="Previous"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => scrollMedia("right")}
                        className="pn-v2-carousel-btn"
                        aria-label="Next"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Carousel Cards or Empty State */}
                  {displayMedia.length === 0 ? (
                    <div className="py-8 text-center space-y-2">
                      <Images className="w-8 h-8 text-slate-400 dark:text-slate-500 mx-auto" />
                      <p className="text-xs font-bold text-slate-700 dark:text-slate-300">No media uploaded yet.</p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                        {canManage
                          ? "Share videos, photos, and files with your network members."
                          : "Photos and videos shared in this network will appear here."}
                      </p>
                      {canManage && (
                        <button
                          type="button"
                          onClick={() => setActiveTab("media")}
                          className="mt-1 bg-[#1a56db] hover:bg-blue-600 text-white font-bold text-xs px-3.5 py-1.5 rounded-lg inline-flex items-center gap-1.5 transition-all shadow-xs"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Upload Media</span>
                        </button>
                      )}
                    </div>
                  ) : (
                    <div ref={mediaCarouselRef} className="pn-v2-carousel-track pt-1 pb-2">
                      {displayMedia.map((m: any, idx: number) => (
                        <div
                          key={m.id || idx}
                          onClick={() => setSelectedMediaItem(m)}
                          className="min-w-[190px] max-w-[190px] bg-slate-900 rounded-xl overflow-hidden cursor-pointer group shadow-sm hover:shadow-md transition-all shrink-0"
                        >
                          <div className="relative aspect-video bg-slate-800 overflow-hidden">
                            <img
                              src={m.thumbnailUrl || m.url || "/pros/tonique-clay.jpg"}
                              alt={m.title}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                              onError={(e) => {
                                (e.target as HTMLImageElement).src = "/pros/tonique-clay.jpg";
                              }}
                            />
                            <div className="absolute inset-0 bg-black/35 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                              <div className="w-8 h-8 rounded-full bg-white/40 backdrop-blur-md flex items-center justify-center text-white">
                                <Play className="w-4 h-4 fill-white" />
                              </div>
                            </div>
                            {m.duration && (
                              <span className="absolute bottom-1.5 right-1.5 bg-black/80 text-white text-[10px] font-bold px-1.5 py-0.2 rounded">
                                {m.duration}
                              </span>
                            )}
                          </div>
                          <div className="p-2.5">
                            <h5 className="text-[11px] font-bold text-white truncate">
                              {m.title}
                            </h5>
                            <div className="text-[10px] text-slate-400 mt-0.5">
                              {m.date ||
                                (m.createdAt
                                  ? new Date(m.createdAt).toLocaleDateString()
                                  : "May 2026")}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* ── RIGHT COLUMN (4 cols / ~34%) ── */}
              <div className="lg:col-span-4 space-y-6">
                {/* 1. UPCOMING PRO TALKS CARD */}
                <div className="pn-v2-card">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-white/5">
                    <div className="flex items-center gap-1.5">
                      <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-white">
                        UPCOMING PRO TALKS
                      </h3>
                    </div>
                    <button
                      type="button"
                      onClick={() => setActiveTab("protalks")}
                      className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      View All
                    </button>
                  </div>

                  <div className="pt-2">
                    {displayProTalks.length === 0 ? (
                      <div className="py-7 text-center space-y-2">
                        <Radio className="w-8 h-8 text-slate-400 dark:text-slate-500 mx-auto" />
                        <p className="text-xs font-bold text-slate-700 dark:text-slate-300">No upcoming Pro Talks scheduled.</p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed max-w-xs mx-auto">
                          {canManage
                            ? "Schedule interactive live talk sessions for your members."
                            : "Check back soon for live interactive broadcasts."}
                        </p>
                        {canManage && (
                          <button
                            type="button"
                            onClick={() => setActiveTab("protalks")}
                            className="mt-1 bg-[#1a56db] hover:bg-blue-600 text-white font-bold text-xs px-3.5 py-1.5 rounded-lg inline-flex items-center gap-1.5 transition-all shadow-xs"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Schedule Pro Talk</span>
                          </button>
                        )}
                      </div>
                    ) : (
                      displayProTalks.map((talk: any, idx: number) => (
                        <div
                          key={talk.id || idx}
                          className="p-3.5 rounded-xl border border-slate-100 dark:border-white/5 bg-slate-50/60 dark:bg-white/[0.02] space-y-2.5"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="space-y-1">
                              {talk.isLive || idx === 0 ? (
                                <span className="pn-v2-badge-live">
                                  <span className="pn-v2-pulse-dot" /> LIVE
                                </span>
                              ) : (
                                <div className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center">
                                  <Video className="w-4 h-4" />
                                </div>
                              )}
                              <h4 className="text-xs font-bold text-slate-900 dark:text-white leading-snug">
                                {talk.title}
                              </h4>
                            </div>
                            <img
                              src={talk.speakerImage || "/pros/tonique-clay.jpg"}
                              alt=""
                              className="w-10 h-10 rounded-lg object-cover shrink-0"
                              onError={(e) => {
                                (e.target as HTMLImageElement).src =
                                  "/pros/tonique-clay.jpg";
                              }}
                            />
                          </div>

                          <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
                            <Calendar className="w-3.5 h-3.5 text-slate-400" />
                            <span>{talk.date}</span>
                          </div>

                          <div className="flex items-center justify-between pt-1 border-t border-slate-200/50 dark:border-white/5">
                            <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                              Live on TCP
                            </span>
                            <div className="flex items-center gap-2">
                              {talk.isRegistered || idx === 0 ? (
                                <span className="inline-flex items-center gap-1 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-500/20">
                                  <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                                  <span>You're Registered</span>
                                </span>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => handleToggleEventRsvp(talk.id)}
                                  className="border border-[#1a56db] text-[#1a56db] hover:bg-blue-50 dark:hover:bg-blue-500/10 text-[11px] font-bold px-3 py-1 rounded-lg transition-colors"
                                >
                                  Register
                                </button>
                              )}
                              <button
                                type="button"
                                className="p-1 rounded-lg border border-slate-200 dark:border-white/10 text-slate-500 hover:text-slate-900 dark:hover:text-white"
                                title="Add to Calendar"
                              >
                                <Calendar className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* 2. RECENT RESOURCES CARD */}
                <div className="pn-v2-card">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-white/5">
                    <div className="flex items-center gap-1.5">
                      <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-white">
                        RECENT RESOURCES
                      </h3>
                    </div>
                    <button
                      type="button"
                      onClick={() => setActiveTab("resources")}
                      className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      View All
                    </button>
                  </div>

                  <div className={displayResources.length === 0 ? "pt-1" : "divide-y divide-slate-100 dark:divide-white/5 pt-1"}>
                    {displayResources.length === 0 ? (
                      <div className="py-7 text-center space-y-2">
                        <FolderDown className="w-8 h-8 text-slate-400 dark:text-slate-500 mx-auto" />
                        <p className="text-xs font-bold text-slate-700 dark:text-slate-300">No resources uploaded yet.</p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed max-w-xs mx-auto">
                          {canManage
                            ? "Upload guides, templates, and checklists for your members."
                            : "Downloadable guides and worksheets will be posted here."}
                        </p>
                        {canManage && (
                          <button
                            type="button"
                            onClick={() => setActiveTab("resources")}
                            className="mt-1 bg-[#1a56db] hover:bg-blue-600 text-white font-bold text-xs px-3.5 py-1.5 rounded-lg inline-flex items-center gap-1.5 transition-all shadow-xs"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Upload Resource</span>
                          </button>
                        )}
                      </div>
                    ) : (
                      displayResources.map((res: any, idx: number) => {
                        const isRed =
                          res.color === "red" || (res.fileType === "PDF" && idx === 0);
                        const isGreen = res.color === "green" || res.fileType === "DOCX";
                        const isPurple = res.color === "purple" || res.fileType === "VIDEO";
                        return (
                          <div
                            key={res.id || idx}
                            className="py-3 flex items-center justify-between gap-3 hover:bg-slate-50/80 dark:hover:bg-white/[0.02] px-2 -mx-2 rounded-xl transition-colors"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div
                                className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-[9px] shrink-0 ${
                                  isRed
                                    ? "bg-red-50 text-red-600 border border-red-200"
                                    : isGreen
                                    ? "bg-emerald-50 text-emerald-600 border border-emerald-200"
                                    : isPurple
                                    ? "bg-blue-50 text-blue-600 border border-blue-200"
                                    : "bg-sky-50 text-sky-600 border border-sky-200"
                                }`}
                              >
                                {res.type || res.fileType || "PDF"}
                              </div>
                              <div className="min-w-0">
                                <h5 className="text-xs font-bold text-slate-900 dark:text-white truncate">
                                  {res.title}
                                </h5>
                                <div className="text-[10px] text-slate-400 uppercase font-semibold">
                                  {res.type || res.fileType || "PDF"}
                                </div>
                              </div>
                            </div>

                            <a
                              href={res.fileUrl || "#"}
                              download
                              className="p-1.5 rounded-lg border border-slate-200 dark:border-white/10 text-slate-500 hover:text-blue-600 hover:border-blue-500 transition-colors shrink-0"
                              title="Download Resource"
                            >
                              <Download className="w-3.5 h-3.5" />
                            </a>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* 3. NETWORK MEMBERS CARD */}
                <div className="pn-v2-card">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-white/5">
                    <div className="flex items-center gap-1.5">
                      <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-white">
                        NETWORK MEMBERS ({(network.memberCount || 1246).toLocaleString()})
                      </h3>
                    </div>
                    <button
                      type="button"
                      onClick={() => setActiveTab("members")}
                      className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      View All
                    </button>
                  </div>

                  <div className="divide-y divide-slate-100 dark:divide-white/5 pt-1">
                    {displayMembers.map((m: any, idx: number) => (
                      <div
                        key={m.id || idx}
                        className="py-2.5 flex items-center justify-between gap-3 hover:bg-slate-50/80 dark:hover:bg-white/[0.02] px-2 -mx-2 rounded-xl transition-colors"
                      >
                        <Link
                          href={`/member/${m.user?.profileSlug || m.profileSlug || m.user?.id || m.id}`}
                          className="flex items-center gap-2.5 min-w-0 group"
                          title={`View ${m.name || m.user?.name || "Member"}'s profile`}
                        >
                          <img
                            src={m.image || m.user?.image || "/pros/tonique-clay.jpg"}
                            alt=""
                            className="w-8 h-8 rounded-full object-cover shrink-0 ring-1 ring-white/10 group-hover:ring-amber-400/50 transition-all"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src =
                                "/pros/tonique-clay.jpg";
                            }}
                          />
                          <div className="min-w-0">
                            <h5 className="text-xs font-bold text-slate-900 dark:text-white truncate group-hover:text-blue-400 transition-colors">
                              {m.name || m.user?.name || "Member"}
                            </h5>
                            <div className="text-[10px] text-slate-400 truncate">
                              {m.location || m.user?.location || "Houston, TX"}
                            </div>
                          </div>
                        </Link>

                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-500/20">
                            Active
                          </span>
                          <Link
                            href={`/messages?userId=${m.user?.id || m.id}`}
                            className="p-1.5 rounded-lg border border-slate-200 dark:border-white/10 text-slate-500 hover:text-blue-600 hover:border-blue-500 transition-colors"
                            title="Send Message"
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="pt-3 border-t border-slate-100 dark:border-white/5 text-center">
                    <button
                      type="button"
                      onClick={() => setActiveTab("members")}
                      className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      See All Members
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ═════════ TAB 2: DISCUSSIONS FULL TAB ═════════ */}
          {currentTab === "discussions" &&
            (!network.isMember && !network.isOwner ? (
              renderPaywall(
                "Discussions & Audit Strategy Board",
                "Join to participate in client review discussions, case questions, and audit strategies.",
              )
            ) : (
              <div className="pn-v2-card">
                <NetworkPosts
                  slug={slug}
                  posts={filteredDiscussions}
                  user={session?.user}
                  loading={postsLoading}
                  loadError={postsError}
                  onRetry={fetchPosts}
                  canPost={network.isMember || network.isOwner}
                  searching={Boolean(searchQuery)}
                  onCreated={(post) => {
                    setDiscussions((prev) => [post, ...prev]);
                    setNetwork((prev) =>
                      prev
                        ? {
                            ...prev,
                            _count: {
                              ...prev._count,
                              discussions: prev._count.discussions + 1,
                            },
                          }
                        : prev,
                    );
                  }}
                />
              </div>
            ))}

          {/* ═════════ TAB 3: MEDIA FULL TAB ═════════ */}
          {currentTab === "media" &&
            (!network.isMember && !network.isOwner ? (
              renderPaywall(
                "Media & Video Recordings",
                "Recorded workshops, backstage recaps, and video breakdowns.",
              )
            ) : (
              <div className="pn-v2-card space-y-6">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/10 pb-4">
                  <div>
                    <h3 className="text-lg font-black text-slate-900 dark:text-white">
                      Media &amp; Video Recordings
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Recorded workshops, backstage recaps, and video breakdowns.
                    </p>
                  </div>

                  {canManage && (
                    <button
                      type="button"
                      onClick={() => setShowUploadMediaModal(true)}
                      className="bg-[#1a56db] hover:bg-blue-700 text-white font-black text-xs px-4 py-2.5 rounded-full shadow-md flex items-center gap-1.5"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Upload Media</span>
                    </button>
                  )}
                </div>

                {filteredMedia.length === 0 ? (
                  <div className="text-center py-16 text-xs text-slate-400 space-y-3">
                    <Images className="w-10 h-10 text-slate-400 mx-auto" />
                    <p className="font-bold text-sm">
                      {searchTerm
                        ? "No matches in this section."
                        : "No media files uploaded yet."}
                    </p>
                    {canManage && (
                      <button
                        type="button"
                        onClick={() => setShowUploadMediaModal(true)}
                        className="px-5 py-2.5 rounded-full bg-[#1a56db] text-white font-bold text-xs"
                      >
                        Upload First Video / Photo
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    {filteredMedia.map((item) => (
                      <div
                        key={item.id}
                        onClick={() => setSelectedMediaItem(item)}
                        className="group rounded-2xl overflow-hidden bg-slate-900 cursor-pointer shadow-md hover:shadow-xl transition-all"
                      >
                        <div className="relative h-44 bg-slate-800">
                          {item.thumbnailUrl || (item.type === "PHOTO" && item.url) ? (
                            <img
                              src={item.thumbnailUrl || item.url}
                              alt={item.title}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-slate-800 text-slate-400">
                              <Video className="w-12 h-12" />
                            </div>
                          )}

                          <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                            <div className="w-12 h-12 rounded-full bg-white/30 backdrop-blur-md flex items-center justify-center text-white">
                              <Play className="w-6 h-6 fill-white" />
                            </div>
                          </div>

                          {item.duration && (
                            <span className="absolute bottom-2.5 right-2.5 bg-black/80 text-white text-xs font-black px-2 py-0.5 rounded-lg">
                              {item.duration}
                            </span>
                          )}
                        </div>
                        <div className="p-4 bg-slate-900 text-white">
                          <h4 className="text-xs font-black truncate">{item.title}</h4>
                          <p className="text-[10px] text-slate-400 mt-1">
                            {new Date(item.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}

          {/* ═════════ TAB 4: RESOURCES FULL TAB ═════════ */}
          {currentTab === "resources" &&
            (!network.isMember && !network.isOwner ? (
              renderPaywall(
                "Exclusive Resource Vault",
                "Download proprietary guides, questionnaires, checklists, and templates.",
              )
            ) : (
              <div className="pn-v2-card space-y-6">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/10 pb-4">
                  <div>
                    <h3 className="text-lg font-black text-slate-900 dark:text-white">
                      Exclusive Resource Vault
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Download proprietary guides, questionnaires, checklists, and
                      templates.
                    </p>
                  </div>

                  {canManage && (
                    <button
                      type="button"
                      onClick={() => setShowUploadResourceModal(true)}
                      className="bg-[#1a56db] hover:bg-blue-700 text-white font-black text-xs px-4 py-2.5 rounded-full shadow-md flex items-center gap-1.5"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Upload Resource File</span>
                    </button>
                  )}
                </div>

                {filteredResources.length === 0 ? (
                  <div className="text-center py-16 text-xs text-slate-400 space-y-3">
                    <FolderDown className="w-10 h-10 text-slate-400 mx-auto" />
                    <p className="font-bold text-sm">
                      {searchTerm
                        ? "No matches in this section."
                        : "No resources in the vault yet."}
                    </p>
                    {canManage && (
                      <button
                        type="button"
                        onClick={() => setShowUploadResourceModal(true)}
                        className="px-5 py-2.5 rounded-full bg-[#1a56db] text-white font-bold text-xs"
                      >
                        Upload First Resource File
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {filteredResources.map((item) => (
                      <a
                        key={item.id}
                        href={network.isMember ? item.fileUrl : undefined}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-5 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/5 hover:border-blue-500 transition-all cursor-pointer group flex flex-col justify-between space-y-3"
                      >
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-[10px] font-black uppercase px-2.5 py-1 rounded-lg bg-blue-600/10 text-blue-600 dark:text-blue-400">
                              {item.fileType} {item.fileSize ? `• ${item.fileSize}` : ""}
                            </span>
                            <Download className="w-4 h-4 text-slate-400 group-hover:text-blue-500 transition-colors" />
                          </div>
                          <h4 className="text-sm font-black text-slate-900 dark:text-white group-hover:text-blue-500 transition-colors">
                            {item.title}
                          </h4>
                          {item.description && (
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                              {item.description}
                            </p>
                          )}
                        </div>

                        <div className="text-xs font-bold text-blue-500 pt-2 flex items-center gap-1">
                          <span>Download File</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </div>
                      </a>
                    ))}
                  </div>
                )}
              </div>
            ))}

          {/* ═════════ TAB 5: EVENTS / PRO TALKS ═════════ */}
          {(currentTab === "events" || currentTab === "protalks") &&
            (!network.isMember && !network.isOwner ? (
              renderPaywall("Network events", "Join to attend live events and workshops.")
            ) : (
              <div className="pn-v2-card">
                <NetworkEvents
                  slug={slug}
                  isOwner={canManage}
                  onEventsChange={setEventsList}
                />
              </div>
            ))}

          {/* ═════════ TAB 6: MEMBERS CHAT ═════════ */}
          {currentTab === "chat" &&
            (!network.isMember && !network.isOwner ? (
              renderPaywall(
                "Members Live Chat",
                "Chat in real-time with verified network members.",
              )
            ) : (
              <div className="pn-v2-card overflow-hidden flex flex-col h-[650px] p-0">
                {/* Channel Header Bar */}
                <div className="p-4 bg-slate-100 dark:bg-slate-900/60 border-b border-slate-200 dark:border-white/10 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 overflow-x-auto">
                    {[
                      { id: "general", label: "#general" },
                      { id: "tax-season", label: "#tax-season" },
                      { id: "due-diligence", label: "#due-diligence" },
                      { id: "marketing", label: "#marketing" },
                      { id: "questions-for-owner", label: "#owner-qa" },
                    ].map((ch) => (
                      <button
                        key={ch.id}
                        type="button"
                        onClick={() => setChatChannel(ch.id)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                          chatChannel === ch.id
                            ? "bg-[#1a56db] text-white font-black"
                            : "text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-white/10"
                        }`}
                      >
                        {ch.label}
                      </button>
                    ))}
                  </div>

                  <span className="text-[10px] font-bold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full shrink-0">
                    Active Member Chat
                  </span>
                </div>

                {/* Chat Messages Log */}
                <div className="flex-1 p-6 overflow-y-auto space-y-4">
                  {filteredChat.length === 0 ? (
                    <div className="text-center py-16 text-xs text-slate-400 space-y-2">
                      <MessagesSquare className="w-8 h-8 text-slate-400 mx-auto" />
                      <p className="font-bold">Welcome to the #{chatChannel} channel!</p>
                      <p>Be the first member to say hello.</p>
                    </div>
                  ) : (
                    filteredChat.map((msg) => (
                      <div key={msg.id} className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-300 dark:bg-slate-700 overflow-hidden shrink-0">
                          {msg.sender?.image ? (
                            <img
                              src={msg.sender.image}
                              alt={msg.sender?.name || "Member"}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center font-bold text-xs">
                              {(msg.sender?.name || "M")[0]}
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-black text-slate-900 dark:text-white">
                              {msg.sender?.name || "Member"}
                            </span>
                            <span className="text-[10px] text-slate-400">
                              {new Date(msg.createdAt).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                          </div>
                          <p className="text-xs text-slate-700 dark:text-slate-200 mt-1 leading-relaxed">
                            {msg.content}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Chat Input Bar */}
                <form
                  onSubmit={handleSendChatMessage}
                  className="p-4 bg-slate-50 dark:bg-slate-900/60 border-t border-slate-200 dark:border-white/10 flex items-center gap-2"
                >
                  <input
                    type="text"
                    placeholder={`Message #${chatChannel}...`}
                    value={newChatMessage}
                    onChange={(e) => setNewChatMessage(e.target.value)}
                    className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#121e33] text-xs font-medium focus:outline-none"
                  />
                  <button
                    type="submit"
                    className="p-2.5 rounded-xl bg-[#1a56db] hover:bg-blue-700 text-white shadow-md transition-all shrink-0"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </form>
              </div>
            ))}

          {/* ═════════ TAB 7: MEMBERS DIRECTORY ═════════ */}
          {currentTab === "members" &&
            (!network.isMember && !network.isOwner ? (
              renderPaywall(
                "Members Directory",
                "Connect and collaborate directly with fellow network members.",
              )
            ) : (
              <div className="pn-v2-card space-y-6">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/10 pb-4 flex-wrap gap-3">
                  <div>
                    <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                      <Users className="w-5 h-5 text-amber-500" />
                      <span>
                        Network Member Directory ({(network.memberCount ?? 0).toLocaleString()})
                      </span>
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Connect, hover, and collaborate directly with fellow network
                      members.
                    </p>
                  </div>

                  {/* View Switcher */}
                  <div className="flex items-center p-1 rounded-xl bg-slate-100 dark:bg-white/10 text-xs font-bold">
                    <button
                      type="button"
                      onClick={() => setMemberViewMode("bubble")}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                        memberViewMode === "bubble"
                          ? "bg-amber-400 text-[#0a1628] font-black shadow-xs"
                          : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
                      }`}
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Bubble Galaxy</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setMemberViewMode("grid")}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                        memberViewMode === "grid"
                          ? "bg-amber-400 text-[#0a1628] font-black shadow-xs"
                          : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
                      }`}
                    >
                      <LayoutGrid className="w-3.5 h-3.5" />
                      <span>Directory Grid</span>
                    </button>
                  </div>
                </div>

                <ProfessionalTitleEditor
                  onSaved={() => {
                    fetch(`/api/pro-networks/${slug}/members`)
                      .then((r) => r.json())
                      .then((data) => setMembersList(data.members || []))
                      .catch(() => {});
                  }}
                />

                {memberViewMode === "bubble" ? (
                  <MemberBubbleCloud
                    members={filteredMembers}
                    networkName={network.name}
                    isOwner={network.isOwner}
                    onInviteClick={() => setShowInviteModal(true)}
                  />
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    {filteredMembers.map((m) => {
                      const profileUrl = `/member/${m.user.profileSlug || m.user.id}`;
                      return (
                        <div
                          key={m.id}
                          className="p-4 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/5 flex items-center justify-between gap-3 shadow-sm hover:border-amber-400/30 transition-all"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <Link
                              href={profileUrl}
                              className="w-11 h-11 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden ring-2 ring-amber-400/30 shrink-0 block hover:opacity-90 transition-opacity"
                              title={`View ${m.user.name}'s public profile`}
                            >
                              {m.user.image ? (
                                <img
                                  src={m.user.image}
                                  alt={m.user.name}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center font-black text-sm text-amber-400">
                                  {m.user.name ? m.user.name[0].toUpperCase() : "?"}
                                </div>
                              )}
                            </Link>
                            <div className="min-w-0">
                              <Link
                                href={profileUrl}
                                className="text-xs font-black text-slate-900 dark:text-white truncate flex items-center gap-1 hover:text-amber-400 transition-colors"
                                title={`View ${m.user.name}'s public profile`}
                              >
                                <span>{m.user.name}</span>
                                {m.role.toUpperCase() === "OWNER" && (
                                  <Crown className="w-3 h-3 text-amber-400 fill-amber-400 shrink-0" />
                                )}
                              </Link>
                              <p className="text-[10px] text-slate-400 truncate">
                                {m.user.professionalTitle ||
                                  m.user.headline ||
                                  m.user.location ||
                                  "Tax Professional"}
                              </p>
                              <span
                                className={`text-[9px] font-bold px-1.5 py-0.2 rounded mt-1 inline-block ${
                                  m.role.toUpperCase() === "OWNER"
                                    ? "text-amber-500 bg-amber-500/10"
                                    : "text-blue-500 bg-blue-500/10"
                                }`}
                              >
                                {m.role}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            <Link
                              href={`/messages?userId=${m.user.id}`}
                              className="p-2 rounded-xl bg-blue-600/10 hover:bg-blue-600 text-blue-600 hover:text-white transition-colors"
                              title="Send Direct Message"
                            >
                              <MessageCircle className="w-4 h-4" />
                            </Link>
                            <Link
                              href={profileUrl}
                              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition-colors border border-white/5"
                              title="View Public Profile"
                            >
                              <ExternalLink className="w-4 h-4" />
                            </Link>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}

          {/* ═════════ TAB 8: OWNER MANAGEMENT DASHBOARD ═════════ */}
          {currentTab === "manage" && canManage && (
            <div className="pn-v2-card space-y-6">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/10 pb-4">
                <div>
                  <h3 className="text-lg font-black text-slate-900 dark:text-white">
                    Network Owner Management Dashboard
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Track members, subscription earnings (0% TCP fee), and upload exclusive
                    content.
                  </p>
                </div>
              </div>

              {/* Key Metrics Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/5 space-y-1">
                  <span className="text-xs text-slate-400 font-bold">Total Members</span>
                  <div className="text-2xl font-black text-slate-900 dark:text-white">
                    {(network.memberCount ?? 0).toLocaleString()}
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/5 space-y-1">
                  <span className="text-xs text-slate-400 font-bold">Monthly Revenue</span>
                  <div className="text-2xl font-black text-emerald-500">
                    $
                    {(((network.memberCount ?? 0) * (network.monthlyPrice ?? 0))).toLocaleString("en-US", {
                      minimumFractionDigits: 2,
                    })}
                  </div>
                  <span className="text-[10px] text-emerald-600 font-bold">
                    0% TCP Fee Deducted
                  </span>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/5 space-y-1">
                  <span className="text-xs text-slate-400 font-bold">Total Followers</span>
                  <div className="text-2xl font-black text-slate-900 dark:text-white">
                    {(network.followerCount ?? 0).toLocaleString()}
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/5 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-400 font-bold">Monthly Price</span>
                    <button
                      type="button"
                      onClick={openEditPricingModal}
                      className="text-[11px] font-bold text-amber-500 hover:text-amber-400 inline-flex items-center gap-1 hover:underline"
                    >
                      <Pencil className="w-3 h-3" />
                      <span>Edit</span>
                    </button>
                  </div>
                  <div className="text-2xl font-black text-amber-500">
                    {network.monthlyPrice <= 0
                      ? "FREE"
                      : `$${network.monthlyPrice.toFixed(2)}/mo`}
                  </div>
                </div>
              </div>

              {/* Pricing Success Alert */}
              {pricingSuccessMsg && (
                <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-xs font-bold flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span>{pricingSuccessMsg}</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setPricingSuccessMsg("")}
                    className="text-emerald-600 hover:text-emerald-800 p-1"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              <NetworkDetailsSettings
                slug={slug}
                initial={{
                  name: network.name,
                  tagline: network.tagline,
                  description: network.description,
                  rules: network.rules,
                  welcomeMessage: network.welcomeMessage,
                }}
                onSaved={(details) =>
                  setNetwork((prev) => (prev ? { ...prev, ...details } : prev))
                }
              />

              <NetworkBranding
                slug={slug}
                initial={{
                  accentColor: network.accentColor || "#1a56db",
                  logoImage: network.logoImage,
                  coverImage: network.coverImage,
                }}
                onSaved={(branding) =>
                  setNetwork((prev) => (prev ? { ...prev, ...branding } : prev))
                }
              />

              {/* Pricing Model Settings */}
              <div className="bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl p-6 space-y-4">
                <div className="flex items-start sm:items-center justify-between gap-4 flex-col sm:flex-row border-b border-slate-200/60 dark:border-white/10 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-400/15 flex items-center justify-center shrink-0">
                      <DollarSign className="w-5 h-5 text-amber-500" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-black text-slate-900 dark:text-white text-base">
                          Network Pricing &amp; Membership Model
                        </h4>
                        <span
                          className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
                            network.monthlyPrice <= 0
                              ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                              : "bg-amber-400/15 text-amber-700 dark:text-amber-300"
                          }`}
                        >
                          {network.monthlyPrice <= 0
                            ? "Active: Free Network"
                            : `Active: $${network.monthlyPrice.toFixed(2)} / month`}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        Set your membership dues or make this Pro Network free to join
                        anytime.
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={openEditPricingModal}
                    className="inline-flex items-center gap-2 bg-[#1a56db] hover:bg-blue-700 text-white font-black text-xs px-5 py-2.5 rounded-xl transition-all shadow-md shrink-0"
                  >
                    <Pencil className="w-4 h-4" />
                    <span>Change Network Pricing</span>
                  </button>
                </div>
              </div>

              {/* Host Stripe Connect Card */}
              <div className="bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl p-6 space-y-5">
                <div className="flex items-start sm:items-center justify-between gap-4 flex-col sm:flex-row border-b border-slate-200/60 dark:border-white/10 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#6772e5]/15 flex items-center justify-center shrink-0">
                      <svg viewBox="0 0 24 24" className="w-5 h-5 fill-[#6772e5]">
                        <path d="M13.976 9.15c-2.172-.806-3.356-1.426-3.356-2.409 0-.831.683-1.305 1.901-1.305 2.227 0 4.515.858 6.09 1.631l.89-5.494C18.252.975 15.697 0 12.165 0 9.667 0 7.589.654 6.104 1.872 4.56 3.147 3.757 4.992 3.757 7.218c0 4.039 2.467 5.76 6.476 7.219 2.585.92 3.445 1.574 3.445 2.583 0 .98-.84 1.545-2.354 1.545-1.875 0-4.965-.921-6.99-2.109l-.9 5.555C5.175 22.99 8.385 24 11.714 24c2.641 0 4.843-.624 6.328-1.813 1.664-1.305 2.525-3.236 2.525-5.732 0-4.128-2.524-5.851-6.591-7.305z" />
                      </svg>
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-black text-slate-900 dark:text-white text-base">
                          Host Stripe Connect Account
                        </h4>
                        {stripeStatus?.connected && stripeStatus?.onboarded ? (
                          <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10 px-2.5 py-0.5 rounded-full">
                            <CheckCircle2 className="w-3 h-3" /> Connected &amp; Active
                          </span>
                        ) : stripeStatus?.connected && !stripeStatus?.onboarded ? (
                          <span className="flex items-center gap-1 text-[11px] font-bold text-amber-600 bg-amber-50 dark:bg-amber-500/10 px-2.5 py-0.5 rounded-full">
                            <AlertCircle className="w-3 h-3" /> Incomplete Onboarding
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-[11px] font-bold text-rose-600 bg-rose-50 dark:bg-rose-500/10 px-2.5 py-0.5 rounded-full">
                            <AlertCircle className="w-3 h-3" /> Not Connected
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        Receive member subscription payments directly; Stripe processing
                        fees are deducted from your account (0% TCP platform cut).
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 flex-wrap pt-1">
                  {!stripeStatus?.connected ? (
                    <button
                      type="button"
                      onClick={handleConnectStripe}
                      disabled={connectingStripe}
                      className="inline-flex items-center gap-2 bg-[#6772e5] hover:bg-[#5469d4] text-white font-black text-xs px-5 py-2.5 rounded-xl transition-all shadow-md disabled:opacity-60"
                    >
                      {connectingStripe ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <ExternalLink className="w-4 h-4" />
                      )}
                      <span>
                        {connectingStripe ? "Connecting..." : "Connect Stripe Account"}
                      </span>
                    </button>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={handleDisconnectStripe}
                        disabled={disconnectingStripe}
                        className="inline-flex items-center gap-2 text-rose-500 bg-rose-50 dark:bg-rose-500/10 hover:bg-rose-100 font-bold text-xs px-4 py-2.5 rounded-xl transition-all disabled:opacity-60"
                      >
                        {disconnectingStripe && (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        )}
                        <span>Disconnect Stripe</span>
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Danger Zone: Delete Pro Network */}
              <div className="bg-rose-500/5 border border-rose-500/20 rounded-2xl p-6 space-y-4">
                <div className="flex items-start sm:items-center justify-between gap-4 flex-col sm:flex-row border-b border-rose-500/10 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-rose-500/15 border border-rose-500/20 flex items-center justify-center shrink-0">
                      <Trash2 className="w-5 h-5 text-rose-500" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-black text-rose-600 dark:text-rose-400 text-base">
                          Danger Zone: Delete Pro Network
                        </h4>
                        <span className="text-[10px] font-black uppercase tracking-wider bg-rose-500/15 text-rose-600 dark:text-rose-400 px-2 py-0.5 rounded-md">
                          Permanent
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        Permanently delete this Pro Network, including all member subscriptions, discussions, media files, resources, and live talk events. This action is irreversible.
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setDeleteConfirmInput("");
                      setDeleteError("");
                      setShowDeleteModal(true);
                    }}
                    className="inline-flex items-center gap-2 bg-rose-600 hover:bg-rose-700 text-white font-black text-xs px-5 py-2.5 rounded-xl transition-all shadow-md shrink-0 hover:scale-[1.02] active:scale-[0.98]"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Delete Network</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ═════════ TAB 9: ANALYTICS DASHBOARD (Admins & Owners) ═════════ */}
          {currentTab === "analytics" && canManage && (
            <NetworkAnalytics
              network={network}
              discussions={discussions}
              membersList={membersList}
              resourcesList={resourcesList}
              eventsList={eventsList}
              mediaList={mediaList}
              chatMessages={chatMessages}
            />
          )}

          {/* ═════════ TAB 10: MODERATION SUITE (Admins & Owners) ═════════ */}
          {currentTab === "moderation" && canManage && (
            <NetworkModeration
              slug={slug}
              network={network}
              discussions={discussions}
              membersList={membersList}
              onDiscussionRemoved={(id) => {
                setDiscussions((prev) => prev.filter((d) => d.id !== id));
              }}
              onMemberUpdated={(memberId, updates) => {
                setMembersList((prev) =>
                  prev.map((m) =>
                    m.id === memberId || m.user?.id === memberId ? { ...m, ...updates } : m
                  )
                );
              }}
            />
          )}

          {/* ═════════ TAB 11: SHOP STOREFRONT ═════════ */}
          {currentTab === "shop" && (
            <NetworkShop
              slug={slug}
              network={network}
              currentUser={currentUser}
            />
          )}
        </div>
      </div>

      {/* ── FLOATING ACTION BUTTON (+ New Post) ── */}
      <button
        type="button"
        onClick={() => setShowNewDiscussionModal(true)}
        className="pn-v2-fab"
        title="Create New Post"
      >
        <Pencil className="w-4 h-4" />
        <span>+ New Post</span>
      </button>

      {/* ── MODAL: Create New Discussion / Post ── */}
      {showNewDiscussionModal && (
        <div className="pn-modal fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-white dark:bg-[#172135] border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/10 pb-3">
              <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-blue-500" />
                <span>Start a New Discussion</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowNewDiscussionModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateDiscussion} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Discussion Topic / Title *
                </label>
                <input
                  type="text"
                  placeholder="e.g. IRS Appeals: What tax pros need to know"
                  value={newDiscussionTitle}
                  onChange={(e) => setNewDiscussionTitle(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold bg-slate-50 dark:bg-black/20"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Details &amp; Context
                </label>
                <textarea
                  rows={4}
                  placeholder="Share your thoughts, ask a question, or provide audit insights..."
                  value={newDiscussionContent}
                  onChange={(e) => setNewDiscussionContent(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-medium bg-slate-50 dark:bg-black/20"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNewDiscussionModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-white/5"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingDiscussion}
                  className="px-5 py-2.5 rounded-xl bg-[#1a56db] text-white text-xs font-black hover:bg-blue-600 disabled:opacity-50 flex items-center gap-2 shadow-md"
                >
                  {creatingDiscussion ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Posting...</span>
                    </>
                  ) : (
                    <span>Post Discussion</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: Upload Media (Cloudinary) ── */}
      {showUploadMediaModal && (
        <div className="pn-modal fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-white dark:bg-[#172135] border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/10 pb-3">
              <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                <Video className="w-5 h-5 text-blue-500" />
                <span>Upload Media / Video to Gallery</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowUploadMediaModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUploadMedia} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Title *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Tax Season Preparation Breakdown"
                  value={mediaTitle}
                  onChange={(e) => setMediaTitle(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Media Type
                  </label>
                  <select
                    value={mediaType}
                    onChange={(e) => setMediaType(e.target.value as any)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold"
                  >
                    <option value="VIDEO">Video</option>
                    <option value="PHOTO">Photo</option>
                    <option value="AUDIO">Audio</option>
                    <option value="FILE">File</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Duration (e.g. 12:45)
                  </label>
                  <input
                    type="text"
                    placeholder="12:45"
                    value={mediaDuration}
                    onChange={(e) => setMediaDuration(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Select Video or Media File (Cloudinary) *
                </label>
                <p className="text-[11px] text-slate-400 mb-1.5">Images: up to 1920 × 1080 px • Videos: MP4, WebM up to 100 MB</p>
                <input
                  type="file"
                  accept="video/*,image/*,audio/*"
                  onChange={(e) => setMediaFile(e.target.files?.[0] || null)}
                  className="w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-black file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Custom Video Thumbnail Image (Optional)
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setMediaThumbnailFile(e.target.files?.[0] || null)}
                  className="w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-black file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200"
                />
                <p className="text-[11px] text-slate-400 mt-1">Recommended: 1280 × 720 px (16:9 ratio) • JPG, PNG, or WebP up to 5 MB</p>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowUploadMediaModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 dark:text-slate-400"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploadingMedia}
                  className="px-5 py-2.5 rounded-xl bg-[#1a56db] text-white text-xs font-black hover:bg-blue-600 disabled:opacity-50 flex items-center gap-2"
                >
                  {uploadingMedia ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Uploading to Cloudinary...</span>
                    </>
                  ) : (
                    <span>Upload to Gallery</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: Upload Resource (Cloudinary) ── */}
      {showUploadResourceModal && (
        <div className="pn-modal fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-white dark:bg-[#172135] border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/10 pb-3">
              <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                <FolderDown className="w-5 h-5 text-emerald-500" />
                <span>Upload Document / Template to Vault</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowUploadResourceModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUploadResource} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Resource Title *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Schedule C Audit Workpaper Template"
                  value={resourceTitle}
                  onChange={(e) => setResourceTitle(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  File Format
                </label>
                <select
                  value={resourceFileType}
                  onChange={(e) => setResourceFileType(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold"
                >
                  <option value="PDF">PDF Guide</option>
                  <option value="DOCX">DOCX Template</option>
                  <option value="XLSX">Excel Spreadsheet</option>
                  <option value="ZIP">ZIP Bundle</option>
                  <option value="VIDEO">Video Masterclass</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Description
                </label>
                <textarea
                  rows={2}
                  placeholder="Brief description of this resource for members..."
                  value={resourceDesc}
                  onChange={(e) => setResourceDesc(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Select Document File (Cloudinary) *
                </label>
                <input
                  type="file"
                  onChange={(e) => setResourceFile(e.target.files?.[0] || null)}
                  className="w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-black file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100"
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowUploadResourceModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 dark:text-slate-400"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploadingResource}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 text-white text-xs font-black hover:bg-emerald-500 disabled:opacity-50 flex items-center gap-2"
                >
                  {uploadingResource ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Uploading to Vault...</span>
                    </>
                  ) : (
                    <span>Add to Resource Vault</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: Host / Schedule Pro Talk ── */}
      {showHostProTalkModal && (
        <div className="pn-modal fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-white dark:bg-[#172135] border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/10 pb-3">
              <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                <Radio className="w-5 h-5 text-rose-500" />
                <span>Host / Schedule TCP Pro Talk</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowHostProTalkModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleHostProTalk} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Pro Talk Session Title *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Entity Selection Strategies That Save Thousands"
                  value={proTalkTitle}
                  onChange={(e) => setProTalkTitle(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Description / Topics
                </label>
                <textarea
                  rows={2}
                  placeholder="What will be covered in this live session..."
                  value={proTalkDesc}
                  onChange={(e) => setProTalkDesc(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-medium"
                />
              </div>

              <div className="flex items-center gap-4 bg-slate-50 dark:bg-slate-800/60 p-3 rounded-2xl">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="talkTiming"
                    checked={isGoLiveImmediate}
                    onChange={() => setIsGoLiveImmediate(true)}
                    className="accent-rose-500"
                  />
                  <span className="text-xs font-black text-slate-900 dark:text-white">
                    🔴 Start Live Room Now
                  </span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="talkTiming"
                    checked={!isGoLiveImmediate}
                    onChange={() => setIsGoLiveImmediate(false)}
                    className="accent-rose-500"
                  />
                  <span className="text-xs font-bold text-slate-600 dark:text-slate-300">
                    📅 Schedule for Later
                  </span>
                </label>
              </div>

              {!isGoLiveImmediate && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Scheduled Date &amp; Time
                  </label>
                  <input
                    type="datetime-local"
                    value={proTalkScheduleDate}
                    onChange={(e) => setProTalkScheduleDate(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold"
                    required
                  />
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowHostProTalkModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 dark:text-slate-400"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingProTalk}
                  className="px-6 py-2.5 rounded-xl bg-rose-600 text-white text-xs font-black hover:bg-rose-500 disabled:opacity-50 flex items-center gap-2"
                >
                  {creatingProTalk ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Creating Pro Talk...</span>
                    </>
                  ) : (
                    <span>
                      {isGoLiveImmediate ? "Launch Live Room Now" : "Schedule Pro Talk"}
                    </span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: Invite Members ── */}
      {showInviteModal && (
        <div className="pn-modal fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-white dark:bg-[#172135] border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4 text-center">
            <div className="w-12 h-12 rounded-2xl bg-blue-600/20 text-blue-500 mx-auto flex items-center justify-center">
              <UserPlus className="w-6 h-6" />
            </div>

            <h3 className="text-lg font-black text-slate-900 dark:text-white">
              Invite Professionals to {network.name}
            </h3>

            <p className="text-xs text-slate-500 dark:text-slate-400">
              Share your direct network link to enroll colleagues and practitioners.
            </p>

            <div className="flex gap-2">
              <input
                type="text"
                readOnly
                value={typeof window !== "undefined" ? window.location.href : ""}
                className="flex-1 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-300 select-all"
              />
              <button
                type="button"
                onClick={handleCopyInviteLink}
                className="px-4 py-2 rounded-xl bg-[#1a56db] text-white font-black text-xs shrink-0 hover:bg-blue-600"
              >
                {copiedLink ? "Copied!" : "Copy Link"}
              </button>
            </div>

            <button
              type="button"
              onClick={() => setShowInviteModal(false)}
              className="text-xs font-bold text-slate-400 hover:text-slate-600 pt-2"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* ── MODAL: Media Video Player / Photo Viewer ── */}
      {selectedMediaItem && (
        <div className="pn-modal fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="bg-[#0f1a2e] border border-white/15 rounded-3xl p-6 max-w-3xl w-full shadow-2xl space-y-4 text-white">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-base font-black truncate">{selectedMediaItem.title}</h3>
              <button
                type="button"
                onClick={() => setSelectedMediaItem(null)}
                className="p-1 text-white/60 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="relative aspect-video rounded-2xl overflow-hidden bg-black flex items-center justify-center">
              {selectedMediaItem.url ? (
                selectedMediaItem.type === "PHOTO" ? (
                  <img
                    src={selectedMediaItem.url}
                    alt={selectedMediaItem.title}
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <video
                    src={selectedMediaItem.url}
                    controls
                    autoPlay
                    className="w-full h-full object-contain"
                  />
                )
              ) : (
                <div className="text-center p-8 space-y-2">
                  <Lock className="w-8 h-8 text-amber-400 mx-auto" />
                  <p className="font-black text-sm">Members Only Content</p>
                  <p className="text-xs text-slate-400">
                    Join this Pro Network to stream full videos.
                  </p>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between text-xs text-slate-400 pt-2">
              <span>
                {selectedMediaItem.duration
                  ? `Duration: ${selectedMediaItem.duration}`
                  : "Media Vault"}
              </span>
              <button
                type="button"
                onClick={() => setSelectedMediaItem(null)}
                className="px-4 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs"
              >
                Close Viewer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: Update Network Pricing ── */}
      {showEditPricingModal && (
        <div className="pn-modal fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-white dark:bg-[#172135] border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/10 pb-4">
              <div>
                <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-amber-500" />
                  <span>Update Network Pricing</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Change your monthly dues or make your Pro Network completely free.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowEditPricingModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                Choose Access &amp; Pricing Model
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setEditPriceType("free");
                    setEditMonthlyPrice("0");
                  }}
                  className={`p-4 rounded-2xl border text-left transition-all ${
                    editPriceType === "free"
                      ? "border-emerald-500 bg-emerald-500/10 dark:bg-emerald-500/15 ring-2 ring-emerald-500/30"
                      : "border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 bg-white dark:bg-[#1a263d]"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="inline-flex items-center gap-1.5 text-xs font-black text-emerald-600 dark:text-emerald-400">
                      <Sparkles className="w-4 h-4 text-emerald-500" />
                      <span>Free Network</span>
                    </span>
                    <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-700 dark:text-emerald-300">
                      $0 / mo
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                    100% free. Members join instantly without entering payment information.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setEditPriceType("paid");
                    if (parseFloat(editMonthlyPrice || "0") <= 0) {
                      setEditMonthlyPrice("19.99");
                    }
                  }}
                  className={`p-4 rounded-2xl border text-left transition-all ${
                    editPriceType === "paid"
                      ? "border-amber-400 bg-amber-400/10 dark:bg-amber-400/15 ring-2 ring-amber-400/30"
                      : "border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 bg-white dark:bg-[#1a263d]"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="inline-flex items-center gap-1.5 text-xs font-black text-amber-500 dark:text-amber-400">
                      <Crown className="w-4 h-4 text-amber-400" />
                      <span>Paid Dues</span>
                    </span>
                    <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-800 dark:text-amber-300">
                      Custom Price
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                    Set recurring dues. 0% platform fee — 100% direct payouts via Stripe.
                  </p>
                </button>
              </div>

              {editPriceType === "paid" ? (
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#121e33] border border-slate-200 dark:border-slate-700 space-y-3">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Monthly Member Dues ($ USD / month)
                    </label>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {["9.99", "19.99", "29.99", "49.99", "99.00"].map((preset) => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => setEditMonthlyPrice(preset)}
                          className={`px-2 py-1 rounded-lg text-[10px] font-bold transition-all ${
                            editMonthlyPrice === preset
                              ? "bg-amber-400 text-[#0a1628] font-black shadow-xs"
                              : "bg-white dark:bg-white/5 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100"
                          }`}
                        >
                          ${preset}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-slate-400">
                      $
                    </span>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      placeholder="e.g. 29.99"
                      value={editMonthlyPrice}
                      onChange={(e) => {
                        const val = e.target.value;
                        setEditMonthlyPrice(val);
                        if (parseFloat(val) <= 0) {
                          setEditPriceType("free");
                        }
                      }}
                      className="w-full pl-8 pr-16 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 font-black text-sm text-slate-900 dark:text-white bg-white dark:bg-[#1a263d]"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                      USD / mo
                    </span>
                  </div>
                </div>
              ) : (
                <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-xs space-y-1">
                  <div className="flex items-center gap-2 font-bold">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span>Free Network Membership ($0.00 / month)</span>
                  </div>
                  <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
                    Existing and new members will have instant access to your private
                    board and resources without requiring payment.
                  </p>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100 dark:border-white/10">
              <button
                type="button"
                onClick={() => setShowEditPricingModal(false)}
                disabled={savingPrice}
                className="px-5 py-2.5 rounded-full border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 transition-all"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSavePricing}
                disabled={savingPrice}
                className="px-6 py-2.5 rounded-full bg-gradient-to-r from-amber-400 to-amber-500 text-[#0a1628] font-black text-xs hover:from-amber-300 hover:to-amber-400 shadow-md hover:scale-105 active:scale-95 disabled:opacity-50 inline-flex items-center gap-2"
              >
                {savingPrice ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Saving Pricing...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Save Pricing Changes</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Network Confirmation Modal */}
      {showDeleteModal && network && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="bg-white dark:bg-[#0c1628] border border-rose-500/30 rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl space-y-5 relative">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-rose-500/15 border border-rose-500/20 flex items-center justify-center shrink-0">
                  <Trash2 className="w-6 h-6 text-rose-500" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900 dark:text-white">
                    Delete Pro Network?
                  </h3>
                  <p className="text-xs text-rose-500 font-bold">
                    This action is permanent and cannot be reversed.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (!isDeletingNetwork) setShowDeleteModal(false);
                }}
                disabled={isDeletingNetwork}
                className="text-slate-400 hover:text-slate-200 p-1.5 rounded-lg hover:bg-white/5 transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-600 dark:text-slate-300 leading-relaxed bg-rose-500/5 border border-rose-500/10 rounded-2xl p-4">
              <p className="font-semibold text-slate-800 dark:text-slate-200">
                You are about to permanently delete <span className="font-black text-rose-500 underline">{network.name}</span>.
              </p>
              <ul className="space-y-1.5 text-[11px] text-slate-500 dark:text-slate-400 list-disc list-inside">
                <li>All member subscriptions and access will be cancelled</li>
                <li>All community discussions, questions & comments will be erased</li>
                <li>All uploaded videos, photos, and resource documents will be deleted</li>
                <li>All scheduled Pro Talks & calendar events will be removed</li>
                <li>The network hub URL will become inaccessible</li>
              </ul>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                Please type <span className="font-black text-rose-500 select-all">{network.name}</span> or <span className="font-black text-rose-500">delete</span> to confirm:
              </label>
              <input
                type="text"
                placeholder={network.name}
                value={deleteConfirmInput}
                onChange={(e) => setDeleteConfirmInput(e.target.value)}
                disabled={isDeletingNetwork}
                className="w-full px-4 py-2.5 rounded-xl border border-rose-500/30 bg-white dark:bg-[#162238] text-slate-900 dark:text-white text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-rose-500 transition-all"
              />
            </div>

            {deleteError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{deleteError}</span>
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-white/10">
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                disabled={isDeletingNetwork}
                className="px-5 py-2.5 rounded-xl border border-slate-300 dark:border-white/10 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 transition-all"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteNetwork}
                disabled={
                  (deleteConfirmInput.trim().toLowerCase() !== network.name.trim().toLowerCase() &&
                   deleteConfirmInput.trim().toLowerCase() !== "delete") ||
                  isDeletingNetwork
                }
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-black text-xs transition-all shadow-lg shadow-rose-600/20 disabled:opacity-40 disabled:cursor-not-allowed inline-flex items-center gap-2"
              >
                {isDeletingNetwork ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Deleting Network...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    <span>Permanently Delete Network</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

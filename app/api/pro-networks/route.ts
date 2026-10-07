import Stripe from "stripe";
import { requireDirectChargeAccount } from "@/lib/stripe-direct-connect";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { networkAccessWhere } from "@/lib/networkAccess";
import { auth } from "@/lib/auth";

// GET /api/pro-networks - List and filter discoverable networks
export async function GET(req: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: req.headers });
    const { searchParams } = new URL(req.url);

    const query = searchParams.get("q") || "";
    const category = searchParams.get("category") || "";
    const filter = searchParams.get("filter") || "all"; // all, mine, joined, following

    const where: Record<string, unknown> = {
      isPublished: true,
    };

    if (query) {
      where.OR = [
        { name: { contains: query, mode: "insensitive" } },
        { tagline: { contains: query, mode: "insensitive" } },
        { description: { contains: query, mode: "insensitive" } },
        { owner: { name: { contains: query, mode: "insensitive" } } },
      ];
    }

    if (category && category !== "All") {
      where.category = category;
    }

    if (filter !== "all" && !session?.user?.id) return NextResponse.json({ networks: [] });
    if (session?.user?.id) {
      const userId = session.user.id;
      if (filter === "mine") {
        delete where.isPublished;
        where.AND = [{ OR: [{ ownerId: userId }, { members: { some: networkAccessWhere(userId) } }] }];
      } else if (filter === "joined") {
        where.members = {
          some: networkAccessWhere(userId),
        };
      } else if (filter === "following") {
        where.followers = {
          some: {
            userId,
          },
        };
      }
    }

    const networks = await prisma.proNetwork.findMany({
      where,
      orderBy: [{ memberCount: "desc" }, { createdAt: "desc" }],
      include: {
        members: {
          where: {
            showInDirectory: true,
            OR: [
              { status: "ACTIVE", OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] },
              { status: "CANCELED", expiresAt: { gt: new Date() } },
            ],
          },
          orderBy: [{ joinedAt: "asc" }, { id: "asc" }],
          take: 4,
          select: { user: { select: { id: true, name: true, image: true } } },
        },
        owner: {
          select: {
            id: true,
            name: true,
            image: true,
            role: true,
            tier: true,
            headline: true,
            digitalCard: {
              select: {
                username: true,
              },
            },
          },
        },
        _count: {
          select: {
            members: true,
            followers: true,
            discussions: true,
            resources: true,
            media: true,
            events: true,
          },
        },
      },
    });

    // Check current user's membership and follow status for each network
    let userMemberships: Set<string> = new Set();
    let userFollows: Set<string> = new Set();

    if (session?.user?.id) {
      const [members, follows] = await Promise.all([
        prisma.proNetworkMember.findMany({
          where: networkAccessWhere(session.user.id),
          select: { networkId: true },
        }),
        prisma.proNetworkFollower.findMany({
          where: { userId: session.user.id },
          select: { networkId: true },
        }),
      ]);

      userMemberships = new Set(members.map((m) => m.networkId));
      userFollows = new Set(follows.map((f) => f.networkId));
    }

    const formattedNetworks = networks.map(({ members, ...net }) => ({
      ...net,
      memberPreviews: members.map(({ user }) => user),
      isOwner: session?.user?.id === net.ownerId,
      isMember: userMemberships.has(net.id) || session?.user?.id === net.ownerId,
      isFollowing: userFollows.has(net.id),
    }));

    return NextResponse.json({ networks: formattedNetworks });
  } catch (error) {
    console.error("Failed to fetch Pro Networks:", error);
    return NextResponse.json({ error: "Failed to fetch networks" }, { status: 500 });
  }
}

// POST /api/pro-networks - Create a new Pro Network
export async function POST(req: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: req.headers });
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const {
      name,
      tagline,
      description,
      category,
      coverImage,
      logoImage,
      monthlyPrice,
      accentColor,
      rules,
      welcomeMessage,
      previewContent,
      memberBenefits,
      badgeShape,
      badgeInitials,
      badgeText,
      badgeIcon,
      badgeBgColor,
      badgeTextColor,
      badgeBorderColor,
      badgeCustomImage,
      allowDirectMessage,
      allowDirectText,
      directTextPhone,
      allowQuestions,
      allowConsultations,
      consultationUrl,
    } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ error: "Network name is required" }, { status: 400 });
    }

    if (accentColor !== undefined && (typeof accentColor !== "string" || !/^#[0-9a-fA-F]{6}$/.test(accentColor))) return NextResponse.json({ error: "Choose a valid accent color" }, { status: 400 });
    if (monthlyPrice !== undefined && (!Number.isFinite(Number(monthlyPrice)) || Number(monthlyPrice) < 0 || Number(monthlyPrice) > 999999)) return NextResponse.json({ error: "Enter a valid non-negative monthly price" }, { status: 400 });

    // Generate unique slug
    let baseSlug = name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");

    if (!baseSlug) {
      baseSlug = "network";
    }

    let slug = baseSlug;
    let counter = 1;
    while (await prisma.proNetwork.findUnique({ where: { slug } })) {
      slug = `${baseSlug}-${counter++}`;
    }

    let price = 0;
    if (typeof monthlyPrice === "number") {
      price = isNaN(monthlyPrice) ? 0 : Math.max(0, monthlyPrice);
    } else if (monthlyPrice !== undefined && monthlyPrice !== null && monthlyPrice !== "") {
      const parsed = parseFloat(String(monthlyPrice));
      price = isNaN(parsed) ? 0 : Math.max(0, parsed);
    }

    // Paid Pro Networks require Stripe Connect onboarding to receive member subscription payouts
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, role: true, stripeAccountId: true, stripeOnboarded: true },
    });
    if (price > 0) {
      try {
        if (!process.env.STRIPE_SECRET_KEY) throw new Error("Payment setup is temporarily unavailable. Your draft can be saved and published later.");
        await requireDirectChargeAccount(new Stripe(process.env.STRIPE_SECRET_KEY), user?.stripeAccountId);
      } catch (error) {
        return NextResponse.json({ error: error instanceof Error ? error.message : "Connect Stripe before publishing a paid network.", code: "STRIPE_SETUP_REQUIRED" }, { status: 409 });
      }
    }

    // Create the Pro Network and automatically add owner as first member
    const network = await prisma.proNetwork.create({
      data: {
        name: name.trim(),
        slug,
        tagline: tagline?.trim() || null,
        description: description?.trim() || "",
        category: category || "General",
        coverImage: coverImage || null,
        logoImage: logoImage || null,
        monthlyPrice: Math.round(price * 100) / 100,
        accentColor: accentColor || "#0a1628",
        rules: rules?.trim() || null,
        welcomeMessage: welcomeMessage?.trim() || null,
        previewContent: previewContent?.trim() || null,
        memberBenefits: Array.isArray(memberBenefits) ? memberBenefits : [],
        badgeShape: badgeShape || "rounded",
        badgeInitials: badgeInitials?.trim() || null,
        badgeText: badgeText?.trim() || "MEMBER",
        badgeIcon: badgeIcon || "Star",
        badgeBgColor: badgeBgColor || "#0a1628",
        badgeTextColor: badgeTextColor || "#ffbe24",
        badgeBorderColor: badgeBorderColor || "#ffbe24",
        badgeCustomImage: badgeCustomImage || null,
        allowDirectMessage: allowDirectMessage ?? true,
        allowDirectText: allowDirectText ?? false,
        directTextPhone: directTextPhone?.trim() || null,
        allowQuestions: allowQuestions ?? true,
        allowConsultations: allowConsultations ?? true,
        consultationUrl: consultationUrl?.trim() || null,
        ownerId: session.user.id,
        memberCount: 1,
        members: {
          create: {
            userId: session.user.id,
            role: "OWNER",
            status: "ACTIVE",
          },
        },
        // Seed default initial announcement and discussion
        announcements: {
          create: {
            authorId: session.user.id,
            title: `Welcome to ${name.trim()}! 👋`,
            content:
              welcomeMessage ||
              "Introduce yourself in the discussion board and let us know what you'd like to learn more about.",
            isPinned: true,
          },
        },
        discussions: {
          create: {
            authorId: session.user.id,
            title: "Welcome & Introductions",
            content: "Welcome everyone! Introduce yourself, your background, and your practice goals.",
            category: "General",
            isPinned: true,
            isMembersOnly: true,
          },
        },
      },
    });

    return NextResponse.json({ network });
  } catch (error) {
    console.error("Failed to create Pro Network:", error);
    return NextResponse.json({ error: "Failed to create network" }, { status: 500 });
  }
}

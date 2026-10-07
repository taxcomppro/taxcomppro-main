import Stripe from "stripe";
import { requireDirectChargeAccount } from "@/lib/stripe-direct-connect";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const category = searchParams.get("category");
  const search   = searchParams.get("search");

  const listings = await prisma.marketplaceListing.findMany({
    where: {
      status: "APPROVED",
      isNetworkExclusive: false,
      ...(category && category !== "ALL" ? { category: category as "SERVICE" | "PRODUCT" | "NETWORK" | "TRAINING" } : {}),
      ...(search ? { OR: [
        { title:       { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
      ]} : {}),
    },
    include: {
      user: { select: { id: true, name: true, image: true, headline: true, role: true, tier: true } },
    },
    orderBy: [{ isFeatured: "desc" }, { createdAt: "desc" }],
  });

  const networks = !category || category === "ALL" || category === "NETWORK" ? await prisma.proNetwork.findMany({
    where: { isPublished: true, ...(search ? { OR: [{name: {contains: search, mode: "insensitive"}}, {description: {contains: search, mode: "insensitive"}}] } : {}) },
    include: {owner: {select: {id: true, name: true, image: true}}}, orderBy: {createdAt: "desc"},
  }) : [];
  return NextResponse.json([...listings, ...networks.map(n => ({
    id: "network-" + n.id, slug: n.slug, href: "/pro-networks/" + n.slug, title: n.name,
    description: n.tagline || n.description, category: "NETWORK", price: n.monthlyPrice,
    billingPeriod: "month", tags: [n.category], images: n.coverImage ? [n.coverImage] : n.logoImage ? [n.logoImage] : [],
    isFeatured: false, viewCount: 0, createdAt: n.createdAt, user: n.owner,
  }))]);
}

export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  const isAdmin = user?.role === "ADMIN";
  const canSell = isAdmin || user?.tier === "MARKETPLACE" || user?.tier === "MARKETPLACE_PLUS";

  if (!canSell) {
    return NextResponse.json({ error: "Upgrade to Marketplace tier to create listings" }, { status: 403 });
  }

  const body = await req.json();

  // Paid listings require Stripe Connect onboarding to receive payouts
  const priceNum = body.price !== undefined && body.price !== null ? Number(body.price) : 0;
  if (!Number.isFinite(priceNum) || priceNum < 0) return NextResponse.json({ error: "Enter a valid price of $0 or more." }, { status: 400 });
  const isPaid = priceNum > 0;
  if (isPaid) {
    try {
      if (!process.env.STRIPE_SECRET_KEY) throw new Error("Payment setup is temporarily unavailable. Your draft can be saved and published later.");
      await requireDirectChargeAccount(new Stripe(process.env.STRIPE_SECRET_KEY), user?.stripeAccountId);
    } catch (error) {
      return NextResponse.json({ error: error instanceof Error ? error.message : "Connect Stripe before publishing a paid listing.", code: "STRIPE_SETUP_REQUIRED" }, { status: 409 });
    }
  }

  // Generate URL-safe slug from title
  const baseSlug = (body.title as string)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 60);

  // Ensure uniqueness by appending a short random suffix if collision
  let slug = baseSlug;
  const existing = await prisma.marketplaceListing.findUnique({ where: { slug } });
  if (existing) slug = `${baseSlug}-${Math.random().toString(36).slice(2, 6)}`;

  const listing = await prisma.marketplaceListing.create({
    data: {
      slug,
      title:       body.title,
      description: body.description,
      category:    body.category,
      price:       body.price ?? null,
      tags:        body.tags ?? [],
      images:      body.images ?? [],
      metadata:    body.metadata ?? undefined,
      userId:      session.user.id,
      status:      "APPROVED",
      isFeatured:  isAdmin,
    },
  });

  return NextResponse.json(listing, { status: 201 });
}

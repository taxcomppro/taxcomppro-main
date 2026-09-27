import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ id: string }> };

// GET /api/spaces/[id]/tagged-product - Fetch current tagged product & host listings
export async function GET(req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const session = await auth.api.getSession({ headers: req.headers }).catch(() => null);
    const currentUserId = session?.user?.id;

    const space = await prisma.space.findUnique({
      where: { id },
      include: {
        host: { select: { id: true, name: true, image: true, headline: true } },
        taggedListing: {
          include: {
            user: {
              select: { id: true, name: true, image: true, headline: true },
            },
          },
        },
      },
    });

    if (!space) {
      return NextResponse.json({ error: "Pro Talk not found" }, { status: 404 });
    }

    const isHost = currentUserId === space.hostId || session?.user?.role === "ADMIN";

    let isPurchased = false;
    if (currentUserId && space.taggedListing) {
      const purchase = await prisma.marketplacePurchase.findFirst({
        where: {
          userId: currentUserId,
          listingId: space.taggedListing.id,
        },
      });
      isPurchased = Boolean(purchase);
    }

    const taggedProduct = space.taggedListing
      ? {
          id: space.taggedListing.id,
          listingId: space.taggedListing.id,
          slug: space.taggedListing.slug || space.taggedListing.id,
          title: space.taggedListing.title,
          description: space.taggedListing.description,
          category: space.taggedListing.category,
          price: space.taggedListing.price,
          images: space.taggedListing.images,
          tags: space.taggedListing.tags,
          isNetworkExclusive: space.taggedListing.isNetworkExclusive,
          status: space.taggedListing.status,
          user: space.taggedListing.user,
          isPurchased,
        }
      : null;

    let hostAvailableListings: any[] = [];
    if (isHost) {
      const listings = await prisma.marketplaceListing.findMany({
        where: { userId: space.hostId },
        orderBy: { createdAt: "desc" },
      });

      hostAvailableListings = listings.map((l) => ({
        id: l.id,
        listingId: l.id,
        slug: l.slug || l.id,
        title: l.title,
        description: l.description,
        category: l.category,
        price: l.price,
        images: l.images,
        tags: l.tags,
        status: l.status,
        isNetworkExclusive: l.isNetworkExclusive,
        isCurrentlyTagged: space.taggedListingId === l.id,
      }));
    }

    return NextResponse.json({
      spaceId: space.id,
      isHost,
      taggedProduct,
      hostAvailableListings,
    });
  } catch (error: any) {
    console.error("[Space Tagged Product GET]", error);
    return NextResponse.json(
      { error: error.message || "Failed to load tagged product" },
      { status: 500 }
    );
  }
}

// POST /api/spaces/[id]/tagged-product - Tag / Highlight a product live
export async function POST(req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const session = await auth.api.getSession({ headers: req.headers });
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const space = await prisma.space.findUnique({
      where: { id },
      select: { id: true, hostId: true },
    });

    if (!space) return NextResponse.json({ error: "Pro Talk not found" }, { status: 404 });

    const isHost = space.hostId === session.user.id || session.user.role === "ADMIN";
    if (!isHost) {
      return NextResponse.json({ error: "Only the host can tag products in this talk" }, { status: 403 });
    }

    const body = await req.json();
    const { listingId } = body;

    if (!listingId) {
      return NextResponse.json({ error: "listingId is required" }, { status: 400 });
    }

    const listing = await prisma.marketplaceListing.findUnique({
      where: { id: listingId },
      include: {
        user: { select: { id: true, name: true, image: true, headline: true } },
      },
    });

    if (!listing) {
      return NextResponse.json({ error: "Marketplace product not found" }, { status: 404 });
    }

    await prisma.space.update({
      where: { id },
      data: { taggedListingId: listing.id },
    });

    const taggedProduct = {
      id: listing.id,
      listingId: listing.id,
      slug: listing.slug || listing.id,
      title: listing.title,
      description: listing.description,
      category: listing.category,
      price: listing.price,
      images: listing.images,
      tags: listing.tags,
      isNetworkExclusive: listing.isNetworkExclusive,
      status: listing.status,
      user: listing.user,
    };

    return NextResponse.json({
      success: true,
      taggedProduct,
      message: `Product "${listing.title}" tagged and spotlighted live!`,
    });
  } catch (error: any) {
    console.error("[Space Tagged Product POST]", error);
    return NextResponse.json(
      { error: error.message || "Failed to tag product" },
      { status: 500 }
    );
  }
}

// DELETE /api/spaces/[id]/tagged-product - Remove tagged product
export async function DELETE(req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const session = await auth.api.getSession({ headers: req.headers });
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const space = await prisma.space.findUnique({
      where: { id },
      select: { id: true, hostId: true },
    });

    if (!space) return NextResponse.json({ error: "Pro Talk not found" }, { status: 404 });

    const isHost = space.hostId === session.user.id || session.user.role === "ADMIN";
    if (!isHost) {
      return NextResponse.json({ error: "Only the host can untag products" }, { status: 403 });
    }

    await prisma.space.update({
      where: { id },
      data: { taggedListingId: null },
    });

    return NextResponse.json({
      success: true,
      message: "Product spotlight removed",
    });
  } catch (error: any) {
    console.error("[Space Tagged Product DELETE]", error);
    return NextResponse.json(
      { error: error.message || "Failed to remove tagged product" },
      { status: 500 }
    );
  }
}

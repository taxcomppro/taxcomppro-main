import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

// GET /api/pro-networks/[slug]/products - Fetch products in this network's storefront
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const session = await auth.api.getSession({ headers: req.headers });
    const currentUserId = session?.user?.id;

    const network = await prisma.proNetwork.findUnique({
      where: { slug },
      select: { id: true, ownerId: true, slug: true, name: true },
    });

    if (!network) {
      return NextResponse.json({ error: "Network not found" }, { status: 404 });
    }

    const isOwner = currentUserId === network.ownerId;

    // Fetch products currently in this network's shop
    const networkProducts = await prisma.proNetworkProduct.findMany({
      where: { networkId: network.id },
      include: {
        listing: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                image: true,
                headline: true,
                stripeAccountId: true,
                stripeOnboarded: true,
              },
            },
          },
        },
      },
      orderBy: [{ isFeatured: "desc" }, { order: "asc" }, { createdAt: "desc" }],
    });

    // Check which listings the current user has already purchased
    const listingIds = networkProducts.map((np) => np.listing.id);
    let purchasedListingIds: string[] = [];

    if (currentUserId && listingIds.length > 0) {
      const purchases = await prisma.marketplacePurchase.findMany({
        where: {
          userId: currentUserId,
          listingId: { in: listingIds },
        },
        select: { listingId: true },
      });
      purchasedListingIds = purchases.map((p) => p.listingId);
    }

    const products = networkProducts.map((np) => ({
      id: np.id,
      listingId: np.listing.id,
      slug: np.listing.slug || np.listing.id,
      title: np.listing.title,
      description: np.listing.description,
      category: np.listing.category,
      price: np.listing.price,
      images: np.listing.images,
      tags: np.listing.tags,
      isFeatured: np.isFeatured,
      isNetworkExclusive: np.listing.isNetworkExclusive,
      status: np.listing.status,
      user: np.listing.user,
      order: np.order,
      createdAt: np.createdAt,
      isPurchased: purchasedListingIds.includes(np.listing.id),
      metadata: np.listing.metadata,
    }));

    // If owner, also fetch all their other marketplace listings to easily add them
    let ownerAvailableListings: any[] = [];
    if (isOwner) {
      const existingListingIds = new Set(networkProducts.map((np) => np.listingId));
      const allOwnerListings = await prisma.marketplaceListing.findMany({
        where: { userId: network.ownerId },
        orderBy: { createdAt: "desc" },
      });

      ownerAvailableListings = allOwnerListings.map((l) => ({
        id: l.id,
        slug: l.slug || l.id,
        title: l.title,
        description: l.description,
        category: l.category,
        price: l.price,
        images: l.images,
        tags: l.tags,
        status: l.status,
        isNetworkExclusive: l.isNetworkExclusive,
        isInNetworkShop: existingListingIds.has(l.id),
      }));
    }

    return NextResponse.json({
      networkId: network.id,
      networkSlug: network.slug,
      isOwner,
      products,
      ownerAvailableListings,
    });
  } catch (error: any) {
    console.error("[Pro Network Products GET]", error);
    return NextResponse.json({ error: error.message || "Failed to load products" }, { status: 500 });
  }
}

// POST /api/pro-networks/[slug]/products - Add an existing Marketplace product to this network's shop
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const session = await auth.api.getSession({ headers: req.headers });
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const network = await prisma.proNetwork.findUnique({
      where: { slug },
      select: { id: true, ownerId: true },
    });

    if (!network) return NextResponse.json({ error: "Network not found" }, { status: 404 });
    if (session.user.id !== network.ownerId && session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Only the network owner can manage shop products" }, { status: 403 });
    }

    const body = await req.json();
    const { listingId, isFeatured = false, isNetworkExclusive = false } = body;

    if (!listingId) {
      return NextResponse.json({ error: "listingId is required" }, { status: 400 });
    }

    // Verify listing belongs to the user
    const listing = await prisma.marketplaceListing.findUnique({
      where: { id: listingId },
    });

    if (!listing) {
      return NextResponse.json({ error: "Marketplace listing not found" }, { status: 404 });
    }

    if (listing.userId !== session.user.id && session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "You can only add your own marketplace listings" }, { status: 403 });
    }

    // Upsert into ProNetworkProduct
    const networkProduct = await prisma.proNetworkProduct.upsert({
      where: {
        networkId_listingId: {
          networkId: network.id,
          listingId: listing.id,
        },
      },
      create: {
        networkId: network.id,
        listingId: listing.id,
        isFeatured: Boolean(isFeatured),
      },
      update: {
        isFeatured: Boolean(isFeatured),
      },
    });

    // Update exclusivity on the listing if requested
    if (typeof isNetworkExclusive === "boolean") {
      await prisma.marketplaceListing.update({
        where: { id: listing.id },
        data: {
          isNetworkExclusive,
          exclusiveNetworkId: isNetworkExclusive ? network.id : null,
        },
      });
    }

    return NextResponse.json({
      success: true,
      networkProduct,
      message: "Product added to Pro Network shop",
    });
  } catch (error: any) {
    console.error("[Pro Network Products POST]", error);
    return NextResponse.json({ error: error.message || "Failed to add product to shop" }, { status: 500 });
  }
}

// DELETE /api/pro-networks/[slug]/products - Remove a product from this network's shop
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const session = await auth.api.getSession({ headers: req.headers });
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const network = await prisma.proNetwork.findUnique({
      where: { slug },
      select: { id: true, ownerId: true },
    });

    if (!network) return NextResponse.json({ error: "Network not found" }, { status: 404 });
    if (session.user.id !== network.ownerId && session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Only the network owner can manage shop products" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const listingId = searchParams.get("listingId");

    if (!listingId) {
      return NextResponse.json({ error: "listingId query param is required" }, { status: 400 });
    }

    await prisma.proNetworkProduct.deleteMany({
      where: {
        networkId: network.id,
        listingId,
      },
    });

    // If it was network exclusive, revert exclusivity
    await prisma.marketplaceListing.updateMany({
      where: {
        id: listingId,
        exclusiveNetworkId: network.id,
      },
      data: {
        isNetworkExclusive: false,
        exclusiveNetworkId: null,
      },
    });

    return NextResponse.json({ success: true, message: "Product removed from Pro Network shop" });
  } catch (error: any) {
    console.error("[Pro Network Products DELETE]", error);
    return NextResponse.json({ error: error.message || "Failed to remove product" }, { status: 500 });
  }
}

// PATCH /api/pro-networks/[slug]/products - Update product settings (featured, exclusivity, order)
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const session = await auth.api.getSession({ headers: req.headers });
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const network = await prisma.proNetwork.findUnique({
      where: { slug },
      select: { id: true, ownerId: true },
    });

    if (!network) return NextResponse.json({ error: "Network not found" }, { status: 404 });
    if (session.user.id !== network.ownerId && session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Only the network owner can manage shop products" }, { status: 403 });
    }

    const body = await req.json();
    const { listingId, isFeatured, isNetworkExclusive, order } = body;

    if (!listingId) {
      return NextResponse.json({ error: "listingId is required" }, { status: 400 });
    }

    const updateData: any = {};
    if (typeof isFeatured === "boolean") updateData.isFeatured = isFeatured;
    if (typeof order === "number") updateData.order = order;

    if (Object.keys(updateData).length > 0) {
      await prisma.proNetworkProduct.update({
        where: {
          networkId_listingId: {
            networkId: network.id,
            listingId,
          },
        },
        data: updateData,
      });
    }

    if (typeof isNetworkExclusive === "boolean") {
      await prisma.marketplaceListing.update({
        where: { id: listingId },
        data: {
          isNetworkExclusive,
          exclusiveNetworkId: isNetworkExclusive ? network.id : null,
        },
      });
    }

    return NextResponse.json({ success: true, message: "Product updated in shop" });
  } catch (error: any) {
    console.error("[Pro Network Products PATCH]", error);
    return NextResponse.json({ error: error.message || "Failed to update product" }, { status: 500 });
  }
}

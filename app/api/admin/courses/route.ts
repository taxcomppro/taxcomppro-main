import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { headers } from "next/headers";

async function getCourseCreator(req: NextRequest) {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session?.user) return null;
  const dbUser = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!dbUser) return null;
  const canManage =
    dbUser.role === "ADMIN" ||
    dbUser.tier === "MARKETPLACE" ||
    dbUser.tier === "MARKETPLACE_PLUS";
  if (!canManage) return null;
  return dbUser;
}

export async function GET(req: NextRequest) {
  const creator = await getCourseCreator(req);
  if (!creator) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const isAdmin = creator.role === "ADMIN";

  const courses = await prisma.course.findMany({
    where: isAdmin ? {} : { instructorId: creator.id },
    include: {
      instructor: { select: { id: true, name: true, email: true, role: true } },
      _count: { select: { enrollments: true, sections: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(courses);
}

export async function POST(req: NextRequest) {
  const creator = await getCourseCreator(req);
  if (!creator) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();

  if (!body.title?.trim() || !body.slug?.trim() || !body.description?.trim()) {
    return NextResponse.json({ error: "Title, slug, and description are required." }, { status: 400 });
  }

  const existing = await prisma.course.findUnique({ where: { slug: body.slug } });
  if (existing) return NextResponse.json({ error: "Slug already in use" }, { status: 409 });

  const isAdmin = creator.role === "ADMIN";
  const isFree = body.isFree ?? (Number(body.price) <= 0);
  const price = isFree ? 0 : (Number(body.price) || 0);

  // Paid courses require Stripe Connect onboarding to receive payouts
  if (price > 0 && !isAdmin && (!creator.stripeAccountId || !creator.stripeOnboarded)) {
    return NextResponse.json(
      {
        error: "Stripe payout setup required. Please connect your Stripe account in the Seller Dashboard before creating paid courses.",
        code: "STRIPE_SETUP_REQUIRED",
      },
      { status: 403 }
    );
  }

  const course = await prisma.course.create({
    data: {
      title:            body.title.trim(),
      slug:             body.slug.trim(),
      description:      body.description.trim(),
      thumbnail:        body.thumbnail || null,
      level:            body.level ?? "BEGINNER",
      price,
      isFree,
      category:         body.category || "Tax Office Startup",
      tags:             body.tags ?? [],
      learningOutcomes: body.learningOutcomes ?? [],
      requirements:     body.requirements ?? [],
      status:           "PUBLISHED",
      instructorId:     creator.id,
    },
  });

  // Only create MarketplaceListing for user/seller-created courses (admin courses stay on Academy/Courses page)
  if (!isAdmin) {
    try {
      let listingSlug = body.slug.trim();
      const existingListing = await prisma.marketplaceListing.findUnique({ where: { slug: listingSlug } });
      if (existingListing) {
        listingSlug = `${body.slug.trim()}-${Math.random().toString(36).slice(2, 6)}`;
      }

      await prisma.marketplaceListing.create({
        data: {
          slug:        listingSlug,
          title:       body.title.trim(),
          description: body.description.trim(),
          category:    "TRAINING",
          price,
          images:      body.thumbnail ? [body.thumbnail] : [],
          tags:        body.tags ?? [],
          status:      "APPROVED",
          isFeatured:  false,
          userId:      creator.id,
          metadata: {
            courseId:   course.id,
            courseSlug: course.slug,
            isCourse:   true,
            category:   body.category,
            level:      body.level,
          },
        },
      });
    } catch (listingErr) {
      console.error("Failed to create marketplace listing for user course:", listingErr);
    }
  }

  return NextResponse.json(course, { status: 201 });
}

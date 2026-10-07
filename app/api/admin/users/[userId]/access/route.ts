import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { TOOLKITS, BUNDLES, getToolkit, getBundle } from "@/lib/toolkits";
import { COURSES } from "@/lib/courses";
import type { SubscriptionTier } from "@prisma/client";

async function requireAdmin(req: NextRequest) {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session) return null;
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });
  if (user?.role !== "ADMIN") return null;
  return session;
}

// Canonical list of all toolkits, courses, and bundles
const ALL_TOOLKITS = TOOLKITS.map((t) => ({
  id: t.id,
  name: t.name,
  category: t.category,
  price: t.price,
  emoji: t.emoji,
  badgeImage: t.badgeImage,
  externalUrl: t.externalUrl,
  membershipTier: t.membershipTier,
  membershipMonths: t.membershipMonths,
}));

const ALL_COURSES = COURSES.map((c) => ({
  id: c.id,
  slug: c.slug,
  title: c.title,
  category: c.category,
  level: c.level,
  duration: c.duration,
  thumbnail: c.thumbnail,
  price: c.price,
  externalUrl: c.externalUrl,
  modules: c.modules,
  totalLessons: c.totalLessons,
}));

const ALL_BUNDLES = BUNDLES.map((b) => ({
  id: b.id,
  name: b.name,
  tagline: b.tagline,
  price: b.price,
  originalPrice: b.originalPrice,
  badge: b.badge,
  icon: b.icon,
  badgeImage: b.badgeImage,
  externalUrl: b.externalUrl,
  features: b.features,
}));

const COURSE_ALIAS_MAP: Record<string, string[]> = {
  "30-day-launch": ["30-day-launch", "30-day-tax-office-launch", "30-day-tax-office", "30daylaunch", "cmooyt4qz000004l2hgvycccx"],
  "30-day-tax-office-launch": ["30-day-launch", "30-day-tax-office-launch", "30-day-tax-office", "30daylaunch", "cmooyt4qz000004l2hgvycccx"],
  "irs-fine-defense": ["irs-fine-defense", "irs-fine-defense-masterclass", "irsfinedefense", "cmop0lsdi000304jyzlcpvi78"],
  "irs-fine-defense-masterclass": ["irs-fine-defense", "irs-fine-defense-masterclass", "irsfinedefense", "cmop0lsdi000304jyzlcpvi78"],
  "schedule-c-reconstruction": ["schedule-c-reconstruction", "schedule-c-reconstruction-course", "schedule-c", "schedulecrecon", "mastering-schedule-c-reconstruction", "cmop0nigi000004kzll8bo7dj"],
  "schedule-c-reconstruction-course": ["schedule-c-reconstruction", "schedule-c-reconstruction-course", "schedule-c", "schedulecrecon", "mastering-schedule-c-reconstruction", "cmop0nigi000004kzll8bo7dj"],
  "irs-audit-playbook": ["irs-audit-playbook", "irs-audit-playbook-course", "audit-playbook", "auditplaybook", "audit-ready-playbook", "cmop0j4m9000004jyr7orpyav"],
  "irs-audit-playbook-course": ["irs-audit-playbook", "irs-audit-playbook-course", "audit-playbook", "auditplaybook", "audit-ready-playbook", "cmop0j4m9000004jyr7orpyav"],
  "credits-filing-status": ["credits-filing-status", "credits-filing-status-course", "credits", "credits-filing-status-explained"],
  "credits-filing-status-course": ["credits-filing-status", "credits-filing-status-course", "credits", "credits-filing-status-explained"],
  "due-diligence": ["due-diligence", "due-diligence-course", "staff-audit-ready", "staff-audit-ready-due-diligence"],
  "staff-audit-ready-due-diligence": ["due-diligence", "due-diligence-course", "staff-audit-ready", "staff-audit-ready-due-diligence"],
};

const TOOLKIT_ALIAS_MAP: Record<string, string[]> = {
  "30-day-tax-office": ["30-day-tax-office", "30-day-tax-office-launch", "30-day-launch", "30daylaunch"],
  "due-diligence-course": ["due-diligence-course", "due-diligence", "staff-audit-ready", "staff-audit-ready-due-diligence"],
  "irs-fine-defense": ["irs-fine-defense", "irsfinedefense", "irs-fine-defense-masterclass"],
  "schedule-c-reconstruction": ["schedule-c-reconstruction", "schedule-c", "schedulecrecon"],
  "audit-playbook": ["audit-playbook", "irs-audit-playbook", "auditplaybook", "audit-ready-playbook"],
  "credits-filing-status": ["credits-filing-status", "credits", "credits-filing-status-explained"],
};

/**
 * GET /api/admin/users/[userId]/access
 * Compiles full access matrix for a specific user
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const adminSession = await requireAdmin(req);
  if (!adminSession) {
    return NextResponse.json({ error: "Forbidden. Admin access required." }, { status: 403 });
  }

  const { userId } = await params;
  if (!userId) {
    return NextResponse.json({ error: "User ID is required" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      toolkitPurchases: { orderBy: { createdAt: "desc" } },
      enrollments: {
        include: {
          course: { select: { id: true, slug: true, title: true, level: true } },
          progress: true,
        },
        orderBy: { createdAt: "desc" },
      },
      trainingLicenses: {
        orderBy: { createdAt: "desc" },
      },
      subscription: true,
    },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  // Check Bundles
  const bundlePurchases = user.toolkitPurchases.filter(
    (p) => p.toolkitId.startsWith("bundle:") || p.toolkitId.startsWith("ultimate-bundle")
  );

  const hasUltimateBundle = bundlePurchases.some(
    (p) => p.toolkitId === "bundle:ultimate-bundle" || p.toolkitId === "ultimate-bundle"
  );
  const hasUltimateBundlePlus = bundlePurchases.some(
    (p) => p.toolkitId === "bundle:ultimate-bundle-plus" || p.toolkitId === "ultimate-bundle-plus"
  );

  const bundlesStatus = ALL_BUNDLES.map((b) => {
    const purchase = bundlePurchases.find(
      (p) => p.toolkitId === `bundle:${b.id}` || p.toolkitId === b.id
    );
    const hasAccess = b.id === "ultimate-bundle" ? (hasUltimateBundle || hasUltimateBundlePlus) : hasUltimateBundlePlus;
    const isManualGrant = purchase?.stripeSessionId?.startsWith("admin_") ?? false;

    return {
      ...b,
      hasAccess,
      purchaseId: purchase?.id || null,
      grantedAt: purchase?.createdAt || null,
      accessSource: hasAccess
        ? (isManualGrant ? "MANUAL_GRANT" : purchase ? "STRIPE_PURCHASE" : "BUNDLE_INCLUDED")
        : "NONE",
      stripeSessionId: purchase?.stripeSessionId || null,
    };
  });

  // Check Toolkits
  const toolkitsStatus = ALL_TOOLKITS.map((t) => {
    const aliases = TOOLKIT_ALIAS_MAP[t.id] || [t.id];

    const directPurchase = user.toolkitPurchases.find((p) => {
      const tid = p.toolkitId.toLowerCase();
      return aliases.some(
        (a) =>
          tid === a.toLowerCase() ||
          tid === `toolkit:${a.toLowerCase()}` ||
          tid === `bundle:${a.toLowerCase()}`
      );
    });

    const license = user.trainingLicenses.find((l) => {
      const licTid = l.toolkitId.toLowerCase();
      return aliases.some((a) => licTid === a.toLowerCase());
    });

    const hasAccessViaBundle = hasUltimateBundle || hasUltimateBundlePlus;
    const hasAccess = !!directPurchase || !!license || hasAccessViaBundle;
    const isManual = directPurchase?.stripeSessionId?.startsWith("admin_") ?? false;

    return {
      ...t,
      hasAccess,
      purchaseId: directPurchase?.id || license?.id || null,
      grantedAt: directPurchase?.createdAt || license?.createdAt || null,
      accessSource: hasAccess
        ? (directPurchase
            ? isManual
              ? "MANUAL_GRANT"
              : "STRIPE_PURCHASE"
            : license
            ? "TRAINING_LICENSE"
            : "BUNDLE_INCLUDED")
        : "NONE",
      stripeSessionId: directPurchase?.stripeSessionId || null,
      trainingLicense: license
        ? {
            id: license.id,
            seats: license.totalSeats,
            expiresAt: license.expiresAt,
          }
        : null,
    };
  });

  // Check Courses
  const coursesStatus = ALL_COURSES.map((c) => {
    const aliases = Array.from(
      new Set([
        c.slug,
        c.id,
        ...(COURSE_ALIAS_MAP[c.slug] || []),
        ...(COURSE_ALIAS_MAP[c.id] || []),
      ])
    );

    // Check if enrolled by slug, course ID, or any alias
    const enrollment = user.enrollments.find((e) => {
      const eSlug = (e.course?.slug || "").toLowerCase();
      const eCourseId = (e.courseId || "").toLowerCase();
      const eId = (e.course?.id || "").toLowerCase();
      return aliases.some(
        (a) =>
          a.toLowerCase() === eSlug ||
          a.toLowerCase() === eCourseId ||
          a.toLowerCase() === eId ||
          (a.length > 5 && eSlug.includes(a.toLowerCase())) ||
          (a.length > 5 && eCourseId.includes(a.toLowerCase()))
      );
    });

    // Check staff training license
    const license = user.trainingLicenses.find((l) => {
      const licTid = l.toolkitId.toLowerCase();
      return aliases.some(
        (a) =>
          a.toLowerCase() === licTid ||
          licTid === a.toLowerCase() ||
          (a.length > 5 && licTid.includes(a.toLowerCase()))
      );
    });

    // Check direct purchase
    const directPurchase = user.toolkitPurchases.find((p) => {
      const pTid = p.toolkitId.toLowerCase();
      return (
        pTid === `course:${c.slug}` ||
        pTid === `course:${c.id}` ||
        aliases.some((a) => pTid === `course:${a.toLowerCase()}` || pTid === a.toLowerCase())
      );
    });

    // Bundle Plus includes all courses
    const hasAccessViaBundle = hasUltimateBundlePlus;
    const hasAccess = !!enrollment || !!license || !!directPurchase || hasAccessViaBundle;

    return {
      ...c,
      hasAccess,
      enrollmentId: enrollment?.id || (license ? license.id : directPurchase ? directPurchase.id : null),
      grantedAt: enrollment?.createdAt || license?.createdAt || directPurchase?.createdAt || null,
      completedAt: enrollment?.completedAt || null,
      completedLessonsCount: enrollment?.progress?.length || 0,
      accessSource: hasAccess
        ? (enrollment
            ? "ENROLLED"
            : license
            ? "TRAINING_LICENSE"
            : directPurchase
            ? "DIRECT_PURCHASE"
            : "BUNDLE_INCLUDED")
        : "NONE",
      trainingLicense: license
        ? {
            id: license.id,
            seats: license.totalSeats,
            expiresAt: license.expiresAt,
          }
        : null,
    };
  });

  const summary = {
    totalToolkitsUnlocked: toolkitsStatus.filter((t) => t.hasAccess).length,
    totalCoursesEnrolled: coursesStatus.filter((c) => c.hasAccess).length,
    hasUltimateBundle,
    hasUltimateBundlePlus,
    totalStaffSeats: user.trainingLicenses.reduce((acc, l) => acc + l.totalSeats, 0),
  };

  return NextResponse.json({
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      tier: user.tier,
      image: user.image,
      createdAt: user.createdAt,
    },
    summary,
    bundles: bundlesStatus,
    toolkits: toolkitsStatus,
    courses: coursesStatus,
  });
}

/**
 * Helper function to ensure course exists in DB before enrolling
 */
async function ensureDbCourse(slugOrId: string, adminId: string) {
  const canonical = COURSES.find((c) => c.id === slugOrId || c.slug === slugOrId);
  const aliases = canonical
    ? Array.from(
        new Set([
          canonical.slug,
          canonical.id,
          ...(COURSE_ALIAS_MAP[canonical.slug] || []),
          ...(COURSE_ALIAS_MAP[canonical.id] || []),
        ])
      )
    : [slugOrId];

  let dbCourse = await prisma.course.findFirst({
    where: {
      OR: [
        { id: slugOrId },
        { slug: slugOrId },
        ...(canonical ? [{ id: canonical.id }, { slug: canonical.slug }] : []),
        ...aliases.map((a) => ({ id: a })),
        ...aliases.map((a) => ({ slug: a })),
      ],
    },
  });

  if (!dbCourse) {
    if (!canonical) {
      throw new Error(`Course definition not found for ${slugOrId}`);
    }

    dbCourse = await prisma.course.create({
      data: {
        id: canonical.id,
        slug: canonical.slug,
        title: canonical.title,
        description: canonical.description,
        thumbnail: canonical.thumbnail,
        category: canonical.category,
        level: canonical.level,
        status: "PUBLISHED",
        price: canonical.price,
        isFree: canonical.isFree,
        totalDuration: canonical.totalDurationSeconds,
        instructorId: adminId,
      },
    });
  }

  return dbCourse;
}

/**
 * POST /api/admin/users/[userId]/access
 * Manually grant access to a Toolkit, Course, or Bundle
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const adminSession = await requireAdmin(req);
  if (!adminSession) {
    return NextResponse.json({ error: "Forbidden. Admin access required." }, { status: 403 });
  }

  const { userId } = await params;
  if (!userId) {
    return NextResponse.json({ error: "User ID is required" }, { status: 400 });
  }

  const targetUser = await prisma.user.findUnique({
    where: { id: userId },
    include: { subscription: true },
  });

  if (!targetUser) {
    return NextResponse.json({ error: "Target user not found" }, { status: 404 });
  }

  const body = await req.json().catch(() => ({}));
  const {
    itemType, // "toolkit" | "course" | "bundle"
    itemId,   // e.g. "irs-fine-defense", "schedule-c-reconstruction", "ultimate-bundle-plus"
    grantMembershipBonus = true,
    membershipMonths = 2,
    membershipTier = "MARKETPLACE_PLUS",
    staffSeats = 5,
    notifyUser = true,
  } = body;

  if (!itemType || !itemId) {
    return NextResponse.json(
      { error: "itemType (toolkit/course/bundle) and itemId are required." },
      { status: 400 }
    );
  }

  const now = new Date();
  const grantDateTag = Date.now();
  const randomSuffix = Math.random().toString(36).slice(2, 7);

  try {
    // ═════════════════════════════════════════════════════════════════
    // 1. GRANT BUNDLE
    // ═════════════════════════════════════════════════════════════════
    if (itemType === "bundle") {
      const bundle = getBundle(itemId);
      const isBundlePlus = itemId === "ultimate-bundle-plus";
      const bundleName = bundle?.name || (isBundlePlus ? "Ultimate Bundle PLUS" : "Ultimate Bundle");

      // 1a. Record bundle ToolkitPurchase
      const bundleSessionId = `admin_grant_bundle_${itemId}_${grantDateTag}_${randomSuffix}`;
      await prisma.toolkitPurchase.upsert({
        where: { stripeSessionId: bundleSessionId },
        create: {
          userId: targetUser.id,
          toolkitId: `bundle:${itemId}`,
          stripeSessionId: bundleSessionId,
          membershipGranted: grantMembershipBonus,
          membershipTier: membershipTier as SubscriptionTier,
          membershipMonths: grantMembershipBonus ? membershipMonths : 0,
        },
        update: {},
      });

      // 1b. Grant ALL 6 individual toolkits so individual download/toolkits endpoints work directly
      for (const tk of TOOLKITS) {
        const existingPurchase = await prisma.toolkitPurchase.findFirst({
          where: { userId: targetUser.id, toolkitId: tk.id },
        });
        if (!existingPurchase) {
          await prisma.toolkitPurchase.create({
            data: {
              userId: targetUser.id,
              toolkitId: tk.id,
              stripeSessionId: `admin_bundle_included_${itemId}_${tk.id}_${grantDateTag}`,
              membershipGranted: false,
              membershipTier: tk.membershipTier,
              membershipMonths: 0,
            },
          });
        }

        // Create 12-month staff training license for each toolkit (10 seats for Plus, 5 for standard)
        const seats = isBundlePlus ? Math.max(staffSeats, 10) : 5;
        const licExpires = new Date();
        licExpires.setFullYear(licExpires.getFullYear() + 1);

        await prisma.trainingLicense.upsert({
          where: { eroId_toolkitId: { eroId: targetUser.id, toolkitId: tk.id } },
          create: {
            eroId: targetUser.id,
            toolkitId: tk.id,
            totalSeats: seats,
            expiresAt: licExpires,
          },
          update: {
            totalSeats: { increment: 0 },
          },
        });
      }

      // 1c. If Ultimate Bundle PLUS, enroll in ALL 6 masterclass courses
      if (isBundlePlus) {
        for (const c of COURSES) {
          try {
            const dbCourse = await ensureDbCourse(c.id, adminSession.user.id);
            const existingEnrollment = await prisma.enrollment.findUnique({
              where: { userId_courseId: { userId: targetUser.id, courseId: dbCourse.id } },
            });
            if (!existingEnrollment) {
              await prisma.enrollment.create({
                data: { userId: targetUser.id, courseId: dbCourse.id },
              });
            }
          } catch (err) {
            console.error(`Failed auto-enrolling bundle course ${c.slug}:`, err);
          }
        }
      }

      // 1d. Grant Membership Bonus if requested
      if (grantMembershipBonus && membershipMonths > 0) {
        let newPeriodEnd = new Date();
        if (targetUser.subscription?.currentPeriodEnd && new Date(targetUser.subscription.currentPeriodEnd) > now) {
          newPeriodEnd = new Date(targetUser.subscription.currentPeriodEnd);
        }
        newPeriodEnd.setMonth(newPeriodEnd.getMonth() + membershipMonths);

        await prisma.subscription.upsert({
          where: { userId: targetUser.id },
          create: {
            userId: targetUser.id,
            plan: membershipTier as SubscriptionTier,
            status: "active",
            currentPeriodEnd: newPeriodEnd,
          },
          update: {
            plan: membershipTier as SubscriptionTier,
            status: "active",
            currentPeriodEnd: newPeriodEnd,
          },
        });

        await prisma.user.update({
          where: { id: targetUser.id },
          data: { tier: membershipTier as SubscriptionTier },
        });
      }

      // 1e. Send notification
      if (notifyUser) {
        await prisma.notification.create({
          data: {
            userId: targetUser.id,
            type: "SYSTEM",
            title: `🏆 ${bundleName} Unlocked!`,
            message: `You've been granted full lifetime access to the complete ${bundleName} including all toolkits, video masterclasses, and training licenses!`,
            link: "/toolkits",
          },
        }).catch(() => {});
      }

      return NextResponse.json({
        success: true,
        message: `Successfully granted ${bundleName} to ${targetUser.name || targetUser.email}.`,
      });
    }

    // ═════════════════════════════════════════════════════════════════
    // 2. GRANT TOOLKIT
    // ═════════════════════════════════════════════════════════════════
    if (itemType === "toolkit") {
      const toolkit = getToolkit(itemId);
      const tkName = toolkit?.name || itemId;

      // 2a. Record ToolkitPurchase
      const tkSessionId = `admin_grant_tk_${itemId}_${grantDateTag}_${randomSuffix}`;
      const existing = await prisma.toolkitPurchase.findFirst({
        where: { userId: targetUser.id, toolkitId: itemId },
      });

      if (!existing) {
        await prisma.toolkitPurchase.create({
          data: {
            userId: targetUser.id,
            toolkitId: itemId,
            stripeSessionId: tkSessionId,
            membershipGranted: grantMembershipBonus,
            membershipTier: (toolkit?.membershipTier || membershipTier) as SubscriptionTier,
            membershipMonths: grantMembershipBonus ? (toolkit?.membershipMonths || membershipMonths) : 0,
          },
        });
      }

      // 2b. Auto-grant staff training license seats (valid 12 months)
      const licExpires = new Date();
      licExpires.setFullYear(licExpires.getFullYear() + 1);

      await prisma.trainingLicense.upsert({
        where: { eroId_toolkitId: { eroId: targetUser.id, toolkitId: itemId } },
        create: {
          eroId: targetUser.id,
          toolkitId: itemId,
          totalSeats: Math.max(staffSeats, 5),
          expiresAt: licExpires,
        },
        update: {},
      });

      // 2c. Membership bonus
      if (grantMembershipBonus && membershipMonths > 0) {
        let newPeriodEnd = new Date();
        if (targetUser.subscription?.currentPeriodEnd && new Date(targetUser.subscription.currentPeriodEnd) > now) {
          newPeriodEnd = new Date(targetUser.subscription.currentPeriodEnd);
        }
        newPeriodEnd.setMonth(newPeriodEnd.getMonth() + membershipMonths);

        await prisma.subscription.upsert({
          where: { userId: targetUser.id },
          create: {
            userId: targetUser.id,
            plan: membershipTier as SubscriptionTier,
            status: "active",
            currentPeriodEnd: newPeriodEnd,
          },
          update: {
            plan: membershipTier as SubscriptionTier,
            status: "active",
            currentPeriodEnd: newPeriodEnd,
          },
        });

        await prisma.user.update({
          where: { id: targetUser.id },
          data: { tier: membershipTier as SubscriptionTier },
        });
      }

      // 2d. Notification
      if (notifyUser) {
        await prisma.notification.create({
          data: {
            userId: targetUser.id,
            type: "SYSTEM",
            title: `📦 Toolkit Access Granted: ${tkName}`,
            message: `You now have full access to ${tkName} and its practice deliverables & training resources.`,
            link: "/toolkits",
          },
        }).catch(() => {});
      }

      return NextResponse.json({
        success: true,
        message: `Successfully granted ${tkName} to ${targetUser.name || targetUser.email}.`,
      });
    }

    // ═════════════════════════════════════════════════════════════════
    // 3. GRANT COURSE
    // ═════════════════════════════════════════════════════════════════
    if (itemType === "course") {
      const canonical = COURSES.find((c) => c.id === itemId || c.slug === itemId);
      const courseTitle = canonical?.title || itemId;

      // 3a. Ensure Course exists in DB
      const dbCourse = await ensureDbCourse(itemId, adminSession.user.id);

      // 3b. Upsert Enrollment
      const existingEnrollment = await prisma.enrollment.findUnique({
        where: { userId_courseId: { userId: targetUser.id, courseId: dbCourse.id } },
      });

      if (!existingEnrollment) {
        await prisma.enrollment.create({
          data: {
            userId: targetUser.id,
            courseId: dbCourse.id,
          },
        });
      }

      // 3c. Ensure staff training license for Atlas Academy / ERO Center
      const toolkitEquivalent =
        canonical?.slug === "30-day-launch" || canonical?.id === "30-day-tax-office-launch"
          ? "30-day-tax-office"
          : canonical?.slug === "due-diligence" || canonical?.id === "staff-audit-ready-due-diligence"
          ? "due-diligence-course"
          : canonical?.slug === "irs-audit-playbook" || canonical?.id === "irs-audit-playbook-course"
          ? "audit-playbook"
          : canonical?.slug || itemId;

      const licExpires = new Date();
      licExpires.setFullYear(licExpires.getFullYear() + 1);

      await prisma.trainingLicense.upsert({
        where: { eroId_toolkitId: { eroId: targetUser.id, toolkitId: toolkitEquivalent } },
        create: {
          eroId: targetUser.id,
          toolkitId: toolkitEquivalent,
          totalSeats: Math.max(staffSeats, 5),
          expiresAt: licExpires,
        },
        update: {},
      });

      // 3d. Notification
      if (notifyUser) {
        await prisma.notification.create({
          data: {
            userId: targetUser.id,
            type: "SYSTEM",
            title: `🎓 Course Access Granted: ${courseTitle}`,
            message: `You've been enrolled in the masterclass course: "${courseTitle}". You can begin your lessons immediately!`,
            link: `/courses/${dbCourse.slug}`,
          },
        }).catch(() => {});
      }

      return NextResponse.json({
        success: true,
        message: `Successfully enrolled ${targetUser.name || targetUser.email} in ${courseTitle}.`,
      });
    }

    return NextResponse.json({ error: "Invalid itemType specified" }, { status: 400 });
  } catch (err: any) {
    console.error("Failed to grant access:", err);
    return NextResponse.json(
      { error: err.message || "Failed to grant access" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/users/[userId]/access
 * Revoke access to a Toolkit, Course, or Bundle
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const adminSession = await requireAdmin(req);
  if (!adminSession) {
    return NextResponse.json({ error: "Forbidden. Admin access required." }, { status: 403 });
  }

  const { userId } = await params;
  if (!userId) {
    return NextResponse.json({ error: "User ID is required" }, { status: 400 });
  }

  const body = await req.json().catch(() => ({}));
  const { itemType, itemId } = body;

  if (!itemType || !itemId) {
    return NextResponse.json(
      { error: "itemType (toolkit/course/bundle) and itemId are required." },
      { status: 400 }
    );
  }

  try {
    if (itemType === "bundle") {
      // Remove bundle purchase records
      await prisma.toolkitPurchase.deleteMany({
        where: {
          userId,
          OR: [
            { toolkitId: `bundle:${itemId}` },
            { toolkitId: itemId },
            { stripeSessionId: { startsWith: `admin_bundle_included_${itemId}` } },
            { stripeSessionId: { startsWith: `admin_grant_bundle_${itemId}` } },
            { stripeSessionId: { startsWith: `admin_bulk_grant_${itemId}` } },
          ],
        },
      });

      return NextResponse.json({ success: true, message: `Bundle ${itemId} access revoked.` });
    }

    if (itemType === "toolkit") {
      const aliases = TOOLKIT_ALIAS_MAP[itemId] || [itemId];
      const allTkIds = Array.from(new Set([itemId, ...aliases, ...aliases.map((a) => `toolkit:${a}`)]));

      await prisma.toolkitPurchase.deleteMany({
        where: {
          userId,
          toolkitId: { in: allTkIds },
        },
      });

      await prisma.trainingLicense.deleteMany({
        where: {
          eroId: userId,
          toolkitId: { in: allTkIds },
        },
      });

      return NextResponse.json({ success: true, message: `Toolkit ${itemId} access revoked.` });
    }

    if (itemType === "course") {
      const canonical = COURSES.find((c) => c.id === itemId || c.slug === itemId);
      const aliases = canonical
        ? Array.from(
            new Set([
              canonical.slug,
              canonical.id,
              ...(COURSE_ALIAS_MAP[canonical.slug] || []),
              ...(COURSE_ALIAS_MAP[canonical.id] || []),
            ])
          )
        : [itemId];

      const courses = await prisma.course.findMany({
        where: {
          OR: [
            { id: itemId },
            { slug: itemId },
            ...aliases.map((a) => ({ id: a })),
            ...aliases.map((a) => ({ slug: a })),
          ],
        },
        select: { id: true },
      });

      const courseIds = Array.from(new Set([itemId, ...courses.map((c) => c.id), ...aliases]));

      await prisma.enrollment.deleteMany({
        where: {
          userId,
          courseId: { in: courseIds },
        },
      });

      const toolkitEquivalent =
        canonical?.slug === "30-day-launch" || canonical?.id === "30-day-tax-office-launch"
          ? "30-day-tax-office"
          : canonical?.slug === "due-diligence" || canonical?.id === "staff-audit-ready-due-diligence"
          ? "due-diligence-course"
          : canonical?.slug === "irs-audit-playbook" || canonical?.id === "irs-audit-playbook-course"
          ? "audit-playbook"
          : canonical?.slug || itemId;

      await prisma.trainingLicense.deleteMany({
        where: {
          eroId: userId,
          toolkitId: { in: [toolkitEquivalent, itemId, ...(canonical ? [canonical.slug, canonical.id] : [])] },
        },
      });

      return NextResponse.json({ success: true, message: `Course ${itemId} access revoked.` });
    }

    return NextResponse.json({ error: "Invalid itemType" }, { status: 400 });
  } catch (err: any) {
    console.error("Failed to revoke access:", err);
    return NextResponse.json(
      { error: err.message || "Failed to revoke access" },
      { status: 500 }
    );
  }
}

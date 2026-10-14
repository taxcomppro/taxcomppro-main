import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const adminSession = await requireAdmin(req);
  if (!adminSession) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { userId } = await params;
  if (!userId) {
    return NextResponse.json({ error: "User ID is required" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      subscription: true,
      digitalCard: true,
      toolkitPurchases: {
        orderBy: { createdAt: "desc" },
      },
      marketplacePurchases: {
        include: {
          listing: { select: { id: true, title: true, price: true, category: true } },
        },
        orderBy: { createdAt: "desc" },
      },
      featuredListings: {
        include: {
          listing: { select: { id: true, title: true } },
        },
        orderBy: { createdAt: "desc" },
      },
      proAds: {
        orderBy: { createdAt: "desc" },
      },
      enrollments: {
        include: {
          course: { select: { id: true, title: true, slug: true, level: true } },
          progress: true,
        },
        orderBy: { createdAt: "desc" },
      },
      trainingLicenses: {
        orderBy: { createdAt: "desc" },
      },
      sessions: {
        orderBy: { expiresAt: "desc" },
        take: 5,
        select: { id: true, expiresAt: true, ipAddress: true, userAgent: true, createdAt: true },
      },
      _count: {
        select: {
          posts: true,
          comments: true,
          communityMembers: true,
          listings: true,
          proServices: true,
          reviewsGiven: true,
          reviewsReceived: true,
          enrollments: true,
        },
      },
    },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  return NextResponse.json(user, { headers: { "Cache-Control": "private, no-store" } });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const adminSession = await requireAdmin(req);
  if (!adminSession) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { userId } = await params;
  if (!userId) {
    return NextResponse.json({ error: "User ID is required" }, { status: 400 });
  }

  // Prevent admin from deleting their own account
  if (adminSession.user.id === userId) {
    return NextResponse.json(
      { error: "You cannot delete your own admin account." },
      { status: 400 }
    );
  }

  const targetUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true, email: true, name: true },
  });

  if (!targetUser) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  try {
    await prisma.$transaction(
      async (tx) => {
        // 1. Disassociate or clean up simple optional FK references
        await tx.atlasUnansweredQuestion.updateMany({
          where: { userId },
          data: { userId: null },
        });

        await tx.supportTicket.updateMany({
          where: { userId },
          data: { userId: null },
        });

        await tx.spaceReport.updateMany({
          where: { reportedUserId: userId },
          data: { reportedUserId: null },
        });

        await tx.academyProfile.updateMany({
          where: { tcpUserId: userId },
          data: { tcpUserId: null },
        });

        await tx.newsletterCampaign.updateMany({
          where: { createdById: userId },
          data: { createdById: null },
        });

        // 2. Staff Invitations (Preparer & ERO) & Training
        await tx.staffInvitation.updateMany({
          where: { userId },
          data: { userId: null },
        });

        // Delete invitations sent by this user as ERO and their children
        await tx.assessmentAttempt.deleteMany({
          where: { invitation: { eroId: userId } },
        });
        await tx.trainingAcknowledgment.deleteMany({
          where: { invitation: { eroId: userId } },
        });
        await tx.trainingCertificate.deleteMany({
          where: { invitation: { eroId: userId } },
        });
        await tx.staffInvitation.deleteMany({
          where: { eroId: userId },
        });
        await tx.trainingSeatPurchase.deleteMany({
          where: { license: { eroId: userId } },
        });
        await tx.trainingLicense.deleteMany({
          where: { eroId: userId },
        });

        // 3. Affiliate Referrals & Profile
        // Delete referrals where this user was the referred user
        await tx.affiliateReferral.deleteMany({
          where: { referredUserId: userId },
        });

        // Delete referrals and payouts belonging to this user's affiliate profile
        await tx.affiliateReferral.deleteMany({
          where: { affiliate: { userId } },
        });
        await tx.affiliatePayout.deleteMany({
          where: { affiliate: { userId } },
        });
        await tx.affiliateProfile.deleteMany({
          where: { userId },
        });

        // 4. Forums (Votes, Comments, Posts, Forums)
        await tx.forumVote.deleteMany({
          where: { userId },
        });

        // Forum comments where user is author
        await tx.forumComment.deleteMany({
          where: { parent: { authorId: userId } },
        });
        await tx.forumComment.deleteMany({
          where: { authorId: userId },
        });

        // Forum posts where user is author (and votes/comments on those posts)
        await tx.forumVote.deleteMany({
          where: { post: { authorId: userId } },
        });
        await tx.forumComment.deleteMany({
          where: { post: { authorId: userId } },
        });
        await tx.forumPost.deleteMany({
          where: { authorId: userId },
        });

        // Forums created by user
        await tx.forumVote.deleteMany({
          where: { post: { forum: { createdById: userId } } },
        });
        await tx.forumComment.deleteMany({
          where: { post: { forum: { createdById: userId } } },
        });
        await tx.forumPost.deleteMany({
          where: { forum: { createdById: userId } },
        });
        await tx.forum.deleteMany({
          where: { createdById: userId },
        });

        // 5. Courses & Learning (Instructor & Student)
        // User's student activity
        await tx.courseRating.deleteMany({
          where: { userId },
        });
        await tx.quizAttempt.deleteMany({
          where: { userId },
        });
        await tx.lessonProgress.deleteMany({
          where: { enrollment: { userId } },
        });
        await tx.enrollment.deleteMany({
          where: { userId },
        });

        // Courses taught by this user as instructor
        await tx.courseRating.deleteMany({
          where: { course: { instructorId: userId } },
        });
        await tx.lessonProgress.deleteMany({
          where: { enrollment: { course: { instructorId: userId } } },
        });
        await tx.enrollment.deleteMany({
          where: { course: { instructorId: userId } },
        });
        await tx.quizAttempt.deleteMany({
          where: { quiz: { lesson: { section: { course: { instructorId: userId } } } } },
        });
        await tx.quizQuestion.deleteMany({
          where: { quiz: { lesson: { section: { course: { instructorId: userId } } } } },
        });
        await tx.quiz.deleteMany({
          where: { lesson: { section: { course: { instructorId: userId } } } },
        });
        await tx.lessonProgress.deleteMany({
          where: { lesson: { section: { course: { instructorId: userId } } } },
        });
        await tx.lesson.deleteMany({
          where: { section: { course: { instructorId: userId } } },
        });
        await tx.courseSection.deleteMany({
          where: { course: { instructorId: userId } },
        });
        await tx.course.deleteMany({
          where: { instructorId: userId },
        });

        // 6. Pro Networks (Participation & Ownership)
        // User activity in networks
        await tx.proNetworkDiscussionReply.deleteMany({
          where: { authorId: userId },
        });
        await tx.proNetworkDiscussion.deleteMany({
          where: { authorId: userId },
        });
        await tx.proNetworkChatMessage.deleteMany({
          where: { senderId: userId },
        });
        await tx.proNetworkQuestion.deleteMany({
          where: { userId },
        });
        await tx.proNetworkEventRsvp.deleteMany({
          where: { userId },
        });
        await tx.proNetworkMedia.deleteMany({
          where: { uploaderId: userId },
        });
        await tx.proNetworkResource.deleteMany({
          where: { uploaderId: userId },
        });
        await tx.proNetworkAnnouncement.deleteMany({
          where: { authorId: userId },
        });
        await tx.proNetworkEvent.deleteMany({
          where: { hostId: userId },
        });
        await tx.proNetworkMember.deleteMany({
          where: { userId },
        });
        await tx.proNetworkFollower.deleteMany({
          where: { userId },
        });

        // Networks owned by user
        await tx.proNetworkDiscussionReply.deleteMany({
          where: { discussion: { network: { ownerId: userId } } },
        });
        await tx.proNetworkDiscussion.deleteMany({
          where: { network: { ownerId: userId } },
        });
        await tx.proNetworkChatMessage.deleteMany({
          where: { network: { ownerId: userId } },
        });
        await tx.proNetworkQuestion.deleteMany({
          where: { network: { ownerId: userId } },
        });
        await tx.proNetworkEventRsvp.deleteMany({
          where: { event: { network: { ownerId: userId } } },
        });
        await tx.proNetworkEvent.deleteMany({
          where: { network: { ownerId: userId } },
        });
        await tx.proNetworkMedia.deleteMany({
          where: { network: { ownerId: userId } },
        });
        await tx.proNetworkResource.deleteMany({
          where: { network: { ownerId: userId } },
        });
        await tx.proNetworkAnnouncement.deleteMany({
          where: { network: { ownerId: userId } },
        });
        await tx.proNetworkMember.deleteMany({
          where: { network: { ownerId: userId } },
        });
        await tx.proNetworkFollower.deleteMany({
          where: { network: { ownerId: userId } },
        });
        await tx.proNetwork.deleteMany({
          where: { ownerId: userId },
        });

        // 7. Spaces
        await tx.spaceRsvp.deleteMany({
          where: { userId },
        });
        await tx.spaceAttendance.deleteMany({
          where: { userId },
        });
        await tx.spaceReport.deleteMany({
          where: { reporterId: userId },
        });
        await tx.spaceRsvp.deleteMany({
          where: { space: { hostId: userId } },
        });
        await tx.spaceAttendance.deleteMany({
          where: { space: { hostId: userId } },
        });
        await tx.spaceReport.deleteMany({
          where: { space: { hostId: userId } },
        });
        await tx.space.deleteMany({
          where: { hostId: userId },
        });

        // 8. Marketplace & Ads & Services
        await tx.featuredListingRequest.deleteMany({
          where: { userId },
        });
        await tx.marketplacePurchase.deleteMany({
          where: { userId },
        });
        await tx.marketplaceCoupon.deleteMany({
          where: { sellerId: userId },
        });
        await tx.marketplaceReferral.deleteMany({
          where: { sellerId: userId },
        });

        // Listings owned by user
        await tx.featuredListingRequest.deleteMany({
          where: { listing: { userId } },
        });
        await tx.marketplacePurchase.deleteMany({
          where: { listing: { userId } },
        });
        await tx.marketplaceCoupon.deleteMany({
          where: { listing: { userId } },
        });
        await tx.marketplaceReferral.deleteMany({
          where: { listing: { userId } },
        });
        await tx.marketplaceListing.deleteMany({
          where: { userId },
        });

        await tx.toolkitPurchase.deleteMany({
          where: { userId },
        });
        await tx.proAd.deleteMany({
          where: { userId },
        });
        await tx.proService.deleteMany({
          where: { userId },
        });
        await tx.professionalApplication.deleteMany({
          where: { userId },
        });
        await tx.proReview.deleteMany({
          where: { OR: [{ proId: userId }, { reviewerId: userId }] },
        });

        // 9. Social Feed, Communities, Connections, Messages
        await tx.message.deleteMany({
          where: { OR: [{ senderId: userId }, { receiverId: userId }] },
        });
        await tx.messageBlast.deleteMany({
          where: { senderId: userId },
        });
        await tx.connection.deleteMany({
          where: { OR: [{ requesterId: userId }, { receiverId: userId }] },
        });
        await tx.userFollow.deleteMany({
          where: { OR: [{ followerId: userId }, { followingId: userId }] },
        });
        await tx.postLike.deleteMany({
          where: { userId },
        });
        await tx.comment.deleteMany({
          where: { authorId: userId },
        });
        await tx.post.updateMany({
          where: { originalPost: { authorId: userId } },
          data: { originalPostId: null },
        });
        await tx.postLike.deleteMany({
          where: { post: { authorId: userId } },
        });
        await tx.comment.deleteMany({
          where: { post: { authorId: userId } },
        });
        await tx.post.deleteMany({
          where: { authorId: userId },
        });
        await tx.communityMember.deleteMany({
          where: { userId },
        });

        // Communities created by user
        await tx.communityMember.deleteMany({
          where: { community: { creatorId: userId } },
        });
        await tx.postLike.deleteMany({
          where: { post: { community: { creatorId: userId } } },
        });
        await tx.comment.deleteMany({
          where: { post: { community: { creatorId: userId } } },
        });
        await tx.post.deleteMany({
          where: { community: { creatorId: userId } },
        });
        await tx.community.deleteMany({
          where: { creatorId: userId },
        });

        // 10. Digital Card & NFC
        const card = await tx.digitalCard.findUnique({
          where: { userId },
          select: { id: true, username: true },
        });
        if (card) {
          await tx.nfcCard.updateMany({
            where: { username: card.username },
            data: { status: "DEACTIVATED" },
          });
          await tx.cardLink.deleteMany({
            where: { cardId: card.id },
          });
          await tx.digitalCard.delete({
            where: { userId },
          });
        }

        // 11. AI Specialist
        await tx.aiActivity.deleteMany({
          where: { specialist: { userId } },
        });
        await tx.aiSpecialist.deleteMany({
          where: { userId },
        });

        // 12. Notifications, Subscriptions, Sessions, Accounts
        await tx.notification.deleteMany({
          where: { userId },
        });
        await tx.subscription.deleteMany({
          where: { userId },
        });
        await tx.session.deleteMany({
          where: { userId },
        });
        await tx.account.deleteMany({
          where: { userId },
        });

        // 13. Finally, delete the User
        await tx.user.delete({
          where: { id: userId },
        });
      },
      {
        timeout: 25000,
      }
    );

    return NextResponse.json({ success: true, deletedUserId: userId });
  } catch (error: any) {
    console.error("Failed to delete user:", error);
    return NextResponse.json(
      {
        error:
          error?.message ||
          "Failed to delete user and associated records.",
      },
      { status: 500 }
    );
  }
}

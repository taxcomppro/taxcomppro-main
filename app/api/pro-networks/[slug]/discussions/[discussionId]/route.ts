import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string; discussionId: string }> }
) {
  try {
    const session = await auth.api.getSession({ headers: req.headers });
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { slug, discussionId } = await params;
    const network = await prisma.proNetwork.findUnique({
      where: { slug }, select: { id: true, ownerId: true },
    });
    if (!network) {
      return NextResponse.json({ error: "Network not found" }, { status: 404 });
    }
    if (network.ownerId !== session.user.id) {
      return NextResponse.json({ error: "Only the network owner can delete discussions" }, { status: 403 });
    }
    // Scope the deletion to this network; related replies cascade in the schema.
    const result = await prisma.proNetworkDiscussion.deleteMany({
      where: { id: discussionId, networkId: network.id },
    });
    if (result.count === 0) {
      return NextResponse.json({ error: "Discussion not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete discussion:", error);
    return NextResponse.json({ error: "Failed to delete discussion" }, { status: 500 });
  }
}

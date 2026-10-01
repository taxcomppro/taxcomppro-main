import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET — admin: list all applications
export async function GET(req: NextRequest) {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session || session.user.role !== "ADMIN")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") ?? "ALL";

  const apps = await prisma.professionalApplication.findMany({
    where: status === "ALL" ? {} : { status: status as "PENDING" | "APPROVED" | "REJECTED" },
    include: {
      user: { select: { id: true, name: true, image: true, email: true, headline: true, createdAt: true } },
    },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(apps);
}

// PATCH — admin: approve or reject an application
export async function PATCH(req: NextRequest) {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session || session.user.role !== "ADMIN")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { applicationId, status, note } = await req.json() as {
    applicationId: string;
    status: "APPROVED" | "REJECTED";
    note?: string;
  };

  if (!applicationId || !["APPROVED", "REJECTED"].includes(status))
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });

  // Update the application
  const app = await prisma.professionalApplication.update({
    where: { id: applicationId },
    data: { status, note: note?.trim() || null },
    include: { user: { select: { id: true, name: true, email: true } } },
  });

  // If approved → upgrade user tier to MARKETPLACE
  if (status === "APPROVED") {
    await prisma.user.update({
      where: { id: app.userId },
      data: { tier: "MARKETPLACE" },
    });
  }

  // Send notification to the user
  await prisma.notification.create({
    data: {
      userId:  app.userId,
      type:    "SYSTEM",
      title:   status === "APPROVED" ? "🎉 Application Approved!" : "Application Update",
      message: status === "APPROVED"
        ? "Congratulations! Your professional application has been approved. You are now a Verified Professional."
        : `Your professional application was not approved.${note ? ` Reason: ${note}` : ""}`,
    },
  });

  return NextResponse.json(app);
}

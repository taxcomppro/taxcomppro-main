import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ id: string }> };

// PATCH — admin approve or reject
export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session || session.user.role !== "ADMIN")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const { action, note } = await req.json() as { action: "approve" | "reject"; note?: string };

  const app = await prisma.professionalApplication.findUnique({ where: { id } });
  if (!app) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (action === "approve") {
    await prisma.$transaction([
      prisma.professionalApplication.update({
        where: { id },
        data: { status: "APPROVED", note: note ?? null },
      }),
      prisma.user.update({
        where: { id: app.userId },
        data: { tier: "MARKETPLACE" },
      }),
      prisma.notification.create({
        data: {
          userId: app.userId,
          type: "PRO_APPROVED",
          title: "🎉 You're now a Professional!",
          message: "Your application has been approved. Your profile now appears in the Pros directory.",
          link: "/find-a-pro/" + app.userId,
        },
      }),
    ]);
  } else {
    await prisma.$transaction([
      prisma.professionalApplication.update({
        where: { id },
        data: { status: "REJECTED", note: note ?? null },
      }),
      prisma.notification.create({
        data: {
          userId: app.userId,
          type: "PRO_REJECTED",
          title: "Application Update",
          message: note ? `Your professional application was not approved: ${note}` : "Your professional application was not approved at this time.",
          link: "/profile",
        },
      }),
    ]);
  }

  return NextResponse.json({ success: true });
}

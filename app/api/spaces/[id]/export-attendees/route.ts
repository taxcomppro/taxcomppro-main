import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { loadTalkAttendance, attendanceCsvHeader, attendanceCsvRows } from "@/lib/talk-attendance";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session?.user?.id) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  try {
    const { id } = await params;
    const space = await prisma.space.findUnique({ where: { id }, select: { hostId: true, coHostIds: true } });
    if (!space) return NextResponse.json({ error: "Talk not found" }, { status: 404 });
    const actor = await prisma.user.findUnique({ where: { id: session.user.id }, select: { role: true } });
    if (actor?.role !== "ADMIN" && space.hostId !== session.user.id && !space.coHostIds.includes(session.user.id)) return NextResponse.json({ error: "Only the host, co-host or an administrator can access attendance" }, { status: 403 });
    const report = await loadTalkAttendance(id);
    if (!report) return NextResponse.json({ error: "Talk not found" }, { status: 404 });
    if (req.nextUrl.searchParams.get("format") === "json") return NextResponse.json(report, { headers: { "Cache-Control": "private, no-store" } });
    return new NextResponse("\uFEFF" + [attendanceCsvHeader, ...attendanceCsvRows(report)].join("\r\n"), { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": 'attachment; filename="pro-talk-attendees.csv"', "Cache-Control": "private, no-store" } });
  } catch (error) {
    console.error("Attendee export failed:", error);
    return NextResponse.json({ error: "Unable to export attendance. Please retry." }, { status: 500 });
  }
}

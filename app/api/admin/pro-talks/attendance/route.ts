import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import { loadTalkAttendance, attendanceCsvHeader, attendanceCsvRows } from "@/lib/talk-attendance";

export async function GET(req: NextRequest) {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session?.user?.id) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  const actor = await prisma.user.findUnique({ where: { id: session.user.id }, select: { role: true } });
  if (actor?.role !== "ADMIN") return NextResponse.json({ error: "Administrator access required" }, { status: 403 });
  try {
    const params = req.nextUrl.searchParams;
    const talkId = params.get("talkId");
    const q = (params.get("q") || "").trim().slice(0, 200);
    const status = params.get("status");
    const joinedOnly = params.get("scope") !== "all";
    const where: Prisma.SpaceWhereInput = {
      ...(talkId ? { id: talkId } : {}),
      ...(q ? { OR: [{ name: { contains: q, mode: "insensitive" } }, { host: { name: { contains: q, mode: "insensitive" } } }] } : {}),
      ...(status === "ended" ? { endedAt: { not: null } } : status === "live" ? { isLive: true, endedAt: null } : status === "upcoming" ? { isLive: false, endedAt: null } : {}),
    };
    if (params.get("format") === "csv") {
      const lines = [attendanceCsvHeader];
      let cursor: string | undefined;
      do {
        const talks = await prisma.space.findMany({ where, orderBy: { id: "asc" }, take: 50, ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}), select: { id: true } });
        if (!talks.length) break;
        for (const talk of talks) {
          const report = await loadTalkAttendance(talk.id);
          if (report) lines.push(...attendanceCsvRows(report, joinedOnly));
        }
        cursor = talks[talks.length - 1].id;
        if (talks.length < 50) break;
      } while (cursor);
      return new NextResponse("\uFEFF" + lines.join("\r\n"), { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": 'attachment; filename="pro-talk-attendance.csv"', "Cache-Control": "private, no-store" } });
    }
    if (talkId) {
      const report = await loadTalkAttendance(talkId);
      if (!report) return NextResponse.json({ error: "Talk not found" }, { status: 404 });
      return NextResponse.json(report, { headers: { "Cache-Control": "private, no-store" } });
    }
    const rawPage = Number(params.get("page") || 1);
    const page = Number.isSafeInteger(rawPage) && rawPage > 0 ? Math.min(rawPage, 100000) : 1;
    const [talks, total] = await Promise.all([
      prisma.space.findMany({ where, orderBy: [{ createdAt: "desc" }, { id: "desc" }], skip: (page - 1) * 20, take: 20,
        select: { id: true, name: true, isLive: true, scheduledAt: true, endedAt: true, createdAt: true, host: { select: { name: true, email: true } }, _count: { select: { attendances: true, rsvps: true, tickets: true } } } }),
      prisma.space.count({ where }),
    ]);
    return NextResponse.json({ talks, total, page, pages: Math.max(1, Math.ceil(total / 20)) }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    console.error("Admin attendance failed:", error);
    return NextResponse.json({ error: "Unable to load attendance. Please retry." }, { status: 500 });
  }
}

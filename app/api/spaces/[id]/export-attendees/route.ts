import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ id: string }> };

function formatTime(date?: Date | null): string {
  if (!date) return "—";
  return new Date(date).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function escapeCsvCell(value: unknown): string {
  if (value === null || value === undefined) return '""';
  const str = String(value).replace(/"/g, '""');
  return `"${str}"`;
}

export async function GET(req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const session = await auth.api.getSession({ headers: req.headers }).catch(() => null);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const space = await prisma.space.findUnique({
      where: { id },
      include: {
        host: {
          select: {
            id: true,
            name: true,
            email: true,
            headline: true,
            role: true,
          },
        },
        attendances: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                phone: true,
                headline: true,
                professionalTitle: true,
                role: true,
                tier: true,
                digitalCard: {
                  select: {
                    businessName: true,
                    professionalTitle: true,
                    phone: true,
                  },
                },
              },
            },
          },
          orderBy: { joinedAt: "asc" },
        },
        rsvps: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                phone: true,
                headline: true,
                professionalTitle: true,
                role: true,
                tier: true,
                digitalCard: {
                  select: {
                    businessName: true,
                    professionalTitle: true,
                    phone: true,
                  },
                },
              },
            },
          },
        },
        tickets: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                phone: true,
                headline: true,
                professionalTitle: true,
                role: true,
                tier: true,
                digitalCard: {
                  select: {
                    businessName: true,
                    professionalTitle: true,
                    phone: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!space) {
      return NextResponse.json({ error: "Pro Talk not found" }, { status: 404 });
    }

    const isAdmin = session.user.role === "ADMIN";
    const isHost = space.hostId === session.user.id;
    const isCoHost = Array.isArray(space.coHostIds) && space.coHostIds.includes(session.user.id);

    if (!isAdmin && !isHost && !isCoHost) {
      return NextResponse.json(
        { error: "Forbidden: Only hosts and administrators can export attendance data." },
        { status: 403 }
      );
    }

    // Map of unique members
    type MemberRow = {
      userId: string;
      fullName: string;
      company: string;
      title: string;
      email: string;
      phone: string;
      rsvpStatus: string;
      timeIn: string;
      timeOut: string;
      timeInIso: string | null;
      timeOutIso: string | null;
      durationMinutes: number | null;
      isHost: boolean;
      roleTier: string;
    };

    const membersMap = new Map<string, MemberRow>();

    // 1. Process all recorded Attendances
    for (const att of space.attendances) {
      const u = att.user;
      const uid = u?.id || `att-${att.id}`;
      const fullName = u?.name || "Participant";
      const company = u?.digitalCard?.businessName || u?.headline || "—";
      const title =
        u?.professionalTitle ||
        u?.digitalCard?.professionalTitle ||
        u?.headline ||
        (u?.role === "ADMIN" ? "Admin" : u?.tier || "Member");
      const email = u?.email || "—";
      const phone = u?.phone || u?.digitalCard?.phone || "—";
      const joinedAtDate = att.joinedAt ? new Date(att.joinedAt) : null;
      const leftAtDate = att.leftAt
        ? new Date(att.leftAt)
        : space.endedAt && joinedAtDate
        ? new Date(space.endedAt)
        : null;

      let durationMins: number | null = null;
      if (joinedAtDate && leftAtDate) {
        durationMins = Math.max(
          1,
          Math.round((leftAtDate.getTime() - joinedAtDate.getTime()) / 60000)
        );
      }

      membersMap.set(uid, {
        userId: uid,
        fullName,
        company,
        title,
        email,
        phone,
        rsvpStatus: "Attended (Live)",
        timeIn: formatTime(joinedAtDate),
        timeOut: formatTime(leftAtDate),
        timeInIso: joinedAtDate ? joinedAtDate.toISOString() : null,
        timeOutIso: leftAtDate ? leftAtDate.toISOString() : null,
        durationMinutes: durationMins,
        isHost: uid === space.hostId,
        roleTier: u?.role === "ADMIN" ? "Admin" : u?.tier || "Member",
      });
    }

    // 2. Process RSVPs (tag attended status if present, otherwise mark as No Show)
    for (const rsvp of space.rsvps) {
      const u = rsvp.user;
      const uid = u?.id || `rsvp-${rsvp.id}`;
      const existing = membersMap.get(uid);

      if (existing) {
        existing.rsvpStatus = "RSVP'd (Attended)";
      } else {
        const fullName = u?.name || rsvp.name || "Member";
        const company = u?.digitalCard?.businessName || u?.headline || "—";
        const title =
          u?.professionalTitle ||
          u?.digitalCard?.professionalTitle ||
          u?.headline ||
          (u?.role === "ADMIN" ? "Admin" : u?.tier || "Member");
        const email = u?.email || rsvp.email || "—";
        const phone = u?.phone || u?.digitalCard?.phone || "—";

        membersMap.set(uid, {
          userId: uid,
          fullName,
          company,
          title,
          email,
          phone,
          rsvpStatus: "RSVP'd (No Show)",
          timeIn: "Did Not Join",
          timeOut: "—",
          timeInIso: null,
          timeOutIso: null,
          durationMinutes: null,
          isHost: uid === space.hostId,
          roleTier: u?.role === "ADMIN" ? "Admin" : u?.tier || "Member",
        });
      }
    }

    // 3. Process Ticket Purchases
    for (const ticket of space.tickets) {
      const u = ticket.user;
      const uid = u?.id || `tkt-${ticket.id}`;
      const existing = membersMap.get(uid);

      if (existing) {
        existing.rsvpStatus =
          ticket.status === "CONFIRMED"
            ? `Ticket Confirmed #${ticket.ticketNumber} (Attended)`
            : `Ticket ${ticket.status} (Attended)`;
      } else {
        const fullName = u?.name || ticket.customerName || "Ticket Holder";
        const company = u?.digitalCard?.businessName || u?.headline || "—";
        const title =
          u?.professionalTitle ||
          u?.digitalCard?.professionalTitle ||
          u?.headline ||
          (u?.role === "ADMIN" ? "Admin" : u?.tier || "Member");
        const email = u?.email || ticket.customerEmail || "—";
        const phone = u?.phone || u?.digitalCard?.phone || "—";

        membersMap.set(uid, {
          userId: uid,
          fullName,
          company,
          title,
          email,
          phone,
          rsvpStatus:
            ticket.status === "CONFIRMED"
              ? `Ticket Confirmed #${ticket.ticketNumber} (No Show)`
              : `Ticket ${ticket.status}`,
          timeIn: "Did Not Join",
          timeOut: "—",
          timeInIso: null,
          timeOutIso: null,
          durationMinutes: null,
          isHost: uid === space.hostId,
          roleTier: u?.role === "ADMIN" ? "Admin" : u?.tier || "Member",
        });
      }
    }

    const memberRows = Array.from(membersMap.values());

    const url = new URL(req.url);
    const format = url.searchParams.get("format");

    if (format === "json") {
      return NextResponse.json({
        space: {
          id: space.id,
          name: space.name,
          category: space.category,
          mediaType: space.mediaType,
          visibility: space.visibility,
          accessType: space.accessType,
          ticketPrice: space.ticketPrice,
          totalAttendees: space.totalAttendees,
          peakAttendees: space.peakAttendees,
          createdAt: space.createdAt,
          scheduledAt: space.scheduledAt,
          endedAt: space.endedAt,
          host: space.host,
        },
        summary: {
          totalMembersTracked: memberRows.length,
          totalAttendees: space.attendances.length,
          totalRsvps: space.rsvps.length,
          totalTickets: space.tickets.length,
        },
        members: memberRows,
      });
    }

    // Default: CSV Export
    const csvHeaders = [
      "Full Name",
      "Company / Brand",
      "Title / Role",
      "Email",
      "Phone",
      "RSVP Status",
      "Time In",
      "Time Out",
      "Duration (Mins)",
    ];

    const csvLines = [
      csvHeaders.map(escapeCsvCell).join(","),
      ...memberRows.map((m) =>
        [
          m.fullName,
          m.company,
          m.title,
          m.email,
          m.phone,
          m.rsvpStatus,
          m.timeIn,
          m.timeOut,
          m.durationMinutes !== null ? String(m.durationMinutes) : "—",
        ]
          .map(escapeCsvCell)
          .join(",")
      ),
    ];

    const csvContent = "\uFEFF" + csvLines.join("\r\n"); // Include UTF-8 BOM for Excel compatibility

    const cleanTitle = (space.name || "pro-talk")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .slice(0, 40);
    const dateStr = new Date().toISOString().slice(0, 10);
    const filename = `${cleanTitle}-members-attendance-${dateStr}.csv`;

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    });
  } catch (error) {
    console.error("Error exporting pro talk attendance data:", error);
    return NextResponse.json(
      { error: "Failed to export member attendance data" },
      { status: 500 }
    );
  }
}

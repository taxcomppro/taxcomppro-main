import { prisma } from "@/lib/prisma";

const contactSelect = {
  id: true, name: true, email: true, phone: true, headline: true,
  professionalTitle: true, role: true, tier: true,
  digitalCard: { select: { businessName: true, professionalTitle: true, phone: true } },
} as const;

export async function loadTalkAttendance(id: string) {
  const space = await prisma.space.findUnique({ where: { id }, include: {
    host: { select: { id: true, name: true, email: true } },
    attendances: { include: { user: { select: contactSelect } }, orderBy: { joinedAt: "asc" } },
    rsvps: { include: { user: { select: contactSelect } }, orderBy: { createdAt: "asc" } },
    tickets: { include: { user: { select: contactSelect } }, orderBy: { createdAt: "asc" } },
  } });
  if (!space) return null;
  type User = (typeof space.attendances)[number]["user"];
  const members = new Map<string, {
    userId: string; fullName: string; company: string; title: string; email: string; phone: string;
    rsvpStatus: string; registered: boolean; attended: boolean; timeIn: string; timeOut: string;
    timeInIso: string | null; timeOutIso: string | null; durationMinutes: number | null;
    isHost: boolean; roleTier: string; ticketNumber: string; ticketStatus: string;
    paymentStatus: string; pricePaid: number | null; currency: string;
  }>();
  const row = (key: string, user: User, name = "Participant", email = "") => {
    let result = members.get(key);
    if (!result) {
      result = { userId: user?.id || key, fullName: user?.name || name, email: user?.email || email,
        company: user?.digitalCard?.businessName || "", title: user?.professionalTitle || user?.digitalCard?.professionalTitle || user?.headline || "",
        phone: user?.phone || user?.digitalCard?.phone || "", rsvpStatus: "", registered: false, attended: false,
        timeIn: "Did Not Join", timeOut: "—", timeInIso: null, timeOutIso: null, durationMinutes: null,
        isHost: user?.id === space.hostId, roleTier: user?.role === "ADMIN" ? "Admin" : user?.tier || "Guest",
        ticketNumber: "", ticketStatus: "", paymentStatus: "", pricePaid: null, currency: "" };
      members.set(key, result);
    }
    return result;
  };
  // Prefer member identity; email joins a guest RSVP to a later member record.
  const emailKeys = new Map<string, string>();
  for (const entry of [...space.attendances, ...space.rsvps, ...space.tickets]) {
    if (entry.user?.email) emailKeys.set(entry.user.email.toLowerCase(), entry.user.id);
  }
  const keyFor = (user: User, email: string | null | undefined, fallback: string) => user?.id || (email ? emailKeys.get(email.toLowerCase()) || `email:${email.toLowerCase()}` : fallback);
  for (const attendance of space.attendances) {
    const result = row(keyFor(attendance.user, attendance.user?.email, `attendance:${attendance.id}`), attendance.user);
    const joinedAt = attendance.joinedAt;
    const leftAt = attendance.leftAt || space.endedAt;
    result.attended = true;
    result.timeInIso = joinedAt.toISOString();
    result.timeOutIso = leftAt?.toISOString() || null;
    result.timeIn = result.timeInIso;
    result.timeOut = result.timeOutIso || "Still in session";
    result.durationMinutes = leftAt ? Math.max(0, Math.round((leftAt.getTime() - joinedAt.getTime()) / 60000)) : null;
  }
  for (const rsvp of space.rsvps) row(keyFor(rsvp.user, rsvp.email, `rsvp:${rsvp.id}`), rsvp.user, rsvp.name, rsvp.email || "").registered = true;
  for (const ticket of space.tickets) {
    const result = row(keyFor(ticket.user, ticket.customerEmail, `ticket:${ticket.id}`), ticket.user, ticket.customerName, ticket.customerEmail);
    result.ticketNumber = ticket.ticketNumber;
    result.ticketStatus = ticket.status;
    result.paymentStatus = ticket.paymentStatus;
    result.pricePaid = ticket.pricePaid;
    result.currency = ticket.currency;
  }
  for (const result of members.values()) {
    const presence = result.attended ? "Attended" : space.endedAt ? "Did not attend" : "Not joined yet";
    result.rsvpStatus = [presence, result.registered ? "RSVP" : "", result.ticketStatus ? `Ticket ${result.ticketStatus}` : ""].filter(Boolean).join(" · ");
  }
  const rows = [...members.values()];
  return { space: { id: space.id, name: space.name, host: space.host, category: space.category, isLive: space.isLive, scheduledAt: space.scheduledAt, endedAt: space.endedAt, createdAt: space.createdAt, totalAttendees: space.totalAttendees, peakAttendees: space.peakAttendees },
    summary: { totalMembersTracked: rows.length, totalAttendees: rows.filter(row => row.attended).length, totalRsvps: space.rsvps.length, totalTickets: space.tickets.length }, members: rows };
}

export function csvCell(value: unknown) {
  const text = value == null ? "" : String(value);
  // Protect spreadsheet users from formulas in attendee-entered fields.
  return `"${(/^[\s]*[=+@-]|^[\t\r\n]/.test(text) ? "'" + text : text).replaceAll('"', '""')}"`;
}
export const attendanceCsvHeader = ["Talk ID", "Pro Talk", "Host", "Member ID", "Full Name", "Company", "Professional Title", "Email", "Phone", "Attendance", "RSVP", "Joined At (UTC)", "Left At (UTC)", "First-to-last visit (minutes)", "Ticket Number", "Ticket Status", "Payment Status", "Price Paid", "Currency"].map(csvCell).join(",");
export function attendanceCsvRows(report: NonNullable<Awaited<ReturnType<typeof loadTalkAttendance>>>, joinedOnly = false) {
  return report.members.filter(row => !joinedOnly || row.attended).map(row => [report.space.id, report.space.name, report.space.host.name, row.userId, row.fullName, row.company, row.title, row.email, row.phone, row.attended ? "Attended" : "Not attended", row.registered ? "Yes" : "No", row.timeInIso, row.timeOutIso, row.durationMinutes, row.ticketNumber, row.ticketStatus, row.paymentStatus, row.pricePaid, row.currency].map(csvCell).join(","));
}

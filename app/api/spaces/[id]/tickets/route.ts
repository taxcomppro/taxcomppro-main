import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ id: string }> };

// GET /api/spaces/[id]/tickets — Host dashboard data & attendee list / CSV export
export async function GET(req: NextRequest, { params }: Params) {
  try {
    const session = await auth.api.getSession({ headers: req.headers });
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const space = await prisma.space.findUnique({
      where: { id },
      include: {
        host: {
          select: {
            id: true,
            name: true,
            email: true,
            stripeAccountId: true,
            stripeOnboarded: true,
          },
        },
      },
    });

    if (!space) {
      return NextResponse.json({ error: "Pro Talk not found." }, { status: 404 });
    }

    const isHost = space.hostId === session.user.id;
    const isAdmin = session.user.role === "ADMIN";
    if (!isHost && !isAdmin) {
      return NextResponse.json(
        { error: "Only the host or admin can view ticket sales and attendee lists." },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const format = searchParams.get("format"); // "csv" or json
    const search = searchParams.get("search")?.trim().toLowerCase();

    // Fetch all tickets for this space
    const tickets = await prisma.spaceTicket.findMany({
      where: {
        spaceId: id,
        ...(search
          ? {
              OR: [
                { customerName: { contains: search, mode: "insensitive" } },
                { customerEmail: { contains: search, mode: "insensitive" } },
                { ticketNumber: { contains: search, mode: "insensitive" } },
              ],
            }
          : {}),
      },
      orderBy: { createdAt: "desc" },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
            headline: true,
            role: true,
            tier: true,
          },
        },
      },
    });

    // Fetch capacity orders
    const capacityOrders = await prisma.spaceCapacityOrder.findMany({
      where: { spaceId: id },
      orderBy: { createdAt: "desc" },
    });

    // Compute Metrics
    const confirmedTickets = tickets.filter((t) => t.status === "CONFIRMED");
    const refundedTickets = tickets.filter((t) => t.status === "REFUNDED");

    const totalSold = confirmedTickets.length;
    const totalRefunded = refundedTickets.length;
    const capacity = space.ticketCapacity;
    const remaining = Math.max(0, capacity - totalSold);

    const grossSales = confirmedTickets.reduce((acc, t) => acc + (t.pricePaid || 0), 0);
    const totalRefundsAmount = refundedTickets.reduce((acc, t) => acc + (t.pricePaid || 0), 0);
    const netEarnings = Math.max(0, grossSales * 0.9); // Host receives 90% (10% platform fee)

    // Return CSV export if requested
    if (format === "csv") {
      const header = ["Ticket Number", "Attendee Name", "Attendee Email", "Price Paid", "Status", "Purchase Date", "Payment Status"];
      const rows = tickets.map((t) => [
        t.ticketNumber,
        `"${(t.customerName || t.user?.name || "").replace(/"/g, '""')}"`,
        `"${(t.customerEmail || t.user?.email || "").replace(/"/g, '""')}"`,
        `$${t.pricePaid.toFixed(2)}`,
        t.status,
        new Date(t.createdAt).toISOString(),
        t.paymentStatus,
      ]);

      const csvContent = [header.join(","), ...rows.map((r) => r.join(","))].join("\n");

      return new NextResponse(csvContent, {
        status: 200,
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="attendees-${space.id}-${Date.now()}.csv"`,
        },
      });
    }

    return NextResponse.json({
      space: {
        id: space.id,
        name: space.name,
        ticketPrice: space.ticketPrice,
        ticketCapacity: space.ticketCapacity,
        baseTicketAllowance: space.baseTicketAllowance,
        bonusTicketCapacity: space.bonusTicketCapacity,
        ticketsSold: totalSold,
        salesClosedEarly: space.salesClosedEarly,
        salesStartsAt: space.salesStartsAt,
        salesEndsAt: space.salesEndsAt,
        refundPolicy: space.refundPolicy,
        refundUntil: space.refundUntil,
      },
      metrics: {
        totalSold,
        totalRefunded,
        capacity,
        remaining,
        grossSales,
        netEarnings,
        totalRefundsAmount,
      },
      attendees: tickets.map((t) => ({
        id: t.id,
        ticketNumber: t.ticketNumber,
        customerName: t.customerName || t.user?.name || "Member",
        customerEmail: t.customerEmail || t.user?.email || "",
        image: t.user?.image || null,
        pricePaid: t.pricePaid,
        status: t.status,
        paymentStatus: t.paymentStatus,
        createdAt: t.createdAt,
        refundedAt: t.refundedAt,
        refundReason: t.refundReason,
        userId: t.userId,
      })),
      capacityOrders,
    });
  } catch (err) {
    console.error("[Host Tickets API] Error:", err);
    return NextResponse.json(
      { error: "Failed to fetch ticket sales data." },
      { status: 500 }
    );
  }
}

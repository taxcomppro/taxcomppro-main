export interface TicketCapacityPack {
  id: string;
  key: "PACK_25" | "PACK_50" | "PACK_100" | "PACK_250" | "PACK_500";
  name: string;
  label: string;
  tickets: number;
  bonusCapacity: number;
  price: number;
  badge?: string;
  desc: string;
}

export const BASE_TICKET_ALLOWANCE = 25;

export const TICKET_CAPACITY_PACKS: TicketCapacityPack[] = [
  {
    id: "pack-25",
    key: "PACK_25",
    name: "Ticket Pack 1",
    label: "+25 Tickets",
    tickets: 25,
    bonusCapacity: 25,
    price: 9.99,
    desc: "Great for intimate workshops & mastermind sessions",
  },
  {
    id: "pack-50",
    key: "PACK_50",
    name: "Ticket Pack 2",
    label: "+50 Tickets",
    tickets: 50,
    bonusCapacity: 50,
    price: 14.99,
    badge: "Popular",
    desc: "Ideal for masterclasses & intermediate group talks",
  },
  {
    id: "pack-100",
    key: "PACK_100",
    name: "Ticket Pack 3",
    label: "+100 Tickets",
    tickets: 100,
    bonusCapacity: 100,
    price: 24.99,
    badge: "Best Value",
    desc: "Scale up for large presentations & high-demand topics",
  },
  {
    id: "pack-250",
    key: "PACK_250",
    name: "Large Event",
    label: "+250 Tickets",
    tickets: 250,
    bonusCapacity: 250,
    price: 49.99,
    desc: "Large Summit Stage for community-wide events",
  },
  {
    id: "pack-500",
    key: "PACK_500",
    name: "Premier Event",
    label: "+500 Tickets",
    tickets: 500,
    bonusCapacity: 500,
    price: 99.99,
    desc: "Premier Keynote Stage for mega events & conferences",
  },
];

export function generateTicketNumber(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let randomPart = "";
  for (let i = 0; i < 4; i++) {
    randomPart += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  const timestampPart = Date.now().toString().slice(-5);
  return `TKT-${timestampPart}-${randomPart}`;
}

export type ProTalkAccessType = "FREE" | "PRIVATE" | "PAID" | "TICKETED";

export function isTicketedSpace(space?: {
  visibility?: string | null;
  accessType?: string | null;
  ticketPrice?: number | null;
} | null): boolean {
  if (!space) return false;
  return (
    space.visibility === "TICKETED" ||
    space.accessType === "PAID" ||
    space.accessType === "TICKETED" ||
    (typeof space.ticketPrice === "number" && space.ticketPrice > 0)
  );
}

export interface TicketSalesStatus {
  isOpen: boolean;
  isSoldOut: boolean;
  isClosedEarly: boolean;
  hasStarted: boolean;
  salesNotStartedYet: boolean;
  salesEnded: boolean;
  ticketsRemaining: number;
  message: string;
}

export function getTicketSalesStatus(space: {
  visibility?: string | null;
  accessType?: string | null;
  ticketPrice?: number | null;
  ticketCapacity?: number | null;
  ticketsSold?: number | null;
  salesStartsAt?: string | Date | null;
  salesEndsAt?: string | Date | null;
  salesClosedEarly?: boolean | null;
  scheduledAt?: string | Date | null;
}): TicketSalesStatus {
  const isTicketed = isTicketedSpace(space);

  if (!isTicketed) {
    return {
      isOpen: true,
      isSoldOut: false,
      isClosedEarly: false,
      hasStarted: false,
      salesNotStartedYet: false,
      salesEnded: false,
      ticketsRemaining: 9999,
      message: "Free Access",
    };
  }

  const capacity = space.ticketCapacity ?? BASE_TICKET_ALLOWANCE;
  const sold = space.ticketsSold ?? 0;
  const remaining = Math.max(0, capacity - sold);
  const now = Date.now();

  if (space.salesClosedEarly) {
    return {
      isOpen: false,
      isSoldOut: false,
      isClosedEarly: true,
      hasStarted: false,
      salesNotStartedYet: false,
      salesEnded: true,
      ticketsRemaining: remaining,
      message: "Ticket sales closed by host",
    };
  }

  if (sold >= capacity) {
    return {
      isOpen: false,
      isSoldOut: true,
      isClosedEarly: false,
      hasStarted: false,
      salesNotStartedYet: false,
      salesEnded: false,
      ticketsRemaining: 0,
      message: "Sold Out",
    };
  }

  if (space.salesStartsAt) {
    const startsAt = new Date(space.salesStartsAt).getTime();
    if (now < startsAt) {
      return {
        isOpen: false,
        isSoldOut: false,
        isClosedEarly: false,
        hasStarted: false,
        salesNotStartedYet: true,
        salesEnded: false,
        ticketsRemaining: remaining,
        message: `Ticket sales open ${new Date(space.salesStartsAt).toLocaleDateString()}`,
      };
    }
  }

  if (space.salesEndsAt) {
    const endsAt = new Date(space.salesEndsAt).getTime();
    if (now > endsAt) {
      return {
        isOpen: false,
        isSoldOut: false,
        isClosedEarly: false,
        hasStarted: false,
        salesNotStartedYet: false,
        salesEnded: true,
        ticketsRemaining: remaining,
        message: "Ticket sales ended",
      };
    }
  }

  return {
    isOpen: true,
    isSoldOut: false,
    isClosedEarly: false,
    hasStarted: false,
    salesNotStartedYet: false,
    salesEnded: false,
    ticketsRemaining: remaining,
    message: `${remaining} ${remaining === 1 ? "Ticket" : "Tickets"} Remaining`,
  };
}

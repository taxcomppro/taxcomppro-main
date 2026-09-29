import { NextRequest } from "next/server";
import { isTicketedSpace } from "@/lib/ticketedProTalks";

type AccessSpace = {
  id: string;
  visibility: string;
  accessType?: string | null;
  ticketPrice?: number | null;
  shareToken: string | null;
  hostId: string;
  coHostIds?: string[];
  attendances?: { userId: string | null }[];
  rsvps?: { userId: string | null }[];
  tickets?: { userId: string | null; status?: string | null }[];
  isNetworkExclusive?: boolean | null;
  networkId?: string | null;
  network?: {
    members?: { userId: string | null; status?: string | null }[];
  } | null;
};

export function canAccessSpace(
  req: NextRequest,
  space: AccessSpace,
  user?: { id: string; role?: string | null } | null
): boolean {
  const isTicketed = isTicketedSpace(space);

  // 1. Ticketed Pro Talks MUST be tied to an authenticated account with a confirmed ticket
  if (isTicketed) {
    if (!user) return false;
    if (user.id === space.hostId || user.role === "ADMIN") return true;
    if (Array.isArray(space.coHostIds) && space.coHostIds.includes(user.id)) return true;

    // Check if user holds a confirmed ticket
    const hasTicket = space.tickets?.some(
      (t) => t.userId === user.id && (t.status === "CONFIRMED" || !t.status)
    );
    if (!hasTicket) return false;

    // If also network-exclusive, must be a member of that network
    if (space.isNetworkExclusive && space.networkId && space.network?.members) {
      const isMember = space.network.members.some(
        (m) => m.userId === user.id && m.status === "ACTIVE"
      );
      if (!isMember) return false;
    }

    return true;
  }

  // 2. Network-Exclusive Free/Private Talks
  if (space.isNetworkExclusive && space.networkId) {
    if (!user) return false;
    if (user.id === space.hostId || user.role === "ADMIN") return true;
    if (Array.isArray(space.coHostIds) && space.coHostIds.includes(user.id)) return true;
    if (space.network?.members) {
      const isMember = space.network.members.some(
        (m) => m.userId === user.id && m.status === "ACTIVE"
      );
      if (!isMember) return false;
    }
  }

  // 3. Standard Public Talks
  if (space.visibility === "PUBLIC") return true;

  // 4. Private / Invite Only Talks
  if (!user) {
    return (
      !!space.shareToken &&
      req.cookies.get(`pro-talk-invite-${space.id}`)?.value === space.shareToken
    );
  }

  if (user.id === space.hostId || user.role === "ADMIN") return true;
  if (Array.isArray(space.coHostIds) && space.coHostIds.includes(user.id)) return true;
  if (space.attendances?.some((a) => a.userId === user.id)) return true;
  if (space.rsvps?.some((r) => r.userId === user.id)) return true;
  if (
    !!space.shareToken &&
    req.cookies.get(`pro-talk-invite-${space.id}`)?.value === space.shareToken
  ) {
    return true;
  }

  return false;
}

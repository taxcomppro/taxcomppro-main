import { prisma } from "@/lib/prisma";

/** Count hosted talks across both creation flows, including completed talks. */
export async function countHostedProTalks(hostId: string): Promise<number> {
  const [spaces, events] = await Promise.all([
    prisma.space.findMany({ where: { hostId }, select: { roomName: true } }),
    prisma.proNetworkEvent.findMany({ where: { hostId }, select: { id: true, roomName: true } }),
  ]);
  // Network events can launch a Space with the same room name. That is one talk.
  const talks = new Set(spaces.map(space => `room:${space.roomName}`));
  for (const event of events) talks.add(event.roomName ? `room:${event.roomName}` : `event:${event.id}`);
  return talks.size;
}

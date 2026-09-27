import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { directoryUserWhere } from "@/lib/proDirectory";
import { COURSES } from "@/lib/courses";
import { TOOLKITS, BUNDLES } from "@/lib/toolkits";
import { SEARCH_PAGES, searchScore, type SiteSearchResult } from "@/lib/site-search";
export async function GET(req: NextRequest) {
  const q = (new URL(req.url).searchParams.get("q") || "").trim().slice(0,100);
  const respond = (results: SiteSearchResult[], partial = false) => NextResponse.json({ results, partial }, { headers: { "Cache-Control": "private, no-store" } });
  if (q.length < 2) return respond([]);
  const session = await auth.api.getSession({ headers: req.headers });
  const contains = (value: string) => ({ contains: value, mode: "insensitive" as const });
  const words = q.split(/\s+/).slice(0,8);
  const staticResults: SiteSearchResult[] = [...SEARCH_PAGES,
    ...COURSES.map(c => ({ id: `course-${c.id}`, title: c.title, description: `${c.category} · ${c.description}`, href: c.externalUrl, category: "Courses" as const })),
    ...TOOLKITS.map(t => ({ id: `toolkit-${t.id}`, title: t.name, description: `${t.category} · ${t.description}`, href: t.externalUrl, category: "Toolkits" as const })),
    ...BUNDLES.map(b => ({ id: `bundle-${b.id}`, title: b.name, description: b.description, href: b.externalUrl, category: "Toolkits" as const })),
  ];
  const live = await Promise.allSettled([
    prisma.user.findMany({ where: { AND: [directoryUserWhere, ...words.map(w => ({ OR: [{ name: contains(w) }, { headline: contains(w) }] }))] }, select: { id: true, name: true, headline: true }, take: 8, orderBy: { name: "asc" } }).then(rows => rows.map(r => ({ id: `pro-${r.id}`, title: r.name, description: r.headline || "Tax professional", href: `/find-a-pro/${r.id}`, category: "Professionals" as const }))),
    prisma.community.findMany({ where: { AND: [{ OR: [{ isPublic: true }, ...(session ? [{ creatorId: session.user.id }, { members: { some: { userId: session.user.id } } }] : [])] }, ...words.map(w => ({ OR: [{ name: contains(w) }, { description: contains(w) }] }))] }, select: { id: true, slug: true, name: true, description: true }, take: 8, orderBy: { memberCount: "desc" } }).then(rows => rows.map(r => ({ id: `group-${r.id}`, title: r.name, description: r.description, href: `/groups/${r.slug}`, category: "Groups" as const }))),
    prisma.proNetwork.findMany({ where: { isPublished: true, AND: words.map(w => ({ OR: [{ name: contains(w) }, { description: contains(w) }] })) }, select: { id: true, name: true, slug: true, description: true }, take: 8, orderBy: { memberCount: "desc" } }).then(rows => rows.map(r => ({ id: `network-${r.id}`, title: r.name, description: r.description, href: `/pro-networks/${r.slug}`, category: "Networks" as const }))),
    prisma.marketplaceListing.findMany({ where: { status: "APPROVED", isNetworkExclusive: false, AND: words.map(w => ({ OR: [{ title: contains(w) }, { description: contains(w) }] })) }, select: { id: true, slug: true, title: true, description: true }, take: 8, orderBy: { createdAt: "desc" } }).then(rows => rows.map(r => ({ id: `listing-${r.id}`, title: r.title, description: r.description, href: `/${r.slug || r.id}`, category: "Marketplace" as const }))),
  ]);
  const results = [...staticResults.filter(r => searchScore(r,q)), ...live.flatMap<SiteSearchResult>(r => r.status === "fulfilled" ? r.value : [])].sort((a,b) => searchScore(b,q)-searchScore(a,q));
  return respond(results.map(r => ({ ...r, description: r.description.replace(/<[^>]*>/g, " ").slice(0,180) })), live.some(r => r.status === "rejected"));
}


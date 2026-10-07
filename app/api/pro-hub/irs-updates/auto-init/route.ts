import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const IRS_FORUM_SLUG = "irs-updates";

function stripHtml(s: string) {
  return s.replace(/<[^>]+>/g, " ").replace(/&amp;/g, "&").replace(/&nbsp;/g, " ")
    .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&#\d+;/g, "").replace(/\s+/g, " ").trim();
}

async function scrapeIrsNews() {
  const res = await fetch("https://www.irs.gov/newsroom", {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    },
    signal: AbortSignal.timeout(15_000),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`IRS returned ${res.status}`);
  const html = await res.text();

  const items: { title: string; link: string; irNumber: string; pubDate: string; description: string }[] = [];
  const rowRe = /<div class="views-row">([\s\S]*?)<\/div>\s*<\/div>\s*<\/div>/g;
  let rowMatch: RegExpExecArray | null;

  while ((rowMatch = rowRe.exec(html)) !== null && items.length < 20) {
    const chunk = rowMatch[1];
    const linkMatch = chunk.match(/<a\s+href="(\/newsroom\/[^"]+)"[^>]*>([\s\S]*?)<\/a>/i);
    if (!linkMatch) continue;

    const href  = linkMatch[1];
    const title = stripHtml(linkMatch[2]);
    if (!title || title.length < 10) continue;

    const descMatch = chunk.match(/views-field-pup-description-abstract[\s\S]*?<div class="field-content">([\s\S]*?)<\/div>/i);
    const rawDesc   = descMatch ? stripHtml(descMatch[1]) : "";
    const irMatch   = rawDesc.match(/^(IR-\d{4}-\d+)\s+/i);
    const dateMatch = rawDesc.match(/IR-\d{4}-\d+\s+([A-Z][a-z]+ \d+, \d{4})/);
    const dashIdx   = rawDesc.indexOf(" - ");

    items.push({
      title,
      link:        `https://www.irs.gov${href}`,
      irNumber:    irMatch?.[1] ?? "",
      pubDate:     dateMatch?.[1] ?? "",
      description: dashIdx > -1 ? rawDesc.slice(dashIdx + 3).trim().slice(0, 500) : rawDesc.slice(0, 500),
    });
  }
  return items;
}

// GET /api/pro-hub/irs-updates/auto-init
// Called by the client on first load — creates the IRS Updates forum if needed,
// syncs latest news as ForumPosts, then returns { forumExists: true, created: N }
export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const actor = await prisma.user.findUnique({ where: { id: session.user.id }, select: { role: true } });
  if (actor?.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  try {
    // 1. Find the first admin user to author the posts
    const admin = await prisma.user.findFirst({ where: { role: "ADMIN" }, select: { id: true } });
    if (!admin) return NextResponse.json({ error: "No admin user found" }, { status: 500 });

    // 2. Upsert the IRS Updates forum
    let forum = await prisma.forum.findUnique({ where: { slug: IRS_FORUM_SLUG } });
    if (!forum) {
      forum = await prisma.forum.create({
        data: {
          name:        "IRS Updates",
          slug:        IRS_FORUM_SLUG,
          description: "Latest news releases and announcements from the IRS Newsroom (irs.gov/newsroom). Auto-synced daily.",
          image:       null,
          badge:       "IRS",
          isPinned:    true,
          isAdminOnly: false,
          createdById: admin.id,
        },
      });
    }

    // 3. Fetch + sync IRS news items
    const items = await scrapeIrsNews();
    let created = 0;

    for (const item of items) {
      const existing = await prisma.forumPost.findFirst({
        where: { forumId: forum.id, title: item.title },
      });
      if (existing) continue;

      const body = [
        item.irNumber ? `**${item.irNumber}** — ${item.pubDate}` : item.pubDate,
        "",
        item.description || "See full article on IRS.gov",
        "",
        `🔗 [Read full article on IRS.gov](${item.link})`,
      ].filter(Boolean).join("\n");

      await prisma.forumPost.create({
        data: {
          forumId:  forum.id,
          authorId: admin.id,
          title:    item.title,
          body,
          votes:    0,
          isPinned: false,
        },
      });
      created++;
    }

    return NextResponse.json({ ok: true, forumSlug: IRS_FORUM_SLUG, created, total: items.length });
  } catch (err) {
    console.error("[irs auto-init]", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import FeedIcon from "./FeedIcon";

interface Community { id: string; name: string; slug: string; isMember: boolean }

export default function CommunityStrip() {
  const [groups, setGroups] = useState<Community[]>([]);
  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/communities", { signal: controller.signal })
      .then(response => response.ok ? response.json() : [])
      .then(data => { if (!controller.signal.aborted && Array.isArray(data)) setGroups(data.slice(0, 7)); })
      .catch(() => {});
    return () => controller.abort();
  }, []);
  return <nav className="feed-community-strip" aria-label="Explore groups">
    <Link href="/groups"><span className="feed-community-circle feed-community-explore"><FeedIcon name="grid" /></span><span>Find groups</span></Link>
    {groups.map(group => <Link key={group.id} href={`/groups/${group.slug}`} title={`${group.name}${group.isMember ? " · Joined" : ""}`}><span className={`feed-community-circle${group.isMember ? " is-member" : ""}`}>{group.name.split(" ").slice(0, 2).map(word => word[0]).join("").toUpperCase()}</span><span>{group.name}</span></Link>)}
  </nav>;
}

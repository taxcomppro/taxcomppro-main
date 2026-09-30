"use client";
import { useAdminDialog } from "@/components/layout/useAdminDialog";
import { Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

type Row = {
  id: string;
  name?: string;
  title?: string;
  slug?: string;
  description?: string;
  isPublished?: boolean;
  isPinned?: boolean;
  isAdminOnly?: boolean;
  memberCount?: number;
  monthlyPrice?: number;
  price?: number;
  status?: string;
  category?: string;
  owner?: { name: string };
  _count?: { posts?: number };
};

type Content = Record<string, Row[]>;

export default function ContentAdmin() {
  return (
    <Suspense fallback={<p>Loading content…</p>}>
      <ContentWorkspace />
    </Suspense>
  );
}

function ContentWorkspace() {
  const params = useSearchParams();
  const tab = ["forums", "networks"].includes(
    params.get("tab") || "",
  )
    ? params.get("tab")!
    : "forums";
  const [data, setData] = useState<Content>({});
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [editing, setEditing] = useState<Row | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const closeDialog = useCallback(() => setEditing(null), []);
  useAdminDialog(!!editing, closeDialog);

  async function load() {
    const r = await fetch("/api/admin/content");
    if (!r.ok) throw new Error("Could not load content");
    setData(await r.json());
  }

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/admin/content", { signal: controller.signal })
      .then((r) => {
        if (!r.ok) throw new Error("Could not load content");
        return r.json();
      })
      .then(setData)
      .catch((e) => {
        if (!controller.signal.aborted) setError(e.message);
      });
    return () => controller.abort();
  }, []);

  async function save() {
    if (!editing) return;
    setBusy(true);
    setError("");
    try {
      const body = {
        ...editing,
        description: editing.description || "",
        kind: tab === "forums" ? "forum" : "network",
      };
      const r = await fetch("/api/admin/content", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      await load();
      setEditing(null);
      setNotice("Content updated.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setBusy(false);
    }
  }

  const labels: Record<string, string> = {
    forums: "Pro Hub",
    networks: "Pro Networks",
  };

  const rows = (data[tab] || []).filter((r) =>
    (r.name || r.title || "").toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="admin-workspace">
      <header className="admin-page-heading">
        <div>
          <span className="admin-eyebrow">CONTENT & COMMUNITY</span>
          <h1>A home for your expertise.</h1>
          <p>
            Manage the spaces and resources that keep your members moving
            forward.
          </p>
        </div>
        <Link
          className="admin-primary"
          href={tab === "networks" ? "/pro-networks/create" : "/pro-hub"}
        >
          {"Open " + labels[tab]}
        </Link>
      </header>
      <div className="admin-metrics">
        {Object.entries(labels).map(([k, v]) => (
          <div key={k}>
            <span>{v}</span>
            <strong>{data[k]?.length ?? "—"}</strong>
          </div>
        ))}
      </div>
      <nav className="admin-tabs">
        {Object.entries(labels).map(([k, v]) => (
          <Link
            key={k}
            className={tab === k ? "active" : ""}
            href={`/admin/content?tab=${k}`}
          >
            {v}
          </Link>
        ))}
      </nav>
      {error && (
        <p className="admin-alert" role="alert">
          {error}
        </p>
      )}
      {notice && (
        <p className="admin-notice" role="status">
          {notice}
        </p>
      )}
      <section className="admin-panel">
        <input
          className="admin-content-search"
          placeholder={`Search ${labels[tab]}…`}
          aria-label="Search content"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Status / owner</th>
                <th>Activity</th>
                <th>Manage</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td>
                    <strong>{r.name || r.title}</strong>
                    <small>{r.category || r.slug}</small>
                  </td>
                  <td>
                    {tab === "forums" ? (
                      r.isAdminOnly ? (
                        "Admin posting only"
                      ) : (
                        "Community discussion"
                      )
                    ) : (
                      <>
                        {r.isPublished ? "Published" : "Unpublished"}
                        <br />
                        <small>{r.owner?.name}</small>
                      </>
                    )}
                  </td>
                  <td>
                    {tab === "forums"
                      ? `${r._count?.posts || 0} discussions`
                      : `${r.memberCount || 0} members`}
                  </td>
                  <td>
                    <div className="admin-actions">
                      <button onClick={() => setEditing(structuredClone(r))}>
                        Edit
                      </button>
                      <Link
                        href={
                          tab === "forums"
                            ? `/pro-hub/${r.slug}`
                            : `/pro-networks/${r.slug}`
                        }
                      >
                        View ↗
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!data[tab] ? (
            <p>Loading content…</p>
          ) : (
            !rows.length && <p>No matching content.</p>
          )}
        </div>
      </section>
      {editing && (
        <div className="admin-dialog-backdrop">
          <form
            className="admin-dialog"
            role="dialog"
            aria-modal="true"
            aria-label="Edit content"
            onSubmit={(e) => {
              e.preventDefault();
              void save();
            }}
          >
            <header>
              <h2>{editing.name}</h2>
              <button type="button" onClick={() => setEditing(null)}>
                Close
              </button>
            </header>
            {error && (
              <p className="admin-alert" role="alert">
                {error}
              </p>
            )}
            <div className="admin-form-grid">
              <label className="wide">
                Name
                <input
                  required
                  value={editing.name}
                  onChange={(e) =>
                    setEditing({ ...editing, name: e.target.value })
                  }
                />
              </label>
              <label className="wide">
                Description
                <textarea
                  value={editing.description || ""}
                  onChange={(e) =>
                    setEditing({ ...editing, description: e.target.value })
                  }
                />
              </label>
            </div>
            <div className="admin-actions">
              {tab === "forums" && (
                <>
                  <label>
                    <input
                      type="checkbox"
                      checked={editing.isPinned}
                      onChange={(e) =>
                        setEditing({ ...editing, isPinned: e.target.checked })
                      }
                    />
                    Pinned
                  </label>
                  <label>
                    <input
                      type="checkbox"
                      checked={editing.isAdminOnly}
                      onChange={(e) =>
                        setEditing({
                          ...editing,
                          isAdminOnly: e.target.checked,
                        })
                      }
                    />
                    Admin posts only
                  </label>
                </>
              )}
              {tab === "networks" && (
                <label>
                  <input
                    type="checkbox"
                    checked={editing.isPublished}
                    onChange={(e) =>
                      setEditing({ ...editing, isPublished: e.target.checked })
                    }
                  />
                  Published in directory
                </label>
              )}
              <button className="admin-primary" disabled={busy}>
                {busy ? "Saving…" : "Save changes"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

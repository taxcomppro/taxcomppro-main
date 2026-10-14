"use client";

import { useRef, useState } from "react";
import { Trash2 } from "lucide-react";

export default function DeleteDiscussionButton({ slug, discussionId, onDeleted }: {
  slug: string;
  discussionId: string;
  onDeleted: (id: string) => void;
}) {
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");
  const pending = useRef(false);

  async function remove() {
    if (pending.current || !window.confirm("Delete this discussion and all its replies? This cannot be undone.")) return;
    pending.current = true;
    setDeleting(true);
    setError("");
    try {
      const res = await fetch(
        "/api/pro-networks/" + encodeURIComponent(slug) + "/discussions/" + encodeURIComponent(discussionId),
        { method: "DELETE" },
      );
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Could not delete discussion. Please try again.");
      }
      onDeleted(discussionId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete discussion. Please try again.");
    } finally {
      pending.current = false;
      setDeleting(false);
    }
  }

  return <div className="flex flex-col items-end gap-1" onClick={event => event.stopPropagation()}>
    <button type="button" disabled={deleting} onClick={() => void remove()}
      className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-red-600 dark:text-red-400 hover:bg-red-500/10 disabled:opacity-50"
      aria-label="Delete discussion">
      <Trash2 size={14} aria-hidden="true" />{deleting ? "Deleting…" : "Delete"}
    </button>
    {error && <p role="alert" className="max-w-64 text-xs text-red-600 dark:text-red-400">{error}</p>}
  </div>;
}

"use client";

import { useEffect, useState } from "react";
import type { ApiPersonNode } from "@/lib/layout";

type MyTree = { id: string; name: string };
type OtherPerson = { id: string; name: string };

export default function LinkTreeModal({
  treeId,
  person,
  onClose,
  onLinked,
}: {
  treeId: string;
  person: ApiPersonNode;
  onClose: () => void;
  onLinked: () => void;
}) {
  const [trees, setTrees] = useState<MyTree[] | null>(null);
  const [selectedTreeId, setSelectedTreeId] = useState("");
  const [people, setPeople] = useState<OtherPerson[] | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState("");
  const [label, setLabel] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/trees")
      .then((r) => r.json())
      .then((all: (MyTree & { id: string })[]) => setTrees(all.filter((t) => t.id !== treeId)));
  }, [treeId]);

  useEffect(() => {
    if (!selectedTreeId) {
      setPeople(null);
      setSelectedNodeId("");
      return;
    }
    fetch(`/api/trees/${selectedTreeId}`)
      .then((r) => r.json())
      .then((data) => setPeople(data.nodes?.map((n: any) => ({ id: n.id, name: n.name })) ?? []));
  }, [selectedTreeId]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedTreeId) return;
    setError(null);
    setSaving(true);

    const res = await fetch(`/api/trees/${treeId}/nodes/${person.id}/links`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        toTreeId: selectedTreeId,
        toNodeId: selectedNodeId || undefined,
        label,
      }),
    });

    setSaving(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Something went wrong.");
      return;
    }
    onLinked();
  }

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 px-4">
      <div className="bg-[var(--paper)] border border-[var(--rule)] rounded-lg w-full max-w-md p-6 shadow-xl">
        <p className="font-mono text-xs uppercase tracking-wide text-[var(--gold)] mb-1">Cross-tree reference</p>
        <h2 className="font-display text-2xl mb-1">Link {person.name} to another tree</h2>
        <p className="text-sm text-[var(--ink-soft)] mb-5">
          Point to a tree you have access to — useful when this person&apos;s other family line is
          recorded in a different tree.
        </p>

        {trees && trees.length === 0 && (
          <p className="text-sm text-[var(--ink-soft)]">
            You don&apos;t have access to any other trees yet. Create another tree, or get invited to one,
            to link across them.
          </p>
        )}

        {trees && trees.length > 0 && (
          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="block text-xs uppercase tracking-wide text-[var(--ink-soft)] mb-1.5">
                Target tree
              </label>
              <select
                required
                value={selectedTreeId}
                onChange={(e) => setSelectedTreeId(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-md border border-[var(--rule)] bg-white/60 focus:outline-none focus:border-[var(--accent)]"
              >
                <option value="">Select a tree…</option>
                {trees.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>

            {selectedTreeId && (
              <div>
                <label className="block text-xs uppercase tracking-wide text-[var(--ink-soft)] mb-1.5">
                  Specific person (optional)
                </label>
                <select
                  value={selectedNodeId}
                  onChange={(e) => setSelectedNodeId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-md border border-[var(--rule)] bg-white/60 focus:outline-none focus:border-[var(--accent)]"
                >
                  <option value="">Just link to the whole tree</option>
                  {people?.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="block text-xs uppercase tracking-wide text-[var(--ink-soft)] mb-1.5">
                Note (optional)
              </label>
              <input
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="e.g. Same person as in the Ahmed family tree"
                className="w-full px-3.5 py-2.5 rounded-md border border-[var(--rule)] bg-white/60 focus:outline-none focus:border-[var(--accent)]"
              />
            </div>

            {error && <p className="text-sm text-[var(--female-ink)]">{error}</p>}

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2.5 rounded-full border border-[var(--rule)] hover:border-[var(--accent)]"
              >
                Cancel
              </button>
              <button
                disabled={saving || !selectedTreeId}
                className="flex-1 py-2.5 rounded-full bg-[var(--accent)] text-[var(--paper)] font-medium hover:opacity-90 disabled:opacity-60"
              >
                {saving ? "Linking…" : "Create link"}
              </button>
            </div>
          </form>
        )}

        {trees === null && <p className="text-sm text-[var(--ink-soft)]">Loading your trees…</p>}

        {trees && trees.length === 0 && (
          <button
            type="button"
            onClick={onClose}
            className="mt-5 w-full py-2.5 rounded-full border border-[var(--rule)] hover:border-[var(--accent)]"
          >
            Close
          </button>
        )}
      </div>
    </div>
  );
}
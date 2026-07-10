"use client";

import { useState } from "react";
import type { ApiPersonNode } from "@/lib/layout";

export default function EditPersonModal({
  treeId,
  person,
  allPeople,
  onClose,
  onSaved,
}: {
  treeId: string;
  person: ApiPersonNode;
  allPeople: ApiPersonNode[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(person.name);
  const [sex, setSex] = useState<"MALE" | "FEMALE">(person.sex);
  const [birthYear, setBirthYear] = useState(person.birthYear?.toString() ?? "");
  const [deathYear, setDeathYear] = useState(person.deathYear?.toString() ?? "");
  const [notes, setNotes] = useState(person.notes ?? "");
  const [parent1, setParent1] = useState(person.parentLinks[0]?.parentId ?? "");
  const [parent2, setParent2] = useState(person.parentLinks[1]?.parentId ?? "");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Anyone in the tree except this person themselves can be picked as a parent.
  // (The server also rejects picking a descendant, to prevent a loop.)
  const parentOptions = allPeople.filter((p) => p.id !== person.id);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);

    const res = await fetch(`/api/trees/${treeId}/nodes/${person.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        sex,
        birthYear: birthYear ? Number(birthYear) : null,
        deathYear: deathYear ? Number(deathYear) : null,
        notes,
        parentIds: [parent1 || null, parent2 || null],
      }),
    });

    setSaving(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Something went wrong.");
      return;
    }
    onSaved();
  }

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 px-4">
      <div className="bg-[var(--paper)] border border-[var(--rule)] rounded-lg w-full max-w-md p-6 shadow-xl max-h-[90vh] overflow-y-auto">
        <p className="font-mono text-xs uppercase tracking-wide text-[var(--gold)] mb-1">Edit record</p>
        <h2 className="font-display text-2xl mb-5">{person.name}</h2>

        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="block text-xs uppercase tracking-wide text-[var(--ink-soft)] mb-1.5">Name</label>
            <input
              required
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-md border border-[var(--rule)] bg-white/60 focus:outline-none focus:border-[var(--accent)]"
            />
          </div>

          <div>
            <label className="block text-xs uppercase tracking-wide text-[var(--ink-soft)] mb-1.5">
              Sex assigned at birth
            </label>
            <div className="flex gap-2">
              {(["MALE", "FEMALE"] as const).map((s) => (
                <button
                  type="button"
                  key={s}
                  onClick={() => setSex(s)}
                  className={[
                    "flex-1 py-2 rounded-md border text-sm capitalize transition-colors",
                    sex === s
                      ? s === "MALE"
                        ? "bg-[var(--male-fill)] border-[var(--male-ink)]"
                        : "bg-[var(--female-fill)] border-[var(--female-ink)]"
                      : "border-[var(--rule)]",
                  ].join(" ")}
                >
                  {s.toLowerCase()}
                </button>
              ))}
            </div>
            <p className="text-xs text-[var(--ink-soft)] mt-1">
              Changing this doesn&apos;t change existing marriage records — remove and re-add a spouse if needed.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs uppercase tracking-wide text-[var(--ink-soft)] mb-1.5">
                Parent 1
              </label>
              <select
                value={parent1}
                onChange={(e) => setParent1(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-md border border-[var(--rule)] bg-white/60 focus:outline-none focus:border-[var(--accent)]"
              >
                <option value="">None</option>
                {parentOptions.map((p) => (
                  <option key={p.id} value={p.id} disabled={p.id === parent2}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs uppercase tracking-wide text-[var(--ink-soft)] mb-1.5">
                Parent 2
              </label>
              <select
                value={parent2}
                onChange={(e) => setParent2(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-md border border-[var(--rule)] bg-white/60 focus:outline-none focus:border-[var(--accent)]"
              >
                <option value="">None</option>
                {parentOptions.map((p) => (
                  <option key={p.id} value={p.id} disabled={p.id === parent1}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs uppercase tracking-wide text-[var(--ink-soft)] mb-1.5">
                Birth year
              </label>
              <input
                type="number"
                value={birthYear}
                onChange={(e) => setBirthYear(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-md border border-[var(--rule)] bg-white/60 focus:outline-none focus:border-[var(--accent)]"
              />
            </div>
            <div>
              <label className="block text-xs uppercase tracking-wide text-[var(--ink-soft)] mb-1.5">
                Death year
              </label>
              <input
                type="number"
                value={deathYear}
                onChange={(e) => setDeathYear(e.target.value)}
                placeholder="Optional"
                className="w-full px-3.5 py-2.5 rounded-md border border-[var(--rule)] bg-white/60 focus:outline-none focus:border-[var(--accent)]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs uppercase tracking-wide text-[var(--ink-soft)] mb-1.5">
              Notes (optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
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
              disabled={saving}
              className="flex-1 py-2.5 rounded-full bg-[var(--accent)] text-[var(--paper)] font-medium hover:opacity-90 disabled:opacity-60"
            >
              {saving ? "Saving…" : "Save changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
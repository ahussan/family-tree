"use client";

import { useState } from "react";
import type { ApiPersonNode } from "@/lib/layout";

type Relation = "ROOT" | "PARENT" | "CHILD" | "SIBLING" | "SPOUSE";

const RELATION_LABEL: Record<Relation, string> = {
  ROOT: "Add first person",
  PARENT: "Add parent",
  CHILD: "Add child",
  SIBLING: "Add sibling",
  SPOUSE: "Add spouse",
};

export default function AddPersonModal({
  treeId,
  relation,
  relative,
  allPeople,
  onClose,
  onCreated,
}: {
  treeId: string;
  relation: Relation;
  relative: ApiPersonNode | null;
  allPeople: ApiPersonNode[];
  onClose: () => void;
  onCreated: () => void;
}) {
  const [name, setName] = useState("");
  const [sex, setSex] = useState<"MALE" | "FEMALE">(
    relation === "SPOUSE" && relative ? (relative.sex === "MALE" ? "FEMALE" : "MALE") : "MALE"
  );
  const [birthYear, setBirthYear] = useState("");
  const [deathYear, setDeathYear] = useState("");
  const [notes, setNotes] = useState("");
  const [coParentId, setCoParentId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // For CHILD relation, if the relative has spouses, let the user pick which one
  // is the other parent of this child (supports polygamous households).
  const spouseOptions =
    relation === "CHILD" && relative
      ? allPeople.filter(
          (p) =>
            relative.marriagesAsHusband.some((m) => m.wifeId === p.id) ||
            relative.marriagesAsWife.some((m) => m.husbandId === p.id)
        )
      : [];

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);

    const res = await fetch(`/api/trees/${treeId}/nodes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        sex,
        birthYear: birthYear ? Number(birthYear) : null,
        deathYear: deathYear ? Number(deathYear) : null,
        notes,
        relation,
        relativeNodeId: relative?.id,
        coParentId: coParentId || undefined,
      }),
    });

    setSaving(false);
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Something went wrong.");
      return;
    }
    onCreated();
  }

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 px-4">
      <div className="bg-[var(--paper)] border border-[var(--rule)] rounded-lg w-full max-w-md p-6 shadow-xl">
        <p className="font-mono text-xs uppercase tracking-wide text-[var(--gold)] mb-1">
          {relative ? `Relative to ${relative.name}` : "New tree"}
        </p>
        <h2 className="font-display text-2xl mb-5">{RELATION_LABEL[relation]}</h2>

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
                  disabled={relation === "SPOUSE"}
                  onClick={() => setSex(s)}
                  className={[
                    "flex-1 py-2 rounded-md border text-sm capitalize transition-colors",
                    sex === s
                      ? s === "MALE"
                        ? "bg-[var(--male-fill)] border-[var(--male-ink)]"
                        : "bg-[var(--female-fill)] border-[var(--female-ink)]"
                      : "border-[var(--rule)]",
                    relation === "SPOUSE" ? "opacity-60 cursor-not-allowed" : "",
                  ].join(" ")}
                >
                  {s.toLowerCase()}
                </button>
              ))}
            </div>
            {relation === "SPOUSE" && (
              <p className="text-xs text-[var(--ink-soft)] mt-1">
                Set automatically to the opposite sex of {relative?.name}.
              </p>
            )}
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
                placeholder="1958"
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

          {spouseOptions.length > 0 && (
            <div>
              <label className="block text-xs uppercase tracking-wide text-[var(--ink-soft)] mb-1.5">
                Other parent (optional)
              </label>
              <select
                value={coParentId}
                onChange={(e) => setCoParentId(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-md border border-[var(--rule)] bg-white/60 focus:outline-none focus:border-[var(--accent)]"
              >
                <option value="">Unspecified</option>
                {spouseOptions.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
          )}

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
              {saving ? "Saving…" : "Add person"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

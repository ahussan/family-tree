"use client";

import { useState } from "react";
import type { ApiPersonNode } from "@/lib/layout";
import AddPersonModal from "@/components/AddPersonModal";

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

  // Spouse section state
  const [linkSpouseId, setLinkSpouseId] = useState("");
  const [linkingSpouse, setLinkingSpouse] = useState(false);
  const [addingNewSpouse, setAddingNewSpouse] = useState(false);

  // Collect current spouse ids from both marriage lists
  const currentSpouseIds = new Set([
    ...person.marriagesAsHusband.map((m) => m.wifeId),
    ...person.marriagesAsWife.map((m) => m.husbandId),
  ]);

  // All marriages keyed by spouse id for removal
  const marriageBySpouseId = new Map<string, string>(); // spouseId -> marriageId
  for (const m of person.marriagesAsHusband) marriageBySpouseId.set(m.wifeId, m.id);
  for (const m of person.marriagesAsWife) marriageBySpouseId.set(m.husbandId, m.id);

  // People eligible to be linked as a spouse:
  // opposite sex, in the same tree, not already a spouse, not this person
  const spouseCandidates = allPeople.filter(
    (p) => p.id !== person.id && p.sex !== person.sex && !currentSpouseIds.has(p.id)
  );

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

  async function linkSpouse() {
    if (!linkSpouseId) return;
    setLinkingSpouse(true);
    const res = await fetch(`/api/trees/${treeId}/nodes/${person.id}/marriages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ spouseId: linkSpouseId }),
    });
    setLinkingSpouse(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Failed to link spouse.");
      return;
    }
    setLinkSpouseId("");
    onSaved();
  }

  async function removeSpouse(marriageId: string) {
    const res = await fetch(`/api/trees/${treeId}/nodes/${person.id}/marriages/${marriageId}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Failed to remove spouse.");
      return;
    }
    onSaved();
  }

  if (addingNewSpouse) {
    return (
      <AddPersonModal
        treeId={treeId}
        relation="SPOUSE"
        relative={person}
        allPeople={allPeople}
        onClose={() => setAddingNewSpouse(false)}
        onCreated={() => {
          setAddingNewSpouse(false);
          onSaved();
        }}
      />
    );
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

        {/* ── Spouses section ───────────────────────────────────────────── */}
        <div className="mt-6 pt-5 border-t border-[var(--rule)]">
          <p className="text-xs uppercase tracking-wide text-[var(--ink-soft)] mb-3">Spouses</p>

          {currentSpouseIds.size === 0 && (
            <p className="text-sm text-[var(--ink-soft)] mb-3">No spouses recorded.</p>
          )}

          {currentSpouseIds.size > 0 && (
            <ul className="space-y-2 mb-3">
              {Array.from(marriageBySpouseId.entries()).map(([spouseId, marriageId]) => {
                const sp = allPeople.find((p) => p.id === spouseId);
                return (
                  <li key={marriageId} className="flex items-center justify-between gap-2">
                    <span className="text-sm">{sp?.name ?? spouseId}</span>
                    <button
                      type="button"
                      onClick={() => removeSpouse(marriageId)}
                      className="text-xs text-[var(--female-ink)] hover:underline shrink-0"
                    >
                      Remove
                    </button>
                  </li>
                );
              })}
            </ul>
          )}

          {/* Link an existing person as spouse */}
          {spouseCandidates.length > 0 && (
            <div className="flex gap-2 mb-2">
              <select
                value={linkSpouseId}
                onChange={(e) => setLinkSpouseId(e.target.value)}
                className="flex-1 px-3 py-2 rounded-md border border-[var(--rule)] bg-white/60 text-sm focus:outline-none focus:border-[var(--accent)]"
              >
                <option value="">Link existing person…</option>
                {spouseCandidates.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
              <button
                type="button"
                disabled={!linkSpouseId || linkingSpouse}
                onClick={linkSpouse}
                className="px-3 py-2 rounded-md border border-[var(--rule)] text-sm hover:border-[var(--accent)] disabled:opacity-40"
              >
                {linkingSpouse ? "…" : "Link"}
              </button>
            </div>
          )}

          {/* Add a brand-new person as spouse */}
          <button
            type="button"
            onClick={() => setAddingNewSpouse(true)}
            className="w-full py-2 rounded-md border border-[var(--rule)] text-sm hover:border-[var(--accent)] transition-colors"
          >
            + Add new spouse
          </button>
        </div>
      </div>
    </div>
  );
}

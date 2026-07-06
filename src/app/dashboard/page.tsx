"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";

type Tree = {
  id: string;
  name: string;
  description: string | null;
  myRole: string;
  updatedAt: string;
  _count: { nodes: number };
  members: { user: { name: string } }[];
};

export default function DashboardPage() {
  const [trees, setTrees] = useState<Tree[] | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [creating, setCreating] = useState(false);

  async function load() {
    const res = await fetch("/api/trees");
    setTrees(await res.json());
  }

  useEffect(() => {
    load();
  }, []);

  async function createTree(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    const res = await fetch("/api/trees", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, description }),
    });
    setCreating(false);
    if (res.ok) {
      setName("");
      setDescription("");
      setShowNew(false);
      load();
    }
  }

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="max-w-5xl mx-auto px-6 py-12">
        <div className="flex items-end justify-between mb-10">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.2em] text-[var(--gold)] mb-2">Your records</p>
            <h1 className="font-display text-4xl italic">My Trees</h1>
          </div>
          <button
            onClick={() => setShowNew((v) => !v)}
            className="px-5 py-2.5 rounded-full bg-[var(--accent)] text-[var(--paper)] font-medium hover:opacity-90"
          >
            + New tree
          </button>
        </div>

        {showNew && (
          <form
            onSubmit={createTree}
            className="mb-10 p-6 border border-[var(--rule)] rounded-lg bg-[var(--paper-deep)]/40 space-y-4"
          >
            <div>
              <label className="block text-xs uppercase tracking-wide text-[var(--ink-soft)] mb-1.5">
                Tree name
              </label>
              <input
                required
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="The Alvarez Family"
                className="w-full px-3.5 py-2.5 rounded-md border border-[var(--rule)] bg-white/60 focus:outline-none focus:border-[var(--accent)]"
              />
            </div>
            <div>
              <label className="block text-xs uppercase tracking-wide text-[var(--ink-soft)] mb-1.5">
                Description (optional)
              </label>
              <input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Started from my grandfather's side"
                className="w-full px-3.5 py-2.5 rounded-md border border-[var(--rule)] bg-white/60 focus:outline-none focus:border-[var(--accent)]"
              />
            </div>
            <button
              disabled={creating}
              className="px-5 py-2.5 rounded-full bg-[var(--accent)] text-[var(--paper)] font-medium hover:opacity-90 disabled:opacity-60"
            >
              {creating ? "Creating…" : "Create tree"}
            </button>
          </form>
        )}

        {trees === null && <p className="text-[var(--ink-soft)]">Loading…</p>}

        {trees?.length === 0 && (
          <div className="text-center py-20 border border-dashed border-[var(--rule)] rounded-lg">
            <p className="font-display text-2xl italic mb-2">No trees yet</p>
            <p className="text-[var(--ink-soft)] text-sm">Create your first tree to begin adding relatives.</p>
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-5">
          {trees?.map((t) => (
            <Link
              key={t.id}
              href={`/tree/${t.id}`}
              className="block p-6 border border-[var(--rule)] rounded-lg bg-white/40 hover:border-[var(--accent)] hover:bg-white/60 transition-colors"
            >
              <div className="flex items-start justify-between mb-2">
                <h3 className="font-display text-xl">{t.name}</h3>
                <span className="text-[10px] uppercase tracking-wide font-mono text-[var(--gold)] border border-[var(--gold-soft)] rounded-full px-2 py-0.5">
                  {t.myRole}
                </span>
              </div>
              {t.description && <p className="text-sm text-[var(--ink-soft)] mb-3">{t.description}</p>}
              <div className="flex items-center gap-4 text-xs text-[var(--ink-soft)] font-mono">
                <span>{t._count.nodes} people</span>
                <span>·</span>
                <span>{t.members.length} collaborator{t.members.length !== 1 ? "s" : ""}</span>
              </div>
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}

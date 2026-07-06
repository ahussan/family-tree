"use client";

import { useEffect, useState, use as usePromise } from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import TreeCanvas from "@/components/TreeCanvas";
import ManageCollaborators from "@/components/ManageCollaborators";
import type { ApiPersonNode } from "@/lib/layout";

type TreeData = {
  id: string;
  name: string;
  description: string | null;
  myRole: string;
  nodes: ApiPersonNode[];
  members: { id: string; role: string; user: { id: string; name: string; email: string } }[];
  invites: { id: string; email: string; role: string }[];
};

export default function TreePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = usePromise(params);
  const [tree, setTree] = useState<TreeData | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const res = await fetch(`/api/trees/${id}`);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Unable to load this tree.");
      return;
    }
    setTree(await res.json());
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (error) {
    return (
      <div className="min-h-screen">
        <Navbar />
        <main className="max-w-2xl mx-auto px-6 py-20 text-center">
          <p className="font-display text-2xl italic mb-3">{error}</p>
          <Link href="/dashboard" className="text-[var(--accent)] underline text-sm">
            Back to my trees
          </Link>
        </main>
      </div>
    );
  }

  if (!tree) {
    return (
      <div className="min-h-screen">
        <Navbar />
        <p className="text-center py-20 text-[var(--ink-soft)]">Loading…</p>
      </div>
    );
  }

  const canEdit = tree.myRole === "ADMIN" || tree.myRole === "OWNER" || tree.myRole === "EDITOR";
  const isOwner = tree.myRole === "ADMIN" || tree.myRole === "OWNER";

  return (
    <div className="h-screen flex flex-col">
      <Navbar />
      <div className="flex items-center justify-between px-6 py-3 border-b border-[var(--rule)] bg-[var(--paper)]">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--gold)]">
            {tree.myRole === "VIEWER" ? "Viewing" : "Editing"}
          </p>
          <h1 className="font-display text-2xl">{tree.name}</h1>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3 text-xs text-[var(--ink-soft)] font-mono">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[var(--male-fill)] border border-[var(--male-ink)]" />
              Male
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[var(--female-fill)] border border-[var(--female-ink)]" />
              Female
            </span>
          </div>
          <div className="w-72">
            <ManageCollaborators
              treeId={tree.id}
              members={tree.members}
              invites={tree.invites}
              isOwner={isOwner}
              onChanged={load}
            />
          </div>
        </div>
      </div>

      <div className="flex-1 min-h-0">
        <TreeCanvas treeId={tree.id} people={tree.nodes} canEdit={canEdit} onChanged={load} />
      </div>
    </div>
  );
}

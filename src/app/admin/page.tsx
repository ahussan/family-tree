"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";

type Tree = {
  id: string;
  name: string;
  description: string | null;
  updatedAt: string;
  _count: { nodes: number };
  members: { role: string; user: { name: string; email: string } }[];
};

export default function AdminPage() {
  const [trees, setTrees] = useState<Tree[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/trees").then(async (res) => {
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Admin access required.");
        return;
      }
      setTrees(await res.json());
    });
  }, []);

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="max-w-5xl mx-auto px-6 py-12">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-[var(--gold)] mb-2">System-wide</p>
        <h1 className="font-display text-4xl italic mb-10">All Trees</h1>

        {error && <p className="text-[var(--female-ink)]">{error}</p>}

        {trees && (
          <div className="border border-[var(--rule)] rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-[var(--paper-deep)]/60 text-left font-mono text-xs uppercase tracking-wide text-[var(--ink-soft)]">
                <tr>
                  <th className="px-4 py-3">Tree</th>
                  <th className="px-4 py-3">Owner</th>
                  <th className="px-4 py-3">People</th>
                  <th className="px-4 py-3">Collaborators</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {trees.map((t) => {
                  const owner = t.members.find((m) => m.role === "OWNER");
                  return (
                    <tr key={t.id} className="border-t border-[var(--rule)]">
                      <td className="px-4 py-3 font-display text-base">{t.name}</td>
                      <td className="px-4 py-3">{owner ? `${owner.user.name} (${owner.user.email})` : "—"}</td>
                      <td className="px-4 py-3 font-mono">{t._count.nodes}</td>
                      <td className="px-4 py-3 font-mono">{t.members.length}</td>
                      <td className="px-4 py-3">
                        <Link href={`/tree/${t.id}`} className="text-[var(--accent)] underline">
                          Open
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}

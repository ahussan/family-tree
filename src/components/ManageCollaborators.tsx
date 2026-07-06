"use client";

import { useState } from "react";

type Member = {
  id: string;
  role: string;
  user: { id: string; name: string; email: string };
};

export default function ManageCollaborators({
  treeId,
  members,
  invites,
  isOwner,
  onChanged,
}: {
  treeId: string;
  members: Member[];
  invites: { id: string; email: string; role: string }[];
  isOwner: boolean;
  onChanged: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"EDITOR" | "VIEWER">("EDITOR");
  const [status, setStatus] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  async function invite(e: React.FormEvent) {
    e.preventDefault();
    setSending(true);
    setStatus(null);
    const res = await fetch(`/api/trees/${treeId}/invite`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, role }),
    });
    const data = await res.json();
    setSending(false);
    if (!res.ok) {
      setStatus(data.error || "Failed to invite.");
      return;
    }
    setStatus(data.status === "added" ? `${email} added to the tree.` : `Invite sent to ${email}.`);
    setEmail("");
    onChanged();
  }

  async function removeMember(memberId: string) {
    if (!confirm("Remove this collaborator?")) return;
    await fetch(`/api/trees/${treeId}/members/${memberId}`, { method: "DELETE" });
    onChanged();
  }

  return (
    <div className="border border-[var(--rule)] rounded-lg bg-white/40">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-5 py-3.5 text-sm font-medium"
      >
        <span>Collaborators ({members.length})</span>
        <span className="text-[var(--ink-soft)]">{open ? "–" : "+"}</span>
      </button>

      {open && (
        <div className="px-5 pb-5 space-y-4 border-t border-[var(--rule)] pt-4">
          <ul className="space-y-2">
            {members.map((m) => (
              <li key={m.id} className="flex items-center justify-between text-sm">
                <div>
                  <p>{m.user.name}</p>
                  <p className="text-xs text-[var(--ink-soft)] font-mono">{m.user.email}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] uppercase tracking-wide font-mono text-[var(--gold)]">{m.role}</span>
                  {isOwner && m.role !== "OWNER" && (
                    <button
                      onClick={() => removeMember(m.id)}
                      className="text-xs text-[var(--female-ink)] hover:underline"
                    >
                      Remove
                    </button>
                  )}
                </div>
              </li>
            ))}
            {invites.map((i) => (
              <li key={i.id} className="flex items-center justify-between text-sm opacity-60">
                <p>{i.email}</p>
                <span className="text-[10px] uppercase tracking-wide font-mono">pending</span>
              </li>
            ))}
          </ul>

          {isOwner && (
            <form onSubmit={invite} className="space-y-2 pt-2 border-t border-[var(--rule)]">
              <label className="block text-xs uppercase tracking-wide text-[var(--ink-soft)]">
                Invite by email
              </label>
              <div className="flex gap-2">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="cousin@example.com"
                  className="flex-1 px-3 py-2 text-sm rounded-md border border-[var(--rule)] bg-white/60 focus:outline-none focus:border-[var(--accent)]"
                />
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as any)}
                  className="px-2 py-2 text-sm rounded-md border border-[var(--rule)] bg-white/60"
                >
                  <option value="EDITOR">Editor</option>
                  <option value="VIEWER">Viewer</option>
                </select>
              </div>
              <button
                disabled={sending}
                className="w-full py-2 text-sm rounded-md bg-[var(--accent)] text-[var(--paper)] font-medium hover:opacity-90 disabled:opacity-60"
              >
                {sending ? "Sending…" : "Send invite"}
              </button>
              {status && <p className="text-xs text-[var(--ink-soft)]">{status}</p>}
            </form>
          )}
        </div>
      )}
    </div>
  );
}

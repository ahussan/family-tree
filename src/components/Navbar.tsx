"use client";

import Link from "next/link";
import { signOut, useSession } from "next-auth/react";

export default function Navbar() {
  const { data: session } = useSession();

  return (
    <header className="border-b border-[var(--rule)] bg-[var(--paper)]/95 backdrop-blur sticky top-0 z-40">
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link href="/dashboard" className="flex items-center gap-2.5 group">
          <span className="w-8 h-8 rounded-full border-2 border-[var(--accent)] flex items-center justify-center font-display italic text-[var(--accent)] text-sm">
            L
          </span>
          <span className="font-display text-xl tracking-tight text-[var(--ink)]">Lineage</span>
        </Link>

        <nav className="flex items-center gap-6 text-sm">
          <Link href="/dashboard" className="text-[var(--ink-soft)] hover:text-[var(--ink)] transition-colors">
            My Trees
          </Link>
          {session?.user?.systemRole === "ADMIN" && (
            <Link href="/admin" className="text-[var(--ink-soft)] hover:text-[var(--ink)] transition-colors">
              Admin
            </Link>
          )}
          {session?.user && (
            <div className="flex items-center gap-3 pl-4 border-l border-[var(--rule)]">
              <span className="font-mono text-xs text-[var(--ink-soft)]">{session.user.name}</span>
              <button
                onClick={() => signOut({ callbackUrl: "/" })}
                className="text-xs uppercase tracking-wide px-3 py-1.5 rounded-full border border-[var(--rule)] hover:border-[var(--accent)] hover:text-[var(--accent)] transition-colors"
              >
                Sign out
              </button>
            </div>
          )}
        </nav>
      </div>
    </header>
  );
}

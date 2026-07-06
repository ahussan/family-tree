"use client";

import { useEffect, useState, use as usePromise } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = usePromise(params);
  const { status } = useSession();
  const router = useRouter();
  const [invite, setInvite] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [accepting, setAccepting] = useState(false);

  useEffect(() => {
    fetch(`/api/invites/${token}`).then(async (res) => {
      const data = await res.json();
      if (!res.ok) setError(data.error);
      else setInvite(data);
    });
  }, [token]);

  async function accept() {
    setAccepting(true);
    const res = await fetch(`/api/invites/${token}`, { method: "POST" });
    const data = await res.json();
    setAccepting(false);
    if (!res.ok) {
      setError(data.error);
      return;
    }
    router.push(`/tree/${data.treeId}`);
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-6">
      <div className="w-full max-w-sm text-center">
        <Link href="/" className="font-display italic text-lg text-[var(--accent)]">
          Lineage
        </Link>

        {error && <p className="mt-6 text-[var(--female-ink)]">{error}</p>}

        {invite && !error && (
          <>
            <h1 className="font-display text-2xl mt-6 mb-2">You&rsquo;ve been invited</h1>
            <p className="text-sm text-[var(--ink-soft)] mb-8">
              {invite.invitedBy?.name || "Someone"} invited you to collaborate on{" "}
              <strong>{invite.tree?.name}</strong> as a {invite.role.toLowerCase()}.
            </p>

            {status === "unauthenticated" && (
              <div className="space-y-3">
                <p className="text-xs text-[var(--ink-soft)]">Sign in or create an account with {invite.email} to accept.</p>
                <Link
                  href={`/login?callbackUrl=/invite/${token}`}
                  className="block py-2.5 rounded-full bg-[var(--accent)] text-[var(--paper)] font-medium"
                >
                  Sign in
                </Link>
                <Link
                  href={`/register?callbackUrl=/invite/${token}`}
                  className="block py-2.5 rounded-full border border-[var(--rule)]"
                >
                  Create account
                </Link>
              </div>
            )}

            {status === "authenticated" && (
              <button
                onClick={accept}
                disabled={accepting}
                className="w-full py-2.5 rounded-full bg-[var(--accent)] text-[var(--paper)] font-medium disabled:opacity-60"
              >
                {accepting ? "Joining…" : "Accept invite"}
              </button>
            )}
          </>
        )}
      </div>
    </main>
  );
}

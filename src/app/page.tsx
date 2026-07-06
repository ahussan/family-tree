import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col">
      <header className="max-w-6xl mx-auto w-full px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className="w-8 h-8 rounded-full border-2 border-[var(--accent)] flex items-center justify-center font-display italic text-[var(--accent)] text-sm">
            L
          </span>
          <span className="font-display text-xl tracking-tight">Lineage</span>
        </div>
        <nav className="flex items-center gap-3 text-sm">
          <Link href="/login" className="px-4 py-2 text-[var(--ink-soft)] hover:text-[var(--ink)]">
            Sign in
          </Link>
          <Link
            href="/register"
            className="px-4 py-2 rounded-full bg-[var(--accent)] text-[var(--paper)] hover:opacity-90 transition-opacity"
          >
            Get started — free
          </Link>
        </nav>
      </header>

      <section className="max-w-4xl mx-auto px-6 pt-20 pb-24 text-center">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-[var(--gold)] mb-6">
          Vol. I — A record kept together
        </p>
        <h1 className="font-display text-5xl md:text-6xl italic leading-[1.05] mb-6 text-balance">
          Every family has a story.
          <br />
          Keep it, branch by branch.
        </h1>
        <p className="text-[var(--ink-soft)] text-lg max-w-xl mx-auto mb-10 text-balance">
          Lineage is a free, collaborative family tree. Add parents, children, siblings,
          and marriages — polygamous households included — and invite relatives to help
          fill in the record.
        </p>
        <div className="flex items-center justify-center gap-4">
          <Link
            href="/register"
            className="px-6 py-3 rounded-full bg-[var(--accent)] text-[var(--paper)] font-medium hover:opacity-90 transition-opacity"
          >
            Start your tree
          </Link>
          <Link
            href="/login"
            className="px-6 py-3 rounded-full border border-[var(--rule)] hover:border-[var(--accent)] transition-colors"
          >
            I already have an account
          </Link>
        </div>
      </section>

      <section className="max-w-5xl mx-auto px-6 pb-24 grid md:grid-cols-3 gap-6 w-full">
        {[
          {
            k: "01",
            t: "Build outward from anyone",
            d: "Select a person and add their parent, child, sibling, or spouse — the tree grows in whichever direction the record takes you.",
          },
          {
            k: "02",
            t: "Colored at a glance",
            d: "Men appear in light blue, women in light pink, laid out automatically on an open canvas you can pan and zoom.",
          },
          {
            k: "03",
            t: "Kept by the whole family",
            d: "Invite relatives to co-edit a tree, or keep it private. Each person can maintain several trees of their own.",
          },
        ].map((f) => (
          <div key={f.k} className="border border-[var(--rule)] rounded-lg p-6 bg-[var(--paper-deep)]/40">
            <span className="font-mono text-xs text-[var(--gold)]">{f.k}</span>
            <h3 className="font-display text-xl mt-2 mb-2">{f.t}</h3>
            <p className="text-sm text-[var(--ink-soft)] leading-relaxed">{f.d}</p>
          </div>
        ))}
      </section>

      <footer className="mt-auto border-t border-[var(--rule)] py-6 text-center text-xs text-[var(--ink-soft)] font-mono">
        Lineage — free, always.
      </footer>
    </main>
  );
}

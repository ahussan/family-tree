"use client";

import { memo } from "react";
import { Handle, Position, NodeProps } from "reactflow";
import type { ApiPersonNode } from "@/lib/layout";

function PersonNodeCard({ data, selected }: NodeProps<{ person: ApiPersonNode }>) {
  const p = data.person;
  const isMale = p.sex === "MALE";

  const years =
    p.birthYear || p.deathYear
      ? `${p.birthYear ?? "?"} – ${p.deathYear ?? (p.deathYear === 0 ? "0" : "")}`.replace(/ – $/, "")
      : null;

  return (
    <div
      className={[
        "rounded-lg border-2 px-4 py-3 shadow-sm w-[190px] transition-shadow cursor-pointer",
        isMale ? "bg-[var(--male-fill)] border-[var(--male-ink)]/40" : "bg-[var(--female-fill)] border-[var(--female-ink)]/40",
        selected ? "ring-2 ring-offset-2 ring-[var(--gold)]" : "",
      ].join(" ")}
    >
      <Handle type="target" position={Position.Top} className="!bg-[var(--ink-soft)] !w-2 !h-2" />
      <div className="flex items-center gap-2 mb-1">
        <span
          className={[
            "w-2 h-2 rounded-full shrink-0",
            isMale ? "bg-[var(--male-ink)]" : "bg-[var(--female-ink)]",
          ].join(" ")}
        />
        <p className="font-display text-[15px] leading-tight truncate" title={p.name}>
          {p.name}
        </p>
      </div>
      {years && <p className="font-mono text-[11px] text-[var(--ink-soft)]">{years}</p>}
      <Handle type="source" position={Position.Bottom} className="!bg-[var(--ink-soft)] !w-2 !h-2" />
    </div>
  );
}

export default memo(PersonNodeCard);

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
      {/* Parent → child handles */}
      <Handle type="target" position={Position.Top} id="top" className="!bg-[var(--ink-soft)] !w-2 !h-2" />
      <Handle type="source" position={Position.Bottom} id="bottom" className="!bg-[var(--ink-soft)] !w-2 !h-2" />

      {/* Spouse handles — invisible anchors so marriage lines connect side-to-side
          instead of reusing the top/bottom parent-child handles (which produced a
          diagonal line). Both left and right exist as source AND target because
          layout.ts picks whichever pair matches the couple's actual left/right order. */}
      <Handle type="source" position={Position.Left} id="left-source" style={{ opacity: 0 }} />
      <Handle type="target" position={Position.Left} id="left-target" style={{ opacity: 0 }} />
      <Handle type="source" position={Position.Right} id="right-source" style={{ opacity: 0 }} />
      <Handle type="target" position={Position.Right} id="right-target" style={{ opacity: 0 }} />

      <div className="flex items-center gap-2 mb-1">
        <span
          className={[
            "w-2 h-2 rounded-full shrink-0",
            isMale ? "bg-[var(--male-ink)]" : "bg-[var(--female-ink)]",
          ].join(" ")}
        />
        <p className="font-display text-[15px] leading-tight truncate flex-1" title={p.name}>
          {p.name}
        </p>
        {p.outgoingLinks?.length > 0 && (
          <span className="text-[10px] text-[var(--gold)]" title="Linked to another tree">
            🔗
          </span>
        )}
      </div>
      {years && <p className="font-mono text-[11px] text-[var(--ink-soft)]">{years}</p>}
    </div>
  );
}

export default memo(PersonNodeCard);
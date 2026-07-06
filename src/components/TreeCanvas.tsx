"use client";

import { useMemo, useState, useCallback } from "react";
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  Node as RFNode,
  useEdgesState,
  useNodesState,
} from "reactflow";
import "reactflow/dist/style.css";
import { buildLayout, ApiPersonNode } from "@/lib/layout";
import PersonNodeCard from "@/components/PersonNodeCard";
import AddPersonModal from "@/components/AddPersonModal";

const nodeTypes = { person: PersonNodeCard };

type Relation = "ROOT" | "PARENT" | "CHILD" | "SIBLING" | "SPOUSE";

export default function TreeCanvas({
  treeId,
  people,
  canEdit,
  onChanged,
}: {
  treeId: string;
  people: ApiPersonNode[];
  canEdit: boolean;
  onChanged: () => void;
}) {
  const { nodes: layoutNodes, edges: layoutEdges } = useMemo(() => buildLayout(people), [people]);
  const [nodes, setNodes, onNodesChange] = useNodesState(layoutNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(layoutEdges);
  const [selected, setSelected] = useState<ApiPersonNode | null>(null);
  const [modalRelation, setModalRelation] = useState<Relation | null>(null);

  // Re-sync layout whenever the underlying people data changes.
  useMemo(() => {
    setNodes(layoutNodes);
    setEdges(layoutEdges);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [people]);

  const onNodeClick = useCallback(
    (_: any, node: RFNode) => {
      const person = people.find((p) => p.id === node.id) ?? null;
      setSelected(person);
    },
    [people]
  );

  async function deleteSelected() {
    if (!selected) return;
    if (!confirm(`Remove ${selected.name} from the tree? This also removes their relationship links.`)) return;
    await fetch(`/api/trees/${treeId}/nodes/${selected.id}`, { method: "DELETE" });
    setSelected(null);
    onChanged();
  }

  return (
    <div className="relative w-full h-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick}
        onPaneClick={() => setSelected(null)}
        nodeTypes={nodeTypes}
        fitView
        minZoom={0.2}
        proOptions={{ hideAttribution: true }}
      >
        <Background color="var(--rule)" gap={24} />
        <Controls showInteractive={false} />
        <MiniMap
          zoomable
          pannable
          maskColor="rgba(238,231,216,0.6)"
          nodeColor={(n) => ((n.data.person as ApiPersonNode).sex === "MALE" ? "#cfe3f2" : "#f4d9e2")}
        />
      </ReactFlow>

      {people.length === 0 && canEdit && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="pointer-events-auto text-center bg-[var(--paper)]/90 border border-[var(--rule)] rounded-lg px-8 py-10">
            <p className="font-display text-2xl italic mb-3">This tree is empty</p>
            <p className="text-sm text-[var(--ink-soft)] mb-5">Add the first person to begin.</p>
            <button
              onClick={() => setModalRelation("ROOT")}
              className="px-5 py-2.5 rounded-full bg-[var(--accent)] text-[var(--paper)] font-medium hover:opacity-90"
            >
              + Add first person
            </button>
          </div>
        </div>
      )}

      {selected && (
        <div className="absolute top-4 right-4 w-72 bg-[var(--paper)] border border-[var(--rule)] rounded-lg shadow-lg p-5">
          <div className="flex items-center gap-2 mb-1">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                selected.sex === "MALE" ? "bg-[var(--male-ink)]" : "bg-[var(--female-ink)]"
              }`}
            />
            <h3 className="font-display text-lg">{selected.name}</h3>
          </div>
          <p className="font-mono text-xs text-[var(--ink-soft)] mb-4">
            {selected.sex === "MALE" ? "Male" : "Female"}
            {selected.birthYear ? ` · b. ${selected.birthYear}` : ""}
            {selected.deathYear ? ` · d. ${selected.deathYear}` : ""}
          </p>
          {selected.notes && <p className="text-sm text-[var(--ink-soft)] mb-4">{selected.notes}</p>}

          {canEdit && (
            <div className="grid grid-cols-2 gap-2 mb-3">
              <button onClick={() => setModalRelation("PARENT")} className="btn-secondary">
                + Parent
              </button>
              <button onClick={() => setModalRelation("CHILD")} className="btn-secondary">
                + Child
              </button>
              <button onClick={() => setModalRelation("SIBLING")} className="btn-secondary">
                + Sibling
              </button>
              <button onClick={() => setModalRelation("SPOUSE")} className="btn-secondary">
                + Spouse
              </button>
            </div>
          )}

          {canEdit && (
            <button
              onClick={deleteSelected}
              className="w-full text-xs text-[var(--female-ink)] py-2 rounded-md border border-[var(--female-ink)]/30 hover:bg-[var(--female-fill)]/40"
            >
              Remove person
            </button>
          )}
        </div>
      )}

      {canEdit && modalRelation && (
        <AddPersonModal
          treeId={treeId}
          relation={modalRelation}
          relative={modalRelation === "ROOT" ? null : selected}
          allPeople={people}
          onClose={() => setModalRelation(null)}
          onCreated={() => {
            setModalRelation(null);
            onChanged();
          }}
        />
      )}

      <style jsx global>{`
        .btn-secondary {
          font-size: 12px;
          padding: 8px 10px;
          border-radius: 8px;
          border: 1px solid var(--rule);
          background: white;
          transition: border-color 0.15s;
        }
        .btn-secondary:hover {
          border-color: var(--accent);
        }
      `}</style>
    </div>
  );
}

"use client";

import { useMemo, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  Node as RFNode,
  ReactFlowProvider,
  useEdgesState,
  useNodesState,
  useReactFlow,
} from "reactflow";
import "reactflow/dist/style.css";
import { buildLayout, ApiPersonNode } from "@/lib/layout";
import PersonNodeCard from "@/components/PersonNodeCard";
import AddPersonModal from "@/components/AddPersonModal";
import EditPersonModal from "@/components/EditPersonModal";
import LinkTreeModal from "@/components/LinkTreeModal";

const nodeTypes = { person: PersonNodeCard };

type Relation = "ROOT" | "PARENT" | "CHILD" | "SIBLING" | "SPOUSE";

function Canvas({
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
  const router = useRouter();
  const reactFlow = useReactFlow();
  const { nodes: layoutNodes, edges: layoutEdges } = useMemo(() => buildLayout(people), [people]);
  const [nodes, setNodes, onNodesChange] = useNodesState(layoutNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(layoutEdges);
  const [selected, setSelected] = useState<ApiPersonNode | null>(null);
  const [modalRelation, setModalRelation] = useState<Relation | null>(null);
  const [editing, setEditing] = useState(false);
  const [linking, setLinking] = useState(false);
  const [overlapping, setOverlapping] = useState(false);
  const dragOrigin = useRef<{ x: number; y: number } | null>(null);

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

  // Auto-arrange back into clean generation rows, in case someone has
  // dragged things around (or the tree just looks cramped after edits).
  function rearrange() {
    const fresh = buildLayout(people);
    setNodes(fresh.nodes);
    setEdges(fresh.edges);
    setOverlapping(false);
    requestAnimationFrame(() => {
      reactFlow.fitView({ duration: 500, padding: 0.25 });
    });
  }

  // Prevent overlap while dragging: snap a card back to where it started
  // if it's dropped on top of another card. Uses React Flow's own
  // intersection utility rather than hand-rolled collision math.
  const onNodeDragStart = useCallback((_: any, node: RFNode) => {
    dragOrigin.current = { x: node.position.x, y: node.position.y };
  }, []);

  const onNodeDrag = useCallback(
    (_: any, node: RFNode) => {
      const hits = reactFlow.getIntersectingNodes(node).length > 0;
      setOverlapping(hits);
    },
    [reactFlow]
  );

  const onNodeDragStop = useCallback(
    (_: any, node: RFNode) => {
      const hits = reactFlow.getIntersectingNodes(node);
      setOverlapping(false);
      if (hits.length > 0 && dragOrigin.current) {
        const origin = dragOrigin.current;
        setNodes((nds) => nds.map((n) => (n.id === node.id ? { ...n, position: origin } : n)));
      }
      dragOrigin.current = null;
    },
    [reactFlow, setNodes]
  );

  async function deleteSelected() {
    if (!selected) return;
    if (!confirm(`Remove ${selected.name} from the tree? This also removes their relationship links.`)) return;
    await fetch(`/api/trees/${treeId}/nodes/${selected.id}`, { method: "DELETE" });
    setSelected(null);
    onChanged();
  }

  async function removeLink(linkId: string) {
    if (!selected) return;
    await fetch(`/api/trees/${treeId}/nodes/${selected.id}/links/${linkId}`, { method: "DELETE" });
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
        onNodeDragStart={onNodeDragStart}
        onNodeDrag={onNodeDrag}
        onNodeDragStop={onNodeDragStop}
        onPaneClick={() => setSelected(null)}
        nodeTypes={nodeTypes}
        fitView
        minZoom={0.15}
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

      <button
        onClick={rearrange}
        className="absolute top-4 left-4 flex items-center gap-2 px-4 py-2 rounded-full bg-[var(--paper)] border border-[var(--rule)] text-sm font-medium shadow-sm hover:border-[var(--accent)] hover:text-[var(--accent)] transition-colors"
        title="Re-lay out the tree into clean generation rows"
      >
        🔄 Rearrange
      </button>

      {overlapping && (
        <div className="absolute top-16 left-4 text-xs px-3 py-1.5 rounded-full bg-[var(--female-fill)] text-[var(--female-ink)] border border-[var(--female-ink)]/30">
          Can&apos;t drop on top of another person
        </div>
      )}

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
        <div className="absolute top-4 right-4 w-72 bg-[var(--paper)] border border-[var(--rule)] rounded-lg shadow-lg p-5 max-h-[calc(100vh-8rem)] overflow-y-auto">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <span
                className={`w-2.5 h-2.5 rounded-full ${
                  selected.sex === "MALE" ? "bg-[var(--male-ink)]" : "bg-[var(--female-ink)]"
                }`}
              />
              <h3 className="font-display text-lg">{selected.name}</h3>
            </div>
            {canEdit && (
              <button
                onClick={() => setEditing(true)}
                className="text-xs text-[var(--accent)] underline underline-offset-2"
              >
                Edit
              </button>
            )}
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

          {selected.outgoingLinks?.length > 0 && (
            <div className="mb-3 pt-3 border-t border-[var(--rule)]">
              <p className="text-[10px] uppercase tracking-wide text-[var(--ink-soft)] mb-2">Linked elsewhere</p>
              <ul className="space-y-1.5">
                {selected.outgoingLinks.map((link) => (
                  <li key={link.id} className="flex items-center justify-between gap-2">
                    <button
                      onClick={() => router.push(`/tree/${link.toTreeId}`)}
                      className="text-left text-sm text-[var(--accent)] underline underline-offset-2 truncate"
                      title={link.label ?? undefined}
                    >
                      {link.toTree.name}
                      {link.toNode ? ` — ${link.toNode.name}` : ""}
                    </button>
                    {canEdit && (
                      <button
                        onClick={() => removeLink(link.id)}
                        className="text-xs text-[var(--female-ink)] shrink-0"
                        title="Remove link"
                      >
                        ✕
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {canEdit && (
            <div className="space-y-2">
              <button
                onClick={() => setLinking(true)}
                className="w-full text-xs py-2 rounded-md border border-[var(--rule)] hover:border-[var(--accent)]"
              >
                🔗 Link to another tree
              </button>
              <button
                onClick={deleteSelected}
                className="w-full text-xs text-[var(--female-ink)] py-2 rounded-md border border-[var(--female-ink)]/30 hover:bg-[var(--female-fill)]/40"
              >
                Remove person
              </button>
            </div>
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

      {canEdit && editing && selected && (
        <EditPersonModal
          treeId={treeId}
          person={selected}
          allPeople={people}
          onClose={() => setEditing(false)}
          onSaved={() => {
            setEditing(false);
            onChanged();
          }}
        />
      )}

      {canEdit && linking && selected && (
        <LinkTreeModal
          treeId={treeId}
          person={selected}
          onClose={() => setLinking(false)}
          onLinked={() => {
            setLinking(false);
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

export default function TreeCanvas(props: {
  treeId: string;
  people: ApiPersonNode[];
  canEdit: boolean;
  onChanged: () => void;
}) {
  return (
    <ReactFlowProvider>
      <Canvas {...props} />
    </ReactFlowProvider>
  );
}
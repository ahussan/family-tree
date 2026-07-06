import dagre from "dagre";
import type { Edge, Node } from "reactflow";

export type ApiPersonNode = {
  id: string;
  name: string;
  sex: "MALE" | "FEMALE";
  birthYear: number | null;
  deathYear: number | null;
  notes: string | null;
  parentLinks: { id: string; parentId: string; childId: string }[];
  childLinks: { id: string; parentId: string; childId: string }[];
  marriagesAsHusband: { id: string; husbandId: string; wifeId: string }[];
  marriagesAsWife: { id: string; husbandId: string; wifeId: string }[];
};

const NODE_WIDTH = 190;
const NODE_HEIGHT = 88;

export function buildLayout(people: ApiPersonNode[]) {
  const g = new dagre.graphlib.Graph();
  g.setGraph({ rankdir: "TB", nodesep: 40, ranksep: 90, marginx: 40, marginy: 40 });
  g.setDefaultEdgeLabel(() => ({}));

  people.forEach((p) => g.setNode(p.id, { width: NODE_WIDTH, height: NODE_HEIGHT }));

  const parentChildEdges: { id: string; source: string; target: string }[] = [];
  const marriageEdges: { id: string; source: string; target: string }[] = [];
  const seenMarriages = new Set<string>();

  for (const p of people) {
    for (const link of p.parentLinks) {
      parentChildEdges.push({ id: `pc-${link.id}`, source: link.parentId, target: link.childId });
      g.setEdge(link.parentId, link.childId, { minlen: 1, weight: 1 });
    }
    for (const m of [...p.marriagesAsHusband, ...p.marriagesAsWife]) {
      if (seenMarriages.has(m.id)) continue;
      seenMarriages.add(m.id);
      marriageEdges.push({ id: `m-${m.id}`, source: m.husbandId, target: m.wifeId });
      g.setEdge(m.husbandId, m.wifeId, { minlen: 0, weight: 6 });
    }
  }

  dagre.layout(g);

  const nodes: Node[] = people.map((p) => {
    const pos = g.node(p.id);
    return {
      id: p.id,
      type: "person",
      position: { x: pos.x - NODE_WIDTH / 2, y: pos.y - NODE_HEIGHT / 2 },
      data: { person: p },
      draggable: true,
    };
  });

  const edges: Edge[] = [
    ...parentChildEdges.map((e) => ({
      id: e.id,
      source: e.source,
      target: e.target,
      type: "smoothstep",
      className: "parentchild",
    })),
    ...marriageEdges.map((e) => ({
      id: e.id,
      source: e.source,
      target: e.target,
      type: "straight",
      className: "marriage",
    })),
  ];

  return { nodes, edges };
}

import type { Edge, Node } from "reactflow";

export type TreeLinkRef = {
  id: string;
  toTreeId: string;
  toNodeId: string | null;
  label: string | null;
  toTree: { id: string; name: string };
  toNode: { id: string; name: string } | null;
};

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
  outgoingLinks: TreeLinkRef[];
};

const NODE_WIDTH = 190;
const NODE_HEIGHT = 88;
const SPOUSE_GAP = 24; // gap between two spouses within the same family unit
const UNIT_GAP = 70; // gap between two separate family units on the same row
const ROW_HEIGHT = NODE_HEIGHT + 130; // vertical spacing between generations, with room for edge labels

// Minimal union-find, used to cluster spouses (including polygamous households
// and remarriages) into one horizontal "family unit" that always moves together.
class UnionFind {
  private parent = new Map<string, string>();
  constructor(ids: string[]) {
    ids.forEach((id) => this.parent.set(id, id));
  }
  find(id: string): string {
    const p = this.parent.get(id) ?? id;
    if (p === id) return id;
    const root = this.find(p);
    this.parent.set(id, root);
    return root;
  }
  union(a: string, b: string) {
    const ra = this.find(a);
    const rb = this.find(b);
    if (ra !== rb) this.parent.set(ra, rb);
  }
}

export function buildLayout(people: ApiPersonNode[]) {
  const byId = new Map(people.map((p) => [p.id, p]));
  const parentsOf = new Map<string, string[]>();
  const marriages: { id: string; husbandId: string; wifeId: string }[] = [];
  const seenMarriages = new Set<string>();

  for (const p of people) {
    parentsOf.set(
      p.id,
      Array.from(new Set(p.parentLinks.map((l) => l.parentId))).filter((id) => byId.has(id))
    );
    for (const m of [...p.marriagesAsHusband, ...p.marriagesAsWife]) {
      if (seenMarriages.has(m.id)) continue;
      seenMarriages.add(m.id);
      marriages.push(m);
    }
  }

  // --- 1. Assign a generation (row) to every person ---------------------
  // A child is always at least one row below every recorded parent, and
  // spouses are always pulled onto the same row as each other. Both rules
  // are applied repeatedly until nothing changes (a simple fixed point —
  // family trees are small enough that this converges almost immediately).
  const gen = new Map(people.map((p) => [p.id, 0]));
  let changed = true;
  let guard = 0;
  while (changed && guard < people.length + marriages.length + 5) {
    changed = false;
    guard++;
    for (const p of people) {
      const parents = parentsOf.get(p.id) ?? [];
      if (parents.length === 0) continue;
      const requiredGen = Math.max(...parents.map((pid) => gen.get(pid) ?? 0)) + 1;
      if ((gen.get(p.id) ?? 0) < requiredGen) {
        gen.set(p.id, requiredGen);
        changed = true;
      }
    }
    for (const m of marriages) {
      const gh = gen.get(m.husbandId) ?? 0;
      const gw = gen.get(m.wifeId) ?? 0;
      if (gh !== gw) {
        const target = Math.max(gh, gw);
        gen.set(m.husbandId, target);
        gen.set(m.wifeId, target);
        changed = true;
      }
    }
  }

  // --- 2. Group people into family units (a person + all their spouses) -
  const uf = new UnionFind(people.map((p) => p.id));
  marriages.forEach((m) => uf.union(m.husbandId, m.wifeId));

  const unitMembers = new Map<string, string[]>(); // unit root -> member ids, left-to-right order
  for (const p of people) {
    const root = uf.find(p.id);
    if (!unitMembers.has(root)) unitMembers.set(root, []);
    unitMembers.get(root)!.push(p.id);
  }
  // Deterministic left-to-right order within a unit: males first, then by id.
  for (const members of unitMembers.values()) {
    members.sort((a, b) => {
      const pa = byId.get(a)!;
      const pb = byId.get(b)!;
      if (pa.sex !== pb.sex) return pa.sex === "MALE" ? -1 : 1;
      return a.localeCompare(b);
    });
  }

  const firstAppearanceIndex = new Map(people.map((p, i) => [p.id, i]));
  const unitGeneration = (root: string) => gen.get(unitMembers.get(root)![0]) ?? 0;

  // --- 3. Order units within each row, top row first, later rows using a -
  //        barycenter heuristic so children land roughly under their
  //        parents (purely cosmetic — placement itself can't overlap).
  const rows = new Map<number, string[]>(); // generation -> unit roots
  for (const root of new Set(people.map((p) => uf.find(p.id)))) {
    const g = unitGeneration(root);
    if (!rows.has(g)) rows.set(g, []);
    rows.get(g)!.push(root);
  }

  const sortedGens = Array.from(rows.keys()).sort((a, b) => a - b);
  const unitOrderIndex = new Map<string, number>(); // unit root -> position within its row

  for (const g of sortedGens) {
    const unitsInRow = rows.get(g)!;
    const stableKey = (root: string) =>
      Math.min(...unitMembers.get(root)!.map((id) => firstAppearanceIndex.get(id) ?? 0));

    let ordered: string[];
    if (g === sortedGens[0]) {
      ordered = [...unitsInRow].sort((a, b) => stableKey(a) - stableKey(b));
    } else {
      const barycenter = (root: string) => {
        const parentPositions: number[] = [];
        for (const memberId of unitMembers.get(root)!) {
          for (const parentId of parentsOf.get(memberId) ?? []) {
            const parentRoot = uf.find(parentId);
            const idx = unitOrderIndex.get(parentRoot);
            if (idx !== undefined) parentPositions.push(idx);
          }
        }
        if (parentPositions.length === 0) return Number.POSITIVE_INFINITY;
        return parentPositions.reduce((a, b) => a + b, 0) / parentPositions.length;
      };
      ordered = [...unitsInRow].sort((a, b) => {
        const diff = barycenter(a) - barycenter(b);
        return diff !== 0 ? diff : stableKey(a) - stableKey(b);
      });
    }
    ordered.forEach((root, idx) => unitOrderIndex.set(root, idx));
    rows.set(g, ordered);
  }

  // --- 4. Assign final pixel positions — sequential placement guarantees -
  //        no two nodes on the same row can ever overlap.
  const positions = new Map<string, { x: number; y: number }>();
  for (const g of sortedGens) {
    let cursorX = 0;
    for (const root of rows.get(g)!) {
      for (const memberId of unitMembers.get(root)!) {
        positions.set(memberId, { x: cursorX, y: g * ROW_HEIGHT });
        cursorX += NODE_WIDTH + SPOUSE_GAP;
      }
      cursorX += UNIT_GAP - SPOUSE_GAP;
    }
  }

  const nodes: Node[] = people.map((p) => {
    const pos = positions.get(p.id) ?? { x: 0, y: 0 };
    return {
      id: p.id,
      type: "person",
      position: pos,
      data: { person: p },
      draggable: true,
    };
  });

  // --- 5. Edges -----------------------------------------------------------
  const parentChildEdges: { id: string; source: string; target: string }[] = [];
  for (const p of people) {
    for (const link of p.parentLinks) {
      parentChildEdges.push({ id: `pc-${link.id}`, source: link.parentId, target: link.childId });
    }
  }

  const edgeLabelStyle = { fill: "var(--ink-soft)", fontSize: 10, fontFamily: "var(--font-mono)" };
  const edgeLabelBg = { fill: "var(--paper)", fillOpacity: 0.9 };

  const edges: Edge[] = [
    ...parentChildEdges.map((e) => ({
      id: e.id,
      source: e.source,
      target: e.target,
      sourceHandle: "bottom",
      targetHandle: "top",
      type: "smoothstep",
      className: "parentchild",
      label: "child",
      labelStyle: edgeLabelStyle,
      labelBgStyle: edgeLabelBg,
      labelBgPadding: [4, 2] as [number, number],
      labelBgBorderRadius: 3,
    })),
    ...marriages.map((m) => {
      const husbandX = positions.get(m.husbandId)?.x ?? 0;
      const wifeX = positions.get(m.wifeId)?.x ?? 0;
      const husbandIsLeft = husbandX <= wifeX;
      return {
        id: `m-${m.id}`,
        source: m.husbandId,
        target: m.wifeId,
        sourceHandle: husbandIsLeft ? "right-source" : "left-source",
        targetHandle: husbandIsLeft ? "left-target" : "right-target",
        type: "straight",
        className: "marriage",
        label: "spouse",
        labelStyle: { ...edgeLabelStyle, fill: "var(--gold)" },
        labelBgStyle: edgeLabelBg,
        labelBgPadding: [4, 2] as [number, number],
        labelBgBorderRadius: 3,
      };
    }),
  ];

  return { nodes, edges };
}
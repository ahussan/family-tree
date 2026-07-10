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
const SPOUSE_GAP = 80; // gap between two spouses — wide enough for the "spouse" edge label
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
  // Generation is counted from the BOTTOM: leaves/youngest = 0, their
  // parents = 1, grandparents = 2, etc.  This way the number reflects
  // how far above the bottom of the tree a person sits, and adding more
  // descendants never renumbers existing ancestors.
  //
  // Build childrenOf (inverse of parentsOf) first — we need it for both
  // the generation assignment and the barycenter ordering.
  const childrenOf = new Map<string, string[]>();
  for (const p of people) childrenOf.set(p.id, []);
  for (const p of people) {
    for (const parentId of parentsOf.get(p.id) ?? []) {
      childrenOf.get(parentId)?.push(p.id);
    }
  }

  // Phase 1: propagate upward with sibling levelling.
  //
  // Two constraints run together until stable:
  //   (a) A parent must be at least one row above their tallest child.
  //   (b) All children of the same parent must share the same generation
  //       as the tallest sibling among them.  Without (b), a childless
  //       sibling (e.g. an uncle with no children) stays at gen=0 while
  //       their siblings with children are pushed to gen=1+, making the
  //       uncle appear a full generation lower than their own siblings.
  const gen = new Map(people.map((p) => [p.id, 0]));
  let changed = true;
  let guard = 0;
  while (changed && guard < people.length * 2 + 5) {
    changed = false;
    guard++;

    // (a) Push each parent above their tallest child.
    for (const p of people) {
      const children = childrenOf.get(p.id) ?? [];
      if (children.length === 0) continue;
      const required = Math.max(...children.map((cid) => gen.get(cid) ?? 0)) + 1;
      if ((gen.get(p.id) ?? 0) < required) {
        gen.set(p.id, required);
        changed = true;
      }
    }

    // (b) Level siblings — all children of the same parent must be on the
    //     same row as the tallest sibling.
    for (const p of people) {
      const children = childrenOf.get(p.id) ?? [];
      if (children.length < 2) continue;
      const maxChildGen = Math.max(...children.map((cid) => gen.get(cid) ?? 0));
      for (const cid of children) {
        if ((gen.get(cid) ?? 0) < maxChildGen) {
          gen.set(cid, maxChildGen);
          changed = true;
        }
      }
    }
  }

  // Record each person's child-constrained minimum generation — used below
  // to guard spouse levelling so a spouse isn't pulled below their own
  // children's rows.
  const minGenByChild = new Map(gen);

  // Phase 2: level spouses onto the same row, but only when doing so does
  // not pull either spouse below (smaller gen than) what their own
  // children require.
  changed = true;
  guard = 0;
  while (changed && guard < marriages.length + 5) {
    changed = false;
    guard++;
    for (const m of marriages) {
      const gh = gen.get(m.husbandId) ?? 0;
      const gw = gen.get(m.wifeId) ?? 0;
      if (gh === gw) continue;
      const target = Math.max(gh, gw);
      const hMin = minGenByChild.get(m.husbandId) ?? 0;
      const wMin = minGenByChild.get(m.wifeId) ?? 0;
      // Only level if neither spouse would drop below their child-required gen.
      if (target >= hMin && target >= wMin) {
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
  // Deterministic left-to-right order within a unit: stable by insertion order (id).
  Array.from(unitMembers.values()).forEach((members) => {
    members.sort((a: string, b: string) => a.localeCompare(b));
  });

  const firstAppearanceIndex = new Map(people.map((p, i) => [p.id, i]));
  // A unit's generation is the maximum gen of its members (the most-ancestral
  // member determines the row the whole unit occupies).
  const unitGeneration = (root: string) =>
    Math.max(...unitMembers.get(root)!.map((id) => gen.get(id) ?? 0));

  // --- 3. Order units within each row -----------------------------------------
  // sortedGens is ascending: gen=0 (leaves/bottom) first, gen=max (roots/top) last.
  // We process bottom-to-top: when ordering gen=N, gen=N-1 children are already
  // ordered, so we use a child-barycenter heuristic to keep parents above children.
  const rows = new Map<number, string[]>(); // generation -> unit roots
  for (const root of Array.from(new Set(people.map((p) => uf.find(p.id))))) {
    const g = unitGeneration(root);
    if (!rows.has(g)) rows.set(g, []);
    rows.get(g)!.push(root);
  }

  const sortedGens = Array.from(rows.keys()).sort((a, b) => a - b); // ascending: leaf→root
  const unitOrderIndex = new Map<string, number>(); // unit root -> position within its row

  for (const g of sortedGens) {
    const unitsInRow = rows.get(g)!;
    const stableKey = (root: string) =>
      Math.min(...unitMembers.get(root)!.map((id) => firstAppearanceIndex.get(id) ?? 0));

    let ordered: string[];
    if (g === sortedGens[0]) {
      // Leaf row — no children below, just use stable insertion order.
      ordered = [...unitsInRow].sort((a, b) => stableKey(a) - stableKey(b));
    } else {
      // Order by the average position of already-placed children (gen N-1).
      const barycenter = (root: string) => {
        const childPositions: number[] = [];
        for (const memberId of unitMembers.get(root)!) {
          for (const childId of childrenOf.get(memberId) ?? []) {
            const childRoot = uf.find(childId);
            const idx = unitOrderIndex.get(childRoot);
            if (idx !== undefined) childPositions.push(idx);
          }
        }
        if (childPositions.length === 0) return Number.POSITIVE_INFINITY;
        return childPositions.reduce((a, b) => a + b, 0) / childPositions.length;
      };
      ordered = [...unitsInRow].sort((a, b) => {
        const diff = barycenter(a) - barycenter(b);
        return diff !== 0 ? diff : stableKey(a) - stableKey(b);
      });
    }
    ordered.forEach((root, idx) => unitOrderIndex.set(root, idx));
    rows.set(g, ordered);
  }

  // --- 4. Assign final pixel positions -----------------------------------------
  //
  // Strategy: bottom-up then top-down centered layout.
  //
  // Step 1 (bottom-up, leaf → root): place the deepest row first with a simple
  //   sequential layout.  Each parent row is then centred over the horizontal
  //   span already occupied by its children in the row below.
  //
  // Step 2 (collision resolution): after each row is placed, scan
  //   left-to-right and push any unit right if it overlaps its neighbour, then
  //   scan right-to-left to pull units back left where there is slack.  This
  //   keeps the row as centred as possible without introducing node overlap.

  // Pixel width of one unit (all member nodes + spouse gaps between them).
  const unitPixelWidth = (root: string) => {
    const n = unitMembers.get(root)!.length;
    return n * NODE_WIDTH + (n - 1) * SPOUSE_GAP;
  };

  const unitX = new Map<string, number>(); // unit root → final left-edge X

  // Process rows from gen=0 (leaves/bottom) upward to roots, so each parent
  // row can centre itself over its already-placed children.
  for (const g of sortedGens) {
    const rowUnits = rows.get(g)!; // already in barycenter order

    // ── Step 1: compute ideal centre-X for every unit in this row ────────────
    // A unit's ideal position is the horizontal midpoint of all its children
    // that have already been placed (i.e. in deeper/later-processed rows).
    const idealCentre = new Map<string, number>();

    const childCentres = (root: string): number[] => {
      const centres: number[] = [];
      for (const memberId of unitMembers.get(root)!) {
        const person = byId.get(memberId)!;
        for (const link of person.childLinks) {
          const childRoot = uf.find(link.childId);
          const cx = unitX.get(childRoot);
          if (cx !== undefined) {
            centres.push(cx + unitPixelWidth(childRoot) / 2);
          }
        }
      }
      return centres;
    };

    // Total pixel width of this row — used to spread childless units evenly.
    const totalRowWidth =
      rowUnits.reduce((sum, r) => sum + unitPixelWidth(r), 0) +
      Math.max(0, rowUnits.length - 1) * UNIT_GAP;

    for (let i = 0; i < rowUnits.length; i++) {
      const root = rowUnits[i];
      const centres = childCentres(root);
      if (centres.length > 0) {
        const avg = centres.reduce((a, b) => a + b, 0) / centres.length;
        idealCentre.set(root, avg);
      } else {
        // Unit has no children yet placed — distribute evenly within the row.
        const step = totalRowWidth / Math.max(rowUnits.length, 1);
        idealCentre.set(root, i * step + unitPixelWidth(root) / 2);
      }
    }

    // Convert centre → left-edge (may be negative; we normalise later).
    const leftEdge = rowUnits.map((root) => ({
      root,
      x: idealCentre.get(root)! - unitPixelWidth(root) / 2,
    }));

    // ── Step 2: collision resolution ─────────────────────────────────────────
    // Forward pass — push right if overlapping previous unit.
    for (let i = 1; i < leftEdge.length; i++) {
      const prev = leftEdge[i - 1];
      const minX = prev.x + unitPixelWidth(prev.root) + UNIT_GAP;
      if (leftEdge[i].x < minX) leftEdge[i].x = minX;
    }
    // Backward pass — pull left where slack allows (keeps row centred).
    for (let i = leftEdge.length - 2; i >= 0; i--) {
      const next = leftEdge[i + 1];
      const maxX = next.x - unitPixelWidth(leftEdge[i].root) - UNIT_GAP;
      if (leftEdge[i].x > maxX) leftEdge[i].x = maxX;
    }

    // Commit to unitX so ancestor rows can read these positions.
    for (const { root, x } of leftEdge) {
      unitX.set(root, x);
    }
  }

  // ── Normalise: shift everything so the leftmost node is at x = 0 ─────────
  const minX = Math.min(...Array.from(unitX.values()));
  const xOffset = minX < 0 ? -minX : 0;

  // Map sparse gen values → contiguous visual row indices (0 = leaves at
  // bottom, maxRow = oldest ancestors at top).
  const allGenValues = Array.from(new Set(Array.from(gen.values()))).sort((a, b) => a - b);
  const maxRow = allGenValues.length - 1;
  // gen=0 (leaves) → row index 0; gen=max (ancestors) → row index maxRow.
  // Y is inverted so row 0 sits at the bottom of the canvas:
  //   y = (maxRow - rowIndex) * ROW_HEIGHT
  const genToRow = new Map(allGenValues.map((g, i) => [g, i]));

  const positions = new Map<string, { x: number; y: number }>();
  for (const g of sortedGens) {
    for (const root of rows.get(g)!) {
      const baseX = (unitX.get(root) ?? 0) + xOffset;
      let memberCursor = baseX;
      for (const memberId of unitMembers.get(root)!) {
        const memberGen = gen.get(memberId) ?? g;
        const rowIndex = genToRow.get(memberGen) ?? memberGen;
        positions.set(memberId, { x: memberCursor, y: (maxRow - rowIndex) * ROW_HEIGHT });
        memberCursor += NODE_WIDTH + SPOUSE_GAP;
      }
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
  // Group parent-child links by child. When multiple parents of the same child
  // belong to the same family unit (i.e. they are married to each other), emit
  // only ONE edge for that unit→child pair instead of one edge per parent.
  // This avoids duplicate parallel lines between a couple and their shared child.
  const parentChildEdges: { id: string; source: string; target: string }[] = [];
  // key: "<unitRoot>-><childId>", value: the first link id seen (for stable edge id)
  const seenUnitToChild = new Map<string, string>();
  for (const p of people) {
    for (const link of p.parentLinks) {
      if (!byId.has(link.parentId)) continue; // parent not in this tree
      const unitRoot = uf.find(link.parentId);
      const key = `${unitRoot}->${link.childId}`;
      if (seenUnitToChild.has(key)) continue; // already emitted an edge for this unit→child
      seenUnitToChild.set(key, link.id);
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
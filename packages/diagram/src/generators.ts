import type { DiagramDocument, DiagramEdge, NodeType, SemanticGraph } from './types';
import { createDocument } from './document';
import { gridLayout, treeLayout, circularLayout, radialLayout } from './layout';

/** Parametric graph generators — scaffold a structured diagram in one call, or produce test/benchmark/demo graphs
 * (grids, balanced trees, cycles) without hand-building nodes and edges. Each returns a fresh validated document
 * with a fitting layout. Pure and deterministic. */
export interface GeneratorOptions { nodeType?: NodeType }
const MAX_NODES = 4000;
const guard = (n: number): void => { if (n > MAX_NODES) throw new Error(`El generador produciría ${n} nodos (máximo ${MAX_NODES}).`); };

/** A `cols`×`rows` grid: each cell connects to its right and bottom neighbour. Laid out as a grid. */
export function gridGraph(cols = 3, rows = 3, options: GeneratorOptions = {}): DiagramDocument {
  cols = Math.max(1, Math.floor(cols)); rows = Math.max(1, Math.floor(rows)); guard(cols * rows);
  const type = options.nodeType ?? 'process', id = (c: number, r: number) => `n${r * cols + c}`;
  const nodes: SemanticGraph['nodes'] = [], edges: DiagramEdge[] = [];
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) nodes.push({ id: id(c, r), type, title: `${c + 1},${r + 1}` });
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    if (c < cols - 1) edges.push({ id: `e${edges.length}`, source: id(c, r), target: id(c + 1, r) });
    if (r < rows - 1) edges.push({ id: `e${edges.length}`, source: id(c, r), target: id(c, r + 1) });
  }
  return gridLayout(createDocument({ nodes, edges }), { columns: cols });
}

/** A balanced tree of `levels` levels where every non-leaf has `branching` children. Laid out as a tree. */
export function treeGraph(levels = 3, branching = 2, options: GeneratorOptions = {}): DiagramDocument {
  levels = Math.max(1, Math.floor(levels)); branching = Math.max(1, Math.floor(branching));
  const total = branching === 1 ? levels : (Math.pow(branching, levels) - 1) / (branching - 1);
  guard(Math.round(total));
  const type = options.nodeType ?? 'process';
  const nodes: SemanticGraph['nodes'] = [{ id: 'n0', type, title: 'n0' }], edges: DiagramEdge[] = [];
  let next = 1; const frontier: Array<{ id: string; level: number }> = [{ id: 'n0', level: 1 }];
  for (let h = 0; h < frontier.length; h++) {
    const node = frontier[h]; if (node.level >= levels) continue;
    for (let b = 0; b < branching; b++) {
      const id = `n${next++}`; nodes.push({ id, type, title: id });
      edges.push({ id: `e${edges.length}`, source: node.id, target: id });
      frontier.push({ id, level: node.level + 1 });
    }
  }
  return treeLayout(createDocument({ nodes, edges }));
}

/** A directed cycle of `n` nodes (`i → i+1`, last → first). Laid out on a ring. */
export function cycleGraph(n = 4, options: GeneratorOptions = {}): DiagramDocument {
  n = Math.max(2, Math.floor(n)); guard(n);
  const type = options.nodeType ?? 'process';
  const nodes: SemanticGraph['nodes'] = [], edges: DiagramEdge[] = [];
  for (let i = 0; i < n; i++) nodes.push({ id: `n${i}`, type, title: `n${i}` });
  for (let i = 0; i < n; i++) edges.push({ id: `e${i}`, source: `n${i}`, target: `n${(i + 1) % n}` });
  return circularLayout(createDocument({ nodes, edges }));
}

/** A complete graph Kₙ: every pair of nodes joined once (directed i→j for i<j). Laid out on a ring, the
 * canonical way to show Kₙ. Edge count grows as n(n−1)/2, so the node guard bounds it too. */
export function completeGraph(n = 5, options: GeneratorOptions = {}): DiagramDocument {
  n = Math.max(1, Math.floor(n)); guard(n);
  const type = options.nodeType ?? 'process';
  const nodes: SemanticGraph['nodes'] = [], edges: DiagramEdge[] = [];
  for (let i = 0; i < n; i++) nodes.push({ id: `n${i}`, type, title: `n${i}` });
  for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) edges.push({ id: `e${edges.length}`, source: `n${i}`, target: `n${j}` });
  return circularLayout(createDocument({ nodes, edges }));
}

/** A simple directed path of `n` nodes (`0 → 1 → … → n−1`). Laid out as a tidy chain. */
export function pathGraph(n = 4, options: GeneratorOptions = {}): DiagramDocument {
  n = Math.max(1, Math.floor(n)); guard(n);
  const type = options.nodeType ?? 'process';
  const nodes: SemanticGraph['nodes'] = [], edges: DiagramEdge[] = [];
  for (let i = 0; i < n; i++) nodes.push({ id: `n${i}`, type, title: `n${i}` });
  for (let i = 0; i < n - 1; i++) edges.push({ id: `e${i}`, source: `n${i}`, target: `n${i + 1}` });
  return treeLayout(createDocument({ nodes, edges }));
}

/** A star: one hub linked out to `leaves` leaves (`leaves + 1` nodes total). Laid out radially with the hub
 * at the centre. */
export function starGraph(leaves = 5, options: GeneratorOptions = {}): DiagramDocument {
  leaves = Math.max(1, Math.floor(leaves)); guard(leaves + 1);
  const type = options.nodeType ?? 'process';
  const nodes: SemanticGraph['nodes'] = [{ id: 'hub', type, title: 'hub' }], edges: DiagramEdge[] = [];
  for (let i = 0; i < leaves; i++) { nodes.push({ id: `n${i}`, type, title: `n${i}` }); edges.push({ id: `e${i}`, source: 'hub', target: `n${i}` }); }
  return radialLayout(createDocument({ nodes, edges }));
}

/** A wheel Wₙ: an `n`-node directed cycle (the rim) plus a hub linked out to every rim node (`n + 1` nodes).
 * Laid out radially with the hub at the centre. */
export function wheelGraph(rim = 6, options: GeneratorOptions = {}): DiagramDocument {
  rim = Math.max(3, Math.floor(rim)); guard(rim + 1);
  const type = options.nodeType ?? 'process';
  const nodes: SemanticGraph['nodes'] = [{ id: 'hub', type, title: 'hub' }], edges: DiagramEdge[] = [];
  for (let i = 0; i < rim; i++) nodes.push({ id: `n${i}`, type, title: `n${i}` });
  for (let i = 0; i < rim; i++) edges.push({ id: `h${i}`, source: 'hub', target: `n${i}` });
  for (let i = 0; i < rim; i++) edges.push({ id: `r${i}`, source: `n${i}`, target: `n${(i + 1) % rim}` });
  return radialLayout(createDocument({ nodes, edges }));
}

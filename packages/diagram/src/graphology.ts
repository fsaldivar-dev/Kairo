import type { DiagramDocument, DiagramEdge, DiagramLayout, SemanticGraph } from './types';
import { parseDocument } from './document';
import { defaultPorts } from './geometry';
import { layers } from './layout';

/** Graphology interop — the serialized graph shape of [graphology](https://graphology.github.io), the graph
 * library behind Sigma.js and much of the JS graph-viz ecosystem: `{ attributes, options, nodes: [{key,
 * attributes}], edges: [{key?, source, target, attributes}] }`. The distinguishing key is a node's `key` (not
 * `id`). Labels and node x/y (under `attributes`) round-trip. No eval; data stays data. */
export interface GraphologyNode { key: string | number; attributes?: Record<string, unknown> }
export interface GraphologyEdge { key?: string | number; source: string | number; target: string | number; attributes?: Record<string, unknown> }
export interface GraphologyGraph { attributes?: Record<string, unknown>; options?: Record<string, unknown>; nodes: GraphologyNode[]; edges: GraphologyEdge[] }
export interface GraphologyImportOptions { nodeWidth?: number; nodeHeight?: number; gap?: number }

const sanitize = (raw: string): string => raw.replace(/[^A-Za-z0-9_-]/g, '_').slice(0, 120) || 'n';
const num = (v: unknown): number | undefined => { const n = typeof v === 'number' ? v : typeof v === 'string' ? Number(v) : NaN; return Number.isFinite(n) ? n : undefined; };

/** Parses a graphology graph (object or JSON string) into a validated v2 diagram. Uses node `attributes.x`/`y`
 * (centres) when every node has them, otherwise a deterministic layered layout. Edges to undeclared nodes are
 * skipped. Throws when there are no nodes. */
export function fromGraphology(input: string | GraphologyGraph, options: GraphologyImportOptions = {}): DiagramDocument {
  const width = options.nodeWidth ?? 200, height = options.nodeHeight ?? 92, gap = options.gap ?? 64;
  const root = typeof input === 'string' ? JSON.parse(input) as GraphologyGraph : input;
  const rawNodes = Array.isArray(root?.nodes) ? root.nodes : [];
  const rawEdges = Array.isArray(root?.edges) ? root.edges : [];
  const idMap = new Map<string, string>(), used = new Set<string>(), order: string[] = [], titleById = new Map<string, string>();
  const coords = new Map<string, { x: number; y: number }>();
  const ensure = (rawId: string, label?: string): string => {
    const existing = idMap.get(rawId); if (existing) return existing;
    let id = sanitize(rawId), i = 2; while (used.has(id)) id = `${sanitize(rawId)}-${i++}`;
    used.add(id); idMap.set(rawId, id); order.push(id); titleById.set(id, label ?? rawId); return id;
  };
  for (const nd of rawNodes) {
    if (nd == null || nd.key == null) continue;
    const a = nd.attributes ?? {}, id = ensure(String(nd.key), a.label != null ? String(a.label) : undefined);
    const x = num(a.x), y = num(a.y); if (x != null && y != null) coords.set(id, { x, y });
  }
  const edges: DiagramEdge[] = [];
  for (const e of rawEdges) {
    if (e == null || e.source == null || e.target == null) continue;
    const s = idMap.get(String(e.source)), t = idMap.get(String(e.target)); if (!s || !t) continue;
    const label = e.attributes?.label; const lbl = label != null && String(label) ? String(label) : undefined;
    edges.push({ id: `e${edges.length}`, source: s, target: t, ...(lbl ? { label: lbl } : {}) });
  }
  if (!order.length) throw new Error('El grafo graphology no contiene nodos.');
  const nodeLayout: DiagramLayout['nodes'] = Object.create(null);
  if (order.every(id => coords.has(id))) {
    for (const id of order) { const c = coords.get(id)!; nodeLayout[id] = { x: Math.round(c.x - width / 2), y: Math.round(c.y - height / 2), width, height }; }
    let minX = Infinity, minY = Infinity;
    for (const id of order) { minX = Math.min(minX, nodeLayout[id].x); minY = Math.min(minY, nodeLayout[id].y); }
    const offX = Number.isFinite(minX) ? Math.max(0, 80 - minX) : 0, offY = Number.isFinite(minY) ? Math.max(0, 80 - minY) : 0;
    for (const id of order) { nodeLayout[id].x += offX; nodeLayout[id].y += offY; }
  } else {
    const level = layers(order, edges), perLevel = new Map<number, number>();
    for (const id of order) { const depth = level.get(id) ?? 0, slot = perLevel.get(depth) ?? 0; perLevel.set(depth, slot + 1); nodeLayout[id] = { x: slot * (width + gap) + 80, y: depth * (height + gap) + 80, width, height }; }
  }
  const graph: SemanticGraph = { nodes: order.map(id => ({ id, type: 'process', title: titleById.get(id)! })), edges };
  const edgeLayout: DiagramLayout['edges'] = Object.create(null);
  for (const e of edges) edgeLayout[e.id] = defaultPorts(nodeLayout[e.source], nodeLayout[e.target]);
  return parseDocument({ version: 2, graph, layout: { nodes: nodeLayout, edges: edgeLayout } });
}

/** Serializes a document to a graphology graph: nodes with `key` and `attributes.label` + centre `x`/`y`, edges
 * with `source`/`target` and `attributes.label`, and `options { type: 'directed' }`. Ready for
 * `graphology.from(data)` / Sigma.js. Pure. */
export function toGraphology(document: DiagramDocument): GraphologyGraph {
  const nodes: GraphologyNode[] = document.graph.nodes.map(n => {
    const b = document.layout.nodes[n.id];
    return { key: n.id, attributes: { label: n.title, ...(b ? { x: Math.round(b.x + b.width / 2), y: Math.round(b.y + b.height / 2) } : {}) } };
  });
  const edges: GraphologyEdge[] = document.graph.edges.map(e => ({ key: e.id, source: e.source, target: e.target, ...(e.label ? { attributes: { label: e.label } } : {}) }));
  return { attributes: {}, options: { type: 'directed', multi: true, allowSelfLoops: true }, nodes, edges };
}

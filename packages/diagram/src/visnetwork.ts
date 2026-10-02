import type { DiagramDocument, DiagramEdge, DiagramLayout, SemanticGraph } from './types';
import { parseDocument } from './document';
import { defaultPorts } from './geometry';
import { layers } from './layout';

/** vis-network (vis.js) interop — the `{ nodes: [{id,label,x,y}], edges: [{from,to,label}] }` shape consumed by
 * the popular vis-network library. Positions (node centres) round-trip when present. No eval; data stays data. */
export interface VisNode { id: string | number; label?: string; x?: number; y?: number }
export interface VisEdge { id?: string | number; from: string | number; to: string | number; label?: string }
export interface VisNetwork { nodes: VisNode[]; edges: VisEdge[] }
export interface VisNetworkImportOptions { nodeWidth?: number; nodeHeight?: number; gap?: number }

const sanitize = (raw: string): string => raw.replace(/[^A-Za-z0-9_-]/g, '_').slice(0, 120) || 'n';
const num = (v: unknown): number | undefined => { const n = typeof v === 'number' ? v : typeof v === 'string' ? Number(v) : NaN; return Number.isFinite(n) ? n : undefined; };

/** Parses a vis-network graph (object or JSON string) into a validated v2 diagram. Uses node x/y (centres) when
 * every node has them, otherwise a deterministic layered layout. */
export function fromVisNetwork(input: string | VisNetwork, options: VisNetworkImportOptions = {}): DiagramDocument {
  const width = options.nodeWidth ?? 200, height = options.nodeHeight ?? 92, gap = options.gap ?? 64;
  const root = typeof input === 'string' ? JSON.parse(input) as VisNetwork : input;
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
    if (nd == null || nd.id == null) continue;
    const rid = String(nd.id), id = ensure(rid, nd.label != null ? String(nd.label) : undefined);
    const x = num(nd.x), y = num(nd.y); if (x != null && y != null) coords.set(id, { x, y });
  }
  const edges: DiagramEdge[] = [];
  for (const e of rawEdges) {
    if (e == null || e.from == null || e.to == null) continue;
    const s = idMap.get(String(e.from)), t = idMap.get(String(e.to));
    if (!s || !t) continue;
    edges.push({ id: `e${edges.length}`, source: s, target: t, ...(e.label != null && String(e.label) ? { label: String(e.label) } : {}) });
  }
  if (!order.length) throw new Error('El grafo vis-network no contiene nodos.');
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

/** Serializes a document to a vis-network graph: nodes with `label` and centre `x`/`y`, edges with `from`/`to`
 * (and `label`). Ready for `new vis.Network(el, data)`. Pure. */
export function toVisNetwork(document: DiagramDocument): VisNetwork {
  const nodes: VisNode[] = document.graph.nodes.map(n => {
    const b = document.layout.nodes[n.id];
    return { id: n.id, label: n.title, ...(b ? { x: Math.round(b.x + b.width / 2), y: Math.round(b.y + b.height / 2) } : {}) };
  });
  const edges: VisEdge[] = document.graph.edges.map(e => ({ id: e.id, from: e.source, to: e.target, ...(e.label ? { label: e.label } : {}) }));
  return { nodes, edges };
}

import type { DiagramDocument, DiagramEdge, DiagramLayout, SemanticGraph } from './types';
import { nodeTypes } from './types';
import { parseDocument } from './document';
import { defaultPorts } from './geometry';
import { layers } from './layout';

/** JGF (JSON Graph Format, jsongraphformat.info) interop — a vendor-neutral JSON graph spec consumed by several
 * graph libraries and tools. A `{ graph: { directed, label, nodes, edges } }` wrapper where `nodes` is an object
 * keyed by id (`{ "a": { label, metadata } }`) and `edges` is an array of `{ source, target, relation, label }`.
 * The multi-graph form `{ graphs: [...] }` is accepted (first graph used). We round-trip structure, titles,
 * edge labels/relations and node type (via `metadata.type`), plus geometry through `metadata.x/y/width/height`.
 * No eval; data stays data. */
export interface JgfNode { label?: string; metadata?: Record<string, unknown>; [k: string]: unknown }
export interface JgfEdge { source?: string; target?: string; relation?: string; label?: string; directed?: boolean; metadata?: Record<string, unknown>; [k: string]: unknown }
export interface JgfGraph { directed?: boolean; label?: string; type?: string; nodes?: Record<string, JgfNode> | JgfNode[]; edges?: JgfEdge[] }
export interface Jgf { graph?: JgfGraph; graphs?: JgfGraph[] }
export interface JgfImportOptions { nodeWidth?: number; nodeHeight?: number; gap?: number }

const sanitize = (raw: string): string => raw.replace(/[^A-Za-z0-9_-]/g, '_').slice(0, 120) || 'n';
const num = (v: unknown): number | undefined => { const n = typeof v === 'number' ? v : typeof v === 'string' ? Number(v) : NaN; return Number.isFinite(n) ? n : undefined; };
const known = new Set<string>(nodeTypes);

/** Parses a JGF document (object or JSON string) into a validated v2 diagram. Uses `metadata.x/y` when every
 * node carries a position, otherwise a deterministic layered layout. Edges to undeclared nodes are skipped. */
export function fromJgf(input: string | Jgf, options: JgfImportOptions = {}): DiagramDocument {
  const width = options.nodeWidth ?? 200, height = options.nodeHeight ?? 92, gap = options.gap ?? 64;
  const root = typeof input === 'string' ? JSON.parse(input) as Jgf : input;
  const g: JgfGraph = root?.graph ?? (Array.isArray(root?.graphs) ? root!.graphs![0] : undefined) ?? {};
  // nodes may be an object keyed by id, or (loosely) an array of { id, label }
  const rawEntries: Array<[string, JgfNode]> = Array.isArray(g.nodes)
    ? g.nodes.map((n, i) => [String((n as { id?: unknown }).id ?? i), n])
    : Object.entries(g.nodes ?? {});
  const rawEdges = Array.isArray(g.edges) ? g.edges : [];
  const idMap = new Map<string, string>(), used = new Set<string>(), order: string[] = [];
  const titleById = new Map<string, string>(), typeById = new Map<string, string>();
  const sizeById = new Map<string, { w: number; h: number }>(), posById = new Map<string, { x: number; y: number }>();
  const ensure = (rawId: string, node?: JgfNode): string => {
    const existing = idMap.get(rawId); if (existing) return existing;
    let id = sanitize(rawId), i = 2; while (used.has(id)) id = `${sanitize(rawId)}-${i++}`;
    used.add(id); idMap.set(rawId, id); order.push(id);
    titleById.set(id, node?.label != null && String(node.label) ? String(node.label) : rawId);
    const meta = node?.metadata ?? {};
    const mt = meta.type; typeById.set(id, typeof mt === 'string' && known.has(mt) ? mt : 'process');
    sizeById.set(id, { w: Math.max(width, Math.round(num(meta.width) ?? 0)), h: Math.max(height, Math.round(num(meta.height) ?? 0)) });
    const x = num(meta.x), y = num(meta.y); if (x != null && y != null) posById.set(id, { x, y });
    return id;
  };
  for (const [rawId, node] of rawEntries) ensure(rawId, node);
  const edges: DiagramEdge[] = [];
  for (const e of rawEdges) {
    if (e == null || e.source == null || e.target == null) continue;
    const s = idMap.get(String(e.source)), t = idMap.get(String(e.target));
    if (!s || !t) continue;
    const label = e.label != null && String(e.label) ? String(e.label) : undefined;
    const relation = e.relation != null && String(e.relation) ? String(e.relation) : undefined;
    edges.push({ id: `e${edges.length}`, source: s, target: t, ...(label ? { label } : {}), ...(relation ? { relation } : {}) });
  }
  if (!order.length) throw new Error('El documento JGF no contiene nodos.');

  const nodeLayout: DiagramLayout['nodes'] = Object.create(null);
  if (order.every(id => posById.has(id))) {
    for (const id of order) { const p = posById.get(id)!, s = sizeById.get(id)!; nodeLayout[id] = { x: Math.round(p.x), y: Math.round(p.y), width: s.w, height: s.h }; }
    let minX = Infinity, minY = Infinity;
    for (const id of order) { minX = Math.min(minX, nodeLayout[id].x); minY = Math.min(minY, nodeLayout[id].y); }
    const offX = Number.isFinite(minX) ? 80 - minX : 0, offY = Number.isFinite(minY) ? 80 - minY : 0;
    for (const id of order) { nodeLayout[id].x += offX; nodeLayout[id].y += offY; }
  } else {
    const level = layers(order, edges), perLevel = new Map<number, number>();
    for (const id of order) { const s = sizeById.get(id)!, depth = level.get(id) ?? 0, slot = perLevel.get(depth) ?? 0; perLevel.set(depth, slot + 1); nodeLayout[id] = { x: slot * (width + gap) + 80, y: depth * (height + gap) + 80, width: s.w, height: s.h }; }
  }
  const graph: SemanticGraph = { nodes: order.map(id => ({ id, type: typeById.get(id)! as SemanticGraph['nodes'][number]['type'], title: titleById.get(id)! })), edges };
  const edgeLayout: DiagramLayout['edges'] = Object.create(null);
  for (const e of edges) edgeLayout[e.id] = defaultPorts(nodeLayout[e.source], nodeLayout[e.target]);
  return parseDocument({ version: 2, graph, layout: { nodes: nodeLayout, edges: edgeLayout } });
}

/** Serializes a document to JGF: `graph.nodes` keyed by id (`{label, metadata:{type,x,y,width,height}}`) and
 * `graph.edges` as `{source, target, relation?, label?}`. Geometry and type travel in `metadata` so a Kairo
 * round-trip is lossless. Pure. */
export function toJgf(document: DiagramDocument): Jgf {
  const nodes: Record<string, JgfNode> = {};
  for (const n of document.graph.nodes) {
    const b = document.layout.nodes[n.id];
    nodes[n.id] = { label: n.title, metadata: { type: n.type, ...(b ? { x: b.x, y: b.y, width: b.width, height: b.height } : {}) } };
  }
  const edges: JgfEdge[] = document.graph.edges.map(e => ({ source: e.source, target: e.target, directed: true, ...(e.relation ? { relation: e.relation } : {}), ...(e.label ? { label: e.label } : {}) }));
  return { graph: { directed: true, label: 'Kairo', nodes, edges } };
}

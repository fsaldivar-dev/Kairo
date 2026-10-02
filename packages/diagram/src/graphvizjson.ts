import type { DiagramDocument, DiagramEdge, DiagramLayout, SemanticGraph } from './types';
import { parseDocument } from './document';
import { defaultPorts } from './geometry';
import { layers } from './layout';

/** Graphviz JSON interop (import) — the `dot -Tjson` / `neato -Tjson` output shape: a graph with an `objects`
 * array (nodes and subgraphs, each with a `_gvid`) and an `edges` array whose `tail`/`head` reference those
 * `_gvid`s. Its value over the DOT-text importer is that it carries the **computed layout**: Graphviz's own
 * engines (dot/neato/fdp/sfdp/twopi) place the nodes and we keep those positions. `pos` is "x,y" in points with
 * a bottom-left origin (y grows up), so y is flipped; `width`/`height` are inches → points. Pure, no eval. */
export interface GraphvizJsonObject { _gvid?: number; name?: string; label?: string; pos?: string; width?: string | number; height?: string | number; nodes?: unknown[]; subgraphs?: unknown[]; [k: string]: unknown }
export interface GraphvizJsonEdge { tail?: number | string; head?: number | string; label?: string; [k: string]: unknown }
export interface GraphvizJson { directed?: boolean; objects?: GraphvizJsonObject[]; edges?: GraphvizJsonEdge[]; [k: string]: unknown }
export interface GraphvizJsonImportOptions { scale?: number; minWidth?: number; minHeight?: number; gap?: number }

const sanitize = (raw: string): string => raw.replace(/[^A-Za-z0-9_-]/g, '_').slice(0, 120) || 'n';
const parsePos = (pos?: string): { x: number; y: number } | null => {
  if (!pos) return null;
  const m = /^\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)/.exec(pos); // ignore any spline/'!' suffix
  return m ? { x: +m[1], y: +m[2] } : null;
};
const inchesToPt = (v: string | number | undefined): number | null => {
  const n = typeof v === 'number' ? v : typeof v === 'string' ? Number(v) : NaN;
  return Number.isFinite(n) ? n * 72 : null;
};
const isSubgraph = (o: GraphvizJsonObject): boolean => Array.isArray(o.nodes) || Array.isArray(o.subgraphs);

/** Parses Graphviz JSON (object or JSON string) into a validated v2 diagram, preserving Graphviz's layout when
 * every node carries a `pos`; otherwise it falls back to a deterministic layered layout. Subgraph/cluster
 * objects are skipped as nodes (their geometry isn't a node). Throws when no node objects are present. */
export function fromGraphvizJson(input: string | GraphvizJson, options: GraphvizJsonImportOptions = {}): DiagramDocument {
  const scale = options.scale ?? 1.5, minWidth = options.minWidth ?? 200, minHeight = options.minHeight ?? 92, gap = options.gap ?? 64;
  const root = typeof input === 'string' ? JSON.parse(input) as GraphvizJson : input;
  const rawObjects = Array.isArray(root?.objects) ? root.objects : [];
  const rawEdges = Array.isArray(root?.edges) ? root.edges : [];
  const byGvid = new Map<number, GraphvizJsonObject>();
  rawObjects.forEach((o, i) => { if (o && typeof o === 'object') byGvid.set(typeof o._gvid === 'number' ? o._gvid : i, o); });

  const used = new Set<string>(), order: string[] = [], gvidToId = new Map<number, string>();
  const titleById = new Map<string, string>(), sizeById = new Map<string, { w: number; h: number }>(), centerById = new Map<string, { x: number; y: number }>();
  const ensure = (gvid: number, o: GraphvizJsonObject): string => {
    const existing = gvidToId.get(gvid); if (existing) return existing;
    const base = sanitize(String(o.name ?? `n${gvid}`)); let id = base, i = 2; while (used.has(id)) id = `${base}-${i++}`;
    used.add(id); gvidToId.set(gvid, id); order.push(id);
    titleById.set(id, o.label != null && String(o.label) ? String(o.label) : String(o.name ?? id));
    const w = inchesToPt(o.width), h = inchesToPt(o.height);
    sizeById.set(id, { w: Math.max(minWidth, Math.round(w ?? 0)), h: Math.max(minHeight, Math.round(h ?? 0)) });
    const p = parsePos(o.pos); if (p) centerById.set(id, { x: p.x * scale, y: -p.y * scale }); // flip y (graphviz is y-up)
    return id;
  };
  for (const [gvid, o] of byGvid) if (!isSubgraph(o)) ensure(gvid, o);

  const edges: DiagramEdge[] = [];
  for (const e of rawEdges) {
    if (e == null) continue;
    const tail = typeof e.tail === 'number' ? e.tail : Number(e.tail), head = typeof e.head === 'number' ? e.head : Number(e.head);
    const ot = byGvid.get(tail), oh = byGvid.get(head);
    if (!ot || !oh || isSubgraph(ot) || isSubgraph(oh)) continue;
    const s = gvidToId.get(tail), t = gvidToId.get(head);
    if (!s || !t) continue;
    edges.push({ id: `e${edges.length}`, source: s, target: t, ...(e.label != null && String(e.label) ? { label: String(e.label) } : {}) });
  }
  if (!order.length) throw new Error('El JSON de Graphviz no contiene nodos.');

  const nodeLayout: DiagramLayout['nodes'] = Object.create(null);
  if (order.every(id => centerById.has(id))) {
    for (const id of order) { const c = centerById.get(id)!, s = sizeById.get(id)!; nodeLayout[id] = { x: Math.round(c.x - s.w / 2), y: Math.round(c.y - s.h / 2), width: s.w, height: s.h }; }
    let minX = Infinity, minY = Infinity;
    for (const id of order) { minX = Math.min(minX, nodeLayout[id].x); minY = Math.min(minY, nodeLayout[id].y); }
    const offX = Number.isFinite(minX) ? 80 - minX : 0, offY = Number.isFinite(minY) ? 80 - minY : 0;
    for (const id of order) { nodeLayout[id].x += offX; nodeLayout[id].y += offY; }
  } else {
    const level = layers(order, edges), perLevel = new Map<number, number>();
    for (const id of order) { const s = sizeById.get(id)!, depth = level.get(id) ?? 0, slot = perLevel.get(depth) ?? 0; perLevel.set(depth, slot + 1); nodeLayout[id] = { x: slot * (minWidth + gap) + 80, y: depth * (minHeight + gap) + 80, width: s.w, height: s.h }; }
  }
  const graph: SemanticGraph = { nodes: order.map(id => ({ id, type: 'process', title: titleById.get(id)! })), edges };
  const edgeLayout: DiagramLayout['edges'] = Object.create(null);
  for (const e of edges) edgeLayout[e.id] = defaultPorts(nodeLayout[e.source], nodeLayout[e.target]);
  return parseDocument({ version: 2, graph, layout: { nodes: nodeLayout, edges: edgeLayout } });
}

import type { DiagramDocument, DiagramEdge, DiagramLayout, SemanticGraph } from './types';
import { parseDocument } from './document';
import { defaultPorts } from './geometry';
import { layers } from './layout';

/** ELK JSON interop — the Eclipse Layout Kernel graph format (`{id, children:[{id,width,height,x?,y?,labels}],
 * edges:[{id,sources:[],targets:[],labels}]}`) used by elkjs, Mermaid's ELK renderer, Eclipse Sprotty and many
 * web diagram tools. Nodes live under `children`, edges reference them via `sources`/`targets` arrays, and
 * labels are `[{text}]`. ELK `x`/`y` are the node's top-left in px (we use the same convention), so layout
 * round-trips when present. No eval; data stays data. */
export interface ElkLabel { text?: string; [k: string]: unknown }
export interface ElkNode { id: string; width?: number; height?: number; x?: number; y?: number; labels?: ElkLabel[]; [k: string]: unknown }
export interface ElkEdge { id?: string; sources?: string[]; targets?: string[]; source?: string; target?: string; labels?: ElkLabel[]; [k: string]: unknown }
export interface ElkGraph { id?: string; children?: ElkNode[]; edges?: ElkEdge[]; [k: string]: unknown }
export interface ElkImportOptions { minWidth?: number; minHeight?: number; gap?: number }

const sanitize = (raw: string): string => raw.replace(/[^A-Za-z0-9_-]/g, '_').slice(0, 120) || 'n';
const num = (v: unknown): number | undefined => { const n = typeof v === 'number' ? v : typeof v === 'string' ? Number(v) : NaN; return Number.isFinite(n) ? n : undefined; };
const labelText = (labels?: ElkLabel[]): string | undefined => { const t = labels?.find(l => l && l.text != null && String(l.text))?.text; return t != null ? String(t) : undefined; };

/** Parses an ELK graph (object or JSON string) into a validated v2 diagram. Uses ELK's `x`/`y`/`width`/`height`
 * when every node carries a position, otherwise a deterministic layered layout. Edges to undeclared nodes are
 * skipped; the first entry of `sources`/`targets` (or `source`/`target`) is used. */
export function fromElk(input: string | ElkGraph, options: ElkImportOptions = {}): DiagramDocument {
  const minWidth = options.minWidth ?? 200, minHeight = options.minHeight ?? 92, gap = options.gap ?? 64;
  const root = typeof input === 'string' ? JSON.parse(input) as ElkGraph : input;
  const rawNodes = Array.isArray(root?.children) ? root.children : [];
  const rawEdges = Array.isArray(root?.edges) ? root.edges : [];
  const idMap = new Map<string, string>(), used = new Set<string>(), order: string[] = [];
  const titleById = new Map<string, string>(), sizeById = new Map<string, { w: number; h: number }>(), posById = new Map<string, { x: number; y: number }>();
  const ensure = (rawId: string, node?: ElkNode): string => {
    const existing = idMap.get(rawId); if (existing) return existing;
    let id = sanitize(rawId), i = 2; while (used.has(id)) id = `${sanitize(rawId)}-${i++}`;
    used.add(id); idMap.set(rawId, id); order.push(id);
    titleById.set(id, labelText(node?.labels) ?? rawId);
    const w = num(node?.width), h = num(node?.height);
    sizeById.set(id, { w: Math.max(minWidth, Math.round(w ?? 0)), h: Math.max(minHeight, Math.round(h ?? 0)) });
    const x = num(node?.x), y = num(node?.y); if (x != null && y != null) posById.set(id, { x, y });
    return id;
  };
  for (const nd of rawNodes) { if (nd == null || nd.id == null) continue; ensure(String(nd.id), nd); }
  const endpoint = (arr?: string[], single?: string): string | undefined => (Array.isArray(arr) && arr.length ? String(arr[0]) : single != null ? String(single) : undefined);
  const edges: DiagramEdge[] = [];
  for (const e of rawEdges) {
    if (e == null) continue;
    const srcRaw = endpoint(e.sources, e.source), tgtRaw = endpoint(e.targets, e.target);
    if (srcRaw == null || tgtRaw == null) continue;
    const s = idMap.get(srcRaw), t = idMap.get(tgtRaw);
    if (!s || !t) continue;
    const label = labelText(e.labels);
    edges.push({ id: `e${edges.length}`, source: s, target: t, ...(label ? { label } : {}) });
  }
  if (!order.length) throw new Error('El grafo ELK no contiene nodos.');

  const nodeLayout: DiagramLayout['nodes'] = Object.create(null);
  if (order.every(id => posById.has(id))) {
    for (const id of order) { const p = posById.get(id)!, s = sizeById.get(id)!; nodeLayout[id] = { x: Math.round(p.x), y: Math.round(p.y), width: s.w, height: s.h }; }
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

/** Serializes a document to an ELK graph: `children` with `id`, `width`/`height`, top-left `x`/`y` and a single
 * `labels:[{text}]`, and `edges` with `sources`/`targets` arrays (ELK's shape) plus edge labels. Ready to feed to
 * `elk.layout(graph)` or render with Mermaid's ELK layout. Pure. */
export function toElk(document: DiagramDocument): ElkGraph {
  const children: ElkNode[] = document.graph.nodes.map(n => {
    const b = document.layout.nodes[n.id];
    return { id: n.id, ...(b ? { width: b.width, height: b.height, x: b.x, y: b.y } : {}), labels: [{ text: n.title }] };
  });
  const edges: ElkEdge[] = document.graph.edges.map(e => ({ id: e.id, sources: [e.source], targets: [e.target], ...(e.label ? { labels: [{ text: e.label }] } : {}) }));
  return { id: 'root', children, edges };
}

import type { DiagramDocument, DiagramEdge, DiagramLayout, NodeType, SemanticGraph } from './types';
import { parseDocument } from './document';
import { defaultPorts } from './geometry';
import { layers } from './layout';

/** Cytoscape.js / Cytoscape interop. Accepts the common `{ elements: { nodes, edges } }`, a flat
 * `{ elements: [...] }`, or a bare element array. Positions (node centers) are used when present. */
export interface CytoscapeImportOptions { nodeWidth?: number; nodeHeight?: number; gap?: number }
export interface CyElement { data: Record<string, unknown>; position?: { x: number; y: number } }
export interface CytoscapeGraph { elements: { nodes: CyElement[]; edges: CyElement[] } }

const sanitize = (raw: string): string => raw.replace(/[^A-Za-z0-9_-]/g, '_').slice(0, 120) || 'n';
const str = (v: unknown): string | undefined => (typeof v === 'string' && v ? v : typeof v === 'number' ? String(v) : undefined);

/** Parses a Cytoscape graph (object or JSON string) into a validated v2 document. */
export function fromCytoscape(input: string | CytoscapeGraph | { elements: CyElement[] } | CyElement[], options: CytoscapeImportOptions = {}): DiagramDocument {
  const width = options.nodeWidth ?? 200, height = options.nodeHeight ?? 92, gap = options.gap ?? 64;
  const root = typeof input === 'string' ? JSON.parse(input) : input;
  const raw = Array.isArray(root) ? root : (root.elements ?? root);
  const elements: CyElement[] = Array.isArray(raw) ? raw : [...(raw.nodes ?? []), ...(raw.edges ?? [])];

  const numData = (v: unknown): number | undefined => { const n = typeof v === 'number' ? v : typeof v === 'string' ? Number(v) : NaN; return Number.isFinite(n) ? n : undefined; };
  const nodes = new Map<string, { id: string; title: string; type: NodeType; x?: number; y?: number; w?: number; h?: number; group?: string }>();
  const order: string[] = [], edges: DiagramEdge[] = [];
  const ensure = (rawId: string, title?: string, pos?: { x: number; y: number }, size?: { w?: number; h?: number }): string => {
    const id = sanitize(rawId);
    let node = nodes.get(id);
    if (!node) { node = { id, title: title ?? rawId, type: 'process', x: pos?.x, y: pos?.y, w: size?.w, h: size?.h }; nodes.set(id, node); order.push(id); }
    else if (title && node.title === rawId) node.title = title;
    return id;
  };
  const nodeEls = elements.filter(el => el && typeof el === 'object' && el.data && !(str(el.data.source) && str(el.data.target)));
  const parentRefs = new Set(nodeEls.map(el => str(el.data.parent)).filter((v): v is string => !!v));
  const labelOf = (id: string): string => { const el = nodeEls.find(e => str(e.data.id) === id); return el ? (str(el.data.label) ?? str(el.data.name) ?? id) : id; };
  for (const el of elements) {
    if (!el || typeof el !== 'object' || !el.data) continue;
    const d = el.data, source = str(d.source), target = str(d.target);
    if (source && target) {
      const s = ensure(source), t = ensure(target), label = str(d.label);
      edges.push({ id: `e-${edges.length}`, source: s, target: t, ...(label ? { label } : {}) });
    } else {
      const id = str(d.id); if (!id || parentRefs.has(id)) continue; // compound parent = group container, not a node
      const sid = ensure(id, str(d.label) ?? str(d.name), el.position, { w: numData(d.width), h: numData(d.height) });
      const parent = str(d.parent);
      if (parent) nodes.get(sid)!.group = labelOf(parent);
    }
  }
  // A second pass links edges whose endpoints were declared only as edges (rare) — endpoints already ensured above.
  if (!order.length) throw new Error('El grafo Cytoscape no contiene nodos.');

  const hasPos = order.every(id => nodes.get(id)!.x !== undefined && nodes.get(id)!.y !== undefined);
  const nodeLayout: DiagramLayout['nodes'] = Object.create(null);
  if (hasPos) {
    for (const id of order) { const n = nodes.get(id)!; const w = Math.max(n.w ?? width, 140), h = Math.max(n.h ?? height, 76); nodeLayout[id] = { x: n.x! - w / 2, y: n.y! - h / 2, width: w, height: h }; }
  } else {
    const level = layers(order, edges), perLevel = new Map<number, number>();
    for (const id of order) { const depth = level.get(id) ?? 0, slot = perLevel.get(depth) ?? 0; perLevel.set(depth, slot + 1); nodeLayout[id] = { x: slot * (width + gap) + 80, y: depth * (height + gap) + 80, width, height }; }
  }
  // Normalize any negative coordinates from raw positions.
  let minX = Infinity, minY = Infinity;
  for (const id of order) { minX = Math.min(minX, nodeLayout[id].x); minY = Math.min(minY, nodeLayout[id].y); }
  const offX = Number.isFinite(minX) ? Math.max(0, 80 - minX) : 0, offY = Number.isFinite(minY) ? Math.max(0, 80 - minY) : 0;
  for (const id of order) { nodeLayout[id].x = Math.round(nodeLayout[id].x + offX); nodeLayout[id].y = Math.round(nodeLayout[id].y + offY); }

  const graph: SemanticGraph = { nodes: order.map(id => { const n = nodes.get(id)!; return { id: n.id, type: n.type, title: n.title, ...(n.group ? { group: n.group } : {}) }; }), edges };
  const edgeLayout: DiagramLayout['edges'] = Object.create(null);
  for (const e of edges) edgeLayout[e.id] = defaultPorts(nodeLayout[e.source], nodeLayout[e.target]);
  return parseDocument({ version: 2, graph, layout: { nodes: nodeLayout, edges: edgeLayout } });
}

/** Serializes a document to a Cytoscape graph `{ elements: { nodes, edges } }` with node centers as positions. */
export function toCytoscape(document: DiagramDocument): CytoscapeGraph {
  // Groups become Cytoscape compound parent nodes; members reference them via data.parent.
  const groupId = new Map<string, string>();
  let gi = 0;
  const parents: CyElement[] = [];
  for (const node of document.graph.nodes) if (node.group && !groupId.has(node.group)) { const id = `group-${gi++}`; groupId.set(node.group, id); parents.push({ data: { id, label: node.group } }); }
  const nodes: CyElement[] = document.graph.nodes.map(n => {
    const b = document.layout.nodes[n.id];
    return { data: { id: n.id, label: n.title, ...(n.group ? { parent: groupId.get(n.group)! } : {}), ...(b ? { width: Math.round(b.width), height: Math.round(b.height) } : {}) }, ...(b ? { position: { x: Math.round(b.x + b.width / 2), y: Math.round(b.y + b.height / 2) } } : {}) };
  });
  const edges: CyElement[] = document.graph.edges.map(e => ({ data: { id: e.id, source: e.source, target: e.target, ...(e.label ? { label: e.label } : {}) } }));
  return { elements: { nodes: [...parents, ...nodes], edges } };
}

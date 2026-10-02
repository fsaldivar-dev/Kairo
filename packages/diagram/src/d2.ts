import type { DiagramDocument, DiagramEdge, DiagramLayout, NodeShape, NodeType, SemanticGraph } from './types';
import { parseDocument } from './document';
import { defaultPorts } from './geometry';
import { layers } from './layout';

/** D2 (terrastruct.com/d2) interop — a practical subset of the text language, alongside Mermaid/DOT/PlantUML.
 * Nodes, directed edges with labels, shapes and single-level containers (↔ Kairo groups). No eval. */
export interface D2ImportOptions { nodeWidth?: number; nodeHeight?: number; gap?: number }

const SHAPE_TO_D2: Partial<Record<NodeShape, string>> = { cylinder: 'cylinder', document: 'page', parallelogram: 'parallelogram', hexagon: 'hexagon', rectangle: 'rectangle', diamond: 'diamond', ellipse: 'oval', pill: 'oval' };
const D2_TO_SHAPE: Record<string, NodeShape> = { parallelogram: 'parallelogram', hexagon: 'hexagon', rectangle: 'rectangle', square: 'rectangle', page: 'document', diamond: 'diamond', oval: 'ellipse', circle: 'ellipse', cylinder: 'cylinder', stored_data: 'ellipse' };
const sanitize = (raw: string): string => raw.replace(/[^A-Za-z0-9_-]/g, '_').slice(0, 120) || 'n';
const needQuote = (s: string): boolean => !/^[A-Za-z0-9_-]+$/.test(s);
const q = (s: string): string => needQuote(s) ? `"${s.replace(/"/g, '\\"')}"` : s;
const unquote = (s: string): string => { const t = s.trim(); return t.startsWith('"') && t.endsWith('"') ? t.slice(1, -1).replace(/\\"/g, '"') : t; };

/** Serializes a document to D2. Groups become containers; members are declared inside and referenced by
 * dotted path in connections. Re-importable with parseD2. */
export function toD2(document: DiagramDocument): string {
  const lines: string[] = [];
  const decl = (node: DiagramDocument['graph']['nodes'][number], indent: string): string => {
    const shape = document.layout.nodes[node.id]?.shape;
    const d2shape = shape && shape !== 'rectangle' ? SHAPE_TO_D2[shape] : undefined;
    let line = `${indent}${q(node.id)}`;
    if (node.title !== node.id) line += `: ${q(node.title)}`;
    if (d2shape) line += ` { shape: ${d2shape} }`;
    return line;
  };
  const byGroup = new Map<string, DiagramDocument['graph']['nodes']>();
  for (const node of document.graph.nodes) (byGroup.get(node.group ?? '') ?? byGroup.set(node.group ?? '', []).get(node.group ?? '')!).push(node);
  for (const node of byGroup.get('') ?? []) lines.push(decl(node, ''));
  for (const [group, members] of byGroup) {
    if (!group) continue;
    lines.push(`${q(group)}: {`);
    for (const node of members) lines.push(decl(node, '  '));
    lines.push('}');
  }
  const path = (id: string): string => { const n = document.graph.nodes.find(x => x.id === id); return n && n.group ? `${q(n.group)}.${q(id)}` : q(id); };
  for (const edge of document.graph.edges) lines.push(`${path(edge.source)} -> ${path(edge.target)}${edge.label ? `: ${q(edge.label)}` : ''}`);
  return lines.join('\n');
}

/** Parses D2 text into a validated v2 document with a deterministic layered layout. Containers map to groups;
 * dotted connection endpoints resolve to their last segment (ids are unique in Kairo's model). */
export function parseD2(text: string, options: D2ImportOptions = {}): DiagramDocument {
  const width = options.nodeWidth ?? 200, height = options.nodeHeight ?? 92, gap = options.gap ?? 64;
  const clean = text.replace(/\/\*[\s\S]*?\*\//g, '');
  const nodes = new Map<string, { id: string; title: string; type: NodeType; shape?: NodeShape; group?: string }>();
  const order: string[] = [], edges: DiagramEdge[] = [];
  const stack: string[] = [];
  const ensure = (localId: string, title?: string, group?: string): string => {
    const id = sanitize(localId);
    let node = nodes.get(id);
    if (!node) { node = { id, title: title ?? localId, type: 'process', ...(group ? { group } : {}) }; nodes.set(id, node); order.push(id); }
    else { if (title && node.title === node.id) node.title = title; if (group && !node.group) node.group = group; }
    return id;
  };
  const resolve = (token: string): string => {
    const segs = token.split('.').map(s => unquote(s.trim())).filter(Boolean);
    const local = segs[segs.length - 1] ?? token;
    return ensure(local, undefined, segs.length > 1 ? segs[segs.length - 2] : undefined);
  };
  for (const raw of clean.split('\n')) {
    let line = raw.replace(/#.*$/, '').trim();
    if (!line) continue;
    if (line === '}') { stack.pop(); continue; }
    // Container open: `name: {` or `name {` (nothing after the brace, and not a connection).
    const open = /^(.+?)\s*:?\s*\{$/.exec(line);
    if (open && !/->|<->|--/.test(line)) { stack.push(unquote(open[1].trim())); continue; }
    // Attribute line: `id.shape: diamond`.
    const attr = /^(.+?)\.(shape|label)\s*:\s*(.+?)\s*$/.exec(line);
    if (attr && !/->|<->/.test(line)) {
      const id = ensure(unquote(attr[1].trim()), undefined, stack[stack.length - 1]);
      if (attr[2] === 'shape') { const sh = D2_TO_SHAPE[unquote(attr[3]).toLowerCase()]; if (sh) { nodes.get(id)!.shape = sh; nodes.get(id)!.type = sh === 'diamond' ? 'decision' : nodes.get(id)!.type; } }
      else nodes.get(id)!.title = unquote(attr[3]);
      continue;
    }
    if (/->|<->|--/.test(line)) {
      const endpoints = line.split(/\s*<->\s*|\s*->\s*|\s*--\s*/);
      const lastRaw = endpoints[endpoints.length - 1];
      const lm = /^([^:]+?)(?::\s*(.+))?$/.exec(lastRaw);
      const label = lm && lm[2] ? unquote(lm[2].trim()) : undefined;
      if (lm) endpoints[endpoints.length - 1] = lm[1].trim();
      const ids = endpoints.map(resolve);
      for (let i = 0; i < ids.length - 1; i++) edges.push({ id: `e-${edges.length}`, source: ids[i], target: ids[i + 1], ...(label ? { label } : {}) });
      continue;
    }
    // Node declaration: `id`, `id: Label`, or `id: Label { shape: X }`.
    const m = /^([^:{}]+?)(?::\s*([^{}]+?))?(?:\s*\{([^}]*)\})?\s*$/.exec(line);
    if (!m) continue;
    const id = ensure(unquote(m[1].trim()), m[2] ? unquote(m[2].trim()) : undefined, stack[stack.length - 1]);
    if (m[3]) { const sm = /shape\s*:\s*([A-Za-z_]+)/.exec(m[3]); if (sm) { const sh = D2_TO_SHAPE[sm[1].toLowerCase()]; if (sh) { nodes.get(id)!.shape = sh; if (sh === 'diamond') nodes.get(id)!.type = 'decision'; } } }
  }
  if (!order.length) throw new Error('El texto D2 no contiene nodos.');
  const level = layers(order, edges), perLevel = new Map<number, number>();
  const nodeLayout: DiagramLayout['nodes'] = Object.create(null);
  for (const id of order) {
    const depth = level.get(id) ?? 0, slot = perLevel.get(depth) ?? 0; perLevel.set(depth, slot + 1);
    const node = nodes.get(id)!;
    nodeLayout[id] = { x: slot * (width + gap) + 80, y: depth * (height + gap) + 80, width, height, ...(node.shape ? { shape: node.shape } : {}) };
  }
  const graph: SemanticGraph = { nodes: order.map(id => { const n = nodes.get(id)!; return { id: n.id, type: n.type, title: n.title, ...(n.group ? { group: n.group } : {}) }; }), edges };
  const edgeLayout: DiagramLayout['edges'] = Object.create(null);
  for (const e of edges) edgeLayout[e.id] = defaultPorts(nodeLayout[e.source], nodeLayout[e.target]);
  return parseDocument({ version: 2, graph, layout: { nodes: nodeLayout, edges: edgeLayout }, profile: 'flow' });
}

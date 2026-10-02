import type { DiagramDocument, DiagramEdge, DiagramLayout, SemanticGraph } from './types';
import { parseDocument } from './document';
import { defaultPorts } from './geometry';
import { layers } from './layout';

/** OPML interop — the XML outline format (opml.org) that OmniOutliner, WorkFlowy, Dynalist, mind-mapping apps
 * and RSS readers import/export. A `<body>` of nested `<outline text="…">` elements maps to a tree: each
 * outline is a node and nesting becomes a parent→child edge. Export walks a spanning forest from the roots so
 * any diagram produces valid OPML. Regex/stack parse, dependency-free, no XML entity expansion (no XXE). */
export interface OpmlImportOptions { nodeWidth?: number; nodeHeight?: number; gap?: number }

const sanitize = (raw: string): string => raw.replace(/[^A-Za-z0-9_-]/g, '_').slice(0, 120) || 'n';
const decode = (s: string): string => s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(+d)).replace(/&amp;/g, '&');
const encode = (s: string): string => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const attr = (tag: string, name: string): string | undefined => {
  const m = new RegExp(`\\b${name}\\s*=\\s*"([^"]*)"`, 'i').exec(tag) ?? new RegExp(`\\b${name}\\s*=\\s*'([^']*)'`, 'i').exec(tag);
  return m ? decode(m[1]) : undefined;
};

/** Parses an OPML document into a validated v2 diagram (layered layout). Outline nesting becomes parent→child
 * edges; a node's `text` (or `title`) attribute is its title. Throws when the body has no outlines. */
export function fromOpml(text: string, options: OpmlImportOptions = {}): DiagramDocument {
  const width = options.nodeWidth ?? 200, height = options.nodeHeight ?? 92, gap = options.gap ?? 64;
  const body = /<body\b[^>]*>([\s\S]*?)<\/body>/i.exec(text)?.[1] ?? text;
  const used = new Set<string>(), order: string[] = [], titleById = new Map<string, string>();
  const edges: DiagramEdge[] = [];
  const stack: string[] = []; // ids of currently-open outline ancestors
  const make = (tag: string): string => {
    const label = attr(tag, 'text') ?? attr(tag, 'title') ?? 'outline';
    let id = sanitize(label), i = 2; while (used.has(id)) id = `${sanitize(label)}-${i++}`;
    used.add(id); order.push(id); titleById.set(id, label);
    const parent = stack[stack.length - 1];
    if (parent) edges.push({ id: `e${edges.length}`, source: parent, target: id });
    return id;
  };
  // Walk <outline …>, <outline …/> and </outline> in document order, maintaining the ancestor stack.
  const token = /<outline\b([^>]*?)(\/?)>|<\/outline\s*>/gi;
  for (let m = token.exec(body); m; m = token.exec(body)) {
    if (m[0].startsWith('</')) { stack.pop(); continue; }
    const id = make(m[1]);
    if (m[2] !== '/') stack.push(id); // not self-closing -> may have children
  }
  if (!order.length) throw new Error('El documento OPML no contiene outlines.');
  const level = layers(order, edges), perLevel = new Map<number, number>();
  const nodeLayout: DiagramLayout['nodes'] = Object.create(null);
  for (const id of order) {
    const depth = level.get(id) ?? 0, slot = perLevel.get(depth) ?? 0; perLevel.set(depth, slot + 1);
    nodeLayout[id] = { x: slot * (width + gap) + 80, y: depth * (height + gap) + 80, width, height };
  }
  const graph: SemanticGraph = { nodes: order.map(id => ({ id, type: 'process', title: titleById.get(id)! })), edges };
  const edgeLayout: DiagramLayout['edges'] = Object.create(null);
  for (const e of edges) edgeLayout[e.id] = defaultPorts(nodeLayout[e.source], nodeLayout[e.target]);
  return parseDocument({ version: 2, profile: 'hierarchy', graph, layout: { nodes: nodeLayout, edges: edgeLayout } });
}

export interface OpmlExportOptions { title?: string }
/** Serializes a document to OPML 2.0 by walking a spanning forest from the roots (nodes with no incoming edge;
 * the first node if none): each node becomes a nested `<outline text="…">`, children following its outgoing
 * edges. Each node is emitted once (first parent wins); nodes unreached from the roots trail as extra top-level
 * outlines. Ready for OmniOutliner / WorkFlowy / Dynalist. Pure. */
export function toOpml(document: DiagramDocument, options: OpmlExportOptions = {}): string {
  const g = document.graph, title = new Map(g.nodes.map(n => [n.id, n.title]));
  const children = new Map<string, string[]>(g.nodes.map(n => [n.id, []]));
  const indeg = new Map<string, number>(g.nodes.map(n => [n.id, 0]));
  for (const e of g.edges) { if (e.source === e.target) continue; children.get(e.source)?.push(e.target); indeg.set(e.target, (indeg.get(e.target) ?? 0) + 1); }
  const roots = g.nodes.filter(n => (indeg.get(n.id) ?? 0) === 0).map(n => n.id);
  const starts = roots.length ? roots : g.nodes.slice(0, 1).map(n => n.id);
  const visited = new Set<string>();
  const out: string[] = ['<?xml version="1.0" encoding="utf-8"?>', '<opml version="2.0">', `  <head><title>${encode(options.title ?? 'Kairo')}</title></head>`, '  <body>'];
  const emit = (id: string, indent: string): void => {
    visited.add(id);
    const kids = (children.get(id) ?? []).filter(c => !visited.has(c));
    const label = encode(title.get(id) ?? id);
    if (!kids.length) { out.push(`${indent}<outline text="${label}"/>`); return; }
    out.push(`${indent}<outline text="${label}">`);
    for (const c of kids) emit(c, indent + '  ');
    out.push(`${indent}</outline>`);
  };
  for (const r of starts) if (!visited.has(r)) emit(r, '    ');
  for (const n of g.nodes) if (!visited.has(n.id)) emit(n.id, '    '); // any nodes the roots didn't reach
  out.push('  </body>', '</opml>');
  return out.join('\n') + '\n';
}

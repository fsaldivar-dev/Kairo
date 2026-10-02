import type { DiagramDocument, DiagramEdge, DiagramLayout, SemanticGraph } from './types';
import { parseDocument } from './document';
import { defaultPorts } from './geometry';
import { layers } from './layout';

/** Plain indented-outline interop: turn any bulleted/indented text (notes, TODO lists, docs) into a tree
 * diagram and back. Indentation (spaces or tabs) sets the hierarchy; a leading bullet (`-`, `*`, `•`, `1.`)
 * is stripped from the title. No eval. */
export interface OutlineImportOptions { nodeWidth?: number; nodeHeight?: number; gap?: number; tabWidth?: number }

const sanitize = (raw: string): string => raw.replace(/[^A-Za-z0-9_-]/g, '_').slice(0, 60) || 'n';
const indentWidth = (line: string, tab: number): number => { let w = 0; for (const c of line) { if (c === ' ') w++; else if (c === '\t') w += tab; else break; } return w; };
const stripBullet = (s: string): string => s.replace(/^\s*(?:[-*+•]|\d+[.)])\s+/, '').trim();

/** Parses an indented outline into a validated v2 tree document (deterministic layered layout). */
export function parseOutline(text: string, options: OutlineImportOptions = {}): DiagramDocument {
  const width = options.nodeWidth ?? 200, height = options.nodeHeight ?? 92, gap = options.gap ?? 48, tab = options.tabWidth ?? 2;
  const nodes = new Map<string, { id: string; title: string }>(), order: string[] = [], edges: DiagramEdge[] = [];
  const used = new Set<string>();
  const stack: { indent: number; id: string }[] = [];
  for (const raw of text.split('\n')) {
    if (!raw.trim()) continue;
    const indent = indentWidth(raw, tab), title = stripBullet(raw) || raw.trim();
    let id = sanitize(title); let i = 2; while (used.has(id)) id = `${sanitize(title)}-${i++}`;
    used.add(id); nodes.set(id, { id, title }); order.push(id);
    while (stack.length && stack[stack.length - 1].indent >= indent) stack.pop();
    const parent = stack[stack.length - 1];
    if (parent) edges.push({ id: `e-${edges.length}`, source: parent.id, target: id });
    stack.push({ indent, id });
  }
  if (!order.length) throw new Error('El esquema no contiene líneas.');
  const level = layers(order, edges), perLevel = new Map<number, number>();
  const nodeLayout: DiagramLayout['nodes'] = Object.create(null);
  for (const id of order) {
    const depth = level.get(id) ?? 0, slot = perLevel.get(depth) ?? 0; perLevel.set(depth, slot + 1);
    nodeLayout[id] = { x: slot * (width + gap) + 80, y: depth * (height + gap) + 80, width, height };
  }
  const graph: SemanticGraph = { nodes: order.map(id => ({ id, type: 'process', title: nodes.get(id)!.title })), edges };
  const edgeLayout: DiagramLayout['edges'] = Object.create(null);
  for (const e of edges) edgeLayout[e.id] = defaultPorts(nodeLayout[e.source], nodeLayout[e.target]);
  return parseDocument({ version: 2, graph, layout: { nodes: nodeLayout, edges: edgeLayout }, profile: 'hierarchy' });
}

export interface OutlineExportOptions { indent?: string; bullet?: string }
/** Serializes a document's tree structure to an indented outline (DFS from roots). Nodes with several parents
 * appear once (under the first). Re-importable with parseOutline for tree-shaped diagrams. */
export function toOutline(document: DiagramDocument, options: OutlineExportOptions = {}): string {
  const indent = options.indent ?? '  ', bullet = options.bullet ?? '- ';
  const title = new Map(document.graph.nodes.map(n => [n.id, n.title]));
  const children = new Map<string, string[]>(document.graph.nodes.map(n => [n.id, []]));
  const indeg = new Map<string, number>(document.graph.nodes.map(n => [n.id, 0]));
  for (const e of document.graph.edges) { if (e.source === e.target || !children.has(e.source) || !children.has(e.target)) continue; children.get(e.source)!.push(e.target); indeg.set(e.target, (indeg.get(e.target) ?? 0) + 1); }
  const roots = document.graph.nodes.map(n => n.id).filter(id => (indeg.get(id) ?? 0) === 0);
  const lines: string[] = [], seen = new Set<string>();
  const walk = (id: string, depth: number): void => {
    if (seen.has(id)) return; seen.add(id);
    lines.push(indent.repeat(depth) + bullet + (title.get(id) ?? id));
    for (const c of children.get(id) ?? []) walk(c, depth + 1);
  };
  for (const r of (roots.length ? roots : document.graph.nodes.map(n => n.id))) walk(r, 0);
  for (const n of document.graph.nodes) if (!seen.has(n.id)) walk(n.id, 0); // nodes only in cycles
  return lines.join('\n');
}

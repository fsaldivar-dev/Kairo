import type { DiagramDocument, DiagramEdge, DiagramLayout, SemanticGraph } from './types';
import { parseDocument } from './document';
import { defaultPorts } from './geometry';
import { layers } from './layout';

/** Turns hierarchical JSON (org charts, file trees, nested API data) into a tree diagram: each object is
 * a node, its `children` array its child nodes. No eval; values stay data. */
export interface JsonTreeOptions {
  /** Field holding the child array (default `children`). */
  children?: string;
  /** Label field, or a function returning the label. Default tries name/label/title/id/type, else the value. */
  label?: string | ((value: unknown) => string);
  nodeWidth?: number; nodeHeight?: number; gap?: number;
}
const MAX_NODES = 2000, MAX_DEPTH = 64;

/** Parses nested JSON (object/array or JSON string) into a validated v2 tree document with a layered layout. */
export function fromJson(data: unknown, options: JsonTreeOptions = {}): DiagramDocument {
  const width = options.nodeWidth ?? 200, height = options.nodeHeight ?? 92, gap = options.gap ?? 64;
  const childrenKey = options.children ?? 'children';
  const root = typeof data === 'string' ? JSON.parse(data) : data;
  const labelOf = (v: unknown): string => {
    if (typeof options.label === 'function') return String(options.label(v));
    if (v && typeof v === 'object') {
      if (options.label) return String((v as Record<string, unknown>)[options.label] ?? '');
      const o = v as Record<string, unknown>;
      return String(o.name ?? o.label ?? o.title ?? o.id ?? o.type ?? 'nodo');
    }
    return String(v);
  };
  const nodes: { id: string; title: string }[] = [], edges: DiagramEdge[] = [], used = new Set<string>();
  const addNode = (title: string): string => {
    const base = (title || 'nodo').replace(/[^A-Za-z0-9_-]/g, '_').slice(0, 80) || 'n';
    let id = base, i = 2; while (used.has(id)) id = `${base}-${i++}`;
    used.add(id); nodes.push({ id, title: title || 'nodo' }); return id;
  };
  const walk = (value: unknown, parentId: string | null, depth: number): void => {
    if (nodes.length >= MAX_NODES || depth > MAX_DEPTH) return;
    const id = addNode(labelOf(value));
    if (parentId) edges.push({ id: `e-${edges.length}`, source: parentId, target: id });
    const kids = value && typeof value === 'object' ? (value as Record<string, unknown>)[childrenKey] : undefined;
    if (Array.isArray(kids)) for (const child of kids) walk(child, id, depth + 1);
  };
  if (Array.isArray(root)) for (const item of root) walk(item, null, 0);
  else walk(root, null, 0);
  if (!nodes.length) throw new Error('El JSON no produjo ningún nodo.');

  const order = nodes.map(n => n.id);
  const level = layers(order, edges), perLevel = new Map<number, number>();
  const nodeLayout: DiagramLayout['nodes'] = Object.create(null);
  for (const n of nodes) {
    const depth = level.get(n.id) ?? 0, slot = perLevel.get(depth) ?? 0; perLevel.set(depth, slot + 1);
    nodeLayout[n.id] = { x: slot * (width + gap) + 80, y: depth * (height + gap) + 80, width, height };
  }
  const graph: SemanticGraph = { nodes: nodes.map(n => ({ id: n.id, type: 'process' as const, title: n.title })), edges };
  const edgeLayout: DiagramLayout['edges'] = Object.create(null);
  for (const e of edges) edgeLayout[e.id] = defaultPorts(nodeLayout[e.source], nodeLayout[e.target]);
  return parseDocument({ version: 2, profile: 'hierarchy', graph, layout: { nodes: nodeLayout, edges: edgeLayout } });
}

export interface HierarchyNode { id: string; name: string; children?: HierarchyNode[] }
export interface ToHierarchyOptions { rootName?: string }
/** Exports a document as nested `{ id, name, children }` JSON — the `d3.hierarchy` shape consumed by d3.tree,
 * d3.treemap, d3.pack and sunburst/collapsible-tree charts (the inverse of {@link fromJson}). Walks a spanning
 * forest from the roots (nodes with no incoming edge; the first node if none), emitting each node once (first
 * parent wins) and its children along outgoing edges. Multiple roots are wrapped under a single synthetic root
 * so the result is always one tree (what d3.hierarchy requires). Cycles are broken by the visited set. Pure. */
export function toHierarchy(document: DiagramDocument, options: ToHierarchyOptions = {}): HierarchyNode {
  const g = document.graph, title = new Map(g.nodes.map(n => [n.id, n.title]));
  const children = new Map<string, string[]>(g.nodes.map(n => [n.id, []]));
  const indeg = new Map<string, number>(g.nodes.map(n => [n.id, 0]));
  for (const e of g.edges) { if (e.source === e.target) continue; children.get(e.source)?.push(e.target); indeg.set(e.target, (indeg.get(e.target) ?? 0) + 1); }
  const roots = g.nodes.filter(n => (indeg.get(n.id) ?? 0) === 0).map(n => n.id);
  const starts = roots.length ? roots : g.nodes.slice(0, 1).map(n => n.id);
  const visited = new Set<string>();
  const build = (id: string): HierarchyNode => {
    visited.add(id);
    const kids = (children.get(id) ?? []).filter(c => !visited.has(c)).map(build);
    return { id, name: title.get(id) ?? id, ...(kids.length ? { children: kids } : {}) };
  };
  const trees = starts.filter(id => !visited.has(id)).map(build);
  return trees.length === 1 ? trees[0] : { id: '__root__', name: options.rootName ?? 'root', children: trees };
}

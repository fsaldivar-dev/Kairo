import type { DiagramDocument, DiagramEdge, DiagramLayout, SemanticGraph } from './types';
import { parseDocument } from './document';
import { defaultPorts } from './geometry';
import { layers } from './layout';

/** Node-link JSON interop — the `{ directed, nodes: [{id,label}], links: [{source,target}] }` shape produced by
 * Python NetworkX (`json_graph.node_link_data`) and consumed by D3 force-directed graphs. The distinguishing key
 * is `links` (not `edges`). No eval; data stays data. */
export interface NodeLinkNode { id: string | number; label?: string; [k: string]: unknown }
export interface NodeLinkEdge { source: string | number; target: string | number; label?: string; [k: string]: unknown }
export interface NodeLinkGraph { directed?: boolean; multigraph?: boolean; graph?: Record<string, unknown>; nodes: NodeLinkNode[]; links: NodeLinkEdge[] }
export interface NodeLinkImportOptions { nodeWidth?: number; nodeHeight?: number; gap?: number }

const sanitize = (raw: string): string => raw.replace(/[^A-Za-z0-9_-]/g, '_').slice(0, 120) || 'n';

/** Parses a node-link graph (object or JSON string) into a validated v2 diagram with a layered layout. */
export function fromNodeLink(input: string | NodeLinkGraph, options: NodeLinkImportOptions = {}): DiagramDocument {
  const width = options.nodeWidth ?? 200, height = options.nodeHeight ?? 92, gap = options.gap ?? 64;
  const root = typeof input === 'string' ? JSON.parse(input) as NodeLinkGraph : input;
  const rawNodes = Array.isArray(root?.nodes) ? root.nodes : [];
  const rawLinks = Array.isArray(root?.links) ? root.links : [];
  const idMap = new Map<string, string>(), used = new Set<string>(), order: string[] = [], titleById = new Map<string, string>();
  const ensure = (rawId: string, label?: string): string => {
    const existing = idMap.get(rawId); if (existing) return existing;
    let id = sanitize(rawId), i = 2; while (used.has(id)) id = `${sanitize(rawId)}-${i++}`;
    used.add(id); idMap.set(rawId, id); order.push(id); titleById.set(id, label ?? rawId); return id;
  };
  for (const nd of rawNodes) { if (nd == null || nd.id == null) continue; const lbl = nd.label ?? nd.name; ensure(String(nd.id), lbl != null ? String(lbl) : undefined); }
  const edges: DiagramEdge[] = [];
  for (const e of rawLinks) {
    if (e == null || e.source == null || e.target == null) continue;
    const s = idMap.get(String(e.source)) ?? ensure(String(e.source)), t = idMap.get(String(e.target)) ?? ensure(String(e.target));
    edges.push({ id: `e${edges.length}`, source: s, target: t, ...(e.label != null && String(e.label) ? { label: String(e.label) } : {}) });
  }
  if (!order.length) throw new Error('El grafo node-link no contiene nodos.');
  const level = layers(order, edges), perLevel = new Map<number, number>();
  const nodeLayout: DiagramLayout['nodes'] = Object.create(null);
  for (const id of order) {
    const depth = level.get(id) ?? 0, slot = perLevel.get(depth) ?? 0; perLevel.set(depth, slot + 1);
    nodeLayout[id] = { x: slot * (width + gap) + 80, y: depth * (height + gap) + 80, width, height };
  }
  const graph: SemanticGraph = { nodes: order.map(id => ({ id, type: 'process', title: titleById.get(id)! })), edges };
  const edgeLayout: DiagramLayout['edges'] = Object.create(null);
  for (const e of edges) edgeLayout[e.id] = defaultPorts(nodeLayout[e.source], nodeLayout[e.target]);
  return parseDocument({ version: 2, graph, layout: { nodes: nodeLayout, edges: edgeLayout } });
}

/** Serializes a document to node-link JSON (`directed`, `nodes` with id/label, `links` with source/target/label).
 * Ready for `networkx.json_graph.node_link_graph(data)` or a D3 force layout. Pure. */
export function toNodeLink(document: DiagramDocument): NodeLinkGraph {
  return {
    directed: true, multigraph: false, graph: {},
    nodes: document.graph.nodes.map(n => ({ id: n.id, label: n.title })),
    links: document.graph.edges.map(e => ({ source: e.source, target: e.target, ...(e.label ? { label: e.label } : {}) })),
  };
}

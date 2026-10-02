import type { ConnectionIssue, ConnectionPolicy, DiagramDocument, DiagramEdge, DiagramNode, EdgeEndpoints, EdgeLayout, NodeLayout, Selection, SemanticGraph } from './types';
import { parseDocument } from './document';
import { defaultPorts } from './geometry';

export interface ConnectionContext { ignoreEdge?: string; canConnect?: (source: DiagramNode, target: DiagramNode) => boolean }
export type OperationResult = DiagramDocument | ConnectionIssue;

/** Nodes reachable from `from` following edge direction (`out`) or against it (`in`). Includes `from`. Iterative: safe for deep graphs. */
export function reachable(graph: SemanticGraph, from: string, direction: 'out' | 'in' = 'out', ignoreEdge?: string): Set<string> {
  const next = new Map<string, string[]>();
  for (const edge of graph.edges) {
    if (edge.id === ignoreEdge) continue;
    const [a, b] = direction === 'out' ? [edge.source, edge.target] : [edge.target, edge.source];
    const list = next.get(a); if (list) list.push(b); else next.set(a, [b]);
  }
  const reached = new Set([from]), pending = [from];
  while (pending.length) for (const id of next.get(pending.pop()!) ?? []) if (!reached.has(id)) { reached.add(id); pending.push(id); }
  return reached;
}
/** Pure policy check. `ignoreEdge` excludes the edge being edited so reconnecting or reversing it does not collide with itself. */
export function checkConnection(document: DiagramDocument, source: string, target: string, policy: ConnectionPolicy = {}, context: ConnectionContext = {}): ConnectionIssue | null {
  const graph = document.graph, a = graph.nodes.find(n => n.id === source), b = graph.nodes.find(n => n.id === target);
  if (!a || !b) return 'missing-node';
  if (source === target && !policy.allowSelfLoops) return 'self-loop';
  if (!policy.allowMultipleEdges && graph.edges.some(e => e.id !== context.ignoreEdge && e.source === source && e.target === target)) return 'duplicate';
  if (policy.allowCycles === false && (source === target || reachable(graph, target, 'out', context.ignoreEdge).has(source))) return 'cycle';
  if (context.canConnect && !context.canConnect(a, b)) return 'rejected';
  return null;
}
/** Every operation returns a new validated document or the issue that rejected it; the input is never modified. */
export function connectNodes(document: DiagramDocument, id: string, source: string, target: string, layout?: EdgeLayout, policy?: ConnectionPolicy, context?: ConnectionContext): OperationResult {
  const issue = checkConnection(document, source, target, policy, context);
  if (issue) return issue;
  const next = structuredClone(document);
  next.graph.edges.push({ id, source, target });
  next.layout.edges[id] = layout ?? defaultPorts(next.layout.nodes[source], next.layout.nodes[target]);
  return parseDocument(next);
}
export function reconnectEdge(document: DiagramDocument, id: string, patch: EdgeEndpoints, policy?: ConnectionPolicy, context: ConnectionContext = {}): OperationResult {
  const edge = document.graph.edges.find(e => e.id === id);
  if (!edge) return 'missing-edge';
  const source = patch.source ?? edge.source, target = patch.target ?? edge.target;
  const issue = checkConnection(document, source, target, policy, { ...context, ignoreEdge: id });
  if (issue) return issue;
  const next = structuredClone(document), copy = next.graph.edges.find(e => e.id === id)!, route = next.layout.edges[id];
  const fallback = defaultPorts(next.layout.nodes[source], next.layout.nodes[target]);
  copy.source = source; copy.target = target;
  route.sourcePort = patch.sourcePort ?? (source === edge.source ? route.sourcePort : fallback.sourcePort);
  route.targetPort = patch.targetPort ?? (target === edge.target ? route.targetPort : fallback.targetPort);
  return parseDocument(next);
}
/** Swaps endpoints and ports so the line keeps its place; markers stay bound to source/target roles, so the arrowhead moves to the new target. */
export function reverseEdge(document: DiagramDocument, id: string, policy?: ConnectionPolicy, context?: ConnectionContext): OperationResult {
  const edge = document.graph.edges.find(e => e.id === id), route = document.layout.edges[id];
  if (!edge || !route) return 'missing-edge';
  return reconnectEdge(document, id, { source: edge.target, target: edge.source, sourcePort: route.targetPort, targetPort: route.sourcePort }, policy, context);
}
/** Clones a node (semantic data + layout) at an offset with a fresh id. Incident edges are not copied. Returns 'missing-node' if absent. */
export function duplicateNode(document: DiagramDocument, id: string, newId: string, offset: { x: number; y: number } = { x: 32, y: 32 }): OperationResult {
  const node = document.graph.nodes.find(n => n.id === id), box = document.layout.nodes[id];
  if (!node || !box) return 'missing-node';
  const next = structuredClone(document);
  next.graph.nodes.push({ ...structuredClone(node), id: newId });
  next.layout.nodes[newId] = { ...structuredClone(box), x: box.x + offset.x, y: box.y + offset.y };
  return parseDocument(next);
}
export function removeElement(document: DiagramDocument, selection: NonNullable<Selection>): DiagramDocument {
  const next = structuredClone(document);
  if (selection.kind === 'node') { next.graph.nodes = next.graph.nodes.filter(n => n.id !== selection.id); delete next.layout.nodes[selection.id]; }
  next.graph.edges = next.graph.edges.filter(e => {
    const remove = selection.kind === 'edge' ? e.id === selection.id : e.source === selection.id || e.target === selection.id;
    if (remove) delete next.layout.edges[e.id];
    return !remove;
  });
  return next;
}


/** A portable fragment: selected nodes and the edges whose both endpoints are included. Pure data, safe to serialize. */
export interface Clipboard { nodes: DiagramNode[]; edges: DiagramEdge[]; layout: { nodes: Record<string, NodeLayout>; edges: Record<string, EdgeLayout> } }
/** Copies the given nodes and only their internal edges (both endpoints selected). Deep-cloned; the document is untouched. */
export function extractSelection(document: DiagramDocument, nodeIds: Iterable<string>): Clipboard {
  const ids = new Set([...nodeIds].filter(id => document.layout.nodes[id]));
  const nodes = document.graph.nodes.filter(n => ids.has(n.id)).map(n => structuredClone(n));
  const edges = document.graph.edges.filter(e => ids.has(e.source) && ids.has(e.target)).map(e => structuredClone(e));
  const layoutNodes: Record<string, NodeLayout> = {}, layoutEdges: Record<string, EdgeLayout> = {};
  for (const id of ids) layoutNodes[id] = structuredClone(document.layout.nodes[id]);
  for (const e of edges) layoutEdges[e.id] = structuredClone(document.layout.edges[e.id]);
  return { nodes, edges, layout: { nodes: layoutNodes, edges: layoutEdges } };
}
/** Pastes a clipboard with fresh ids (remapping internal edges) at an offset. Returns the new document and the created ids, or 'empty'. */
export function pasteClipboard(document: DiagramDocument, clip: Clipboard, makeId: (prefix: 'n' | 'e') => string, offset: { x: number; y: number } = { x: 24, y: 24 }): { document: DiagramDocument; nodeIds: string[]; edgeIds: string[] } | 'empty' {
  if (!clip.nodes.length) return 'empty';
  const next = structuredClone(document), idMap = new Map<string, string>(), nodeIds: string[] = [], edgeIds: string[] = [];
  for (const node of clip.nodes) {
    const id = makeId('n'); idMap.set(node.id, id); nodeIds.push(id);
    next.graph.nodes.push({ ...structuredClone(node), id });
    const box = clip.layout.nodes[node.id];
    next.layout.nodes[id] = { ...structuredClone(box), x: box.x + offset.x, y: box.y + offset.y };
  }
  for (const edge of clip.edges) {
    const id = makeId('e'); edgeIds.push(id);
    next.graph.edges.push({ ...structuredClone(edge), id, source: idMap.get(edge.source)!, target: idMap.get(edge.target)! });
    next.layout.edges[id] = structuredClone(clip.layout.edges[edge.id]);
  }
  return { document: parseDocument(next), nodeIds, edgeIds };
}


export type AlignEdge = 'left' | 'right' | 'top' | 'bottom' | 'center-x' | 'center-y';
/** Aligns the given nodes to a shared edge or axis of their bounding box. Returns null when fewer than two nodes apply. */
export function alignNodes(document: DiagramDocument, ids: Iterable<string>, edge: AlignEdge): DiagramDocument | null {
  const set = [...new Set(ids)].filter(id => document.layout.nodes[id]);
  if (set.length < 2) return null;
  const boxes = set.map(id => document.layout.nodes[id]);
  const minX = Math.min(...boxes.map(b => b.x)), maxR = Math.max(...boxes.map(b => b.x + b.width));
  const minY = Math.min(...boxes.map(b => b.y)), maxB = Math.max(...boxes.map(b => b.y + b.height));
  const cx = (minX + maxR) / 2, cy = (minY + maxB) / 2;
  const next = structuredClone(document);
  for (const id of set) {
    const b = next.layout.nodes[id];
    if (edge === 'left') b.x = minX; else if (edge === 'right') b.x = maxR - b.width;
    else if (edge === 'center-x') b.x = cx - b.width / 2; else if (edge === 'top') b.y = minY;
    else if (edge === 'bottom') b.y = maxB - b.height; else b.y = cy - b.height / 2;
  }
  return parseDocument(next);
}
/** Evenly spaces the node centers between the two extreme nodes on the given axis. Returns null when fewer than three nodes apply. */
export function distributeNodes(document: DiagramDocument, ids: Iterable<string>, axis: 'horizontal' | 'vertical'): DiagramDocument | null {
  const set = [...new Set(ids)].filter(id => document.layout.nodes[id]);
  if (set.length < 3) return null;
  const center = (b: NodeLayout) => axis === 'horizontal' ? b.x + b.width / 2 : b.y + b.height / 2;
  const sorted = set.slice().sort((a, b) => center(document.layout.nodes[a]) - center(document.layout.nodes[b]));
  const first = center(document.layout.nodes[sorted[0]]), last = center(document.layout.nodes[sorted[sorted.length - 1]]);
  const step = (last - first) / (sorted.length - 1);
  const next = structuredClone(document);
  sorted.forEach((id, i) => {
    if (i === 0 || i === sorted.length - 1) return;
    const b = next.layout.nodes[id], target = first + step * i;
    if (axis === 'horizontal') b.x = target - b.width / 2; else b.y = target - b.height / 2;
  });
  return parseDocument(next);
}


/** Case-insensitive search over node title, type, source and tags. Returns matching ids in document order; an empty query matches nothing. */
export function searchNodes(graph: SemanticGraph, query: string): string[] {
  const q = query.trim().toLocaleLowerCase();
  if (!q) return [];
  return graph.nodes.filter(n => {
    const hay = [n.title, n.type, n.source ?? '', ...(n.tags ?? [])].join(' ').toLocaleLowerCase();
    return hay.includes(q);
  }).map(n => n.id);
}

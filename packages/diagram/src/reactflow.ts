import type { DiagramDocument, DiagramLayout, NodeType, Port, SemanticGraph } from './types';
import { parseDocument } from './document';
import { defaultPorts } from './geometry';

/** React Flow (reactflow.dev / @xyflow/react) native JSON interop. Pure; no eval.
 * Lets documents move between Kairo and a React Flow canvas without the React wrapper. */
export interface ReactFlowNode { id: string; type?: string; position: { x: number; y: number }; data?: { label?: string }; width?: number; height?: number; parentId?: string; parentNode?: string; style?: Record<string, unknown>; }
export interface ReactFlowEdge { id: string; source: string; target: string; label?: string; type?: string; sourceHandle?: string | null; targetHandle?: string | null; }
export interface ReactFlowGraph { nodes: ReactFlowNode[]; edges: ReactFlowEdge[]; }

const PORTS: readonly Port[] = ['top', 'right', 'bottom', 'left'];
const asPort = (value: unknown): Port | undefined => PORTS.includes(value as Port) ? value as Port : undefined;
// React Flow built-in node types map to flow roles; everything else is a plain step.
const RF_TYPE_TO_KAIRO: Record<string, NodeType> = { input: 'start', output: 'end' };
const kairoToRfType = (type: NodeType): string | undefined => type === 'start' ? 'input' : type === 'end' ? 'output' : type === 'decision' ? 'default' : undefined;

/** Exports a document to React Flow JSON. Groups become `type:'group'` container nodes with children positioned
 * relative to them via `parentId`, matching React Flow's parent/child convention. Returns a plain object. */
export function toReactFlow(document: DiagramDocument): ReactFlowGraph {
  const byGroup = new Map<string, DiagramDocument['graph']['nodes']>();
  for (const node of document.graph.nodes) if (node.group) (byGroup.get(node.group) ?? byGroup.set(node.group, []).get(node.group)!).push(node);
  const groupId = new Map<string, string>();
  const groupOrigin = new Map<string, { x: number; y: number }>();
  const nodes: ReactFlowNode[] = [];
  let gi = 0;
  for (const [group, members] of byGroup) {
    const b = (id: string) => document.layout.nodes[id];
    const gx = Math.min(...members.map(n => b(n.id).x)) - 16, gy = Math.min(...members.map(n => b(n.id).y)) - 28;
    const gw = Math.max(...members.map(n => b(n.id).x + b(n.id).width)) - gx + 16;
    const gh = Math.max(...members.map(n => b(n.id).y + b(n.id).height)) - gy + 16;
    const id = `group-${gi++}`;
    groupId.set(group, id); groupOrigin.set(group, { x: gx, y: gy });
    nodes.push({ id, type: 'group', position: { x: Math.round(gx), y: Math.round(gy) }, data: { label: group }, width: Math.round(gw), height: Math.round(gh) });
  }
  for (const node of document.graph.nodes) {
    const box = document.layout.nodes[node.id];
    const origin = node.group ? groupOrigin.get(node.group) : undefined;
    const rfType = kairoToRfType(node.type);
    nodes.push({
      id: node.id,
      ...(rfType ? { type: rfType } : {}),
      position: { x: Math.round(box.x - (origin?.x ?? 0)), y: Math.round(box.y - (origin?.y ?? 0)) },
      data: { label: node.source ? `${node.title}\n${node.source}` : node.title },
      width: Math.round(box.width), height: Math.round(box.height),
      ...(node.group && groupId.has(node.group) ? { parentId: groupId.get(node.group) } : {}),
    });
  }
  const edges: ReactFlowEdge[] = document.graph.edges.map(edge => {
    const route = document.layout.edges[edge.id];
    return { id: edge.id, source: edge.source, target: edge.target, ...(edge.label ? { label: edge.label } : {}), sourceHandle: route.sourcePort, targetHandle: route.targetPort };
  });
  return { nodes, edges };
}

/** Imports React Flow JSON into a validated document. `type:'group'` nodes (or any node referenced as a parent)
 * become Kairo groups; child positions are resolved to absolute coordinates. Unknown node types become steps. */
export function fromReactFlow(input: ReactFlowGraph | string): DiagramDocument {
  const value: unknown = typeof input === 'string' ? JSON.parse(input) : input;
  if (!value || typeof value !== 'object' || !Array.isArray((value as ReactFlowGraph).nodes)) throw new Error('React Flow inválido (falta nodes).');
  const graph = value as ReactFlowGraph;
  const rawById = new Map<string, ReactFlowNode>();
  for (const n of graph.nodes) if (n && typeof n.id === 'string') rawById.set(n.id, n);
  const parentOf = (n: ReactFlowNode): string | undefined => n.parentId ?? n.parentNode;
  const referencedParents = new Set<string>();
  for (const n of graph.nodes) { const p = n && parentOf(n); if (p) referencedParents.add(p); }
  const isGroup = (n: ReactFlowNode): boolean => n.type === 'group' || referencedParents.has(n.id);
  const groupLabel = (id: string): string => { const g = rawById.get(id); return (g?.data?.label ?? id).split('\n')[0].trim() || id; };
  // Absolute position = own position + chain of parent positions (React Flow nests coordinates).
  const absolute = (n: ReactFlowNode, seen = new Set<string>()): { x: number; y: number } => {
    const px = Number(n.position?.x) || 0, py = Number(n.position?.y) || 0;
    const parentId = parentOf(n);
    if (!parentId || seen.has(n.id)) return { x: px, y: py };
    seen.add(n.id);
    const parent = rawById.get(parentId);
    if (!parent) return { x: px, y: py };
    const base = absolute(parent, seen);
    return { x: base.x + px, y: base.y + py };
  };
  const nodes: SemanticGraph['nodes'] = [], layoutNodes: DiagramLayout['nodes'] = Object.create(null), ids = new Set<string>();
  for (const n of graph.nodes) {
    if (!n || typeof n.id !== 'string' || ids.has(n.id) || isGroup(n)) continue;
    ids.add(n.id);
    const title = (n.data?.label ?? n.id).split('\n')[0].slice(0, 200) || n.id;
    const pos = absolute(n);
    const width = Math.max(140, Number(n.width) || 200), height = Math.max(76, Number(n.height) || 92);
    const type: NodeType = (n.type ? RF_TYPE_TO_KAIRO[n.type] : undefined) ?? 'process';
    const parentId = parentOf(n);
    const group = parentId && rawById.has(parentId) ? groupLabel(parentId) : undefined;
    nodes.push({ id: n.id, type, title, ...(group ? { group } : {}) });
    layoutNodes[n.id] = { x: pos.x, y: pos.y, width, height };
  }
  const edges: SemanticGraph['edges'] = [], layoutEdges: DiagramLayout['edges'] = Object.create(null);
  for (const e of Array.isArray(graph.edges) ? graph.edges : []) {
    if (!e || typeof e.id !== 'string' || !ids.has(e.source) || !ids.has(e.target) || e.source === e.target) continue;
    const label = typeof e.label === 'string' ? e.label : undefined;
    edges.push({ id: e.id, source: e.source, target: e.target, ...(label ? { label: label.slice(0, 4096) } : {}) });
    const fallback = defaultPorts(layoutNodes[e.source], layoutNodes[e.target]);
    layoutEdges[e.id] = { sourcePort: asPort(e.sourceHandle) ?? fallback.sourcePort, targetPort: asPort(e.targetHandle) ?? fallback.targetPort };
  }
  if (!nodes.length) throw new Error('React Flow sin nodos utilizables.');
  return parseDocument({ version: 2, graph: { nodes, edges }, layout: { nodes: layoutNodes, edges: layoutEdges }, profile: 'flow' });
}

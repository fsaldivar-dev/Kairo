import type { DiagramDocument, DiagramLayout, Port, SemanticGraph } from './types';
import { parseDocument } from './document';
import { defaultPorts } from './geometry';

/** JSON Canvas (jsoncanvas.org, used by Obsidian) interop. Pure; no eval. */
export interface CanvasNode { id: string; type?: string; x: number; y: number; width: number; height: number; text?: string; label?: string; file?: string; }
export interface CanvasEdge { id: string; fromNode: string; toNode: string; fromSide?: string; toSide?: string; label?: string; }
export interface Canvas { nodes: CanvasNode[]; edges: CanvasEdge[]; }

const SIDES: readonly Port[] = ['top', 'right', 'bottom', 'left'];
const asSide = (value: unknown): Port | undefined => SIDES.includes(value as Port) ? value as Port : undefined;

/** Exports a document to JSON Canvas. Nodes become text nodes; ports map to canvas sides. Returns a plain object ready to JSON.stringify. */
export function toCanvas(document: DiagramDocument): Canvas {
  const text: CanvasNode[] = document.graph.nodes.map(node => {
    const box = document.layout.nodes[node.id];
    return { id: node.id, type: 'text', x: Math.round(box.x), y: Math.round(box.y), width: Math.round(box.width), height: Math.round(box.height), text: node.source ? `${node.title}\n${node.source}` : node.title };
  });
  // Groups become native JSON Canvas group boxes (drawn behind, so listed first).
  const byGroup = new Map<string, DiagramDocument['graph']['nodes']>();
  for (const node of document.graph.nodes) if (node.group) (byGroup.get(node.group) ?? byGroup.set(node.group, []).get(node.group)!).push(node);
  const groupNodes: CanvasNode[] = [];
  let gi = 0;
  for (const [group, members] of byGroup) {
    const b = (id: string) => document.layout.nodes[id];
    const gx = Math.min(...members.map(n => b(n.id).x)) - 16, gy = Math.min(...members.map(n => b(n.id).y)) - 28;
    const gw = Math.max(...members.map(n => b(n.id).x + b(n.id).width)) - gx + 16;
    const gh = Math.max(...members.map(n => b(n.id).y + b(n.id).height)) - gy + 16;
    groupNodes.push({ id: `group-${gi++}`, type: 'group', label: group, x: Math.round(gx), y: Math.round(gy), width: Math.round(gw), height: Math.round(gh) });
  }
  const nodes: CanvasNode[] = [...groupNodes, ...text];
  const edges: CanvasEdge[] = document.graph.edges.map(edge => {
    const route = document.layout.edges[edge.id];
    return { id: edge.id, fromNode: edge.source, toNode: edge.target, fromSide: route.sourcePort, toSide: route.targetPort, ...(edge.label ? { label: edge.label } : {}) };
  });
  return { nodes, edges };
}

/** Imports JSON Canvas into a validated document. Text/link/file/group nodes become generic nodes; sizes are clamped to the minimum. */
export function fromCanvas(input: Canvas | string): DiagramDocument {
  const value: unknown = typeof input === 'string' ? JSON.parse(input) : input;
  if (!value || typeof value !== 'object' || !Array.isArray((value as Canvas).nodes)) throw new Error('JSON Canvas inválido (falta nodes).');
  const canvas = value as Canvas;
  const nodes: SemanticGraph['nodes'] = [], layoutNodes: DiagramLayout['nodes'] = Object.create(null), ids = new Set<string>();
  // Group boxes define membership by geometric containment; they are not imported as nodes.
  const groupBoxes = canvas.nodes.filter(n => n && n.type === 'group').map(n => ({ label: (n.label ?? n.text ?? '').split('\n')[0].trim(), x: Number(n.x) || 0, y: Number(n.y) || 0, w: Math.max(1, Number(n.width) || 0), h: Math.max(1, Number(n.height) || 0) })).filter(g => g.label);
  const groupFor = (x: number, y: number, w: number, h: number): string | undefined => {
    let best: { label: string; area: number } | undefined;
    for (const g of groupBoxes) { if (g.x <= x && g.y <= y && x + w <= g.x + g.w && y + h <= g.y + g.h) { const area = g.w * g.h; if (!best || area < best.area) best = { label: g.label, area }; } }
    return best?.label;
  };
  for (const node of canvas.nodes) {
    if (!node || typeof node.id !== 'string' || ids.has(node.id) || node.type === 'group') continue;
    const title = (node.text ?? node.label ?? node.file ?? node.id).split('\n')[0].slice(0, 200) || node.id;
    ids.add(node.id);
    const x = Number(node.x) || 0, y = Number(node.y) || 0, width = Math.max(140, Number(node.width) || 200), height = Math.max(76, Number(node.height) || 92);
    const group = groupFor(x, y, width, height);
    nodes.push({ id: node.id, type: 'generic', title, ...(group ? { group } : {}) });
    layoutNodes[node.id] = { x, y, width, height };
  }
  const edges: SemanticGraph['edges'] = [], layoutEdges: DiagramLayout['edges'] = Object.create(null);
  for (const edge of Array.isArray(canvas.edges) ? canvas.edges : []) {
    if (!edge || typeof edge.id !== 'string' || !ids.has(edge.fromNode) || !ids.has(edge.toNode) || edge.fromNode === edge.toNode) continue;
    edges.push({ id: edge.id, source: edge.fromNode, target: edge.toNode, ...(edge.label ? { label: String(edge.label).slice(0, 4096) } : {}) });
    const fallback = defaultPorts(layoutNodes[edge.fromNode], layoutNodes[edge.toNode]);
    layoutEdges[edge.id] = { sourcePort: asSide(edge.fromSide) ?? fallback.sourcePort, targetPort: asSide(edge.toSide) ?? fallback.targetPort };
  }
  return parseDocument({ version: 2, graph: { nodes, edges }, layout: { nodes: layoutNodes, edges: layoutEdges }, profile: 'architecture' });
}

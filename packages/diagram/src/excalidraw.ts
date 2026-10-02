import type { DiagramDocument, DiagramLayout, NodeShape, SemanticGraph } from './types';
import { parseDocument } from './document';
import { defaultPorts } from './geometry';

/** Excalidraw (.excalidraw) scene interop. Pure; produces/consumes a minimal but loadable scene. */
export interface ExcalidrawElement { id: string; type: string; x: number; y: number; width: number; height: number; [k: string]: unknown }
export interface ExcalidrawScene { type: 'excalidraw'; version: number; source: string; elements: ExcalidrawElement[]; appState: Record<string, unknown>; files: Record<string, unknown> }

const SHAPE_TO_EX: Partial<Record<NodeShape, string>> = { rectangle: 'rectangle', pill: 'rectangle', diamond: 'diamond', ellipse: 'ellipse' };
const EX_TO_SHAPE: Record<string, NodeShape> = { rectangle: 'rectangle', diamond: 'diamond', ellipse: 'ellipse' };
const base = (id: string, type: string, x: number, y: number, width: number, height: number): ExcalidrawElement => ({
  id, type, x, y, width, height, angle: 0, strokeColor: '#1e1e1e', backgroundColor: 'transparent', fillStyle: 'solid',
  strokeWidth: 1, strokeStyle: 'solid', roughness: 1, opacity: 100, groupIds: [], frameId: null,
  roundness: type === 'rectangle' ? { type: 3 } : null, seed: 1, version: 1, versionNonce: 1, isDeleted: false,
  boundElements: [], updated: 1, link: null, locked: false,
});

/** Exports a document to an Excalidraw scene: nodes become shapes with bound text, edges become bound arrows. */
export function toExcalidraw(document: DiagramDocument): ExcalidrawScene {
  const elements: ExcalidrawElement[] = [];
  for (const node of document.graph.nodes) {
    const box = document.layout.nodes[node.id];
    const shape = SHAPE_TO_EX[box.shape ?? 'rectangle'] ?? 'rectangle';
    const el = base(node.id, shape, box.x, box.y, box.width, box.height);
    const textId = `${node.id}-text`;
    el.boundElements = [{ type: 'text', id: textId }];
    elements.push(el);
    elements.push({ ...base(textId, 'text', box.x, box.y, box.width, box.height), text: node.title, originalText: node.title, fontSize: 16, fontFamily: 1, textAlign: 'center', verticalAlign: 'middle', containerId: node.id, lineHeight: 1.25, baseline: 16 });
  }
  for (const edge of document.graph.edges) {
    const a = document.layout.nodes[edge.source], b = document.layout.nodes[edge.target];
    if (!a || !b) continue;
    const ax = a.x + a.width / 2, ay = a.y + a.height / 2, bx = b.x + b.width / 2, by = b.y + b.height / 2;
    elements.push({ ...base(edge.id, 'arrow', ax, ay, Math.abs(bx - ax), Math.abs(by - ay)), points: [[0, 0], [bx - ax, by - ay]], lastCommittedPoint: null, startBinding: { elementId: edge.source, focus: 0, gap: 4 }, endBinding: { elementId: edge.target, focus: 0, gap: 4 }, startArrowhead: null, endArrowhead: 'arrow' });
  }
  return { type: 'excalidraw', version: 2, source: 'https://kairo.dev', elements, appState: { viewBackgroundColor: '#ffffff', gridSize: null }, files: {} };
}

/** Imports an Excalidraw scene: rectangle/ellipse/diamond become nodes (title from bound text), arrows with bindings become edges. */
export function fromExcalidraw(input: ExcalidrawScene | string): DiagramDocument {
  const scene: unknown = typeof input === 'string' ? JSON.parse(input) : input;
  if (!scene || typeof scene !== 'object' || !Array.isArray((scene as ExcalidrawScene).elements)) throw new Error('Escena Excalidraw inválida (falta elements).');
  const els = (scene as ExcalidrawScene).elements.filter(e => e && !e.isDeleted);
  const textByContainer = new Map<string, string>();
  for (const e of els) if (e.type === 'text' && typeof e.containerId === 'string') textByContainer.set(e.containerId, String(e.text ?? ''));
  const nodes: SemanticGraph['nodes'] = [], layoutNodes: DiagramLayout['nodes'] = Object.create(null), ids = new Set<string>();
  for (const e of els) {
    if (!EX_TO_SHAPE[e.type] || typeof e.id !== 'string' || ids.has(e.id)) continue;
    ids.add(e.id);
    const title = (textByContainer.get(e.id) ?? '').split('\n')[0].slice(0, 200) || e.id;
    nodes.push({ id: e.id, type: 'generic', title });
    layoutNodes[e.id] = { x: Number(e.x) || 0, y: Number(e.y) || 0, width: Math.max(140, Number(e.width) || 200), height: Math.max(76, Number(e.height) || 92), shape: EX_TO_SHAPE[e.type] };
  }
  const edges: SemanticGraph['edges'] = [], layoutEdges: DiagramLayout['edges'] = Object.create(null);
  for (const e of els) {
    if (e.type !== 'arrow' || typeof e.id !== 'string') continue;
    const sb = e.startBinding as { elementId?: string } | undefined, eb = e.endBinding as { elementId?: string } | undefined;
    const source = sb?.elementId, target = eb?.elementId;
    if (!source || !target || !ids.has(source) || !ids.has(target) || source === target) continue;
    edges.push({ id: e.id, source, target });
    layoutEdges[e.id] = defaultPorts(layoutNodes[source], layoutNodes[target]);
  }
  return parseDocument({ version: 2, graph: { nodes, edges }, layout: { nodes: layoutNodes, edges: layoutEdges }, profile: 'architecture' });
}

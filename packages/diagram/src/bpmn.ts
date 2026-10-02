import type { DiagramDocument, DiagramEdge, DiagramLayout, NodeType, SemanticGraph } from './types';
import { parseDocument } from './document';
import { defaultPorts } from './geometry';
import { layers } from './layout';

/** BPMN 2.0 interop — the OMG business-process XML consumed by Camunda, bpmn.io/Modeler and other BPM tools.
 * Nodes map to flow elements (start→startEvent, end→endEvent, decision→exclusiveGateway, else task) and edges to
 * `sequenceFlow`. Export also emits BPMNDI (shapes + edge waypoints from the layout) so the file renders directly
 * in bpmn.io. Regex parse, dependency-free, no XML entity expansion (no XXE). */
export interface BpmnImportOptions { nodeWidth?: number; nodeHeight?: number; gap?: number }

const sanitize = (raw: string): string => raw.replace(/[^A-Za-z0-9_-]/g, '_').slice(0, 120) || 'n';
const decode = (s: string): string => s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(+d)).replace(/&amp;/g, '&');
const encode = (s: string): string => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const attr = (tag: string, name: string): string | undefined => {
  const m = new RegExp(`\\b${name}\\s*=\\s*"([^"]*)"`, 'i').exec(tag) ?? new RegExp(`\\b${name}\\s*=\\s*'([^']*)'`, 'i').exec(tag);
  return m ? decode(m[1]) : undefined;
};
const ELEMENT_TYPE: Record<string, NodeType> = {
  startEvent: 'start', endEvent: 'end',
  exclusiveGateway: 'decision', inclusiveGateway: 'decision', parallelGateway: 'decision', eventBasedGateway: 'decision', complexGateway: 'decision',
};
const ELEMENT_RE = 'startEvent|endEvent|task|userTask|serviceTask|scriptTask|manualTask|businessRuleTask|sendTask|receiveTask|subProcess|callActivity|exclusiveGateway|inclusiveGateway|parallelGateway|eventBasedGateway|complexGateway|intermediateThrowEvent|intermediateCatchEvent|boundaryEvent';

/** Parses a BPMN document into a validated v2 diagram. Uses BPMNDI `Bounds` when every flow element has one,
 * otherwise a deterministic layered layout. Throws when there are no flow elements. */
export function fromBpmn(text: string, options: BpmnImportOptions = {}): DiagramDocument {
  const width = options.nodeWidth ?? 200, height = options.nodeHeight ?? 92, gap = options.gap ?? 64;
  const idMap = new Map<string, string>(), used = new Set<string>(), order: string[] = [];
  const titleById = new Map<string, string>(), typeById = new Map<string, NodeType>(), posById = new Map<string, { x: number; y: number; w: number; h: number }>();
  const ensure = (rawId: string, kind: string, name?: string): string => {
    const existing = idMap.get(rawId); if (existing) return existing;
    let id = sanitize(rawId), i = 2; while (used.has(id)) id = `${sanitize(rawId)}-${i++}`;
    used.add(id); idMap.set(rawId, id); order.push(id);
    titleById.set(id, name && name.trim() ? name : rawId); typeById.set(id, ELEMENT_TYPE[kind] ?? 'process');
    return id;
  };
  for (const m of text.matchAll(new RegExp(`<(?:\\w+:)?(${ELEMENT_RE})\\b([^>]*?)/?>`, 'gi'))) {
    const rawId = attr(m[2], 'id'); if (!rawId) continue;
    ensure(rawId, m[1], attr(m[2], 'name'));
  }
  if (!order.length) throw new Error('El documento BPMN no contiene elementos de flujo.');
  const edges: DiagramEdge[] = [];
  for (const m of text.matchAll(/<(?:\w+:)?sequenceFlow\b([^>]*?)\/?>/gi)) {
    const s = attr(m[1], 'sourceRef'), t = attr(m[1], 'targetRef'); if (!s || !t) continue;
    const src = idMap.get(s), tgt = idMap.get(t); if (!src || !tgt) continue;
    const label = attr(m[1], 'name');
    edges.push({ id: `e${edges.length}`, source: src, target: tgt, ...(label && label.trim() ? { label } : {}) });
  }
  // BPMNDI shapes: <BPMNShape bpmnElement="..."><dc:Bounds x y width height/></BPMNShape>
  for (const m of text.matchAll(/<(?:\w+:)?BPMNShape\b([^>]*)>([\s\S]*?)<\/(?:\w+:)?BPMNShape>/gi)) {
    const ref = attr(m[1], 'bpmnElement'); const id = ref ? idMap.get(ref) : undefined; if (!id) continue;
    const b = /<(?:\w+:)?Bounds\b([^>]*?)\/?>/i.exec(m[2]); if (!b) continue;
    const x = Number(attr(b[1], 'x')), y = Number(attr(b[1], 'y')), w = Number(attr(b[1], 'width')), h = Number(attr(b[1], 'height'));
    if (Number.isFinite(x) && Number.isFinite(y)) posById.set(id, { x, y, w: Number.isFinite(w) ? w : width, h: Number.isFinite(h) ? h : height });
  }
  const nodeLayout: DiagramLayout['nodes'] = Object.create(null);
  if (order.every(id => posById.has(id))) {
    for (const id of order) { const p = posById.get(id)!; nodeLayout[id] = { x: Math.round(p.x), y: Math.round(p.y), width: Math.max(width, Math.round(p.w)), height: Math.max(height, Math.round(p.h)) }; }
    let minX = Infinity, minY = Infinity;
    for (const id of order) { minX = Math.min(minX, nodeLayout[id].x); minY = Math.min(minY, nodeLayout[id].y); }
    const offX = Number.isFinite(minX) ? 80 - minX : 0, offY = Number.isFinite(minY) ? 80 - minY : 0;
    for (const id of order) { nodeLayout[id].x += offX; nodeLayout[id].y += offY; }
  } else {
    const level = layers(order, edges), perLevel = new Map<number, number>();
    for (const id of order) { const depth = level.get(id) ?? 0, slot = perLevel.get(depth) ?? 0; perLevel.set(depth, slot + 1); nodeLayout[id] = { x: slot * (width + gap) + 80, y: depth * (height + gap) + 80, width, height }; }
  }
  const graph: SemanticGraph = { nodes: order.map(id => ({ id, type: typeById.get(id)!, title: titleById.get(id)! })), edges };
  const edgeLayout: DiagramLayout['edges'] = Object.create(null);
  for (const e of edges) edgeLayout[e.id] = defaultPorts(nodeLayout[e.source], nodeLayout[e.target]);
  return parseDocument({ version: 2, graph, layout: { nodes: nodeLayout, edges: edgeLayout } });
}

const bpmnElementFor = (type: NodeType): string => type === 'start' ? 'startEvent' : type === 'end' ? 'endEvent' : type === 'decision' ? 'exclusiveGateway' : 'task';
/** Serializes a document to BPMN 2.0 with BPMNDI layout (shapes + edge waypoints), so the result opens and
 * renders in bpmn.io / Camunda Modeler. Node types map to events/gateways/tasks; edges become `sequenceFlow`.
 * Pure. */
export function toBpmn(document: DiagramDocument): string {
  const g = document.graph, L = document.layout;
  const flow = g.nodes.map(n => {
    const el = bpmnElementFor(n.type);
    return `    <bpmn:${el} id="${encode(n.id)}" name="${encode(n.title)}" />`;
  });
  const flows = g.edges.map(e => `    <bpmn:sequenceFlow id="${encode(e.id)}" sourceRef="${encode(e.source)}" targetRef="${encode(e.target)}"${e.label ? ` name="${encode(e.label)}"` : ''} />`);
  const shapes = g.nodes.map(n => {
    const b = L.nodes[n.id]; if (!b) return '';
    return `      <bpmndi:BPMNShape bpmnElement="${encode(n.id)}"><dc:Bounds x="${Math.round(b.x)}" y="${Math.round(b.y)}" width="${Math.round(b.width)}" height="${Math.round(b.height)}" /></bpmndi:BPMNShape>`;
  }).filter(Boolean);
  const center = (id: string) => { const b = L.nodes[id]; return b ? { x: Math.round(b.x + b.width / 2), y: Math.round(b.y + b.height / 2) } : { x: 0, y: 0 }; };
  const diEdges = g.edges.map(e => { const s = center(e.source), t = center(e.target); return `      <bpmndi:BPMNEdge bpmnElement="${encode(e.id)}"><di:waypoint x="${s.x}" y="${s.y}" /><di:waypoint x="${t.x}" y="${t.y}" /></bpmndi:BPMNEdge>`; });
  return `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI" xmlns:dc="http://www.omg.org/spec/DD/20100524/DC" xmlns:di="http://www.omg.org/spec/DD/20100524/DI" id="Definitions_Kairo" targetNamespace="http://kairo">
  <bpmn:process id="Process_1" isExecutable="false">
${flow.join('\n')}
${flows.join('\n')}
  </bpmn:process>
  <bpmndi:BPMNDiagram id="BPMNDiagram_1">
    <bpmndi:BPMNPlane id="BPMNPlane_1" bpmnElement="Process_1">
${shapes.join('\n')}
${diEdges.join('\n')}
    </bpmndi:BPMNPlane>
  </bpmndi:BPMNDiagram>
</bpmn:definitions>
`;
}

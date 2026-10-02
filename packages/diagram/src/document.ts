import { nodeTypes, ports, nodeShapes, arrowMarkers, labelPositions, nodeDefaults } from './types';
import type { DiagramDocument, DiagramLayout, SemanticGraph } from './types';
import { defaultPorts } from './geometry';

/** A deterministic initial placement, deliberately separate from the semantic graph. */
export function createLayout(graph: SemanticGraph): DiagramLayout {
  const nodes = Object.create(null) as DiagramLayout['nodes'];
  const edges = Object.create(null) as DiagramLayout['edges'];
  graph.nodes.forEach((node, i) => { const def = nodeDefaults[node.type] ?? { width: 200, height: 92 }; nodes[node.id] = { x: 80 + i % 3 * 280, y: 80 + Math.floor(i / 3) * 160, width: def.width, height: def.height, ...(def.shape ? { shape: def.shape } : {}) }; });
  for (const edge of graph.edges) if (nodes[edge.source] && nodes[edge.target]) edges[edge.id] = defaultPorts(nodes[edge.source], nodes[edge.target]);
  return { nodes, edges };
}
export function createDocument(graph: SemanticGraph, layout = createLayout(graph), profile?: string): DiagramDocument {
  return parseDocument({ version: 2, graph, layout, ...(profile === undefined ? {} : { profile }) });
}
const object = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const id = (v: unknown): v is string => typeof v === 'string' && v.length > 0 && v.length <= 128 && !['__proto__', 'constructor', 'prototype'].includes(v);
const shortText = (v: unknown): v is string => typeof v === 'string' && v.length <= 4096;
function tags(value: unknown): { tags?: string[] } {
  if (value === undefined) return {};
  if (!Array.isArray(value) || value.length > 32 || !value.every(t => typeof t === 'string' && t.trim().length > 0 && t.length <= 64)) throw new Error('Tags inválidos (máximo 32, 64 caracteres por tag).');
  return { tags: [...new Set(value.map(t => t.trim()))] };
}
/** Validates imports, strips unknown/decorative keys, and returns an owned copy. */
export function parseDocument(input: unknown): DiagramDocument {
  const value: unknown = typeof input === 'string' ? JSON.parse(input) : input;
  if (!object(value) || (value.version !== 1 && value.version !== 2) || !object(value.graph) || !object(value.layout)) throw new Error('Documento de diagrama inválido (version 1 o 2).');
  const graph = value.graph, layout = value.layout;
  if (!Array.isArray(graph.nodes) || !Array.isArray(graph.edges) || !object(layout.nodes) || !object(layout.edges)) throw new Error('Faltan el grafo o el layout.');
  if (graph.nodes.length > 10_000 || graph.edges.length > 30_000) throw new Error('El documento excede el límite de importación.');
  if (value.profile !== undefined && !(typeof value.profile === 'string' && value.profile.length > 0 && value.profile.length <= 64)) throw new Error('Perfil de documento inválido.');
  const nodeIds = new Set<string>(), edgeIds = new Set<string>();
  const nodes: SemanticGraph['nodes'] = [], edges: SemanticGraph['edges'] = [];
  const nodeLayout = Object.create(null) as DiagramLayout['nodes'], edgeLayout = Object.create(null) as DiagramLayout['edges'];
  for (const n of graph.nodes) {
    if (!object(n) || !id(n.id) || nodeIds.has(n.id) || !shortText(n.title) || !nodeTypes.includes(n.type as never) || (n.source !== undefined && !shortText(n.source))) throw new Error('Nodo inválido o identificador duplicado.');
    if (n.group !== undefined && !(typeof n.group === 'string' && n.group.trim().length > 0 && n.group.length <= 64)) throw new Error('Grupo de nodo inválido.');
    if (n.lane !== undefined && !(typeof n.lane === 'string' && n.lane.trim().length > 0 && n.lane.length <= 64)) throw new Error('Carril de nodo inválido.');
    const box = layout.nodes[n.id];
    if (!object(box) || !['x', 'y', 'width', 'height'].every(k => typeof box[k] === 'number' && Number.isFinite(box[k]) && Math.abs(box[k] as number) <= 1_000_000) || (box.width as number) < 140 || (box.height as number) < 76) throw new Error(`Layout inválido: ${n.id}`);
    if (box.shape !== undefined && !nodeShapes.includes(box.shape as never)) throw new Error('Forma inválida.');
    nodeIds.add(n.id);
    nodes.push({ ...tags(n.tags), id: n.id, type: n.type as typeof nodeTypes[number], title: n.title, ...(n.source === undefined ? {} : { source: n.source as string }), ...(n.group === undefined ? {} : { group: n.group as string }), ...(n.lane === undefined ? {} : { lane: n.lane as string }) });
    nodeLayout[n.id] = { x: box.x as number, y: box.y as number, width: box.width as number, height: box.height as number, ...(box.shape === undefined ? {} : { shape: box.shape as typeof nodeShapes[number] }) };
  }
  for (const e of graph.edges) {
    if (!object(e) || !id(e.id) || edgeIds.has(e.id) || !id(e.source) || !id(e.target) || !nodeIds.has(e.source) || !nodeIds.has(e.target) || (e.label !== undefined && !shortText(e.label))) throw new Error('Conexión inválida.');
    const route = layout.edges[e.id];
    if (!object(route) || !ports.includes(route.sourcePort as never) || !ports.includes(route.targetPort as never)) throw new Error(`Puertos inválidos: ${e.id}`);
    for (const field of ['relation', 'condition']) if (e[field] !== undefined && !shortText(e[field])) throw new Error('Metadatos de relación inválidos.');
    for (const field of ['startMarker', 'endMarker']) if (route[field] !== undefined && !arrowMarkers.includes(route[field] as never)) throw new Error('Flecha inválida.');
    if (route.dashed !== undefined && typeof route.dashed !== 'boolean') throw new Error('Estilo de línea inválido.');
    if (route.labelPosition !== undefined && !labelPositions.includes(route.labelPosition as never)) throw new Error('Posición de etiqueta inválida.');
    if (route.labelOffset !== undefined && !(typeof route.labelOffset === 'number' && Number.isFinite(route.labelOffset) && Math.abs(route.labelOffset as number) <= 400)) throw new Error('Desplazamiento de etiqueta inválido.');
    edgeIds.add(e.id);
    edges.push({ ...tags(e.tags), ...(e.relation === undefined ? {} : { relation: e.relation as string }), ...(e.condition === undefined ? {} : { condition: e.condition as string }), id: e.id, source: e.source, target: e.target, ...(e.label === undefined ? {} : { label: e.label as string }) });
    edgeLayout[e.id] = { sourcePort: route.sourcePort as typeof ports[number], targetPort: route.targetPort as typeof ports[number], ...(route.startMarker === undefined ? {} : { startMarker: route.startMarker as typeof arrowMarkers[number] }), ...(route.endMarker === undefined ? {} : { endMarker: route.endMarker as typeof arrowMarkers[number] }), ...(route.dashed === undefined ? {} : { dashed: route.dashed as boolean }), ...(route.labelPosition === undefined ? {} : { labelPosition: route.labelPosition as typeof labelPositions[number] }), ...(route.labelOffset === undefined ? {} : { labelOffset: route.labelOffset as number }) };
  }
  return { version: 2, graph: { nodes, edges }, layout: { nodes: nodeLayout, edges: edgeLayout }, ...(value.profile === undefined ? {} : { profile: value.profile as string }) };
}

/** Non-throwing variant of parseDocument: returns `{ ok: true, document }` or `{ ok: false, error }`.
 * Convenient for importing untrusted input without try/catch. */
export function safeParseDocument(input: unknown): { ok: true; document: DiagramDocument } | { ok: false; error: string } {
  try { return { ok: true, document: parseDocument(input) }; }
  catch (e) { return { ok: false, error: e instanceof Error ? e.message : String(e) }; }
}

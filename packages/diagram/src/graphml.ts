import type { DiagramDocument, DiagramEdge, DiagramLayout, NodeShape, NodeType, SemanticGraph } from './types';
import { parseDocument } from './document';
import { defaultPorts } from './geometry';
import { layers } from './layout';

/** GraphML interop (yEd, Gephi, Cytoscape, draw.io). A practical subset: nodes, directed edges and
 * their labels via `<data>` keys, with a best-effort fallback to yEd `<y:NodeLabel>` text. No eval. */
export interface GraphmlImportOptions { nodeWidth?: number; nodeHeight?: number; gap?: number }
export interface GraphmlExportOptions { /** Emit node ids instead of titles as the GraphML id (default false: ids are kept, titles go in the label). */ useTitlesAsIds?: boolean }

const sanitize = (raw: string): string => raw.replace(/[^A-Za-z0-9_-]/g, '_').slice(0, 120) || 'n';
const decode = (s: string): string => s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(+d)).replace(/&amp;/g, '&');
const encode = (s: string): string => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const attr = (text: string, name: string): string | undefined => { const m = new RegExp(`\\b${name}\\s*=\\s*"([^"]*)"`).exec(text); return m ? decode(m[1]) : undefined; };
const NODE_LABEL_KEYS = new Set(['label', 'name', 'title', 'description', 'descripcion']);

/** Parses a GraphML document into a validated v2 diagram with a deterministic layered layout. */
export function fromGraphml(xml: string, options: GraphmlImportOptions = {}): DiagramDocument {
  const width = options.nodeWidth ?? 200, height = options.nodeHeight ?? 92, gap = options.gap ?? 64;
  const clean = xml.replace(/<!--[\s\S]*?-->/g, '');

  // Map <key> declarations so we know which data key carries the node/edge label.
  let nodeLabelKey: string | undefined, edgeLabelKey: string | undefined, nodeGroupKey: string | undefined;
  let xKey: string | undefined, yKey: string | undefined, wKey: string | undefined, hKey: string | undefined;
  for (const m of clean.matchAll(/<key\b([^>]*?)\/?>/g)) {
    const a = m[1], id = attr(a, 'id'), domain = attr(a, 'for'), name = (attr(a, 'attr.name') ?? '').toLowerCase();
    if (!id || domain === 'edge') { if (id && domain === 'edge' && NODE_LABEL_KEYS.has(name)) edgeLabelKey = id; continue; }
    if (name === 'group') { nodeGroupKey = id; continue; }
    if (name === 'x') { xKey = id; continue; }
    if (name === 'y') { yKey = id; continue; }
    if (name === 'w' || name === 'width') { wKey = id; continue; }
    if (name === 'h' || name === 'height') { hKey = id; continue; }
    if (NODE_LABEL_KEYS.has(name)) nodeLabelKey = id;
  }
  const geoKeys = new Set([xKey, yKey, wKey, hKey].filter(Boolean) as string[]);
  const coords = new Map<string, { x: number; y: number; w?: number; h?: number }>();
  const toNum = (v: string | undefined): number | undefined => { if (v == null) return undefined; const n = Number(v.trim()); return Number.isFinite(n) ? n : undefined; };
  const dataMap = (body: string): Map<string, string> => {
    const out = new Map<string, string>();
    for (const d of body.matchAll(/<data\b[^>]*?\bkey\s*=\s*"([^"]*)"[^>]*>([\s\S]*?)<\/data>/g)) out.set(d[1], d[2]);
    return out;
  };
  const yedLabel = (body: string): string | undefined => { const m = /<y:(?:NodeLabel|EdgeLabel)\b[^>]*>([\s\S]*?)<\/y:(?:NodeLabel|EdgeLabel)>/.exec(body); return m ? decode(m[1].replace(/<[^>]*>/g, '').trim()) : undefined; };

  const nodes = new Map<string, { id: string; title: string; type: NodeType; group?: string }>();
  const order: string[] = [], edges: DiagramEdge[] = [];
  const ensure = (rawId: string, title?: string): string => {
    const id = sanitize(rawId);
    let node = nodes.get(id);
    if (!node) { node = { id, title: title ?? rawId, type: 'process' }; nodes.set(id, node); order.push(id); }
    else if (title && node.title === rawId) node.title = title;
    return id;
  };
  for (const m of clean.matchAll(/<node\b([^>]*?)(?:\/>|>([\s\S]*?)<\/node>)/g)) {
    const rawId = attr(m[1], 'id'); if (!rawId) continue;
    const body = m[2] ?? '', data = dataMap(body);
    const plain = [...data.entries()].filter(([k]) => !geoKeys.has(k)).map(([, v]) => v).find(v => !v.includes('<'));
    const title = (nodeLabelKey && data.get(nodeLabelKey)) || yedLabel(body) || plain;
    const sid = ensure(rawId, title ? decode(title.trim()) : undefined);
    const group = nodeGroupKey ? data.get(nodeGroupKey) : undefined;
    if (group) nodes.get(sid)!.group = decode(group.trim());
    // Geometry: explicit x/y data keys, else a yEd <y:Geometry .../> element.
    const geom = /<y:Geometry\b([^>]*?)\/?>/.exec(body);
    const x = toNum(xKey ? data.get(xKey) : undefined) ?? (geom ? toNum(attr(geom[1], 'x')) : undefined);
    const y = toNum(yKey ? data.get(yKey) : undefined) ?? (geom ? toNum(attr(geom[1], 'y')) : undefined);
    if (x != null && y != null) coords.set(sid, { x, y, w: toNum(wKey ? data.get(wKey) : undefined) ?? (geom ? toNum(attr(geom[1], 'width')) : undefined), h: toNum(hKey ? data.get(hKey) : undefined) ?? (geom ? toNum(attr(geom[1], 'height')) : undefined) });
  }
  for (const m of clean.matchAll(/<edge\b([^>]*?)(?:\/>|>([\s\S]*?)<\/edge>)/g)) {
    const a = m[1], source = attr(a, 'source'), target = attr(a, 'target'); if (!source || !target) continue;
    const body = m[2] ?? '', data = dataMap(body);
    const s = ensure(source), t = ensure(target);
    const plain = [...data.values()].find(v => !v.includes('<'));
    const label = (edgeLabelKey && data.get(edgeLabelKey)) || yedLabel(body) || plain;
    edges.push({ id: `e-${edges.length}`, source: s, target: t, ...(label ? { label: decode(label.trim()) } : {}) });
  }
  if (!order.length) throw new Error('El GraphML no contiene nodos.');

  const nodeLayout: DiagramLayout['nodes'] = Object.create(null);
  if (order.every(id => coords.has(id))) {
    // Every node carries coordinates (our export or yEd geometry) -> preserve the external layout (top-left x/y).
    for (const id of order) {
      const c = coords.get(id)!;
      nodeLayout[id] = { x: Math.round(c.x), y: Math.round(c.y), width: Math.max(c.w ?? width, 140), height: Math.max(c.h ?? height, 76) };
    }
  } else {
    const level = layers(order, edges), perLevel = new Map<number, number>();
    for (const id of order) {
      const depth = level.get(id) ?? 0, slot = perLevel.get(depth) ?? 0; perLevel.set(depth, slot + 1);
      nodeLayout[id] = { x: slot * (width + gap) + 80, y: depth * (height + gap) + 80, width, height };
    }
  }
  const graph: SemanticGraph = { nodes: order.map(id => { const n = nodes.get(id)!; return { id: n.id, type: n.type, title: n.title, ...(n.group ? { group: n.group } : {}) }; }), edges };
  const edgeLayout: DiagramLayout['edges'] = Object.create(null);
  for (const e of edges) edgeLayout[e.id] = defaultPorts(nodeLayout[e.source], nodeLayout[e.target]);
  return parseDocument({ version: 2, graph, layout: { nodes: nodeLayout, edges: edgeLayout } });
}

const GML_SHAPE: Partial<Record<NodeShape, string>> = { rectangle: 'rectangle', diamond: 'diamond', ellipse: 'ellipse', pill: 'roundrectangle' };
/** Serializes a document to standard GraphML (directed), with node/edge labels and shapes as `<data>` keys. Re-importable with fromGraphml. */
export function toGraphml(document: DiagramDocument, options: GraphmlExportOptions = {}): string {
  const idOf = (nodeId: string): string => options.useTitlesAsIds ? (document.graph.nodes.find(n => n.id === nodeId)?.title ?? nodeId) : nodeId;
  const lines = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<graphml xmlns="http://graphml.graphdrawing.org/xmlns">',
    '  <key id="d_label" for="node" attr.name="label" attr.type="string"/>',
    '  <key id="d_shape" for="node" attr.name="shape" attr.type="string"/>',
    '  <key id="d_group" for="node" attr.name="group" attr.type="string"/>',
    '  <key id="d_x" for="node" attr.name="x" attr.type="double"/>',
    '  <key id="d_y" for="node" attr.name="y" attr.type="double"/>',
    '  <key id="d_w" for="node" attr.name="w" attr.type="double"/>',
    '  <key id="d_h" for="node" attr.name="h" attr.type="double"/>',
    '  <key id="d_elabel" for="edge" attr.name="label" attr.type="string"/>',
    '  <graph id="G" edgedefault="directed">',
  ];
  const r = (v: number): number => Math.round(v * 100) / 100;
  for (const node of document.graph.nodes) {
    const box = document.layout.nodes[node.id];
    lines.push(`    <node id="${encode(idOf(node.id))}">`);
    lines.push(`      <data key="d_label">${encode(node.title)}</data>`);
    if (box?.shape) lines.push(`      <data key="d_shape">${GML_SHAPE[box.shape] ?? box.shape}</data>`);
    if (node.group) lines.push(`      <data key="d_group">${encode(node.group)}</data>`);
    if (box) lines.push(`      <data key="d_x">${r(box.x)}</data>`, `      <data key="d_y">${r(box.y)}</data>`, `      <data key="d_w">${r(box.width)}</data>`, `      <data key="d_h">${r(box.height)}</data>`);
    lines.push('    </node>');
  }
  document.graph.edges.forEach((edge, i) => {
    lines.push(`    <edge id="e${i}" source="${encode(idOf(edge.source))}" target="${encode(idOf(edge.target))}"${edge.label ? '' : '/'}>`);
    if (edge.label) { lines.push(`      <data key="d_elabel">${encode(edge.label)}</data>`); lines.push('    </edge>'); }
  });
  lines.push('  </graph>', '</graphml>');
  return lines.join('\n');
}

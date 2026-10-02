import type { DiagramDocument, DiagramEdge, DiagramLayout, NodeType, SemanticGraph } from './types';
import { parseDocument } from './document';
import { defaultPorts } from './geometry';
import { layers } from './layout';

/** GEXF interop (gexf.net 1.2/1.3), the native format of Gephi and NetworkX's `write_gexf`.
 * A practical subset: nodes, directed edges, labels, `<viz:position>` coordinates and `group`/`type`
 * attribute values. No eval; labels and attributes stay data. */
export interface GexfImportOptions { nodeWidth?: number; nodeHeight?: number; gap?: number }

const sanitize = (raw: string): string => raw.replace(/[^A-Za-z0-9_-]/g, '_').slice(0, 120) || 'n';
const decode = (s: string): string => s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(+d)).replace(/&amp;/g, '&');
const encode = (s: string): string => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const attr = (text: string, name: string): string | undefined => { const m = new RegExp(`\\b${name}\\s*=\\s*"([^"]*)"`).exec(text); return m ? decode(m[1]) : undefined; };
const NODE_TYPES = new Set<string>(['screen', 'service', 'database', 'api', 'external', 'class', 'module', 'file', 'folder', 'component', 'generic', 'start', 'process', 'decision', 'end']);

/** Parses a GEXF document into a validated v2 diagram. Uses `<viz:position>` when present, otherwise a
 * deterministic layered layout. Restores `group` and `type` from `<attvalues>` written by {@link toGexf}. */
export function fromGexf(xml: string, options: GexfImportOptions = {}): DiagramDocument {
  const width = options.nodeWidth ?? 200, height = options.nodeHeight ?? 92, gap = options.gap ?? 64;
  const clean = xml.replace(/<!--[\s\S]*?-->/g, '');
  // Which <attribute> ids carry group / type (names declared in <attributes><attribute .../>).
  let groupAttr: string | undefined, typeAttr: string | undefined;
  for (const m of clean.matchAll(/<attribute\b([^>]*?)\/?>/g)) {
    const id = attr(m[1], 'id'), title = (attr(m[1], 'title') ?? '').toLowerCase();
    if (!id) continue;
    if (title === 'group') groupAttr = id; else if (title === 'type') typeAttr = id;
  }
  const attvalues = (body: string): Map<string, string> => {
    const out = new Map<string, string>();
    for (const a of body.matchAll(/<attvalue\b([^>]*?)\/?>/g)) { const forId = attr(a[1], 'for') ?? attr(a[1], 'id'), value = attr(a[1], 'value'); if (forId && value !== undefined) out.set(forId, value); }
    return out;
  };

  const nodes = new Map<string, { id: string; title: string; type: NodeType; group?: string }>();
  const order: string[] = [], edges: DiagramEdge[] = [], pos = new Map<string, { x: number; y: number }>();
  const ensure = (rawId: string, title?: string): string => {
    const id = sanitize(rawId);
    let node = nodes.get(id);
    if (!node) { node = { id, title: title ?? rawId, type: 'process' }; nodes.set(id, node); order.push(id); }
    else if (title && node.title === rawId) node.title = title;
    return id;
  };
  for (const m of clean.matchAll(/<node\b([^>]*?)(?:\/>|>([\s\S]*?)<\/node>)/g)) {
    const head = m[1], rawId = attr(head, 'id'); if (!rawId) continue;
    const body = m[2] ?? '';
    const sid = ensure(rawId, (attr(head, 'label') ?? rawId).trim());
    const vals = attvalues(body);
    const group = groupAttr ? vals.get(groupAttr) : undefined;
    if (group) nodes.get(sid)!.group = group.trim();
    const type = typeAttr ? vals.get(typeAttr) : undefined;
    if (type && NODE_TYPES.has(type)) nodes.get(sid)!.type = type as NodeType;
    const vm = /<viz:position\b([^>]*?)\/?>/.exec(body);
    if (vm) { const x = Number(attr(vm[1], 'x')), y = Number(attr(vm[1], 'y')); if (Number.isFinite(x) && Number.isFinite(y)) pos.set(sid, { x, y }); }
  }
  for (const m of clean.matchAll(/<edge\b([^>]*?)(?:\/>|>([\s\S]*?)<\/edge>)/g)) {
    const head = m[1], source = attr(head, 'source'), target = attr(head, 'target'); if (!source || !target) continue;
    const s = ensure(source), t = ensure(target), label = attr(head, 'label');
    edges.push({ id: `e-${edges.length}`, source: s, target: t, ...(label ? { label: label.trim() } : {}) });
  }
  if (!order.length) throw new Error('El GEXF no contiene nodos.');

  const nodeLayout: DiagramLayout['nodes'] = Object.create(null);
  if (pos.size === order.length) {
    // Honour stored coordinates; GEXF positions are node centres, so shift to top-left.
    for (const id of order) { const p = pos.get(id)!; nodeLayout[id] = { x: Math.round(p.x - width / 2), y: Math.round(p.y - height / 2), width, height }; }
  } else {
    const level = layers(order, edges), perLevel = new Map<number, number>();
    for (const id of order) { const depth = level.get(id) ?? 0, slot = perLevel.get(depth) ?? 0; perLevel.set(depth, slot + 1); nodeLayout[id] = { x: slot * (width + gap) + 80, y: depth * (height + gap) + 80, width, height }; }
  }
  const graph: SemanticGraph = { nodes: order.map(id => { const n = nodes.get(id)!; return { id: n.id, type: n.type, title: n.title, ...(n.group ? { group: n.group } : {}) }; }), edges };
  const edgeLayout: DiagramLayout['edges'] = Object.create(null);
  for (const e of edges) edgeLayout[e.id] = defaultPorts(nodeLayout[e.source], nodeLayout[e.target]);
  return parseDocument({ version: 2, graph, layout: { nodes: nodeLayout, edges: edgeLayout } });
}

/** Serializes a document to GEXF 1.3 (directed). Emits node/edge labels, `<viz:position>` from the layout
 * (centre coordinates) and `group`/`type` as `<attvalues>`. Re-importable with fromGexf. */
export function toGexf(document: DiagramDocument): string {
  const lines = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<gexf xmlns="http://gexf.net/1.3" xmlns:viz="http://gexf.net/1.3/viz" version="1.3">',
    '  <graph defaultedgetype="directed">',
    '    <attributes class="node">',
    '      <attribute id="group" title="group" type="string"/>',
    '      <attribute id="type" title="type" type="string"/>',
    '    </attributes>',
    '    <nodes>',
  ];
  for (const node of document.graph.nodes) {
    const box = document.layout.nodes[node.id];
    lines.push(`      <node id="${encode(node.id)}" label="${encode(node.title)}">`);
    lines.push('        <attvalues>');
    if (node.group) lines.push(`          <attvalue for="group" value="${encode(node.group)}"/>`);
    lines.push(`          <attvalue for="type" value="${encode(node.type)}"/>`);
    lines.push('        </attvalues>');
    if (box) lines.push(`        <viz:position x="${+(box.x + box.width / 2).toFixed(2)}" y="${+(box.y + box.height / 2).toFixed(2)}" z="0"/>`);
    lines.push('      </node>');
  }
  lines.push('    </nodes>', '    <edges>');
  document.graph.edges.forEach((edge, i) => {
    lines.push(`      <edge id="e${i}" source="${encode(edge.source)}" target="${encode(edge.target)}"${edge.label ? ` label="${encode(edge.label)}"` : ''}/>`);
  });
  lines.push('    </edges>', '  </graph>', '</gexf>');
  return lines.join('\n');
}

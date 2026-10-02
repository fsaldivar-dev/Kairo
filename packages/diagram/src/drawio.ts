import type { DiagramDocument, DiagramEdge, DiagramLayout, NodeShape, NodeType, SemanticGraph } from './types';
import { parseDocument } from './document';
import { defaultPorts } from './geometry';
import { layers } from './layout';

/** draw.io / diagrams.net interop via uncompressed mxGraph XML (an <mxfile> with one <diagram>).
 * A practical subset: vertices, edges, labels, geometry and shape from style. No eval. */
export interface DrawioImportOptions { nodeWidth?: number; nodeHeight?: number; gap?: number }

const sanitize = (raw: string): string => raw.replace(/[^A-Za-z0-9_-]/g, '_').slice(0, 120) || 'n';
const decode = (s: string): string => s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#10;/g, '\n').replace(/&apos;/g, "'").replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(+d)).replace(/&amp;/g, '&');
const encode = (s: string): string => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/\n/g, '&#10;');
const attr = (text: string, name: string): string | undefined => { const m = new RegExp(`\\b${name}\\s*=\\s*"([^"]*)"`).exec(text); return m ? decode(m[1]) : undefined; };

const extraShapes: Partial<Record<NodeShape, string>> = { cylinder: 'cylinder', document: 'document', parallelogram: 'parallelogram', hexagon: 'hexagon', trapezoid: 'trapezoid', triangle: 'triangle', note: 'note', subprocess: 'process' };
const styleFor = (type: NodeType, shape?: NodeShape): string => {
  const s = shape ?? (type === 'decision' ? 'diamond' : type === 'start' || type === 'end' ? 'pill' : 'rectangle');
  if (extraShapes[s]) return `shape=${extraShapes[s]};whiteSpace=wrap;html=1;${s === 'triangle' ? 'direction=north;' : ''}`;
  if (s === 'diamond') return 'rhombus;whiteSpace=wrap;html=1;';
  if (s === 'ellipse') return 'ellipse;whiteSpace=wrap;html=1;';
  if (s === 'pill') return 'rounded=1;whiteSpace=wrap;html=1;arcSize=40;';
  return 'rounded=0;whiteSpace=wrap;html=1;';
};
const shapeFromStyle = (style: string): NodeShape | undefined => {
  const named = /(?:^|;)shape=([^;]+)/.exec(style)?.[1];
  const extra = Object.entries(extraShapes).find(([, name]) => name === named);
  if (extra) return extra[0] as NodeShape;
  if (/rhombus/i.test(style)) return 'diamond';
  if (/ellipse/i.test(style)) return 'ellipse';
  if (/rounded=1/i.test(style)) return 'pill';
  if (/rounded=0/i.test(style)) return 'rectangle';
  return undefined;
};

/** Serializes a document to uncompressed draw.io mxGraph XML, openable directly in diagrams.net. */
export function toDrawio(document: DiagramDocument): string {
  const lines = [
    '<mxfile host="kairo">', '  <diagram name="Kairo" id="kairo">',
    '    <mxGraphModel dx="800" dy="600" grid="1" gridSize="10" guides="1" tooltips="1" connect="1" arrows="1" fold="1" page="1" pageScale="1" math="0" shadow="0">',
    '      <root>', '        <mxCell id="0" />', '        <mxCell id="1" parent="0" />',
  ];
  const nodeIds = new Map(document.graph.nodes.map((n, i) => [n.id, `kn${i}`]));
  const box = (id: string) => document.layout.nodes[id];
  const cell = (node: DiagramDocument['graph']['nodes'][number], parent: string, x: number, y: number): string => {
    const b = box(node.id), w = Math.round(b?.width ?? 160), h = Math.round(b?.height ?? 80);
    return `        <mxCell id="${nodeIds.get(node.id)}" kairoId="${encode(node.id)}" value="${encode(node.title)}" style="${styleFor(node.type, b?.shape)}" vertex="1" parent="${parent}"><mxGeometry x="${Math.round(x)}" y="${Math.round(y)}" width="${w}" height="${h}" as="geometry" /></mxCell>`;
  };
  const byGroup = new Map<string, DiagramDocument['graph']['nodes']>();
  for (const node of document.graph.nodes) (byGroup.get(node.group ?? '') ?? byGroup.set(node.group ?? '', []).get(node.group ?? '')!).push(node);
  for (const node of byGroup.get('') ?? []) lines.push(cell(node, '1', box(node.id)?.x ?? 40, box(node.id)?.y ?? 40));
  let gi = 0;
  for (const [group, members] of byGroup) {
    if (!group) continue;
    const gx = Math.min(...members.map(n => box(n.id)?.x ?? 0)) - 16, gy = Math.min(...members.map(n => box(n.id)?.y ?? 0)) - 28;
    const gw = Math.max(...members.map(n => (box(n.id)?.x ?? 0) + (box(n.id)?.width ?? 160))) - gx + 16;
    const gh = Math.max(...members.map(n => (box(n.id)?.y ?? 0) + (box(n.id)?.height ?? 80))) - gy + 16;
    const cid = `kg${gi++}`;
    lines.push(`        <mxCell id="${cid}" value="${encode(group)}" style="group;rounded=1;verticalAlign=top;fontStyle=1;" vertex="1" connectable="0" parent="1"><mxGeometry x="${Math.round(gx)}" y="${Math.round(gy)}" width="${Math.round(gw)}" height="${Math.round(gh)}" as="geometry" /></mxCell>`);
    for (const node of members) lines.push(cell(node, cid, (box(node.id)?.x ?? 0) - gx, (box(node.id)?.y ?? 0) - gy));
  }
  document.graph.edges.forEach((edge, i) => {
    lines.push(`        <mxCell id="ke${i}" kairoId="${encode(edge.id)}" value="${encode(edge.label ?? '')}" style="edgeStyle=orthogonalEdgeStyle;rounded=0;html=1;" edge="1" parent="1" source="${nodeIds.get(edge.source)}" target="${nodeIds.get(edge.target)}"><mxGeometry relative="1" as="geometry" /></mxCell>`);
  });
  lines.push('      </root>', '    </mxGraphModel>', '  </diagram>', '</mxfile>');
  return lines.join('\n');
}

/** Parses draw.io mxGraph XML into a validated v2 document. Geometry is used when present (clamped to the
 * minimum node size); otherwise a layered layout is computed. Compressed diagrams are not supported. */
export function fromDrawio(xml: string, options: DrawioImportOptions = {}): DiagramDocument {
  const minW = options.nodeWidth ?? 160, minH = options.nodeHeight ?? 80, gap = options.gap ?? 64;
  if (/<diagram[^>]*>[\s]*[A-Za-z0-9+/=]{40,}[\s]*<\/diagram>/.test(xml)) throw new Error('El diagrama draw.io está comprimido; expórtalo sin comprimir.');
  const clean = xml.replace(/<!--[\s\S]*?-->/g, '');
  const nodes = new Map<string, { id: string; title: string; type: NodeType; shape?: NodeShape; w: number; h: number; x?: number; y?: number; group?: string }>();
  const order: string[] = [], edges: DiagramEdge[] = [];
  const geom = (body: string) => { const m = /<mxGeometry\b([^>]*?)\/?>/.exec(body); return m ? m[1] : ''; };
  // First collect every vertex cell (raw), so containers (group parents) can be told from real nodes.
  interface VCell { id: string; originalId?: string; value?: string; style: string; parent?: string; x?: number; y?: number; w: number; h: number }
  const vcells: VCell[] = [];
  for (const m of clean.matchAll(/<mxCell\b([^>]*?)(?:\/>|>([\s\S]*?)<\/mxCell>)/g)) {
    const a = m[1], body = m[2] ?? '', id = attr(a, 'id'); if (!id || id === '0' || id === '1') continue;
    if (!/\bvertex\s*=\s*"1"/.test(a)) continue;
    const g = geom(body);
    vcells.push({ id, originalId: attr(a, 'kairoId'), value: attr(a, 'value'), style: attr(a, 'style') ?? '', parent: attr(a, 'parent'),
      x: attr(g, 'x') !== undefined ? Number(attr(g, 'x')) : undefined, y: attr(g, 'y') !== undefined ? Number(attr(g, 'y')) : undefined,
      w: Math.max(minW, Number(attr(g, 'width')) || minW), h: Math.max(minH, Number(attr(g, 'height')) || minH) });
  }
  const byRawId = new Map(vcells.map(c => [c.id, c]));
  const parentRefs = new Set(vcells.map(c => c.parent).filter((pid): pid is string => !!pid && pid !== '0' && pid !== '1'));
  const isContainer = (c: VCell): boolean => parentRefs.has(c.id) || /(^|;)group\b|container\s*=\s*1/i.test(c.style);
  const absOffset = (c: VCell, axis: 'x' | 'y'): number => {
    let v = c[axis] ?? 0, p = c.parent, seen = new Set<string>();
    while (p && byRawId.has(p) && isContainer(byRawId.get(p)!) && !seen.has(p)) { seen.add(p); const pc = byRawId.get(p)!; v += pc[axis] ?? 0; p = pc.parent; }
    return v;
  };
  const nodeIds = new Map<string, string>();
  for (const c of vcells) {
    if (isContainer(c)) continue; // a group box, not a node
    const shape = shapeFromStyle(c.style), baseId = c.originalId ?? sanitize(c.id);
    let sid = baseId, suffix = 2;
    while (nodes.has(sid)) sid = `${baseId}-${suffix++}`;
    nodeIds.set(c.id, sid);
    const parent = c.parent && byRawId.has(c.parent) && isContainer(byRawId.get(c.parent)!) ? byRawId.get(c.parent)! : undefined;
    const group = parent?.value || undefined;
    const x = c.x !== undefined ? absOffset(c, 'x') : undefined, y = c.y !== undefined ? absOffset(c, 'y') : undefined;
    nodes.set(sid, { id: sid, title: c.value || c.id, type: shape === 'diamond' ? 'decision' : 'process', shape, w: c.w, h: c.h, x, y, group });
    order.push(sid);
  }
  for (const m of clean.matchAll(/<mxCell\b([^>]*?)(?:\/>|>([\s\S]*?)<\/mxCell>)/g)) {
    const a = m[1]; if (!/\bedge\s*=\s*"1"/.test(a)) continue;
    const source = attr(a, 'source'), target = attr(a, 'target'); if (!source || !target) continue;
    const s = nodeIds.get(source), t = nodeIds.get(target); if (!s || !t) continue;
    const label = attr(a, 'value');
    edges.push({ id: attr(a, 'kairoId') ?? `e-${edges.length}`, source: s, target: t, ...(label ? { label } : {}) });
  }
  if (!order.length) throw new Error('El XML de draw.io no contiene nodos.');

  const hasGeometry = order.every(id => nodes.get(id)!.x !== undefined && nodes.get(id)!.y !== undefined);
  const nodeLayout: DiagramLayout['nodes'] = Object.create(null);
  if (hasGeometry) {
    for (const id of order) { const n = nodes.get(id)!; nodeLayout[id] = { x: n.x!, y: n.y!, width: n.w, height: n.h, ...(n.shape ? { shape: n.shape } : {}) }; }
  } else {
    const level = layers(order, edges), perLevel = new Map<number, number>();
    for (const id of order) {
      const n = nodes.get(id)!, depth = level.get(id) ?? 0, slot = perLevel.get(depth) ?? 0; perLevel.set(depth, slot + 1);
      nodeLayout[id] = { x: slot * (minW + gap) + 80, y: depth * (minH + gap) + 80, width: n.w, height: n.h, ...(n.shape ? { shape: n.shape } : {}) };
    }
  }
  const graph: SemanticGraph = { nodes: order.map(id => { const n = nodes.get(id)!; return { id: n.id, type: n.type, title: n.title, ...(n.group ? { group: n.group } : {}) }; }), edges };
  const edgeLayout: DiagramLayout['edges'] = Object.create(null);
  for (const e of edges) edgeLayout[e.id] = defaultPorts(nodeLayout[e.source], nodeLayout[e.target]);
  return parseDocument({ version: 2, graph, layout: { nodes: nodeLayout, edges: edgeLayout }, profile: 'flow' });
}

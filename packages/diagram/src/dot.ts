import type { DiagramDocument, DiagramEdge, DiagramLayout, NodeShape, NodeType, SemanticGraph } from './types';
import { parseDocument } from './document';
import { defaultPorts } from './geometry';
import { layers } from './layout';

/** A practical subset of the Graphviz DOT language. No eval; labels and conditions remain data. */
export interface DotImportOptions { nodeWidth?: number; nodeHeight?: number; gap?: number }
const SHAPES: Record<string, NodeShape> = { cylinder: 'cylinder', note: 'note', parallelogram: 'parallelogram', hexagon: 'hexagon', trapezium: 'trapezoid', triangle: 'triangle', box: 'rectangle', rect: 'rectangle', rectangle: 'rectangle', square: 'rectangle', diamond: 'diamond', ellipse: 'ellipse', oval: 'ellipse', circle: 'ellipse', doublecircle: 'ellipse', stadium: 'pill', pill: 'pill' };
const sanitize = (raw: string): string => raw.replace(/[^A-Za-z0-9_-]/g, '_').slice(0, 120) || 'n';

/** Splits `a=b, c="d"` attribute text into a map; handles quoted values and HTML-less barewords. */
function parseAttrs(text: string): Record<string, string> {
  const out: Record<string, string> = {};
  const re = /([A-Za-z_][\w]*)\s*=\s*("(?:[^"\\]|\\.)*"|[^,\]\s]+)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) out[m[1].toLowerCase()] = m[2].startsWith('"') ? m[2].slice(1, -1).replace(/\\"/g, '"') : m[2];
  return out;
}
const readId = (token: string): string => { const t = token.trim(); return t.startsWith('"') ? t.slice(1, -1).replace(/\\"/g, '"') : t; };

/** Parses DOT text into a validated v2 document with a deterministic layered layout. */
export function parseDotText(dot: string, options: DotImportOptions = {}): DiagramDocument {
  const width = options.nodeWidth ?? 200, height = options.nodeHeight ?? 92, gap = options.gap ?? 64;
  // Strip comments, then the `digraph/graph name { ... }` wrapper.
  let body = dot.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '').replace(/^\s*#[^\n]*/gm, '');
  const open = body.indexOf('{'), close = body.lastIndexOf('}');
  const directed = /\bdigraph\b/i.test(body.slice(0, open < 0 ? body.length : open)) || body.includes('->');
  if (open >= 0 && close > open) body = body.slice(open + 1, close);
  const statements = body.replace(/\{/g, ';{;').replace(/\}/g, ';};').split(/[;\n]+/).map(s => s.trim()).filter(Boolean);

  const nodes = new Map<string, { id: string; title: string; type: NodeType; shape?: NodeShape; declared: boolean; group?: string; pos?: { x: number; y: number }; size?: { w: number; h: number } }>();
  const order: string[] = [], edges: DiagramEdge[] = [], dashed = new Set<string>(), plain = new Set<string>();
  const applyNode = (rawId: string, attrs: Record<string, string>): string => {
    const id = sanitize(rawId);
    let node = nodes.get(id);
    if (!node) { node = { id, title: rawId, type: 'process', declared: false }; nodes.set(id, node); order.push(id); }
    const g = groupStack.length ? groupStack[groupStack.length - 1].group : undefined;
    if (g && node.group === undefined) node.group = g;
    const shape = attrs.shape ? SHAPES[attrs.shape.toLowerCase()] : undefined;
    if (attrs.label !== undefined || shape) {
      if (attrs.label !== undefined) node.title = attrs.label;
      if (shape) { node.shape = shape; node.type = shape === 'diamond' ? 'decision' : 'process'; }
      node.declared = true;
    }
    if (attrs.pos) { const m = /^\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)/.exec(attrs.pos); if (m) node.pos = { x: +m[1], y: +m[2] }; } // Graphviz points, y-up
    const wIn = attrs.width != null ? Number(attrs.width) : NaN, hIn = attrs.height != null ? Number(attrs.height) : NaN;
    if (Number.isFinite(wIn) || Number.isFinite(hIn)) node.size = { w: Number.isFinite(wIn) ? wIn * 72 : node.size?.w ?? 0, h: Number.isFinite(hIn) ? hIn * 72 : node.size?.h ?? 0 };
    return id;
  };
  const groupStack: { group?: string; labelSet: boolean }[] = [];
  for (const stmt of statements) {
    if (/^subgraph\b/i.test(stmt)) { const name = stmt.replace(/^subgraph\s+/i, '').replace(/["{]/g, '').trim(); groupStack.push({ group: /cluster/i.test(name) ? name : undefined, labelSet: false }); continue; }
    if (stmt === '{') continue;
    if (stmt === '}') { groupStack.pop(); continue; }
    const lbl = /^label\s*=\s*("(?:[^"\\]|\\.)*"|[^,;\]]+)/i.exec(stmt);
    if (lbl && groupStack.length) { const top = groupStack[groupStack.length - 1]; if (top.group !== undefined && !top.labelSet) { top.group = lbl[1].startsWith('"') ? lbl[1].slice(1, -1).replace(/\\"/g, '"') : lbl[1].trim(); top.labelSet = true; } continue; }
    if (/^(graph|node|edge|rankdir|label|digraph|strict|subgraph|bgcolor)\b/i.test(stmt) && !/(->|--)/.test(stmt)) continue;
    const op = directed ? '->' : '--';
    const attrStart = stmt.indexOf('[');
    const head = (attrStart >= 0 ? stmt.slice(0, attrStart) : stmt).trim();
    const attrs = attrStart >= 0 ? parseAttrs(stmt.slice(attrStart + 1, stmt.lastIndexOf(']'))) : {};
    if (head.includes(op)) {
      const chain = head.split(op).map(readId).map(s => s.trim()).filter(Boolean);
      for (let i = 0; i < chain.length - 1; i++) {
        const s = applyNode(chain[i], {}), t = applyNode(chain[i + 1], {});
        const id = `e-${edges.length}`;
        edges.push({ id, source: s, target: t, ...(attrs.label ? { label: attrs.label } : {}) });
        if (/dashed|dotted/i.test(attrs.style ?? '')) dashed.add(id);
        if (!directed) plain.add(id);
      }
    } else if (head) applyNode(readId(head), attrs);
  }
  if (!order.length) throw new Error('El texto DOT no contiene nodos.');
  const nodeLayout: DiagramLayout['nodes'] = Object.create(null);
  if (order.every(id => nodes.get(id)!.pos)) {
    // Every node carries a Graphviz `pos` (e.g. `dot -Tdot`/neato output): keep that layout, flipping y to our
    // y-down space and normalising the top-left corner to the 80 margin. Sizes from `width`/`height` when given.
    for (const id of order) {
      const node = nodes.get(id)!, p = node.pos!, w = Math.max(width, Math.round(node.size?.w ?? 0)), h = Math.max(height, Math.round(node.size?.h ?? 0));
      nodeLayout[id] = { x: Math.round(p.x - w / 2), y: Math.round(-p.y - h / 2), width: w, height: h, ...(node.shape ? { shape: node.shape } : {}) };
    }
    let minX = Infinity, minY = Infinity;
    for (const id of order) { minX = Math.min(minX, nodeLayout[id].x); minY = Math.min(minY, nodeLayout[id].y); }
    const offX = Number.isFinite(minX) ? 80 - minX : 0, offY = Number.isFinite(minY) ? 80 - minY : 0;
    for (const id of order) { nodeLayout[id].x += offX; nodeLayout[id].y += offY; }
  } else {
    const level = layers(order, edges), perLevel = new Map<number, number>();
    for (const id of order) {
      const depth = level.get(id) ?? 0, slot = perLevel.get(depth) ?? 0; perLevel.set(depth, slot + 1);
      const node = nodes.get(id)!;
      nodeLayout[id] = { x: slot * (width + gap) + 80, y: depth * (height + gap) + 80, width, height, ...(node.shape ? { shape: node.shape } : {}) };
    }
  }
  const graph: SemanticGraph = { nodes: order.map(id => { const n = nodes.get(id)!; return { id: n.id, type: n.type, title: n.title, ...(n.group ? { group: n.group } : {}) }; }), edges };
  const edgeLayout: DiagramLayout['edges'] = Object.create(null);
  for (const e of edges) edgeLayout[e.id] = { ...defaultPorts(nodeLayout[e.source], nodeLayout[e.target]), ...(plain.has(e.id) ? { endMarker: 'none' as const } : {}), ...(dashed.has(e.id) ? { dashed: true } : {}) };
  return parseDocument({ version: 2, graph, layout: { nodes: nodeLayout, edges: edgeLayout }, profile: 'flow' });
}


export interface DotExportOptions { rankdir?: 'TB' | 'LR' | 'BT' | 'RL'; positions?: boolean }
const DOT_SHAPE: Partial<Record<NodeShape, { shape: string; style?: string }>> = { cylinder: { shape: 'cylinder' }, note: { shape: 'note' }, document: { shape: 'note' }, parallelogram: { shape: 'parallelogram' }, hexagon: { shape: 'hexagon' }, trapezoid: { shape: 'trapezium' }, triangle: { shape: 'triangle' }, rectangle: { shape: 'box' }, diamond: { shape: 'diamond' }, ellipse: { shape: 'ellipse' }, pill: { shape: 'box', style: 'rounded' } };
const quote = (text: string): string => `"${text.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
const dotShapeFor = (type: NodeType, shape?: NodeShape): NodeShape => shape ?? (type === 'decision' ? 'diamond' : type === 'start' || type === 'end' ? 'pill' : 'rectangle');
/** Serializes a document to Graphviz DOT. Encodes shape and structure (not arbitrary Kairo node types); re-importable with parseDotText. */
export function toDotText(document: DiagramDocument, options: DotExportOptions = {}): string {
  const lines = ['digraph {', `  rankdir=${options.rankdir ?? 'TB'};`];
  const nodeDef = (node: DiagramDocument['graph']['nodes'][number], indent: string): string => {
    const def = DOT_SHAPE[dotShapeFor(node.type, document.layout.nodes[node.id]?.shape)] ?? DOT_SHAPE.rectangle!;
    const attrs = [`label=${quote(node.title)}`, `shape=${def.shape}`, ...(def.style ? [`style=${def.style}`] : [])];
    const box = document.layout.nodes[node.id];
    if (options.positions && box) {
      // Graphviz points, y-up (bottom-left origin); the "!" pins the node for `neato -n`. Sizes in inches.
      const cx = Math.round(box.x + box.width / 2), cy = -Math.round(box.y + box.height / 2);
      attrs.push(`pos="${cx},${cy}!"`, `width=${+(box.width / 72).toFixed(3)}`, `height=${+(box.height / 72).toFixed(3)}`, 'fixedsize=true');
    }
    return `${indent}${quote(node.id)} [${attrs.join(', ')}];`;
  };
  const byGroup = new Map<string, DiagramDocument['graph']['nodes']>();
  for (const node of document.graph.nodes) (byGroup.get(node.group ?? '') ?? byGroup.set(node.group ?? '', []).get(node.group ?? '')!).push(node);
  for (const node of byGroup.get('') ?? []) lines.push(nodeDef(node, '  '));
  let gi = 0;
  for (const [group, members] of byGroup) {
    if (!group) continue;
    lines.push(`  subgraph cluster_${gi++} {`, `    label=${quote(group)};`);
    for (const node of members) lines.push(nodeDef(node, '    '));
    lines.push('  }');
  }
  for (const edge of document.graph.edges) {
    const route = document.layout.edges[edge.id], attrs: string[] = [];
    if (edge.label) attrs.push(`label=${quote(edge.label)}`);
    if (route?.dashed) attrs.push('style=dashed');
    lines.push(`  ${quote(edge.source)} -> ${quote(edge.target)}${attrs.length ? ` [${attrs.join(', ')}]` : ''};`);
  }
  lines.push('}');
  return lines.join('\n');
}
import type { DiagramDocument, DiagramEdge, DiagramLayout, NodeType, SemanticGraph } from './types';
import { parseDocument } from './document';
import { defaultPorts } from './geometry';
import { layers } from './layout';

/** GML (Graph Modelling Language) interop — the classic `graph [ node [ id 0 label "A" ] … ]` format read and
 * written by NetworkX (`read_gml`/`write_gml`), igraph, Gephi and yEd. A practical subset: directed graphs,
 * node id/label and edge source/target/label, plus `type`/`group`/`name` keys that {@link toGml} writes so a
 * Kairo round-trip keeps ids, node types and groups. No eval; every value stays data. */
export interface GmlImportOptions { nodeWidth?: number; nodeHeight?: number; gap?: number }

const sanitize = (raw: string): string => raw.replace(/[^A-Za-z0-9_-]/g, '_').slice(0, 120) || 'n';
const NODE_TYPES = new Set<string>(['screen', 'service', 'database', 'api', 'external', 'class', 'module', 'file', 'folder', 'component', 'generic', 'start', 'process', 'decision', 'end']);

type GmlValue = string | number | GmlPair[];
interface GmlPair { key: string; value: GmlValue }

/** Tokenizes GML into `[`, `]`, bare words/numbers and quoted strings (prefixed with `"` so the parser can
 * tell a string from a bare word). `\"` escapes a quote inside a string. */
function tokenize(src: string): string[] {
  const toks: string[] = [];
  for (let i = 0; i < src.length;) {
    const c = src[i];
    if (c === '[' || c === ']') { toks.push(c); i++; continue; }
    if (c === '"') {
      let v = '', j = i + 1;
      while (j < src.length && src[j] !== '"') { if (src[j] === '\\' && j + 1 < src.length) { v += src[j + 1]; j += 2; } else v += src[j++]; }
      toks.push('"' + v); i = j + 1; continue;
    }
    if (/\s/.test(c)) { i++; continue; }
    let j = i;
    while (j < src.length && !/\s|[[\]"]/.test(src[j])) j++;
    toks.push(src.slice(i, j)); i = j;
  }
  return toks;
}

/** Recursive-descent parse of a key/value list until the matching `]`. Keys may repeat (node, edge). */
function parseList(toks: string[], start: number): [GmlPair[], number] {
  const pairs: GmlPair[] = [];
  let pos = start;
  while (pos < toks.length && toks[pos] !== ']') {
    const key = toks[pos++];
    if (pos >= toks.length) break;
    if (toks[pos] === '[') { const [inner, next] = parseList(toks, pos + 1); pairs.push({ key, value: inner }); pos = next; }
    else { const t = toks[pos++]; if (t[0] === '"') pairs.push({ key, value: t.slice(1) }); else { const n = Number(t); pairs.push({ key, value: Number.isNaN(n) ? t : n }); } }
  }
  return [pairs, pos + 1]; // skip the closing ']'
}

const first = (pairs: GmlPair[], key: string): GmlValue | undefined => pairs.find(p => p.key === key)?.value;
const asStr = (v: GmlValue | undefined): string | undefined => (typeof v === 'string' || typeof v === 'number') ? String(v) : undefined;

/** Parses a GML document into a validated v2 diagram with a deterministic layered layout. */
export function fromGml(gml: string, options: GmlImportOptions = {}): DiagramDocument {
  const width = options.nodeWidth ?? 200, height = options.nodeHeight ?? 92, gap = options.gap ?? 64;
  const toks = tokenize(gml);
  const gi = toks.indexOf('graph');
  if (gi < 0 || toks[gi + 1] !== '[') throw new Error('El documento no contiene un bloque `graph [ … ]` de GML.');
  const [graph] = parseList(toks, gi + 2);

  const idMap = new Map<string, string>(); // GML id -> our node id
  const used = new Set<string>();
  const nodes: SemanticGraph['nodes'] = [];
  const coords = new Map<string, { cx: number; cy: number; w?: number; h?: number }>(); // from graphics blocks
  const numOf = (v: GmlValue | undefined): number | undefined => { const s = asStr(v); const n = s == null ? NaN : Number(s); return Number.isFinite(n) ? n : undefined; };
  for (const p of graph) {
    if (p.key !== 'node' || !Array.isArray(p.value)) continue;
    const gmlId = asStr(first(p.value, 'id')) ?? String(idMap.size);
    const name = asStr(first(p.value, 'name')), label = asStr(first(p.value, 'label'));
    let id = sanitize(name ?? label ?? `n${gmlId}`), i = 2; while (used.has(id)) id = `${sanitize(name ?? label ?? `n${gmlId}`)}-${i++}`;
    used.add(id); idMap.set(gmlId, id);
    const typeRaw = asStr(first(p.value, 'type')); const type = (typeRaw && NODE_TYPES.has(typeRaw) ? typeRaw : 'process') as NodeType;
    const group = asStr(first(p.value, 'group'));
    nodes.push({ id, type, title: label ?? name ?? id, ...(group ? { group } : {}) });
    const gfx = first(p.value, 'graphics');
    if (Array.isArray(gfx)) {
      const cx = numOf(first(gfx, 'x')), cy = numOf(first(gfx, 'y'));
      if (cx != null && cy != null) coords.set(id, { cx, cy, w: numOf(first(gfx, 'w')), h: numOf(first(gfx, 'h')) });
    }
  }
  const edges: DiagramEdge[] = [];
  for (const p of graph) {
    if (p.key !== 'edge' || !Array.isArray(p.value)) continue;
    const s = idMap.get(asStr(first(p.value, 'source')) ?? ''), t = idMap.get(asStr(first(p.value, 'target')) ?? '');
    if (!s || !t) continue;
    const label = asStr(first(p.value, 'label'));
    edges.push({ id: `e${edges.length}`, source: s, target: t, ...(label ? { label } : {}) });
  }
  if (!nodes.length) throw new Error('El GML no declara nodos.');

  const order = nodes.map(n => n.id);
  const nodeLayout: DiagramLayout['nodes'] = Object.create(null);
  if (order.every(id => coords.has(id))) {
    // Every node carries graphics coordinates (yEd centre convention) -> preserve the external layout.
    for (const id of order) {
      const c = coords.get(id)!, w = Math.max(c.w ?? width, 140), h = Math.max(c.h ?? height, 76);
      nodeLayout[id] = { x: Math.round(c.cx - w / 2), y: Math.round(c.cy - h / 2), width: w, height: h };
    }
  } else {
    const level = layers(order, edges), perLevel = new Map<number, number>();
    for (const id of order) {
      const depth = level.get(id) ?? 0, slot = perLevel.get(depth) ?? 0; perLevel.set(depth, slot + 1);
      nodeLayout[id] = { x: slot * (width + gap) + 80, y: depth * (height + gap) + 80, width, height };
    }
  }
  const edgeLayout: DiagramLayout['edges'] = Object.create(null);
  for (const e of edges) edgeLayout[e.id] = defaultPorts(nodeLayout[e.source], nodeLayout[e.target]);
  return parseDocument({ version: 2, graph: { nodes, edges }, layout: { nodes: nodeLayout, edges: edgeLayout } });
}

const quote = (s: string): string => `"${s.replace(/[\\"]/g, m => '\\' + m).replace(/\r?\n/g, ' ')}"`;

/** Serializes a document to GML. Emits directed edges and keeps the original node id (`name`), `type` and
 * `group` as custom keys, so `fromGml(toGml(doc))` round-trips ids, types and groups. NetworkX/igraph/Gephi/yEd
 * read the standard `graph/node/edge/id/label/source/target` keys and ignore the extras. Pure. */
export function toGml(document: DiagramDocument): string {
  const index = new Map(document.graph.nodes.map((n, i) => [n.id, i]));
  const out: string[] = ['graph [', '  directed 1'];
  const r = (v: number): number => Math.round(v * 100) / 100;
  for (const n of document.graph.nodes) {
    out.push('  node [', `    id ${index.get(n.id)}`, `    name ${quote(n.id)}`, `    label ${quote(n.title)}`, `    type ${quote(n.type)}`);
    if (n.group) out.push(`    group ${quote(n.group)}`);
    const b = document.layout.nodes[n.id]; // yEd convention: graphics x/y is the node centre
    if (b) out.push(`    graphics [ x ${r(b.x + b.width / 2)} y ${r(b.y + b.height / 2)} w ${r(b.width)} h ${r(b.height)} ]`);
    out.push('  ]');
  }
  for (const e of document.graph.edges) {
    const s = index.get(e.source), t = index.get(e.target);
    if (s === undefined || t === undefined) continue;
    out.push('  edge [', `    source ${s}`, `    target ${t}`);
    if (e.label) out.push(`    label ${quote(e.label)}`);
    out.push('  ]');
  }
  out.push(']');
  return out.join('\n') + '\n';
}

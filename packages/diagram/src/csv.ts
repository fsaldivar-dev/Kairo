import type { DiagramDocument, DiagramEdge, DiagramLayout, NodeType, SemanticGraph } from './types';
import { nodeTypes } from './types';
import { parseDocument } from './document';
import { defaultPorts } from './geometry';
import { layers } from './layout';

/** CSV/TSV edge-list interop. A spreadsheet of `from,to,label` becomes a diagram and back. No eval; every field stays data. */
export interface CsvImportOptions {
  /** Field separator. Auto-detected from the first row (comma, tab or semicolon) when omitted. */
  delimiter?: string;
  /** `auto` (default) treats the first row as a header only when its cells name known columns; `true`/`false` force it. */
  header?: 'auto' | boolean;
  nodeWidth?: number; nodeHeight?: number; gap?: number;
}
export interface CsvExportOptions {
  delimiter?: string;
  /** Emit node ids instead of their titles. */
  useIds?: boolean;
  /** Prepend a `from,to,label` header row (default true). */
  header?: boolean;
}

const sanitize = (raw: string): string => raw.replace(/[^A-Za-z0-9_-]/g, '_').slice(0, 120) || 'n';
const FROM = new Set(['from', 'source', 'src', 'start', 'origen']);
const TO = new Set(['to', 'target', 'dst', 'dest', 'end', 'destino']);
const LABEL = new Set(['label', 'relation', 'rel', 'edge', 'etiqueta', 'relacion']);
const NAME = new Set(['name', 'label', 'title', 'nombre', 'titulo', 'título', 'etiqueta']);
const TYPEC = new Set(['type', 'tipo', 'kind']);
const TAGSC = new Set(['tags', 'etiquetas', 'tag']);
const GROUPC = new Set(['group', 'grupo', 'lane', 'carril']);
const NSOURCE = new Set(['source', 'fuente', 'archivo', 'file']); // a node's source column (distinct from an edge's `from`)

/** Splits one delimited line, honouring "quoted" fields and "" escapes. Cells are trimmed. */
function splitRow(line: string, delim: string): string[] {
  const out: string[] = []; let cur = '', inQ = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (inQ) {
      if (c === '"') { if (line[i + 1] === '"') { cur += '"'; i++; } else inQ = false; } else cur += c;
    } else if (c === '"') inQ = true;
    else if (c === delim) { out.push(cur); cur = ''; }
    else cur += c;
  }
  out.push(cur);
  return out.map(s => s.trim());
}
const detectDelimiter = (line: string): string => {
  const count = (d: string) => (line.match(new RegExp(d === '\t' ? '\\t' : `\\${d}`, 'g')) ?? []).length;
  return [[',', count(',')], ['\t', count('\t')], [';', count(';')]].sort((a, b) => (b[1] as number) - (a[1] as number))[0][0] as string;
};

/** Parses a CSV/TSV edge list into a validated v2 document with a deterministic layered layout.
 * Each row is `from,to,label?`; a row whose `to` is empty just declares a node. */
export function fromCsv(csv: string, options: CsvImportOptions = {}): DiagramDocument {
  const width = options.nodeWidth ?? 200, height = options.nodeHeight ?? 92, gap = options.gap ?? 64;
  const rows = csv.replace(/\r\n?/g, '\n').split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('#'));
  if (!rows.length) throw new Error('El CSV no contiene filas.');
  const delim = options.delimiter ?? detectDelimiter(rows[0]);
  const cells = rows.map(r => splitRow(r, delim));

  const head0 = cells[0].map(c => c.toLowerCase());
  const col = (set: Set<string>) => head0.findIndex(c => set.has(c));
  // Node-table mode: a header with id/name + type/tags and no to/target column defines nodes with metadata.
  if (options.header !== false && col(TO) < 0 && (col(new Set(['id'])) >= 0 || col(NAME) >= 0) && (col(TYPEC) >= 0 || col(TAGSC) >= 0 || col(GROUPC) >= 0 || col(NSOURCE) >= 0)) {
    const idIdx = col(new Set(['id'])), nameIdx = col(NAME), typeIdx = col(TYPEC), tagsIdx = col(TAGSC), groupIdx = col(GROUPC), srcIdx = col(NSOURCE);
    const identity = idIdx >= 0 ? idIdx : nameIdx;
    const nodesN: SemanticGraph['nodes'] = [];
    const usedN = new Set<string>();
    for (let i = 1; i < cells.length; i++) {
      const row = cells[i], rawId = row[identity] ?? ''; if (!rawId) continue;
      const titleN = nameIdx >= 0 ? (row[nameIdx] || rawId) : rawId;
      let id = sanitize(idIdx >= 0 ? rawId : titleN), k = 2; while (usedN.has(id)) id = `${sanitize(rawId)}-${k++}`; usedN.add(id);
      const typeRaw = (typeIdx >= 0 ? row[typeIdx] : '').toLowerCase();
      const type = (nodeTypes as readonly string[]).includes(typeRaw) ? typeRaw as NodeType : 'process';
      const tags = tagsIdx >= 0 && row[tagsIdx] ? row[tagsIdx].split(/[;|]/).map(t => t.trim()).filter(Boolean) : undefined;
      const group = groupIdx >= 0 && row[groupIdx] ? row[groupIdx] : undefined;
      const source = srcIdx >= 0 && row[srcIdx] ? row[srcIdx] : undefined;
      nodesN.push({ id, type, title: titleN, ...(tags && tags.length ? { tags } : {}), ...(group ? { group } : {}), ...(source ? { source } : {}) });
    }
    if (!nodesN.length) throw new Error('El CSV no define ningún nodo.');
    const nodeLayoutN: DiagramLayout['nodes'] = Object.create(null);
    nodesN.forEach((n, i) => { nodeLayoutN[n.id] = { x: (i % 4) * (width + gap) + 80, y: Math.floor(i / 4) * (height + gap) + 80, width, height }; });
    return parseDocument({ version: 2, graph: { nodes: nodesN, edges: [] }, layout: { nodes: nodeLayoutN, edges: Object.create(null) } });
  }

  let fromCol = 0, toCol = 1, labelCol = 2, start = 0;
  const head = cells[0].map(c => c.toLowerCase());
  const named = head.some(c => FROM.has(c) || TO.has(c)); // a lone label keyword is too weak to treat row 1 as a header
  const useHeader = options.header === true || (options.header !== false && named);
  if (useHeader) {
    const find = (set: Set<string>) => head.findIndex(c => set.has(c));
    fromCol = Math.max(0, find(FROM)); const t = find(TO), l = find(LABEL);
    toCol = t >= 0 ? t : -1; labelCol = l >= 0 ? l : -1; start = 1;
  }

  const nodes = new Map<string, { id: string; title: string; type: NodeType }>();
  const order: string[] = [], edges: DiagramEdge[] = [];
  const ensure = (raw: string): string => {
    const id = sanitize(raw);
    if (!nodes.has(id)) { nodes.set(id, { id, title: raw, type: 'process' }); order.push(id); }
    return id;
  };
  for (let i = start; i < cells.length; i++) {
    const row = cells[i];
    const fromRaw = row[fromCol] ?? '';
    if (!fromRaw) continue;
    const s = ensure(fromRaw);
    const toRaw = toCol >= 0 ? (row[toCol] ?? '') : '';
    if (!toRaw) continue; // node-only row
    const t = ensure(toRaw);
    const label = labelCol >= 0 ? (row[labelCol] ?? '') : '';
    edges.push({ id: `e-${edges.length}`, source: s, target: t, ...(label ? { label } : {}) });
  }
  if (!order.length) throw new Error('El CSV no define ningún nodo.');

  const level = layers(order, edges), perLevel = new Map<number, number>();
  const nodeLayout: DiagramLayout['nodes'] = Object.create(null);
  for (const id of order) {
    const depth = level.get(id) ?? 0, slot = perLevel.get(depth) ?? 0; perLevel.set(depth, slot + 1);
    nodeLayout[id] = { x: slot * (width + gap) + 80, y: depth * (height + gap) + 80, width, height };
  }
  const graph: SemanticGraph = { nodes: order.map(id => { const n = nodes.get(id)!; return { id: n.id, type: n.type, title: n.title }; }), edges };
  const edgeLayout: DiagramLayout['edges'] = Object.create(null);
  for (const e of edges) edgeLayout[e.id] = defaultPorts(nodeLayout[e.source], nodeLayout[e.target]);
  return parseDocument({ version: 2, graph, layout: { nodes: nodeLayout, edges: edgeLayout } });
}

/** Serializes a document to a CSV edge list. Isolated nodes become a row with an empty `to`, so fromCsv round-trips them. */
export function toCsv(document: DiagramDocument, options: CsvExportOptions = {}): string {
  const delim = options.delimiter ?? ',';
  const title = new Map(document.graph.nodes.map(n => [n.id, options.useIds ? n.id : n.title]));
  const esc = (v: string): string => (v.includes(delim) || v.includes('"') || v.includes('\n')) ? `"${v.replace(/"/g, '""')}"` : v;
  const lines: string[] = [];
  if (options.header !== false) lines.push(['from', 'to', 'label'].join(delim));
  for (const e of document.graph.edges) lines.push([title.get(e.source) ?? e.source, title.get(e.target) ?? e.target, e.label ?? ''].map(esc).join(delim));
  const connected = new Set<string>(); for (const e of document.graph.edges) { connected.add(e.source); connected.add(e.target); }
  for (const n of document.graph.nodes) if (!connected.has(n.id)) lines.push([title.get(n.id) ?? n.id, '', ''].map(esc).join(delim));
  return lines.join('\n');
}

export interface CsvNodesOptions { delimiter?: string; header?: boolean; tagSeparator?: string }
/** Exports the nodes as a table (inventory): `id,title,type,group,tags,source`. Complements the edge-list
 * `toCsv` and the adjacency `toMatrixCsv`. Tags join with `tagSeparator` (default `;`). Pure. */
export function toCsvNodes(document: DiagramDocument, options: CsvNodesOptions = {}): string {
  const delim = options.delimiter ?? ',', tagSep = options.tagSeparator ?? ';';
  const esc = (v: string): string => (v.includes(delim) || v.includes('"') || v.includes('\n')) ? `"${v.replace(/"/g, '""')}"` : v;
  const lines: string[] = [];
  if (options.header !== false) lines.push(['id', 'title', 'type', 'group', 'tags', 'source'].join(delim));
  for (const n of document.graph.nodes) lines.push([n.id, n.title, n.type, n.group ?? '', (n.tags ?? []).join(tagSep), n.source ?? ''].map(esc).join(delim));
  return lines.join('\n');
}

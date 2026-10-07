import type { DiagramDocument, DiagramEdge, DiagramLayout, NodeShape, NodeType, SemanticGraph } from './types';
import { parseDocument } from './document';
import { defaultPorts } from './geometry';
import { layers } from './layout';

/** A Mermaid-like flowchart text importer. Framework-free, no eval; conditions and labels stay data. */
export interface TextImportOptions { nodeWidth?: number; nodeHeight?: number; gap?: number }
interface ParsedNode { id: string; title: string; type: NodeType; shape?: NodeShape; declared: boolean; group?: string }

// Longest bracket forms first so `((x))` is not read as `(…)`.
const SHAPES: ReadonlyArray<[RegExp, NodeShape, NodeType]> = [
  [/^\(\((.*)\)\)$/, 'ellipse', 'process'],
  [/^\(\[(.*)\]\)$/, 'pill', 'process'],
  [/^\{\{(.*)\}\}$/, 'hexagon', 'process'],
  [/^\{(.*)\}$/, 'diamond', 'decision'],
  [/^\[\/(.*)\/\]$/, 'parallelogram', 'process'],
  [/^\[\/(.*)\\\]$/, 'trapezoid', 'process'],
  [/^\[\((.*)\)\]$/, 'cylinder', 'database'],
  [/^\[\[(.*)\]\]$/, 'subprocess', 'module'],
  [/^\[(.*)\]$/, 'rectangle', 'process'],
  [/^\((.*)\)$/, 'pill', 'process'],
];
const OPERATORS = ['-.->', '-.-', '==>', '-->', '---'] as const;
const sanitize = (raw: string): string => raw.replace(/[^A-Za-z0-9_-]/g, '_').slice(0, 120) || 'n';

function parseNodeSpec(token: string): { id: string; title?: string; type?: NodeType; shape?: NodeShape } {
  const match = token.trim().match(/^([^\s\[({]+)\s*([\[({].*)?$/);
  if (!match) throw new Error(`Nodo no reconocido: "${token.trim()}"`);
  const id = sanitize(match[1]);
  const rest = match[2]?.trim();
  if (!rest) return { id };
  for (const [re, shape, type] of SHAPES) {
    const inner = rest.match(re);
    if (inner) { const quoted = inner[1].trim().match(/^"(.*)"$/); return { id, title: (quoted ? quoted[1].replace(/&quot;/g, '"') : inner[1].trim()) || match[1], type, shape }; }
  }
  throw new Error(`Forma de nodo no reconocida: "${rest}"`);
}
/** Parses flowchart text into a validated v2 document with a deterministic layered layout. */
/** Splits a Mermaid chain side on `&` at bracket depth 0, so `B & C` fans out but `[A & B]` stays intact. */
function splitAmp(side: string): string[] {
  const parts: string[] = []; let depth = 0, cur = '';
  for (const ch of side) {
    if ('[({'.includes(ch)) depth++; else if ('])}'.includes(ch)) depth = Math.max(0, depth - 1);
    if (ch === '&' && depth === 0) { parts.push(cur); cur = ''; } else cur += ch;
  }
  parts.push(cur);
  return parts.map(p => p.trim()).filter(Boolean);
}
/** Splits a line into alternating node segments and operators (longest-match), ignoring operators inside
 * brackets, so a multi-hop chain `A --> B --> C` (or with `&` and `|labels|`) is tokenized in order. */
function tokenizeChain(line: string): { segments: string[]; ops: string[] } | null {
  const sorted = [...OPERATORS].sort((a, b) => b.length - a.length);
  const segments: string[] = [], ops: string[] = []; let cur = '', depth = 0, i = 0;
  while (i < line.length) {
    const ch = line[i];
    if ('[({'.includes(ch)) depth++; else if ('])}'.includes(ch)) depth = Math.max(0, depth - 1);
    const op = depth === 0 ? sorted.find(o => line.startsWith(o, i)) : undefined;
    if (op) { segments.push(cur); ops.push(op); cur = ''; i += op.length; } else { cur += ch; i++; }
  }
  segments.push(cur);
  return ops.length ? { segments, ops } : null;
}
/** Splits Mermaid source into statements on newlines AND top-level `;` (Mermaid allows `;` as a statement
 * separator, e.g. `graph TD;A-->B`). Semicolons inside `[] () {}` brackets or `"`/`'` quotes are preserved
 * (arrows like `-->`/`<--` never contain `;`, so `<`/`>` are not treated as brackets). */
function splitStatements(text: string): string[] {
  const out: string[] = []; let buf = '', depth = 0, quote = '';
  for (const c of text) {
    if (quote) { buf += c; if (c === quote) quote = ''; continue; }
    if (c === '"' || c === "'") { quote = c; buf += c; continue; }
    if (c === '[' || c === '(' || c === '{') { depth++; buf += c; continue; }
    if (c === ']' || c === ')' || c === '}') { depth = Math.max(0, depth - 1); buf += c; continue; }
    if (c === '\r') continue;
    if ((c === '\n' || c === ';') && depth === 0) { out.push(buf); buf = ''; continue; }
    buf += c;
  }
  out.push(buf);
  return out;
}

export function parseFlowText(text: string, options: TextImportOptions = {}): DiagramDocument {
  const width = options.nodeWidth ?? 200, height = options.nodeHeight ?? 92, gap = options.gap ?? 64;
  const lines = splitStatements(text).map(l => l.trim()).filter(l => l && !l.startsWith('%%'));
  let horizontal = false, reverse = false;
  const nodes = new Map<string, ParsedNode>(), order: string[] = [];
  const edges: DiagramEdge[] = [], dashedEdges = new Set<string>(), plainEdges = new Set<string>();
  const groupStack: string[] = [];
  const ensure = (spec: ReturnType<typeof parseNodeSpec>): void => {
    let node = nodes.get(spec.id);
    if (!node) { node = { id: spec.id, title: spec.id, type: 'process', declared: false }; nodes.set(spec.id, node); order.push(spec.id); }
    if (groupStack.length && node.group === undefined) node.group = groupStack[groupStack.length - 1];
    if (spec.title !== undefined && (!node.declared || spec.shape)) { node.title = spec.title; node.type = spec.type!; node.shape = spec.shape; node.declared = true; }
  };
  for (const [index, line] of lines.entries()) {
    const header = line.match(/^(?:flowchart|graph)\s+(TB|TD|BT|LR|RL)\b/i);
    if (header && index === 0) { horizontal = /LR|RL/i.test(header[1]); reverse = /BT|RL/i.test(header[1]); continue; }
    const sg = /^subgraph\s+(.*)$/i.exec(line);
    if (sg) { const raw = sg[1].trim(); const br = /^\S+\s*\[(.*)\]$/.exec(raw) ?? /^\[(.*)\]$/.exec(raw); groupStack.push((br ? br[1] : raw).trim()); continue; }
    if (/^end$/i.test(line)) { groupStack.pop(); continue; }
    if (/^(classDef|class|style|linkStyle|direction|click)\b/i.test(line)) continue; // styling/directives: not nodes
    const chain = tokenizeChain(line);
    if (!chain) { ensure(parseNodeSpec(line)); continue; }
    // Each segment after an operator may carry a leading |label| for that hop.
    const parsed = chain.segments.map((seg, j) => {
      if (j === 0) return { label: undefined as string | undefined, side: seg };
      const m = seg.trim().match(/^\|([^|]*)\|\s*(.*)$/);
      return m ? { label: m[1].trim(), side: m[2] } : { label: undefined, side: seg };
    });
    for (let k = 0; k < chain.ops.length; k++) {
      const op = chain.ops[k], label = parsed[k + 1].label;
      const lefts = splitAmp(parsed[k].side).map(parseNodeSpec), rights = splitAmp(parsed[k + 1].side).map(parseNodeSpec);
      if (!lefts.length || !rights.length) continue;
      for (const spec of lefts) ensure(spec);
      for (const spec of rights) ensure(spec);
      for (const l of lefts) for (const r of rights) {
        const id = `e-${edges.length}`;
        edges.push({ id, source: l.id, target: r.id, ...(label ? { label } : {}) });
        if (op.includes('.')) dashedEdges.add(id);
        if (!op.endsWith('>')) plainEdges.add(id);
      }
    }
  }
  if (!order.length) throw new Error('El texto no contiene nodos.');
  const level = layers(order, edges), perLevel = new Map<number, number>();
  const nodeLayout: DiagramLayout['nodes'] = Object.create(null);
  for (const id of order) {
    const depth = level.get(id) ?? 0, slot = perLevel.get(depth) ?? 0; perLevel.set(depth, slot + 1);
    const major = depth * (( horizontal ? width : height) + gap) + 80;
    const minor = slot * ((horizontal ? height : width) + gap) + 80;
    const node = nodes.get(id)!;
    nodeLayout[id] = { x: horizontal ? major : minor, y: horizontal ? minor : major, width, height, ...(node.shape ? { shape: node.shape } : {}) };
  }
  if (reverse) {
    const extent = Math.max(...Object.values(nodeLayout).map(b => horizontal ? b.x + b.width : b.y + b.height)) + 80;
    for (const b of Object.values(nodeLayout)) { if (horizontal) b.x = extent - b.x - b.width; else b.y = extent - b.y - b.height; }
  }
  const graph: SemanticGraph = { nodes: order.map(id => { const n = nodes.get(id)!; return { id: n.id, type: n.type, title: n.title, ...(n.group ? { group: n.group } : {}) }; }), edges };
  const edgeLayout: DiagramLayout['edges'] = Object.create(null);
  for (const e of edges) {
    edgeLayout[e.id] = { ...defaultPorts(nodeLayout[e.source], nodeLayout[e.target]),
      ...(plainEdges.has(e.id) ? { endMarker: 'none' as const } : {}), ...(dashedEdges.has(e.id) ? { dashed: true } : {}) };
  }
  return parseDocument({ version: 2, graph, layout: { nodes: nodeLayout, edges: edgeLayout }, profile: 'flow' });
}


export interface TextExportOptions { direction?: 'TD' | 'TB' | 'LR' | 'RL' | 'BT' }
const WRAP: Partial<Record<NodeShape, [string, string]>> = { cylinder: ['[(', ')]'], subprocess: ['[[', ']]'], hexagon: ['{{', '}}'], parallelogram: ['[/', '/]'], trapezoid: ['[/', '\\]'], rectangle: ['[', ']'], pill: ['([', '])'], diamond: ['{', '}'], ellipse: ['((', '))'] };
const shapeFor = (type: NodeType, shape?: NodeShape): NodeShape => shape ?? (type === 'decision' ? 'diamond' : type === 'start' || type === 'end' ? 'pill' : 'rectangle');
const mmEsc = (title: string): string => /["[\]{}()|]/.test(title) || title.trim() !== title || title === '' ? `"${title.replace(/"/g, '&quot;')}"` : title;
function wrapTitle(title: string, shape: NodeShape): string {
  const [l, r] = WRAP[shape] ?? WRAP.rectangle!;
  const needsQuote = /["[\]{}()|]/.test(title) || title.trim() !== title || title === '';
  return l + (needsQuote ? `"${title.replace(/"/g, '&quot;')}"` : title) + r;
}
/** Serializes a document back to Mermaid-like flowchart text. Encodes shape and structure, not arbitrary Kairo node types. */
export function toFlowText(document: DiagramDocument, options: TextExportOptions = {}): string {
  const lines = [`flowchart ${options.direction ?? 'TD'}`];
  const decl = (node: DiagramDocument['graph']['nodes'][number], indent: string): string =>
    `${indent}${node.id}${!document.layout.nodes[node.id]?.shape && node.type === 'database' ? `[(${mmEsc(node.title)})]` : !document.layout.nodes[node.id]?.shape && node.type === 'module' ? `[[${mmEsc(node.title)}]]` : wrapTitle(node.title, shapeFor(node.type, document.layout.nodes[node.id]?.shape))}`;
  const byGroup = new Map<string, DiagramDocument['graph']['nodes']>();
  for (const node of document.graph.nodes) (byGroup.get(node.group ?? '') ?? byGroup.set(node.group ?? '', []).get(node.group ?? '')!).push(node);
  for (const node of byGroup.get('') ?? []) lines.push(decl(node, '  '));
  let gi = 0;
  for (const [group, members] of byGroup) {
    if (!group) continue;
    lines.push(`  subgraph g${gi++}[${group.replace(/[\[\]]/g, '')}]`);
    for (const node of members) lines.push(decl(node, '    '));
    lines.push('  end');
  }
  for (const edge of document.graph.edges) {
    const route = document.layout.edges[edge.id];
    const op = route?.dashed ? '-.->' : route?.endMarker === 'none' ? '---' : '-->';
    const label = edge.label ? `|${edge.label.replace(/\|/g, ' ')}|` : '';
    lines.push(`  ${edge.source} ${op}${label} ${edge.target}`);
  }
  return lines.join('\n');
}


export interface StateImportOptions { nodeWidth?: number; nodeHeight?: number; gap?: number }
/** Imports a Mermaid stateDiagram / stateDiagram-v2 into a flow document. `[*]` becomes a shared start (as source) or end (as target). */
export function parseStateText(text: string, options: StateImportOptions = {}): DiagramDocument {
  const width = options.nodeWidth ?? 200, height = options.nodeHeight ?? 92, gap = options.gap ?? 64;
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(l => l && !l.startsWith('%%'));
  const nodes = new Map<string, { id: string; title: string; type: NodeType }>(), orderIds: string[] = [];
  const edges: DiagramEdge[] = [];
  const ensure = (id: string, title: string, type: NodeType): string => {
    let node = nodes.get(id);
    if (!node) { node = { id, title, type }; nodes.set(id, node); orderIds.push(id); }
    else if (title !== id && node.title === node.id) node.title = title;
    return id;
  };
  const START = '__start', END = '__end';
  const endpoint = (raw: string, role: 'source' | 'target'): string => {
    const t = raw.trim();
    if (t === '[*]') return role === 'source' ? ensure(START, 'Inicio', 'start') : ensure(END, 'Fin', 'end');
    return ensure(sanitizeState(t), t, 'process');
  };
  for (const raw of lines) {
    const line = raw.replace(/\{$/, '').trim();
    if (/^(stateDiagram(-v2)?|direction|note|}|\[\*\]$)/i.test(line) && !line.includes('-->')) continue;
    const alias = line.match(/^state\s+"([^"]*)"\s+as\s+([A-Za-z0-9_]+)/i);
    if (alias) { ensure(sanitizeState(alias[2]), alias[1], 'process'); continue; }
    const composite = line.match(/^state\s+([A-Za-z0-9_]+)/i);
    if (composite && !line.includes('-->')) { ensure(sanitizeState(composite[1]), composite[1], 'process'); continue; }
    if (line.includes('-->')) {
      const at = line.indexOf('-->'), left = line.slice(0, at), rest = line.slice(at + 3);
      const colon = rest.indexOf(':');
      const rightRaw = colon >= 0 ? rest.slice(0, colon) : rest;
      const label = colon >= 0 ? rest.slice(colon + 1).trim() : '';
      const source = endpoint(left, 'source'), target = endpoint(rightRaw, 'target');
      edges.push({ id: `e-${edges.length}`, source, target, ...(label ? { label } : {}) });
      continue;
    }
    const desc = line.match(/^([A-Za-z0-9_]+)\s*:/);
    if (desc) { ensure(sanitizeState(desc[1]), desc[1], 'process'); continue; }
    if (/^[A-Za-z0-9_]+$/.test(line)) ensure(sanitizeState(line), line, 'process');
  }
  if (!orderIds.length) throw new Error('El texto de estados no contiene estados.');
  const level = layers(orderIds, edges), perLevel = new Map<number, number>();
  const nodeLayout: DiagramLayout['nodes'] = Object.create(null);
  for (const id of orderIds) {
    const depth = level.get(id) ?? 0, slot = perLevel.get(depth) ?? 0; perLevel.set(depth, slot + 1);
    const node = nodes.get(id)!;
    nodeLayout[id] = { x: slot * (width + gap) + 80, y: depth * (height + gap) + 80, width, height, shape: node.type === 'process' ? 'rectangle' : 'pill' };
  }
  const graph: SemanticGraph = { nodes: orderIds.map(id => { const n = nodes.get(id)!; return { id: n.id, type: n.type, title: n.title }; }), edges };
  const edgeLayout: DiagramLayout['edges'] = Object.create(null);
  for (const e of edges) edgeLayout[e.id] = defaultPorts(nodeLayout[e.source], nodeLayout[e.target]);
  return parseDocument({ version: 2, graph, layout: { nodes: nodeLayout, edges: edgeLayout }, profile: 'flow' });
}
const sanitizeState = (raw: string): string => raw.replace(/[^A-Za-z0-9_]/g, '_').slice(0, 120) || 's';

export interface ClassImportOptions { nodeWidth?: number; nodeHeight?: number; gap?: number }
const CLASS_RELATIONS: ReadonlyArray<[string, string]> = [
  ['<|--', 'inheritance'], ['--|>', 'inheritance'], ['..|>', 'realization'], ['<|..', 'realization'],
  ['*--', 'composition'], ['--*', 'composition'], ['o--', 'aggregation'], ['--o', 'aggregation'],
  ['..>', 'dependency'], ['<..', 'dependency'], ['-->', 'association'], ['<--', 'association'], ['--', 'link'], ['..', 'dependency'],
];
/** Imports a Mermaid classDiagram: classes become `class` nodes (members summarized in `source`), relationships become edges with a `relation`. */
export function parseClassText(text: string, options: ClassImportOptions = {}): DiagramDocument {
  const width = options.nodeWidth ?? 220, height = options.nodeHeight ?? 92, gap = options.gap ?? 70;
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(l => l && !l.startsWith('%%'));
  const nodes = new Map<string, { id: string; title: string; members: string[] }>(), order: string[] = [];
  const edges: DiagramEdge[] = [];
  const ensure = (raw: string): string => { const id = sanitizeState(raw); if (!nodes.has(id)) { nodes.set(id, { id, title: raw, members: [] }); order.push(id); } return id; };
  const addMember = (id: string, member: string) => { const m = member.trim(); if (m) nodes.get(id)!.members.push(m); };
  let current: string | null = null;
  for (const raw of lines) {
    const line = raw.trim();
    if (/^(classDiagram(-v2)?|direction|note\b)/i.test(line)) continue;
    if (line === '}') { current = null; continue; }
    const block = line.match(/^class\s+([A-Za-z0-9_~]+)\s*\{?$/i) || line.match(/^class\s+([A-Za-z0-9_~]+)\s*\{/i);
    if (block) { current = ensure(block[1]); continue; }
    // relationship: strip cardinality quotes, then find an operator.
    const stripped = line.replace(/"[^"]*"/g, ' ');
    const rel = CLASS_RELATIONS.find(([op]) => stripped.includes(op));
    if (rel && !line.startsWith('class ')) {
      const [op, relation] = rel, at = stripped.indexOf(op);
      const left = stripped.slice(0, at).trim().split(/\s+/).pop() ?? '';
      let rest = stripped.slice(at + op.length).trim();
      const colon = rest.indexOf(':'); const label = colon >= 0 ? rest.slice(colon + 1).trim() : '';
      if (colon >= 0) rest = rest.slice(0, colon);
      const right = rest.trim().split(/\s+/)[0] ?? '';
      if (left && right) { edges.push({ id: `e-${edges.length}`, source: ensure(left), target: ensure(right), relation, ...(label ? { label } : {}) }); }
      continue;
    }
    const member = line.match(/^([A-Za-z0-9_~]+)\s*:\s*(.+)$/);
    if (member) { addMember(ensure(member[1]), member[2]); continue; }
    if (current && !/[{}]/.test(line)) { addMember(current, line); continue; }
    const bare = line.match(/^([A-Za-z0-9_~]+)$/);
    if (bare) ensure(bare[1]);
  }
  if (!order.length) throw new Error('El texto de clases no contiene clases.');
  const level = layers(order, edges), perLevel = new Map<number, number>();
  const nodeLayout: DiagramLayout['nodes'] = Object.create(null);
  for (const id of order) {
    const depth = level.get(id) ?? 0, slot = perLevel.get(depth) ?? 0; perLevel.set(depth, slot + 1);
    nodeLayout[id] = { x: slot * (width + gap) + 80, y: depth * (height + gap) + 80, width, height };
  }
  const graph: SemanticGraph = { nodes: order.map(id => { const n = nodes.get(id)!; return { id: n.id, type: 'class' as NodeType, title: n.title, ...(n.members.length ? { source: n.members.slice(0, 6).join(' · ') } : {}) }; }), edges };
  const edgeLayout: DiagramLayout['edges'] = Object.create(null);
  for (const e of edges) edgeLayout[e.id] = defaultPorts(nodeLayout[e.source], nodeLayout[e.target]);
  return parseDocument({ version: 2, graph, layout: { nodes: nodeLayout, edges: edgeLayout }, profile: 'uml' });
}

export interface ErImportOptions { nodeWidth?: number; nodeHeight?: number; gap?: number }
/** Imports a Mermaid erDiagram: entities become `database` nodes (attributes summarized in `source`), relationships become edges labelled by the verb phrase. */
export function parseErText(text: string, options: ErImportOptions = {}): DiagramDocument {
  const width = options.nodeWidth ?? 220, height = options.nodeHeight ?? 92, gap = options.gap ?? 70;
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(l => l && !l.startsWith('%%'));
  const nodes = new Map<string, { id: string; title: string; members: string[] }>(), order: string[] = [];
  const edges: DiagramEdge[] = [];
  const ensure = (raw: string): string => { const id = sanitizeState(raw); if (!nodes.has(id)) { nodes.set(id, { id, title: raw, members: [] }); order.push(id); } return id; };
  let current: string | null = null;
  const rel = /^(\S+)\s+[|}{o]*--[|}{o.]*\s+(\S+)\s*:\s*(.+)$/;
  for (const raw of lines) {
    const line = raw.trim();
    if (/^erDiagram\b/i.test(line)) continue;
    if (line === '}') { current = null; continue; }
    const block = line.match(/^([A-Za-z0-9_-]+)\s*\{$/);
    if (block) { current = ensure(block[1]); continue; }
    const relation = line.match(rel);
    if (relation) { const a = ensure(relation[1]), b = ensure(relation[2]); edges.push({ id: `e-${edges.length}`, source: a, target: b, relation: 'er', label: relation[3].trim().replace(/^"|"$/g, '') }); continue; }
    if (current && !/[{}]/.test(line)) { const m = line.trim(); if (m) nodes.get(current)!.members.push(m); continue; }
    const bare = line.match(/^([A-Za-z0-9_-]+)$/);
    if (bare) ensure(bare[1]);
  }
  if (!order.length) throw new Error('El texto ER no contiene entidades.');
  const level = layers(order, edges), perLevel = new Map<number, number>();
  const nodeLayout: DiagramLayout['nodes'] = Object.create(null);
  for (const id of order) { const depth = level.get(id) ?? 0, slot = perLevel.get(depth) ?? 0; perLevel.set(depth, slot + 1); nodeLayout[id] = { x: slot * (width + gap) + 80, y: depth * (height + gap) + 80, width, height }; }
  const graph: SemanticGraph = { nodes: order.map(id => { const n = nodes.get(id)!; return { id: n.id, type: 'database' as NodeType, title: n.title, ...(n.members.length ? { source: n.members.slice(0, 6).join(' · ') } : {}) }; }), edges };
  const edgeLayout: DiagramLayout['edges'] = Object.create(null);
  for (const e of edges) edgeLayout[e.id] = defaultPorts(nodeLayout[e.source], nodeLayout[e.target]);
  return parseDocument({ version: 2, graph, layout: { nodes: nodeLayout, edges: edgeLayout }, profile: 'er' });
}

/** Detects the Mermaid dialect from the header and dispatches to the right importer (flowchart by default). */
/** Imports a Mermaid `mindmap`: indentation defines the hierarchy, each line a node, parent → child edges.
 * Node shapes come from the bracket form (`((x))` ellipse, `(x)` pill, `[x]` square, `{{x}}` diamond). */
export function parseMindmap(text: string, options: TextImportOptions = {}): DiagramDocument {
  const width = options.nodeWidth ?? 200, height = options.nodeHeight ?? 92, gap = options.gap ?? 64;
  const rawLines = text.split(/\r?\n/);
  const start = rawLines.findIndex(l => /^\s*mindmap\b/i.test(l));
  const body = rawLines.slice(start >= 0 ? start + 1 : 0).filter(l => l.trim() && !l.trim().startsWith('%%'));
  const mindNode = (raw: string): { title: string; shape?: NodeShape } => {
    let m: RegExpExecArray | null;
    if ((m = /^(?:\w+\s*)?\(\((.+)\)\)$/.exec(raw))) return { title: m[1].trim(), shape: 'ellipse' };
    if ((m = /^(?:\w+\s*)?\{\{(.+)\}\}$/.exec(raw))) return { title: m[1].trim(), shape: 'diamond' };
    if ((m = /^(?:\w+\s*)?\[(.+)\]$/.exec(raw))) return { title: m[1].trim(), shape: 'rectangle' };
    if ((m = /^(?:\w+\s*)?\((.+)\)$/.exec(raw))) return { title: m[1].trim(), shape: 'pill' };
    return { title: raw };
  };
  const used = new Set<string>();
  const uniqueId = (title: string): string => {
    const base = title.replace(/[^A-Za-z0-9_-]/g, '_').slice(0, 100) || 'n';
    let id = base, i = 2; while (used.has(id)) id = `${base}-${i++}`;
    used.add(id); return id;
  };
  const nodes: { id: string; title: string; shape?: NodeShape }[] = [];
  const edges: DiagramEdge[] = [];
  const stack: { indent: number; id: string }[] = [];
  for (const line of body) {
    const indent = (/^\s*/.exec(line)![0]).replace(/\t/g, '  ').length;
    const spec = mindNode(line.trim());
    const id = uniqueId(spec.title);
    nodes.push({ id, title: spec.title, shape: spec.shape });
    while (stack.length && stack[stack.length - 1].indent >= indent) stack.pop();
    const parent = stack.length ? stack[stack.length - 1].id : null;
    if (parent) edges.push({ id: `e-${edges.length}`, source: parent, target: id });
    stack.push({ indent, id });
  }
  if (!nodes.length) throw new Error('El mindmap no contiene nodos.');
  const order = nodes.map(n => n.id);
  const level = layers(order, edges), perLevel = new Map<number, number>();
  const nodeLayout: DiagramLayout['nodes'] = Object.create(null);
  for (const n of nodes) {
    const depth = level.get(n.id) ?? 0, slot = perLevel.get(depth) ?? 0; perLevel.set(depth, slot + 1);
    nodeLayout[n.id] = { x: slot * (width + gap) + 80, y: depth * (height + gap) + 80, width, height, ...(n.shape ? { shape: n.shape } : {}) };
  }
  const graph: SemanticGraph = { nodes: nodes.map(n => ({ id: n.id, type: 'process' as NodeType, title: n.title })), edges };
  const edgeLayout: DiagramLayout['edges'] = Object.create(null);
  for (const e of edges) edgeLayout[e.id] = defaultPorts(nodeLayout[e.source], nodeLayout[e.target]);
  return parseDocument({ version: 2, profile: 'mindmap', graph, layout: { nodes: nodeLayout, edges: edgeLayout } });
}

/** Serializes a document to a Mermaid `mindmap`: a spanning tree from the roots, indentation = depth.
 * Node shapes map to bracket forms (ellipse `((x))`, pill `(x)`, rectangle `[x]`, diamond `{{x}}`).
 * Inverse of parseMindmap for trees; for a general graph it emits a spanning tree (extra edges dropped). */
export function toMindmap(document: DiagramDocument): string {
  const g = document.graph;
  const title = new Map(g.nodes.map(n => [n.id, n.title]));
  const out = new Map<string, string[]>(), indeg = new Map(g.nodes.map(n => [n.id, 0]));
  for (const e of g.edges) {
    if (e.source === e.target || !title.has(e.source) || !title.has(e.target)) continue;
    (out.get(e.source) ?? out.set(e.source, []).get(e.source)!).push(e.target);
    indeg.set(e.target, (indeg.get(e.target) ?? 0) + 1);
  }
  const roots = g.nodes.map(n => n.id).filter(id => (indeg.get(id) ?? 0) === 0);
  const starts = roots.length ? roots : g.nodes.slice(0, 1).map(n => n.id);
  const shaped = (id: string): string => {
    const t = title.get(id) ?? id, shape = document.layout.nodes[id]?.shape;
    if (shape === 'ellipse') return `((${t}))`;
    if (shape === 'pill') return `(${t})`;
    if (shape === 'diamond') return `{{${t}}}`;
    if (shape === 'rectangle') return `[${t}]`;
    return t;
  };
  const lines = ['mindmap'];
  const seen = new Set<string>();
  const walk = (id: string, depth: number): void => {
    if (seen.has(id)) return;
    seen.add(id);
    lines.push('  '.repeat(depth + 1) + shaped(id));
    for (const child of out.get(id) ?? []) walk(child, depth + 1);
  };
  for (const r of starts) walk(r, 0);
  for (const n of g.nodes) if (!seen.has(n.id)) walk(n.id, 0); // disconnected leftovers
  return lines.join('\n');
}

/** Imports a Mermaid `sequenceDiagram` as an interaction graph: participants become nodes, messages
 * become directed edges (label = message text, dashed for `--` arrows). Control blocks (loop/alt/opt/note…)
 * are ignored. Lossy (no lifelines/ordering beyond edge order), but captures who talks to whom. */
export function parseSequence(text: string, options: TextImportOptions = {}): DiagramDocument {
  const width = options.nodeWidth ?? 200, height = options.nodeHeight ?? 92, gap = options.gap ?? 64;
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(l => l && !l.startsWith('%%') && !/^sequenceDiagram\b/i.test(l));
  const nodes = new Map<string, { id: string; title: string }>(), order: string[] = [];
  const edges: DiagramEdge[] = [], dashed = new Set<string>();
  const ensure = (id: string, title?: string): string => {
    let node = nodes.get(id);
    if (!node) { node = { id, title: title ?? id }; nodes.set(id, node); order.push(id); }
    else if (title && node.title === id) node.title = title;
    return id;
  };
  const decl = /^(?:participant|actor)\s+([A-Za-z0-9_]+)(?:\s+as\s+(.+))?$/i;
  const msg = /^([A-Za-z0-9_]+)\s*(--?(?:>>|>|x|\)))\s*[+-]?\s*([A-Za-z0-9_]+)\s*:\s*(.*)$/;
  const skip = /^(note|loop|alt|else|opt|end|activate|deactivate|par|and|rect|critical|break|box|autonumber|title)\b/i;
  for (const line of lines) {
    if (skip.test(line)) continue;
    const d = decl.exec(line);
    if (d) { ensure(d[1], d[2]?.trim()); continue; }
    const m = msg.exec(line);
    if (m) {
      const s2 = ensure(m[1]), t2 = ensure(m[3]), id = `e-${edges.length}`;
      edges.push({ id, source: s2, target: t2, ...(m[4].trim() ? { label: m[4].trim() } : {}) });
      if (m[2].startsWith('--')) dashed.add(id);
    }
  }
  if (!order.length) throw new Error('El diagrama de secuencia no contiene participantes.');
  const level = layers(order, edges), perLevel = new Map<number, number>();
  const nodeLayout: DiagramLayout['nodes'] = Object.create(null);
  for (const id of order) {
    const depth = level.get(id) ?? 0, slot = perLevel.get(depth) ?? 0; perLevel.set(depth, slot + 1);
    nodeLayout[id] = { x: slot * (width + gap) + 80, y: depth * (height + gap) + 80, width, height };
  }
  const graph: SemanticGraph = { nodes: order.map(id => { const n = nodes.get(id)!; return { id: n.id, type: 'process' as const, title: n.title }; }), edges };
  const edgeLayout: DiagramLayout['edges'] = Object.create(null);
  for (const e of edges) edgeLayout[e.id] = { ...defaultPorts(nodeLayout[e.source], nodeLayout[e.target]), ...(dashed.has(e.id) ? { dashed: true } : {}) };
  return parseDocument({ version: 2, graph, layout: { nodes: nodeLayout, edges: edgeLayout } });
}
/** Serializes a document to a Mermaid `sequenceDiagram`: participants then one message per edge (dashed edges use `-->>`). */
export function toSequence(document: DiagramDocument): string {
  const lines = ['sequenceDiagram'];
  for (const node of document.graph.nodes) lines.push(node.title === node.id ? `  participant ${node.id}` : `  participant ${node.id} as ${node.title.replace(/\n/g, ' ')}`);
  for (const edge of document.graph.edges) {
    const arrow = document.layout.edges[edge.id]?.dashed ? '-->>' : '->>';
    lines.push(`  ${edge.source}${arrow}${edge.target}: ${(edge.label ?? '').replace(/\n/g, ' ')}`);
  }
  return lines.join('\n');
}

export function parseMermaid(text: string): DiagramDocument {
  const head = text.split(/\r?\n/).map(l => l.trim()).find(l => l && !l.startsWith('%%')) ?? '';
  if (/^stateDiagram/i.test(head)) return parseStateText(text);
  if (/^classDiagram/i.test(head)) return parseClassText(text);
  if (/^erDiagram/i.test(head)) return parseErText(text);
  if (/^mindmap/i.test(head)) return parseMindmap(text);
  if (/^sequenceDiagram/i.test(head)) return parseSequence(text);
  return parseFlowText(text);
}
/** Serializes a flow document to Mermaid stateDiagram-v2. Start/end nodes map back to `[*]`; transition labels are preserved. */
export function toStateText(document: DiagramDocument): string {
  const typeById = new Map(document.graph.nodes.map(n => [n.id, n.type]));
  const lines = ['stateDiagram-v2'];
  for (const edge of document.graph.edges) {
    const src = typeById.get(edge.source) === 'start' ? '[*]' : edge.source;
    const tgt = typeById.get(edge.target) === 'end' ? '[*]' : edge.target;
    lines.push(`  ${src} --> ${tgt}${edge.label ? ` : ${edge.label}` : ''}`);
  }
  const connected = new Set(document.graph.edges.flatMap(e => [e.source, e.target]));
  for (const node of document.graph.nodes) if (!connected.has(node.id) && node.type !== 'start' && node.type !== 'end') lines.push(`  ${node.id}`);
  return lines.join('\n');
}

const CLASS_OP: Record<string, string> = { inheritance: '<|--', realization: '..|>', composition: '*--', aggregation: 'o--', dependency: '..>', association: '-->', link: '--' };
/** Serializes a UML document to Mermaid classDiagram. Members (from `source`, split by ' · ') are emitted inside a class block. */
export function toClassText(document: DiagramDocument): string {
  const lines = ['classDiagram'];
  for (const node of document.graph.nodes) {
    const members = node.source ? node.source.split(' · ').map(m => m.trim()).filter(Boolean) : [];
    if (members.length) { lines.push(`  class ${node.id} {`); for (const m of members) lines.push(`    ${m}`); lines.push('  }'); }
    else lines.push(`  class ${node.id}`);
  }
  for (const edge of document.graph.edges) lines.push(`  ${edge.source} ${CLASS_OP[edge.relation ?? 'association'] ?? '-->'} ${edge.target}${edge.label ? ` : ${edge.label}` : ''}`);
  return lines.join('\n');
}
/** Serializes an ER document to Mermaid erDiagram. Cardinality is not stored, so a neutral `||--||` is used; attributes come from `source`. */
export function toErText(document: DiagramDocument): string {
  const lines = ['erDiagram'];
  for (const edge of document.graph.edges) lines.push(`  ${edge.source} ||--|| ${edge.target} : ${edge.label || 'rel'}`);
  for (const node of document.graph.nodes) {
    const attrs = node.source ? node.source.split(' · ').map(a => a.trim()).filter(Boolean) : [];
    if (attrs.length) { lines.push(`  ${node.id} {`); for (const a of attrs) lines.push(`    ${a}`); lines.push('  }'); }
  }
  return lines.join('\n');
}
/** Exports to the Mermaid dialect that matches the document profile (uml→class, er→er, mindmap→mindmap, else flowchart). */
export function toMermaid(document: DiagramDocument): string {
  if (document.profile === 'uml') return toClassText(document);
  if (document.profile === 'er') return toErText(document);
  if (document.profile === 'mindmap') return toMindmap(document);
  return toFlowText(document);
}

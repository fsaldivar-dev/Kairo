import type { DiagramDocument, DiagramEdge, DiagramLayout, SemanticGraph } from './types';
import { parseDocument } from './document';
import { defaultPorts } from './geometry';
import { layers } from './layout';

/** Mermaid `block-beta` importer — turns a block diagram back into a Kairo graph. A block declaration
 * `id["Label"]` (also `( )`, `{ }`, `< >`, or a bare `id`) becomes a node, and an arrow `a --> b` (or
 * `a -- "label" --> b`) becomes an edge. The inverse of {@link toMermaidBlock}. The grid directives
 * (`columns`, `space`) are ignored. No eval. */
export interface BlockImportOptions { nodeWidth?: number; nodeHeight?: number; gap?: number }

const sanitize = (raw: string): string => raw.replace(/[^A-Za-z0-9_-]/g, '_').slice(0, 120) || 'n';
const EDGE = /^(\w+)\s*--\s*(?:"([^"]*)"\s*--)?>\s*(\w+)/;
const DECL = /^(\w+)(?:\s*[[({<]+\s*"?(.*?)"?\s*[\])}>]+)?(?:\s*:\s*\d+)?\s*$/;

/** Parses a Mermaid block-beta document into a validated v2 diagram (layered layout). Throws when no blocks are
 * found. Arrow endpoints that were never declared as blocks are created on demand. */
export function parseMermaidBlock(text: string, options: BlockImportOptions = {}): DiagramDocument {
  const width = options.nodeWidth ?? 200, height = options.nodeHeight ?? 92, gap = options.gap ?? 64;
  const lines = text.replace(/\r\n?/g, '\n').split('\n');
  const order: string[] = [], used = new Set<string>();
  const idByToken = new Map<string, string>(), titleById = new Map<string, string>();
  const node = (token: string, label?: string): string => {
    const existing = idByToken.get(token);
    if (existing) { if (label) titleById.set(existing, label); return existing; }
    let id = sanitize(token), i = 2; while (used.has(id)) id = `${sanitize(token)}-${i++}`;
    used.add(id); idByToken.set(token, id); titleById.set(id, label || token); order.push(id); return id;
  };
  type Raw = { a: string; b: string; label?: string };
  const rawEdges: Raw[] = [];
  for (const line0 of lines) {
    const line = line0.trim().replace(/^block:/, ''); // treat a nested "block:id" as a plain block id
    if (!line || line.startsWith('%%') || /^block-beta\b/i.test(line) || /^columns\b/i.test(line) || /^space\b/i.test(line)) continue;
    const edge = EDGE.exec(line);
    if (edge) { rawEdges.push({ a: edge[1], b: edge[3], label: edge[2] }); continue; }
    const decl = DECL.exec(line);
    if (decl) node(decl[1], decl[2]?.trim() || undefined);
  }
  const edges: DiagramEdge[] = [];
  for (const re of rawEdges) {
    const s = node(re.a), t = node(re.b);
    if (s !== t) edges.push({ id: `e${edges.length}`, source: s, target: t, ...(re.label ? { label: re.label } : {}) });
  }
  if (!order.length) throw new Error('El documento block-beta no contiene bloques.');

  const level = layers(order, edges), perLevel = new Map<number, number>();
  const nodeLayout: DiagramLayout['nodes'] = Object.create(null);
  for (const id of order) {
    const depth = level.get(id) ?? 0, slot = perLevel.get(depth) ?? 0; perLevel.set(depth, slot + 1);
    nodeLayout[id] = { x: slot * (width + gap) + 80, y: depth * (height + gap) + 80, width, height };
  }
  const nodes: SemanticGraph['nodes'] = order.map(id => ({ id, type: 'process', title: titleById.get(id)! }));
  const edgeLayout: DiagramLayout['edges'] = Object.create(null);
  for (const e of edges) edgeLayout[e.id] = defaultPorts(nodeLayout[e.source], nodeLayout[e.target]);
  return parseDocument({ version: 2, graph: { nodes, edges }, layout: { nodes: nodeLayout, edges: edgeLayout } });
}

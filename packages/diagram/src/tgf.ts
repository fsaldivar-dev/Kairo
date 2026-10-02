import type { DiagramDocument, DiagramEdge, DiagramLayout, SemanticGraph } from './types';
import { parseDocument } from './document';
import { defaultPorts } from './geometry';
import { layers } from './layout';

/** TGF (Trivial Graph Format) interop — the minimal node/edge text format read by yEd and other graph tools:
 * a list of `<id> <label>` node lines, a single `#` separator, then `<source> <target> <label>` edge lines.
 * Dead simple and lossless for structure + labels. No eval. */
export interface TgfImportOptions { nodeWidth?: number; nodeHeight?: number; gap?: number }

const sanitize = (raw: string): string => raw.replace(/[^A-Za-z0-9_-]/g, '_').slice(0, 120) || 'n';

/** Parses a TGF document into a validated v2 diagram with a deterministic layered layout. */
export function fromTgf(text: string, options: TgfImportOptions = {}): DiagramDocument {
  const width = options.nodeWidth ?? 200, height = options.nodeHeight ?? 92, gap = options.gap ?? 64;
  const lines = text.replace(/\r\n?/g, '\n').split('\n');
  const idMap = new Map<string, string>(), used = new Set<string>(), order: string[] = [], titleById = new Map<string, string>();
  const edges: DiagramEdge[] = [];
  let inEdges = false;
  const ensure = (rawId: string, label?: string): string => {
    const existing = idMap.get(rawId); if (existing) { if (label && titleById.get(existing) === rawId) titleById.set(existing, label); return existing; }
    let id = sanitize(rawId), i = 2; while (used.has(id)) id = `${sanitize(rawId)}-${i++}`;
    used.add(id); idMap.set(rawId, id); order.push(id); titleById.set(id, label || rawId); return id;
  };
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;
    if (line === '#') { inEdges = true; continue; }
    if (!inEdges) {
      const m = /^(\S+)(?:\s+(.*))?$/.exec(line); if (!m) continue;
      ensure(m[1], m[2]?.trim());
    } else {
      const m = /^(\S+)\s+(\S+)(?:\s+(.*))?$/.exec(line); if (!m) continue;
      const s = idMap.get(m[1]), t = idMap.get(m[2]);
      if (s && t) edges.push({ id: `e${edges.length}`, source: s, target: t, ...(m[3]?.trim() ? { label: m[3].trim() } : {}) });
    }
  }
  if (!order.length) throw new Error('El documento TGF no declara nodos.');
  const level = layers(order, edges), perLevel = new Map<number, number>();
  const nodeLayout: DiagramLayout['nodes'] = Object.create(null);
  for (const id of order) {
    const depth = level.get(id) ?? 0, slot = perLevel.get(depth) ?? 0; perLevel.set(depth, slot + 1);
    nodeLayout[id] = { x: slot * (width + gap) + 80, y: depth * (height + gap) + 80, width, height };
  }
  const graph: SemanticGraph = { nodes: order.map(id => ({ id, type: 'process', title: titleById.get(id)! })), edges };
  const edgeLayout: DiagramLayout['edges'] = Object.create(null);
  for (const e of edges) edgeLayout[e.id] = defaultPorts(nodeLayout[e.source], nodeLayout[e.target]);
  return parseDocument({ version: 2, graph, layout: { nodes: nodeLayout, edges: edgeLayout } });
}

const oneLine = (s: string): string => s.replace(/\r?\n/g, ' ').trim();
/** Serializes a document to TGF: numbered node lines (`<i> <title>`), a `#` separator, then `<src> <tgt> <label>`
 * edge lines using the same numbering. yEd and other tools read it. Pure. */
export function toTgf(document: DiagramDocument): string {
  const index = new Map(document.graph.nodes.map((n, i) => [n.id, i + 1]));
  const out = document.graph.nodes.map((n, i) => `${i + 1} ${oneLine(n.title)}`.trimEnd());
  out.push('#');
  for (const e of document.graph.edges) {
    const s = index.get(e.source), t = index.get(e.target);
    if (s !== undefined && t !== undefined) out.push(`${s} ${t}${e.label ? ` ${oneLine(e.label)}` : ''}`);
  }
  return out.join('\n') + '\n';
}

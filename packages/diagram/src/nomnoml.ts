import type { DiagramDocument, DiagramEdge, DiagramLayout, SemanticGraph } from './types';
import { parseDocument } from './document';
import { defaultPorts } from './geometry';
import { layers } from './layout';

/** nomnoml interop (nomnoml.com) — a popular standalone text-diagram language, distinct from Mermaid/D2/PlantUML.
 * A practical subset: `[Node]` declarations and `[A] label -> [B]` associations (connectors `->`, `<->`, `-->`,
 * `--`, `-`). Node compartments (`[Name|fields]`) collapse to the name; `#directive:` lines and `//` comments are
 * ignored. No eval; labels stay data. */
export interface NomnomlImportOptions { nodeWidth?: number; nodeHeight?: number; gap?: number }

const sanitize = (raw: string): string => raw.replace(/[^A-Za-z0-9_-]/g, '_').slice(0, 120) || 'n';
const unesc = (s: string): string => s.replace(/\\([\[\]|;\\])/g, '$1').trim();
// A bracket node, an optional label, a connector, and another bracket node.
const REL = /\[([^\]]*)\]\s*([^[\]]*?)\s*(<->|-->|->|--|-)\s*\[([^\]]*)\]/g;
const nameOf = (bracket: string): string => unesc(bracket.split('|')[0]);

/** Parses a nomnoml source into a validated v2 diagram with a deterministic layered layout. */
export function fromNomnoml(text: string, options: NomnomlImportOptions = {}): DiagramDocument {
  const width = options.nodeWidth ?? 200, height = options.nodeHeight ?? 92, gap = options.gap ?? 64;
  const idByName = new Map<string, string>(), used = new Set<string>(), order: string[] = [];
  const titleById = new Map<string, string>(), edges: DiagramEdge[] = [];
  const ensure = (name: string): string => {
    const key = name || 'n';
    const existing = idByName.get(key); if (existing) return existing;
    let id = sanitize(key), i = 2; while (used.has(id)) id = `${sanitize(key)}-${i++}`;
    used.add(id); idByName.set(key, id); order.push(id); titleById.set(id, key); return id;
  };
  for (const raw of text.replace(/\r\n?/g, '\n').split('\n')) {
    const line = raw.trim();
    if (!line || line.startsWith('#') || line.startsWith('//')) continue;
    let matched = false;
    REL.lastIndex = 0;
    for (let m = REL.exec(line); m; m = REL.exec(line)) {
      matched = true;
      const s = ensure(nameOf(m[1])), t = ensure(nameOf(m[4])), label = unesc(m[2]);
      edges.push({ id: `e${edges.length}`, source: s, target: t, ...(label ? { label } : {}) });
    }
    if (!matched) { const b = /^\[([^\]]*)\]/.exec(line); if (b) ensure(nameOf(b[1])); } // a lone node declaration
  }
  if (!order.length) throw new Error('El documento nomnoml no declara nodos.');
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

const esc = (s: string): string => s.replace(/[\[\]|;\\]/g, m => '\\' + m).replace(/\r?\n/g, ' ');
export interface NomnomlExportOptions { direction?: 'down' | 'right' }
/** Serializes a document to nomnoml source: an optional `#direction` directive, then one `[source] label -> [target]`
 * association per edge (plus any isolated nodes as bare `[node]`). Nodes are identified by their title. Pure. */
export function toNomnoml(document: DiagramDocument, options: NomnomlExportOptions = {}): string {
  const title = new Map(document.graph.nodes.map(n => [n.id, n.title]));
  const out: string[] = [];
  if (options.direction) out.push(`#direction: ${options.direction}`, '');
  const connected = new Set<string>();
  for (const e of document.graph.edges) {
    const s = title.get(e.source), t = title.get(e.target);
    if (s === undefined || t === undefined) continue;
    connected.add(e.source); connected.add(e.target);
    out.push(`[${esc(s)}]${e.label ? ` ${esc(e.label)}` : ''} -> [${esc(t)}]`);
  }
  for (const n of document.graph.nodes) if (!connected.has(n.id)) out.push(`[${esc(n.title)}]`);
  return out.join('\n') + '\n';
}

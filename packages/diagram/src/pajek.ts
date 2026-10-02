import type { DiagramDocument, DiagramEdge, DiagramLayout, SemanticGraph } from './types';
import { parseDocument } from './document';
import { defaultPorts } from './geometry';
import { layers } from './layout';

/** Pajek (.net) interop — the network format used by Pajek, NetworkX (`read_pajek`/`write_pajek`), igraph and
 * Gephi for social-network and large-graph analysis. A practical subset: a `*Vertices` block (1-based id +
 * quoted label, optional coordinates ignored) and `*Arcs`/`*Edges` pairs plus their `*Arcslist`/`*Edgeslist`
 * adjacency forms. `%` starts a comment. No eval; labels stay data. */
export interface PajekImportOptions { nodeWidth?: number; nodeHeight?: number; gap?: number }

const sanitize = (raw: string): string => raw.replace(/[^A-Za-z0-9_-]/g, '_').slice(0, 120) || 'n';

/** Parses a Pajek document into a validated v2 diagram with a deterministic layered layout. */
export function fromPajek(text: string, options: PajekImportOptions = {}): DiagramDocument {
  const width = options.nodeWidth ?? 200, height = options.nodeHeight ?? 92, gap = options.gap ?? 64;
  const idMap = new Map<number, string>(), used = new Set<string>();
  const nodes: SemanticGraph['nodes'] = [], edges: DiagramEdge[] = [];
  let section = '';
  const addEdge = (a: number, b: number): void => { const s = idMap.get(a), t = idMap.get(b); if (s && t) edges.push({ id: `e${edges.length}`, source: s, target: t }); };
  for (const raw of text.replace(/\r\n?/g, '\n').split('\n')) {
    const line = raw.trim();
    if (!line || line.startsWith('%')) continue;
    if (line[0] === '*') {
      const h = line.toLowerCase();
      section = h.startsWith('*vertices') ? 'vertices'
        : h.startsWith('*arcslist') ? 'arclist' : h.startsWith('*edgeslist') ? 'arclist'
        : h.startsWith('*arcs') ? 'pairs' : h.startsWith('*edges') ? 'pairs' : '';
      continue;
    }
    if (section === 'vertices') {
      const m = /^(\d+)\s+(?:"([^"]*)"|(\S+))/.exec(line);
      if (!m) continue;
      const idx = +m[1], label = m[2] ?? m[3] ?? `v${idx}`;
      let id = sanitize(label), k = 2; while (used.has(id)) id = `${sanitize(label)}-${k++}`;
      used.add(id); idMap.set(idx, id); nodes.push({ id, type: 'process', title: label });
    } else if (section === 'pairs') {
      const p = line.split(/\s+/); const a = +p[0], b = +p[1];
      if (Number.isFinite(a) && Number.isFinite(b)) addEdge(a, b);
    } else if (section === 'arclist') {
      const p = line.split(/\s+/).map(Number); if (!Number.isFinite(p[0])) continue;
      for (let j = 1; j < p.length; j++) if (Number.isFinite(p[j])) addEdge(p[0], p[j]);
    }
  }
  if (!nodes.length) throw new Error('El documento Pajek no declara vértices (falta `*Vertices`).');

  const order = nodes.map(n => n.id), level = layers(order, edges), perLevel = new Map<number, number>();
  const nodeLayout: DiagramLayout['nodes'] = Object.create(null);
  for (const id of order) {
    const depth = level.get(id) ?? 0, slot = perLevel.get(depth) ?? 0; perLevel.set(depth, slot + 1);
    nodeLayout[id] = { x: slot * (width + gap) + 80, y: depth * (height + gap) + 80, width, height };
  }
  const edgeLayout: DiagramLayout['edges'] = Object.create(null);
  for (const e of edges) edgeLayout[e.id] = defaultPorts(nodeLayout[e.source], nodeLayout[e.target]);
  return parseDocument({ version: 2, graph: { nodes, edges }, layout: { nodes: nodeLayout, edges: edgeLayout } });
}

/** Serializes a document to Pajek (.net): a `*Vertices` block (1-based ids, quoted titles) and an `*Arcs` block
 * of directed `source target 1` lines. NetworkX/igraph/Pajek read it. Pure. */
export function toPajek(document: DiagramDocument): string {
  const index = new Map(document.graph.nodes.map((n, i) => [n.id, i + 1]));
  const q = (s: string): string => `"${s.replace(/"/g, "'").replace(/\r?\n/g, ' ')}"`;
  const out: string[] = [`*Vertices ${document.graph.nodes.length}`];
  document.graph.nodes.forEach((n, i) => out.push(`${i + 1} ${q(n.title)}`));
  out.push('*Arcs');
  for (const e of document.graph.edges) {
    const s = index.get(e.source), t = index.get(e.target);
    if (s !== undefined && t !== undefined) out.push(`${s} ${t} 1`);
  }
  return out.join('\n') + '\n';
}

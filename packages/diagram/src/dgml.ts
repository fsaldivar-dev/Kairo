import type { DiagramDocument, DiagramEdge, DiagramLayout, SemanticGraph } from './types';
import { nodeTypes } from './types';
import { parseDocument } from './document';
import { defaultPorts } from './geometry';
import { layers } from './layout';

/** DGML (Directed Graph Markup Language) interop — the XML graph format used by Visual Studio's architecture
 * tools and standalone DGML viewers: a `<DirectedGraph>` with `<Nodes>` (`<Node Id= Label= Category=/>`) and
 * `<Links>` (`<Link Source= Target= Label=/>`). Structure, labels and node category (↔ our type) round-trip.
 * Regex-based, dependency-free; no XML entity expansion, so no XXE. */
export interface DgmlImportOptions { nodeWidth?: number; nodeHeight?: number; gap?: number }

const sanitize = (raw: string): string => raw.replace(/[^A-Za-z0-9_-]/g, '_').slice(0, 120) || 'n';
const decode = (s: string): string => s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(+d)).replace(/&amp;/g, '&');
const encode = (s: string): string => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const known = new Set<string>(nodeTypes);
const attr = (tag: string, name: string): string | undefined => {
  const m = new RegExp(`\\b${name}\\s*=\\s*"([^"]*)"`, 'i').exec(tag) ?? new RegExp(`\\b${name}\\s*=\\s*'([^']*)'`, 'i').exec(tag);
  return m ? decode(m[1]) : undefined;
};

/** Parses a DGML document into a validated v2 diagram with a deterministic layered layout. A node's `Category`
 * becomes its type when it names one of ours, otherwise `process`. Links to undeclared nodes create them. */
export function fromDgml(text: string, options: DgmlImportOptions = {}): DiagramDocument {
  const width = options.nodeWidth ?? 200, height = options.nodeHeight ?? 92, gap = options.gap ?? 64;
  const idMap = new Map<string, string>(), used = new Set<string>(), order: string[] = [];
  const titleById = new Map<string, string>(), typeById = new Map<string, string>();
  const ensure = (rawId: string, label?: string, category?: string): string => {
    const existing = idMap.get(rawId);
    if (existing) { if (label) titleById.set(existing, label); if (category && known.has(category)) typeById.set(existing, category); return existing; }
    let id = sanitize(rawId), i = 2; while (used.has(id)) id = `${sanitize(rawId)}-${i++}`;
    used.add(id); idMap.set(rawId, id); order.push(id);
    titleById.set(id, label || rawId); typeById.set(id, category && known.has(category) ? category : 'process');
    return id;
  };
  for (const m of text.matchAll(/<Node\b([^>]*?)\/?>/gi)) {
    const tag = m[1], rawId = attr(tag, 'Id'); if (!rawId) continue;
    ensure(rawId, attr(tag, 'Label'), attr(tag, 'Category'));
  }
  const edges: DiagramEdge[] = [];
  for (const m of text.matchAll(/<Link\b([^>]*?)\/?>/gi)) {
    const tag = m[1], src = attr(tag, 'Source'), tgt = attr(tag, 'Target'); if (!src || !tgt) continue;
    const s = idMap.get(src) ?? ensure(src), t = idMap.get(tgt) ?? ensure(tgt), label = attr(tag, 'Label');
    edges.push({ id: `e${edges.length}`, source: s, target: t, ...(label ? { label } : {}) });
  }
  if (!order.length) throw new Error('El documento DGML no declara nodos.');
  const level = layers(order, edges), perLevel = new Map<number, number>();
  const nodeLayout: DiagramLayout['nodes'] = Object.create(null);
  for (const id of order) {
    const depth = level.get(id) ?? 0, slot = perLevel.get(depth) ?? 0; perLevel.set(depth, slot + 1);
    nodeLayout[id] = { x: slot * (width + gap) + 80, y: depth * (height + gap) + 80, width, height };
  }
  const graph: SemanticGraph = { nodes: order.map(id => ({ id, type: typeById.get(id)! as SemanticGraph['nodes'][number]['type'], title: titleById.get(id)! })), edges };
  const edgeLayout: DiagramLayout['edges'] = Object.create(null);
  for (const e of edges) edgeLayout[e.id] = defaultPorts(nodeLayout[e.source], nodeLayout[e.target]);
  return parseDocument({ version: 2, graph, layout: { nodes: nodeLayout, edges: edgeLayout } });
}

const oneLine = (s: string): string => s.replace(/\r?\n/g, ' ').trim();
/** Serializes a document to DGML: a `<DirectedGraph>` with `<Node Id Label Category>` and `<Link Source Target
 * Label>`. The node type is written as `Category` (Visual Studio groups and colours by it). Pure. */
export function toDgml(document: DiagramDocument): string {
  const nodes = document.graph.nodes
    .map(n => `    <Node Id="${encode(n.id)}" Label="${encode(oneLine(n.title))}" Category="${encode(n.type)}" />`)
    .join('\n');
  const links = document.graph.edges
    .map(e => `    <Link Source="${encode(e.source)}" Target="${encode(e.target)}"${e.label ? ` Label="${encode(oneLine(e.label))}"` : ''} />`)
    .join('\n');
  return `<?xml version="1.0" encoding="utf-8"?>\n<DirectedGraph xmlns="http://schemas.microsoft.com/vs/2009/dgml">\n  <Nodes>\n${nodes}\n  </Nodes>\n  <Links>\n${links}\n  </Links>\n</DirectedGraph>\n`;
}

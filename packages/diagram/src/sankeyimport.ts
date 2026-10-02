import type { DiagramDocument, DiagramEdge, DiagramLayout, SemanticGraph } from './types';
import { parseDocument } from './document';
import { defaultPorts } from './geometry';
import { layers } from './layout';

/** Mermaid `sankey-beta` importer — turns a flow/volume diagram into a Kairo graph. Each CSV row
 * `source,target,value` becomes an edge (nodes are implied by the names and de-duplicated by name), and a value
 * greater than 1 is kept as the edge label so trunk weights survive the import. The inverse of {@link toSankey}
 * for human-authored or exported sankeys. Standard CSV quoting (`"a,b"`, `""` escapes) is honoured. No eval. */
export interface SankeyImportOptions { nodeWidth?: number; nodeHeight?: number; gap?: number }

const sanitize = (raw: string): string => raw.replace(/[^A-Za-z0-9_-]/g, '_').slice(0, 120) || 'n';

/** Splits one CSV line, honouring double-quoted fields and `""` escapes. */
function parseCsvLine(line: string): string[] {
  const out: string[] = []; let cur = '', quoted = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (quoted) { if (c === '"') { if (line[i + 1] === '"') { cur += '"'; i++; } else quoted = false; } else cur += c; }
    else if (c === '"') quoted = true;
    else if (c === ',') { out.push(cur); cur = ''; }
    else cur += c;
  }
  out.push(cur);
  return out.map(s => s.trim());
}

/** Parses a Mermaid sankey-beta document into a validated v2 diagram (layered layout). Throws when no links are
 * found. Rows with fewer than two non-empty fields, or an empty source/target, are skipped. */
export function parseSankey(text: string, options: SankeyImportOptions = {}): DiagramDocument {
  const width = options.nodeWidth ?? 200, height = options.nodeHeight ?? 92, gap = options.gap ?? 64;
  const rawLines = text.replace(/\r\n?/g, '\n').split('\n');
  const idByName = new Map<string, string>(), titleById = new Map<string, string>();
  const order: string[] = []; const used = new Set<string>();
  const nodeId = (name: string): string => {
    const existing = idByName.get(name); if (existing) return existing;
    let id = sanitize(name), i = 2; while (used.has(id)) id = `${sanitize(name)}-${i++}`;
    used.add(id); idByName.set(name, id); titleById.set(id, name); order.push(id); return id;
  };
  const edges: DiagramEdge[] = [];
  for (const raw of rawLines) {
    const line = raw.trim();
    if (!line || line.startsWith('%%') || /^sankey-beta\b/i.test(line)) continue;
    const cells = parseCsvLine(line);
    const source = cells[0] ?? '', target = cells[1] ?? '';
    if (!source || !target) continue; // not a link row
    const value = Number(cells[2]);
    const src = nodeId(source), dst = nodeId(target);
    if (src === dst) continue; // sankey carries no self-loops
    const label = Number.isFinite(value) && value > 1 ? String(value) : undefined;
    edges.push({ id: `e${edges.length}`, source: src, target: dst, ...(label ? { label } : {}) });
  }
  if (!order.length) throw new Error('El documento sankey-beta no contiene enlaces.');

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

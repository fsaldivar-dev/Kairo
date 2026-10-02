import type { DiagramDocument, DiagramEdge, DiagramLayout, NodeType, SemanticGraph } from './types';
import { parseDocument } from './document';
import { defaultPorts } from './geometry';
import { layers } from './layout';

/** Mermaid `architecture-beta` importer — turns a cloud/service architecture diagram back into a Kairo graph.
 * `group <id>(<icon>)[Title]` lines become node groups, `service`/`junction <id>(<icon>)[Title] in <group>`
 * lines become nodes (the icon maps back to a node type), and side-anchored connections
 * `a:R --> L:b` become edges (`-->` keeps direction, `<--` reverses, `--`/`<-->` keep declaration order). The
 * inverse of {@link toMermaidArchitecture}. No eval. */
export interface ArchitectureImportOptions { nodeWidth?: number; nodeHeight?: number; gap?: number }

const typeForIcon = (icon: string): NodeType =>
  icon === 'database' ? 'database'
  : icon === 'disk' ? 'file'
  : icon === 'internet' ? 'screen'
  : icon === 'cloud' ? 'component'
  : 'service';
const sanitize = (raw: string): string => raw.replace(/[^A-Za-z0-9_-]/g, '_').slice(0, 120) || 'n';

const DECL = /^(service|junction|group)\s+([\w-]+)\s*(?:\(([^)]*)\))?\s*(?:\[([^\]]*)\])?\s*(?:in\s+([\w-]+))?\s*$/;
const EDGE = /^([\w-]+)\s*:\s*([LRTB])\s*(<-->|-->|<--|--)\s*([LRTB])\s*:\s*([\w-]+)/;

/** Parses a Mermaid architecture-beta document into a validated v2 diagram (layered layout). Throws when no
 * services/junctions are found. Lines that match neither a declaration nor an edge are ignored. */
export function parseArchitecture(text: string, options: ArchitectureImportOptions = {}): DiagramDocument {
  const width = options.nodeWidth ?? 200, height = options.nodeHeight ?? 92, gap = options.gap ?? 64;
  const lines = text.replace(/\r\n?/g, '\n').split('\n');
  const groupTitle = new Map<string, string>();                 // group decl id -> its [Title]
  const order: string[] = [], used = new Set<string>();
  const titleById = new Map<string, string>(), typeById = new Map<string, NodeType>(), groupOf = new Map<string, string>();
  const nodeIdByDecl = new Map<string, string>();               // service/junction decl id -> internal node id
  type RawEdge = { a: string; b: string };
  const rawEdges: RawEdge[] = [];
  for (const raw of lines) {
    const line = raw.trim();
    if (!line || line.startsWith('%%') || /^architecture-beta\b/i.test(line)) continue;
    const decl = DECL.exec(line);
    if (decl) {
      const [, kind, declId, icon = '', title, group] = decl;
      if (kind === 'group') { groupTitle.set(declId, (title ?? declId).trim() || declId); continue; }
      let id = sanitize(declId), i = 2; while (used.has(id)) id = `${sanitize(declId)}-${i++}`;
      used.add(id); order.push(id); nodeIdByDecl.set(declId, id);
      titleById.set(id, (title ?? declId).trim() || declId);
      typeById.set(id, kind === 'junction' ? 'generic' : typeForIcon(icon.trim()));
      if (group) groupOf.set(id, group);
      continue;
    }
    const edge = EDGE.exec(line);
    if (edge) {
      const [, left, , arrow, , right] = edge;
      rawEdges.push(arrow === '<--' ? { a: right, b: left } : { a: left, b: right });
    }
  }
  if (!order.length) throw new Error('El documento architecture-beta no contiene servicios.');

  const edges: DiagramEdge[] = [];
  for (const re of rawEdges) {
    const s = nodeIdByDecl.get(re.a), t = nodeIdByDecl.get(re.b);
    if (s && t && s !== t) edges.push({ id: `e${edges.length}`, source: s, target: t });
  }
  const level = layers(order, edges), perLevel = new Map<number, number>();
  const nodeLayout: DiagramLayout['nodes'] = Object.create(null);
  for (const id of order) {
    const depth = level.get(id) ?? 0, slot = perLevel.get(depth) ?? 0; perLevel.set(depth, slot + 1);
    nodeLayout[id] = { x: slot * (width + gap) + 80, y: depth * (height + gap) + 80, width, height };
  }
  const nodes: SemanticGraph['nodes'] = order.map(id => {
    const groupDecl = groupOf.get(id), group = groupDecl ? (groupTitle.get(groupDecl) ?? groupDecl) : undefined;
    return { id, type: typeById.get(id) ?? 'service', title: titleById.get(id)!, ...(group ? { group } : {}) };
  });
  const edgeLayout: DiagramLayout['edges'] = Object.create(null);
  for (const e of edges) edgeLayout[e.id] = defaultPorts(nodeLayout[e.source], nodeLayout[e.target]);
  return parseDocument({ version: 2, graph: { nodes, edges }, layout: { nodes: nodeLayout, edges: edgeLayout } });
}

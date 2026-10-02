import type { DiagramDocument, DiagramEdge, DiagramLayout, NodeShape, NodeType, SemanticGraph } from './types';
import { parseDocument } from './document';
import { defaultPorts } from './geometry';
import { layers } from './layout';

/** PlantUML interop (Confluence, Jira, IntelliJ, VS Code, docs tools). A practical subset: node
 * declarations and directed arrows with labels. No eval; labels and aliases stay data. */
export interface PlantumlImportOptions { nodeWidth?: number; nodeHeight?: number; gap?: number }

const sanitize = (raw: string): string => raw.replace(/[^A-Za-z0-9_-]/g, '_').slice(0, 120) || 'n';
const unquote = (s: string): string => s.replace(/\\(["\\])/g, '$1');
const KEYWORDS = 'component|rectangle|node|actor|participant|class|usecase|database|queue|cloud|folder|artifact|interface|entity|boundary|control|storage|agent|card|file|frame|package';
const SHAPE_FOR: Record<string, NodeShape> = { usecase: 'ellipse', actor: 'pill', database: 'cylinder', artifact: 'document', file: 'document', queue: 'pill', interface: 'ellipse' };

/** Normalizes an edge endpoint token (`[Name]`, `(Name)`, `"Name"` or a bareword alias) into id + title. */
function endpoint(tokenRaw: string): { id: string; title: string } {
  const token = tokenRaw.trim();
  let m: RegExpExecArray | null;
  if ((m = /^\[([^\]]+)\]$/.exec(token)) || (m = /^\(([^)]+)\)$/.exec(token)) || (m = /^"((?:[^"\\]|\\.)*)"$/.exec(token))) { const v = unquote(m[1]); return { id: sanitize(v), title: v.trim() }; }
  return { id: sanitize(token), title: token };
}

/** Parses a PlantUML subset into a validated v2 document with a deterministic layered layout. */
export function parsePlantuml(text: string, options: PlantumlImportOptions = {}): DiagramDocument {
  const width = options.nodeWidth ?? 200, height = options.nodeHeight ?? 92, gap = options.gap ?? 64;
  const body = text.replace(/\/'[\s\S]*?'\//g, '').replace(/^\s*@(start|end)uml.*$/gim, '');
  const lines = body.split('\n').map(l => l.trim()).filter(l => l && !l.startsWith("'") && !l.startsWith('!') && !/^(skinparam|title|hide|show|left to right|top to bottom|scale|caption|legend|autonumber)\b/i.test(l));

  const nodes = new Map<string, { id: string; title: string; type: NodeType; shape?: NodeShape }>();
  const order: string[] = [], edges: DiagramEdge[] = [], dashed = new Set<string>();
  const ensure = (id: string, title: string, shape?: NodeShape): string => {
    let node = nodes.get(id);
    if (!node) { node = { id, title, type: shape === 'diamond' ? 'decision' : 'process', shape }; nodes.set(id, node); order.push(id); }
    else if (shape && !node.shape) { node.shape = shape; }
    return id;
  };
  const quoted = '"((?:[^"\\\\]|\\\\.)*)"';
  const declRe = new RegExp('^(' + KEYWORDS + ')\\s+(?:' + quoted + '|([A-Za-z0-9_]+)|\\[([^\\]]+)\\]|\\(([^)]+)\\))(?:\\s+as\\s+([A-Za-z0-9_]+))?', 'i');
  const edgeRe = /^(\[[^\]]+\]|\([^)]+\)|"[^"]+"|[A-Za-z0-9_]+)\s*([-.]+(?:\[[^\]]*\])?[-.]*>{1,2}|[-.]{2,})\s*(\[[^\]]+\]|\([^)]+\)|"[^"]+"|[A-Za-z0-9_]+)\s*(?::\s*(.+))?$/;

  for (const line of lines) {
    const em = edgeRe.exec(line);
    if (em) {
      const a = endpoint(em[1]), b = endpoint(em[3]), op = em[2], label = em[4]?.trim();
      ensure(a.id, a.title); ensure(b.id, b.title);
      const id = `e-${edges.length}`;
      edges.push({ id, source: a.id, target: b.id, ...(label ? { label } : {}) });
      if (op.includes('.')) dashed.add(id);
      continue;
    }
    const dm = declRe.exec(line);
    if (dm) {
      const keyword = dm[1].toLowerCase(), label = (dm[2] !== undefined ? unquote(dm[2]) : (dm[3] ?? dm[4] ?? dm[5])), alias = dm[6];
      ensure(sanitize(alias ?? label), label.trim(), SHAPE_FOR[keyword]);
    }
  }
  if (!order.length) throw new Error('El texto PlantUML no contiene nodos.');

  const level = layers(order, edges), perLevel = new Map<number, number>();
  const nodeLayout: DiagramLayout['nodes'] = Object.create(null);
  for (const id of order) {
    const depth = level.get(id) ?? 0, slot = perLevel.get(depth) ?? 0; perLevel.set(depth, slot + 1);
    const node = nodes.get(id)!;
    nodeLayout[id] = { x: slot * (width + gap) + 80, y: depth * (height + gap) + 80, width, height, ...(node.shape ? { shape: node.shape } : {}) };
  }
  const graph: SemanticGraph = { nodes: order.map(id => { const n = nodes.get(id)!; return { id: n.id, type: n.type, title: n.title }; }), edges };
  const edgeLayout: DiagramLayout['edges'] = Object.create(null);
  for (const e of edges) edgeLayout[e.id] = { ...defaultPorts(nodeLayout[e.source], nodeLayout[e.target]), ...(dashed.has(e.id) ? { dashed: true } : {}) };
  return parseDocument({ version: 2, graph, layout: { nodes: nodeLayout, edges: edgeLayout }, profile: 'flow' });
}

const PUML_KEYWORD: Partial<Record<NodeShape, string>> = { cylinder: 'database', document: 'artifact', note: 'artifact', ellipse: 'usecase', pill: 'rectangle', diamond: 'rectangle', rectangle: 'rectangle' };
/** Serializes a document to PlantUML. Nodes become declarations with stable aliases; edges become
 * directed arrows (dashed as `..>`). Re-importable with parsePlantuml. */
export function toPlantuml(document: DiagramDocument): string {
  const quote = (s: string) => `"${s.replace(/"/g, '\\"')}"`;
  const lines = ['@startuml'];
  for (const node of document.graph.nodes) {
    const shape = document.layout.nodes[node.id]?.shape, keyword = PUML_KEYWORD[shape ?? 'rectangle'] ?? 'rectangle';
    lines.push(`${keyword} ${quote(node.title)} as ${node.id}`);
  }
  for (const edge of document.graph.edges) {
    const arrow = document.layout.edges[edge.id]?.dashed ? '..>' : '-->';
    lines.push(`${edge.source} ${arrow} ${edge.target}${edge.label ? ` : ${edge.label.replace(/\n/g, ' ')}` : ''}`);
  }
  lines.push('@enduml');
  return lines.join('\n');
}

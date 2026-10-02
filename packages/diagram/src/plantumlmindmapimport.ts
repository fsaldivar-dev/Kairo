import type { DiagramDocument, DiagramEdge, DiagramLayout, SemanticGraph } from './types';
import { parseDocument } from './document';
import { defaultPorts } from './geometry';
import { layers } from './layout';

/** PlantUML mindmap importer (`@startmindmap`) — turns the depth-marker syntax (`*`, `**`, `***`, and the
 * side variants `+`/`-`) back into a Kairo tree: each line is a node and each node attaches to the nearest
 * shallower one as its parent (parent→child edge). An optional `[#colour]` after the markers and a boxless `_`
 * marker are tolerated; `'` comments are skipped. The inverse of {@link toPlantumlMindmap}. No eval. */
export interface PlantumlMindmapImportOptions { nodeWidth?: number; nodeHeight?: number; gap?: number }

const LINE = /^([*+-]+)\s*(?:\[[^\]]*\])?\s*(.*)$/;

/** Parses a PlantUML mindmap into a validated v2 diagram (layered layout). Throws when no nodes are found. */
export function parsePlantumlMindmap(text: string, options: PlantumlMindmapImportOptions = {}): DiagramDocument {
  const width = options.nodeWidth ?? 200, height = options.nodeHeight ?? 92, gap = options.gap ?? 64;
  const rawLines = text.replace(/\r\n?/g, '\n').split('\n');
  const order: string[] = [], titleById = new Map<string, string>();
  const edges: DiagramEdge[] = [];
  const stack: { depth: number; id: string }[] = [];
  let inside = !/@startmindmap/i.test(text); // if there's no @start, parse the whole text
  let counter = 0;
  for (const raw of rawLines) {
    const t = raw.trim();
    if (/^@startmindmap/i.test(t)) { inside = true; continue; }
    if (/^@endmindmap/i.test(t)) { inside = false; continue; }
    if (!inside || !t || t.startsWith("'")) continue;
    const m = LINE.exec(t);
    if (!m) continue;
    const depth = m[1].length;
    const label = m[2].trim().replace(/^_\s*/, '').trim();
    if (!label) continue;
    const id = `n${counter++}`; order.push(id); titleById.set(id, label);
    while (stack.length && stack[stack.length - 1].depth >= depth) stack.pop();
    if (stack.length) edges.push({ id: `e${edges.length}`, source: stack[stack.length - 1].id, target: id });
    stack.push({ depth, id });
  }
  if (!order.length) throw new Error('El documento @startmindmap no contiene nodos.');

  const level = layers(order, edges), perLevel = new Map<number, number>();
  const nodeLayout: DiagramLayout['nodes'] = Object.create(null);
  for (const id of order) {
    const depth = level.get(id) ?? 0, slot = perLevel.get(depth) ?? 0; perLevel.set(depth, slot + 1);
    nodeLayout[id] = { x: slot * (width + gap) + 80, y: depth * (height + gap) + 80, width, height };
  }
  const nodes: SemanticGraph['nodes'] = order.map(id => ({ id, type: 'process', title: titleById.get(id)! }));
  const edgeLayout: DiagramLayout['edges'] = Object.create(null);
  for (const e of edges) edgeLayout[e.id] = defaultPorts(nodeLayout[e.source], nodeLayout[e.target]);
  return parseDocument({ version: 2, profile: 'mindmap', graph: { nodes, edges }, layout: { nodes: nodeLayout, edges: edgeLayout } });
}

import type { DiagramDocument, DiagramEdge, DiagramLayout, SemanticGraph } from './types';
import { parseDocument } from './document';
import { defaultPorts } from './geometry';
import { layers } from './layout';

/** Mermaid `gantt` importer — turns a project plan into a dependency diagram. Each task becomes a node; every
 * `after <id> …` clause becomes an edge from the referenced task(s) to it, so a schedule with dependencies maps
 * to a flow. `section`s become node groups. The inverse-ish of {@link toGantt} for human-authored gantts that
 * carry `after` dependencies (absolute-date/number schedules simply yield an edgeless set of tasks). No eval. */
export interface GanttImportOptions { nodeWidth?: number; nodeHeight?: number; gap?: number }

const TAGS = new Set(['active', 'done', 'crit', 'milestone', 'vert']);
const sanitize = (raw: string): string => raw.replace(/[^A-Za-z0-9_-]/g, '_').slice(0, 120) || 'n';
const isDuration = (s: string): boolean => /^\d+(?:\.\d+)?\s*[dhwmy]?$/i.test(s);
const isIdent = (s: string): boolean => /^[A-Za-z_][\w-]*$/.test(s);

/** Parses a Mermaid gantt document into a validated v2 diagram (layered layout). Tasks with an explicit id can be
 * targeted by `after`; dependencies to unknown ids are ignored. Throws when no tasks are found. */
export function parseGantt(text: string, options: GanttImportOptions = {}): DiagramDocument {
  const width = options.nodeWidth ?? 200, height = options.nodeHeight ?? 92, gap = options.gap ?? 64;
  const lines = text.replace(/\r\n?/g, '\n').split('\n');
  const used = new Set<string>(), order: string[] = [];
  const titleById = new Map<string, string>(), groupById = new Map<string, string>();
  const declToId = new Map<string, string>();           // the `:id` token (or name) → internal node id
  const depsByNode = new Map<string, string[]>();        // internal id → referenced decl tokens
  let section = '';
  for (const raw of lines) {
    const line = raw.trim();
    if (!line || line.startsWith('%%')) continue;
    if (/^gantt\b/i.test(line)) continue;
    if (/^(title|dateFormat|axisFormat|excludes|todayMarker|tickInterval|weekday|includes)\b/i.test(line)) continue;
    const sec = /^section\s+(.*)$/i.exec(line);
    if (sec) { section = sec[1].trim(); continue; }
    const ci = line.indexOf(':'); if (ci < 0) continue; // not a task line
    const name = line.slice(0, ci).trim(); if (!name) continue;
    const parts = line.slice(ci + 1).split(',').map(s => s.trim()).filter(Boolean);
    let deps: string[] = []; const leftover: string[] = [];
    for (const part of parts) {
      if (TAGS.has(part.toLowerCase())) continue;
      const after = /^after\s+(.+)$/i.exec(part);
      if (after) { deps = deps.concat(after[1].trim().split(/\s+/)); continue; }
      leftover.push(part);
    }
    // The task id is the first leftover token that is a bare identifier and not a duration (e.g. "3d").
    const declId = leftover.find(t => isIdent(t) && !isDuration(t));
    let id = sanitize(declId ?? name); let i = 2; while (used.has(id)) id = `${sanitize(declId ?? name)}-${i++}`;
    used.add(id); order.push(id); titleById.set(id, name); if (section) groupById.set(id, section);
    declToId.set(declId ?? name, id);
    if (deps.length) depsByNode.set(id, deps);
  }
  if (!order.length) throw new Error('El documento gantt no contiene tareas.');

  const edges: DiagramEdge[] = [];
  for (const id of order) for (const dep of depsByNode.get(id) ?? []) {
    const src = declToId.get(dep);
    if (src && src !== id) edges.push({ id: `e${edges.length}`, source: src, target: id });
  }
  const level = layers(order, edges), perLevel = new Map<number, number>();
  const nodeLayout: DiagramLayout['nodes'] = Object.create(null);
  for (const id of order) {
    const depth = level.get(id) ?? 0, slot = perLevel.get(depth) ?? 0; perLevel.set(depth, slot + 1);
    nodeLayout[id] = { x: slot * (width + gap) + 80, y: depth * (height + gap) + 80, width, height };
  }
  const nodes: SemanticGraph['nodes'] = order.map(id => {
    const group = groupById.get(id);
    return { id, type: 'process', title: titleById.get(id)!, ...(group ? { group } : {}) };
  });
  const edgeLayout: DiagramLayout['edges'] = Object.create(null);
  for (const e of edges) edgeLayout[e.id] = defaultPorts(nodeLayout[e.source], nodeLayout[e.target]);
  return parseDocument({ version: 2, graph: { nodes, edges }, layout: { nodes: nodeLayout, edges: edgeLayout } });
}

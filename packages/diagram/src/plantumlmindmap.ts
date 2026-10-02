import type { DiagramDocument } from './types';

/** PlantUML mindmap export (`@startmindmap`) — turns the diagram's hierarchy into PlantUML's depth-marker
 * mindmap/WBS syntax (`*`, `**`, `***` …), rendering as a mindmap wherever PlantUML runs. Complements the class
 * and component PlantUML exports and the Mermaid mindmap, broadening PlantUML coverage. The hierarchy is a
 * spanning forest from the roots (nodes with no incoming edge); a single root is the `*` node, and multiple roots
 * are nested under a synthetic `root` title. Export only; titles are flattened to one line. Pure. */
export interface PlantumlMindmapOptions { root?: string }

const clean = (s: string): string => s.replace(/\r?\n/g, ' ').trim() || '?';

export function toPlantumlMindmap(document: DiagramDocument, options: PlantumlMindmapOptions = {}): string {
  const g = document.graph, title = new Map(g.nodes.map(n => [n.id, n.title]));
  const children = new Map<string, string[]>(g.nodes.map(n => [n.id, []]));
  const indeg = new Map<string, number>(g.nodes.map(n => [n.id, 0]));
  for (const e of g.edges) { if (e.source === e.target) continue; children.get(e.source)?.push(e.target); indeg.set(e.target, (indeg.get(e.target) ?? 0) + 1); }
  const roots = g.nodes.filter(n => (indeg.get(n.id) ?? 0) === 0).map(n => n.id);
  const starts = roots.length ? roots : g.nodes.slice(0, 1).map(n => n.id);
  const visited = new Set<string>(), kids = new Map<string, string[]>();
  const build = (id: string): void => {
    visited.add(id); const cs: string[] = []; kids.set(id, cs);
    // Check at traversal time: an earlier sibling may already have reached this child.
    for (const c of children.get(id) ?? []) if (!visited.has(c)) { cs.push(c); build(c); }
  };
  const topLevel: string[] = [];
  for (const id of [...starts, ...g.nodes.map(n => n.id)]) if (!visited.has(id)) { topLevel.push(id); build(id); }

  const lines = ['@startmindmap'];
  const emit = (id: string, depth: number): void => {
    lines.push(`${'*'.repeat(depth)} ${clean(title.get(id) ?? id)}`);
    for (const c of kids.get(id) ?? []) emit(c, depth + 1);
  };
  if (topLevel.length === 1) {
    emit(topLevel[0], 1);
  } else if (topLevel.length > 1) {
    lines.push(`* ${clean(options.root ?? 'Diagrama')}`);
    for (const r of topLevel) emit(r, 2);
  }
  lines.push('@endmindmap');
  return lines.join('\n') + '\n';
}

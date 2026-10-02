import type { DiagramDocument, DiagramEdge, DiagramLayout, SemanticGraph } from './types';
import { parseDocument } from './document';
import { defaultPorts } from './geometry';
import { layers } from './layout';

/** Flat parent-list interop — build a tree/forest from an array of `{ id, parentId, label }` records, the
 * adjacency-by-parent shape that SQL tables (self-referencing `parent_id`), org-chart exports and file listings
 * produce. Each record becomes a node; a `parentId` that names another record becomes a parent→child edge.
 * Records whose parent is absent/null/unknown are roots. Distinct from the nested `fromJson` and the XML
 * `fromOpml`. No eval; data stays data. */
export interface ParentListOptions { idKey?: string; parentKey?: string; labelKey?: string; nodeWidth?: number; nodeHeight?: number; gap?: number }

const sanitize = (raw: string): string => raw.replace(/[^A-Za-z0-9_-]/g, '_').slice(0, 120) || 'n';
const firstKey = (obj: Record<string, unknown>, keys: string[]): unknown => { for (const k of keys) if (obj[k] != null) return obj[k]; return undefined; };

/** Parses a flat parent list (array or JSON string) into a validated v2 diagram with a layered (tree) layout.
 * `idKey`/`parentKey`/`labelKey` override the detected fields (defaults try id/parentId/label and common aliases).
 * Throws when no records with an id are found. */
export function fromParentList(input: string | Array<Record<string, unknown>>, options: ParentListOptions = {}): DiagramDocument {
  const width = options.nodeWidth ?? 200, height = options.nodeHeight ?? 92, gap = options.gap ?? 64;
  const rows = (typeof input === 'string' ? JSON.parse(input) : input) as Array<Record<string, unknown>>;
  if (!Array.isArray(rows)) throw new Error('La lista de padres debe ser un array.');
  const idKeys = options.idKey ? [options.idKey] : ['id', 'key', 'name'];
  const parentKeys = options.parentKey ? [options.parentKey] : ['parentId', 'parent', 'parent_id', 'pid'];
  const labelKeys = options.labelKey ? [options.labelKey] : ['label', 'name', 'title', 'text'];
  const idMap = new Map<string, string>(), used = new Set<string>(), order: string[] = [], titleById = new Map<string, string>();
  const rawParent = new Map<string, string | undefined>(); // internal id -> raw parent id
  for (const row of rows) {
    if (row == null || typeof row !== 'object') continue;
    const rawId = firstKey(row, idKeys); if (rawId == null || idMap.has(String(rawId))) continue;
    let id = sanitize(String(rawId)), i = 2; while (used.has(id)) id = `${sanitize(String(rawId))}-${i++}`;
    used.add(id); idMap.set(String(rawId), id); order.push(id);
    const label = options.labelKey ? row[options.labelKey] : firstKey(row, labelKeys);
    titleById.set(id, label != null && String(label) ? String(label) : String(rawId));
    const p = options.parentKey ? row[options.parentKey] : firstKey(row, parentKeys);
    rawParent.set(id, p != null && String(p) ? String(p) : undefined);
  }
  if (!order.length) throw new Error('La lista de padres no contiene registros con id.');
  const edges: DiagramEdge[] = [];
  for (const id of order) {
    const p = rawParent.get(id); if (p == null) continue;
    const src = idMap.get(p); if (src && src !== id) edges.push({ id: `e${edges.length}`, source: src, target: id });
  }
  const level = layers(order, edges), perLevel = new Map<number, number>();
  const nodeLayout: DiagramLayout['nodes'] = Object.create(null);
  for (const id of order) {
    const depth = level.get(id) ?? 0, slot = perLevel.get(depth) ?? 0; perLevel.set(depth, slot + 1);
    nodeLayout[id] = { x: slot * (width + gap) + 80, y: depth * (height + gap) + 80, width, height };
  }
  const graph: SemanticGraph = { nodes: order.map(id => ({ id, type: 'process', title: titleById.get(id)! })), edges };
  const edgeLayout: DiagramLayout['edges'] = Object.create(null);
  for (const e of edges) edgeLayout[e.id] = defaultPorts(nodeLayout[e.source], nodeLayout[e.target]);
  return parseDocument({ version: 2, profile: 'hierarchy', graph, layout: { nodes: nodeLayout, edges: edgeLayout } });
}

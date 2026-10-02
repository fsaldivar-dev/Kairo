import type { DiagramDocument, DiagramEdge, DiagramLayout, SemanticGraph } from './types';
import { parseDocument } from './document';
import { defaultPorts } from './geometry';
import { layers } from './layout';

/** JSON Schema interop (import) — turns a schema's object definitions into an entity-relationship diagram: each
 * definition under `$defs`/`definitions` (plus the root when it has properties) is a node, and each property
 * whose type is a `$ref` to another definition — directly or via array `items` — becomes an edge labelled with
 * the property name. The ubiquitous shape behind OpenAPI, config validation and API contracts. No eval. */
export interface JsonSchemaImportOptions { nodeWidth?: number; nodeHeight?: number; gap?: number; rootName?: string }
interface Schema { $ref?: string; type?: unknown; title?: string; properties?: Record<string, Schema>; items?: Schema; $defs?: Record<string, Schema>; definitions?: Record<string, Schema>; [k: string]: unknown }

const sanitize = (raw: string): string => raw.replace(/[^A-Za-z0-9_-]/g, '_').slice(0, 120) || 'n';
const refName = (ref: string): string => ref.replace(/.*\//, ''); // last path segment of "#/$defs/User"
const refOf = (s: Schema | undefined): string | undefined => {
  if (!s || typeof s !== 'object') return undefined;
  if (typeof s.$ref === 'string') return refName(s.$ref);
  if (s.items && typeof s.items === 'object' && typeof s.items.$ref === 'string') return refName(s.items.$ref); // array of refs
  return undefined;
};

/** Parses a JSON Schema (object or JSON string) into a validated v2 ER-style diagram with a layered layout.
 * Throws when the schema defines no object types. */
export function fromJsonSchema(input: string | Schema, options: JsonSchemaImportOptions = {}): DiagramDocument {
  const width = options.nodeWidth ?? 200, height = options.nodeHeight ?? 92, gap = options.gap ?? 64;
  const root = typeof input === 'string' ? JSON.parse(input) as Schema : input;
  const defs: Record<string, Schema> = { ...(root.definitions ?? {}), ...(root.$defs ?? {}) };
  const order: string[] = [], used = new Set<string>(), idOf = new Map<string, string>(), schemaOf = new Map<string, Schema>();
  const addNode = (name: string, schema: Schema): void => {
    if (idOf.has(name)) return;
    let id = sanitize(name), i = 2; while (used.has(id)) id = `${sanitize(name)}-${i++}`;
    used.add(id); idOf.set(name, id); order.push(id); schemaOf.set(name, schema);
  };
  const rootName = options.rootName ?? (typeof root.title === 'string' && root.title ? root.title : 'Schema');
  if (root.properties && !defs[rootName]) addNode(rootName, root);
  for (const [name, schema] of Object.entries(defs)) addNode(name, schema);
  if (!order.length) throw new Error('El JSON Schema no define tipos de objeto.');
  const edges: DiagramEdge[] = [];
  for (const name of idOf.keys()) {
    const props = schemaOf.get(name)?.properties; if (!props) continue;
    for (const [prop, sub] of Object.entries(props)) {
      const target = refOf(sub);
      if (target && idOf.has(target)) edges.push({ id: `e${edges.length}`, source: idOf.get(name)!, target: idOf.get(target)!, label: prop });
    }
  }
  const level = layers(order, edges), perLevel = new Map<number, number>();
  const nodeLayout: DiagramLayout['nodes'] = Object.create(null);
  for (const id of order) {
    const depth = level.get(id) ?? 0, slot = perLevel.get(depth) ?? 0; perLevel.set(depth, slot + 1);
    nodeLayout[id] = { x: slot * (width + gap) + 80, y: depth * (height + gap) + 80, width, height };
  }
  const titleById = new Map([...idOf].map(([name, id]) => [id, name]));
  const graph: SemanticGraph = { nodes: order.map(id => ({ id, type: 'class', title: titleById.get(id)! })), edges };
  const edgeLayout: DiagramLayout['edges'] = Object.create(null);
  for (const e of edges) edgeLayout[e.id] = defaultPorts(nodeLayout[e.source], nodeLayout[e.target]);
  return parseDocument({ version: 2, graph, layout: { nodes: nodeLayout, edges: edgeLayout } });
}

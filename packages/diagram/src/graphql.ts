import type { DiagramDocument, DiagramEdge, DiagramLayout, SemanticGraph } from './types';
import { parseDocument } from './document';
import { defaultPorts } from './geometry';
import { layers } from './layout';

/** GraphQL SDL interop (import) — turns a schema's `type`/`interface`/`input` definitions into a
 * type-relationship diagram: each definition is a node, and each field whose (unwrapped) type is another
 * defined type becomes an edge labelled with the field name. Scalars, enums and unions are not drawn as targets.
 * A documentation aid for API schemas. Regex parse, dependency-free, no eval. */
export interface GraphqlImportOptions { nodeWidth?: number; nodeHeight?: number; gap?: number }

const sanitize = (raw: string): string => raw.replace(/[^A-Za-z0-9_-]/g, '_').slice(0, 120) || 'n';

/** Parses GraphQL SDL (schema text) into a validated v2 diagram with a layered layout. Only object-like types
 * (`type`/`interface`/`input`) become nodes; edges connect a type to the defined types its fields reference.
 * Throws when the schema declares no such types. */
export function fromGraphql(sdl: string, options: GraphqlImportOptions = {}): DiagramDocument {
  const width = options.nodeWidth ?? 200, height = options.nodeHeight ?? 92, gap = options.gap ?? 64;
  // Strip block/line comments so they don't produce spurious fields.
  const text = sdl.replace(/"""[\s\S]*?"""/g, ' ').replace(/#[^\n]*/g, ' ');
  const blockRe = /\b(type|interface|input)\s+([A-Za-z_]\w*)[^{]*\{([^}]*)\}/g;
  const order: string[] = [], used = new Set<string>(), idOf = new Map<string, string>(), bodyOf = new Map<string, string>();
  for (let m = blockRe.exec(text); m; m = blockRe.exec(text)) {
    const name = m[2]; if (idOf.has(name)) { bodyOf.set(name, (bodyOf.get(name) ?? '') + '\n' + m[3]); continue; }
    let id = sanitize(name), i = 2; while (used.has(id)) id = `${sanitize(name)}-${i++}`;
    used.add(id); idOf.set(name, id); order.push(id); bodyOf.set(name, m[3]);
  }
  if (!order.length) throw new Error('El SDL de GraphQL no declara tipos (type/interface/input).');
  const edges: DiagramEdge[] = [];
  // Fields may be whitespace- OR newline-separated; strip argument lists first so their `arg: Type` doesn't
  // look like a field, then scan every `fieldName: [Type` occurrence for the first type identifier.
  const fieldRe = /([A-Za-z_]\w*)\s*:\s*\[?\s*([A-Za-z_]\w*)/g;
  for (const name of idOf.keys()) {
    const body = (bodyOf.get(name) ?? '').replace(/\([^)]*\)/g, ' ');
    for (let fm = fieldRe.exec(body); fm; fm = fieldRe.exec(body)) {
      const field = fm[1], base = fm[2];
      if (!idOf.has(base)) continue;
      edges.push({ id: `e${edges.length}`, source: idOf.get(name)!, target: idOf.get(base)!, label: field });
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

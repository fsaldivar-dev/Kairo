import type { DiagramDocument, DiagramEdge, DiagramLayout, NodeType, SemanticGraph } from './types';
import { parseDocument } from './document';
import { defaultPorts } from './geometry';
import { layers } from './layout';

/** Structurizr DSL export — the popular "C4 architecture as code" format (structurizr.com, also rendered by
 * Kroki and the Structurizr CLI/Lite). Emits a `workspace { model { … } views { … } }` with one element per node
 * and a relationship per edge, so a Kairo architecture diagram drops straight into a Structurizr workspace. Node
 * types map to C4 element kinds (person/softwareSystem/container/database). Pure, export only. */
export interface StructurizrOptions {
  /** Workspace name (default 'Kairo'). */
  name?: string;
  /** `autolayout` direction in the generated view, or false to omit it (default 'lr'). */
  autolayout?: 'lr' | 'tb' | false;
}

const KIND: Record<string, string> = {
  external: 'person', screen: 'container', component: 'container', service: 'container', api: 'container',
  module: 'container', file: 'container', folder: 'container', database: 'container', // containers; database tagged below
};
const q = (s: string): string => `"${s.replace(/"/g, "'").replace(/\r?\n/g, ' ')}"`;

export function toStructurizr(document: DiagramDocument, options: StructurizrOptions = {}): string {
  const name = options.name ?? 'Kairo', autolayout = options.autolayout ?? 'lr';
  // Unique DSL identifiers (letters/digits/underscore, not starting with a digit).
  const idOf = new Map<string, string>(), used = new Set<string>();
  for (const n of document.graph.nodes) {
    let base = n.id.replace(/[^A-Za-z0-9_]/g, '_'); if (!/^[A-Za-z_]/.test(base)) base = `n_${base}`; base = base || 'n';
    let id = base, i = 2; while (used.has(id)) id = `${base}_${i++}`;
    used.add(id); idOf.set(n.id, id);
  }
  const lines: string[] = [`workspace ${q(name)} {`, '', '  model {'];
  for (const n of document.graph.nodes) {
    const kind = KIND[n.type] ?? 'softwareSystem';
    const tag = n.type === 'database' ? ' {\n      tags "Database"\n    }' : '';
    lines.push(`    ${idOf.get(n.id)} = ${kind} ${q(n.title)}${tag}`);
  }
  for (const e of document.graph.edges) {
    const s = idOf.get(e.source), t = idOf.get(e.target);
    if (!s || !t) continue;
    lines.push(`    ${s} -> ${t}${e.label ? ` ${q(e.label)}` : ''}`);
  }
  lines.push('  }', '', '  views {', '    systemLandscape {', '      include *');
  if (autolayout) lines.push(`      autolayout ${autolayout}`);
  lines.push('    }', '  }', '}');
  return lines.join('\n') + '\n';
}

export interface StructurizrImportOptions { nodeWidth?: number; nodeHeight?: number; gap?: number }
const KIND_TO_TYPE: Record<string, NodeType> = {
  person: 'external', softwaresystem: 'service', container: 'service', component: 'component',
  database: 'database', element: 'generic', infrastructurenode: 'service', deploymentnode: 'service',
};
const sanitizeId = (raw: string): string => raw.replace(/[^A-Za-z0-9_-]/g, '_').slice(0, 120) || 'n';

/** Extracts the balanced `{ … }` body following the first `model` keyword. Returns null when there is no model block. */
function modelBody(text: string): string | null {
  const m = /\bmodel\b\s*\{/i.exec(text); if (!m) return null;
  let depth = 0, start = m.index + m[0].length - 1;
  for (let i = start; i < text.length; i++) {
    if (text[i] === '{') depth++;
    else if (text[i] === '}') { depth--; if (depth === 0) return text.slice(start + 1, i); }
  }
  return text.slice(start + 1);
}

/** Parses a Structurizr DSL workspace into a validated v2 diagram — the inverse of {@link toStructurizr}, closing
 * the C4 round-trip. Reads element definitions (`id = kind "Name"`, any nesting/tags body) and relationships
 * (`a -> b "label"`) inside the `model { … }` block; views and properties are ignored. Element kinds map to node
 * types (person→external, container/softwareSystem→service, database→database, component→component). Deterministic
 * layered layout. No eval. */
export function fromStructurizr(text: string, options: StructurizrImportOptions = {}): DiagramDocument {
  const width = options.nodeWidth ?? 200, height = options.nodeHeight ?? 92, gap = options.gap ?? 64;
  const body = modelBody(text);
  if (body === null) throw new Error('El DSL no contiene un bloque `model { … }`.');
  const idOf = new Map<string, string>(), used = new Set<string>();
  const nodes: SemanticGraph['nodes'] = [], rels: Array<[string, string, string?]> = [];
  const elementRe = /^(\w[\w-]*)\s*=\s*(person|softwaresystem|container|component|database|element|infrastructurenode|deploymentnode)\b\s*"([^"]*)"/i;
  const relRe = /^(\w[\w-]*)\s*->\s*(\w[\w-]*)(?:\s+"([^"]*)")?/;
  for (const raw of body.split('\n')) {
    const line = raw.trim();
    if (!line || line.startsWith('#') || line.startsWith('//')) continue;
    const em = elementRe.exec(line);
    if (em) {
      const dslId = em[1]; if (idOf.has(dslId)) continue;
      let id = sanitizeId(dslId), i = 2; while (used.has(id)) id = `${sanitizeId(dslId)}-${i++}`;
      used.add(id); idOf.set(dslId, id);
      nodes.push({ id, type: KIND_TO_TYPE[em[2].toLowerCase()] ?? 'generic', title: em[3] });
      continue;
    }
    const rm = relRe.exec(line);
    if (rm) rels.push([rm[1], rm[2], rm[3]]);
  }
  if (!nodes.length) throw new Error('El modelo Structurizr no declara elementos.');
  const edges: DiagramEdge[] = [];
  for (const [a, b, label] of rels) {
    const s = idOf.get(a), t = idOf.get(b);
    if (s && t) edges.push({ id: `e${edges.length}`, source: s, target: t, ...(label ? { label } : {}) });
  }
  const order = nodes.map(n => n.id), level = layers(order, edges), perLevel = new Map<number, number>();
  const nodeLayout: DiagramLayout['nodes'] = Object.create(null);
  for (const id of order) {
    const depth = level.get(id) ?? 0, slot = perLevel.get(depth) ?? 0; perLevel.set(depth, slot + 1);
    nodeLayout[id] = { x: slot * (width + gap) + 80, y: depth * (height + gap) + 80, width, height };
  }
  const edgeLayout: DiagramLayout['edges'] = Object.create(null);
  for (const e of edges) edgeLayout[e.id] = defaultPorts(nodeLayout[e.source], nodeLayout[e.target]);
  return parseDocument({ version: 2, graph: { nodes, edges }, layout: { nodes: nodeLayout, edges: edgeLayout } });
}

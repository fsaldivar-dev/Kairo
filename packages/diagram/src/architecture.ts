import type { DiagramDocument, NodeType } from './types';

/** Mermaid `architecture-beta` export — renders as a cloud/service architecture diagram wherever Mermaid
 * supports it (GitHub, GitLab, mermaid.live…), complementing the C4 and Structurizr exports. Each distinct
 * `group` becomes a `group`, every node a `service` placed `in` its group, and every edge a side-anchored
 * connection whose L/R/T/B anchors are chosen from the nodes' relative layout positions so the routing follows
 * the diagram. Node types map to the built-in architecture icon set (cloud/database/disk/internet/server).
 * Export only; identifiers are sanitized and de-duplicated, labels bracket-escaped. Pure. */
export interface MermaidArchitectureOptions { title?: string }

const iconOf = (type: NodeType): string =>
  type === 'database' ? 'database'
  : type === 'file' || type === 'folder' ? 'disk'
  : type === 'screen' || type === 'external' ? 'internet'
  : type === 'component' || type === 'module' || type === 'generic' ? 'cloud'
  : 'server';
const lbl = (s: string): string => s.replace(/[[\]]/g, ' ').replace(/\r?\n/g, ' ').trim();

export function toMermaidArchitecture(document: DiagramDocument, options: MermaidArchitectureOptions = {}): string {
  const g = document.graph, layout = document.layout.nodes;
  const alias = new Map<string, string>(), used = new Set<string>();
  const ident = (raw: string, prefix: string): string => {
    let base = raw.replace(/[^A-Za-z0-9_]/g, '_'); if (!/^[A-Za-z_]/.test(base)) base = `${prefix}_${base}`; base = base || prefix;
    let a = base, i = 2; while (used.has(a)) a = `${base}_${i++}`; used.add(a); return a;
  };
  for (const n of g.nodes) alias.set(n.id, ident(n.id, 'svc'));
  // one architecture group per distinct node.group, in first-seen order
  const groupAlias = new Map<string, string>();
  for (const n of g.nodes) { const grp = n.group; if (grp && !groupAlias.has(grp)) groupAlias.set(grp, ident(grp, 'grp')); }

  const lines = ['architecture-beta'];
  if (options.title) lines.push(`  %% ${lbl(options.title)}`); // architecture-beta has no title directive
  for (const [name, ga] of groupAlias) lines.push(`  group ${ga}(cloud)[${lbl(name)}]`);
  for (const n of g.nodes) {
    const grp = n.group ? groupAlias.get(n.group) : undefined;
    lines.push(`  service ${alias.get(n.id)}(${iconOf(n.type)})[${lbl(n.title)}]${grp ? ` in ${grp}` : ''}`);
  }
  // side anchors from relative centres: dominant axis decides the pair (R/L horizontally, B/T vertically)
  const sideFor = (a: string, b: string): [string, string] => {
    const la = layout[a], lb = layout[b];
    if (!la || !lb) return ['R', 'L'];
    const ax = la.x + la.width / 2, ay = la.y + la.height / 2, bx = lb.x + lb.width / 2, by = lb.y + lb.height / 2;
    if (Math.abs(bx - ax) >= Math.abs(by - ay)) return bx >= ax ? ['R', 'L'] : ['L', 'R'];
    return by >= ay ? ['B', 'T'] : ['T', 'B'];
  };
  for (const e of g.edges) {
    const s = alias.get(e.source), t = alias.get(e.target);
    if (!s || !t || e.source === e.target) continue; // architecture-beta has no self-edges
    const [sa, ta] = sideFor(e.source, e.target);
    lines.push(`  ${s}:${sa} --> ${ta}:${t}`);
  }
  return lines.join('\n') + '\n';
}

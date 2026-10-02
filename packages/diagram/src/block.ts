import type { DiagramDocument } from './types';

/** Mermaid `block-beta` export — renders as a block diagram wherever Mermaid supports it (GitHub, GitLab,
 * mermaid.live…), rounding out the Mermaid chart family (flow/C4/architecture/gantt/pie/quadrant/sankey/timeline).
 * Each node becomes a labelled block laid out in a grid of `columns` (default ≈√n so it stays squarish), and each
 * edge an arrow (`-->`, or `-- "label" -->` when the edge has one). Export only; identifiers are sanitized and
 * de-duplicated, labels quote-escaped, self-loops dropped. Pure. */
export interface MermaidBlockOptions { columns?: number }

const q = (s: string): string => s.replace(/"/g, "'").replace(/\r?\n/g, ' ').trim();

export function toMermaidBlock(document: DiagramDocument, options: MermaidBlockOptions = {}): string {
  const g = document.graph;
  const alias = new Map<string, string>(), used = new Set<string>();
  for (const node of g.nodes) {
    let base = node.id.replace(/[^A-Za-z0-9_]/g, '_'); if (!/^[A-Za-z_]/.test(base)) base = `b_${base}`; base = base || 'b';
    let a = base, i = 2; while (used.has(a)) a = `${base}_${i++}`;
    used.add(a); alias.set(node.id, a);
  }
  const columns = Math.max(1, options.columns ?? (Math.ceil(Math.sqrt(g.nodes.length)) || 1));
  const lines = ['block-beta', `  columns ${columns}`];
  for (const node of g.nodes) lines.push(`  ${alias.get(node.id)}["${q(node.title)}"]`);
  for (const e of g.edges) {
    if (e.source === e.target) continue; // block-beta has no self-arrows
    const s = alias.get(e.source), t = alias.get(e.target);
    if (!s || !t) continue;
    const label = e.label ? q(e.label) : '';
    lines.push(`  ${s} ${label ? `-- "${label}" -->` : '-->'} ${t}`);
  }
  return lines.join('\n') + '\n';
}

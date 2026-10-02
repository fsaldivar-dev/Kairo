import type { DiagramDocument } from './types';

/** Mermaid C4 export (`C4Context`) — renders as a C4 diagram wherever Mermaid supports C4 (GitHub, GitLab,
 * mermaid.live…), complementing the Structurizr DSL export for the architecture use case. Node types map to C4
 * element kinds and edges to `Rel(...)`. Export only; labels are emitted as quoted strings (inner `"`→`'`). Pure. */
export interface MermaidC4Options {
  /** Optional diagram title line. */
  title?: string;
}

const kindOf = (type: string): string => type === 'external' ? 'Person' : type === 'database' ? 'SystemDb' : 'System';
const q = (s: string): string => `"${s.replace(/"/g, "'").replace(/\r?\n/g, ' ')}"`;

export function toMermaidC4(document: DiagramDocument, options: MermaidC4Options = {}): string {
  // Mermaid C4 aliases must be identifier-like and unique.
  const alias = new Map<string, string>(), used = new Set<string>();
  for (const n of document.graph.nodes) {
    let base = n.id.replace(/[^A-Za-z0-9_]/g, '_'); if (!/^[A-Za-z_]/.test(base)) base = `n_${base}`; base = base || 'n';
    let a = base, i = 2; while (used.has(a)) a = `${base}_${i++}`;
    used.add(a); alias.set(n.id, a);
  }
  const lines = ['C4Context'];
  if (options.title) lines.push(`  title ${options.title.replace(/\r?\n/g, ' ').trim()}`);
  for (const n of document.graph.nodes) lines.push(`  ${kindOf(n.type)}(${alias.get(n.id)}, ${q(n.title)})`);
  for (const e of document.graph.edges) {
    const s = alias.get(e.source), t = alias.get(e.target);
    if (s && t) lines.push(`  Rel(${s}, ${t}, ${q(e.label ?? '')})`);
  }
  return lines.join('\n') + '\n';
}

import type { DiagramDocument, NodeType } from './types';
import { toMermaid } from './text';

/** Mermaid export with per-type colours. Wraps {@link toMermaid} and, for flowchart documents, appends
 * `classDef`/`class` lines so each node is tinted by its type when rendered on GitHub, mermaid.live, Notion, etc.
 * A pastel fill per node type (dark text); non-flowchart profiles (class/ER) are returned unchanged. Pure,
 * export-only — does not alter the base `toMermaid` output's structure. */
export interface MermaidStyledOptions { palette?: Partial<Record<NodeType, string>> }

// Pastel fill per node type; stroke is a darker shade derived by the renderer-agnostic pairing below.
const FILL: Record<NodeType, string> = {
  screen: '#dbeafe', service: '#dcfce7', database: '#fef9c3', api: '#e0e7ff', external: '#fae8ff', class: '#cffafe',
  module: '#ede9fe', file: '#f1f5f9', folder: '#ffedd5', component: '#d1fae5', generic: '#f3f4f6',
  start: '#dcfce7', process: '#e0e7ff', decision: '#fef3c7', end: '#fee2e2',
};
const STROKE: Record<NodeType, string> = {
  screen: '#60a5fa', service: '#4ade80', database: '#facc15', api: '#818cf8', external: '#e879f9', class: '#22d3ee',
  module: '#a78bfa', file: '#94a3b8', folder: '#fb923c', component: '#34d399', generic: '#9ca3af',
  start: '#4ade80', process: '#818cf8', decision: '#fbbf24', end: '#f87171',
};

/** Returns a Mermaid flowchart with `classDef`/`class` styling coloured by node type (no-op styling for
 * non-flowchart profiles). */
export function toMermaidStyled(document: DiagramDocument, options: MermaidStyledOptions = {}): string {
  const base = toMermaid(document);
  // toMermaid emits a flowchart for every profile except uml/er; classDef styling only applies to flowcharts.
  const isFlow = document.profile !== 'uml' && document.profile !== 'er';
  if (!isFlow || !document.graph.nodes.length) return base;
  const byType = new Map<NodeType, string[]>();
  for (const n of document.graph.nodes) (byType.get(n.type) ?? byType.set(n.type, []).get(n.type)!).push(n.id);
  const lines = [base];
  for (const type of byType.keys()) {
    const fill = options.palette?.[type] ?? FILL[type] ?? '#f3f4f6';
    lines.push(`  classDef ${type} fill:${fill},stroke:${STROKE[type] ?? '#9ca3af'},color:#1e293b`);
  }
  for (const [type, ids] of byType) lines.push(`  class ${ids.join(',')} ${type}`);
  return lines.join('\n');
}

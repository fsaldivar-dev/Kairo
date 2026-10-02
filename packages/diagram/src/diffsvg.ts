import type { DiagramDocument, DiagramLayout, SemanticGraph } from './types';
import { parseDocument } from './document';
import { diffDocuments } from './flow';
import { toSVG, type SvgExportOptions } from './export';

/** Colors for the three change states (GitHub-ish). Overridable. */
export interface DiffSvgOptions extends SvgExportOptions { added?: string; removed?: string; changed?: string }

/** Renders a visual diff between two documents as one SVG: added elements green, removed red, changed amber.
 * Removed nodes/edges (present only in `before`) are drawn back in so the comparison is complete. Great for
 * reviewing diagram changes in a PR. Pure; composes diffDocuments + toSVG. */
export function toDiffSvg(before: DiagramDocument, after: DiagramDocument, options: DiffSvgOptions = {}): string {
  const added = options.added ?? '#2da44e', removed = options.removed ?? '#cf222e', changed = options.changed ?? '#bf8700';
  const d = diffDocuments(before, after);
  const aN = new Set(d.nodes.added), rN = new Set(d.nodes.removed), cN = new Set(d.nodes.changed);
  const aE = new Set(d.edges.added), rE = new Set(d.edges.removed), cE = new Set(d.edges.changed);

  // Union document: `after` plus the elements removed since `before`, so every state is visible.
  const nodes: SemanticGraph['nodes'] = [...after.graph.nodes.map(n => ({ ...n })), ...before.graph.nodes.filter(n => rN.has(n.id)).map(n => ({ ...n }))];
  const layoutNodes: DiagramLayout['nodes'] = Object.create(null);
  for (const n of after.graph.nodes) if (after.layout.nodes[n.id]) layoutNodes[n.id] = { ...after.layout.nodes[n.id] };
  for (const id of rN) if (before.layout.nodes[id]) layoutNodes[id] = { ...before.layout.nodes[id] };
  const present = new Set(nodes.map(n => n.id));
  const edges: SemanticGraph['edges'] = [
    ...after.graph.edges.filter(e => present.has(e.source) && present.has(e.target)).map(e => ({ ...e })),
    ...before.graph.edges.filter(e => rE.has(e.id) && present.has(e.source) && present.has(e.target)).map(e => ({ ...e })),
  ];
  const layoutEdges: DiagramLayout['edges'] = Object.create(null);
  for (const e of after.graph.edges) if (after.layout.edges[e.id]) layoutEdges[e.id] = { ...after.layout.edges[e.id] };
  for (const id of rE) if (before.layout.edges[id]) layoutEdges[id] = { ...before.layout.edges[id] };

  const combined = parseDocument({ version: 2, graph: { nodes, edges }, layout: { nodes: layoutNodes, edges: layoutEdges }, ...(after.profile ? { profile: after.profile } : {}) });
  const nodeColor = (id: string): string | undefined => aN.has(id) ? added : rN.has(id) ? removed : cN.has(id) ? changed : undefined;
  const edgeColor = (id: string): string | undefined => aE.has(id) ? added : rE.has(id) ? removed : cE.has(id) ? changed : undefined;
  return toSVG(combined, {
    ...options,
    nodeStroke: n => nodeColor(n.id),
    nodeTextColor: n => nodeColor(n.id),
    edgeStroke: e => edgeColor(e.id),
  });
}

export interface ComparisonSvgOptions extends SvgExportOptions { gap?: number; beforeLabel?: string; afterLabel?: string }
const sizeOf = (svg: string): [number, number] => { const m = svg.match(/^<svg[^>]*\bwidth="([\d.]+)" height="([\d.]+)"/); return m ? [+m[1], +m[2]] : [0, 0]; };
const escText = (s: string): string => s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
/** Renders two documents side by side ("Antes | Después") in one SVG — a panel comparison, clearer than the
 * overlay {@link toDiffSvg} for reports or PRs. Each panel is a nested `<svg>`. Pure; composes toSVG. */
export function toComparisonSvg(before: DiagramDocument, after: DiagramDocument, options: ComparisonSvgOptions = {}): string {
  const gap = options.gap ?? 48, labelH = 26;
  const { gap: _g, beforeLabel: _b, afterLabel: _a, ...svgOpts } = options;
  const sa = toSVG(before, svgOpts), sb = toSVG(after, svgOpts);
  const [wa, ha] = sizeOf(sa), [wb, hb] = sizeOf(sb);
  const W = +(wa + gap + wb).toFixed(2), H = +(Math.max(ha, hb) + labelH).toFixed(2);
  const lbl = (x: number, text: string) => `<text x="${+x.toFixed(2)}" y="17" text-anchor="middle" font-size="13" font-weight="600" font-family="-apple-system, BlinkMacSystemFont, sans-serif">${escText(text)}</text>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="Comparación">`
    + lbl(wa / 2, options.beforeLabel ?? 'Antes') + `<g transform="translate(0 ${labelH})">${sa}</g>`
    + lbl(wa + gap + wb / 2, options.afterLabel ?? 'Después') + `<g transform="translate(${+(wa + gap).toFixed(2)} ${labelH})">${sb}</g>`
    + `</svg>`;
}

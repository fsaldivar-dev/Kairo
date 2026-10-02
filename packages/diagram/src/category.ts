import type { DiagramDocument, DiagramNode } from './types';
import { toSVG, type SvgExportOptions } from './export';

/** Categorical colour SVG: tints each node by a category (its `group`, or its `type`) from a repeating palette,
 * so clusters/kinds read at a glance — the discrete counterpart to the numeric {@link toHeatmapSvg}. Colour is
 * applied only at export (never stored in the graph). Pastel fills keep dark text legible. Pure, export only. */
const PALETTE = ['#e0f2fe', '#dcfce7', '#fef9c3', '#fee2e2', '#f3e8ff', '#ffedd5', '#e0e7ff', '#fce7f3', '#ccfbf1', '#fae8ff'];
export interface CategorySvgOptions extends SvgExportOptions { by?: 'group' | 'type'; palette?: string[] }

export function toCategorySvg(document: DiagramDocument, options: CategorySvgOptions = {}): string {
  const by = options.by ?? 'group', palette = options.palette?.length ? options.palette : PALETTE;
  const value = (n: DiagramNode): string => by === 'type' ? n.type : (n.group ?? '');
  const cats: string[] = [];
  for (const n of document.graph.nodes) { const v = value(n); if (v && !cats.includes(v)) cats.push(v); }
  const color = new Map(cats.map((c, i) => [c, palette[i % palette.length]]));
  return toSVG(document, { ...options, nodeFill: n => { const v = value(n); return v ? color.get(v) : undefined; }, nodeTextColor: () => '#1a1a1a' });
}

import type { DiagramDocument } from './types';
import { toSVG, type SvgExportOptions } from './export';

export interface HeatmapOptions extends SvgExportOptions { low?: string; high?: string }

const hexToRgb = (hex: string): [number, number, number] => { let h = hex.replace('#', ''); if (h.length === 3) h = h.split('').map(c => c + c).join(''); const n = parseInt(h, 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
const toHex = (c: number) => Math.max(0, Math.min(255, Math.round(c))).toString(16).padStart(2, '0');
const lerp = (a: [number, number, number], b: [number, number, number], t: number): string => '#' + a.map((v, i) => toHex(v + (b[i] - v) * t)).join('');
// Readable text colour for a given fill (relative luminance).
const textOn = (rgb: [number, number, number]): string => (0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2]) / 255 > 0.6 ? '#1a1a1a' : '#ffffff';

/** Renders a data-driven heatmap SVG: each node is tinted along a `low`→`high` gradient by its score, so a
 * metric from the analysis subpath (PageRank, betweenness, degree…) becomes a colour map. Nodes without a
 * score keep the theme colour; node titles switch to a readable contrast colour over the tint. Pure.
 * `scores` may be a `{ id: number }` map or a `{ id, score }[]` list. */
export function toHeatmapSvg(document: DiagramDocument, scores: Record<string, number> | { id: string; score: number }[], options: HeatmapOptions = {}): string {
  const map: Record<string, number> = Array.isArray(scores) ? Object.fromEntries(scores.map(s => [s.id, s.score])) : scores;
  const low = hexToRgb(options.low ?? '#fee2e2'), high = hexToRgb(options.high ?? '#b91c1c');
  const values = document.graph.nodes.map(n => map[n.id]).filter((v): v is number => typeof v === 'number' && Number.isFinite(v));
  const min = values.length ? Math.min(...values) : 0, max = values.length ? Math.max(...values) : 0, span = max - min;
  const fill = (id: string): string | undefined => { const v = map[id]; if (typeof v !== 'number' || !Number.isFinite(v)) return undefined; return lerp(low, high, span > 0 ? (v - min) / span : 0); };
  return toSVG(document, {
    ...options,
    nodeFill: n => fill(n.id),
    nodeTextColor: n => { const f = fill(n.id); return f ? textOn(hexToRgb(f)) : undefined; },
  });
}

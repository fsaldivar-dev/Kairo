import type { DiagramDocument } from './types';

/** Renders a diagram's hierarchy as a **sunburst** SVG — concentric rings where each node is an annular sector
 * whose angular span is proportional to its subtree size and whose ring is its depth. Roots sit at the centre and
 * descendants fan outward, so the shape of a tree (and which branches dominate) reads at a glance. The radial
 * counterpart to the rectangular treemap, and a view competitors don't auto-generate from a diagram. The
 * hierarchy is a spanning forest from the roots (nodes with no incoming edge). Self-contained SVG with literal
 * colours, derives its own geometry. Pure. */
export interface SunburstOptions { size?: number; ringWidth?: number }

const esc = (s: string): string => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export function toSunburstSvg(document: DiagramDocument, options: SunburstOptions = {}): string {
  const size = options.size ?? 480, ringWidth = options.ringWidth ?? 52;
  const cx = size / 2, cy = size / 2;
  const g = document.graph, title = new Map(g.nodes.map(n => [n.id, n.title]));
  const children = new Map<string, string[]>(g.nodes.map(n => [n.id, []]));
  const indeg = new Map<string, number>(g.nodes.map(n => [n.id, 0]));
  for (const e of g.edges) { if (e.source === e.target) continue; children.get(e.source)?.push(e.target); indeg.set(e.target, (indeg.get(e.target) ?? 0) + 1); }
  const roots = g.nodes.filter(n => (indeg.get(n.id) ?? 0) === 0).map(n => n.id);
  const starts = roots.length ? roots : g.nodes.slice(0, 1).map(n => n.id);
  // Spanning-forest children (each node once) + leaf-count weights (a leaf counts 1, a parent = Σ children).
  const visited = new Set<string>(), kids = new Map<string, string[]>(), weight = new Map<string, number>();
  const build = (id: string): number => {
    visited.add(id);
    const cs: string[] = [];
    kids.set(id, cs);
    let w = 0;
    for (const c of children.get(id) ?? []) if (!visited.has(c)) { cs.push(c); w += build(c); }
    w = Math.max(1, w); weight.set(id, w); return w;
  };
  const topLevel: string[] = [];
  for (const id of [...starts, ...g.nodes.map(n => n.id)]) if (!visited.has(id)) { topLevel.push(id); build(id); }

  const bg = `<rect width="${size}" height="${size}" fill="#ffffff"/>`;
  if (!topLevel.length) return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" role="img" aria-label="Sunburst">${bg}</svg>`;

  const px = (r: number, a: number): string => (cx + r * Math.cos(a)).toFixed(2);
  const py = (r: number, a: number): string => (cy + r * Math.sin(a)).toFixed(2);
  const sectors: string[] = [];
  const draw = (ids: string[], a0: number, a1: number, depth: number): void => {
    const total = ids.reduce((s, id) => s + (weight.get(id) ?? 1), 0) || 1;
    let a = a0;
    for (const id of ids) {
      const span = (a1 - a0) * ((weight.get(id) ?? 1) / total);
      const b = a + span;
      const r0 = depth * ringWidth + ringWidth * 0.5, r1 = (depth + 1) * ringWidth + ringWidth * 0.5;
      const large = b - a > Math.PI ? 1 : 0;
      const fill = `hsl(215 60% ${Math.max(34, 84 - depth * 10)}%)`;
      if (depth === 0 && ids.length === 1 && b - a >= Math.PI * 2 - 1e-6) {
        // a single full-circle root: draw a disc instead of a degenerate sector
        sectors.push(`<circle cx="${cx}" cy="${cy}" r="${r1.toFixed(2)}" fill="${fill}" stroke="#ffffff" stroke-width="1"/>`);
      } else {
        sectors.push(`<path d="M ${px(r0, a)} ${py(r0, a)} L ${px(r1, a)} ${py(r1, a)} A ${r1.toFixed(2)} ${r1.toFixed(2)} 0 ${large} 1 ${px(r1, b)} ${py(r1, b)} L ${px(r0, b)} ${py(r0, b)} A ${r0.toFixed(2)} ${r0.toFixed(2)} 0 ${large} 0 ${px(r0, a)} ${py(r0, a)} Z" fill="${fill}" stroke="#ffffff" stroke-width="1"/>`);
      }
      // label at the sector's mid-angle/mid-radius when there is room
      if (span > 0.28) {
        const mr = (r0 + r1) / 2, ma = (a + b) / 2;
        sectors.push(`<text x="${px(mr, ma)}" y="${py(mr, ma)}" font-size="10" fill="#0f172a" text-anchor="middle" dominant-baseline="middle" font-family="system-ui, sans-serif">${esc((title.get(id) ?? id).slice(0, 10))}</text>`);
      }
      const cs = kids.get(id) ?? [];
      if (cs.length) draw(cs, a, b, depth + 1);
      a = b;
    }
  };
  draw(topLevel, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2, 0);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" role="img" aria-label="Sunburst">${bg}${sectors.join('')}</svg>`;
}

import type { DiagramDocument } from './types';

/** Renders a diagram's hierarchy as a nested **treemap** SVG — each node a rectangle sized by its subtree size,
 * children packed inside their parent (slice-and-dice, alternating orientation by depth), shaded by depth. A
 * distinct overview competitors don't auto-generate from a diagram: see at a glance which branches carry the most
 * weight. The hierarchy is a spanning forest from the roots (nodes with no incoming edge); multiple roots pack
 * under the whole canvas. Self-contained SVG with literal colours. Pure. */
export interface TreemapOptions { width?: number; height?: number; padding?: number }

const esc = (s: string): string => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export function toTreemapSvg(document: DiagramDocument, options: TreemapOptions = {}): string {
  const W = options.width ?? 640, H = options.height ?? 420, pad = options.padding ?? 4;
  const g = document.graph, title = new Map(g.nodes.map(n => [n.id, n.title]));
  const children = new Map<string, string[]>(g.nodes.map(n => [n.id, []]));
  const indeg = new Map<string, number>(g.nodes.map(n => [n.id, 0]));
  for (const e of g.edges) { if (e.source === e.target) continue; children.get(e.source)?.push(e.target); indeg.set(e.target, (indeg.get(e.target) ?? 0) + 1); }
  const roots = g.nodes.filter(n => (indeg.get(n.id) ?? 0) === 0).map(n => n.id);
  const starts = roots.length ? roots : g.nodes.slice(0, 1).map(n => n.id);
  // Spanning-forest children (each node once) + subtree weights (every node counts 1).
  const visited = new Set<string>(), kids = new Map<string, string[]>(), weight = new Map<string, number>();
  const build = (id: string): number => {
    visited.add(id);
    const cs: string[] = [];
    kids.set(id, cs);
    let w = 1;
    for (const c of children.get(id) ?? []) if (!visited.has(c)) { cs.push(c); w += build(c); }
    weight.set(id, w); return w;
  };
  const topLevel: string[] = [];
  for (const id of [...starts, ...g.nodes.map(n => n.id)]) if (!visited.has(id)) { topLevel.push(id); build(id); }
  if (!topLevel.length) return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"><rect width="${W}" height="${H}" fill="#ffffff"/></svg>`;

  const rects: string[] = [];
  const layout = (ids: string[], x: number, y: number, w: number, h: number, depth: number): void => {
    const total = ids.reduce((s, id) => s + (weight.get(id) ?? 1), 0) || 1;
    const horizontal = depth % 2 === 0;
    let cursor = 0;
    for (const id of ids) {
      const frac = (weight.get(id) ?? 1) / total;
      const rw = horizontal ? w * frac : w, rh = horizontal ? h : h * frac;
      const rx = horizontal ? x + cursor : x, ry = horizontal ? y : y + cursor;
      cursor += horizontal ? rw : rh;
      const fill = `hsl(215 55% ${Math.max(32, 86 - depth * 9)}%)`;
      rects.push(`<rect x="${+rx.toFixed(1)}" y="${+ry.toFixed(1)}" width="${+Math.max(0, rw).toFixed(1)}" height="${+Math.max(0, rh).toFixed(1)}" fill="${fill}" stroke="#ffffff" stroke-width="1"/>`);
      if (rw > 46 && rh > 16) rects.push(`<text x="${+(rx + 4).toFixed(1)}" y="${+(ry + 14).toFixed(1)}" font-size="11" fill="#0f172a" font-family="system-ui, sans-serif">${esc((title.get(id) ?? id).slice(0, Math.floor(rw / 7)))}</text>`);
      const cs = kids.get(id) ?? [];
      if (cs.length) layout(cs, rx + pad, ry + 18, rw - 2 * pad, rh - 18 - pad, depth + 1);
    }
  };
  layout(topLevel, 0, 0, W, H, 0);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="Treemap"><rect width="${W}" height="${H}" fill="#ffffff"/>${rects.join('')}</svg>`;
}

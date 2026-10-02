import type { DiagramDocument } from './types';

/** Renders a diagram's hierarchy as an **icicle** chart SVG — stacked horizontal bands, one row per depth, where
 * each node is a rectangle whose width is proportional to its subtree size. Roots span the full width on the top
 * row and descendants split their parent's width below, so the shape of a tree (and which branches carry weight)
 * reads top-to-bottom. The cartesian counterpart to the radial sunburst and distinct from the nested treemap —
 * a view competitors don't auto-generate from a diagram. The hierarchy is a spanning forest from the roots (nodes
 * with no incoming edge). Self-contained SVG with literal colours, derives its own geometry. Pure. */
export interface IcicleOptions { width?: number; rowHeight?: number }

const esc = (s: string): string => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export function toIcicleSvg(document: DiagramDocument, options: IcicleOptions = {}): string {
  const W = options.width ?? 640, rowH = options.rowHeight ?? 40;
  const g = document.graph, title = new Map(g.nodes.map(n => [n.id, n.title]));
  const children = new Map<string, string[]>(g.nodes.map(n => [n.id, []]));
  const indeg = new Map<string, number>(g.nodes.map(n => [n.id, 0]));
  for (const e of g.edges) { if (e.source === e.target) continue; children.get(e.source)?.push(e.target); indeg.set(e.target, (indeg.get(e.target) ?? 0) + 1); }
  const roots = g.nodes.filter(n => (indeg.get(n.id) ?? 0) === 0).map(n => n.id);
  const starts = roots.length ? roots : g.nodes.slice(0, 1).map(n => n.id);
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

  // depth of the forest determines the canvas height
  let maxDepth = 0;
  const depthOf = (id: string, d: number): void => { maxDepth = Math.max(maxDepth, d); for (const c of kids.get(id) ?? []) depthOf(c, d + 1); };
  for (const r of topLevel) depthOf(r, 0);
  const H = topLevel.length ? (maxDepth + 1) * rowH : rowH;
  const rects: string[] = [`<rect width="${W}" height="${H}" fill="#ffffff"/>`];
  if (!topLevel.length) return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="Icicle">${rects.join('')}</svg>`;

  const band = (ids: string[], x0: number, x1: number, depth: number): void => {
    const total = ids.reduce((s, id) => s + (weight.get(id) ?? 1), 0) || 1;
    let cursor = x0;
    for (const id of ids) {
      const w = (x1 - x0) * ((weight.get(id) ?? 1) / total), rx = cursor, ry = depth * rowH;
      cursor += w;
      const fill = `hsl(215 60% ${Math.max(34, 84 - depth * 10)}%)`;
      rects.push(`<rect x="${+rx.toFixed(1)}" y="${ry}" width="${+Math.max(0, w).toFixed(1)}" height="${rowH - 1}" fill="${fill}" stroke="#ffffff" stroke-width="1"/>`);
      if (w > 34) rects.push(`<text x="${+(rx + 4).toFixed(1)}" y="${ry + rowH / 2}" font-size="11" fill="#0f172a" dominant-baseline="middle" font-family="system-ui, sans-serif">${esc((title.get(id) ?? id).slice(0, Math.floor(w / 7)))}</text>`);
      const cs = kids.get(id) ?? [];
      if (cs.length) band(cs, rx, rx + w, depth + 1);
    }
  };
  band(topLevel, 0, W, 0);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="Icicle">${rects.join('')}</svg>`;
}

import type { DiagramDocument } from './types';

/** Renders the graph as a **chord diagram**: nodes are spaced evenly around a circle (declaration order)
 * and each edge is a quadratic Bézier that bows toward the centre, so a dense or cyclic graph reads as a
 * radial web instead of a tangle of crossing straight lines. A recognizable, compact view for relationship
 * matrices and cyclic dependency graphs that Mermaid/draw.io/Excalidraw do not auto-generate. The fourth
 * self-contained viz export (after treemap, matrix and arc). Literal colours, derives its own geometry. Pure. */
export interface ChordSvgOptions { radius?: number; stroke?: string; nodeFill?: string }

const esc = (s: string): string => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export function toChordSvg(document: DiagramDocument, options: ChordSvgOptions = {}): string {
  const nodes = document.graph.nodes, n = nodes.length;
  const title = new Map(nodes.map(nd => [nd.id, nd.title]));
  const idx = new Map(nodes.map((nd, i) => [nd.id, i]));
  const radius = Math.max(40, options.radius ?? Math.max(90, n * 16));
  const stroke = options.stroke ?? '#2563eb', nodeFill = options.nodeFill ?? '#1e293b';
  const labelGap = 12, pad = 76; // room outside the ring for radiating labels
  const cx = radius + pad, cy = radius + pad, W = +(cx * 2).toFixed(1), H = +(cy * 2).toFixed(1);
  const angle = (i: number) => (i / Math.max(1, n)) * Math.PI * 2 - Math.PI / 2; // first node at the top
  const px = (i: number) => +(cx + radius * Math.cos(angle(i))).toFixed(1);
  const py = (i: number) => +(cy + radius * Math.sin(angle(i))).toFixed(1);
  const parts: string[] = [`<rect width="${W}" height="${H}" fill="#ffffff"/>`];
  for (const e of document.graph.edges) {
    const a = idx.get(e.source), b = idx.get(e.target);
    if (a == null || b == null || a === b) continue; // self-loops are not drawn as chords
    const x1 = px(a), y1 = py(a), x2 = px(b), y2 = py(b);
    const mx = (x1 + x2) / 2, my = (y1 + y2) / 2; // control point pulled toward the centre makes the chord bow inward
    const ctrlx = +(cx + (mx - cx) * 0.25).toFixed(1), ctrly = +(cy + (my - cy) * 0.25).toFixed(1);
    parts.push(`<path d="M ${x1} ${y1} Q ${ctrlx} ${ctrly} ${x2} ${y2}" fill="none" stroke="${stroke}" stroke-width="1.5" opacity="0.55"/>`);
  }
  nodes.forEach((nd, i) => {
    const a = angle(i), x = px(i), y = py(i);
    parts.push(`<circle cx="${x}" cy="${y}" r="5" fill="${nodeFill}"/>`);
    const lx = +(cx + (radius + labelGap) * Math.cos(a)).toFixed(1), ly = +(cy + (radius + labelGap) * Math.sin(a)).toFixed(1);
    const deg = a * 180 / Math.PI, flip = Math.cos(a) < 0; // flip labels on the left half so they stay upright
    const rot = +(flip ? deg + 180 : deg).toFixed(1), anchor = flip ? 'end' : 'start';
    if (radius >= 70) parts.push(`<text transform="translate(${lx} ${ly}) rotate(${rot})" text-anchor="${anchor}" dominant-baseline="middle" font-size="11" fill="#334155" font-family="system-ui, sans-serif">${esc((title.get(nd.id) ?? nd.id).slice(0, 18))}</text>`);
  });
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="Diagrama de cuerdas">${parts.join('')}</svg>`;
}

import type { DiagramDocument } from './types';

/** Renders the flow as a native **Sankey SVG** — nodes are placed in left-to-right layers by their longest-path
 * depth, each drawn as a vertical bar whose height is proportional to its throughput (the larger of its in/out
 * edge count), and every edge is a cubic-Bézier ribbon between the bars. The rendered counterpart to the Mermaid
 * `toSankey` text export: a flow-volume view produced directly, with no external renderer, that competitors don't
 * auto-generate. Self-contained SVG with literal colours, derives its own geometry. Pure. */
export interface SankeySvgOptions { width?: number; unit?: number; nodeWidth?: number }

const esc = (s: string): string => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export function toSankeySvg(document: DiagramDocument, options: SankeySvgOptions = {}): string {
  const g = document.graph, title = new Map(g.nodes.map(n => [n.id, n.title]));
  const ids = g.nodes.map(n => n.id);
  const unit = options.unit ?? 16, nodeW = options.nodeWidth ?? 18;
  const margin = 24, vGap = 16, hGap = Math.max(80, (options.width ?? 720) / Math.max(1, 4));

  // longest-path layering (Kahn); nodes left in a cycle stay at depth 0
  const outAdj = new Map<string, string[]>(ids.map(id => [id, []]));
  const indeg = new Map<string, number>(ids.map(id => [id, 0]));
  const inCount = new Map<string, number>(ids.map(id => [id, 0])), outCount = new Map<string, number>(ids.map(id => [id, 0]));
  for (const e of g.edges) {
    if (e.source === e.target || !outAdj.has(e.source) || !indeg.has(e.target)) continue;
    outAdj.get(e.source)!.push(e.target); indeg.set(e.target, (indeg.get(e.target) ?? 0) + 1);
    outCount.set(e.source, (outCount.get(e.source) ?? 0) + 1); inCount.set(e.target, (inCount.get(e.target) ?? 0) + 1);
  }
  const depth = new Map<string, number>(ids.map(id => [id, 0]));
  const pending = new Map(indeg); const queue = ids.filter(id => (indeg.get(id) ?? 0) === 0); const seen = new Set(queue);
  for (let head = 0; head < queue.length; head++) {
    const id = queue[head];
    for (const t of outAdj.get(id) ?? []) {
      depth.set(t, Math.max(depth.get(t) ?? 0, (depth.get(id) ?? 0) + 1));
      const left = (pending.get(t) ?? 1) - 1; pending.set(t, left);
      if (left <= 0 && !seen.has(t)) { seen.add(t); queue.push(t); }
    }
  }
  // group by layer, in declaration order
  const byLayer = new Map<number, string[]>();
  for (const id of ids) { const d = depth.get(id) ?? 0; (byLayer.get(d) ?? byLayer.set(d, []).get(d)!).push(id); }
  const throughput = (id: string): number => Math.max(1, inCount.get(id) ?? 0, outCount.get(id) ?? 0);

  // lay out bars; track geometry per node
  type Box = { x: number; y: number; w: number; h: number; cyRight: number; cyLeft: number };
  const box = new Map<string, Box>();
  let maxBottom = margin;
  for (const [layer, members] of [...byLayer.entries()].sort((a, b) => a[0] - b[0])) {
    const x = margin + layer * hGap;
    let y = margin;
    for (const id of members) {
      const h = throughput(id) * unit;
      box.set(id, { x, y, w: nodeW, h, cyRight: y + h / 2, cyLeft: y + h / 2 });
      y += h + vGap; maxBottom = Math.max(maxBottom, y);
    }
  }
  const layerCount = byLayer.size || 1;
  const W = margin * 2 + Math.max(0, layerCount - 1) * hGap + nodeW + 120; // headroom for the last layer's labels
  const H = Math.max(margin * 2 + unit, maxBottom - vGap + margin);
  const parts: string[] = [`<rect width="${W}" height="${+H.toFixed(1)}" fill="#ffffff"/>`];

  // ribbons first (under the bars)
  for (const e of g.edges) {
    if (e.source === e.target) continue;
    const s = box.get(e.source), t = box.get(e.target);
    if (!s || !t) continue;
    const x1 = s.x + s.w, y1 = s.cyRight, x2 = t.x, y2 = t.cyLeft, mx = (x1 + x2) / 2;
    parts.push(`<path d="M ${x1.toFixed(1)} ${y1.toFixed(1)} C ${mx.toFixed(1)} ${y1.toFixed(1)} ${mx.toFixed(1)} ${y2.toFixed(1)} ${x2.toFixed(1)} ${y2.toFixed(1)}" fill="none" stroke="#2563eb" stroke-width="6" opacity="0.35"/>`);
  }
  // bars + labels
  for (const id of ids) {
    const b = box.get(id); if (!b) continue;
    parts.push(`<rect x="${b.x.toFixed(1)}" y="${b.y.toFixed(1)}" width="${b.w}" height="${Math.max(2, b.h).toFixed(1)}" fill="#1e293b" rx="2"/>`);
    parts.push(`<text x="${(b.x + b.w + 4).toFixed(1)}" y="${(b.y + b.h / 2).toFixed(1)}" font-size="11" fill="#334155" dominant-baseline="middle" font-family="system-ui, sans-serif">${esc((title.get(id) ?? id).slice(0, 18))}</text>`);
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${+H.toFixed(1)}" viewBox="0 0 ${W} ${+H.toFixed(1)}" role="img" aria-label="Diagrama Sankey">${parts.join('')}</svg>`;
}

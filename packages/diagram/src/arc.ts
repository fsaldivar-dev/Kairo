import type { DiagramDocument } from './types';

/** Renders the graph as an **arc diagram**: the nodes sit on a horizontal baseline (declaration order) and each
 * edge is a quadratic arc above it, its height proportional to the span. Forward edges (source before target)
 * and backward edges (a loop reaching an earlier node) are coloured differently, so cycles and long-range
 * dependencies stand out — a recognizable view for sequences and dependency chains that competitors don't
 * auto-generate. Self-contained SVG with literal colours. Pure. */
export interface ArcSvgOptions { gap?: number; forward?: string; backward?: string }

const esc = (s: string): string => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export function toArcSvg(document: DiagramDocument, options: ArcSvgOptions = {}): string {
  const ids = document.graph.nodes.map(n => n.id), n = ids.length;
  const title = new Map(document.graph.nodes.map(nd => [nd.id, nd.title]));
  const idx = new Map(ids.map((id, i) => [id, i]));
  const gap = options.gap ?? 90, margin = 40, forward = options.forward ?? '#2563eb', backward = options.backward ?? '#ef4444';
  const pos = (i: number) => margin + i * gap;
  let maxSpan = 0;
  for (const e of document.graph.edges) { const a = idx.get(e.source), b = idx.get(e.target); if (a == null || b == null) continue; maxSpan = Math.max(maxSpan, Math.abs(a - b)); }
  const peak = Math.max(24, maxSpan * gap * 0.5), baseline = peak + 16, W = margin * 2 + Math.max(0, n - 1) * gap, H = baseline + 44;
  const parts: string[] = [`<rect width="${W}" height="${H}" fill="#ffffff"/>`];
  for (const e of document.graph.edges) {
    const a = idx.get(e.source), b = idx.get(e.target); if (a == null || b == null || a === b) continue;
    const x1 = pos(a), x2 = pos(b), h = Math.abs(x2 - x1) * 0.55, color = a < b ? forward : backward;
    parts.push(`<path d="M ${x1} ${baseline} Q ${(x1 + x2) / 2} ${+(baseline - h).toFixed(1)} ${x2} ${baseline}" fill="none" stroke="${color}" stroke-width="1.5" opacity="0.75"/>`);
  }
  ids.forEach((id, i) => {
    const x = pos(i);
    parts.push(`<circle cx="${x}" cy="${baseline}" r="5" fill="#1e293b"/>`);
    if (gap >= 26) parts.push(`<text transform="translate(${x} ${baseline + 14}) rotate(45)" font-size="11" fill="#334155" font-family="system-ui, sans-serif">${esc((title.get(id) ?? id).slice(0, 18))}</text>`);
  });
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="Diagrama de arcos">${parts.join('')}</svg>`;
}

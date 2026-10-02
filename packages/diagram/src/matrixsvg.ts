import type { DiagramDocument } from './types';

/** Renders the graph as an **adjacency-matrix** SVG: an N×N grid with node labels down the rows and across the
 * columns, and a filled cell at (i, j) for every edge i→j. A compact alternative to the node-link view for dense
 * graphs, where connection patterns (clusters, hubs, bands) read at a glance. The cell size auto-scales to the
 * node count; labels are shown only when the cells are large enough. Self-contained SVG, literal colours. Pure. */
export interface MatrixSvgOptions { fill?: string }

const esc = (s: string): string => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export function toMatrixSvg(document: DiagramDocument, options: MatrixSvgOptions = {}): string {
  const ids = document.graph.nodes.map(n => n.id), n = ids.length;
  const title = new Map(document.graph.nodes.map(nd => [nd.id, nd.title]));
  const idx = new Map(ids.map((id, i) => [id, i]));
  const cell = n ? Math.max(6, Math.min(28, Math.floor(700 / n))) : 24;
  const showLabels = cell >= 11;
  const labelW = showLabels ? 120 : 8, labelH = showLabels ? 110 : 8;
  const W = labelW + n * cell, H = labelH + n * cell, fill = options.fill ?? '#2563eb';
  const parts: string[] = [`<rect width="${W}" height="${H}" fill="#ffffff"/>`];
  // Filled cells (one per edge). row = source, col = target.
  for (const e of document.graph.edges) {
    const i = idx.get(e.source), j = idx.get(e.target); if (i == null || j == null) continue;
    parts.push(`<rect x="${labelW + j * cell}" y="${labelH + i * cell}" width="${cell}" height="${cell}" fill="${fill}"/>`);
  }
  // Grid lines.
  const gl: string[] = [];
  for (let k = 0; k <= n; k++) {
    gl.push(`<line x1="${labelW + k * cell}" y1="${labelH}" x2="${labelW + k * cell}" y2="${H}" stroke="#e2e8f0"/>`);
    gl.push(`<line x1="${labelW}" y1="${labelH + k * cell}" x2="${W}" y2="${labelH + k * cell}" stroke="#e2e8f0"/>`);
  }
  parts.push(`<g>${gl.join('')}</g>`);
  if (showLabels) {
    const maxChars = Math.floor(labelW / 7);
    ids.forEach((id, i) => {
      const t = esc((title.get(id) ?? id).slice(0, maxChars));
      parts.push(`<text x="${labelW - 4}" y="${labelH + i * cell + cell * 0.7}" text-anchor="end" font-size="11" fill="#334155" font-family="system-ui, sans-serif">${t}</text>`);
      parts.push(`<text transform="translate(${labelW + i * cell + cell * 0.72} ${labelH - 4}) rotate(-90)" font-size="11" fill="#334155" font-family="system-ui, sans-serif">${t}</text>`);
    });
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="Matriz de adyacencia">${parts.join('')}</svg>`;
}

import type { DiagramDocument, Point } from './types';
import { anchor } from './geometry';

/** Renders a diagram as a monospaced text picture: boxes with labels, joined by orthogonal line connectors.
 * Reuses the solved layout (node positions), so it needs no graph-drawing pass. Pure; no DOM.
 * Great for READMEs, terminals, PR/commit messages and LLM prompts — an output no mainstream diagram tool offers. */
export interface AsciiExportOptions {
  /** Target width in characters (the grid is fitted to it). Clamped to [24, 240]. Default 80. */
  width?: number;
  /** Override the number of rows; by default derived from the aspect ratio (characters are ~2× taller than wide). */
  height?: number;
  /** Use only 7-bit ASCII (`+ - | > v`) instead of Unicode box-drawing characters. Default false. */
  ascii?: boolean;
  /** Max characters of a node label shown inside its box. Default 18. */
  maxLabel?: number;
}

interface Glyphs { h: string; v: string; cross: string; tl: string; tr: string; bl: string; br: string; cNW: string; cNE: string; cSW: string; cSE: string; aUp: string; aDown: string; aLeft: string; aRight: string }
const UNICODE: Glyphs = { h: '─', v: '│', cross: '┼', tl: '┌', tr: '┐', bl: '└', br: '┘', cNW: '┘', cNE: '└', cSW: '┐', cSE: '┌', aUp: '▴', aDown: '▾', aLeft: '◂', aRight: '▸' };
const ASCII: Glyphs = { h: '-', v: '|', cross: '+', tl: '+', tr: '+', bl: '+', br: '+', cNW: '+', cNE: '+', cSW: '+', cSE: '+', aUp: '^', aDown: 'v', aLeft: '<', aRight: '>' };
const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));

export function toAscii(document: DiagramDocument, options: AsciiExportOptions = {}): string {
  const g = options.ascii ? ASCII : UNICODE;
  const boxMap = document.layout.nodes;
  const nodes = document.graph.nodes.filter(n => boxMap[n.id]);
  if (!nodes.length) return '';
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const n of nodes) { const b = boxMap[n.id]; minX = Math.min(minX, b.x); minY = Math.min(minY, b.y); maxX = Math.max(maxX, b.x + b.width); maxY = Math.max(maxY, b.y + b.height); }
  const worldW = Math.max(1, maxX - minX), worldH = Math.max(1, maxY - minY);
  const cols = clamp(Math.round(options.width ?? 80), 24, 240);
  const sx = (cols - 1) / worldW;
  // Characters are roughly twice as tall as wide, so vertical scale is halved to keep proportions.
  const rows = clamp(options.height ?? Math.round(worldH * sx * 0.5) + 1, 5, 400);
  const sy = (rows - 1) / worldH;
  const cx = (x: number) => clamp(Math.round((x - minX) * sx), 0, cols - 1);
  const cy = (y: number) => clamp(Math.round((y - minY) * sy), 0, rows - 1);
  const grid: string[][] = Array.from({ length: rows }, () => Array<string>(cols).fill(' '));
  const inside = (r: number, c: number) => r >= 0 && r < rows && c >= 0 && c < cols;

  // Line cells merge into a crossing glyph when a horizontal and a vertical run meet.
  const line = (r: number, c: number, ch: string): void => {
    if (!inside(r, c)) return;
    const cur = grid[r][c];
    if ((ch === g.h || ch === g.v) && (cur === g.h || cur === g.v || cur === g.cross) && cur !== ch) grid[r][c] = g.cross;
    else grid[r][c] = ch;
  };
  const sign = (n: number) => (n > 0 ? 1 : n < 0 ? -1 : 0);

  // Connectors: an L-shaped route (horizontal from the source, then vertical into the target).
  for (const edge of document.graph.edges) {
    const route = document.layout.edges[edge.id], a = boxMap[edge.source], b = boxMap[edge.target];
    if (!route || !a || !b || edge.source === edge.target) continue;
    const pa: Point = anchor(a, route.sourcePort), pb: Point = anchor(b, route.targetPort);
    const r1 = cy(pa.y), c1 = cx(pa.x), r2 = cy(pb.y), c2 = cx(pb.x);
    const hdir = sign(c2 - c1), vdir = sign(r2 - r1);
    for (let c = c1; c !== c2; c += hdir) line(r1, c, g.h);
    if (hdir && vdir) grid[r1] && (grid[r1][c2] = hdir > 0 ? (vdir > 0 ? g.cSW : g.cNW) : (vdir > 0 ? g.cSE : g.cNE));
    for (let r = r1; r !== r2; r += vdir) line(r, c2, g.v);
    // Arrowhead at the target, pointing along the final segment.
    const arrow = vdir ? (vdir > 0 ? g.aDown : g.aUp) : hdir > 0 ? g.aRight : hdir < 0 ? g.aLeft : '';
    if (arrow && inside(r2, c2)) grid[r2][c2] = arrow;
  }

  // Boxes drawn last so their borders sit on top of connector ends; interiors are cleared.
  const maxLabel = Math.max(1, options.maxLabel ?? 18), ell = options.ascii ? '~' : '…';
  for (const node of nodes) {
    const box = boxMap[node.id];
    const left = cx(box.x), right = Math.max(left + 2, cx(box.x + box.width));
    const top = cy(box.y), bottom = Math.max(top + 2, cy(box.y + box.height));
    for (let r = top; r <= bottom && r < rows; r++) for (let c = left; c <= right && c < cols; c++) {
      const edgeTop = r === top, edgeBottom = r === bottom, edgeLeft = c === left, edgeRight = c === right;
      if (edgeTop && edgeLeft) grid[r][c] = g.tl;
      else if (edgeTop && edgeRight) grid[r][c] = g.tr;
      else if (edgeBottom && edgeLeft) grid[r][c] = g.bl;
      else if (edgeBottom && edgeRight) grid[r][c] = g.br;
      else if (edgeTop || edgeBottom) grid[r][c] = g.h;
      else if (edgeLeft || edgeRight) grid[r][c] = g.v;
      else grid[r][c] = ' ';
    }
    // Centred label on the middle row.
    const inner = right - left - 1;
    if (inner >= 1) {
      const label = [...node.title].length > Math.min(inner, maxLabel) ? [...node.title].slice(0, Math.min(inner, maxLabel) - 1).join('') + ell : node.title;
      const row = Math.floor((top + bottom) / 2), startC = left + 1 + Math.max(0, Math.floor((inner - [...label].length) / 2));
      [...label].forEach((ch, i) => { const c = startC + i; if (c < right && inside(row, c)) grid[row][c] = ch; });
    }
  }
  return grid.map(row => row.join('').replace(/\s+$/, '')).join('\n');
}

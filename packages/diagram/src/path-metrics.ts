import type { Point } from './types';

/** Measures Kairo's generated M/L/Q/C paths without a browser. Adaptive subdivision
 * keeps arc-length label placement within a fraction of a world unit of SVG geometry. */
export function pathMetrics(path: string) {
  const tokens = path.match(/[MLQC]|-?\d+(?:\.\d+)?(?:e[+-]?\d+)?/gi) ?? [];
  const points: Point[] = [], hull: Point[] = [];
  const length: number[] = [];
  let cursor: Point = { x: 0, y: 0 }, i = 0, total = 0;
  const read = (): Point => ({ x: Number(tokens[i++]), y: Number(tokens[i++]) });
  const append = (p: Point) => {
    if (points.length) total += Math.hypot(p.x - points.at(-1)!.x, p.y - points.at(-1)!.y);
    points.push(p); length.push(total);
  };
  const mid = (a: Point, b: Point): Point => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
  function flatten(control: Point[], depth = 0): void {
    const first = control[0], last = control.at(-1)!;
    const chord = Math.hypot(last.x - first.x, last.y - first.y);
    const polygon = control.slice(1).reduce((n, p, j) => n + Math.hypot(p.x - control[j].x, p.y - control[j].y), 0);
    if (depth >= 14 || polygon - chord < 0.002) { append(last); return; }
    const left = [first], right = [last]; let row = control;
    while (row.length > 1) { row = row.slice(1).map((p, j) => mid(row[j], p)); left.push(row[0]); right.unshift(row.at(-1)!); }
    flatten(left, depth + 1); flatten(right, depth + 1);
  }
  while (i < tokens.length) {
    const command = tokens[i++];
    if (command === 'M' || command === 'L') { cursor = read(); hull.push(cursor); append(cursor); }
    else if (command === 'Q' || command === 'C') {
      const control = [cursor, read(), read()]; if (command === 'C') control.push(read());
      hull.push(...control); flatten(control); cursor = control.at(-1)!;
    } else throw new Error('Unsupported generated path command');
  }
  function at(distance: number): Point {
    if (!points.length) return { x: 0, y: 0 };
    const d = Math.max(0, Math.min(total, distance));
    let lo = 0, hi = length.length - 1;
    while (lo < hi) { const mid = (lo + hi) >> 1; if (length[mid] < d) lo = mid + 1; else hi = mid; }
    if (!lo) return points[0];
    const a = points[lo - 1], b = points[lo], t = (d - length[lo - 1]) / (length[lo] - length[lo - 1] || 1);
    return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
  }
  return {
    // A Bézier lies within its control hull: conservative bounds never crop it.
    bounds: { minX: Math.min(...hull.map(p => p.x)), minY: Math.min(...hull.map(p => p.y)), maxX: Math.max(...hull.map(p => p.x)), maxY: Math.max(...hull.map(p => p.y)) },
    label(ratio: number, offset: number): Point {
      const distance = total * ratio, p = at(distance), a = at(distance - 2), b = at(distance + 2);
      const dx = b.x - a.x, dy = b.y - a.y, norm = Math.hypot(dx, dy) || 1;
      return { x: p.x + dy / norm * offset, y: p.y - dx / norm * offset + 3 };
    },
  };
}

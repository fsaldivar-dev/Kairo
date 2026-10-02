import type { DiagramDocument, EdgeLayout, EdgeStyle, GroupBox, LaneBand, LaneOrientation, NodeLayout, Point, Port } from './types';
import { ports } from './types';

export const normals: Record<Port, Point> = { top: { x: 0, y: -1 }, right: { x: 1, y: 0 }, bottom: { x: 0, y: 1 }, left: { x: -1, y: 0 } };
export function anchor(box: NodeLayout, port: Port): Point {
  const n = normals[port];
  const s = box.shape, side = s === 'triangle' ? .25 : s === 'parallelogram' || s === 'trapezoid' ? .41 : .5;
  return { x: box.x + box.width / 2 + n.x * box.width * side,
    y: box.y + box.height * (s === 'document' && port === 'bottom' ? .85 : .5 + n.y / 2) };
}
export function defaultPorts(a: NodeLayout, b: NodeLayout): EdgeLayout {
  if (a === b) return { sourcePort: 'right', targetPort: 'bottom' };
  const dx = b.x + b.width / 2 - a.x - a.width / 2;
  const dy = b.y + b.height / 2 - a.y - a.height / 2;
  return Math.abs(dx) >= Math.abs(dy)
    ? { sourcePort: dx >= 0 ? 'right' : 'left', targetPort: dx >= 0 ? 'left' : 'right' }
    : { sourcePort: dy >= 0 ? 'bottom' : 'top', targetPort: dy >= 0 ? 'top' : 'bottom' };
}
const point = (p: Point) => `${+p.x.toFixed(2)} ${+p.y.toFixed(2)}`;
const offset = (p: Point, n: Point, length: number): Point => ({ x: p.x + n.x * length, y: p.y + n.y * length });
const distance = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);

/** Ports and positions are layout data; all curves are derived here. */
export function connectionPath(a: Point, b: Point, from: Port, to: Port, style: EdgeStyle): string {
  const n = normals[from], m = normals[to];
  if (distance(a, b) < 0.01) {
    // Self-loop on a single port: a closed petal leaving and re-entering along the port normal.
    const t = { x: n.y, y: -n.x }, reach = 64;
    return `M ${point(a)} C ${point({ x: a.x + (n.x + t.x) * reach, y: a.y + (n.y + t.y) * reach })}, ${point({ x: a.x + (n.x - t.x) * reach, y: a.y + (n.y - t.y) * reach })}, ${point(a)}`;
  }
  if (style === 'smooth') {
    const reach = Math.max(36, Math.min(180, distance(a, b) * 0.45));
    return `M ${point(a)} C ${point(offset(a, n, reach))}, ${point(offset(b, m, reach))}, ${point(b)}`;
  }
  const stub = 28;
  const start = offset(a, n, stub), end = offset(b, m, stub);
  const route: Point[] = [a, start];
  if (n.x && m.x) {
    if (n.x === -m.x && (end.x - start.x) * n.x >= 0) {
      const mid = (start.x + end.x) / 2;
      route.push({ x: mid, y: start.y }, { x: mid, y: end.y });
    } else if (n.x === m.x) {
      const outside = n.x > 0 ? Math.max(start.x, end.x) + stub : Math.min(start.x, end.x) - stub;
      route.push({ x: outside, y: start.y }, { x: outside, y: end.y });
    } else {
      const mid = Math.abs(start.y - end.y) > 2 * stub ? (start.y + end.y) / 2 : Math.min(start.y, end.y) - 2 * stub;
      route.push({ x: start.x, y: mid }, { x: end.x, y: mid });
    }
  } else if (n.y && m.y) {
    if (n.y === -m.y && (end.y - start.y) * n.y >= 0) {
      const mid = (start.y + end.y) / 2;
      route.push({ x: start.x, y: mid }, { x: end.x, y: mid });
    } else if (n.y === m.y) {
      const outside = n.y > 0 ? Math.max(start.y, end.y) + stub : Math.min(start.y, end.y) - stub;
      route.push({ x: start.x, y: outside }, { x: end.x, y: outside });
    } else {
      const mid = Math.abs(start.x - end.x) > 2 * stub ? (start.x + end.x) / 2 : Math.min(start.x, end.x) - 2 * stub;
      route.push({ x: mid, y: start.y }, { x: mid, y: end.y });
    }
  } else {
    // Perpendicular ports: turn once, choosing the corner that does not run back through the source (also routes self-loops around the node).
    const forward = n.x ? (end.x - start.x) * n.x >= 0 : (end.y - start.y) * n.y >= 0;
    route.push((n.x ? forward : !forward) ? { x: end.x, y: start.y } : { x: start.x, y: end.y });
  }
  route.push(end, b);
  return roundedPolyline(route, style === 'orthogonal' ? 0 : 12);
}
export function roundedPolyline(points: Point[], radius: number): string {
  const clean = points.filter((p, i) => !i || distance(p, points[i - 1]) > 0.01);
  // Remove forward collinear points so a short stub does not limit corner radius.
  for (let i = 1; i < clean.length - 1;) {
    const a = clean[i - 1], b = clean[i], c = clean[i + 1];
    const cross = (b.x - a.x) * (c.y - b.y) - (b.y - a.y) * (c.x - b.x);
    const dot = (b.x - a.x) * (c.x - b.x) + (b.y - a.y) * (c.y - b.y);
    if (Math.abs(cross) < 0.001 && dot >= 0) clean.splice(i, 1); else i++;
  }
  if (!clean.length) return '';
  let d = `M ${point(clean[0])}`;
  for (let i = 1; i < clean.length - 1; i++) {
    const a = clean[i - 1], b = clean[i], c = clean[i + 1];
    const ab = distance(a, b), bc = distance(b, c), r = Math.min(radius, ab / 2, bc / 2);
    if (r < 0.5) { d += ` L ${point(b)}`; continue; }
    const before = { x: b.x + (a.x - b.x) * r / ab, y: b.y + (a.y - b.y) * r / ab };
    const after = { x: b.x + (c.x - b.x) * r / bc, y: b.y + (c.y - b.y) * r / bc };
    d += ` L ${point(before)} Q ${point(b)} ${point(after)}`;
  }
  return d + (clean.length > 1 ? ` L ${point(clean[clean.length - 1])}` : '');
}
/** `excluded` skips a whole node; `valid` is only consulted for ports inside the radius, so policy checks stay cheap during gestures. */
export function nearestPort(document: DiagramDocument, cursor: Point, excluded: string | null, radius: number, valid: (id: string, port: Port) => boolean = () => true): { id: string; port: Port; point: Point } | null {
  let closest = null, best = radius;
  for (const node of document.graph.nodes) {
    if (node.id === excluded) continue;
    for (const port of ports) {
      const p = anchor(document.layout.nodes[node.id], port), d = distance(cursor, p);
      if (d <= best && valid(node.id, port)) { best = d; closest = { id: node.id, port, point: p }; }
    }
  }
  return closest;
}


/** Derived bounding boxes for each group AND each ancestor prefix (names split by "/"). Outer groups enclose inner ones via depth-aware padding. Pure. */
export function groupBounds(document: DiagramDocument, base = 18): Record<string, GroupBox> {
  const acc: Record<string, { x0: number; y0: number; x1: number; y1: number; self: number; max: number }> = Object.create(null);
  for (const node of document.graph.nodes) {
    if (!node.group) continue;
    const box = document.layout.nodes[node.id]; if (!box) continue;
    const segs = node.group.split('/');
    for (let i = 1; i <= segs.length; i++) {
      const prefix = segs.slice(0, i).join('/');
      const a = acc[prefix] ?? (acc[prefix] = { x0: Infinity, y0: Infinity, x1: -Infinity, y1: -Infinity, self: i, max: i });
      a.x0 = Math.min(a.x0, box.x); a.y0 = Math.min(a.y0, box.y);
      a.x1 = Math.max(a.x1, box.x + box.width); a.y1 = Math.max(a.y1, box.y + box.height);
      a.max = Math.max(a.max, segs.length);
    }
  }
  const out: Record<string, GroupBox> = Object.create(null);
  for (const [name, a] of Object.entries(acc)) {
    const pad = base + (a.max - a.self) * 16;
    out[name] = { x: a.x0 - pad, y: a.y0 - pad, width: a.x1 - a.x0 + pad * 2, height: a.y1 - a.y0 + pad * 2, label: name.split('/').at(-1)! };
  }
  return out;
}

/** Full-span swimlane bands for nodes that carry a `lane`, ordered along the main axis. Pure. */
export function laneBands(document: DiagramDocument, orientation: LaneOrientation = 'columns', padding = 24): LaneBand[] {
  const byLane = new Map<string, { x0: number; y0: number; x1: number; y1: number }>();
  let gx0 = Infinity, gy0 = Infinity, gx1 = -Infinity, gy1 = -Infinity, any = false;
  for (const node of document.graph.nodes) {
    if (!node.lane) continue;
    const box = document.layout.nodes[node.id]; if (!box) continue;
    any = true;
    const a = byLane.get(node.lane) ?? (byLane.set(node.lane, { x0: Infinity, y0: Infinity, x1: -Infinity, y1: -Infinity }).get(node.lane)!);
    a.x0 = Math.min(a.x0, box.x); a.y0 = Math.min(a.y0, box.y); a.x1 = Math.max(a.x1, box.x + box.width); a.y1 = Math.max(a.y1, box.y + box.height);
    gx0 = Math.min(gx0, box.x); gy0 = Math.min(gy0, box.y); gx1 = Math.max(gx1, box.x + box.width); gy1 = Math.max(gy1, box.y + box.height);
  }
  if (!any) return [];
  const columns = orientation === 'columns';
  const bands: LaneBand[] = [];
  for (const [lane, a] of byLane) bands.push(columns
    ? { lane, x: a.x0 - padding, y: gy0 - padding, width: a.x1 - a.x0 + padding * 2, height: gy1 - gy0 + padding * 2 }
    : { lane, x: gx0 - padding, y: a.y0 - padding, width: gx1 - gx0 + padding * 2, height: a.y1 - a.y0 + padding * 2 });
  return bands.sort((p, q) => columns ? p.x - q.x : p.y - q.y);
}

import type { DiagramDocument, DiagramEdge, DiagramLayout, NodeType, SemanticGraph } from './types';
import { nodeDefaults } from './types';
import { parseDocument } from './document';
import { defaultPorts } from './geometry';
import { stronglyConnectedComponents, connectedComponents, topologicalOrder } from './algorithms';

export interface AutoLayoutOptions { direction?: 'TB' | 'TD' | 'LR' | 'RL' | 'BT'; gap?: number }

/** Kahn layering in O(nodes + edges). Cycles share a level in the condensed DAG,
 * so downstream nodes still follow the cycle instead of falling back to level zero. */
export function layers(nodes: string[], edges: DiagramEdge[]): Map<string, number> {
  const level = new Map(nodes.map(id => [id, 0]));
  const incoming = new Map(nodes.map(id => [id, 0] as [string, number]));
  const out = new Map<string, string[]>();
  for (const e of edges) {
    if (e.source === e.target) continue;
    (out.get(e.source) ?? out.set(e.source, []).get(e.source)!).push(e.target);
    incoming.set(e.target, (incoming.get(e.target) ?? 0) + 1);
  }
  // Index-based queue (no O(n) shift); seeded with the roots in declaration order.
  const queue = nodes.filter(id => (incoming.get(id) ?? 0) === 0);
  const seen = new Set(queue);
  for (let head = 0; head < queue.length; head++) {
    const id = queue[head];
    for (const target of out.get(id) ?? []) {
      level.set(target, Math.max(level.get(target) ?? 0, (level.get(id) ?? 0) + 1));
      const left = (incoming.get(target) ?? 1) - 1; incoming.set(target, left);
      if (left <= 0 && !seen.has(target)) { seen.add(target); queue.push(target); }
    }
  }
  if (queue.length < nodes.length) {
    const components = stronglyConnectedComponents({ nodes: nodes.map(id => ({ id, type: 'generic', title: id })), edges });
    const componentOf = new Map<string, string>();
    components.forEach((ids, i) => ids.forEach(id => componentOf.set(id, String(i))));
    const condensed = edges.filter(e => componentOf.get(e.source) !== componentOf.get(e.target)).map(e => ({ ...e, source: componentOf.get(e.source)!, target: componentOf.get(e.target)! }));
    const componentLevels = layers(components.map((_, i) => String(i)), condensed);
    for (const id of nodes) level.set(id, componentLevels.get(componentOf.get(id)!)!);
  }
  return level;
}
/** Reorders nodes within each level by the barycenter of their neighbours (Sugiyama) to reduce edge crossings. Mutates byLevel arrays in place. */
function orderLevels(byLevel: Map<number, string[]>, sortedLevels: number[], edges: DiagramEdge[]): void {
  const preds = new Map<string, string[]>(), succs = new Map<string, string[]>();
  for (const e of edges) {
    if (e.source === e.target) continue;
    (succs.get(e.source) ?? succs.set(e.source, []).get(e.source)!).push(e.target);
    (preds.get(e.target) ?? preds.set(e.target, []).get(e.target)!).push(e.source);
  }
  const indexIn = (lvl: number) => { const m = new Map<string, number>(); (byLevel.get(lvl) ?? []).forEach((id, i) => m.set(id, i)); return m; };
  for (let iter = 0; iter < 4; iter++) {
    const topDown = iter % 2 === 0, seq = topDown ? sortedLevels : [...sortedLevels].reverse();
    for (const l of seq) {
      const neighbourIndex = indexIn(topDown ? l - 1 : l + 1);
      if (!neighbourIndex.size) continue;
      const arr = byLevel.get(l)!, near = topDown ? preds : succs;
      const bary = new Map<string, number>();
      arr.forEach((id, i) => {
        const vals = (near.get(id) ?? []).map(n => neighbourIndex.get(n)).filter((v): v is number => v !== undefined);
        bary.set(id, vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : i);
      });
      byLevel.set(l, arr.map((id, i) => ({ id, i })).sort((a, b) => (bary.get(a.id)! - bary.get(b.id)!) || (a.i - b.i)).map(x => x.id));
    }
  }
}
/** Recomputes node positions as a deterministic layered layout, preserving sizes, shapes and semantics. Edge ports are recomputed. Pure. */
export function autoLayout(document: DiagramDocument, options: AutoLayoutOptions = {}): DiagramDocument {
  const horizontal = /LR|RL/i.test(options.direction ?? 'TB'), gap = options.gap ?? 64, pad = 80;
  const order = document.graph.nodes.map(n => n.id);
  const level = layers(order, document.graph.edges);
  const byLevel = new Map<number, string[]>();
  for (const id of order) { const l = level.get(id) ?? 0; (byLevel.get(l) ?? byLevel.set(l, []).get(l)!).push(id); }
  const size = document.layout.nodes;
  const majorSize = (id: string) => horizontal ? size[id].width : size[id].height;
  const minorSize = (id: string) => horizontal ? size[id].height : size[id].width;
  const sortedLevels = [...byLevel.keys()].sort((a, b) => a - b);
  orderLevels(byLevel, sortedLevels, document.graph.edges);
  const majorStart = new Map<number, number>();
  let major = pad;
  for (const l of sortedLevels) {
    majorStart.set(l, major);
    const extent = Math.max(...byLevel.get(l)!.map(majorSize));
    major += extent + gap;
  }
  // Minor extent of each level; narrower levels are centered against the widest so parents sit over their children.
  const extentOf = (l: number) => { const arr = byLevel.get(l)!; return arr.reduce((sum, id) => sum + minorSize(id), 0) + gap * Math.max(0, arr.length - 1); };
  const maxExtent = Math.max(0, ...sortedLevels.map(extentOf));
  const nodes: DiagramLayout['nodes'] = Object.create(null);
  for (const l of sortedLevels) {
    let minor = pad + (maxExtent - extentOf(l)) / 2;
    for (const id of byLevel.get(l)!) {
      const box = size[id], m = majorStart.get(l)!;
      nodes[id] = { ...box, x: horizontal ? m : minor, y: horizontal ? minor : m };
      minor += minorSize(id) + gap;
    }
  }
  if (options.direction === 'BT' || options.direction === 'RL') {
    for (const box of Object.values(nodes)) {
      if (horizontal) box.x = major - gap + pad - box.x - box.width;
      else box.y = major - gap + pad - box.y - box.height;
    }
  }
  const edges: DiagramLayout['edges'] = Object.create(null);
  for (const e of document.graph.edges) if (nodes[e.source] && nodes[e.target]) edges[e.id] = { ...document.layout.edges[e.id], ...defaultPorts(nodes[e.source], nodes[e.target]) };
  return parseDocument({ ...document, layout: { nodes, edges } });
}

/** Returns `target` with node positions taken from `source` where ids match, keeping target's sizes, shapes and semantics. Edge ports are recomputed. Lets you reimport text while preserving manual placement. Pure. */
export function mergeLayout(target: DiagramDocument, source: DiagramDocument): DiagramDocument {
  const nodes: DiagramLayout['nodes'] = Object.create(null);
  for (const [id, box] of Object.entries(target.layout.nodes)) {
    const src = source.layout.nodes[id];
    nodes[id] = src ? { ...box, x: src.x, y: src.y } : { ...box };
  }
  const edges: DiagramLayout['edges'] = Object.create(null);
  for (const e of target.graph.edges) if (nodes[e.source] && nodes[e.target]) edges[e.id] = { ...target.layout.edges[e.id], ...defaultPorts(nodes[e.source], nodes[e.target]) };
  return parseDocument({ ...target, layout: { nodes, edges } });
}

export interface OrganicLayoutOptions { iterations?: number; gap?: number; gravity?: number; seed?: number }
/** Force-directed (Fruchterman–Reingold) layout for network-style graphs without a clear hierarchy.
 * Deterministic: nodes seed on a circle by index and forces run a fixed schedule, so the same input
 * always yields the same layout. A mild gravity keeps disconnected parts bounded. Pure; sizes, shapes
 * and semantics are preserved and ports recomputed. Best for small/medium graphs (O(n² · iterations)). */
export function organicLayout(document: DiagramDocument, options: OrganicLayoutOptions = {}): DiagramDocument {
  const nodesIn = document.graph.nodes, n = nodesIn.length, pad = 80;
  if (n === 0) return parseDocument(document);
  const size = document.layout.nodes;
  const iterations = Math.max(1, options.iterations ?? 300), gravity = options.gravity ?? 0.05;
  const avg = nodesIn.reduce((s, nd) => s + Math.max(size[nd.id].width, size[nd.id].height), 0) / n;
  const gap = options.gap ?? 64, k = avg + gap; // ideal edge length
  const area = k * k * Math.max(n, 4), width = Math.sqrt(area);
  const idx = new Map(nodesIn.map((nd, i) => [nd.id, i]));
  // Deterministic seed: a ring, nudged per index so no two nodes share a spot (avoids divide-by-zero).
  const pos = nodesIn.map((_, i) => {
    const a = (2 * Math.PI * i) / n, r = width / 2 + (i % 3) * (k / 7);
    return { x: Math.cos(a) * r, y: Math.sin(a) * r };
  });
  const disp = pos.map(() => ({ x: 0, y: 0 }));
  const edges = document.graph.edges.filter(e => idx.has(e.source) && idx.has(e.target) && e.source !== e.target);
  let temp = width / 4;
  const cool = temp / (iterations + 1);
  for (let it = 0; it < iterations; it++) {
    for (let i = 0; i < n; i++) { disp[i].x = 0; disp[i].y = 0; }
    for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) {
      let dx = pos[i].x - pos[j].x, dy = pos[i].y - pos[j].y;
      let dist = Math.hypot(dx, dy); if (dist < 0.01) { dx = (i - j) * 0.01 + 0.01; dy = 0.01; dist = Math.hypot(dx, dy); }
      const rep = (k * k) / dist, ux = dx / dist, uy = dy / dist;
      disp[i].x += ux * rep; disp[i].y += uy * rep; disp[j].x -= ux * rep; disp[j].y -= uy * rep;
    }
    for (const e of edges) {
      const a = idx.get(e.source)!, b = idx.get(e.target)!;
      let dx = pos[a].x - pos[b].x, dy = pos[a].y - pos[b].y;
      const dist = Math.max(0.01, Math.hypot(dx, dy)), att = (dist * dist) / k, ux = dx / dist, uy = dy / dist;
      disp[a].x -= ux * att; disp[a].y -= uy * att; disp[b].x += ux * att; disp[b].y += uy * att;
    }
    for (let i = 0; i < n; i++) { disp[i].x -= pos[i].x * gravity; disp[i].y -= pos[i].y * gravity; }
    for (let i = 0; i < n; i++) {
      const d = Math.max(0.01, Math.hypot(disp[i].x, disp[i].y)), step = Math.min(d, temp);
      pos[i].x += (disp[i].x / d) * step; pos[i].y += (disp[i].y / d) * step;
    }
    temp = Math.max(cool, temp - cool);
  }
  let minX = Infinity, minY = Infinity;
  for (let i = 0; i < n; i++) { minX = Math.min(minX, pos[i].x); minY = Math.min(minY, pos[i].y); }
  const nodes: DiagramLayout['nodes'] = Object.create(null);
  nodesIn.forEach((nd, i) => { nodes[nd.id] = { ...size[nd.id], x: Math.round(pos[i].x - minX + pad), y: Math.round(pos[i].y - minY + pad) }; });
  const edgeLayout: DiagramLayout['edges'] = Object.create(null);
  for (const e of document.graph.edges) if (nodes[e.source] && nodes[e.target]) edgeLayout[e.id] = { ...document.layout.edges[e.id], ...defaultPorts(nodes[e.source], nodes[e.target]) };
  return parseDocument({ ...document, layout: { nodes, edges: edgeLayout } });
}

export interface ResolveOverlapsOptions { padding?: number; iterations?: number }
/** Nudges overlapping node boxes apart along their axis of least penetration until none overlap or the
 * iteration budget runs out, keeping the arrangement close to the original. Deterministic and pure;
 * sizes, shapes and semantics are preserved and edge ports recomputed. Good for tidying imports or manual edits. */
export function resolveOverlaps(document: DiagramDocument, options: ResolveOverlapsOptions = {}): DiagramDocument {
  const pad = options.padding ?? 16, iterations = Math.max(1, options.iterations ?? 60);
  const ids = document.graph.nodes.map(n => n.id).filter(id => document.layout.nodes[id]);
  const box = new Map(ids.map(id => { const b = document.layout.nodes[id]; return [id, { x: b.x, y: b.y, w: b.width, h: b.height }]; }));
  for (let it = 0; it < iterations; it++) {
    let moved = false;
    for (let i = 0; i < ids.length; i++) for (let j = i + 1; j < ids.length; j++) {
      const a = box.get(ids[i])!, b = box.get(ids[j])!;
      const dx = (a.x + a.w / 2) - (b.x + b.w / 2), dy = (a.y + a.h / 2) - (b.y + b.h / 2);
      const px = (a.w + b.w) / 2 + pad - Math.abs(dx), py = (a.h + b.h) / 2 + pad - Math.abs(dy);
      if (px <= 0 || py <= 0) continue; // not overlapping
      moved = true;
      if (px < py) { const s = (dx === 0 ? -1 : Math.sign(dx)) * px / 2; a.x += s; b.x -= s; }
      else { const s = (dy === 0 ? -1 : Math.sign(dy)) * py / 2; a.y += s; b.y -= s; }
    }
    if (!moved) break;
  }
  let minX = Infinity, minY = Infinity;
  for (const b of box.values()) { minX = Math.min(minX, b.x); minY = Math.min(minY, b.y); }
  const offX = Number.isFinite(minX) ? Math.max(0, 80 - minX) : 0, offY = Number.isFinite(minY) ? Math.max(0, 80 - minY) : 0;
  const nodes: DiagramLayout['nodes'] = Object.create(null);
  for (const id of Object.keys(document.layout.nodes)) {
    const b = box.get(id);
    nodes[id] = b ? { ...document.layout.nodes[id], x: Math.round(b.x + offX), y: Math.round(b.y + offY) } : { ...document.layout.nodes[id] };
  }
  const edges: DiagramLayout['edges'] = Object.create(null);
  for (const e of document.graph.edges) if (nodes[e.source] && nodes[e.target]) edges[e.id] = { ...document.layout.edges[e.id], ...defaultPorts(nodes[e.source], nodes[e.target]) };
  return parseDocument({ ...document, layout: { nodes, edges } });
}

export interface RadialLayoutOptions { ringGap?: number }
/** Concentric radial layout: nodes are placed on rings by their depth from the roots, and within a ring
 * ordered by the mean angle of their parents to reduce crossings. A single root sits at the center. Good
 * for trees and mind-maps. Deterministic and pure; sizes, shapes and semantics kept, ports recomputed. */
export function radialLayout(document: DiagramDocument, options: RadialLayoutOptions = {}): DiagramDocument {
  const nodesIn = document.graph.nodes, n = nodesIn.length;
  if (!n) return parseDocument(document);
  const size = document.layout.nodes;
  const avg = nodesIn.reduce((s, nd) => s + Math.max(size[nd.id].width, size[nd.id].height), 0) / n;
  const ringGap = options.ringGap ?? avg + 140;
  const order = nodesIn.map(nd => nd.id);
  const level = layers(order, document.graph.edges);
  const byLevel = new Map<number, string[]>();
  for (const id of order) { const d = level.get(id) ?? 0; (byLevel.get(d) ?? byLevel.set(d, []).get(d)!).push(id); }
  const preds = new Map<string, string[]>();
  for (const e of document.graph.edges) if (e.source !== e.target) (preds.get(e.target) ?? preds.set(e.target, []).get(e.target)!).push(e.source);
  const circularMean = (xs: number[]): number => Math.atan2(xs.reduce((s, a) => s + Math.sin(a), 0), xs.reduce((s, a) => s + Math.cos(a), 0));
  const angle = new Map<string, number>();
  const sortedLevels = [...byLevel.keys()].sort((a, b) => a - b), minDepth = sortedLevels[0];
  for (const d of sortedLevels) {
    const arr = byLevel.get(d)!;
    if (d === minDepth) { arr.forEach((id, i) => angle.set(id, arr.length === 1 ? 0 : (2 * Math.PI * i) / arr.length)); continue; }
    const keyed = arr.map((id, i) => {
      const ps = (preds.get(id) ?? []).map(p => angle.get(p)).filter((v): v is number => v !== undefined);
      return { id, i, key: ps.length ? circularMean(ps) : (2 * Math.PI * i) / arr.length };
    }).sort((a, b) => a.key - b.key || a.i - b.i);
    keyed.forEach((k, i) => angle.set(k.id, (2 * Math.PI * i) / keyed.length));
  }
  const singleRoot = byLevel.get(minDepth)!.length === 1;
  const radiusFor = (d: number): number => (d - minDepth + (singleRoot ? 0 : 1)) * ringGap;
  const center: Record<string, { x: number; y: number }> = {};
  for (const id of order) { const d = level.get(id) ?? 0, r = radiusFor(d), a = angle.get(id) ?? 0; center[id] = { x: Math.cos(a) * r, y: Math.sin(a) * r }; }
  let minX = Infinity, minY = Infinity;
  for (const id of order) { minX = Math.min(minX, center[id].x - size[id].width / 2); minY = Math.min(minY, center[id].y - size[id].height / 2); }
  const nodes: DiagramLayout['nodes'] = Object.create(null);
  for (const id of order) { const s = size[id]; nodes[id] = { ...s, x: Math.round(center[id].x - s.width / 2 - minX + 80), y: Math.round(center[id].y - s.height / 2 - minY + 80) }; }
  const edges: DiagramLayout['edges'] = Object.create(null);
  for (const e of document.graph.edges) if (nodes[e.source] && nodes[e.target]) edges[e.id] = { ...document.layout.edges[e.id], ...defaultPorts(nodes[e.source], nodes[e.target]) };
  return parseDocument({ ...document, layout: { nodes, edges } });
}

export interface TreeLayoutOptions { gap?: number; levelGap?: number; direction?: 'TB' | 'LR' }
/** Tidy tree layout (Knuth/Reingold–Tilford first pass): leaves take successive columns and each parent
 * centers over its children, so a hierarchy lays out compactly with no overlaps. Builds a spanning tree
 * from the roots (extra edges are kept but not routed specially); unreachable nodes trail at the end.
 * Deterministic and pure; sizes, shapes and semantics preserved, ports recomputed. Iterative (deep-tree safe). */
export function treeLayout(document: DiagramDocument, options: TreeLayoutOptions = {}): DiagramDocument {
  const nodesIn = document.graph.nodes, n = nodesIn.length;
  if (!n) return parseDocument(document);
  const size = document.layout.nodes;
  const gap = options.gap ?? 48, levelGap = options.levelGap ?? 64, horizontal = options.direction === 'LR', pad = 80;
  const stepX = Math.max(...nodesIn.map(nd => size[nd.id].width)) + gap;
  const stepY = Math.max(...nodesIn.map(nd => size[nd.id].height)) + levelGap;
  const order = nodesIn.map(nd => nd.id), idSet = new Set(order);
  const out = new Map<string, string[]>(), indeg = new Map(order.map(id => [id, 0]));
  for (const id of order) out.set(id, []);
  for (const e of document.graph.edges) {
    if (e.source === e.target || !idSet.has(e.source) || !idSet.has(e.target)) continue;
    out.get(e.source)!.push(e.target); indeg.set(e.target, (indeg.get(e.target) ?? 0) + 1);
  }
  // Spanning tree (BFS from roots), recording each node's children and depth.
  const roots = order.filter(id => (indeg.get(id) ?? 0) === 0);
  const starts = roots.length ? roots : [order[0]];
  const children = new Map<string, string[]>(order.map(id => [id, []]));
  const depth = new Map<string, number>(), seen = new Set<string>();
  const queue = [...starts]; for (const r of starts) { seen.add(r); depth.set(r, 0); }
  for (let h = 0; h < queue.length; h++) {
    const id = queue[h];
    for (const next of out.get(id) ?? []) if (!seen.has(next)) { seen.add(next); depth.set(next, (depth.get(id) ?? 0) + 1); children.get(id)!.push(next); queue.push(next); }
  }
  // Iterative post-order column assignment: leaves advance a counter, parents center over their children.
  const col = new Map<string, number>(); let counter = 0;
  for (const root of starts) {
    const stack: [string, number][] = [[root, 0]];
    while (stack.length) {
      const frame = stack[stack.length - 1], kids = children.get(frame[0])!;
      if (frame[1] < kids.length) { stack.push([kids[frame[1]++], 0]); }
      else { col.set(frame[0], kids.length ? (col.get(kids[0])! + col.get(kids[kids.length - 1])!) / 2 : counter++); stack.pop(); }
    }
  }
  for (const id of order) if (!col.has(id)) { col.set(id, counter++); depth.set(id, 0); } // unreachable trail
  const maxW = stepX - gap;
  const nodes: DiagramLayout['nodes'] = Object.create(null);
  for (const id of order) {
    const b = size[id], major = (depth.get(id) ?? 0) * stepY + pad, minor = (col.get(id) ?? 0) * stepX + pad + (maxW - b.width) / 2;
    nodes[id] = { ...b, x: Math.round(horizontal ? major : minor), y: Math.round(horizontal ? minor : major) };
  }
  const edges: DiagramLayout['edges'] = Object.create(null);
  for (const e of document.graph.edges) if (nodes[e.source] && nodes[e.target]) edges[e.id] = { ...document.layout.edges[e.id], ...defaultPorts(nodes[e.source], nodes[e.target]) };
  return parseDocument({ ...document, layout: { nodes, edges } });
}

export interface CircularLayoutOptions { radius?: number; gap?: number; startAngle?: number }
/** Circular layout: places every node evenly on one ring (as in Gephi, Cytoscape and draw.io).
 * Nodes are ordered by a breadth-first walk from the highest-degree node so neighbours sit adjacent
 * on the ring, which reduces edge crossings versus declaration order. The radius auto-grows so nodes
 * never overlap. Deterministic and pure; sizes, shapes, tags and semantics preserved, ports recomputed. */
export function circularLayout(document: DiagramDocument, options: CircularLayoutOptions = {}): DiagramDocument {
  const nodesIn = document.graph.nodes, n = nodesIn.length;
  if (!n) return parseDocument(document);
  const size = document.layout.nodes, gap = options.gap ?? 48, pad = 80, start = options.startAngle ?? -Math.PI / 2;
  const order = nodesIn.map(nd => nd.id), idSet = new Set(order);
  // Undirected adjacency and degree, for ordering only.
  const adj = new Map<string, string[]>(order.map(id => [id, []])), deg = new Map(order.map(id => [id, 0]));
  for (const e of document.graph.edges) {
    if (e.source === e.target || !idSet.has(e.source) || !idSet.has(e.target)) continue;
    adj.get(e.source)!.push(e.target); adj.get(e.target)!.push(e.source);
    deg.set(e.source, (deg.get(e.source) ?? 0) + 1); deg.set(e.target, (deg.get(e.target) ?? 0) + 1);
  }
  // BFS ordering from the highest-degree node (ties by declaration order); disconnected nodes trail.
  const seen = new Set<string>(), ring: string[] = [];
  const byDegree = [...order].sort((a, b) => (deg.get(b)! - deg.get(a)!) || order.indexOf(a) - order.indexOf(b));
  for (const seed of byDegree) {
    if (seen.has(seed)) continue;
    const queue = [seed]; seen.add(seed);
    for (let h = 0; h < queue.length; h++) {
      const id = queue[h]; ring.push(id);
      for (const next of adj.get(id) ?? []) if (!seen.has(next)) { seen.add(next); queue.push(next); }
    }
  }
  // Radius: large enough that the per-node arc clears the node's diagonal plus the gap.
  const step = Math.max(...order.map(id => Math.hypot(size[id].width, size[id].height))) + gap;
  const radius = Math.max(options.radius ?? 0, step * n / (2 * Math.PI), step / 2);
  const center: Record<string, { x: number; y: number }> = {};
  ring.forEach((id, i) => { const a = start + (2 * Math.PI * i) / n; center[id] = { x: Math.cos(a) * radius, y: Math.sin(a) * radius }; });
  let minX = Infinity, minY = Infinity;
  for (const id of order) { minX = Math.min(minX, center[id].x - size[id].width / 2); minY = Math.min(minY, center[id].y - size[id].height / 2); }
  const nodes: DiagramLayout['nodes'] = Object.create(null);
  for (const id of order) { const b = size[id]; nodes[id] = { ...b, x: Math.round(center[id].x - b.width / 2 - minX + pad), y: Math.round(center[id].y - b.height / 2 - minY + pad) }; }
  const edges: DiagramLayout['edges'] = Object.create(null);
  for (const e of document.graph.edges) if (nodes[e.source] && nodes[e.target]) edges[e.id] = { ...document.layout.edges[e.id], ...defaultPorts(nodes[e.source], nodes[e.target]) };
  return parseDocument({ ...document, layout: { nodes, edges } });
}

export interface ArcLayoutOptions { gap?: number; vertical?: boolean }
/** Arc (linear) layout: places every node on a single baseline, left-to-right in topological order (falling back
 * to declaration order when the graph has a cycle), evenly spaced. The editor-canvas counterpart to the arc
 * diagram export — a 1-D reading of a sequence or dependency chain where edges arc over the line. With
 * `vertical: true` the baseline runs top-to-bottom instead. Deterministic and pure; sizes, shapes, tags and
 * semantics preserved, ports recomputed. */
export function arcLayout(document: DiagramDocument, options: ArcLayoutOptions = {}): DiagramDocument {
  const nodesIn = document.graph.nodes;
  if (!nodesIn.length) return parseDocument(document);
  const size = document.layout.nodes, gap = options.gap ?? 56, pad = 80, vertical = options.vertical ?? false;
  const order = topologicalOrder(document.graph) ?? nodesIn.map(n => n.id);
  const nodes: DiagramLayout['nodes'] = Object.create(null);
  let cursor = pad;
  for (const id of order) {
    const b = size[id]; if (!b) continue;
    nodes[id] = vertical ? { ...b, x: pad, y: cursor } : { ...b, x: cursor, y: pad };
    cursor += (vertical ? b.height : b.width) + gap;
  }
  const edges: DiagramLayout['edges'] = Object.create(null);
  for (const e of document.graph.edges) if (nodes[e.source] && nodes[e.target]) edges[e.id] = { ...document.layout.edges[e.id], ...defaultPorts(nodes[e.source], nodes[e.target]) };
  return parseDocument({ ...document, layout: { nodes, edges } });
}

export interface GridLayoutOptions { columns?: number; gap?: number; rowGap?: number }
/** Grid layout: arranges nodes in a tidy rectangular grid, row by row in declaration order (as in
 * Cytoscape and Gephi). Columns default to ⌈√n⌉ for a near-square grid; every cell is sized to the
 * largest node so nothing overlaps. Deterministic and pure; sizes, shapes, tags and semantics preserved,
 * ports recomputed. Handy for unstructured sets of nodes with few or no edges. */
export function gridLayout(document: DiagramDocument, options: GridLayoutOptions = {}): DiagramDocument {
  const nodesIn = document.graph.nodes, n = nodesIn.length;
  if (!n) return parseDocument(document);
  const size = document.layout.nodes, gap = options.gap ?? 48, rowGap = options.rowGap ?? 48, pad = 80;
  const columns = Math.max(1, Math.min(n, Math.round(options.columns ?? Math.ceil(Math.sqrt(n)))));
  const cellW = Math.max(...nodesIn.map(nd => size[nd.id].width)) + gap;
  const cellH = Math.max(...nodesIn.map(nd => size[nd.id].height)) + rowGap;
  const nodes: DiagramLayout['nodes'] = Object.create(null);
  nodesIn.forEach((nd, i) => {
    const b = size[nd.id], col = i % columns, row = Math.floor(i / columns);
    nodes[nd.id] = { ...b, x: Math.round(pad + col * cellW + (cellW - gap - b.width) / 2), y: Math.round(pad + row * cellH + (cellH - rowGap - b.height) / 2) };
  });
  const edges: DiagramLayout['edges'] = Object.create(null);
  for (const e of document.graph.edges) if (nodes[e.source] && nodes[e.target]) edges[e.id] = { ...document.layout.edges[e.id], ...defaultPorts(nodes[e.source], nodes[e.target]) };
  return parseDocument({ ...document, layout: { nodes, edges } });
}

export interface MergeOptions { gap?: number }
/** Composes two documents into one: `b` is placed to the right of `a` (with `gap`), and any of `b`'s node
 * or edge ids that collide with `a` are suffixed. Groups, shapes, tags and ports are preserved. Pure;
 * neither input is mutated. Useful to assemble diagrams or insert a template into an existing one. */
export function mergeDocuments(a: DiagramDocument, b: DiagramDocument, options: MergeOptions = {}): DiagramDocument {
  const gap = options.gap ?? 80;
  const aBoxes = Object.values(a.layout.nodes);
  const offsetX = (aBoxes.length ? Math.max(...aBoxes.map(x => x.x + x.width)) : 0) + gap;
  const aMinY = aBoxes.length ? Math.min(...aBoxes.map(x => x.y)) : 80;
  const bBoxes = Object.values(b.layout.nodes);
  const bMinY = bBoxes.length ? Math.min(...bBoxes.map(x => x.y)) : 80;
  const usedNodes = new Set(a.graph.nodes.map(n => n.id)), usedEdges = new Set(a.graph.edges.map(e => e.id));
  const uniq = (id: string, used: Set<string>): string => { let n = id, i = 2; while (used.has(n)) n = `${id}-${i++}`; used.add(n); return n; };
  const nodeMap = new Map<string, string>();
  for (const n of b.graph.nodes) nodeMap.set(n.id, uniq(n.id, usedNodes));

  const nodes = [...a.graph.nodes.map(n => ({ ...n })), ...b.graph.nodes.map(n => ({ ...n, id: nodeMap.get(n.id)! }))];
  const incomingRoutes = new Map<string, DiagramLayout['edges'][string]>();
  const edges = [
    ...a.graph.edges.map(e => ({ ...e })),
    ...b.graph.edges.map(e => { const id = uniq(e.id, usedEdges); incomingRoutes.set(id, b.layout.edges[e.id]); return { ...e, id, source: nodeMap.get(e.source) ?? e.source, target: nodeMap.get(e.target) ?? e.target }; }),
  ];
  const layoutNodes: DiagramLayout['nodes'] = Object.create(null);
  for (const [id, box] of Object.entries(a.layout.nodes)) layoutNodes[id] = { ...box };
  for (const n of b.graph.nodes) { const src = b.layout.nodes[n.id]; if (src) layoutNodes[nodeMap.get(n.id)!] = { ...src, x: src.x + offsetX, y: src.y - bMinY + aMinY }; }
  const layoutEdges: DiagramLayout['edges'] = Object.create(null);
  for (const e of edges) if (layoutNodes[e.source] && layoutNodes[e.target]) layoutEdges[e.id] = { ...(incomingRoutes.get(e.id) ?? a.layout.edges[e.id] ?? defaultPorts(layoutNodes[e.source], layoutNodes[e.target])) };
  return parseDocument({ ...a, graph: { nodes, edges }, layout: { nodes: layoutNodes, edges: layoutEdges } });
}

export interface FitSizesOptions { charWidth?: number; paddingX?: number; minWidth?: number; maxWidth?: number; iconAllowance?: number; height?: number }
/** Resizes every node so its title fits, instead of being truncated (as React Flow / draw.io / Excalidraw
 * auto-size text). Width is estimated from the title length, adjusted per shape (diamonds and ellipses need
 * extra room; rectangles reserve space for the type icon) and clamped to [minWidth, maxWidth] (minWidth never below the 140px floor). Positions,
 * shapes, tags, semantics and edge ports are preserved — run a layout afterwards if the wider boxes overlap.
 * Pure and deterministic; text is estimated without a DOM. */
export function fitNodeSizes(document: DiagramDocument, options: FitSizesOptions = {}): DiagramDocument {
  const cw = options.charWidth ?? 7.3, px = options.paddingX ?? 20, min = Math.max(140, options.minWidth ?? 140), max = Math.max(min, options.maxWidth ?? 360), icon = options.iconAllowance ?? 44;
  const nodes: DiagramLayout['nodes'] = Object.create(null);
  for (const [id, box] of Object.entries(document.layout.nodes)) nodes[id] = { ...box };
  for (const node of document.graph.nodes) {
    const box = nodes[node.id]; if (!box) continue;
    const shape = box.shape ?? 'rectangle';
    const factor = shape === 'diamond' ? 1.7 : shape === 'ellipse' ? 1.25 : 1;
    const allowance = shape === 'rectangle' ? icon : 0;
    const chars = [...node.title].length;
    const width = Math.max(min, Math.min(max, Math.round(px * 2 + allowance + chars * cw * factor)));
    nodes[node.id] = { ...box, width, ...(options.height ? { height: Math.max(76, options.height) } : {}) };
  }
  return parseDocument({ ...document, layout: { nodes, edges: document.layout.edges } });
}

/** Extracts the sub-diagram induced by `keep`: those nodes (in their original order) and only the edges whose
 * both endpoints are kept. Positions, shapes, tags, groups and edge ports are preserved verbatim — nothing is
 * re-laid-out. Pure; the input is untouched. Useful to isolate, export or drill into part of a large diagram. */
export function subgraph(document: DiagramDocument, keep: Iterable<string>): DiagramDocument {
  const set = keep instanceof Set ? keep : new Set(keep);
  const nodes = document.graph.nodes.filter(n => set.has(n.id)).map(n => ({ ...n }));
  const edges = document.graph.edges.filter(e => set.has(e.source) && set.has(e.target)).map(e => ({ ...e }));
  const layoutNodes: DiagramLayout['nodes'] = Object.create(null);
  for (const n of nodes) if (document.layout.nodes[n.id]) layoutNodes[n.id] = { ...document.layout.nodes[n.id] };
  const layoutEdges: DiagramLayout['edges'] = Object.create(null);
  for (const e of edges) if (document.layout.edges[e.id]) layoutEdges[e.id] = { ...document.layout.edges[e.id] };
  return parseDocument({ ...document, graph: { nodes, edges }, layout: { nodes: layoutNodes, edges: layoutEdges } });
}

export interface EgoOptions { depth?: number; directed?: boolean }
/** The ego network of `center`: the node plus everything within `depth` hops (undirected by default; set
 * `directed` to follow edge direction only). Returns the induced sub-diagram via {@link subgraph}, so layout
 * and semantics are preserved. Throws when `center` is not in the graph. Pure and deterministic. */
export function ego(document: DiagramDocument, center: string, options: EgoOptions = {}): DiagramDocument {
  if (!document.graph.nodes.some(n => n.id === center)) throw new Error(`El nodo «${center}» no existe.`);
  const depth = Math.max(0, options.depth ?? 1);
  const out = new Map<string, string[]>();
  for (const n of document.graph.nodes) out.set(n.id, []);
  for (const e of document.graph.edges) {
    if (e.source === e.target || !out.has(e.source) || !out.has(e.target)) continue;
    out.get(e.source)!.push(e.target);
    if (!options.directed) out.get(e.target)!.push(e.source);
  }
  const seen = new Set([center]); let frontier = [center];
  for (let d = 0; d < depth; d++) {
    const next: string[] = [];
    for (const id of frontier) for (const nb of out.get(id) ?? []) if (!seen.has(nb)) { seen.add(nb); next.push(nb); }
    frontier = next;
    if (!frontier.length) break;
  }
  return subgraph(document, seen);
}

/** Snaps every node's position to the nearest multiple of `grid`, tidying hand-placed or imported diagrams
 * (the one-shot counterpart to the editor's magnetic grid). Sizes, shapes, tags, semantics and edge ports are
 * preserved; only x/y move. Pure and deterministic; the input is untouched. */
export function snapToGrid(document: DiagramDocument, grid = 16): DiagramDocument {
  const g = Math.max(1, Math.round(grid));
  const nodes: DiagramLayout['nodes'] = Object.create(null);
  for (const [id, box] of Object.entries(document.layout.nodes)) nodes[id] = { ...box, x: Math.round(box.x / g) * g, y: Math.round(box.y / g) * g };
  return parseDocument({ ...document, layout: { nodes, edges: document.layout.edges } });
}

/** Collapses each group into a single super-node, producing a high-level overview of a detailed grouped
 * diagram. Ungrouped nodes are kept as-is. Cross-group edges are rerouted between super-nodes and de-duplicated;
 * edges internal to a group are dropped. The super-node is placed at its members' bounding-box centre. Pure
 * and deterministic; the input is untouched. A no-op (copy) when there are no groups. */
export function collapseGroups(document: DiagramDocument): DiagramDocument {
  const groups = [...new Set(document.graph.nodes.map(n => n.group).filter((g): g is string => !!g))];
  if (!groups.length) return parseDocument(document);
  const superId = new Map(groups.map(g => [g, `grupo-${g.replace(/[^A-Za-z0-9_-]/g, '_').slice(0, 110)}`]));
  const rep = (id: string): string => { const n = document.graph.nodes.find(x => x.id === id); return n && n.group ? superId.get(n.group)! : id; };
  const nodes: DiagramLayout['nodes'] = Object.create(null);
  const graphNodes: SemanticGraph['nodes'] = [];
  for (const node of document.graph.nodes) if (!node.group) { graphNodes.push({ ...node }); if (document.layout.nodes[node.id]) nodes[node.id] = { ...document.layout.nodes[node.id] }; }
  for (const g of groups) {
    const members = document.graph.nodes.filter(n => n.group === g).map(n => document.layout.nodes[n.id]).filter(Boolean);
    const id = superId.get(g)!;
    graphNodes.push({ id, type: 'generic', title: g });
    if (members.length) {
      const minX = Math.min(...members.map(b => b.x)), minY = Math.min(...members.map(b => b.y));
      const maxX = Math.max(...members.map(b => b.x + b.width)), maxY = Math.max(...members.map(b => b.y + b.height));
      nodes[id] = { x: Math.round((minX + maxX) / 2 - 105), y: Math.round((minY + maxY) / 2 - 46), width: 210, height: 92 };
    } else nodes[id] = { x: 80, y: 80, width: 210, height: 92 };
  }
  const edges: SemanticGraph['edges'] = [], seen = new Set<string>();
  for (const e of document.graph.edges) {
    const s = rep(e.source), t = rep(e.target); if (s === t) continue;
    const key = `${s}\u0000${t}`; if (seen.has(key)) continue; seen.add(key);
    edges.push({ id: `e-${edges.length}`, source: s, target: t, ...(e.label ? { label: e.label } : {}) });
  }
  const layoutEdges: DiagramLayout['edges'] = Object.create(null);
  for (const e of edges) if (nodes[e.source] && nodes[e.target]) layoutEdges[e.id] = defaultPorts(nodes[e.source], nodes[e.target]);
  return parseDocument({ ...document, graph: { nodes: graphNodes, edges }, layout: { nodes, edges: layoutEdges } });
}

export type GroupKey = 'type' | 'tag' | 'lane' | ((node: SemanticGraph['nodes'][number]) => string | undefined);
/** Assigns each node's `group` from a key — its node type, first tag, lane, or a custom function — so a diagram
 * can be organized in one call (a counterpart to auto-grouping by connected component or community). Nodes whose
 * key is empty are left ungrouped. Only the semantic `group` changes; layout/positions are untouched. Pure. */
export function groupBy(document: DiagramDocument, key: GroupKey): DiagramDocument {
  const fn = typeof key === 'function' ? key : (n: SemanticGraph['nodes'][number]): string | undefined => key === 'type' ? n.type : key === 'lane' ? n.lane : n.tags?.[0];
  const nodes = document.graph.nodes.map(n => { const g = fn(n); const { group: _drop, ...rest } = n; return g ? { ...rest, group: g } : { ...rest }; });
  return parseDocument({ ...document, graph: { ...document.graph, nodes } });
}

export interface ClusterLayoutOptions { gap?: number; direction?: 'LR' | 'TB' }
/** Group-aware layout: each group's nodes are laid out together (via autoLayout on the induced subgraph) and
 * the resulting clusters are arranged in a row (LR) or column (TB), with ungrouped nodes forming one more cluster.
 * Keeps groups visually cohesive — what plain autoLayout, which ignores groups, cannot. Sizes, shapes, tags and
 * semantics are preserved; positions and ports are recomputed. Pure and deterministic. */
export function clusterLayout(document: DiagramDocument, options: ClusterLayoutOptions = {}): DiagramDocument {
  const gap = options.gap ?? 96, horizontal = (options.direction ?? 'LR') === 'LR', pad = 80;
  const groups = [...new Set(document.graph.nodes.map(n => n.group).filter((g): g is string => !!g))];
  const ungrouped = document.graph.nodes.filter(n => !n.group).map(n => n.id);
  const cells: string[][] = [...groups.map(g => document.graph.nodes.filter(n => n.group === g).map(n => n.id)), ...(ungrouped.length ? [ungrouped] : [])];
  const pos = new Map<string, { x: number; y: number }>();
  let cursor = pad;
  for (const ids of cells) {
    if (!ids.length) continue;
    const sub = autoLayout(subgraph(document, ids));
    const boxes = ids.map(id => sub.layout.nodes[id]).filter(Boolean);
    const minX = Math.min(...boxes.map(b => b.x)), minY = Math.min(...boxes.map(b => b.y));
    const w = Math.max(...boxes.map(b => b.x + b.width)) - minX, h = Math.max(...boxes.map(b => b.y + b.height)) - minY;
    for (const id of ids) { const b = sub.layout.nodes[id]; if (b) pos.set(id, { x: b.x - minX + (horizontal ? cursor : pad), y: b.y - minY + (horizontal ? pad : cursor) }); }
    cursor += (horizontal ? w : h) + gap;
  }
  const nodes: DiagramLayout['nodes'] = Object.create(null);
  for (const [id, box] of Object.entries(document.layout.nodes)) { const p = pos.get(id); nodes[id] = { ...box, x: p ? p.x : box.x, y: p ? p.y : box.y }; }
  const edges: DiagramLayout['edges'] = Object.create(null);
  for (const e of document.graph.edges) if (nodes[e.source] && nodes[e.target]) edges[e.id] = { ...document.layout.edges[e.id], ...defaultPorts(nodes[e.source], nodes[e.target]) };
  return parseDocument({ ...document, layout: { nodes, edges } });
}

export interface Bounds { x: number; y: number; width: number; height: number }
/** The diagram's bounding box in world coordinates (min corner + size), spanning all node boxes. Empty docs
 * return a zero box. Pure — handy for custom export sizing, embedding or viewport math (cf. React Flow's
 * getNodesBounds). */
export function documentBounds(document: DiagramDocument): Bounds {
  const boxes = Object.values(document.layout.nodes);
  if (!boxes.length) return { x: 0, y: 0, width: 0, height: 0 };
  const minX = Math.min(...boxes.map(b => b.x)), minY = Math.min(...boxes.map(b => b.y));
  const maxX = Math.max(...boxes.map(b => b.x + b.width)), maxY = Math.max(...boxes.map(b => b.y + b.height));
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}
/** Shifts every node so the diagram's top-left sits at `pad` (default 80), removing large coordinate offsets
 * that importers often introduce. Relative positions, sizes, shapes, tags, semantics and ports are preserved.
 * Pure and deterministic; the input is untouched. */
export function normalizePositions(document: DiagramDocument, pad = 80): DiagramDocument {
  const b = documentBounds(document), dx = pad - b.x, dy = pad - b.y;
  const nodes: DiagramLayout['nodes'] = Object.create(null);
  for (const [id, box] of Object.entries(document.layout.nodes)) nodes[id] = { ...box, x: box.x + dx, y: box.y + dy };
  return parseDocument({ ...document, layout: { nodes, edges: document.layout.edges } });
}

export interface UnionOptions { prefer?: 'a' | 'b' }
/** Merges two documents by id: nodes/edges with the same id are the SAME element (deduplicated), unlike
 * mergeDocuments which renames collisions. On a conflict, `prefer` (default 'b') decides whose semantics and
 * layout win. Useful to combine partial diagrams from different sources or apply an update. Pure. */
export function unionDocuments(a: DiagramDocument, b: DiagramDocument, options: UnionOptions = {}): DiagramDocument {
  const bWins = (options.prefer ?? 'b') === 'b';
  const [first, second] = bWins ? [a, b] : [b, a]; // `second` overrides `first`
  const nodeById = new Map<string, SemanticGraph['nodes'][number]>();
  for (const n of first.graph.nodes) nodeById.set(n.id, { ...n });
  for (const n of second.graph.nodes) nodeById.set(n.id, { ...n });
  const edgeById = new Map<string, SemanticGraph['edges'][number]>();
  for (const e of first.graph.edges) edgeById.set(e.id, { ...e });
  for (const e of second.graph.edges) edgeById.set(e.id, { ...e });
  const nodes = [...nodeById.values()], ids = new Set(nodeById.keys());
  const edges = [...edgeById.values()].filter(e => ids.has(e.source) && ids.has(e.target));
  const layoutNodes: DiagramLayout['nodes'] = Object.create(null);
  for (const n of nodes) { const box = second.layout.nodes[n.id] ?? first.layout.nodes[n.id]; if (box) layoutNodes[n.id] = { ...box }; }
  const layoutEdges: DiagramLayout['edges'] = Object.create(null);
  for (const e of edges) { const r = second.layout.edges[e.id] ?? first.layout.edges[e.id]; layoutEdges[e.id] = r ? { ...r } : defaultPorts(layoutNodes[e.source], layoutNodes[e.target]); }
  return parseDocument({ ...a, graph: { nodes, edges }, layout: { nodes: layoutNodes, edges: layoutEdges } });
}

/** Renames node ids via `fn(oldId, node)`, remapping edge endpoints and the layout to match. Colliding results
 * are de-duplicated with a numeric suffix. Edge ids, positions, shapes, tags, groups and semantics are otherwise
 * preserved. Useful to namespace a document before unionDocuments/mergeDocuments, or to produce readable ids.
 * Pure; the input is untouched. */
export function relabelIds(document: DiagramDocument, fn: (id: string, node: SemanticGraph['nodes'][number]) => string): DiagramDocument {
  const map = new Map<string, string>(), used = new Set<string>();
  for (const n of document.graph.nodes) {
    let next = fn(n.id, n) || n.id; let i = 2;
    while (used.has(next)) next = `${fn(n.id, n) || n.id}-${i++}`;
    used.add(next); map.set(n.id, next);
  }
  const id = (old: string) => map.get(old) ?? old;
  const nodes = document.graph.nodes.map(n => ({ ...n, id: id(n.id) }));
  const edges = document.graph.edges.map(e => ({ ...e, source: id(e.source), target: id(e.target) }));
  const layoutNodes: DiagramLayout['nodes'] = Object.create(null);
  for (const [old, box] of Object.entries(document.layout.nodes)) layoutNodes[id(old)] = { ...box };
  const layoutEdges: DiagramLayout['edges'] = Object.create(null);
  for (const [eid, route] of Object.entries(document.layout.edges)) layoutEdges[eid] = { ...route };
  return parseDocument({ ...document, graph: { nodes, edges }, layout: { nodes: layoutNodes, edges: layoutEdges } });
}

export interface MergeNodesOptions { into?: string; title?: string }
/** Contracts a set of nodes into a single one — a semantic node-merge no plain canvas editor offers. Every edge
 * touching the set is rewired to the survivor; intra-set edges become self-loops and are dropped, and edges that
 * then coincide (same source, target, label and relation) are de-duplicated. The survivor keeps its identity
 * (override its id with `into` and its title with `title`) and moves to the centroid of the merged boxes. Pure;
 * the input is untouched. Returns the document unchanged when fewer than two of the ids exist. */
export function mergeNodes(document: DiagramDocument, ids: string[], options: MergeNodesOptions = {}): DiagramDocument {
  const present = document.graph.nodes.filter(n => ids.includes(n.id)).map(n => n.id);
  const survivor = options.into && present.includes(options.into) ? options.into : present[0];
  if (present.length < 2 || !survivor) return parseDocument(document);
  const merged = new Set(present.filter(id => id !== survivor)); // folded into the survivor
  const remap = (id: string): string => (merged.has(id) ? survivor : id);

  const nodes = document.graph.nodes
    .filter(n => !merged.has(n.id))
    .map(n => n.id === survivor && options.title ? { ...n, title: options.title } : { ...n });

  const seen = new Set<string>(), edges: SemanticGraph['edges'] = [], rerouted = new Set<string>();
  for (const e of document.graph.edges) {
    const source = remap(e.source), target = remap(e.target);
    if (source === target) continue; // intra-set edge -> self-loop, drop
    const key = `${source}\u0000${target}\u0000${e.label ?? ''}\u0000${e.relation ?? ''}`;
    if (seen.has(key)) continue; // coincident after the merge
    seen.add(key); edges.push({ ...e, source, target });
    if (source !== e.source || target !== e.target) rerouted.add(e.id); // endpoint moved -> recompute ports
  }

  // Survivor moves to the centroid of the merged boxes, keeping its own size.
  const boxes = present.map(id => document.layout.nodes[id]).filter(Boolean);
  const layoutNodes: DiagramLayout['nodes'] = Object.create(null);
  for (const n of nodes) {
    const box = document.layout.nodes[n.id]; if (!box) continue;
    if (n.id === survivor && boxes.length) {
      const cx = boxes.reduce((s, b) => s + b.x + b.width / 2, 0) / boxes.length;
      const cy = boxes.reduce((s, b) => s + b.y + b.height / 2, 0) / boxes.length;
      layoutNodes[n.id] = { ...box, x: Math.round(cx - box.width / 2), y: Math.round(cy - box.height / 2) };
    } else layoutNodes[n.id] = { ...box };
  }
  const layoutEdges: DiagramLayout['edges'] = Object.create(null);
  for (const e of edges) {
    const prior = document.layout.edges[e.id];
    layoutEdges[e.id] = (prior && !rerouted.has(e.id)) ? { ...prior } : { ...prior, ...defaultPorts(layoutNodes[e.source], layoutNodes[e.target]) };
  }
  return parseDocument({ ...document, graph: { nodes, edges }, layout: { nodes: layoutNodes, edges: layoutEdges } });
}

export interface SplitEdgeOptions { id?: string; type?: NodeType; title?: string; width?: number; height?: number }
/** Inserts a node in the middle of an edge, splitting it into two (as draw.io's "add node on edge"; the inverse
 * of {@link mergeNodes}). The edge `s→t` becomes `s→new→t`; the original edge's label/relation/condition/tags
 * move to the first segment (`s→new`). The new node is placed at the midpoint of the endpoints and sized from the
 * type's defaults. Pure; the input is untouched. Returns the document unchanged when the edge id is unknown. */
export function splitEdge(document: DiagramDocument, edgeId: string, options: SplitEdgeOptions = {}): DiagramDocument {
  const edge = document.graph.edges.find(e => e.id === edgeId);
  if (!edge) return parseDocument(document);
  const nodeIds = new Set(document.graph.nodes.map(n => n.id));
  let id = options.id || `${edgeId}-mid`; let i = 2; while (nodeIds.has(id)) id = `${options.id || `${edgeId}-mid`}-${i++}`;
  const type = options.type ?? 'process', def = nodeDefaults[type] ?? { width: 200, height: 92 };
  const width = options.width ?? def.width, height = options.height ?? def.height;

  const { label, relation, condition, tags, ...plain } = edge;
  const existingEdgeIds = new Set(document.graph.edges.map(e => e.id));
  const freshEdgeId = (base: string): string => { let e = base, k = 2; while (existingEdgeIds.has(e)) e = `${base}-${k++}`; existingEdgeIds.add(e); return e; };
  const e1: DiagramEdge = { ...plain, id: freshEdgeId(`${edgeId}-a`), source: edge.source, target: id, ...(label ? { label } : {}), ...(relation ? { relation } : {}), ...(condition ? { condition } : {}), ...(tags ? { tags } : {}) };
  const e2: DiagramEdge = { id: freshEdgeId(`${edgeId}-b`), source: id, target: edge.target };

  const nodes = [...document.graph.nodes.map(n => ({ ...n })), { id, type, title: options.title ?? '' }];
  const edges = document.graph.edges.flatMap(e => e.id === edgeId ? [e1, e2] : [{ ...e }]);

  const sBox = document.layout.nodes[edge.source], tBox = document.layout.nodes[edge.target];
  const cx = sBox && tBox ? (sBox.x + sBox.width / 2 + tBox.x + tBox.width / 2) / 2 : (sBox?.x ?? 80);
  const cy = sBox && tBox ? (sBox.y + sBox.height / 2 + tBox.y + tBox.height / 2) / 2 : (sBox?.y ?? 80);
  const layoutNodes: DiagramLayout['nodes'] = Object.create(null);
  for (const [nid, box] of Object.entries(document.layout.nodes)) layoutNodes[nid] = { ...box };
  layoutNodes[id] = { x: Math.round(cx - width / 2), y: Math.round(cy - height / 2), width, height, ...(def.shape ? { shape: def.shape } : {}) };
  const layoutEdges: DiagramLayout['edges'] = Object.create(null);
  for (const e of edges) {
    if (e.id === edgeId) continue;
    const prior = document.layout.edges[e.id];
    layoutEdges[e.id] = prior ? { ...prior } : defaultPorts(layoutNodes[e.source], layoutNodes[e.target]);
  }
  return parseDocument({ ...document, graph: { nodes, edges }, layout: { nodes: layoutNodes, edges: layoutEdges } });
}

/** Removes a node but keeps the flow through it: every predecessor is reconnected to every successor (graph
 * "node smoothing" / series contraction), unlike a plain delete that would sever the path. New `pred→succ` edges
 * are added only when absent (no duplicates, no self-loops); existing edges keep their routes, new ones get
 * default ports. Pure; the input is untouched. Returns the document unchanged when the id is unknown. Handy to
 * drop an intermediate step from a pipeline without breaking connectivity. */
export function bypassNode(document: DiagramDocument, id: string): DiagramDocument {
  if (!document.graph.nodes.some(n => n.id === id)) return parseDocument(document);
  const preds: string[] = [], succs: string[] = [];
  for (const e of document.graph.edges) {
    if (e.target === id && e.source !== id && !preds.includes(e.source)) preds.push(e.source);
    if (e.source === id && e.target !== id && !succs.includes(e.target)) succs.push(e.target);
  }
  const nodes = document.graph.nodes.filter(n => n.id !== id).map(n => ({ ...n }));
  const edges = document.graph.edges.filter(e => e.source !== id && e.target !== id).map(e => ({ ...e }));
  const pairKey = (a: string, b: string) => `${a}\u0000${b}`;
  const have = new Set(edges.map(e => pairKey(e.source, e.target)));
  const existingIds = new Set(edges.map(e => e.id));
  const freshId = (base: string): string => { let x = base, k = 2; while (existingIds.has(x)) x = `${base}-${k++}`; existingIds.add(x); return x; };
  for (const p of preds) for (const s of succs) {
    if (p === s || have.has(pairKey(p, s))) continue;
    have.add(pairKey(p, s));
    edges.push({ id: freshId(`${p}-${s}`), source: p, target: s });
  }
  const layoutNodes: DiagramLayout['nodes'] = Object.create(null);
  for (const n of nodes) if (document.layout.nodes[n.id]) layoutNodes[n.id] = { ...document.layout.nodes[n.id] };
  const layoutEdges: DiagramLayout['edges'] = Object.create(null);
  for (const e of edges) { const prior = document.layout.edges[e.id]; layoutEdges[e.id] = prior ? { ...prior } : defaultPorts(layoutNodes[e.source], layoutNodes[e.target]); }
  return parseDocument({ ...document, graph: { nodes, edges }, layout: { nodes: layoutNodes, edges: layoutEdges } });
}

export interface ReduceCrossingsOptions { gap?: number; rankGap?: number; iterations?: number; direction?: 'TB' | 'LR' }
/** Re-lays the diagram as a tidy layered drawing that actively minimises edge crossings (Sugiyama's barycenter
 * heuristic): nodes keep their hierarchical rank (depth from the roots) but are reordered within each rank by the
 * average position of their neighbours in the adjacent rank, sweeping down then up for `iterations` passes. Fewer
 * crossings than the plain layered layout — verify with {@link layoutMetrics}. Deterministic and pure; sizes,
 * shapes, tags and semantics preserved, ports recomputed. */
export function reduceCrossings(document: DiagramDocument, options: ReduceCrossingsOptions = {}): DiagramDocument {
  const nodesIn = document.graph.nodes, n = nodesIn.length;
  if (!n) return parseDocument(document);
  const size = document.layout.nodes, horizontal = options.direction === 'LR';
  const gap = options.gap ?? 48, rankGap = options.rankGap ?? 72, iterations = options.iterations ?? 4, pad = 80;
  const order = nodesIn.map(nd => nd.id), idSet = new Set(order);
  const edges = document.graph.edges.filter(e => e.source !== e.target && idSet.has(e.source) && idSet.has(e.target));
  const rank = layers(order, edges);
  const byRank = new Map<number, string[]>();
  for (const id of order) { const r = rank.get(id) ?? 0; (byRank.get(r) ?? byRank.set(r, []).get(r)!).push(id); }
  const ranks = [...byRank.keys()].sort((a, b) => a - b);
  // Neighbours in the lower (up) and higher (down) rank, for the barycenter sweeps.
  const up = new Map<string, string[]>(order.map(id => [id, []])), down = new Map<string, string[]>(order.map(id => [id, []]));
  for (const e of edges) {
    const rs = rank.get(e.source) ?? 0, rt = rank.get(e.target) ?? 0;
    if (rt > rs) { up.get(e.target)!.push(e.source); down.get(e.source)!.push(e.target); }
    else if (rs > rt) { up.get(e.source)!.push(e.target); down.get(e.target)!.push(e.source); }
  }
  const indexMap = (layer: string[]): Map<string, number> => { const m = new Map<string, number>(); layer.forEach((id, i) => m.set(id, i)); return m; };
  const sweep = (layer: string[], neigh: Map<string, string[]>, ref: Map<string, number>): string[] => {
    const bary = new Map<string, number>();
    layer.forEach((id, i) => { const ps = neigh.get(id)!.map(x => ref.get(x)).filter((v): v is number => v != null); bary.set(id, ps.length ? ps.reduce((a, b) => a + b, 0) / ps.length : i); });
    const orig = indexMap(layer);
    return [...layer].sort((a, b) => (bary.get(a)! - bary.get(b)!) || (orig.get(a)! - orig.get(b)!)); // stable on ties
  };
  for (let it = 0; it < iterations; it++) {
    if (it % 2 === 0) for (let i = 1; i < ranks.length; i++) byRank.set(ranks[i], sweep(byRank.get(ranks[i])!, up, indexMap(byRank.get(ranks[i - 1])!)));
    else for (let i = ranks.length - 2; i >= 0; i--) byRank.set(ranks[i], sweep(byRank.get(ranks[i])!, down, indexMap(byRank.get(ranks[i + 1])!)));
  }
  const crossExtent = (id: string) => horizontal ? size[id].height : size[id].width;
  const rankExtent = (id: string) => horizontal ? size[id].width : size[id].height;
  const cell = Math.max(...order.map(crossExtent)) + gap;
  const bandByRank = new Map<number, number>();
  for (const id of order) { const r = rank.get(id) ?? 0; bandByRank.set(r, Math.max(bandByRank.get(r) ?? 0, rankExtent(id))); }
  const rankTop = new Map<number, number>(); let acc = pad;
  for (const r of ranks) { rankTop.set(r, acc); acc += (bandByRank.get(r) ?? 0) + rankGap; }
  const nodes: DiagramLayout['nodes'] = Object.create(null);
  for (const r of ranks) byRank.get(r)!.forEach((id, slot) => {
    const b = size[id], crossCenter = pad + slot * cell + cell / 2, rankCenter = (rankTop.get(r) ?? pad) + (bandByRank.get(r) ?? 0) / 2;
    nodes[id] = horizontal
      ? { ...b, x: Math.round(rankCenter - b.width / 2), y: Math.round(crossCenter - b.height / 2) }
      : { ...b, x: Math.round(crossCenter - b.width / 2), y: Math.round(rankCenter - b.height / 2) };
  });
  const layoutEdges: DiagramLayout['edges'] = Object.create(null);
  for (const e of document.graph.edges) if (nodes[e.source] && nodes[e.target]) layoutEdges[e.id] = { ...document.layout.edges[e.id], ...defaultPorts(nodes[e.source], nodes[e.target]) };
  return parseDocument({ ...document, layout: { nodes, edges: layoutEdges } });
}

export interface StableLayoutOptions { gap?: number }
/** Incremental "stable" layout: keeps every node that already exists in `reference` at its reference position, and
 * only places nodes that are new in `document` — near the centroid of their already-placed neighbours, nudged down
 * until they don't overlap (new nodes without a placed neighbour go in a fresh row below everything). This avoids
 * the disorienting full re-layout "jump" when a diagram is edited, imported or merged, preserving the user's mental
 * map. Deterministic and pure; `document` is the source of truth for structure, `reference` only for positions. */
export function stableLayout(document: DiagramDocument, reference: DiagramDocument, options: StableLayoutOptions = {}): DiagramDocument {
  const gap = options.gap ?? 48, pad = 80;
  const ref = reference.layout.nodes, size = document.layout.nodes;
  const idSet = new Set(document.graph.nodes.map(n => n.id));
  const neigh = new Map<string, string[]>(document.graph.nodes.map(n => [n.id, []]));
  for (const e of document.graph.edges) {
    if (e.source === e.target || !idSet.has(e.source) || !idSet.has(e.target)) continue;
    neigh.get(e.source)!.push(e.target); neigh.get(e.target)!.push(e.source);
  }
  const boxOf = (id: string) => size[id] ?? { x: 0, y: 0, width: 200, height: 92 };
  const placed: DiagramLayout['nodes'] = Object.create(null);
  // 1. Carry over existing nodes at their reference positions (keeping the current size/shape).
  for (const n of document.graph.nodes) {
    const r = ref[n.id]; if (!r) continue;
    const b = boxOf(n.id);
    placed[n.id] = { x: r.x, y: r.y, width: b.width, height: b.height, ...(b.shape ? { shape: b.shape } : {}) };
  }
  const overlaps = (a: { x: number; y: number; width: number; height: number }, b: typeof a): boolean =>
    a.x < b.x + b.width + gap && a.x + a.width + gap > b.x && a.y < b.y + b.height + gap && a.y + a.height + gap > b.y;
  const bounds = () => {
    const vals = Object.values(placed);
    if (!vals.length) return { minX: pad, minY: pad, maxX: pad, maxY: pad };
    return { minX: Math.min(...vals.map(v => v.x)), minY: Math.min(...vals.map(v => v.y)), maxX: Math.max(...vals.map(v => v.x + v.width)), maxY: Math.max(...vals.map(v => v.y + v.height)) };
  };
  const place = (id: string, x: number, y: number): void => {
    const b = boxOf(id); let box = { x: Math.round(x), y: Math.round(y), width: b.width, height: b.height };
    while (Object.values(placed).some(p => overlaps(box, p))) box = { ...box, y: box.y + b.height + gap };
    placed[id] = { ...box, ...(b.shape ? { shape: b.shape } : {}) };
  };
  // 2. Place new nodes that have at least one already-placed neighbour, iterating until no progress.
  let newIds = document.graph.nodes.map(n => n.id).filter(id => !placed[id]);
  for (let guard = newIds.length; guard >= 0 && newIds.length; guard--) {
    const next: string[] = [], before = newIds.length;
    for (const id of newIds) {
      const anchors = neigh.get(id)!.map(x => placed[x]).filter(Boolean);
      if (!anchors.length) { next.push(id); continue; }
      const cx = anchors.reduce((s, a) => s + a.x + a.width / 2, 0) / anchors.length;
      const cy = anchors.reduce((s, a) => s + a.y + a.height / 2, 0) / anchors.length;
      const b = boxOf(id); place(id, cx - b.width / 2, cy - b.height / 2 + b.height + gap);
    }
    newIds = next; if (next.length === before) break; // remaining have no placed neighbour
  }
  // 3. Any still-unplaced new nodes (disconnected or empty reference): a fresh row below everything.
  if (newIds.length) {
    const b0 = bounds(); let x = Math.max(pad, b0.minX), y = Object.keys(placed).length ? b0.maxY + gap : pad;
    for (const id of newIds) { place(id, x, y); x = placed[id].x + placed[id].width + gap; }
  }
  const layoutEdges: DiagramLayout['edges'] = Object.create(null);
  for (const e of document.graph.edges) if (placed[e.source] && placed[e.target]) layoutEdges[e.id] = defaultPorts(placed[e.source], placed[e.target]);
  return parseDocument({ ...document, layout: { nodes: placed, edges: layoutEdges } });
}

export interface CondenseOptions { gap?: number }
/** Condensation (quotient) graph: collapses each strongly-connected component into a single node, yielding the
 * acyclic skeleton of a cyclic graph — the standard way to see a tangled flow's high-level structure. Each
 * multi-node SCC is merged into its first member (via {@link mergeNodes}: edges rewired, intra-SCC edges and
 * duplicates dropped); single-node components are untouched. The result is always a DAG. Composes
 * {@link stronglyConnectedComponents} + mergeNodes. Pure; the input is not mutated. */
export function condense(document: DiagramDocument, _options: CondenseOptions = {}): DiagramDocument {
  let doc = parseDocument(document);
  for (const scc of stronglyConnectedComponents(doc.graph)) {
    if (scc.length > 1) doc = mergeNodes(doc, scc, { into: scc[0] });
  }
  return doc;
}

export interface ContractChainsOptions { keep?: (id: string) => boolean }
/** Collapses chains of "pass-through" nodes (exactly one incoming and one outgoing edge, distinct) by repeatedly
 * applying {@link bypassNode}, leaving only sources, sinks, branches and merges — the branch/merge skeleton of a
 * flow. Nodes where the predecessor equals the successor are left (bypassing would just drop them). Pass `keep`
 * to protect specific nodes from being contracted. Deterministic and pure; the input is not mutated. */
export function contractChains(document: DiagramDocument, options: ContractChainsOptions = {}): DiagramDocument {
  let doc = parseDocument(document);
  const keep = options.keep ?? (() => false);
  for (let guard = doc.graph.nodes.length; guard >= 0; guard--) {
    const inDeg = new Map<string, number>(doc.graph.nodes.map(n => [n.id, 0]));
    const outDeg = new Map<string, number>(doc.graph.nodes.map(n => [n.id, 0]));
    const pred = new Map<string, string>(), succ = new Map<string, string>();
    for (const e of doc.graph.edges) {
      if (e.source === e.target) continue;
      outDeg.set(e.source, (outDeg.get(e.source) ?? 0) + 1); inDeg.set(e.target, (inDeg.get(e.target) ?? 0) + 1);
      pred.set(e.target, e.source); succ.set(e.source, e.target);
    }
    const victim = doc.graph.nodes.find(n =>
      !keep(n.id) && inDeg.get(n.id) === 1 && outDeg.get(n.id) === 1 && pred.get(n.id) !== succ.get(n.id));
    if (!victim) break;
    doc = bypassNode(doc, victim.id);
  }
  return doc;
}

export interface FlipLayoutOptions { axis?: 'horizontal' | 'vertical' }
/** Mirrors the layout within its bounding box: 'horizontal' reflects left↔right (x), 'vertical' reflects
 * top↔bottom (y). Node sizes/shapes and all semantics are untouched; reflection preserves spacing (no overlaps),
 * and edge ports are recomputed so arrows reconnect on the correct sides. Useful to reorient a diagram (e.g. flip
 * a left-to-right flow). Deterministic and pure; the input is not mutated. */
export function flipLayout(document: DiagramDocument, options: FlipLayoutOptions = {}): DiagramDocument {
  const horizontal = (options.axis ?? 'horizontal') === 'horizontal';
  const boxes = document.graph.nodes.map(n => document.layout.nodes[n.id]).filter(Boolean);
  if (!boxes.length) return parseDocument(document);
  const minX = Math.min(...boxes.map(b => b.x)), maxX = Math.max(...boxes.map(b => b.x + b.width));
  const minY = Math.min(...boxes.map(b => b.y)), maxY = Math.max(...boxes.map(b => b.y + b.height));
  const nodes: DiagramLayout['nodes'] = Object.create(null);
  for (const n of document.graph.nodes) {
    const b = document.layout.nodes[n.id]; if (!b) continue;
    nodes[n.id] = horizontal
      ? { ...b, x: Math.round(minX + maxX - (b.x + b.width)) }
      : { ...b, y: Math.round(minY + maxY - (b.y + b.height)) };
  }
  const edges: DiagramLayout['edges'] = Object.create(null);
  for (const e of document.graph.edges) if (nodes[e.source] && nodes[e.target]) edges[e.id] = defaultPorts(nodes[e.source], nodes[e.target]);
  return parseDocument({ ...document, layout: { nodes, edges } });
}

export interface RotateLayoutOptions { degrees?: 90 | 180 | 270 }
/** Rotates the layout about its centre by a multiple of 90° — reorients a diagram (e.g. a top-to-bottom flow
 * into left-to-right at 90°). Node boxes stay upright (only their positions move); the result is renormalised so
 * the top-left sits at the standard margin. 180° is a clean point-reflection; 90°/270° swap the axes (boxes may
 * sit closer — re-run an auto-layout if needed). Ports recomputed. Deterministic and pure; input not mutated. */
export function rotateLayout(document: DiagramDocument, options: RotateLayoutOptions = {}): DiagramDocument {
  const deg = options.degrees ?? 90, pad = 80;
  const boxes = document.graph.nodes.map(n => document.layout.nodes[n.id]).filter(Boolean);
  if (!boxes.length) return parseDocument(document);
  const cx = (Math.min(...boxes.map(b => b.x)) + Math.max(...boxes.map(b => b.x + b.width))) / 2;
  const cy = (Math.min(...boxes.map(b => b.y)) + Math.max(...boxes.map(b => b.y + b.height))) / 2;
  const cos = deg === 180 ? -1 : 0, sin = deg === 90 ? 1 : deg === 270 ? -1 : 0;
  const nodes: DiagramLayout['nodes'] = Object.create(null);
  for (const n of document.graph.nodes) {
    const b = document.layout.nodes[n.id]; if (!b) continue;
    const px = b.x + b.width / 2 - cx, py = b.y + b.height / 2 - cy;
    const rx = cx + (px * cos - py * sin), ry = cy + (px * sin + py * cos);
    nodes[n.id] = { ...b, x: Math.round(rx - b.width / 2), y: Math.round(ry - b.height / 2) };
  }
  // Renormalise so the diagram starts at the standard margin.
  const minX = Math.min(...Object.values(nodes).map(b => b.x)), minY = Math.min(...Object.values(nodes).map(b => b.y));
  for (const id in nodes) { nodes[id].x += pad - minX; nodes[id].y += pad - minY; }
  const edges: DiagramLayout['edges'] = Object.create(null);
  for (const e of document.graph.edges) if (nodes[e.source] && nodes[e.target]) edges[e.id] = defaultPorts(nodes[e.source], nodes[e.target]);
  return parseDocument({ ...document, layout: { nodes, edges } });
}

export interface ScaleLayoutOptions { factor?: number }
/** Adjusts the spacing between nodes without resizing them: scales each node's distance from the layout centre by
 * `factor` (>1 spreads a cramped diagram apart, <1 tightens it), then renormalises to the standard margin. Node
 * sizes, shapes and semantics are untouched; ports are recomputed. Deterministic and pure; input not mutated. */
export function scaleLayout(document: DiagramDocument, options: ScaleLayoutOptions = {}): DiagramDocument {
  const factor = options.factor != null && options.factor > 0 ? options.factor : 1.25, pad = 80;
  const boxes = document.graph.nodes.map(n => document.layout.nodes[n.id]).filter(Boolean);
  if (!boxes.length) return parseDocument(document);
  const cx = (Math.min(...boxes.map(b => b.x)) + Math.max(...boxes.map(b => b.x + b.width))) / 2;
  const cy = (Math.min(...boxes.map(b => b.y)) + Math.max(...boxes.map(b => b.y + b.height))) / 2;
  const nodes: DiagramLayout['nodes'] = Object.create(null);
  for (const n of document.graph.nodes) {
    const b = document.layout.nodes[n.id]; if (!b) continue;
    const ccx = cx + (b.x + b.width / 2 - cx) * factor, ccy = cy + (b.y + b.height / 2 - cy) * factor;
    nodes[n.id] = { ...b, x: Math.round(ccx - b.width / 2), y: Math.round(ccy - b.height / 2) };
  }
  const minX = Math.min(...Object.values(nodes).map(b => b.x)), minY = Math.min(...Object.values(nodes).map(b => b.y));
  for (const id in nodes) { nodes[id].x += pad - minX; nodes[id].y += pad - minY; }
  const edges: DiagramLayout['edges'] = Object.create(null);
  for (const e of document.graph.edges) if (nodes[e.source] && nodes[e.target]) edges[e.id] = defaultPorts(nodes[e.source], nodes[e.target]);
  return parseDocument({ ...document, layout: { nodes, edges } });
}

export interface MindmapLayoutOptions { gap?: number; rankGap?: number }
/** Mindmap layout: the root sits in the centre and its branches fan out to both sides (as in XMind/MindMeister),
 * each side growing horizontally like a tree — distinct from the concentric radialLayout and the one-directional
 * treeLayout. The root's first half of children go right, the rest left; descendants inherit their side. Follows
 * the first incoming edge of each node (DAGs lay out under the first parent); nodes unreachable from the root
 * trail on the right. Deterministic and pure; sizes/shapes/semantics preserved, ports recomputed. */
export function mindmapLayout(document: DiagramDocument, options: MindmapLayoutOptions = {}): DiagramDocument {
  const nodesIn = document.graph.nodes; if (!nodesIn.length) return parseDocument(document);
  const size = document.layout.nodes, gap = options.gap ?? 48, rankGap = options.rankGap ?? 120, pad = 80;
  const order = nodesIn.map(n => n.id), idSet = new Set(order);
  const children = new Map<string, string[]>(order.map(id => [id, []])), hasParent = new Set<string>();
  for (const e of document.graph.edges) {
    if (e.source === e.target || !idSet.has(e.source) || !idSet.has(e.target) || hasParent.has(e.target)) continue;
    children.get(e.source)!.push(e.target); hasParent.add(e.target);
  }
  const root = order.find(id => !hasParent.has(id)) ?? order[0];
  const side = new Map<string, number>([[root, 0]]), depth = new Map<string, number>([[root, 0]]);
  const rc = children.get(root)!;
  rc.forEach((c, i) => side.set(c, i < Math.ceil(rc.length / 2) ? 1 : -1));
  const seen = new Set<string>([root]);
  const assign = (id: string, d: number): void => { depth.set(id, d); for (const ch of children.get(id)!) if (!seen.has(ch)) { seen.add(ch); if (!side.has(ch)) side.set(ch, side.get(id) ?? 1); assign(ch, d + 1); } };
  for (const c of rc) if (!seen.has(c)) { seen.add(c); assign(c, 1); }
  // Leaf-centred Y across the whole tree (DFS), X by signed depth.
  const cell = Math.max(...order.map(id => size[id].height)) + gap;
  const stepX = Math.max(...order.map(id => size[id].width)) + rankGap;
  const yOf = new Map<string, number>(), done = new Set<string>(); let leaf = 0;
  const dfs = (id: string): void => {
    if (done.has(id)) return; done.add(id);
    const kids = children.get(id)!.filter(c => !done.has(c));
    if (!kids.length) { yOf.set(id, leaf * cell); leaf++; return; }
    for (const c of kids) dfs(c);
    const ys = kids.map(c => yOf.get(c)!); yOf.set(id, (Math.min(...ys) + Math.max(...ys)) / 2);
  };
  dfs(root);
  for (const id of order) if (!done.has(id)) { done.add(id); yOf.set(id, leaf * cell); leaf++; depth.set(id, depth.get(id) ?? 1); side.set(id, side.get(id) ?? 1); }
  const nodes: DiagramLayout['nodes'] = Object.create(null);
  for (const id of order) { const b = size[id]; nodes[id] = { ...b, x: Math.round((side.get(id) ?? 0) * (depth.get(id) ?? 0) * stepX - b.width / 2), y: Math.round((yOf.get(id) ?? 0) - b.height / 2) }; }
  const minX = Math.min(...Object.values(nodes).map(b => b.x)), minY = Math.min(...Object.values(nodes).map(b => b.y));
  for (const id in nodes) { nodes[id].x += pad - minX; nodes[id].y += pad - minY; }
  const edges: DiagramLayout['edges'] = Object.create(null);
  for (const e of document.graph.edges) if (nodes[e.source] && nodes[e.target]) edges[e.id] = defaultPorts(nodes[e.source], nodes[e.target]);
  return parseDocument({ ...document, layout: { nodes, edges } });
}

export interface MergeDuplicatesOptions { by?: 'title' | 'type' }
/** Merges nodes that share the same title (or type) into one each, via {@link mergeNodes} — cleans up the
 * duplicate-titled nodes that CSV/edge-list imports often create, rewiring edges and dropping the resulting
 * self-loops/parallels. The first node of each group survives. Pure; the input is not mutated. */
export function mergeDuplicates(document: DiagramDocument, options: MergeDuplicatesOptions = {}): DiagramDocument {
  let doc = parseDocument(document);
  const key = (n: SemanticGraph['nodes'][number]): string => options.by === 'type' ? n.type : n.title;
  const groups = new Map<string, string[]>();
  for (const n of doc.graph.nodes) { const k = key(n); (groups.get(k) ?? groups.set(k, []).get(k)!).push(n.id); }
  for (const ids of groups.values()) if (ids.length > 1) doc = mergeNodes(doc, ids, { into: ids[0] });
  return doc;
}

export interface DedupeEdgesOptions { ignoreLabels?: boolean; selfLoops?: boolean }
/** Removes exact-duplicate parallel edges, keeping the first of each group — a cleanup for graphs that pick up
 * repeated connections from CSV/matrix/node-link imports or document merges. By default two edges are duplicates
 * when their source, target AND label match; `ignoreLabels` collapses any same source→target pair, and
 * `selfLoops` also drops edges from a node to itself. Preserves the kept edges' routing. Pure; no mutation. */
export function dedupeEdges(document: DiagramDocument, options: DedupeEdgesOptions = {}): DiagramDocument {
  const doc = parseDocument(document);
  const seen = new Set<string>(), kept: DiagramEdge[] = [];
  for (const e of doc.graph.edges) {
    if (options.selfLoops && e.source === e.target) continue;
    const key = options.ignoreLabels ? `${e.source}\u0000${e.target}` : `${e.source}\u0000${e.target}\u0000${e.label ?? ''}`;
    if (seen.has(key)) continue;
    seen.add(key); kept.push(e);
  }
  if (kept.length === doc.graph.edges.length) return doc; // nothing removed
  const edgeLayout: DiagramLayout['edges'] = Object.create(null);
  for (const e of kept) if (doc.layout.edges[e.id]) edgeLayout[e.id] = doc.layout.edges[e.id];
  return parseDocument({ ...doc, graph: { ...doc.graph, edges: kept }, layout: { ...doc.layout, edges: edgeLayout } });
}

export interface PackComponentsOptions { gap?: number; maxWidth?: number }
/** Packs the disconnected components of a diagram together: each weakly-connected component keeps its own
 * internal layout but its bounding box is shelf-packed into rows, removing the large empty gaps that imports and
 * merges leave between components. A tidy counterpart to `resolveOverlaps` (which separates overlapping nodes)
 * that works at the component level. Deterministic (declaration order); pure — ports are recomputed. */
export function packComponents(document: DiagramDocument, options: PackComponentsOptions = {}): DiagramDocument {
  const doc = parseDocument(document), comps = connectedComponents(doc.graph);
  if (comps.length <= 1) return doc;
  const gap = options.gap ?? 80, L = doc.layout.nodes;
  const boxes = comps.map(ids => {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const id of ids) { const b = L[id]; minX = Math.min(minX, b.x); minY = Math.min(minY, b.y); maxX = Math.max(maxX, b.x + b.width); maxY = Math.max(maxY, b.y + b.height); }
    return { ids, minX, minY, w: maxX - minX, h: maxY - minY };
  });
  const widths = boxes.map(b => b.w), avg = widths.reduce((s, w) => s + w, 0) / boxes.length;
  const maxWidth = options.maxWidth ?? Math.max(...widths, Math.ceil(Math.sqrt(boxes.length)) * (avg + gap));
  const nodes: DiagramLayout['nodes'] = Object.create(null);
  let cursorX = 80, cursorY = 80, rowHeight = 0, firstInRow = true;
  for (const box of boxes) {
    if (!firstInRow && cursorX + gap + box.w > maxWidth + 80) { cursorX = 80; cursorY += rowHeight + gap; rowHeight = 0; firstInRow = true; }
    else if (!firstInRow) cursorX += gap;
    const offX = cursorX - box.minX, offY = cursorY - box.minY;
    for (const id of box.ids) { const b = L[id]; nodes[id] = { ...b, x: Math.round(b.x + offX), y: Math.round(b.y + offY) }; }
    cursorX += box.w; rowHeight = Math.max(rowHeight, box.h); firstInRow = false;
  }
  const edges: DiagramLayout['edges'] = Object.create(null);
  for (const e of doc.graph.edges) if (nodes[e.source] && nodes[e.target]) edges[e.id] = { ...doc.layout.edges[e.id], ...defaultPorts(nodes[e.source], nodes[e.target]) };
  return parseDocument({ ...doc, layout: { nodes, edges } });
}

export interface InterpolateLayoutOptions { easing?: (t: number) => number }
/** Interpolates between two layouts of the same diagram for animated transitions: at `t` (clamped to [0,1])
 * each node's position and size is a linear blend of its place in `from` and `to` (`t=0` → from, `t=1` → to).
 * Call it across frames to morph one layout into another smoothly (as React Flow / d3 transitions do). The
 * result's graph and node set come from `to`; a node absent from `from` simply stays at its `to` place. Pass an
 * `easing` function for non-linear motion. Pure — recomputes edge ports from the blended boxes. */
export function interpolateLayout(from: DiagramDocument, to: DiagramDocument, t: number, options: InterpolateLayoutOptions = {}): DiagramDocument {
  const a = parseDocument(from), b = parseDocument(to);
  const k = options.easing ? options.easing(Math.max(0, Math.min(1, t))) : Math.max(0, Math.min(1, t));
  const lerp = (x: number, y: number): number => Math.round(x + (y - x) * k);
  const nodes: DiagramLayout['nodes'] = Object.create(null);
  for (const n of b.graph.nodes) {
    const tb = b.layout.nodes[n.id], fb = a.layout.nodes[n.id];
    nodes[n.id] = fb
      ? { ...tb, x: lerp(fb.x, tb.x), y: lerp(fb.y, tb.y), width: lerp(fb.width, tb.width), height: lerp(fb.height, tb.height) }
      : { ...tb };
  }
  const edges: DiagramLayout['edges'] = Object.create(null);
  for (const e of b.graph.edges) if (nodes[e.source] && nodes[e.target]) edges[e.id] = { ...b.layout.edges[e.id], ...defaultPorts(nodes[e.source], nodes[e.target]) };
  return parseDocument({ ...b, layout: { nodes, edges } });
}

/** Reduces a diagram to its spanning forest (backbone): keeps, per weakly-connected component, only the edges
 * that first connect each node in an undirected BFS (declaration order) and drops the rest, leaving exactly
 * `V − components` edges with no cycles. A "skeleton" view for dense graphs — distinct from `redundantEdges`
 * (transitive reduction), `condense` (collapses SCCs) and `contractChains` (removes pass-through nodes). Node
 * layout is preserved; kept edges keep their direction and routing. Pure; no mutation. */
export function spanningTree(document: DiagramDocument): DiagramDocument {
  const doc = parseDocument(document), g = doc.graph;
  const adj = new Map<string, Array<{ to: string; edge: DiagramEdge }>>(g.nodes.map(n => [n.id, []]));
  for (const e of g.edges) { if (e.source === e.target || !adj.has(e.source) || !adj.has(e.target)) continue; adj.get(e.source)!.push({ to: e.target, edge: e }); adj.get(e.target)!.push({ to: e.source, edge: e }); }
  const visited = new Set<string>(), keptIds = new Set<string>();
  for (const root of g.nodes) {
    if (visited.has(root.id)) continue;
    visited.add(root.id); const q = [root.id];
    for (let h = 0; h < q.length; h++) for (const { to, edge } of adj.get(q[h]) ?? []) if (!visited.has(to)) { visited.add(to); keptIds.add(edge.id); q.push(to); }
  }
  const edges = g.edges.filter(e => keptIds.has(e.id));
  if (edges.length === g.edges.length) return doc; // already a forest
  const edgeLayout: DiagramLayout['edges'] = Object.create(null);
  for (const e of edges) if (doc.layout.edges[e.id]) edgeLayout[e.id] = doc.layout.edges[e.id];
  return parseDocument({ ...doc, graph: { ...g, edges }, layout: { ...doc.layout, edges: edgeLayout } });
}

export interface TrimLeavesOptions { iterations?: number }
/** Declutters a diagram by removing leaf and isolated nodes — those with undirected degree ≤ 1 — along with
 * their edges. One pass by default; `iterations` repeats, peeling successive layers (run enough passes and only
 * the 2-core, the part where every node has ≥2 connections, remains). Node layout is preserved for survivors;
 * ports are recomputed. Distinct from `spanningTree` (keeps all nodes), `condense` (collapses SCCs) and
 * `contractChains` (removes pass-throughs). Pure; a pass that removes nothing stops early. */
export function trimLeaves(document: DiagramDocument, options: TrimLeavesOptions = {}): DiagramDocument {
  let doc = parseDocument(document);
  const rounds = Math.max(1, Math.floor(options.iterations ?? 1));
  for (let r = 0; r < rounds; r++) {
    const g = doc.graph, deg = new Map<string, number>(g.nodes.map(n => [n.id, 0]));
    for (const e of g.edges) { if (e.source === e.target) continue; deg.set(e.source, (deg.get(e.source) ?? 0) + 1); deg.set(e.target, (deg.get(e.target) ?? 0) + 1); }
    const keep = new Set(g.nodes.filter(n => (deg.get(n.id) ?? 0) >= 2).map(n => n.id));
    if (keep.size === g.nodes.length) break; // nothing to trim
    const nodes = g.nodes.filter(n => keep.has(n.id));
    const edges = g.edges.filter(e => keep.has(e.source) && keep.has(e.target));
    const nodeLayout: DiagramLayout['nodes'] = Object.create(null);
    for (const n of nodes) nodeLayout[n.id] = doc.layout.nodes[n.id];
    const edgeLayout: DiagramLayout['edges'] = Object.create(null);
    for (const e of edges) edgeLayout[e.id] = { ...doc.layout.edges[e.id], ...defaultPorts(nodeLayout[e.source], nodeLayout[e.target]) };
    doc = parseDocument({ ...doc, graph: { ...g, nodes, edges }, layout: { nodes: nodeLayout, edges: edgeLayout } });
    if (!nodes.length) break;
  }
  return doc;
}

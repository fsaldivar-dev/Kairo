import type { SemanticGraph, NodeType } from './types';

/** Pure graph algorithms over the semantic graph. No layout, no mutation; ids only.
 * Edges are treated as directed (source -> target), matching the editor's model. */

function adjacency(graph: SemanticGraph): Map<string, string[]> {
  const out = new Map<string, string[]>();
  for (const n of graph.nodes) out.set(n.id, []);
  for (const e of graph.edges) { const list = out.get(e.source); if (list && out.has(e.target)) list.push(e.target); }
  return out;
}

/** Shortest directed path from `from` to `to` by edge count (BFS). Returns the node-id path
 * inclusive of both ends, or null when unreachable. `from === to` yields `[from]` when the node exists. */
export function shortestPath(graph: SemanticGraph, from: string, to: string): string[] | null {
  const adj = adjacency(graph);
  if (!adj.has(from) || !adj.has(to)) return null;
  if (from === to) return [from];
  const prev = new Map<string, string>(), queue = [from]; const seen = new Set([from]);
  for (let head = 0; head < queue.length; head++) {
    const id = queue[head];
    for (const next of adj.get(id) ?? []) {
      if (seen.has(next)) continue;
      seen.add(next); prev.set(next, id);
      if (next === to) { const path = [to]; let cur = to; while (prev.has(cur)) { cur = prev.get(cur)!; path.push(cur); } return path.reverse(); }
      queue.push(next);
    }
  }
  return null;
}

/** The edge ids that connect a consecutive node-id path (as returned by shortestPath). Picks the
 * first matching edge for each hop; returns [] when the path has fewer than two nodes. */
export function pathEdges(graph: SemanticGraph, path: string[]): string[] {
  const ids: string[] = [];
  for (let i = 0; i < path.length - 1; i++) {
    const edge = graph.edges.find(e => e.source === path[i] && e.target === path[i + 1]);
    if (edge) ids.push(edge.id);
  }
  return ids;
}

/** A topological order of the node ids (Kahn). Returns null when the graph has a directed cycle.
 * Ties break by declaration order, so the result is deterministic. */
export function topologicalOrder(graph: SemanticGraph): string[] | null {
  const adj = adjacency(graph), indegree = new Map(graph.nodes.map(n => [n.id, 0]));
  for (const targets of adj.values()) for (const t of targets) indegree.set(t, (indegree.get(t) ?? 0) + 1);
  const queue = graph.nodes.filter(n => (indegree.get(n.id) ?? 0) === 0).map(n => n.id);
  const order: string[] = [];
  for (let head = 0; head < queue.length; head++) {
    const id = queue[head]; order.push(id);
    for (const next of adj.get(id) ?? []) { const left = (indegree.get(next) ?? 1) - 1; indegree.set(next, left); if (left === 0) queue.push(next); }
  }
  return order.length === graph.nodes.length ? order : null;
}

/** Strongly connected components via iterative Tarjan (no recursion, safe on deep graphs).
 * Each component is a list of node ids; components come in reverse-topological order, ids within
 * a component in discovery order. Singletons are included. */
export function stronglyConnectedComponents(graph: SemanticGraph): string[][] {
  const adj = adjacency(graph);
  const index = new Map<string, number>(), low = new Map<string, number>(), onStack = new Set<string>();
  const stack: string[] = [], components: string[][] = []; let counter = 0;
  for (const start of graph.nodes) {
    if (index.has(start.id)) continue;
    // Each frame tracks the node and how far through its neighbour list we are.
    const frames: { id: string; i: number }[] = [{ id: start.id, i: 0 }];
    index.set(start.id, counter); low.set(start.id, counter); counter++; stack.push(start.id); onStack.add(start.id);
    while (frames.length) {
      const frame = frames[frames.length - 1];
      const neighbours = adj.get(frame.id) ?? [];
      if (frame.i < neighbours.length) {
        const next = neighbours[frame.i++];
        if (!index.has(next)) {
          index.set(next, counter); low.set(next, counter); counter++; stack.push(next); onStack.add(next);
          frames.push({ id: next, i: 0 });
        } else if (onStack.has(next)) {
          low.set(frame.id, Math.min(low.get(frame.id)!, index.get(next)!));
        }
      } else {
        if (low.get(frame.id) === index.get(frame.id)) {
          const component: string[] = []; let w: string;
          do { w = stack.pop()!; onStack.delete(w); component.push(w); } while (w !== frame.id);
          components.push(component.reverse());
        }
        frames.pop();
        if (frames.length) { const parent = frames[frames.length - 1]; parent && low.set(parent.id, Math.min(low.get(parent.id)!, low.get(frame.id)!)); }
      }
    }
  }
  return components;
}

/** True when the directed graph has at least one cycle (a component larger than one node, or a self-loop). */
export function hasCycle(graph: SemanticGraph): boolean {
  if (graph.edges.some(e => e.source === e.target)) return true;
  return stronglyConnectedComponents(graph).some(c => c.length > 1);
}

/** Weakly connected components: groups of nodes reachable from one another when edges are treated as
 * undirected. Components come in document order, ids within a component in discovery order; isolated
 * nodes are singletons. Complements stronglyConnectedComponents (which respects direction). */
export function connectedComponents(graph: SemanticGraph): string[][] {
  const undirected = new Map<string, string[]>();
  for (const n of graph.nodes) undirected.set(n.id, []);
  for (const e of graph.edges) {
    if (!undirected.has(e.source) || !undirected.has(e.target) || e.source === e.target) continue;
    undirected.get(e.source)!.push(e.target); undirected.get(e.target)!.push(e.source);
  }
  const seen = new Set<string>(), components: string[][] = [];
  for (const start of graph.nodes) {
    if (seen.has(start.id)) continue;
    const queue = [start.id], component: string[] = []; seen.add(start.id);
    for (let head = 0; head < queue.length; head++) {
      const id = queue[head]; component.push(id);
      for (const next of undirected.get(id) ?? []) if (!seen.has(next)) { seen.add(next); queue.push(next); }
    }
    components.push(component);
  }
  return components;
}

/** 2-edge-connected components of the graph seen as undirected: remove the {@link bridges} (cut edges), then
 * take the connected components of what remains. Each component is a maximal group of nodes that stays connected
 * after any single edge is cut — a robust cluster, the complement of the single-link failures that `bridges`
 * reports. Isolated nodes and bridge endpoints come back as singletons. Components (and the ids within them) are
 * in graph declaration order. Pure. */
export function twoEdgeConnectedComponents(graph: SemanticGraph): string[][] {
  const bridgeSet = new Set(bridges(graph));
  const undirected = new Map<string, string[]>();
  for (const n of graph.nodes) undirected.set(n.id, []);
  for (const e of graph.edges) {
    if (!undirected.has(e.source) || !undirected.has(e.target) || e.source === e.target || bridgeSet.has(e.id)) continue;
    undirected.get(e.source)!.push(e.target); undirected.get(e.target)!.push(e.source);
  }
  const seen = new Set<string>(), components: string[][] = [];
  for (const start of graph.nodes) {
    if (seen.has(start.id)) continue;
    const queue = [start.id], component: string[] = []; seen.add(start.id);
    for (let head = 0; head < queue.length; head++) {
      const id = queue[head]; component.push(id);
      for (const next of undirected.get(id) ?? []) if (!seen.has(next)) { seen.add(next); queue.push(next); }
    }
    components.push(component);
  }
  return components;
}

/** The largest 2-edge-connected component (the most robust cluster), as node ids in declaration order. Empty
 * when the graph has no node that survives in a multi-node block. Pure. */
export function largestRobustCluster(graph: SemanticGraph): string[] {
  let best: string[] = [];
  for (const c of twoEdgeConnectedComponents(graph)) if (c.length > best.length) best = c;
  return best.length > 1 ? best : [];
}

/** Longest directed path by edge count (the "critical path") in a DAG. Returns the inclusive node-id
 * path, or null when the graph has a directed cycle. Deterministic: ties break by declaration order.
 * A single node yields `[id]`; an empty graph yields null. Useful for the longest route through a flow. */
export function longestPath(graph: SemanticGraph): string[] | null {
  const order = topologicalOrder(graph);
  if (!order || !graph.nodes.length) return null; // cyclic or empty
  const adj = adjacency(graph);
  const dist = new Map(graph.nodes.map(n => [n.id, 0]));
  const pred = new Map<string, string>();
  for (const u of order) for (const v of adj.get(u) ?? []) {
    if ((dist.get(u)! + 1) > (dist.get(v) ?? 0)) { dist.set(v, dist.get(u)! + 1); pred.set(v, u); }
  }
  let end = graph.nodes[0].id, best = -1;
  for (const n of graph.nodes) { const d = dist.get(n.id) ?? 0; if (d > best) { best = d; end = n.id; } }
  const path = [end]; let cur = end;
  while (pred.has(cur)) { cur = pred.get(cur)!; path.push(cur); }
  return path.reverse();
}

export interface NodeDegree { id: string; in: number; out: number; total: number }
/** Degree centrality per node: incoming, outgoing and total edge counts, in document order. A self-loop
 * counts once for `in` and once for `out`. Edges with a missing endpoint are ignored. Pure. */
export function degrees(graph: SemanticGraph): NodeDegree[] {
  const deg = new Map(graph.nodes.map(n => [n.id, { id: n.id, in: 0, out: 0, total: 0 }]));
  for (const e of graph.edges) {
    const s = deg.get(e.source), t = deg.get(e.target);
    if (!s || !t) continue;
    s.out++; s.total++; t.in++; t.total++;
  }
  return graph.nodes.map(n => deg.get(n.id)!);
}
/** The most connected nodes (highest total degree), most-connected first, ties broken by document order.
 * Isolated nodes (degree 0) are excluded. Returns at most `count` ids. */
export function centralNodes(graph: SemanticGraph, count = 3): string[] {
  return degrees(graph)
    .map((d, i) => ({ ...d, i }))
    .filter(d => d.total > 0)
    .sort((a, b) => b.total - a.total || a.i - b.i)
    .slice(0, Math.max(0, count))
    .map(d => d.id);
}

export interface AllPathsOptions { maxPaths?: number; maxDepth?: number }
/** Every simple directed path (no repeated node) from `from` to `to`, in deterministic DFS order over
 * declaration order. Bounded by `maxPaths` (default 100) and `maxDepth` nodes (default 12) so cycles and
 * dense graphs stay safe. Returns [] when either end is unknown or unreachable; `from === to` gives [[from]]. */
export function allPaths(graph: SemanticGraph, from: string, to: string, options: AllPathsOptions = {}): string[][] {
  const maxPaths = options.maxPaths ?? 100, maxDepth = options.maxDepth ?? 12;
  const adj = adjacency(graph);
  if (!adj.has(from) || !adj.has(to)) return [];
  if (from === to) return [[from]];
  const result: string[][] = [], path = [from], onPath = new Set([from]);
  const dfs = (u: string): void => {
    if (result.length >= maxPaths || path.length > maxDepth) return;
    for (const v of adj.get(u) ?? []) {
      if (onPath.has(v)) continue;
      if (v === to) { result.push([...path, v]); if (result.length >= maxPaths) return; continue; }
      onPath.add(v); path.push(v);
      dfs(v);
      path.pop(); onPath.delete(v);
      if (result.length >= maxPaths) return;
    }
  };
  dfs(from);
  return result;
}

/** The k shortest **directed** simple paths from `from` to `to` by hop count (Yen's algorithm over unweighted
 * BFS). Returns up to `k` node-id paths, shortest first, ties broken lexicographically — a useful middle ground
 * between {@link shortestPath} (just one) and {@link allPaths} (every one): "show me the N best alternative
 * routes", for redundancy/failover analysis. `[]` when `to` is unreachable or an id is unknown. Pure and
 * deterministic. */
export function kShortestPaths(graph: SemanticGraph, from: string, to: string, k = 3): string[][] {
  const adj = new Map<string, string[]>();
  for (const n of graph.nodes) adj.set(n.id, []);
  for (const e of graph.edges) { if (e.source !== e.target && adj.has(e.source) && adj.has(e.target)) adj.get(e.source)!.push(e.target); }
  for (const targets of adj.values()) targets.sort(); // BFS must resolve equal-hop routes lexicographically too.
  if (!adj.has(from) || !adj.has(to) || k <= 0) return [];
  const SEP = '\u0000';
  const bfs = (src: string, dst: string, blockedNodes: Set<string>, blockedEdges: Set<string>): string[] | null => {
    if (blockedNodes.has(src) || blockedNodes.has(dst)) return null;
    if (src === dst) return [src];
    const prev = new Map<string, string>(), queue = [src], seen = new Set([src]);
    for (let h = 0; h < queue.length; h++) {
      const id = queue[h];
      for (const nx of adj.get(id) ?? []) {
        if (seen.has(nx) || blockedNodes.has(nx) || blockedEdges.has(id + SEP + nx)) continue;
        seen.add(nx); prev.set(nx, id);
        if (nx === dst) { const p = [dst]; let c = dst; while (prev.has(c)) { c = prev.get(c)!; p.push(c); } return p.reverse(); }
        queue.push(nx);
      }
    }
    return null;
  };
  const first = bfs(from, to, new Set(), new Set());
  if (!first) return [];
  const key = (p: string[]): string => p.join(SEP);
  const A: string[][] = [first], B: string[][] = [], bSeen = new Set<string>();
  while (A.length < k) {
    const prevPath = A[A.length - 1];
    for (let i = 0; i < prevPath.length - 1; i++) {
      const spurNode = prevPath[i], rootPath = prevPath.slice(0, i + 1), rootKey = key(rootPath);
      const blockedEdges = new Set<string>();
      for (const p of A) if (p.length > i && key(p.slice(0, i + 1)) === rootKey) blockedEdges.add(p[i] + SEP + p[i + 1]);
      const blockedNodes = new Set(rootPath.slice(0, -1)); // keep spurNode, remove the rest of the root
      const spur = bfs(spurNode, to, blockedNodes, blockedEdges);
      if (spur) {
        const total = rootPath.slice(0, -1).concat(spur), tk = key(total);
        if (!bSeen.has(tk) && !A.some(p => key(p) === tk)) { bSeen.add(tk); B.push(total); }
      }
    }
    if (!B.length) break;
    B.sort((a, b) => a.length - b.length || (key(a) < key(b) ? -1 : key(a) > key(b) ? 1 : 0));
    A.push(B.shift()!);
  }
  return A.slice(0, k);
}

/** Builds an undirected neighbor-set map (in+out neighbours, excluding self and self-loops). */
function neighborSets(graph: SemanticGraph): Map<string, Set<string>> {
  const nb = new Map<string, Set<string>>(graph.nodes.map(n => [n.id, new Set<string>()]));
  for (const e of graph.edges) {
    if (e.source === e.target || !nb.has(e.source) || !nb.has(e.target)) continue;
    nb.get(e.source)!.add(e.target); nb.get(e.target)!.add(e.source);
  }
  return nb;
}

/** Jaccard similarity of two nodes by their undirected neighbor sets: |N(a)∩N(b)| / |N(a)∪N(b)|, in [0,1].
 * 0 when both are isolated or share nothing, 1 when they have exactly the same neighbours. A structural-role
 * measure (two nodes wired to the same things are interchangeable). Pure. */
export function jaccardSimilarity(graph: SemanticGraph, a: string, b: string): number {
  const nb = neighborSets(graph), na = nb.get(a), nbset = nb.get(b);
  if (!na || !nbset) return 0;
  if (a === b) return na.size ? 1 : 0;
  let inter = 0; for (const x of na) if (nbset.has(x)) inter++;
  const union = na.size + nbset.size - inter;
  return union ? +(inter / union).toFixed(4) : 0;
}

/** The nodes most structurally similar to `id` by {@link jaccardSimilarity} of neighbor sets, highest first
 * (ties by declaration order), excluding `id` itself and any node with score 0. Answers "which nodes play the
 * same role as this one?" — distinct from {@link suggestLinks} (which predicts missing edges). Pure. */
export function similarNodes(graph: SemanticGraph, id: string, count = 3): NodeScore[] {
  const nb = neighborSets(graph);
  if (!nb.has(id)) return [];
  const scored: NodeScore[] = [];
  for (const n of graph.nodes) {
    if (n.id === id) continue;
    const score = jaccardSimilarity(graph, id, n.id);
    if (score > 0) scored.push({ id: n.id, score });
  }
  const indexOf = new Map(graph.nodes.map((n, i) => [n.id, i]));
  scored.sort((x, y) => y.score - x.score || indexOf.get(x.id)! - indexOf.get(y.id)!);
  return scored.slice(0, count);
}

export interface NeighborsOptions { depth?: number; direction?: 'out' | 'in' | 'both' }
/** Node ids within `depth` hops of `id` (default 1), following outgoing, incoming or both directions
 * (default both). BFS order, excluding the seed; `[]` when the id is unknown. Pure. A focus/neighborhood primitive. */
export function neighbors(graph: SemanticGraph, id: string, options: NeighborsOptions = {}): string[] {
  const depth = Math.max(0, options.depth ?? 1), direction = options.direction ?? 'both';
  const out = new Map<string, string[]>(), inc = new Map<string, string[]>();
  for (const n of graph.nodes) { out.set(n.id, []); inc.set(n.id, []); }
  for (const e of graph.edges) {
    if (e.source === e.target || !out.has(e.source) || !out.has(e.target)) continue;
    out.get(e.source)!.push(e.target); inc.get(e.target)!.push(e.source);
  }
  if (!out.has(id)) return [];
  const step = (node: string): string[] => direction === 'out' ? out.get(node)! : direction === 'in' ? inc.get(node)! : [...out.get(node)!, ...inc.get(node)!];
  const seen = new Set([id]), result: string[] = [];
  let frontier = [id];
  for (let d = 0; d < depth && frontier.length; d++) {
    const next: string[] = [];
    for (const node of frontier) for (const nb of step(node)) if (!seen.has(nb)) { seen.add(nb); result.push(nb); next.push(nb); }
    frontier = next;
  }
  return result;
}

/** Transitively-redundant edges: an edge u→v is redundant when v is still reachable from u through a
 * longer path (length ≥ 2) that doesn't use it. Removing them is the transitive reduction, which declutters
 * dense or imported graphs. Removals are checked cumulatively so cycles retain reachability. Labelled/conditional relationships, parallel duplicates and sole direct links are kept. Pure; returns edge ids. */
export function redundantEdges(graph: SemanticGraph): string[] {
  const out = new Map<string, { t: string; id: string }[]>();
  for (const n of graph.nodes) out.set(n.id, []);
  for (const e of graph.edges) { if (e.source !== e.target && out.has(e.source) && out.has(e.target)) out.get(e.source)!.push({ t: e.target, id: e.id }); }
  const result: string[] = [], removed = new Set<string>();
  for (const e of graph.edges) {
    if (e.label || e.condition || e.relation || e.tags?.length) continue;
    if (e.source === e.target || !out.has(e.source) || !out.has(e.target)) continue;
    // BFS from source, first hop must avoid the edge itself and any direct hop to target (length 1).
    const seen = new Set<string>(), queue: string[] = [];
    for (const nb of out.get(e.source) ?? []) if (!removed.has(nb.id) && nb.id !== e.id && nb.t !== e.target && !seen.has(nb.t)) { seen.add(nb.t); queue.push(nb.t); }
    let found = false;
    for (let h = 0; h < queue.length && !found; h++) {
      for (const nb of out.get(queue[h]) ?? []) {
        if (nb.id === e.id || removed.has(nb.id)) continue;
        if (nb.t === e.target) { found = true; break; }
        if (!seen.has(nb.t)) { seen.add(nb.t); queue.push(nb.t); }
      }
    }
    if (found) { result.push(e.id); removed.add(e.id); }
  }
  return result;
}

/** Builds an undirected incidence list. Each entry carries the neighbour and a per-edge key so that
 * the DFS can skip only the exact edge it arrived on (correct for parallel edges). Self-loops are ignored. */
function undirectedIncidence(graph: SemanticGraph): { adj: Map<string, { to: string; key: number }[]>; keyToEdge: string[] } {
  const adj = new Map<string, { to: string; key: number }[]>();
  for (const n of graph.nodes) adj.set(n.id, []);
  const keyToEdge: string[] = [];
  for (const e of graph.edges) {
    if (e.source === e.target || !adj.has(e.source) || !adj.has(e.target)) continue;
    const key = keyToEdge.length; keyToEdge.push(e.id);
    adj.get(e.source)!.push({ to: e.target, key });
    adj.get(e.target)!.push({ to: e.source, key });
  }
  return { adj, keyToEdge };
}

/** Articulation points (cut vertices) and bridges (cut edges) of the graph seen as undirected:
 * the single points of failure whose removal splits the network into more pieces. Iterative Tarjan DFS
 * (stack-safe for large graphs); parallel edges are handled, so two links between the same pair are not
 * bridges. Returns ids in graph declaration order. Pure. */
export function criticalElements(graph: SemanticGraph): { articulationPoints: string[]; bridges: string[] } {
  const { adj, keyToEdge } = undirectedIncidence(graph);
  const ids = graph.nodes.map(n => n.id);
  const disc = new Map<string, number>(), low = new Map<string, number>();
  const cut = new Set<string>(), bridgeKeys = new Set<number>();
  let timer = 0;
  for (const start of ids) {
    if (disc.has(start)) continue;
    disc.set(start, timer); low.set(start, timer); timer++;
    const stack: { u: string; pe: number; i: number }[] = [{ u: start, pe: -1, i: 0 }];
    let rootChildren = 0;
    while (stack.length) {
      const f = stack[stack.length - 1], list = adj.get(f.u)!;
      if (f.i < list.length) {
        const { to: v, key } = list[f.i++];
        if (key === f.pe) continue; // don't walk back along the entry edge (but allow parallel edges)
        if (!disc.has(v)) {
          disc.set(v, timer); low.set(v, timer); timer++;
          if (f.u === start) rootChildren++;
          stack.push({ u: v, pe: key, i: 0 });
        } else low.set(f.u, Math.min(low.get(f.u)!, disc.get(v)!));
      } else {
        stack.pop();
        const parent = stack[stack.length - 1];
        if (parent) {
          const pu = parent.u;
          low.set(pu, Math.min(low.get(pu)!, low.get(f.u)!));
          if (pu !== start && low.get(f.u)! >= disc.get(pu)!) cut.add(pu);
          if (low.get(f.u)! > disc.get(pu)!) bridgeKeys.add(f.pe);
        }
      }
    }
    if (rootChildren > 1) cut.add(start);
  }
  return {
    articulationPoints: ids.filter(id => cut.has(id)),
    bridges: keyToEdge.filter((_, k) => bridgeKeys.has(k)),
  };
}

/** Cut vertices: nodes whose removal disconnects the (undirected) graph. See {@link criticalElements}. */
export function articulationPoints(graph: SemanticGraph): string[] { return criticalElements(graph).articulationPoints; }
/** Cut edges: links whose removal disconnects the (undirected) graph. See {@link criticalElements}. */
export function bridges(graph: SemanticGraph): string[] { return criticalElements(graph).bridges; }

export interface NodeScore { id: string; score: number }
/** Betweenness centrality (Brandes, directed, unweighted): how often each node lies on the shortest
 * directed paths between other pairs. High scorers are "brokers" that connect otherwise distant parts
 * of the graph — distinct from degree hubs and from cut vertices. Scores are raw (not normalised),
 * in graph declaration order. O(V·E); pure and deterministic. */
export function betweennessCentrality(graph: SemanticGraph): NodeScore[] {
  const adj = adjacency(graph);
  const bc = new Map<string, number>(graph.nodes.map(n => [n.id, 0]));
  for (const s of graph.nodes) {
    const stack: string[] = [], pred = new Map<string, string[]>();
    const sigma = new Map<string, number>(), dist = new Map<string, number>();
    for (const n of graph.nodes) { pred.set(n.id, []); sigma.set(n.id, 0); dist.set(n.id, -1); }
    sigma.set(s.id, 1); dist.set(s.id, 0);
    const queue = [s.id];
    for (let head = 0; head < queue.length; head++) {
      const v = queue[head]; stack.push(v);
      for (const w of adj.get(v) ?? []) {
        if (dist.get(w)! < 0) { dist.set(w, dist.get(v)! + 1); queue.push(w); }
        if (dist.get(w) === dist.get(v)! + 1) { sigma.set(w, sigma.get(w)! + sigma.get(v)!); pred.get(w)!.push(v); }
      }
    }
    const delta = new Map<string, number>(graph.nodes.map(n => [n.id, 0]));
    for (let i = stack.length - 1; i >= 0; i--) {
      const w = stack[i];
      for (const v of pred.get(w)!) delta.set(v, delta.get(v)! + (sigma.get(v)! / sigma.get(w)!) * (1 + delta.get(w)!));
      if (w !== s.id) bc.set(w, bc.get(w)! + delta.get(w)!);
    }
  }
  return graph.nodes.map(n => ({ id: n.id, score: +bc.get(n.id)!.toFixed(4) }));
}

/** The `count` nodes with the highest betweenness ("brokers"). Zero-score nodes are excluded; ties keep
 * declaration order. See {@link betweennessCentrality}. */
export function brokerNodes(graph: SemanticGraph, count = 3): string[] {
  return betweennessCentrality(graph)
    .map((d, i) => ({ ...d, i }))
    .filter(d => d.score > 0)
    .sort((a, b) => b.score - a.score || a.i - b.i)
    .slice(0, Math.max(0, count))
    .map(d => d.id);
}

/** Community detection by deterministic Louvain local-moving (modularity, undirected view). Finds denser
 * clusters within a connected graph — more granular than connectedComponents, and (unlike naive label
 * propagation) it does not merge clusters joined by a single weak link. Nodes are processed in declaration
 * order and moved to the neighbouring community with the greatest modularity gain, ties kept stable, until
 * no move improves it. Returns communities (each a node-id list in declaration order), ordered by first
 * appearance. Pure and reproducible. */
export function communities(graph: SemanticGraph): string[][] {
  const ids = graph.nodes.map(n => n.id), n = ids.length;
  const index = new Map(ids.map((id, i) => [id, i]));
  const adj: Map<number, number>[] = ids.map(() => new Map()); // weighted undirected neighbours
  let m = 0;
  for (const e of graph.edges) {
    const a = index.get(e.source), b = index.get(e.target);
    if (a === undefined || b === undefined || a === b) continue;
    adj[a].set(b, (adj[a].get(b) ?? 0) + 1); adj[b].set(a, (adj[b].get(a) ?? 0) + 1); m++;
  }
  const k = adj.map(nb => [...nb.values()].reduce((s, w) => s + w, 0));
  const comm = ids.map((_, i) => i);
  if (m > 0) {
    const sigmaTot = k.slice(); // sum of degrees in each community (community id = a node index)
    const twoM = 2 * m;
    for (let pass = 0; pass < Math.max(5, n); pass++) {
      let moved = false;
      for (let i = 0; i < n; i++) {
        const ci = comm[i];
        const toComm = new Map<number, number>(); // weight from i to each neighbour community
        for (const [j, w] of adj[i]) toComm.set(comm[j], (toComm.get(comm[j]) ?? 0) + w);
        sigmaTot[ci] -= k[i];
        const gain = (c: number) => (toComm.get(c) ?? 0) - (sigmaTot[c] * k[i]) / twoM;
        let best = ci, bestGain = gain(ci);
        for (const c of toComm.keys()) { const g = gain(c); if (g > bestGain + 1e-12) { best = c; bestGain = g; } }
        comm[i] = best; sigmaTot[best] += k[i];
        if (best !== ci) moved = true;
      }
      if (!moved) break;
    }
  }
  const byComm = new Map<number, string[]>();
  for (let i = 0; i < n; i++) { const c = comm[i]; (byComm.get(c) ?? byComm.set(c, []).get(c)!).push(ids[i]); }
  return [...byComm.values()].sort((a, b) => ids.indexOf(a[0]) - ids.indexOf(b[0]));
}

export interface DistanceStats { diameter: number; averagePathLength: number; reachablePairs: number }
/** Distance statistics over shortest paths (BFS from every node): the `diameter` (longest shortest path)
 * and `averagePathLength` (mean over all ordered reachable pairs, excluding unreachable ones), plus the
 * number of reachable pairs. Directed by default; set `directed:false` for the undirected view. O(V·(V+E));
 * pure and deterministic. Standard network stats (as in Gephi), complementing analyzeGraph. */
export function distanceStats(graph: SemanticGraph, options: { directed?: boolean } = {}): DistanceStats {
  const directed = options.directed ?? true;
  const ids = graph.nodes.map(n => n.id), idSet = new Set(ids);
  const adj = new Map<string, string[]>(ids.map(id => [id, []]));
  for (const e of graph.edges) {
    if (e.source === e.target || !idSet.has(e.source) || !idSet.has(e.target)) continue;
    adj.get(e.source)!.push(e.target);
    if (!directed) adj.get(e.target)!.push(e.source);
  }
  let diameter = 0, sum = 0, pairs = 0;
  for (const s of ids) {
    const dist = new Map<string, number>([[s, 0]]), queue = [s];
    for (let head = 0; head < queue.length; head++) {
      const v = queue[head], dv = dist.get(v)!;
      for (const w of adj.get(v) ?? []) if (!dist.has(w)) { dist.set(w, dv + 1); queue.push(w); }
    }
    for (const [t, d] of dist) if (t !== s && d > 0) { sum += d; pairs++; if (d > diameter) diameter = d; }
  }
  return { diameter, averagePathLength: pairs ? +(sum / pairs).toFixed(4) : 0, reachablePairs: pairs };
}

export interface GraphColoring { colors: Record<string, number>; count: number }
/** Greedy graph colouring (Welsh–Powell, undirected): assigns each node a colour index so that no edge joins
 * two nodes of the same colour, trying to keep the palette small. Nodes are coloured in descending-degree
 * order (ties by declaration order) and each takes the lowest colour not used by an already-coloured neighbour.
 * Returns the colour per node id and the number of colours used. Greedy (not guaranteed minimal). Pure. */
export function greedyColoring(graph: SemanticGraph): GraphColoring {
  const ids = graph.nodes.map(n => n.id), idSet = new Set(ids);
  const adj = new Map<string, Set<string>>(ids.map(id => [id, new Set<string>()]));
  for (const e of graph.edges) {
    if (e.source === e.target || !idSet.has(e.source) || !idSet.has(e.target)) continue;
    adj.get(e.source)!.add(e.target); adj.get(e.target)!.add(e.source);
  }
  const order = ids.map((id, i) => ({ id, i, deg: adj.get(id)!.size })).sort((a, b) => b.deg - a.deg || a.i - b.i);
  const colors: Record<string, number> = Object.create(null);
  let count = 0;
  for (const { id } of order) {
    const used = new Set<number>();
    for (const nb of adj.get(id)!) if (nb in colors) used.add(colors[nb]);
    let c = 0; while (used.has(c)) c++;
    colors[id] = c; if (c + 1 > count) count = c + 1;
  }
  // Emit in declaration order for a stable object shape.
  const ordered: Record<string, number> = Object.create(null);
  for (const id of ids) if (id in colors) ordered[id] = colors[id];
  return { colors: ordered, count };
}

export interface PageRankOptions { damping?: number; iterations?: number; tolerance?: number }
/** PageRank (power iteration, directed): recursive node importance — a node matters when important nodes
 * point to it. Distinct from degree hubs and betweenness brokers. Dangling nodes (no out-edges) redistribute
 * their rank uniformly; self-loops are ignored. Scores sum to ~1, in graph declaration order. Pure. */
export function pageRank(graph: SemanticGraph, options: PageRankOptions = {}): NodeScore[] {
  const d = options.damping ?? 0.85, iters = Math.max(1, options.iterations ?? 100), tol = options.tolerance ?? 1e-6;
  const ids = graph.nodes.map(n => n.id), N = ids.length;
  if (!N) return [];
  const idx = new Map(ids.map((id, i) => [id, i]));
  const out: number[][] = ids.map(() => []), outdeg = new Array<number>(N).fill(0);
  for (const e of graph.edges) { const s = idx.get(e.source), t = idx.get(e.target); if (s === undefined || t === undefined || s === t) continue; out[s].push(t); outdeg[s]++; }
  let rank = new Array<number>(N).fill(1 / N);
  for (let it = 0; it < iters; it++) {
    const base = (1 - d) / N;
    let dangling = 0;
    for (let i = 0; i < N; i++) if (outdeg[i] === 0) dangling += rank[i];
    const share = base + (d * dangling) / N;
    const next = new Array<number>(N).fill(share);
    for (let i = 0; i < N; i++) if (outdeg[i] > 0) { const give = (d * rank[i]) / outdeg[i]; for (const t of out[i]) next[t] += give; }
    let diff = 0; for (let i = 0; i < N; i++) diff += Math.abs(next[i] - rank[i]);
    rank = next;
    if (diff < tol) break;
  }
  return ids.map((id, i) => ({ id, score: +rank[i].toFixed(6) }));
}
/** The `count` highest-PageRank node ids ("most influential"). Ties keep declaration order. See {@link pageRank}. */
export function influentialNodes(graph: SemanticGraph, count = 3): string[] {
  return pageRank(graph).map((d, i) => ({ ...d, i })).sort((a, b) => b.score - a.score || a.i - b.i).slice(0, Math.max(0, count)).map(d => d.id);
}

/** Finds one directed cycle and returns its node ids in order (`[a,b,c]` means a→b→c→a), or null when the
 * graph is acyclic. Self-loops return `[a]`. Iterative DFS (stack-safe for large graphs); complements the
 * boolean `hasCycle` and `validateFlow` by showing *which* nodes form the loop. Deterministic and pure. */
export function findCycle(graph: SemanticGraph): string[] | null {
  const adj = adjacency(graph), ids = graph.nodes.map(n => n.id);
  const color = new Map<string, number>(ids.map(id => [id, 0])); // 0 unvisited, 1 on-stack, 2 done
  for (const s of ids) {
    if (color.get(s)) continue;
    const stack: { id: string; i: number }[] = [{ id: s, i: 0 }];
    const parent = new Map<string, string>();
    color.set(s, 1);
    while (stack.length) {
      const f = stack[stack.length - 1], neighbours = adj.get(f.id) ?? [];
      if (f.i < neighbours.length) {
        const w = neighbours[f.i++], c = color.get(w) ?? 0;
        if (c === 1) { const cycle = [f.id]; let cur = f.id; while (cur !== w) { cur = parent.get(cur)!; cycle.push(cur); } return cycle.reverse(); }
        if (c === 0) { color.set(w, 1); parent.set(w, f.id); stack.push({ id: w, i: 0 }); }
      } else { color.set(f.id, 2); stack.pop(); }
    }
  }
  return null;
}

/** Topological generations ("waves"): each inner array is the set of nodes whose dependencies are all
 * satisfied at that stage, so a stage's nodes can run in parallel (Kahn by levels). Self-loops are ignored;
 * nodes trapped in a cycle are omitted (the acyclic portion is returned). Ids in declaration order within a
 * wave. Pure and deterministic. Useful for pipelines/flows: stage count and max parallelism. */
export function topologicalGenerations(graph: SemanticGraph): string[][] {
  const ids = graph.nodes.map(n => n.id), idSet = new Set(ids);
  const indeg = new Map<string, number>(ids.map(id => [id, 0]));
  const out = new Map<string, string[]>(ids.map(id => [id, []]));
  for (const e of graph.edges) {
    if (e.source === e.target || !idSet.has(e.source) || !idSet.has(e.target)) continue;
    out.get(e.source)!.push(e.target); indeg.set(e.target, (indeg.get(e.target) ?? 0) + 1);
  }
  const generations: string[][] = [];
  let frontier = ids.filter(id => (indeg.get(id) ?? 0) === 0);
  const placed = new Set<string>();
  while (frontier.length) {
    for (const id of frontier) placed.add(id);
    generations.push(frontier);
    const next: string[] = [];
    for (const id of frontier) for (const t of out.get(id) ?? []) { const left = (indeg.get(t) ?? 1) - 1; indeg.set(t, left); if (left === 0 && !placed.has(t)) next.push(t); }
    frontier = next;
  }
  return generations;
}

/** Transitive closure: returns a graph with an edge a→b whenever b is reachable from a by any directed path
 * (the complement of the transitive reduction that {@link redundantEdges} finds). Nodes are copied; self-pairs
 * are excluded; synthetic edges get ids `a~b`. Useful to surface every implied dependency. Pure. */
export function transitiveClosure(graph: SemanticGraph): SemanticGraph {
  const adj = adjacency(graph), ids = graph.nodes.map(n => n.id);
  const edges: SemanticGraph['edges'] = [];
  for (const s of ids) {
    const seen = new Set<string>(), queue = [...(adj.get(s) ?? [])];
    for (const n of queue) seen.add(n);
    for (let h = 0; h < queue.length; h++) for (const w of adj.get(queue[h]) ?? []) if (!seen.has(w)) { seen.add(w); queue.push(w); }
    for (const t of ids) if (t !== s && seen.has(t)) edges.push({ id: `${s}~${t}`, source: s, target: t });
  }
  return { nodes: graph.nodes.map(n => ({ ...n })), edges };
}

function reachFrom(adj: Map<string, string[]>, start: string): Set<string> {
  const seen = new Set<string>(), queue = [...(adj.get(start) ?? [])];
  for (const n of queue) seen.add(n);
  for (let h = 0; h < queue.length; h++) for (const w of adj.get(queue[h]) ?? []) if (!seen.has(w)) { seen.add(w); queue.push(w); }
  seen.delete(start);
  return seen;
}
/** Every node reachable downstream from `id` by following edges forward (its transitive dependencies/effects).
 * Excludes `id` itself; ids in graph declaration order. Pure. Returns [] when `id` is absent. */
export function descendants(graph: SemanticGraph, id: string): string[] {
  if (!graph.nodes.some(n => n.id === id)) return [];
  const seen = reachFrom(adjacency(graph), id);
  return graph.nodes.map(n => n.id).filter(x => seen.has(x));
}
/** Every node that can reach `id` by following edges backward (everything upstream / that depends on it).
 * Excludes `id` itself; ids in graph declaration order. Pure. Returns [] when `id` is absent. */
export function ancestors(graph: SemanticGraph, id: string): string[] {
  if (!graph.nodes.some(n => n.id === id)) return [];
  const rev = new Map<string, string[]>(graph.nodes.map(n => [n.id, []]));
  for (const e of graph.edges) { if (e.source === e.target) continue; const list = rev.get(e.target); if (list && rev.has(e.source)) list.push(e.source); }
  const seen = reachFrom(rev, id);
  return graph.nodes.map(n => n.id).filter(x => seen.has(x));
}

export interface ClusteringResult { perNode: NodeScore[]; average: number }
/** Local clustering coefficient per node (undirected): the fraction of a node's neighbour pairs that are
 * themselves connected (0–1); nodes with fewer than two neighbours score 0. `average` is the global mean over
 * all nodes. A standard cohesion metric (as in Gephi). Pure and deterministic. */
export function clusteringCoefficient(graph: SemanticGraph): ClusteringResult {
  const ids = graph.nodes.map(n => n.id), idSet = new Set(ids);
  const adj = new Map<string, Set<string>>(ids.map(id => [id, new Set<string>()]));
  for (const e of graph.edges) { if (e.source === e.target || !idSet.has(e.source) || !idSet.has(e.target)) continue; adj.get(e.source)!.add(e.target); adj.get(e.target)!.add(e.source); }
  const perNode: NodeScore[] = ids.map(id => {
    const nb = [...adj.get(id)!], k = nb.length;
    if (k < 2) return { id, score: 0 };
    let links = 0;
    for (let i = 0; i < nb.length; i++) for (let j = i + 1; j < nb.length; j++) if (adj.get(nb[i])!.has(nb[j])) links++;
    return { id, score: +(links / (k * (k - 1) / 2)).toFixed(4) };
  });
  const average = perNode.length ? +(perNode.reduce((s, n) => s + n.score, 0) / perNode.length).toFixed(4) : 0;
  return { perNode, average };
}

export interface CyclomaticResult { nodes: number; edges: number; components: number; complexity: number; decisionPoints: number }
/** McCabe cyclomatic complexity of the graph read as a control-flow graph: `M = E - N + 2P` (E edges, N nodes,
 * P weakly-connected components) — the number of linearly independent paths; higher means harder to follow/test.
 * Also reports `decisionPoints` (nodes with out-degree ≥ 2, i.e. branch points). An empty graph scores 0. Pure. */
export function cyclomaticComplexity(graph: SemanticGraph): CyclomaticResult {
  const nodes = graph.nodes.length, edges = graph.edges.length;
  const components = nodes === 0 ? 0 : connectedComponents(graph).length;
  const complexity = nodes === 0 ? 0 : edges - nodes + 2 * components;
  const out = new Map<string, number>(graph.nodes.map(n => [n.id, 0]));
  for (const e of graph.edges) out.set(e.source, (out.get(e.source) ?? 0) + 1);
  let decisionPoints = 0;
  for (const d of out.values()) if (d >= 2) decisionPoints++;
  return { nodes, edges, components, complexity, decisionPoints };
}

/** Feedback arc set: the edges whose removal (or reversal) makes the graph acyclic — a DFS back-edge heuristic
 * (valid, though not guaranteed minimum). Self-loops are always included. This is what layered layouts and
 * schedulers use to break cycles. Iterative DFS (deep-graph safe); returns edge ids in document order. Pure. */
export function feedbackArcSet(graph: SemanticGraph): string[] {
  const adj = new Map<string, { to: string; id: string }[]>();
  for (const n of graph.nodes) adj.set(n.id, []);
  const back: string[] = [];
  for (const e of graph.edges) {
    if (e.source === e.target) { back.push(e.id); continue; } // self-loop is trivially a feedback edge
    if (adj.has(e.source) && adj.has(e.target)) adj.get(e.source)!.push({ to: e.target, id: e.id });
  }
  const WHITE = 0, GRAY = 1, BLACK = 2;
  const color = new Map<string, number>(graph.nodes.map(n => [n.id, WHITE]));
  for (const start of graph.nodes) {
    if (color.get(start.id) !== WHITE) continue;
    color.set(start.id, GRAY);
    const stack: { node: string; i: number }[] = [{ node: start.id, i: 0 }];
    while (stack.length) {
      const top = stack[stack.length - 1], edges = adj.get(top.node)!;
      if (top.i < edges.length) {
        const { to, id } = edges[top.i++], c = color.get(to);
        if (c === GRAY) back.push(id);                 // edge into an ancestor on the stack -> cycle
        else if (c === WHITE) { color.set(to, GRAY); stack.push({ node: to, i: 0 }); }
      } else { color.set(top.node, BLACK); stack.pop(); }
    }
  }
  return back;
}

/** Immediate-dominator map from a start node (Cooper–Harvey–Kennedy). `idom[n]` is the unique node every path
 * from `root` to `n` must pass through last before `n`; the root maps to itself. Only nodes reachable from the
 * root are included. Answers "which single step is unavoidable to reach X?" in a flow. `root` defaults to the
 * first indegree-0 node (else the first node). Iterative (deep-graph safe). Pure. */
export function dominators(graph: SemanticGraph, root?: string): Map<string, string> {
  const ids = new Set(graph.nodes.map(n => n.id));
  const indeg = new Map(graph.nodes.map(n => [n.id, 0]));
  for (const e of graph.edges) if (ids.has(e.source) && ids.has(e.target) && e.source !== e.target) indeg.set(e.target, (indeg.get(e.target) ?? 0) + 1);
  const start = (root && ids.has(root)) ? root : (graph.nodes.find(n => (indeg.get(n.id) ?? 0) === 0)?.id ?? graph.nodes[0]?.id);
  const idom = new Map<string, string>();
  if (!start) return idom;
  const succ = new Map<string, string[]>(graph.nodes.map(n => [n.id, []]));
  for (const e of graph.edges) if (ids.has(e.source) && ids.has(e.target)) succ.get(e.source)!.push(e.target);
  // Iterative DFS postorder from start.
  const post: string[] = [], seen = new Set<string>([start]), stack = [{ node: start, i: 0 }];
  while (stack.length) {
    const top = stack[stack.length - 1], ss = succ.get(top.node)!;
    if (top.i < ss.length) { const nx = ss[top.i++]; if (!seen.has(nx)) { seen.add(nx); stack.push({ node: nx, i: 0 }); } }
    else { post.push(top.node); stack.pop(); }
  }
  const postNum = new Map(post.map((id, i) => [id, i])), rpo = [...post].reverse();
  const preds = new Map<string, string[]>([...seen].map(id => [id, []]));
  for (const e of graph.edges) if (seen.has(e.source) && seen.has(e.target) && e.source !== e.target) preds.get(e.target)!.push(e.source);
  idom.set(start, start);
  const intersect = (a: string, b: string): string => {
    while (a !== b) { while (postNum.get(a)! < postNum.get(b)!) a = idom.get(a)!; while (postNum.get(b)! < postNum.get(a)!) b = idom.get(b)!; }
    return a;
  };
  let changed = true;
  while (changed) {
    changed = false;
    for (const b of rpo) {
      if (b === start) continue;
      let next: string | undefined;
      for (const p of preds.get(b)!) if (idom.has(p)) next = next === undefined ? p : intersect(p, next);
      if (next !== undefined && idom.get(b) !== next) { idom.set(b, next); changed = true; }
    }
  }
  return idom;
}

/** The dominator chain `[root, …, node]`: the ordered nodes every path from the root must pass through to reach
 * `node` (inclusive). Empty when `node` is unreachable from the root. Composes {@link dominators}. Pure. */
export function dominatorChain(graph: SemanticGraph, node: string, root?: string): string[] {
  const idom = dominators(graph, root);
  if (!idom.has(node)) return [];
  const chain = [node];
  let cur = node;
  while (idom.get(cur) !== cur) { cur = idom.get(cur)!; chain.push(cur); }
  return chain.reverse();
}

/** k-core decomposition: each node's core number — the largest k for which it belongs to a subgraph where every
 * node has degree ≥ k (undirected, parallel edges ignored). The nodes with the maximum core number form the
 * graph's densest core. Classic network-cohesion metric (Batagelj–Zaversnik peeling). Deterministic (ties break
 * by declaration order). Pure. */
export function coreness(graph: SemanticGraph): Map<string, number> {
  const ids = graph.nodes.map(n => n.id);
  const nbr = new Map<string, Set<string>>(ids.map(id => [id, new Set<string>()]));
  for (const e of graph.edges) {
    if (e.source === e.target || !nbr.has(e.source) || !nbr.has(e.target)) continue;
    nbr.get(e.source)!.add(e.target); nbr.get(e.target)!.add(e.source);
  }
  const deg = new Map<string, number>(ids.map(id => [id, nbr.get(id)!.size]));
  const core = new Map<string, number>(), remaining = new Set(ids);
  let k = 0;
  while (remaining.size) {
    let pick = '', min = Infinity;
    for (const v of remaining) { const d = deg.get(v)!; if (d < min) { min = d; pick = v; } } // first-min => declaration order
    k = Math.max(k, min);
    core.set(pick, k); remaining.delete(pick);
    for (const u of nbr.get(pick)!) if (remaining.has(u)) deg.set(u, deg.get(u)! - 1);
  }
  return core;
}

export interface GraphProperties {
  nodes: number; edges: number;
  /** Directed density m / (n·(n−1)), 0 when fewer than 2 nodes. */
  density: number;
  /** Weakly connected (one component; false for an empty graph). */
  isConnected: boolean;
  /** No directed cycle. */
  isDag: boolean;
  /** No undirected cycle (every component is a tree). */
  isForest: boolean;
  /** A forest that is also connected (n−1 edges, one component). */
  isTree: boolean;
  /** 2-colorable (no odd cycle, no self-loop). */
  isBipartite: boolean;
}

/** One-call structural classification of the graph: size, directed density, and the standard predicates
 * (connected, DAG, forest, tree, bipartite). Bipartiteness is a BFS 2-coloring (false on any odd cycle or
 * self-loop). Composes connectedComponents + hasCycle. Pure. */
export function graphProperties(graph: SemanticGraph): GraphProperties {
  const n = graph.nodes.length, m = graph.edges.length;
  const ids = new Set(graph.nodes.map(x => x.id));
  const comps = n ? connectedComponents(graph).length : 0;
  // Simple undirected edges (dedup parallels, drop self-loops) for the forest/tree tests.
  const undirected = new Set<string>(), adj = new Map<string, string[]>(graph.nodes.map(x => [x.id, []]));
  let selfLoop = false;
  for (const e of graph.edges) {
    if (!ids.has(e.source) || !ids.has(e.target)) continue;
    if (e.source === e.target) { selfLoop = true; continue; }
    const key = e.source < e.target ? `${e.source}\u0000${e.target}` : `${e.target}\u0000${e.source}`;
    if (!undirected.has(key)) { undirected.add(key); adj.get(e.source)!.push(e.target); adj.get(e.target)!.push(e.source); }
  }
  const simpleEdges = undirected.size;
  const isForest = !selfLoop && simpleEdges === n - comps;
  // Bipartite 2-coloring (BFS) over the simple undirected graph.
  let isBipartite = !selfLoop;
  const color = new Map<string, number>();
  for (const start of graph.nodes) {
    if (!isBipartite) break;
    if (color.has(start.id)) continue;
    color.set(start.id, 0); const queue = [start.id];
    for (let h = 0; h < queue.length && isBipartite; h++) {
      const u = queue[h];
      for (const v of adj.get(u)!) {
        if (!color.has(v)) { color.set(v, color.get(u)! ^ 1); queue.push(v); }
        else if (color.get(v) === color.get(u)) { isBipartite = false; break; }
      }
    }
  }
  return {
    nodes: n, edges: m,
    density: n >= 2 ? +(m / (n * (n - 1))).toFixed(3) : 0,
    isConnected: comps === 1,
    isDag: n > 0 && !hasCycle(graph),
    isForest, isTree: isForest && comps === 1 && n > 0,
    isBipartite,
  };
}

/** Closeness centrality (per node) — how quickly a node can reach the rest by following directed edges:
 * the Wasserman–Faust normalization `(r−1)² / ((n−1)·Σdist)` where `r` is the number of nodes reachable from it
 * (itself included) and `Σdist` the sum of BFS distances, so disconnected graphs are handled and scores land in
 * [0,1]. A node that reaches none scores 0. Completes the degree/betweenness/PageRank set. Pure. */
export function closenessCentrality(graph: SemanticGraph): NodeScore[] {
  const adj = adjacency(graph), n = graph.nodes.length;
  return graph.nodes.map(node => {
    const dist = new Map<string, number>([[node.id, 0]]), queue = [node.id];
    for (let h = 0; h < queue.length; h++) { const u = queue[h], du = dist.get(u)!; for (const v of adj.get(u) ?? []) if (!dist.has(v)) { dist.set(v, du + 1); queue.push(v); } }
    let sum = 0; for (const d of dist.values()) sum += d;
    const r = dist.size;
    const score = (sum > 0 && n > 1) ? +(((r - 1) * (r - 1)) / ((n - 1) * sum)).toFixed(4) : 0;
    return { id: node.id, score };
  });
}

/** The `count` nodes with the highest closeness centrality (score > 0), ties by declaration order. Pure. */
export function closestNodes(graph: SemanticGraph, count = 3): string[] {
  return closenessCentrality(graph)
    .map((d, i) => ({ ...d, i }))
    .filter(d => d.score > 0)
    .sort((a, b) => b.score - a.score || a.i - b.i)
    .slice(0, Math.max(0, count))
    .map(d => d.id);
}

/** Eccentricity of each node: the greatest shortest-path distance from it to any node it can reach (within its
 * component). Undirected by default (the textbook definition); `directed:true` measures outgoing reach only.
 * A node with no neighbours has eccentricity 0. O(V·(V+E)). Pure. */
export function eccentricity(graph: SemanticGraph, options: { directed?: boolean } = {}): Map<string, number> {
  const ids = new Set(graph.nodes.map(n => n.id));
  const adj = new Map<string, string[]>(graph.nodes.map(n => [n.id, []]));
  for (const e of graph.edges) {
    if (e.source === e.target || !ids.has(e.source) || !ids.has(e.target)) continue;
    adj.get(e.source)!.push(e.target);
    if (!options.directed) adj.get(e.target)!.push(e.source);
  }
  const ecc = new Map<string, number>();
  for (const start of graph.nodes) {
    const dist = new Map<string, number>([[start.id, 0]]), queue = [start.id];
    let max = 0;
    for (let h = 0; h < queue.length; h++) { const u = queue[h], du = dist.get(u)!; for (const v of adj.get(u) ?? []) if (!dist.has(v)) { dist.set(v, du + 1); if (du + 1 > max) max = du + 1; queue.push(v); } }
    ecc.set(start.id, max);
  }
  return ecc;
}

export interface GraphCenter { radius: number; diameter: number; center: string[]; periphery: string[] }
/** The graph's radius/diameter and its center (nodes of minimum eccentricity) and periphery (maximum), from
 * {@link eccentricity}. The center is the "most central by worst-case distance". Undirected by default. Pure. */
export function graphCenter(graph: SemanticGraph, options: { directed?: boolean } = {}): GraphCenter {
  const ecc = eccentricity(graph, options);
  if (!ecc.size) return { radius: 0, diameter: 0, center: [], periphery: [] };
  const values = [...ecc.values()], radius = Math.min(...values), diameter = Math.max(...values);
  const center: string[] = [], periphery: string[] = [];
  for (const n of graph.nodes) { const e = ecc.get(n.id)!; if (e === radius) center.push(n.id); if (e === diameter) periphery.push(n.id); }
  return { radius, diameter, center, periphery };
}

export interface Endpoints { sources: string[]; sinks: string[]; isolated: string[] }
/** The structural endpoints of a graph: `sources` (no incoming edges — entry points), `sinks` (no outgoing —
 * exit points), and `isolated` (neither, i.e. disconnected). Self-loops are ignored for the in/out counts. Ids
 * keep declaration order. Complements the type-based start/end detection of validateFlow with a purely
 * structural view. Pure. */
export function endpoints(graph: SemanticGraph): Endpoints {
  const ids = new Set(graph.nodes.map(n => n.id));
  const inDeg = new Map<string, number>(graph.nodes.map(n => [n.id, 0]));
  const outDeg = new Map<string, number>(graph.nodes.map(n => [n.id, 0]));
  for (const e of graph.edges) {
    if (e.source === e.target || !ids.has(e.source) || !ids.has(e.target)) continue;
    outDeg.set(e.source, (outDeg.get(e.source) ?? 0) + 1); inDeg.set(e.target, (inDeg.get(e.target) ?? 0) + 1);
  }
  const sources: string[] = [], sinks: string[] = [], isolated: string[] = [];
  for (const n of graph.nodes) {
    const i = inDeg.get(n.id) ?? 0, o = outDeg.get(n.id) ?? 0;
    if (i === 0 && o === 0) isolated.push(n.id);
    else { if (i === 0) sources.push(n.id); if (o === 0) sinks.push(n.id); }
  }
  return { sources, sinks, isolated };
}

/** The diameter path: a longest shortest-path route in the graph — the two most-distant nodes and the sequence
 * of nodes between them (inclusive). Complements `distanceStats` (which gives only the diameter length). Directed
 * by default (following edge direction); `directed:false` for the undirected view. BFS from every node with
 * parent reconstruction; ties broken by declaration order. Empty when there are no edges. Pure. */
export function diameterPath(graph: SemanticGraph, options: { directed?: boolean } = {}): string[] {
  const ids = new Set(graph.nodes.map(n => n.id));
  const adj = new Map<string, string[]>(graph.nodes.map(n => [n.id, []]));
  for (const e of graph.edges) {
    if (e.source === e.target || !ids.has(e.source) || !ids.has(e.target)) continue;
    adj.get(e.source)!.push(e.target);
    if (options.directed === false) adj.get(e.target)!.push(e.source);
  }
  let best: string[] = [];
  for (const start of graph.nodes) {
    const parent = new Map<string, string | null>([[start.id, null]]), queue = [start.id];
    let farthest = start.id, maxDepth = 0;
    const depth = new Map<string, number>([[start.id, 0]]);
    for (let h = 0; h < queue.length; h++) {
      const u = queue[h], du = depth.get(u)!;
      for (const v of adj.get(u) ?? []) if (!parent.has(v)) { parent.set(v, u); depth.set(v, du + 1); if (du + 1 > maxDepth) { maxDepth = du + 1; farthest = v; } queue.push(v); }
    }
    if (maxDepth > best.length - 1) {
      const path: string[] = []; for (let cur: string | null = farthest; cur != null; cur = parent.get(cur)!) path.push(cur);
      best = path.reverse();
    }
  }
  return best.length > 1 ? best : []; // a lone node is not a route
}

export interface EdgeScore { id: string; source: string; target: string; score: number }
/** Edge betweenness: how many shortest paths run through each edge — the most load-bearing connections / likely
 * bottlenecks (the metric behind Girvan–Newman community splitting). Brandes accumulation onto edges; directed
 * per the model. Edges never on a shortest path score 0; parallel edges (same endpoints) share the pair's score.
 * Returns one entry per edge in declaration order. Pure. */
export function edgeBetweenness(graph: SemanticGraph): EdgeScore[] {
  const adjE = new Map<string, Array<{ to: string }>>(graph.nodes.map(n => [n.id, []]));
  const present = new Set(graph.nodes.map(n => n.id));
  for (const e of graph.edges) if (e.source !== e.target && present.has(e.source) && present.has(e.target)) adjE.get(e.source)!.push({ to: e.target });
  const pairScore = new Map<string, number>(); // key `${v}\0${w}`
  for (const s of graph.nodes) {
    const stack: string[] = [], pred = new Map<string, string[]>(), sigma = new Map<string, number>(), dist = new Map<string, number>();
    for (const n of graph.nodes) { pred.set(n.id, []); sigma.set(n.id, 0); dist.set(n.id, -1); }
    sigma.set(s.id, 1); dist.set(s.id, 0);
    const queue = [s.id];
    for (let head = 0; head < queue.length; head++) {
      const v = queue[head]; stack.push(v);
      for (const { to: w } of adjE.get(v) ?? []) {
        if (dist.get(w)! < 0) { dist.set(w, dist.get(v)! + 1); queue.push(w); }
        if (dist.get(w) === dist.get(v)! + 1) { sigma.set(w, sigma.get(w)! + sigma.get(v)!); pred.get(w)!.push(v); }
      }
    }
    const delta = new Map<string, number>(graph.nodes.map(n => [n.id, 0]));
    for (let i = stack.length - 1; i >= 0; i--) {
      const w = stack[i];
      for (const v of pred.get(w)!) {
        const c = (sigma.get(v)! / sigma.get(w)!) * (1 + delta.get(w)!);
        pairScore.set(`${v}\u0000${w}`, (pairScore.get(`${v}\u0000${w}`) ?? 0) + c);
        delta.set(v, delta.get(v)! + c);
      }
    }
  }
  return graph.edges.map(e => ({ id: e.id, source: e.source, target: e.target, score: +(pairScore.get(`${e.source}\u0000${e.target}`) ?? 0).toFixed(4) }));
}

/** The `count` edges with the highest edge betweenness (score > 0) — the connections most paths depend on. Ties
 * by declaration order. Returns edge ids. Pure. */
export function bottleneckEdges(graph: SemanticGraph, count = 3): string[] {
  return edgeBetweenness(graph)
    .map((d, i) => ({ ...d, i }))
    .filter(d => d.score > 0)
    .sort((a, b) => b.score - a.score || a.i - b.i)
    .slice(0, Math.max(0, count))
    .map(d => d.id);
}

export interface LinkSuggestion { source: string; target: string; score: number; common: number }
export interface SuggestLinksOptions { count?: number; minScore?: number }
/** Link prediction: ranks the node pairs that are *not* yet connected but share neighbours, by the
 * Adamic–Adar index — Σ 1/ln(degree(w)) over common neighbours w, so a shared hub counts less than a shared
 * leaf (the classic measure used by NetworkX's `adamic_adar_index`). The graph is read as undirected and pairs
 * already joined in either direction are skipped. A practical "what connections are you missing?" aid for
 * flows and architecture maps. Returns the top `count` (default 5) pairs with `score > minScore`, highest
 * first, ties broken by shared-neighbour count then declaration order. Pure and deterministic. */
export function suggestLinks(graph: SemanticGraph, options: SuggestLinksOptions = {}): LinkSuggestion[] {
  const count = options.count ?? 5, minScore = options.minScore ?? 0;
  const ids = graph.nodes.map(n => n.id), idSet = new Set(ids), rank = new Map(ids.map((id, i) => [id, i]));
  const adj = new Map<string, Set<string>>(ids.map(id => [id, new Set<string>()]));
  for (const e of graph.edges) { if (e.source === e.target || !idSet.has(e.source) || !idSet.has(e.target)) continue; adj.get(e.source)!.add(e.target); adj.get(e.target)!.add(e.source); }
  const weight = new Map<string, number>(ids.map(id => { const d = adj.get(id)!.size; return [id, d > 1 ? 1 / Math.log(d) : 0]; }));
  const out: LinkSuggestion[] = [];
  for (let i = 0; i < ids.length; i++) for (let j = i + 1; j < ids.length; j++) {
    const a = ids[i], b = ids[j];
    if (adj.get(a)!.has(b)) continue; // already connected (either direction)
    let score = 0, common = 0;
    for (const w of adj.get(a)!) if (adj.get(b)!.has(w)) { common++; score += weight.get(w)!; }
    if (common === 0 || score <= minScore) continue;
    out.push({ source: a, target: b, score: +score.toFixed(4), common });
  }
  out.sort((x, y) => y.score - x.score || y.common - x.common || rank.get(x.source)! - rank.get(y.source)! || rank.get(x.target)! - rank.get(y.target)!);
  return out.slice(0, Math.max(0, count));
}

/** Harmonic centrality (per node) — like closeness, but the sum of *reciprocal* distances `Σ 1/dist(v,u)` over
 * the nodes v can reach (directed), normalized by `n−1` to land in [0,1]. Because unreachable nodes contribute
 * 0 instead of ∞, it stays meaningful on disconnected and directed graphs where plain closeness collapses — the
 * reason NetworkX offers `harmonic_centrality`. A node that reaches none scores 0. Pure and deterministic. */
export function harmonicCentrality(graph: SemanticGraph): NodeScore[] {
  const adj = adjacency(graph), n = graph.nodes.length;
  return graph.nodes.map(node => {
    const dist = new Map<string, number>([[node.id, 0]]), queue = [node.id];
    for (let h = 0; h < queue.length; h++) { const u = queue[h], du = dist.get(u)!; for (const v of adj.get(u) ?? []) if (!dist.has(v)) { dist.set(v, du + 1); queue.push(v); } }
    let sum = 0; for (const d of dist.values()) if (d > 0) sum += 1 / d;
    const score = n > 1 ? +(sum / (n - 1)).toFixed(4) : 0;
    return { id: node.id, score };
  });
}

/** The `count` nodes with the highest harmonic centrality (score > 0), ties by declaration order. Pure. */
export function topHarmonic(graph: SemanticGraph, count = 3): string[] {
  return harmonicCentrality(graph)
    .map((d, i) => ({ ...d, i }))
    .filter(d => d.score > 0)
    .sort((a, b) => b.score - a.score || a.i - b.i)
    .slice(0, Math.max(0, count))
    .map(d => d.id);
}

export interface CpmNode { id: string; earliestStart: number; earliestFinish: number; latestStart: number; latestFinish: number; slack: number; critical: boolean }
export interface CpmResult { projectDuration: number; nodes: CpmNode[]; critical: string[] }
export interface CpmOptions { duration?: (id: string) => number }
/** Critical Path Method (CPM) scheduling over the flow read as an activity-on-node DAG. Each node is an activity
 * with a duration (default 1 — i.e. step count; pass `duration` for real times). Computes, per node, the
 * earliest/latest start and finish and the **slack** (float = latestStart − earliestStart); nodes with zero
 * slack form the critical path(s) that set the total `projectDuration`. The classic project-scheduling analysis,
 * which no diagram-first tool (Mermaid/draw.io/Excalidraw) offers out of the box. Returns null when the graph has
 * a cycle (CPM needs a DAG). Pure and deterministic; node order follows declaration order. */
export function criticalPathMethod(graph: SemanticGraph, options: CpmOptions = {}): CpmResult | null {
  const order = topologicalOrder(graph); if (!order) return null;
  const dur = (id: string) => { const d = options.duration ? options.duration(id) : 1; return Number.isFinite(d) && d >= 0 ? d : 0; };
  const succ = new Map<string, string[]>(graph.nodes.map(n => [n.id, []]));
  const pred = new Map<string, string[]>(graph.nodes.map(n => [n.id, []]));
  for (const e of graph.edges) { if (e.source === e.target) continue; succ.get(e.source)?.push(e.target); pred.get(e.target)?.push(e.source); }
  const es = new Map<string, number>(), ef = new Map<string, number>();
  for (const id of order) { // forward pass
    const start = Math.max(0, ...(pred.get(id) ?? []).map(p => ef.get(p) ?? 0));
    es.set(id, start); ef.set(id, start + dur(id));
  }
  const projectDuration = Math.max(0, ...graph.nodes.map(n => ef.get(n.id) ?? 0));
  const lf = new Map<string, number>(), ls = new Map<string, number>();
  for (let i = order.length - 1; i >= 0; i--) { // backward pass
    const id = order[i], succs = succ.get(id) ?? [];
    const finish = succs.length ? Math.min(...succs.map(s => ls.get(s) ?? projectDuration)) : projectDuration;
    lf.set(id, finish); ls.set(id, finish - dur(id));
  }
  const round = (v: number) => +v.toFixed(4);
  const nodes: CpmNode[] = graph.nodes.map(n => {
    const slack = round((ls.get(n.id) ?? 0) - (es.get(n.id) ?? 0));
    return { id: n.id, earliestStart: round(es.get(n.id) ?? 0), earliestFinish: round(ef.get(n.id) ?? 0), latestStart: round(ls.get(n.id) ?? 0), latestFinish: round(lf.get(n.id) ?? 0), slack, critical: Math.abs(slack) < 1e-9 };
  });
  return { projectDuration: round(projectDuration), nodes, critical: nodes.filter(n => n.critical).map(n => n.id) };
}

/** Reciprocity of the directed graph: the fraction of its distinct directed connections `u→v` that also have the
 * reverse `v→u`. 1 means every link is mutual, 0 means none. Self-loops and parallel edges are ignored (distinct
 * ordered pairs). An empty/edgeless graph scores 0. The standard NetworkX `reciprocity`. Pure. */
export function reciprocity(graph: SemanticGraph): number {
  const pairs = new Set<string>();
  for (const e of graph.edges) if (e.source !== e.target) pairs.add(`${e.source}\u0000${e.target}`);
  if (!pairs.size) return 0;
  let mutual = 0;
  for (const p of pairs) { const [s, t] = p.split('\u0000'); if (pairs.has(`${t}\u0000${s}`)) mutual++; }
  return +(mutual / pairs.size).toFixed(4);
}

/** Transitivity — the global clustering coefficient: `3 × triangles / connected-triples`, i.e. the probability
 * that two neighbours of a node are themselves connected, computed over the whole (undirected, simple) graph.
 * Distinct from the per-node {@link clusteringCoefficient} average. 0 when there are no paths of length two.
 * The standard NetworkX `transitivity`. Pure and deterministic. */
export function transitivity(graph: SemanticGraph): number {
  const ids = graph.nodes.map(n => n.id), idSet = new Set(ids);
  const adj = new Map<string, Set<string>>(ids.map(id => [id, new Set<string>()]));
  for (const e of graph.edges) { if (e.source === e.target || !idSet.has(e.source) || !idSet.has(e.target)) continue; adj.get(e.source)!.add(e.target); adj.get(e.target)!.add(e.source); }
  let closed = 0, triples = 0;
  for (const id of ids) {
    const nb = [...adj.get(id)!], k = nb.length;
    triples += (k * (k - 1)) / 2; // connected triples centred on this node
    for (let i = 0; i < nb.length; i++) for (let j = i + 1; j < nb.length; j++) if (adj.get(nb[i])!.has(nb[j])) closed++;
  }
  return triples ? +(closed / triples).toFixed(4) : 0; // closed == 3×triangles, triples == Σ C(deg,2)
}

export interface MinCutResult { value: number; cutEdges: string[] }
/** Minimum s-t cut / maximum flow with unit edge capacities (Edmonds–Karp) — i.e. the number of edge-disjoint
 * directed paths from `source` to `target` (Menger's theorem), and a minimum set of edges whose removal
 * disconnects `target` from `source` (`|cutEdges| === value`). Parallel edges add capacity. A reliability
 * measure — "how many links must fail to sever A→B?" — that no diagram tool offers. Returns `{value:0, cutEdges:[]}`
 * when source===target or either is missing. Pure and deterministic (BFS in declaration order). */
export function minCut(graph: SemanticGraph, source: string, target: string): MinCutResult {
  const ids = new Set(graph.nodes.map(n => n.id));
  if (source === target || !ids.has(source) || !ids.has(target)) return { value: 0, cutEdges: [] };
  const cap = new Map<string, Map<string, number>>();
  const ensure = (u: string) => { let m = cap.get(u); if (!m) { m = new Map(); cap.set(u, m); } return m; };
  for (const n of graph.nodes) ensure(n.id);
  for (const e of graph.edges) {
    if (e.source === e.target || !ids.has(e.source) || !ids.has(e.target)) continue;
    const m = ensure(e.source); m.set(e.target, (m.get(e.target) ?? 0) + 1);
    const r = ensure(e.target); if (!r.has(e.source)) r.set(e.source, 0); // residual back-edge
  }
  let value = 0;
  for (;;) { // find an augmenting path (BFS), augment by its bottleneck
    const parent = new Map<string, string>([[source, source]]), q = [source]; let reached = false;
    for (let h = 0; h < q.length && !reached; h++) {
      const u = q[h];
      for (const [v, c] of cap.get(u)!) if (c > 0 && !parent.has(v)) { parent.set(v, u); if (v === target) { reached = true; break; } q.push(v); }
    }
    if (!parent.has(target)) break;
    let b = Infinity;
    for (let v = target; v !== source; v = parent.get(v)!) b = Math.min(b, cap.get(parent.get(v)!)!.get(v)!);
    for (let v = target; v !== source; v = parent.get(v)!) { const u = parent.get(v)!; cap.get(u)!.set(v, cap.get(u)!.get(v)! - b); cap.get(v)!.set(u, (cap.get(v)!.get(u) ?? 0) + b); }
    value += b;
  }
  const reach = new Set([source]), q = [source]; // nodes still reachable from source in the residual graph
  for (let h = 0; h < q.length; h++) for (const [v, c] of cap.get(q[h])!) if (c > 0 && !reach.has(v)) { reach.add(v); q.push(v); }
  const cutEdges: string[] = [];
  for (const e of graph.edges) if (e.source !== e.target && reach.has(e.source) && !reach.has(e.target)) cutEdges.push(e.id);
  return { value, cutEdges };
}

/** Modularity Q of a node partition (undirected, unit weights): `Σ_c [ L_c/m − (D_c/2m)² ]`, where `L_c` is the
 * edges inside community c, `D_c` the total degree of its nodes and `m` the edge count. Q near 1 means dense
 * communities with sparse links between them; ~0 means no better than random; negative means a poor split. It is
 * the score Louvain {@link communities} optimizes (NetworkX's `community.modularity`), so it quantifies "how good
 * is this grouping?". Self-loops and parallel edges are ignored; an edgeless graph scores 0. Pure. */
export function modularity(graph: SemanticGraph, partition: string[][]): number {
  const ids = new Set(graph.nodes.map(n => n.id));
  const adj = new Map<string, Set<string>>(graph.nodes.map(n => [n.id, new Set<string>()]));
  for (const e of graph.edges) { if (e.source === e.target || !ids.has(e.source) || !ids.has(e.target)) continue; adj.get(e.source)!.add(e.target); adj.get(e.target)!.add(e.source); }
  let twoM = 0; for (const s of adj.values()) twoM += s.size; const m = twoM / 2;
  if (!m) return 0;
  let q = 0;
  for (const comm of partition) {
    const S = new Set(comm.filter(id => adj.has(id))); if (!S.size) continue;
    let within2 = 0, degSum = 0;
    for (const id of S) { const nb = adj.get(id)!; degSum += nb.size; for (const v of nb) if (S.has(v)) within2++; }
    q += within2 / 2 / m - (degSum / twoM) ** 2;
  }
  return +q.toFixed(4);
}

export interface EulerianResult { trail: string[]; circuit: boolean }
/** Finds an Eulerian trail — a route that uses every (directed) edge exactly once — via Hierholzer's algorithm,
 * or null when none exists. It is a *circuit* (starts where it ends) when every node has equal in/out degree and
 * the edges are connected; it is an open *path* when exactly one node has one extra outgoing edge (the start) and
 * one has one extra incoming edge (the end). Parallel edges and self-loops count. Returns the node-id sequence
 * (length = edge count + 1). Useful for coverage/inspection routes and de Bruijn assembly. Pure and deterministic. */
export function eulerianTrail(graph: SemanticGraph): EulerianResult | null {
  const m = graph.edges.length; if (!m) return null;
  const ids = new Set(graph.nodes.map(n => n.id));
  const out = new Map<string, string[]>(graph.nodes.map(n => [n.id, []]));
  const indeg = new Map<string, number>(graph.nodes.map(n => [n.id, 0]));
  for (const e of graph.edges) { if (!ids.has(e.source) || !ids.has(e.target)) return null; out.get(e.source)!.push(e.target); indeg.set(e.target, (indeg.get(e.target) ?? 0) + 1); }
  let start: string | undefined, starts = 0, ends = 0;
  for (const n of graph.nodes) {
    const o = out.get(n.id)!.length, i = indeg.get(n.id) ?? 0, d = o - i;
    if (d === 1) { starts++; start = n.id; } else if (d === -1) { ends++; } else if (d !== 0) return null;
  }
  const circuit = starts === 0 && ends === 0;
  if (!(circuit || (starts === 1 && ends === 1))) return null;
  if (circuit) start = graph.nodes.find(n => out.get(n.id)!.length > 0)?.id; // any node with an out-edge
  if (!start) return null;
  const cursor = new Map<string, number>(graph.nodes.map(n => [n.id, 0]));
  const stack = [start], trail: string[] = [];
  while (stack.length) {
    const v = stack[stack.length - 1], list = out.get(v)!, k = cursor.get(v)!;
    if (k < list.length) { cursor.set(v, k + 1); stack.push(list[k]); }
    else trail.push(stack.pop()!);
  }
  trail.reverse();
  return trail.length === m + 1 ? { trail, circuit } : null; // length mismatch => edges were disconnected
}

export interface FragmentationScore { id: string; components: number }
/** Ranks a graph's single points of failure by *severity*: for each articulation point, how many
 * (weakly-)connected components the graph breaks into once that node is removed. Higher means a more damaging
 * failure. Unlike {@link criticalElements} (which only flags articulation points), this quantifies the fallout,
 * so you can tell the node that merely bridges two halves from one that shatters the graph into many. Results are
 * sorted by component count desc, then declaration order. Graphs read undirected. Pure. */
export function fragmentation(graph: SemanticGraph): FragmentationScore[] {
  const aps = new Set(articulationPoints(graph));
  if (!aps.size) return [];
  const order = new Map(graph.nodes.map((n, i) => [n.id, i]));
  const scores = [...aps].map(id => {
    const sub: SemanticGraph = { nodes: graph.nodes.filter(n => n.id !== id), edges: graph.edges.filter(e => e.source !== id && e.target !== id) };
    return { id, components: connectedComponents(sub).length };
  });
  return scores.sort((a, b) => b.components - a.components || (order.get(a.id)! - order.get(b.id)!));
}

/** The `count` nodes whose removal fragments the graph the most (from {@link fragmentation}), highest first. Pure. */
export function topFragmenters(graph: SemanticGraph, count = 3): string[] {
  return fragmentation(graph).slice(0, Math.max(0, count)).map(s => s.id);
}

export interface ReachabilityMatrix { ids: string[]; reaches: boolean[][] }
/** The directed reachability matrix (transitive closure): `reaches[i][j]` is true when node i can reach node j by
 * following one or more edges. The diagonal is true only for nodes on a cycle (a node that can return to itself).
 * The batch, all-pairs form of {@link descendants} — useful for impact/dependency analysis ("everything affected
 * if this changes"). O(V·(V+E)). Pure; ids follow declaration order. */
export function reachabilityMatrix(graph: SemanticGraph): ReachabilityMatrix {
  const ids = graph.nodes.map(n => n.id), index = new Map(ids.map((id, i) => [id, i])), adj = adjacency(graph);
  const reaches = ids.map(() => ids.map(() => false));
  ids.forEach((id, i) => {
    const seen = new Set<string>(), q: string[] = [];
    for (const n of adj.get(id) ?? []) if (!seen.has(n)) { seen.add(n); q.push(n); } // start from direct targets (>=1 edge)
    for (let h = 0; h < q.length; h++) for (const nx of adj.get(q[h]) ?? []) if (!seen.has(nx)) { seen.add(nx); q.push(nx); }
    for (const t of seen) { const j = index.get(t); if (j != null) reaches[i][j] = true; }
  });
  return { ids, reaches };
}

/** Degree assortativity coefficient (Newman) — the Pearson correlation of the degrees at the two ends of each
 * edge, in [−1,1]. Positive means high-degree nodes tend to link to other high-degree nodes (assortative);
 * negative means they link to low-degree nodes (disassortative — a star scores −1); ~0 is no correlation.
 * Characterizes a network's wiring (hubs-to-hubs vs hub-and-spoke). Graph read undirected; self-loops ignored;
 * an edgeless or uniform-degree graph scores 0. Pure. */
export function assortativity(graph: SemanticGraph): number {
  const ids = new Set(graph.nodes.map(n => n.id)), deg = new Map<string, number>(graph.nodes.map(n => [n.id, 0]));
  for (const e of graph.edges) { if (e.source === e.target || !ids.has(e.source) || !ids.has(e.target)) continue; deg.set(e.source, (deg.get(e.source) ?? 0) + 1); deg.set(e.target, (deg.get(e.target) ?? 0) + 1); }
  let n = 0, sx = 0, sy = 0, sxy = 0, sx2 = 0, sy2 = 0;
  for (const e of graph.edges) {
    if (e.source === e.target || !ids.has(e.source) || !ids.has(e.target)) continue;
    const a = deg.get(e.source)!, b = deg.get(e.target)!;
    for (const [x, y] of [[a, b], [b, a]] as const) { n++; sx += x; sy += y; sxy += x * y; sx2 += x * x; sy2 += y * y; }
  }
  if (!n) return 0;
  const num = sxy - (sx * sy) / n, den = Math.sqrt((sx2 - (sx * sx) / n) * (sy2 - (sy * sy) / n));
  return den === 0 ? 0 : +(num / den).toFixed(4);
}

export interface NodeQuery { type?: NodeType | NodeType[]; group?: string; tag?: string; titleIncludes?: string }
/** Finds the ids of nodes matching a query — by `type` (one or several), `group`, a `tag` the node carries, and/or
 * a case-insensitive `titleIncludes` substring. All provided criteria must hold (AND); an empty query matches
 * every node. A reusable building block for search, filters and "select all matching" in integrations. Returns
 * ids in declaration order. Pure. */
export function matchNodes(graph: SemanticGraph, query: NodeQuery = {}): string[] {
  const types = query.type == null ? null : new Set(Array.isArray(query.type) ? query.type : [query.type]);
  const needle = query.titleIncludes?.toLowerCase();
  return graph.nodes.filter(n =>
    (!types || types.has(n.type)) &&
    (query.group == null || n.group === query.group) &&
    (query.tag == null || (n.tags ?? []).includes(query.tag)) &&
    (needle == null || n.title.toLowerCase().includes(needle)),
  ).map(n => n.id);
}

/** A stable structural fingerprint of the graph: a short hex hash of its nodes and edges in a canonical
 * (sorted, order-independent) form, so two diagrams with the same structure — regardless of declaration order —
 * hash identically, and any change to a node/edge's identity flips it. Covers node id/type/title/group/lane/tags
 * and edge source/target/label/relation/condition; layout is NOT included. Dependency-free (two-seed FNV-1a).
 * Handy for change detection, render caching and deduping diagrams. Pure and deterministic. */
export function graphFingerprint(graph: SemanticGraph): string {
  const nodeKeys = graph.nodes.map(n => `${n.id}\u0001${n.type}\u0001${n.title}\u0001${n.group ?? ''}\u0001${n.lane ?? ''}\u0001${(n.tags ?? []).slice().sort().join(',')}`).sort();
  const edgeKeys = graph.edges.map(e => `${e.source}\u0001${e.target}\u0001${e.label ?? ''}\u0001${e.relation ?? ''}\u0001${e.condition ?? ''}\u0001${(e.tags ?? []).slice().sort().join(',')}`).sort();
  const canon = `N${nodeKeys.length}\u0002${nodeKeys.join('\u0003')}\u0002E${edgeKeys.length}\u0002${edgeKeys.join('\u0003')}`;
  const fnv = (seed: number): string => { let h = seed >>> 0; for (let i = 0; i < canon.length; i++) { h ^= canon.charCodeAt(i); h = Math.imul(h, 0x01000193); } return (h >>> 0).toString(16).padStart(8, '0'); };
  return fnv(0x811c9dc5) + fnv(0x811c9dc5 ^ 0x5bd1e995);
}

export interface CyclesOptions { limit?: number }
/** Enumerates the simple cycles (feedback loops) of the directed graph — every one, not just the first like
 * {@link findCycle}. Each cycle is a node-id list in traversal order (no repeated closing node); self-loops
 * appear as a single-node list. Anchored DFS counts each cycle once at its lowest-index node, so there are no
 * rotations/duplicates. Bounded by `limit` (default 1000) to stay safe on cycle-dense graphs. Pure and
 * deterministic (declaration order). */
export function cycles(graph: SemanticGraph, options: CyclesOptions = {}): string[][] {
  const limit = options.limit ?? 1000;
  const ids = graph.nodes.map(n => n.id), index = new Map(ids.map((id, i) => [id, i])), adj = adjacency(graph);
  const found: string[][] = [];
  for (let i = 0; i < ids.length && found.length < limit; i++) {
    const start = ids[i], onPath = new Set<string>();
    const dfs = (v: string, path: string[]): void => {
      if (found.length >= limit) return;
      for (const w of adj.get(v) ?? []) {
        const wi = index.get(w); if (wi == null || wi < i) continue; // keep `start` the minimum-index node
        if (w === start) { found.push([...path]); if (found.length >= limit) return; }
        else if (wi > i && !onPath.has(w)) { onPath.add(w); dfs(w, [...path, w]); onPath.delete(w); }
      }
    };
    onPath.add(start); dfs(start, [start]);
  }
  return found;
}

export interface EigenvectorOptions { iterations?: number }
/** Eigenvector centrality (undirected, power iteration): a node is important when it connects to other important
 * nodes — influence that propagates, unlike raw degree. Scores are normalized so the top node is 1; an edgeless
 * graph (or node) scores 0. Complements PageRank (its damped directed cousin), degree, betweenness, closeness
 * and harmonic centrality. Deterministic (uniform start, fixed iterations). Pure. */
export function eigenvectorCentrality(graph: SemanticGraph, options: EigenvectorOptions = {}): NodeScore[] {
  const iterations = options.iterations ?? 100, ids = graph.nodes.map(n => n.id), idx = new Map(ids.map((id, i) => [id, i])), n = ids.length;
  if (!n) return [];
  const adj: number[][] = ids.map(() => []); let anyEdge = false;
  for (const e of graph.edges) { if (e.source === e.target) continue; const a = idx.get(e.source), b = idx.get(e.target); if (a == null || b == null) continue; adj[a].push(b); adj[b].push(a); anyEdge = true; }
  if (!anyEdge) return ids.map(id => ({ id, score: 0 })); // no connections -> centrality 0
  // Iterate on (A + I): preserves eigenvectors but makes the dominant eigenvalue positive, so power iteration
  // converges even on bipartite graphs (a star would otherwise oscillate and mis-rank the hub).
  let x = new Array<number>(n).fill(1 / Math.sqrt(n));
  for (let it = 0; it < iterations; it++) {
    const nx = new Array<number>(n);
    for (let i = 0; i < n; i++) { let s = x[i]; for (const j of adj[i]) s += x[j]; nx[i] = s; }
    const norm = Math.sqrt(nx.reduce((s, v) => s + v * v, 0));
    if (norm === 0) { x = new Array<number>(n).fill(0); break; }
    for (let i = 0; i < n; i++) nx[i] /= norm;
    x = nx;
  }
  const max = Math.max(0, ...x) || 1;
  return ids.map((id, i) => ({ id, score: +(x[i] / max).toFixed(4) }));
}

/** The `count` nodes with the highest eigenvector centrality (score > 0), ties by declaration order. Pure. */
export function influentialByEigenvector(graph: SemanticGraph, count = 3): string[] {
  return eigenvectorCentrality(graph)
    .map((d, i) => ({ ...d, i }))
    .filter(d => d.score > 0)
    .sort((a, b) => b.score - a.score || a.i - b.i)
    .slice(0, Math.max(0, count))
    .map(d => d.id);
}

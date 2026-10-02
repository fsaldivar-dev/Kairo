import { test } from 'node:test';
import assert from 'node:assert/strict';
import { shortestPath, pathEdges, topologicalOrder, stronglyConnectedComponents, hasCycle } from '../packages/diagram/src/algorithms.ts';
import type { SemanticGraph } from '../packages/diagram/src/types.ts';

// a -> b -> c -> e ; a -> d -> e  (two routes to e, the direct-ish one is shorter)
function g(): SemanticGraph {
  return {
    nodes: ['a', 'b', 'c', 'd', 'e'].map(id => ({ id, title: id.toUpperCase(), type: 'process' as const })),
    edges: [
      { id: 'ab', source: 'a', target: 'b' }, { id: 'bc', source: 'b', target: 'c' }, { id: 'ce', source: 'c', target: 'e' },
      { id: 'ad', source: 'a', target: 'd' }, { id: 'de', source: 'd', target: 'e' },
    ],
  };
}

test('shortestPath returns the fewest-hop directed route and is pure', () => {
  const graph = g(), original = JSON.stringify(graph);
  assert.deepEqual(shortestPath(graph, 'a', 'e'), ['a', 'd', 'e']); // 2 hops beats a-b-c-e (3)
  assert.deepEqual(shortestPath(graph, 'a', 'a'), ['a']);
  assert.equal(JSON.stringify(graph), original);
});
test('shortestPath respects direction and returns null when unreachable or unknown', () => {
  const graph = g();
  assert.equal(shortestPath(graph, 'e', 'a'), null); // edges are directed
  assert.equal(shortestPath(graph, 'a', 'zzz'), null);
});
test('pathEdges maps a node path to the connecting edge ids', () => {
  assert.deepEqual(pathEdges(g(), ['a', 'd', 'e']), ['ad', 'de']);
  assert.deepEqual(pathEdges(g(), ['a']), []);
});
test('topologicalOrder orders a DAG and returns null on a cycle', () => {
  const order = topologicalOrder(g())!;
  assert.equal(order[0], 'a');
  assert.ok(order.indexOf('b') < order.indexOf('c'));
  assert.ok(order.indexOf('d') < order.indexOf('e'));
  const cyclic = g(); cyclic.edges.push({ id: 'ea', source: 'e', target: 'a' });
  assert.equal(topologicalOrder(cyclic), null);
});
test('stronglyConnectedComponents finds cycles and lists singletons', () => {
  const graph = g();
  assert.deepEqual(stronglyConnectedComponents(graph).map(c => c.sort()).sort(), [['a'], ['b'], ['c'], ['d'], ['e']]);
  const cyclic = g(); cyclic.edges.push({ id: 'ca', source: 'c', target: 'a' }); // a-b-c-a is an SCC
  const scc = stronglyConnectedComponents(cyclic).filter(c => c.length > 1);
  assert.equal(scc.length, 1);
  assert.deepEqual(scc[0].slice().sort(), ['a', 'b', 'c']);
});
test('hasCycle detects directed cycles and self-loops', () => {
  assert.equal(hasCycle(g()), false);
  const selfLoop = g(); selfLoop.edges.push({ id: 'aa', source: 'a', target: 'a' });
  assert.equal(hasCycle(selfLoop), true);
  const cyclic = g(); cyclic.edges.push({ id: 'ea', source: 'e', target: 'a' });
  assert.equal(hasCycle(cyclic), true);
});
test('deep chains do not overflow the SCC stack', () => {
  const n = 10000;
  const nodes = Array.from({ length: n }, (_, i) => ({ id: String(i), title: String(i), type: 'process' as const }));
  const edges = nodes.slice(1).map((nd, i) => ({ id: 'e' + i, source: String(i), target: nd.id }));
  assert.equal(stronglyConnectedComponents({ nodes, edges }).length, n); // all singletons, no throw
});

import { connectedComponents } from '../packages/diagram/src/algorithms.ts';
test('connectedComponents groups weakly-connected nodes regardless of edge direction', () => {
  // Two clusters: a<->b (b->a reversed) and c->d; plus isolated x.
  const graph: SemanticGraph = {
    nodes: ['a', 'b', 'c', 'd', 'x'].map(id => ({ id, title: id, type: 'process' as const })),
    edges: [{ id: 'ba', source: 'b', target: 'a' }, { id: 'cd', source: 'c', target: 'd' }],
  };
  const comps = connectedComponents(graph);
  assert.equal(comps.length, 3);
  assert.deepEqual(comps[0].slice().sort(), ['a', 'b']); // a reached from b via undirected edge
  assert.deepEqual(comps[1].slice().sort(), ['c', 'd']);
  assert.deepEqual(comps[2], ['x']); // isolated singleton
});
test('connectedComponents returns one component for a connected graph and is pure', () => {
  const graph = g(), original = JSON.stringify(graph);
  assert.equal(connectedComponents(graph).length, 1); // the star/chain fixture is connected
  assert.equal(JSON.stringify(graph), original);
});
test('connectedComponents ignores self-loops and keeps document order', () => {
  const graph: SemanticGraph = {
    nodes: ['n1', 'n2'].map(id => ({ id, title: id, type: 'process' as const })),
    edges: [{ id: 'self', source: 'n1', target: 'n1' }],
  };
  assert.deepEqual(connectedComponents(graph), [['n1'], ['n2']]);
});

import { longestPath } from '../packages/diagram/src/algorithms.ts';
test('longestPath finds the critical (longest) route in a DAG and is pure', () => {
  // a->b->c->e (3 hops) and a->d->e (2 hops): the long route wins.
  const graph = g(), original = JSON.stringify(graph);
  assert.deepEqual(longestPath(graph), ['a', 'b', 'c', 'e']);
  assert.equal(JSON.stringify(graph), original);
});
test('longestPath returns null on a cycle and [id] for a single node', () => {
  const cyclic = g(); cyclic.edges.push({ id: 'ea', source: 'e', target: 'a' });
  assert.equal(longestPath(cyclic), null);
  assert.deepEqual(longestPath({ nodes: [{ id: 'only', type: 'process', title: 'Only' }], edges: [] }), ['only']);
  assert.equal(longestPath({ nodes: [], edges: [] }), null);
});
test('longestPath picks the deepest branch across disconnected parts', () => {
  const graph: SemanticGraph = {
    nodes: ['p', 'q', 'r', 's', 't'].map(id => ({ id, title: id, type: 'process' as const })),
    edges: [{ id: 'pq', source: 'p', target: 'q' }, { id: 'rs', source: 'r', target: 's' }, { id: 'st', source: 's', target: 't' }],
  };
  assert.deepEqual(longestPath(graph), ['r', 's', 't']); // 2 hops beats p->q (1 hop)
});

import { degrees, centralNodes } from '../packages/diagram/src/algorithms.ts';
test('degrees counts in/out/total per node in document order', () => {
  // star: hub -> a,b,c,d  (fixture reused)
  const graph: SemanticGraph = {
    nodes: ['hub', 'a', 'b', 'c'].map(id => ({ id, title: id, type: 'process' as const })),
    edges: [{ id: 'ha', source: 'hub', target: 'a' }, { id: 'hb', source: 'hub', target: 'b' }, { id: 'hc', source: 'hub', target: 'c' }],
  };
  const d = degrees(graph);
  assert.deepEqual(d.map(x => x.id), ['hub', 'a', 'b', 'c']); // document order
  assert.deepEqual(d[0], { id: 'hub', in: 0, out: 3, total: 3 });
  assert.deepEqual(d[1], { id: 'a', in: 1, out: 0, total: 1 });
});
test('degrees handles self-loops and ignores unknown endpoints', () => {
  const graph: SemanticGraph = {
    nodes: [{ id: 'x', title: 'X', type: 'process' }],
    edges: [{ id: 'self', source: 'x', target: 'x' }, { id: 'bad', source: 'x', target: 'ghost' }],
  };
  assert.deepEqual(degrees(graph)[0], { id: 'x', in: 1, out: 1, total: 2 }); // self-loop counts once each way; bad edge skipped
});
test('centralNodes returns the most connected nodes, excluding isolated ones', () => {
  const graph: SemanticGraph = {
    nodes: ['hub', 'a', 'b', 'lonely'].map(id => ({ id, title: id, type: 'process' as const })),
    edges: [{ id: '1', source: 'hub', target: 'a' }, { id: '2', source: 'hub', target: 'b' }, { id: '3', source: 'a', target: 'b' }],
  };
  assert.deepEqual(centralNodes(graph, 2), ['hub', 'a']); // hub total 2, a total 2 (tie -> document order), b total 2 too
  assert.ok(!centralNodes(graph, 10).includes('lonely')); // degree 0 excluded
});

import { allPaths } from '../packages/diagram/src/algorithms.ts';
test('allPaths enumerates every simple route and is pure', () => {
  // fixture g(): a->b->c->e and a->d->e
  const graph = g(), original = JSON.stringify(graph);
  const paths = allPaths(graph, 'a', 'e');
  assert.equal(paths.length, 2);
  assert.ok(paths.some(p => p.join('>') === 'a>b>c>e'));
  assert.ok(paths.some(p => p.join('>') === 'a>d>e'));
  assert.equal(JSON.stringify(graph), original);
});
test('allPaths handles cycles safely and respects direction', () => {
  const cyclic = g(); cyclic.edges.push({ id: 'ea', source: 'e', target: 'a' }); // introduce a cycle
  const paths = allPaths(cyclic, 'a', 'e');
  assert.equal(paths.length, 2); // still only the two acyclic simple paths
  assert.equal(allPaths(cyclic, 'e', 'a').length, 1); // e->a direct
});
test('allPaths returns [] for unreachable/unknown and [[id]] for from===to', () => {
  assert.deepEqual(allPaths(g(), 'e', 'a'), []); // no directed route
  assert.deepEqual(allPaths(g(), 'a', 'zzz'), []);
  assert.deepEqual(allPaths(g(), 'a', 'a'), [['a']]);
});
test('allPaths honours the maxPaths cap', () => {
  // A fan: s -> m1..m5 -> t gives 5 distinct paths; cap at 3.
  const mids = ['m1', 'm2', 'm3', 'm4', 'm5'];
  const graph: SemanticGraph = {
    nodes: ['s', ...mids, 't'].map(id => ({ id, title: id, type: 'process' as const })),
    edges: [...mids.map((m, i) => ({ id: 's' + i, source: 's', target: m })), ...mids.map((m, i) => ({ id: 't' + i, source: m, target: 't' }))],
  };
  assert.equal(allPaths(graph, 's', 't').length, 5);
  assert.equal(allPaths(graph, 's', 't', { maxPaths: 3 }).length, 3);
});

import { neighbors } from '../packages/diagram/src/algorithms.ts';
test('neighbors returns nodes within depth and respects direction', () => {
  // fixture g(): a->b->c->e, a->d->e
  const graph = g();
  assert.deepEqual(neighbors(graph, 'a').sort(), ['b', 'd']); // depth 1, both: out to b,d
  assert.deepEqual(neighbors(graph, 'a', { depth: 2 }).sort(), ['b', 'c', 'd', 'e']);
  assert.deepEqual(neighbors(graph, 'e', { direction: 'in' }).sort(), ['c', 'd']); // who points to e
  assert.deepEqual(neighbors(graph, 'e', { direction: 'out' }), []); // e has no outgoing
});
test('neighbors excludes the seed, ignores self-loops, and returns [] for unknown ids', () => {
  const graph = g(); graph.edges.push({ id: 'aa', source: 'a', target: 'a' });
  assert.ok(!neighbors(graph, 'a').includes('a')); // self excluded even with self-loop
  assert.deepEqual(neighbors(graph, 'zzz'), []);
  assert.deepEqual(neighbors(graph, 'a', { depth: 0 }), []); // depth 0 -> nothing
});

import { redundantEdges } from '../packages/diagram/src/algorithms.ts';
test('redundantEdges finds transitive shortcuts and keeps necessary edges', () => {
  // a->b->c plus a shortcut a->c: the shortcut is redundant.
  const graph: SemanticGraph = {
    nodes: ['a', 'b', 'c'].map(id => ({ id, title: id, type: 'process' as const })),
    edges: [{ id: 'ab', source: 'a', target: 'b' }, { id: 'bc', source: 'b', target: 'c' }, { id: 'ac', source: 'a', target: 'c' }],
  };
  assert.deepEqual(redundantEdges(graph), ['ac']);
});
test('redundantEdges keeps a diamond s edges except the long shortcut', () => {
  const graph: SemanticGraph = {
    nodes: ['a', 'b', 'c', 'd'].map(id => ({ id, title: id, type: 'process' as const })),
    edges: [
      { id: 'ab', source: 'a', target: 'b' }, { id: 'bd', source: 'b', target: 'd' },
      { id: 'ac', source: 'a', target: 'c' }, { id: 'cd', source: 'c', target: 'd' },
      { id: 'ad', source: 'a', target: 'd' }, // shortcut, redundant
    ],
  };
  assert.deepEqual(redundantEdges(graph), ['ad']);
});
test('redundantEdges does not remove parallels, sole links, or break cycles', () => {
  assert.deepEqual(redundantEdges({ nodes: [{ id: 'a', type: 'process', title: 'A' }, { id: 'b', type: 'process', title: 'B' }], edges: [{ id: 'e1', source: 'a', target: 'b' }, { id: 'e2', source: 'a', target: 'b' }] }), []); // parallel kept
  assert.deepEqual(redundantEdges({ nodes: [{ id: 'a', type: 'process', title: 'A' }, { id: 'b', type: 'process', title: 'B' }], edges: [{ id: 'ab', source: 'a', target: 'b' }, { id: 'ba', source: 'b', target: 'a' }] }), []); // cycle kept
});

import { articulationPoints, bridges, criticalElements } from '../packages/diagram/src/algorithms.ts';
const mk = (nodes: string[], edges: [string, string][]): SemanticGraph => ({
  nodes: nodes.map(id => ({ id, title: id, type: 'process' as const })),
  edges: edges.map(([s, t], i) => ({ id: `${s}${t}${i}`, source: s, target: t })),
});
test('articulationPoints finds the cut vertex of a chain joined to a triangle', () => {
  // triangle a-b-c (no cut among them) with a tail c-d-e: c and d are cut vertices.
  const g = mk(['a', 'b', 'c', 'd', 'e'], [['a', 'b'], ['b', 'c'], ['c', 'a'], ['c', 'd'], ['d', 'e']]);
  assert.deepEqual(articulationPoints(g), ['c', 'd']);
});
test('bridges finds the cut edges and not edges inside a cycle', () => {
  const g = mk(['a', 'b', 'c', 'd', 'e'], [['a', 'b'], ['b', 'c'], ['c', 'a'], ['c', 'd'], ['d', 'e']]);
  // c-d and d-e are bridges; the triangle edges are not.
  const br = bridges(g);
  assert.equal(br.length, 2);
  const g2 = mk(['a', 'b', 'c', 'd', 'e'], [['a', 'b'], ['b', 'c'], ['c', 'a'], ['c', 'd'], ['d', 'e']]);
  assert.deepEqual(br, [g2.edges[3].id, g2.edges[4].id]);
});
test('parallel edges between the same pair are not bridges', () => {
  // Two separate links a-b: removing either keeps a,b connected, so neither is a bridge.
  const g = mk(['a', 'b'], [['a', 'b'], ['a', 'b']]);
  assert.deepEqual(bridges(g), []);
  assert.deepEqual(articulationPoints(g), []);
});
test('criticalElements treats edges as undirected and ignores self-loops; direction does not matter', () => {
  // Same underlying structure, edges pointing "backwards": result must match the undirected view.
  const g = mk(['a', 'b', 'c', 'd'], [['b', 'a'], ['c', 'b'], ['a', 'c'], ['d', 'c']]);
  const r = criticalElements(g);
  assert.deepEqual(r.articulationPoints, ['c']); // c joins the triangle to the tail d
  assert.equal(r.bridges.length, 1); // only c-d
  const loop = mk(['x'], [['x', 'x']]);
  assert.deepEqual(criticalElements(loop), { articulationPoints: [], bridges: [] });
});
test('criticalElements handles disconnected components and large chains without stack overflow', () => {
  const nodes = Array.from({ length: 4000 }, (_, i) => `n${i}`);
  const edges = nodes.slice(1).map((id, i) => [nodes[i], id] as [string, string]); // one long path
  const r = criticalElements(mk(nodes, edges));
  assert.equal(r.bridges.length, 3999); // every edge on a path is a bridge
  assert.equal(r.articulationPoints.length, 3998); // every interior node is a cut vertex
});

import { betweennessCentrality, brokerNodes } from '../packages/diagram/src/algorithms.ts';
test('betweennessCentrality: the middle of a directed chain carries all brokered paths', () => {
  // a -> b -> c : b is on the single a..c path; a and c broker nothing.
  const chain = mk(['a', 'b', 'c'], [['a', 'b'], ['b', 'c']]);
  const bc = Object.fromEntries(betweennessCentrality(chain).map(d => [d.id, d.score]));
  assert.equal(bc.b, 1); // pair (a,c) passes through b
  assert.equal(bc.a, 0);
  assert.equal(bc.c, 0);
});
test('betweennessCentrality splits credit across equal shortest paths', () => {
  // Two length-2 routes a->b->d and a->c->d: b and c each carry half of the (a,d) path.
  const diamond = mk(['a', 'b', 'c', 'd'], [['a', 'b'], ['a', 'c'], ['b', 'd'], ['c', 'd']]);
  const bc = Object.fromEntries(betweennessCentrality(diamond).map(d => [d.id, d.score]));
  assert.equal(bc.b, 0.5);
  assert.equal(bc.c, 0.5);
  assert.equal(bc.a, 0);
  assert.equal(bc.d, 0);
});
test('brokerNodes ranks by betweenness, excludes zero-score nodes, ties by declaration order', () => {
  // a->b->c->d->e : interior nodes b,c,d are brokers; c (the middle) scores highest.
  const line = mk(['a', 'b', 'c', 'd', 'e'], [['a', 'b'], ['b', 'c'], ['c', 'd'], ['d', 'e']]);
  const top = brokerNodes(line, 3);
  assert.equal(top[0], 'c'); // highest betweenness
  assert.equal(top.length, 3);
  assert.ok(!top.includes('a') && !top.includes('e')); // endpoints broker nothing
  // A graph with no brokered pairs yields none.
  assert.deepEqual(brokerNodes(mk(['x', 'y'], [['x', 'y']])), []);
});
test('betweennessCentrality is directed: reversing edges changes who brokers', () => {
  // Star in: b->a, c->a, d->a. a is a sink; no node lies between another pair, all zero.
  const star = mk(['a', 'b', 'c', 'd'], [['b', 'a'], ['c', 'a'], ['d', 'a']]);
  for (const d of betweennessCentrality(star)) assert.equal(d.score, 0);
});

import { communities } from '../packages/diagram/src/algorithms.ts';
test('communities splits two triangles joined by a single bridge into two clusters', () => {
  const g = mk(['a', 'b', 'c', 'd', 'e', 'f'], [['a', 'b'], ['b', 'c'], ['c', 'a'], ['d', 'e'], ['e', 'f'], ['f', 'd'], ['c', 'd']]);
  const comms = communities(g);
  assert.equal(comms.length, 2);
  assert.deepEqual(comms[0].sort(), ['a', 'b', 'c']);
  assert.deepEqual(comms[1].sort(), ['d', 'e', 'f']);
});
test('communities returns one cluster for a single clique and is deterministic', () => {
  const clique = mk(['a', 'b', 'c', 'd'], [['a', 'b'], ['a', 'c'], ['a', 'd'], ['b', 'c'], ['b', 'd'], ['c', 'd']]);
  assert.equal(communities(clique).length, 1);
  assert.deepEqual(communities(clique), communities(clique));
});
test('communities keeps disconnected components in separate clusters and isolates lone nodes', () => {
  const g = mk(['a', 'b', 'c', 'x', 'y', 'solo'], [['a', 'b'], ['b', 'c'], ['c', 'a'], ['x', 'y']]);
  const comms = communities(g);
  // At least three groups: the triangle, the x-y pair, and the isolated node on its own.
  assert.ok(comms.length >= 3);
  assert.ok(comms.some(c => c.length === 1 && c[0] === 'solo'));
  const all = comms.flat().sort();
  assert.deepEqual(all, ['a', 'b', 'c', 'solo', 'x', 'y']); // partition covers every node once
});

import { distanceStats } from '../packages/diagram/src/algorithms.ts';
test('distanceStats: directed chain diameter equals its length, average over reachable pairs', () => {
  // a->b->c->d : distances 1,2,3 (a..), 1,2 (b..), 1 (c..) -> 6 pairs, sum 1+2+3+1+2+1=10
  const chain = mk(['a', 'b', 'c', 'd'], [['a', 'b'], ['b', 'c'], ['c', 'd']]);
  const s = distanceStats(chain);
  assert.equal(s.diameter, 3);
  assert.equal(s.reachablePairs, 6);
  assert.equal(s.averagePathLength, +(10 / 6).toFixed(4));
});
test('distanceStats directed vs undirected differ on a one-way chain', () => {
  const chain = mk(['a', 'b', 'c'], [['a', 'b'], ['b', 'c']]);
  assert.equal(distanceStats(chain).reachablePairs, 3); // a->b,a->c,b->c
  const u = distanceStats(chain, { directed: false });
  assert.equal(u.reachablePairs, 6); // both directions reachable
  assert.equal(u.diameter, 2);
});
test('distanceStats returns zeros for an edgeless or single-node graph', () => {
  assert.deepEqual(distanceStats(mk(['a', 'b'], [])), { diameter: 0, averagePathLength: 0, reachablePairs: 0 });
  assert.deepEqual(distanceStats(mk(['x'], [])), { diameter: 0, averagePathLength: 0, reachablePairs: 0 });
});

import { greedyColoring } from '../packages/diagram/src/algorithms.ts';
const noAdjacentSameColor = (g: SemanticGraph, colors: Record<string, number>) => {
  for (const e of g.edges) if (e.source !== e.target) assert.notEqual(colors[e.source], colors[e.target], `edge ${e.id} joins same colour`);
};
test('greedyColoring gives a triangle 3 colours and a path 2, with no adjacent clashes', () => {
  const tri = mk(['a', 'b', 'c'], [['a', 'b'], ['b', 'c'], ['c', 'a']]);
  const t = greedyColoring(tri);
  assert.equal(t.count, 3);
  noAdjacentSameColor(tri, t.colors);
  const path = mk(['a', 'b', 'c', 'd'], [['a', 'b'], ['b', 'c'], ['c', 'd']]);
  const p = greedyColoring(path);
  assert.equal(p.count, 2);
  noAdjacentSameColor(path, p.colors);
});
test('greedyColoring is a valid colouring on a denser graph and treats edges as undirected', () => {
  const g = mk(['a', 'b', 'c', 'd', 'e'], [['a', 'b'], ['b', 'c'], ['c', 'd'], ['d', 'e'], ['e', 'a'], ['a', 'c']]);
  const { colors, count } = greedyColoring(g);
  noAdjacentSameColor(g, colors);
  assert.ok(count >= 3 && count <= 5);
  // Reversing an edge must not change validity (undirected).
  const rev = mk(['a', 'b', 'c', 'd', 'e'], [['b', 'a'], ['b', 'c'], ['c', 'd'], ['d', 'e'], ['e', 'a'], ['a', 'c']]);
  noAdjacentSameColor(rev, greedyColoring(rev).colors);
});
test('greedyColoring: isolated nodes all share colour 0; empty graph uses 0 colours; deterministic', () => {
  const iso = mk(['a', 'b', 'c'], []);
  const r = greedyColoring(iso);
  assert.deepEqual({ ...r.colors }, { a: 0, b: 0, c: 0 });
  assert.equal(r.count, 1);
  const empty = greedyColoring(mk([], [])); assert.deepEqual({ ...empty.colors }, {}); assert.equal(empty.count, 0);
  const g = mk(['a', 'b', 'c'], [['a', 'b'], ['b', 'c'], ['c', 'a']]);
  assert.deepEqual({ ...greedyColoring(g).colors }, { ...greedyColoring(g).colors }); // deterministic
});

import { pageRank, influentialNodes } from '../packages/diagram/src/algorithms.ts';
const prSum = (g: SemanticGraph) => pageRank(g).reduce((s, r) => s + r.score, 0);
test('pageRank accumulates toward sinks in a chain and sums to ~1', () => {
  const chain = mk(['a', 'b', 'c'], [['a', 'b'], ['b', 'c']]);
  const r = Object.fromEntries(pageRank(chain).map(d => [d.id, d.score]));
  assert.ok(r.c > r.b && r.b > r.a);
  assert.ok(Math.abs(prSum(chain) - 1) < 1e-3);
});
test('pageRank ranks the hub of an in-star highest; influentialNodes returns the top-k', () => {
  const star = mk(['a', 'b', 'c', 'd'], [['b', 'a'], ['c', 'a'], ['d', 'a']]);
  assert.equal(influentialNodes(star, 1)[0], 'a');
  const top = influentialNodes(star, 2);
  assert.equal(top.length, 2);
  assert.equal(top[0], 'a');
});
test('pageRank with damping 0 is uniform; empty graph yields no scores; deterministic', () => {
  const g = mk(['a', 'b', 'c'], [['a', 'b'], ['b', 'c']]);
  const uniform = pageRank(g, { damping: 0 });
  for (const d of uniform) assert.ok(Math.abs(d.score - 1 / 3) < 1e-6);
  assert.deepEqual(pageRank(mk([], [])), []);
  assert.deepEqual(pageRank(g), pageRank(g));
});
test('pageRank ignores self-loops', () => {
  const withLoop = mk(['a', 'b'], [['a', 'b'], ['a', 'a']]);
  const without = mk(['a', 'b'], [['a', 'b']]);
  assert.deepEqual(pageRank(withLoop), pageRank(without));
});

import { findCycle, hasCycle as hasCycle2 } from '../packages/diagram/src/algorithms.ts';
test('findCycle returns an ordered cycle path, null when acyclic, [a] for a self-loop', () => {
  assert.equal(findCycle(mk(['a', 'b', 'c'], [['a', 'b'], ['b', 'c']])), null);
  const cyc = findCycle(mk(['a', 'b', 'c'], [['a', 'b'], ['b', 'c'], ['c', 'a']]))!;
  assert.deepEqual([...cyc].sort(), ['a', 'b', 'c']);
  // The path is a real directed cycle: each consecutive pair (and last->first) is an edge.
  const edges = new Set(['ab', 'bc', 'ca']);
  const g = mk(['a', 'b', 'c'], [['a', 'b'], ['b', 'c'], ['c', 'a']]);
  const has = (s: string, t: string) => g.edges.some(e => e.source === s && e.target === t);
  for (let i = 0; i < cyc.length; i++) assert.ok(has(cyc[i], cyc[(i + 1) % cyc.length]), `edge ${cyc[i]}->${cyc[(i + 1) % cyc.length]}`);
  assert.deepEqual(findCycle(mk(['a'], [['a', 'a']])), ['a']);
  void edges;
});
test('findCycle agrees with hasCycle and is stack-safe on a long chain', () => {
  const chain = mk(Array.from({ length: 4000 }, (_, i) => 'n' + i), Array.from({ length: 3999 }, (_, i) => ['n' + i, 'n' + (i + 1)] as [string, string]));
  assert.equal(findCycle(chain), null);
  assert.equal(hasCycle2(chain), false);
  const looped = mk(['x', 'y', 'z'], [['x', 'y'], ['y', 'z'], ['z', 'y']]);
  assert.ok(findCycle(looped)); // y<->z loop
  assert.equal(hasCycle2(looped), true);
});

import { topologicalGenerations } from '../packages/diagram/src/algorithms.ts';
test('topologicalGenerations groups a DAG into parallel waves', () => {
  const diamond = mk(['a', 'b', 'c', 'd'], [['a', 'b'], ['a', 'c'], ['b', 'd'], ['c', 'd']]);
  assert.deepEqual(topologicalGenerations(diamond), [['a'], ['b', 'c'], ['d']]);
  // Every node appears exactly once and no edge goes backwards between waves.
  const wave = new Map<string, number>();
  topologicalGenerations(diamond).forEach((w, i) => w.forEach(id => wave.set(id, i)));
  for (const e of diamond.edges) assert.ok(wave.get(e.target)! > wave.get(e.source)!);
});
test('topologicalGenerations ignores self-loops and omits nodes trapped in a cycle', () => {
  assert.deepEqual(topologicalGenerations(mk(['a', 'b'], [['a', 'a'], ['a', 'b']])), [['a'], ['b']]);
  const cyclic = mk(['a', 'b', 'c'], [['a', 'b'], ['b', 'c'], ['c', 'b']]);
  assert.deepEqual(topologicalGenerations(cyclic), [['a']]); // b,c are in a cycle
  assert.deepEqual(topologicalGenerations(mk([], [])), []);
});

import { transitiveClosure } from '../packages/diagram/src/algorithms.ts';
test('transitiveClosure adds every implied reachability edge and excludes self-pairs', () => {
  const chain = mk(['a', 'b', 'c'], [['a', 'b'], ['b', 'c']]);
  const pairs = transitiveClosure(chain).edges.map(e => `${e.source}>${e.target}`).sort();
  assert.deepEqual(pairs, ['a>b', 'a>c', 'b>c']); // a>c is the implied edge
  assert.equal(transitiveClosure(chain).nodes.length, 3); // nodes copied
  // A cycle yields the mutual edges but no self-pair.
  assert.deepEqual(transitiveClosure(mk(['a', 'b'], [['a', 'b'], ['b', 'a']])).edges.map(e => `${e.source}>${e.target}`).sort(), ['a>b', 'b>a']);
  // Disconnected nodes contribute no edges.
  assert.equal(transitiveClosure(mk(['x', 'y'], [])).edges.length, 0);
});

import { ancestors, descendants } from '../packages/diagram/src/algorithms.ts';
test('descendants and ancestors give downstream/upstream transitive sets, excluding the node', () => {
  const g = mk(['a', 'b', 'c', 'd'], [['a', 'b'], ['b', 'c'], ['b', 'd']]);
  assert.deepEqual(descendants(g, 'a'), ['b', 'c', 'd']);
  assert.deepEqual(descendants(g, 'b'), ['c', 'd']);
  assert.deepEqual(descendants(g, 'c'), []); // leaf
  assert.deepEqual(ancestors(g, 'c'), ['a', 'b']);
  assert.deepEqual(ancestors(g, 'a'), []); // root
  assert.deepEqual(ancestors(g, 'nope'), []); // absent
});
test('descendants/ancestors handle cycles without looping and exclude self', () => {
  const g = mk(['a', 'b', 'c'], [['a', 'b'], ['b', 'c'], ['c', 'a']]);
  assert.deepEqual(descendants(g, 'a').sort(), ['b', 'c']); // reaches b,c (not itself)
  assert.deepEqual(ancestors(g, 'a').sort(), ['b', 'c']); // reached from b,c
});

import { clusteringCoefficient } from '../packages/diagram/src/algorithms.ts';
test('clusteringCoefficient: triangle nodes score 1, star leaves/centre score 0', () => {
  const tri = clusteringCoefficient(mk(['a', 'b', 'c'], [['a', 'b'], ['b', 'c'], ['c', 'a']]));
  assert.ok(tri.perNode.every(n => n.score === 1));
  assert.equal(tri.average, 1);
  const star = clusteringCoefficient(mk(['c', 'a', 'b', 'd'], [['c', 'a'], ['c', 'b'], ['c', 'd']]));
  assert.equal(star.average, 0); // no neighbour pairs are connected
});
test('clusteringCoefficient: node with <2 neighbours scores 0; partial triangle is a fraction', () => {
  // square a-b-c-d-a plus diagonal a-c: a and c each have neighbours that are 1/3 connected... check a.
  const g = mk(['a', 'b', 'c', 'd'], [['a', 'b'], ['b', 'c'], ['c', 'd'], ['d', 'a'], ['a', 'c']]);
  const byId = Object.fromEntries(clusteringCoefficient(g).perNode.map(n => [n.id, n.score]));
  // a's neighbours: b,c,d. connected pairs among them: b-c and c-d => 2 of 3 => 0.6667.
  assert.equal(byId.a, +(2 / 3).toFixed(4));
  assert.equal(byId.b, 1); // b's neighbours a,c are connected (a-c)
});

import { suggestLinks } from '../packages/diagram/src/algorithms.ts';
test('suggestLinks predicts the missing diagonals of a 4-cycle, lowest-id pair first', () => {
  // 4-cycle a-c-b-d-a. The two unconnected pairs are the diagonals a-b (via c,d) and c-d (via a,b).
  const g = mk(['a', 'b', 'c', 'd'], [['a', 'c'], ['c', 'b'], ['a', 'd'], ['d', 'b']]);
  const out = suggestLinks(g);
  assert.equal(out.length, 2); // every other pair is already adjacent
  assert.deepEqual([out[0].source, out[0].target], ['a', 'b']); // tie broken by declaration order
  assert.deepEqual([out[1].source, out[1].target], ['c', 'd']);
  assert.equal(out[0].common, 2);
  for (const s of out) { assert.ok(s.common >= 1); assert.ok(s.score > 0); }
  for (let i = 1; i < out.length; i++) assert.ok(out[i - 1].score >= out[i].score); // non-increasing
});
test('suggestLinks weights a shared low-degree neighbour more than a shared hub (Adamic-Adar)', () => {
  // p,q share only leaf L (degree 2); p,r share only hub H (degree 3). The rarer neighbour L ranks p-q above p-r.
  const g = mk(['p', 'q', 'r', 's', 'L', 'H'], [['p', 'L'], ['q', 'L'], ['p', 'H'], ['r', 'H'], ['s', 'H']]);
  const byPair = new Map(suggestLinks(g, { count: 99 }).map(s => [`${s.source}-${s.target}`, s.score]));
  assert.ok((byPair.get('p-q') ?? 0) > (byPair.get('p-r') ?? 0)); // 1/ln2 > 1/ln3
});
test('suggestLinks skips already-connected pairs (either direction) and honours count/minScore', () => {
  const g = mk(['a', 'b', 'h'], [['a', 'h'], ['b', 'h'], ['a', 'b']]); // a-b already exists
  assert.deepEqual(suggestLinks(g), []); // the only shared-neighbour pair is already joined
  const open = mk(['a', 'b', 'h'], [['a', 'h'], ['b', 'h']]);
  assert.equal(suggestLinks(open, { count: 0 }).length, 0);
  assert.equal(suggestLinks(open, { minScore: 999 }).length, 0);
  assert.equal(suggestLinks(open).length, 1); // a-b via h
});
test('suggestLinks is pure and empty-safe', () => {
  const g = mk(['a', 'b', 'h'], [['a', 'h'], ['b', 'h']]), snapshot = JSON.stringify(g);
  suggestLinks(g);
  assert.equal(JSON.stringify(g), snapshot);
  assert.deepEqual(suggestLinks(mk([], [])), []);
});

import { harmonicCentrality, topHarmonic } from '../packages/diagram/src/algorithms.ts';
test('harmonicCentrality sums reciprocal distances and stays finite across a disconnected graph', () => {
  // a -> b -> c  plus an isolated island  x -> y. a reaches b(1) and c(2): (1 + 1/2)/(n-1).
  const g = mk(['a', 'b', 'c', 'x', 'y'], [['a', 'b'], ['b', 'c'], ['x', 'y']]);
  const byId = Object.fromEntries(harmonicCentrality(g).map(s => [s.id, s.score]));
  assert.equal(byId.a, +((1 + 0.5) / 4).toFixed(4)); // reaches b,c despite x/y being unreachable
  assert.equal(byId.b, +(1 / 4).toFixed(4));          // reaches only c
  assert.equal(byId.c, 0);                            // sink reaches nobody
  assert.equal(byId.x, +(1 / 4).toFixed(4));          // its own island still scores
});
test('topHarmonic ranks the best reachers; a single node and empty graph are safe', () => {
  const g = mk(['a', 'b', 'c'], [['a', 'b'], ['b', 'c']]); // a reaches 2, b reaches 1, c reaches 0
  assert.deepEqual(topHarmonic(g, 2), ['a', 'b']);
  assert.deepEqual(topHarmonic(mk(['solo'], [])), []); // nobody to reach -> no scores
  assert.deepEqual(harmonicCentrality(mk([], [])), []);
});
test('harmonicCentrality is pure', () => {
  const g = mk(['a', 'b'], [['a', 'b']]), snap = JSON.stringify(g);
  harmonicCentrality(g); topHarmonic(g);
  assert.equal(JSON.stringify(g), snap);
});

import { criticalPathMethod } from '../packages/diagram/src/algorithms.ts';
test('criticalPathMethod computes slack and the critical path with unit durations', () => {
  // a -> b -> d ; a -> c -> d.  Two parallel chains of equal length, so all are critical (slack 0).
  const g = mk(['a', 'b', 'c', 'd'], [['a', 'b'], ['b', 'd'], ['a', 'c'], ['c', 'd']]);
  const r = criticalPathMethod(g)!;
  assert.equal(r.projectDuration, 3);                 // a(1)+b(1)+d(1)
  const by = Object.fromEntries(r.nodes.map(n => [n.id, n]));
  assert.equal(by.a.earliestStart, 0); assert.equal(by.a.earliestFinish, 1);
  assert.equal(by.d.earliestStart, 2); assert.equal(by.d.earliestFinish, 3);
  for (const id of ['a', 'b', 'c', 'd']) assert.equal(by[id].slack, 0); // balanced diamond: all critical
});
test('criticalPathMethod gives slack to a shorter parallel branch', () => {
  // a -> b -> c -> d (len 4) and a -> e -> d (len 3). e is off the critical path, so it has slack.
  const g = mk(['a', 'b', 'c', 'd', 'e'], [['a', 'b'], ['b', 'c'], ['c', 'd'], ['a', 'e'], ['e', 'd']]);
  const r = criticalPathMethod(g)!;
  assert.equal(r.projectDuration, 4);
  const by = Object.fromEntries(r.nodes.map(n => [n.id, n]));
  assert.ok(by.e.slack > 0);                          // e can slip without delaying the project
  assert.deepEqual(r.critical.sort(), ['a', 'b', 'c', 'd']); // the long chain is critical
});
test('criticalPathMethod honours a custom duration function', () => {
  const g = mk(['a', 'b', 'c'], [['a', 'b'], ['b', 'c']]);
  const r = criticalPathMethod(g, { duration: id => (id === 'b' ? 5 : 1) })!;
  assert.equal(r.projectDuration, 7); // 1 + 5 + 1
  assert.equal(r.nodes.find(n => n.id === 'c')!.earliestStart, 6);
});
test('criticalPathMethod returns null on a cyclic graph and is pure', () => {
  const cyc = mk(['a', 'b'], [['a', 'b'], ['b', 'a']]);
  assert.equal(criticalPathMethod(cyc), null);
  const g = mk(['a', 'b'], [['a', 'b']]), snap = JSON.stringify(g);
  criticalPathMethod(g);
  assert.equal(JSON.stringify(g), snap);
});

import { reciprocity, transitivity } from '../packages/diagram/src/algorithms.ts';
test('reciprocity is the fraction of mutual directed connections', () => {
  // a<->b mutual, b->c one-way.  pairs: a->b, b->a, b->c. mutual: a->b & b->a => 2 of 3.
  const g = mk(['a', 'b', 'c'], [['a', 'b'], ['b', 'a'], ['b', 'c']]);
  assert.equal(reciprocity(g), +(2 / 3).toFixed(4));
  assert.equal(reciprocity(mk(['a', 'b'], [['a', 'b'], ['b', 'a']])), 1); // fully mutual
  assert.equal(reciprocity(mk(['a', 'b'], [['a', 'b']])), 0);              // one-way
  assert.equal(reciprocity(mk(['a'], [])), 0);                            // edgeless
});
test('reciprocity ignores self-loops and parallel edges', () => {
  const g = mk(['a', 'b'], [['a', 'a'], ['a', 'b'], ['a', 'b'], ['b', 'a']]); // self-loop + parallel a->b
  assert.equal(reciprocity(g), 1); // distinct pairs a->b and b->a, both mutual
});
test('transitivity is the global clustering coefficient (triangle vs path)', () => {
  assert.equal(transitivity(mk(['a', 'b', 'c'], [['a', 'b'], ['b', 'c'], ['c', 'a']])), 1); // triangle: all triples closed
  assert.equal(transitivity(mk(['a', 'b', 'c'], [['a', 'b'], ['b', 'c']])), 0);             // path: one open triple
  // square a-b-c-d-a has 4 open triples, none closed
  assert.equal(transitivity(mk(['a', 'b', 'c', 'd'], [['a', 'b'], ['b', 'c'], ['c', 'd'], ['d', 'a']])), 0);
  assert.equal(transitivity(mk(['a', 'b'], [['a', 'b']])), 0); // no triples at all
});
test('reciprocity and transitivity are pure', () => {
  const g = mk(['a', 'b', 'c'], [['a', 'b'], ['b', 'a'], ['b', 'c']]), snap = JSON.stringify(g);
  reciprocity(g); transitivity(g);
  assert.equal(JSON.stringify(g), snap);
});

import { minCut } from '../packages/diagram/src/algorithms.ts';
test('minCut counts edge-disjoint paths and returns the cut (Menger)', () => {
  // two disjoint routes a->b->d and a->c->d: 2 edge-disjoint paths, cut is a's two out-edges.
  const g = mk(['a', 'b', 'c', 'd'], [['a', 'b'], ['b', 'd'], ['a', 'c'], ['c', 'd']]);
  const r = minCut(g, 'a', 'd');
  assert.equal(r.value, 2);
  assert.equal(r.cutEdges.length, 2);        // |cut| === value
  const cut = new Set(r.cutEdges);
  const id = (s: string, t: string) => g.edges.find(e => e.source === s && e.target === t)!.id;
  assert.ok(cut.has(id('a', 'b')) && cut.has(id('a', 'c')));
});
test('minCut of a single chain is 1; parallel edges add capacity', () => {
  assert.equal(minCut(mk(['a', 'b', 'c'], [['a', 'b'], ['b', 'c']]), 'a', 'c').value, 1);
  // two parallel a->b edges then b->c: the b->c link is the bottleneck => 1
  assert.equal(minCut(mk(['a', 'b', 'c'], [['a', 'b'], ['a', 'b'], ['b', 'c']]), 'a', 'c').value, 1);
  // two parallel a->b with two parallel b->c => 2
  assert.equal(minCut(mk(['a', 'b', 'c'], [['a', 'b'], ['a', 'b'], ['b', 'c'], ['b', 'c']]), 'a', 'c').value, 2);
});
test('minCut is 0 when unreachable, and for self / missing endpoints; pure', () => {
  const g = mk(['a', 'b', 'x'], [['a', 'b']]);
  assert.deepEqual(minCut(g, 'a', 'x'), { value: 0, cutEdges: [] }); // x unreachable
  assert.deepEqual(minCut(g, 'a', 'a'), { value: 0, cutEdges: [] }); // self
  assert.deepEqual(minCut(g, 'a', 'ghost'), { value: 0, cutEdges: [] }); // missing
  const snap = JSON.stringify(g); minCut(g, 'a', 'b'); assert.equal(JSON.stringify(g), snap);
});

import { modularity, communities as louvain } from '../packages/diagram/src/algorithms.ts';
test('modularity scores a good split high, one community at 0, a bad split negative', () => {
  // two triangles joined by a single bridge c-d
  const g = mk(['a', 'b', 'c', 'd', 'e', 'f'], [['a', 'b'], ['b', 'c'], ['c', 'a'], ['d', 'e'], ['e', 'f'], ['f', 'd'], ['c', 'd']]);
  assert.equal(modularity(g, [['a', 'b', 'c'], ['d', 'e', 'f']]), +((2 * (3 / 7 - 0.25))).toFixed(4)); // ~0.3571
  assert.equal(modularity(g, [['a', 'b', 'c', 'd', 'e', 'f']]), 0); // single community always 0
  assert.ok(modularity(g, [['a', 'd'], ['b', 'e'], ['c', 'f']]) < 0); // scattered split is worse than random
});
test('modularity of the Louvain partition is non-negative and equals the detected grouping', () => {
  const g = mk(['a', 'b', 'c', 'd', 'e', 'f'], [['a', 'b'], ['b', 'c'], ['c', 'a'], ['d', 'e'], ['e', 'f'], ['f', 'd'], ['c', 'd']]);
  assert.ok(modularity(g, louvain(g)) >= 0.3);
  assert.equal(modularity(mk(['x', 'y'], []), [['x'], ['y']]), 0); // edgeless -> 0
});

import { eulerianTrail } from '../packages/diagram/src/algorithms.ts';
test('eulerianTrail finds a circuit when in/out degrees balance', () => {
  const g = mk(['a', 'b', 'c'], [['a', 'b'], ['b', 'c'], ['c', 'a']]); // directed triangle
  const r = eulerianTrail(g)!;
  assert.equal(r.circuit, true);
  assert.equal(r.trail.length, 4); // 3 edges + 1
  assert.equal(r.trail[0], r.trail[3]); // starts where it ends
});
test('eulerianTrail finds an open path with one extra-out start and extra-in end', () => {
  const g = mk(['a', 'b', 'c'], [['a', 'b'], ['b', 'c']]);
  const r = eulerianTrail(g)!;
  assert.equal(r.circuit, false);
  assert.deepEqual(r.trail, ['a', 'b', 'c']);
});
test('eulerianTrail covers every edge once, including parallels and self-loops', () => {
  const g = mk(['a', 'b'], [['a', 'b'], ['b', 'a'], ['a', 'a']]); // a-loop + mutual; all balanced
  const r = eulerianTrail(g)!;
  assert.equal(r.trail.length, 4); // 3 edges + 1
  assert.equal(r.circuit, true);
});
test('eulerianTrail returns null when no trail exists (unbalanced, disconnected, empty)', () => {
  assert.equal(eulerianTrail(mk(['a', 'b', 'c'], [['a', 'b'], ['a', 'c']])), null); // a has out-in = 2
  assert.equal(eulerianTrail(mk(['a', 'b', 'c', 'd'], [['a', 'b'], ['c', 'd']])), null); // two components
  assert.equal(eulerianTrail(mk(['a'], [])), null); // no edges
});

import { fragmentation, topFragmenters } from '../packages/diagram/src/algorithms.ts';
test('fragmentation ranks single points of failure by how many pieces removal creates', () => {
  // star: hub s -> a,b,c. Removing s splits into 3 isolated nodes. b on a path splits into 2.
  const star = mk(['s', 'a', 'b', 'c'], [['s', 'a'], ['s', 'b'], ['s', 'c']]);
  const f = fragmentation(star);
  assert.deepEqual(f, [{ id: 's', components: 3 }]); // only s is an articulation point
  assert.deepEqual(topFragmenters(star, 1), ['s']);
});
test('fragmentation on a path: the middle node splits it into 2, ends are not cut points', () => {
  const path = mk(['a', 'b', 'c'], [['a', 'b'], ['b', 'c']]);
  const f = fragmentation(path);
  assert.deepEqual(f, [{ id: 'b', components: 2 }]); // removing b -> {a},{c}
});
test('fragmentation ranks a bigger fragmenter above a smaller one', () => {
  // hub h -> w,x,y,z (4 leaves) and a separate bridge p-q-r (q splits into 2).
  const g = mk(['h', 'w', 'x', 'y', 'z', 'p', 'q', 'r'], [['h', 'w'], ['h', 'x'], ['h', 'y'], ['h', 'z'], ['p', 'q'], ['q', 'r']]);
  const f = fragmentation(g);
  assert.equal(f[0].id, 'h');          // h fragments the most
  assert.ok(f[0].components > f[1].components); // and strictly more than q
  assert.equal(f.find(s => s.id === 'q')!.components, f.find(s => s.id === 'q')!.components); // q present
});
test('fragmentation is empty for a graph with no articulation points (a cycle), and is pure', () => {
  const cyc = mk(['a', 'b', 'c'], [['a', 'b'], ['b', 'c'], ['c', 'a']]);
  assert.deepEqual(fragmentation(cyc), []);
  const snap = JSON.stringify(cyc); fragmentation(cyc); assert.equal(JSON.stringify(cyc), snap);
});

import { assortativity } from '../packages/diagram/src/algorithms.ts';
test('assortativity: a star is perfectly disassortative (-1), a uniform cycle is 0', () => {
  assert.equal(assortativity(mk(['s', 'a', 'b', 'c'], [['s', 'a'], ['s', 'b'], ['s', 'c']])), -1); // hub(deg3)-leaf(deg1)
  assert.equal(assortativity(mk(['a', 'b', 'c'], [['a', 'b'], ['b', 'c'], ['c', 'a']])), 0); // every node degree 2 -> undefined -> 0
  assert.equal(assortativity(mk(['a', 'b'], [])), 0); // edgeless
});
test('assortativity of a 4-node path is -0.5', () => {
  // degrees a1 b2 c2 d1; endpoint-degree correlation works out to -0.5
  assert.equal(assortativity(mk(['a', 'b', 'c', 'd'], [['a', 'b'], ['b', 'c'], ['c', 'd']])), -0.5);
});
test('assortativity is 1 when every edge joins equal-degree nodes, and is pure', () => {
  // a lone deg1-deg1 edge plus a triangle (all deg2): every edge connects like degrees -> perfectly assortative
  const g = mk(['x', 'y', 'a', 'b', 'c'], [['x', 'y'], ['a', 'b'], ['b', 'c'], ['c', 'a']]);
  assert.equal(assortativity(g), 1);
  const snap = JSON.stringify(g); assortativity(g); assert.equal(JSON.stringify(g), snap);
});

import { matchNodes } from '../packages/diagram/src/algorithms.ts';
test('matchNodes filters by type, group, tag and title substring (AND)', () => {
  const g: SemanticGraph = {
    nodes: [
      { id: 'a', type: 'service', title: 'Auth Service', group: 'Backend', tags: ['secure'] },
      { id: 'b', type: 'database', title: 'User DB', group: 'Backend' },
      { id: 'c', type: 'service', title: 'Mail Service', group: 'Infra', tags: ['secure'] },
      { id: 'd', type: 'screen', title: 'Login' },
    ],
    edges: [],
  };
  assert.deepEqual(matchNodes(g, { type: 'service' }), ['a', 'c']);
  assert.deepEqual(matchNodes(g, { type: ['service', 'database'] }), ['a', 'b', 'c']);
  assert.deepEqual(matchNodes(g, { group: 'Backend' }), ['a', 'b']);
  assert.deepEqual(matchNodes(g, { tag: 'secure' }), ['a', 'c']);
  assert.deepEqual(matchNodes(g, { titleIncludes: 'service' }), ['a', 'c']); // case-insensitive
  assert.deepEqual(matchNodes(g, { type: 'service', group: 'Backend' }), ['a']); // AND
  assert.deepEqual(matchNodes(g, {}), ['a', 'b', 'c', 'd']); // empty -> all
  assert.deepEqual(matchNodes(g, { group: 'Nope' }), []);    // no match
});

import { graphFingerprint } from '../packages/diagram/src/algorithms.ts';
test('graphFingerprint is stable, order-independent, and changes on structural edits', () => {
  const g1 = mk(['a', 'b', 'c'], [['a', 'b'], ['b', 'c']]);
  const g2 = mk(['c', 'b', 'a'], [['b', 'c'], ['a', 'b']]); // same structure, different declaration order
  assert.equal(graphFingerprint(g1), graphFingerprint(g1)); // deterministic
  assert.equal(graphFingerprint(g1), graphFingerprint(g2)); // order-independent
  assert.match(graphFingerprint(g1), /^[0-9a-f]{16}$/);     // 16 hex chars
  const g3 = mk(['a', 'b', 'c'], [['a', 'b'], ['b', 'c'], ['c', 'a']]); // extra edge
  assert.notEqual(graphFingerprint(g1), graphFingerprint(g3));
});
test('graphFingerprint reflects node title/type changes but not layout', () => {
  const base = mk(['a', 'b'], [['a', 'b']]);
  const retitled = { nodes: [{ id: 'a', title: 'CHANGED', type: 'process' as const }, { id: 'b', title: 'b', type: 'process' as const }], edges: base.edges };
  assert.notEqual(graphFingerprint(base), graphFingerprint(retitled)); // title matters
  const retyped = { nodes: [{ id: 'a', title: 'a', type: 'service' as const }, { id: 'b', title: 'b', type: 'process' as const }], edges: base.edges };
  assert.notEqual(graphFingerprint(base), graphFingerprint(retyped)); // type matters
  assert.equal(graphFingerprint(mk([], [])), graphFingerprint(mk([], []))); // empty stable
});

import { cycles } from '../packages/diagram/src/algorithms.ts';
test('cycles enumerates every simple cycle once (no rotations)', () => {
  const tri = mk(['a', 'b', 'c'], [['a', 'b'], ['b', 'c'], ['c', 'a']]);
  const r = cycles(tri);
  assert.equal(r.length, 1);
  assert.deepEqual(r[0], ['a', 'b', 'c']); // anchored at the lowest-index node
});
test('cycles finds multiple distinct loops and a self-loop; a DAG has none', () => {
  // a<->b (2-cycle) and c self-loop
  const g = mk(['a', 'b', 'c'], [['a', 'b'], ['b', 'a'], ['c', 'c']]);
  const r = cycles(g).map(c => c.join('-')).sort();
  assert.deepEqual(r, ['a-b', 'c']); // a->b->a anchored at a; c self-loop
  assert.deepEqual(cycles(mk(['a', 'b', 'c'], [['a', 'b'], ['b', 'c']])), []); // DAG
});
test('cycles respects the limit and is pure', () => {
  const g = mk(['a', 'b', 'c'], [['a', 'b'], ['b', 'c'], ['c', 'a'], ['a', 'c'], ['c', 'b'], ['b', 'a']]); // many loops
  assert.ok(cycles(g, { limit: 2 }).length <= 2);
  const snap = JSON.stringify(g); cycles(g); assert.equal(JSON.stringify(g), snap);
});

import { eigenvectorCentrality, influentialByEigenvector } from '../packages/diagram/src/algorithms.ts';
test('eigenvectorCentrality ranks the hub of a star highest (normalized to 1)', () => {
  const star = mk(['s', 'a', 'b', 'c'], [['s', 'a'], ['s', 'b'], ['s', 'c']]);
  const by = Object.fromEntries(eigenvectorCentrality(star).map(d => [d.id, d.score]));
  assert.equal(by.s, 1); // hub is the most central -> top, normalized to 1
  assert.ok(by.a < 1 && by.a === by.b && by.b === by.c); // leaves equal and lower
  assert.deepEqual(influentialByEigenvector(star, 1), ['s']);
});
test('eigenvectorCentrality is symmetric on a symmetric graph and 0 when edgeless', () => {
  const tri = mk(['a', 'b', 'c'], [['a', 'b'], ['b', 'c'], ['c', 'a']]);
  const scores = eigenvectorCentrality(tri).map(d => d.score);
  assert.ok(scores.every(s => s === scores[0])); // all equal by symmetry
  assert.deepEqual(eigenvectorCentrality(mk(['a', 'b'], [])).map(d => d.score), [0, 0]); // no edges
});
test('eigenvectorCentrality is deterministic and pure', () => {
  const g = mk(['a', 'b', 'c'], [['a', 'b'], ['b', 'c']]), snap = JSON.stringify(g);
  assert.deepEqual(eigenvectorCentrality(g), eigenvectorCentrality(g));
  assert.equal(JSON.stringify(g), snap);
});

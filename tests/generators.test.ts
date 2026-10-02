import { test } from 'node:test';
import assert from 'node:assert/strict';
import { gridGraph, treeGraph, cycleGraph, completeGraph, pathGraph, starGraph, wheelGraph } from '../packages/diagram/src/generators.ts';
import { findCycle } from '../packages/diagram/src/algorithms.ts';

test('gridGraph builds a cols×rows grid with right+down edges and a valid layout', () => {
  const d = gridGraph(3, 2);
  assert.equal(d.graph.nodes.length, 6);
  assert.equal(d.graph.edges.length, 7); // right: 2*2=4, down: 3*1=3
  for (const n of d.graph.nodes) assert.ok(d.layout.nodes[n.id]); // every node positioned
  assert.equal(findCycle(d.graph), null); // acyclic
});

test('treeGraph builds a balanced tree (levels, branching)', () => {
  const d = treeGraph(3, 2); // 1 + 2 + 4 = 7 nodes, 6 edges
  assert.equal(d.graph.nodes.length, 7);
  assert.equal(d.graph.edges.length, 6);
  assert.equal(treeGraph(1, 2).graph.nodes.length, 1); // depth 1 = just the root
  assert.equal(treeGraph(4, 1).graph.nodes.length, 4); // branching 1 = a chain
});

test('cycleGraph builds a ring with a cycle', () => {
  const d = cycleGraph(5);
  assert.equal(d.graph.nodes.length, 5);
  assert.equal(d.graph.edges.length, 5);
  assert.ok(findCycle(d.graph)); // it has a cycle
});

test('generators clamp to sane minimums and cap the node count', () => {
  assert.equal(gridGraph(0, 0).graph.nodes.length, 1);  // clamped to 1x1
  assert.equal(cycleGraph(1).graph.nodes.length, 2);     // clamped to 2
  assert.throws(() => gridGraph(100, 100), /máximo/);    // over the cap
});

test('completeGraph joins every pair once (n(n-1)/2 edges) and positions all nodes', () => {
  const d = completeGraph(5);
  assert.equal(d.graph.nodes.length, 5);
  assert.equal(d.graph.edges.length, (5 * 4) / 2); // 10
  for (const n of d.graph.nodes) assert.ok(d.layout.nodes[n.id]);
  assert.equal(findCycle(d.graph), null); // directed i<j is acyclic
});

test('pathGraph is a simple chain of n-1 edges', () => {
  const d = pathGraph(4);
  assert.equal(d.graph.nodes.length, 4);
  assert.equal(d.graph.edges.length, 3);
  assert.equal(findCycle(d.graph), null);
  assert.equal(pathGraph(1).graph.edges.length, 0); // single node, no edge
});

test('starGraph has a hub linked to every leaf (leaves+1 nodes, leaves edges)', () => {
  const d = starGraph(6);
  assert.equal(d.graph.nodes.length, 7);
  assert.equal(d.graph.edges.length, 6);
  assert.ok(d.graph.edges.every(e => e.source === 'hub'));
  for (const n of d.graph.nodes) assert.ok(d.layout.nodes[n.id]);
});

test('wheelGraph is a rim cycle plus a hub spoke to each rim node', () => {
  const d = wheelGraph(6);
  assert.equal(d.graph.nodes.length, 7);          // 6 rim + hub
  assert.equal(d.graph.edges.length, 12);         // 6 spokes + 6 rim
  assert.ok(findCycle(d.graph));                  // the rim is a cycle
  assert.equal(wheelGraph(2).graph.nodes.length, 4); // rim clamped to >=3 -> 3 rim + hub
});

test('new generators clamp to minimums and respect the node cap', () => {
  assert.equal(completeGraph(0).graph.nodes.length, 1);
  assert.equal(pathGraph(0).graph.nodes.length, 1);
  assert.equal(starGraph(0).graph.nodes.length, 2); // hub + 1 leaf
  assert.throws(() => completeGraph(99999), /máximo/);
});

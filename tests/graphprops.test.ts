import { test } from 'node:test';
import assert from 'node:assert/strict';
import { graphProperties } from '../packages/diagram/src/algorithms.ts';
import { createDocument } from '../packages/diagram/src/document.ts';
import type { SemanticGraph } from '../packages/diagram/src/types.ts';

const g = (ids: string[], es: [string, string][]): SemanticGraph =>
  createDocument({ nodes: ids.map(id => ({ id, type: 'process' as const, title: id })), edges: es.map(([s, t], i) => ({ id: `e${i}`, source: s, target: t })) }).graph;

test('graphProperties classifies a directed tree', () => {
  const p = graphProperties(g(['r', 'a', 'b'], [['r', 'a'], ['r', 'b']]));
  assert.equal(p.isDag, true);
  assert.equal(p.isForest, true);
  assert.equal(p.isTree, true);
  assert.equal(p.isConnected, true);
  assert.equal(p.isBipartite, true);
});

test('graphProperties detects a cycle (not DAG, not forest) and an odd cycle (not bipartite)', () => {
  const p = graphProperties(g(['a', 'b', 'c'], [['a', 'b'], ['b', 'c'], ['c', 'a']]));
  assert.equal(p.isDag, false);
  assert.equal(p.isForest, false);
  assert.equal(p.isTree, false);
  assert.equal(p.isBipartite, false); // triangle = odd cycle
});

test('graphProperties: an even cycle is bipartite; a forest of two trees is a forest but not a tree', () => {
  assert.equal(graphProperties(g(['a', 'b', 'c', 'd'], [['a', 'b'], ['b', 'c'], ['c', 'd'], ['d', 'a']])).isBipartite, true); // 4-cycle
  const forest = graphProperties(g(['a', 'b', 'c', 'd'], [['a', 'b'], ['c', 'd']]));
  assert.equal(forest.isForest, true);
  assert.equal(forest.isTree, false);      // two components
  assert.equal(forest.isConnected, false);
});

test('graphProperties computes directed density and handles the empty graph', () => {
  const p = graphProperties(g(['a', 'b', 'c'], [['a', 'b'], ['a', 'c']]));
  assert.equal(p.density, +(2 / 6).toFixed(3)); // 2 edges of 3*2 possible
  const e = graphProperties(g([], []));
  assert.deepEqual([e.nodes, e.edges, e.density, e.isConnected, e.isDag, e.isTree], [0, 0, 0, false, false, false]);
});

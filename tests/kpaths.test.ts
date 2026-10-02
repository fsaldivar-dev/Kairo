import { test } from 'node:test';
import assert from 'node:assert/strict';
import { kShortestPaths } from '../packages/diagram/src/algorithms.ts';
import { createDocument } from '../packages/diagram/src/document.ts';

// s -> a -> t (len 2), s -> b -> t (len 2), s -> c -> d -> t (len 3)
const net = createDocument({
  nodes: ['s', 'a', 'b', 'c', 'd', 't'].map(id => ({ id, type: 'process' as const, title: id.toUpperCase() })),
  edges: [
    { id: 'e0', source: 's', target: 'a' }, { id: 'e1', source: 'a', target: 't' },
    { id: 'e2', source: 's', target: 'b' }, { id: 'e3', source: 'b', target: 't' },
    { id: 'e4', source: 's', target: 'c' }, { id: 'e5', source: 'c', target: 'd' }, { id: 'e6', source: 'd', target: 't' },
  ],
});

test('kShortestPaths returns the k best routes, shortest first, ties lexicographic', () => {
  const paths = kShortestPaths(net.graph, 's', 't', 3);
  assert.equal(paths.length, 3);
  assert.deepEqual(paths[0], ['s', 'a', 't']); // length 2, lexicographically before s-b-t
  assert.deepEqual(paths[1], ['s', 'b', 't']); // length 2
  assert.deepEqual(paths[2], ['s', 'c', 'd', 't']); // length 3
});

test('kShortestPaths caps at the number of distinct simple paths available', () => {
  const paths = kShortestPaths(net.graph, 's', 't', 10);
  assert.equal(paths.length, 3); // only three simple routes exist
  // all are simple (no repeated node) and start/end correctly
  for (const p of paths) { assert.equal(p[0], 's'); assert.equal(p[p.length - 1], 't'); assert.equal(new Set(p).size, p.length); }
});

test('kShortestPaths respects direction and returns [] for unreachable or unknown nodes', () => {
  assert.deepEqual(kShortestPaths(net.graph, 't', 's', 3), []); // no reverse edges
  assert.deepEqual(kShortestPaths(net.graph, 's', 'zzz', 3), []); // unknown target
  assert.deepEqual(kShortestPaths(net.graph, 's', 't', 0), []); // k <= 0
});

test('kShortestPaths returns the single path when only one route exists', () => {
  const chain = createDocument({
    nodes: ['x', 'y', 'z'].map(id => ({ id, type: 'process' as const, title: id })),
    edges: [{ id: 'e0', source: 'x', target: 'y' }, { id: 'e1', source: 'y', target: 'z' }],
  });
  assert.deepEqual(kShortestPaths(chain.graph, 'x', 'z', 3), [['x', 'y', 'z']]);
});

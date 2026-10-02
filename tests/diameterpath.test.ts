import { test } from 'node:test';
import assert from 'node:assert/strict';
import { diameterPath } from '../packages/diagram/src/algorithms.ts';
import { createDocument } from '../packages/diagram/src/document.ts';
import type { SemanticGraph } from '../packages/diagram/src/types.ts';

const g = (ids: string[], es: [string, string][]): SemanticGraph =>
  createDocument({ nodes: ids.map(id => ({ id, type: 'process' as const, title: id })), edges: es.map(([s, t], i) => ({ id: `e${i}`, source: s, target: t })) }).graph;

test('diameterPath returns the longest shortest-path route (directed chain)', () => {
  assert.deepEqual(diameterPath(g(['a', 'b', 'c', 'd'], [['a', 'b'], ['b', 'c'], ['c', 'd']])), ['a', 'b', 'c', 'd']);
});

test('diameterPath takes the longer of two branches from a root', () => {
  // s->a->b (len 2) and s->c (len 1): diameter route is s,a,b
  assert.deepEqual(diameterPath(g(['s', 'a', 'b', 'c'], [['s', 'a'], ['a', 'b'], ['s', 'c']])), ['s', 'a', 'b']);
});

test('diameterPath undirected spans across the root between two leaves', () => {
  // a-b-c undirected: longest shortest path is a..c (length 2)
  const p = diameterPath(g(['a', 'b', 'c'], [['a', 'b'], ['b', 'c']]), { directed: false });
  assert.equal(p.length, 3);
  assert.equal(p[1], 'b'); // passes through the middle
});

test('diameterPath is empty with no edges', () => {
  assert.deepEqual(diameterPath(g(['x', 'y'], [])), []);
});

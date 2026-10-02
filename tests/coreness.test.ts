import { test } from 'node:test';
import assert from 'node:assert/strict';
import { coreness } from '../packages/diagram/src/algorithms.ts';
import { createDocument } from '../packages/diagram/src/document.ts';
import type { SemanticGraph } from '../packages/diagram/src/types.ts';

const g = (ids: string[], es: [string, string][]): SemanticGraph =>
  createDocument({ nodes: ids.map(id => ({ id, type: 'process' as const, title: id })), edges: es.map(([s, t], i) => ({ id: `e${i}`, source: s, target: t })) }).graph;

test('coreness: a triangle has core number 2 for every node', () => {
  const c = coreness(g(['a', 'b', 'c'], [['a', 'b'], ['b', 'c'], ['c', 'a']]));
  assert.deepEqual([c.get('a'), c.get('b'), c.get('c')], [2, 2, 2]);
});

test('coreness: a path has core number 1 for every node', () => {
  const c = coreness(g(['a', 'b', 'c'], [['a', 'b'], ['b', 'c']]));
  assert.deepEqual([c.get('a'), c.get('b'), c.get('c')], [1, 1, 1]);
});

test('coreness: a pendant attached to a triangle is core 1 while the triangle stays core 2', () => {
  const c = coreness(g(['a', 'b', 'c', 'd'], [['a', 'b'], ['b', 'c'], ['c', 'a'], ['a', 'd']]));
  assert.equal(c.get('d'), 1);
  assert.deepEqual([c.get('a'), c.get('b'), c.get('c')], [2, 2, 2]);
});

test('coreness: an isolated node has core number 0', () => {
  const c = coreness(g(['a', 'b', 'x'], [['a', 'b']]));
  assert.equal(c.get('x'), 0);
  assert.equal(c.get('a'), 1);
});

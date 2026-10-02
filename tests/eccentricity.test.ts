import { test } from 'node:test';
import assert from 'node:assert/strict';
import { eccentricity, graphCenter } from '../packages/diagram/src/algorithms.ts';
import { createDocument } from '../packages/diagram/src/document.ts';
import type { SemanticGraph } from '../packages/diagram/src/types.ts';

const g = (ids: string[], es: [string, string][]): SemanticGraph =>
  createDocument({ nodes: ids.map(id => ({ id, type: 'process' as const, title: id })), edges: es.map(([s, t], i) => ({ id: `e${i}`, source: s, target: t })) }).graph;

test('eccentricity (undirected) on a path: ends 2, middle 1', () => {
  const e = eccentricity(g(['a', 'b', 'c'], [['a', 'b'], ['b', 'c']]));
  assert.deepEqual([e.get('a'), e.get('b'), e.get('c')], [2, 1, 2]);
});

test('graphCenter picks the min-eccentricity node(s) and periphery the max', () => {
  const c = graphCenter(g(['a', 'b', 'c'], [['a', 'b'], ['b', 'c']]));
  assert.equal(c.radius, 1);
  assert.equal(c.diameter, 2);
  assert.deepEqual(c.center, ['b']);
  assert.deepEqual(c.periphery.sort(), ['a', 'c']);
});

test('graphCenter on a star: the hub is the center (radius 1), leaves the periphery', () => {
  const c = graphCenter(g(['h', 'a', 'b', 'd'], [['h', 'a'], ['h', 'b'], ['h', 'd']]));
  assert.deepEqual(c.center, ['h']);
  assert.equal(c.radius, 1);
  assert.deepEqual(c.periphery.sort(), ['a', 'b', 'd']);
});

test('eccentricity directed:true measures outgoing reach; empty graph is handled', () => {
  const e = eccentricity(g(['a', 'b', 'c'], [['a', 'b'], ['b', 'c']]), { directed: true });
  assert.equal(e.get('a'), 2); // a->b->c
  assert.equal(e.get('c'), 0); // sink reaches nothing
  assert.deepEqual(graphCenter(g([], [])), { radius: 0, diameter: 0, center: [], periphery: [] });
});

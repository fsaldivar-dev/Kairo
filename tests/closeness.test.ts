import { test } from 'node:test';
import assert from 'node:assert/strict';
import { closenessCentrality, closestNodes } from '../packages/diagram/src/algorithms.ts';
import { createDocument } from '../packages/diagram/src/document.ts';
import type { SemanticGraph } from '../packages/diagram/src/types.ts';

const g = (ids: string[], es: [string, string][]): SemanticGraph =>
  createDocument({ nodes: ids.map(id => ({ id, type: 'process' as const, title: id })), edges: es.map(([s, t], i) => ({ id: `e${i}`, source: s, target: t })) }).graph;

test('closenessCentrality on a directed path ranks the head highest and the sink at 0', () => {
  const c = closenessCentrality(g(['a', 'b', 'c'], [['a', 'b'], ['b', 'c']]));
  const score = (id: string) => c.find(x => x.id === id)!.score;
  // a reaches a,b,c (sum 3): (2*2)/((2)*3)=0.6667; b reaches b,c (sum1): 1/2=0.5; c reaches none: 0
  assert.equal(score('a'), 0.6667);
  assert.equal(score('b'), 0.5);
  assert.equal(score('c'), 0);
  assert.ok(score('a') > score('b') && score('b') > score('c'));
});

test('closenessCentrality: a star centre reaches all at distance 1 (score 1); leaves reach none (0)', () => {
  const c = closenessCentrality(g(['c', 'a', 'b', 'd'], [['c', 'a'], ['c', 'b'], ['c', 'd']]));
  assert.equal(c.find(x => x.id === 'c')!.score, 1);
  assert.equal(c.find(x => x.id === 'a')!.score, 0);
});

test('closestNodes returns the top-k by closeness (score > 0)', () => {
  const graph = g(['a', 'b', 'c'], [['a', 'b'], ['b', 'c']]);
  assert.deepEqual(closestNodes(graph, 2), ['a', 'b']);
  assert.deepEqual(closestNodes(graph, 1), ['a']);
});

test('closenessCentrality handles the empty graph and returns a score per node', () => {
  assert.deepEqual(closenessCentrality(g([], [])), []);
  assert.equal(closenessCentrality(g(['x'], [])).length, 1);
  assert.equal(closenessCentrality(g(['x'], []))[0].score, 0);
});

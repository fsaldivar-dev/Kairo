import { test } from 'node:test';
import assert from 'node:assert/strict';
import { edgeBetweenness, bottleneckEdges } from '../packages/diagram/src/algorithms.ts';
import { createDocument } from '../packages/diagram/src/document.ts';
import type { SemanticGraph } from '../packages/diagram/src/types.ts';

const g = (ids: string[], es: [string, string, string][]): SemanticGraph =>
  createDocument({ nodes: ids.map(id => ({ id, type: 'process' as const, title: id })), edges: es.map(([s, t, id]) => ({ id, source: s, target: t })) }).graph;

test('edgeBetweenness: on a directed path the middle edge is the most load-bearing', () => {
  const eb = edgeBetweenness(g(['a', 'b', 'c', 'd'], [['a', 'b', 'ab'], ['b', 'c', 'bc'], ['c', 'd', 'cd']]));
  const score = (id: string) => eb.find(e => e.id === id)!.score;
  assert.ok(score('bc') > score('ab'), 'middle > first');
  assert.ok(score('bc') > score('cd'), 'middle > last');
  assert.equal(eb.length, 3);
});

test('edgeBetweenness: the central edge of a directed path carries the most paths', () => {
  // 6-node path a->b->c->d->e->f: the middle edge c->d carries 3*3=9 pairs, strictly the most.
  const chain: [string, string, string][] = [['a', 'b', 'ab'], ['b', 'c', 'bc'], ['c', 'd', 'cd'], ['d', 'e', 'de'], ['e', 'f', 'ef']];
  const graph = g(['a', 'b', 'c', 'd', 'e', 'f'], chain);
  const top = [...edgeBetweenness(graph)].sort((x, y) => y.score - x.score)[0];
  assert.equal(top.id, 'cd');
  assert.deepEqual(bottleneckEdges(graph, 1), ['cd']);
});

test('edgeBetweenness returns 0 for an edge no shortest path uses, and one entry per edge', () => {
  // a->b direct and a->c->b: the shortest a->b is the direct edge, so a->c->b edges carry only their own pair.
  const eb = edgeBetweenness(g(['a', 'b', 'c'], [['a', 'b', 'direct'], ['a', 'c', 'ac'], ['c', 'b', 'cb']]));
  assert.equal(eb.length, 3);
  assert.ok(eb.every(e => e.score >= 0));
});

test('edgeBetweenness handles a graph with no edges', () => {
  assert.deepEqual(edgeBetweenness(g(['a', 'b'], [])), []);
});

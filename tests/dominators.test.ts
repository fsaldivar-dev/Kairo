import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dominators, dominatorChain } from '../packages/diagram/src/algorithms.ts';
import { createDocument } from '../packages/diagram/src/document.ts';
import type { SemanticGraph } from '../packages/diagram/src/types.ts';

const g = (ids: string[], es: [string, string][]): SemanticGraph =>
  createDocument({ nodes: ids.map(id => ({ id, type: 'process' as const, title: id })), edges: es.map(([s, t], i) => ({ id: `e${i}`, source: s, target: t })) }).graph;

test('dominators of a diamond: the merge node is dominated only by the start', () => {
  const idom = dominators(g(['s', 'a', 'b', 't'], [['s', 'a'], ['s', 'b'], ['a', 't'], ['b', 't']]));
  assert.equal(idom.get('s'), 's'); // root dominates itself
  assert.equal(idom.get('a'), 's');
  assert.equal(idom.get('b'), 's');
  assert.equal(idom.get('t'), 's'); // two disjoint paths -> only s is unavoidable
});

test('dominators of a chain with a branch: a step on the only path dominates downstream', () => {
  // s->a->t, s->a->x (x only reachable via a)
  const idom = dominators(g(['s', 'a', 't', 'x'], [['s', 'a'], ['a', 't'], ['a', 'x']]));
  assert.equal(idom.get('a'), 's');
  assert.equal(idom.get('t'), 'a'); // must pass through a
  assert.equal(idom.get('x'), 'a');
});

test('dominatorChain lists every unavoidable step from root to the node', () => {
  const graph = g(['s', 'a', 'b', 'c'], [['s', 'a'], ['a', 'b'], ['b', 'c']]);
  assert.deepEqual(dominatorChain(graph, 'c'), ['s', 'a', 'b', 'c']);
  assert.deepEqual(dominatorChain(graph, 's'), ['s']);
});

test('dominators omits unreachable nodes and dominatorChain returns [] for them', () => {
  const graph = g(['s', 'a', 'island'], [['s', 'a']]);
  const idom = dominators(graph, 's');
  assert.ok(!idom.has('island'));
  assert.deepEqual(dominatorChain(graph, 'island', 's'), []);
});

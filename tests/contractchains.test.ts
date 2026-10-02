import { test } from 'node:test';
import assert from 'node:assert/strict';
import { contractChains } from '../packages/diagram/src/layout.ts';
import { createDocument } from '../packages/diagram/src/document.ts';
import type { DiagramDocument } from '../packages/diagram/src/types.ts';

const g = (ids: string[], es: [string, string][]): DiagramDocument =>
  createDocument({ nodes: ids.map(id => ({ id, type: 'process' as const, title: id })), edges: es.map(([s, t], i) => ({ id: `e${i}`, source: s, target: t })) });

test('contractChains collapses a linear chain to its endpoints', () => {
  const m = contractChains(g(['s', 'a', 'b', 'c', 'e'], [['s', 'a'], ['a', 'b'], ['b', 'c'], ['c', 'e']])).graph;
  assert.deepEqual(m.nodes.map(n => n.id).sort(), ['e', 's']); // a,b,c (all in1/out1) removed
  assert.equal(m.edges.length, 1);
  assert.equal(m.edges[0].source, 's');
  assert.equal(m.edges[0].target, 'e');
});

test('contractChains keeps branch/merge nodes and contracts the pass-through arms', () => {
  // s -> a -> m, s -> b -> m : a and b are pass-through, s is a branch, m is a merge.
  const m = contractChains(g(['s', 'a', 'b', 'm'], [['s', 'a'], ['a', 'm'], ['s', 'b'], ['b', 'm']])).graph;
  assert.ok(m.nodes.some(n => n.id === 's') && m.nodes.some(n => n.id === 'm'));
  assert.ok(!m.nodes.some(n => n.id === 'a') && !m.nodes.some(n => n.id === 'b'));
  assert.ok(m.edges.some(e => e.source === 's' && e.target === 'm'));
});

test('contractChains leaves a graph with no pass-through nodes unchanged, and honours keep()', () => {
  const branchy = g(['s', 'a', 'b'], [['s', 'a'], ['s', 'b']]); // s has out-degree 2; a,b are sinks
  assert.equal(contractChains(branchy).graph.nodes.length, 3);
  // Protect 'b' in a chain s->b->e: b stays.
  const kept = contractChains(g(['s', 'b', 'e'], [['s', 'b'], ['b', 'e']]), { keep: id => id === 'b' }).graph;
  assert.ok(kept.nodes.some(n => n.id === 'b'));
});

test('contractChains is pure (input not mutated)', () => {
  const doc = g(['s', 'a', 'e'], [['s', 'a'], ['a', 'e']]), snap = JSON.stringify(doc);
  contractChains(doc);
  assert.equal(JSON.stringify(doc), snap);
});

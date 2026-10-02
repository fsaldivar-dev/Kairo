import { test } from 'node:test';
import assert from 'node:assert/strict';
import { endpoints } from '../packages/diagram/src/algorithms.ts';
import { createDocument } from '../packages/diagram/src/document.ts';
import type { SemanticGraph } from '../packages/diagram/src/types.ts';

const g = (ids: string[], es: [string, string][]): SemanticGraph =>
  createDocument({ nodes: ids.map(id => ({ id, type: 'process' as const, title: id })), edges: es.map(([s, t], i) => ({ id: `e${i}`, source: s, target: t })) }).graph;

test('endpoints identifies sources, sinks and isolated nodes', () => {
  const e = endpoints(g(['s', 'm', 't', 'x'], [['s', 'm'], ['m', 't']]));
  assert.deepEqual(e.sources, ['s']); // no incoming
  assert.deepEqual(e.sinks, ['t']);   // no outgoing
  assert.deepEqual(e.isolated, ['x']); // neither
});

test('endpoints: a node is never both a source/sink and isolated; self-loops are ignored', () => {
  const e = endpoints(g(['a', 'b'], [['a', 'a'], ['a', 'b']])); // a has a self-loop + a->b
  assert.deepEqual(e.sources, ['a']); // self-loop ignored -> a has no real incoming
  assert.deepEqual(e.sinks, ['b']);
  assert.deepEqual(e.isolated, []);
});

test('endpoints: a multi-root/multi-leaf DAG lists all of them in declaration order', () => {
  const e = endpoints(g(['r1', 'r2', 'm', 'l1', 'l2'], [['r1', 'm'], ['r2', 'm'], ['m', 'l1'], ['m', 'l2']]));
  assert.deepEqual(e.sources, ['r1', 'r2']);
  assert.deepEqual(e.sinks, ['l1', 'l2']);
});

test('endpoints handles the empty graph', () => {
  assert.deepEqual(endpoints(g([], [])), { sources: [], sinks: [], isolated: [] });
});

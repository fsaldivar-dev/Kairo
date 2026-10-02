import { test } from 'node:test';
import assert from 'node:assert/strict';
import { reachabilityMatrix } from '../packages/diagram/src/algorithms.ts';
import { toReachabilityCsv } from '../packages/diagram/src/report.ts';
import { createDocument } from '../packages/diagram/src/document.ts';
import type { SemanticGraph } from '../packages/diagram/src/types.ts';

const mk = (nodes: string[], edges: [string, string][]): SemanticGraph => ({
  nodes: nodes.map(id => ({ id, title: id, type: 'process' as const })),
  edges: edges.map(([s, t], i) => ({ id: `e${i}`, source: s, target: t })),
});

test('reachabilityMatrix marks transitive reach; a DAG has an empty diagonal', () => {
  const { ids, reaches } = reachabilityMatrix(mk(['a', 'b', 'c'], [['a', 'b'], ['b', 'c']]));
  const at = (f: string, t: string) => reaches[ids.indexOf(f)][ids.indexOf(t)];
  assert.ok(at('a', 'b') && at('a', 'c')); // a reaches b and (transitively) c
  assert.ok(at('b', 'c') && !at('b', 'a'));
  assert.ok(!at('c', 'a') && !at('c', 'b'));
  assert.ok(!at('a', 'a') && !at('c', 'c')); // acyclic -> no self-reach
});

test('reachabilityMatrix sets the diagonal for nodes on a cycle', () => {
  const { ids, reaches } = reachabilityMatrix(mk(['a', 'b'], [['a', 'b'], ['b', 'a']]));
  const at = (f: string, t: string) => reaches[ids.indexOf(f)][ids.indexOf(t)];
  assert.ok(at('a', 'a') && at('b', 'b')); // both return to themselves via the cycle
  assert.ok(at('a', 'b') && at('b', 'a'));
});

test('toReachabilityCsv emits a from/to header and 1/0 rows', () => {
  const d = createDocument({ nodes: [{ id: 'a', type: 'process', title: 'A' }, { id: 'b', type: 'process', title: 'B' }, { id: 'c', type: 'process', title: 'C' }], edges: [{ id: 'e0', source: 'a', target: 'b' }, { id: 'e1', source: 'b', target: 'c' }] });
  const lines = toReachabilityCsv(d).trim().split('\n');
  assert.equal(lines[0], 'from\\to,a,b,c');
  assert.equal(lines[1], 'a,0,1,1'); // a reaches b,c (not itself)
  assert.equal(lines[2], 'b,0,0,1');
  assert.equal(lines[3], 'c,0,0,0');
});

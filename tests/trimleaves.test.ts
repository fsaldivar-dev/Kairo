import { test } from 'node:test';
import assert from 'node:assert/strict';
import { trimLeaves } from '../packages/diagram/src/layout.ts';
import { createDocument } from '../packages/diagram/src/document.ts';

const mk = (nodes: string[], edges: [string, string][]) => createDocument({
  nodes: nodes.map(id => ({ id, type: 'process' as const, title: id })),
  edges: edges.map(([s, t], i) => ({ id: `e${i}`, source: s, target: t })),
});

test('trimLeaves removes degree<=1 nodes in one pass, keeping the rest and their layout', () => {
  const d = trimLeaves(mk(['a', 'b', 'c', 'd'], [['a', 'b'], ['b', 'c'], ['c', 'd']])); // path: ends a,d are leaves
  assert.deepEqual(d.graph.nodes.map(n => n.id), ['b', 'c']);
  assert.equal(d.graph.edges.length, 1); // b-c
  for (const n of d.graph.nodes) assert.ok(d.layout.nodes[n.id]); // survivors keep layout
});

test('trimLeaves iterates to peel layers down to the 2-core', () => {
  // path a-b-c-d-e: 1 pass removes a,e; 2 passes remove b,d -> c alone (then nothing connects it)
  const two = trimLeaves(mk(['a', 'b', 'c', 'd', 'e'], [['a', 'b'], ['b', 'c'], ['c', 'd'], ['d', 'e']]), { iterations: 2 });
  assert.deepEqual(two.graph.nodes.map(n => n.id).sort(), ['c']); // c survives both passes (its neighbors became leaves)
  // a triangle is all 2-core: nothing trimmed
  const tri = trimLeaves(mk(['x', 'y', 'z'], [['x', 'y'], ['y', 'z'], ['z', 'x']]), { iterations: 5 });
  assert.equal(tri.graph.nodes.length, 3);
});

test('trimLeaves strips a star to its (isolated) hub in one pass and is pure', () => {
  const star = mk(['h', 'a', 'b', 'c'], [['h', 'a'], ['h', 'b'], ['h', 'c']]);
  const snap = JSON.stringify(star);
  const d = trimLeaves(star); // leaves a,b,c (deg 1) removed; hub (deg 3) stays, now isolated
  assert.deepEqual(d.graph.nodes.map(n => n.id), ['h']);
  assert.equal(d.graph.edges.length, 0);
  assert.equal(JSON.stringify(star), snap); // input untouched
});

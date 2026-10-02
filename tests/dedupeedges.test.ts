import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dedupeEdges } from '../packages/diagram/src/layout.ts';
import { createDocument } from '../packages/diagram/src/document.ts';

const doc = () => createDocument({
  nodes: [{ id: 'a', type: 'process', title: 'A' }, { id: 'b', type: 'process', title: 'B' }],
  edges: [
    { id: 'e0', source: 'a', target: 'b', label: 'usa' },
    { id: 'e1', source: 'a', target: 'b', label: 'usa' }, // exact duplicate of e0
    { id: 'e2', source: 'a', target: 'b', label: 'llama' }, // same pair, different label -> kept by default
    { id: 'e3', source: 'a', target: 'a' }, // self-loop
  ],
});

test('dedupeEdges removes exact (source,target,label) duplicates, keeping the first', () => {
  const d = dedupeEdges(doc());
  const ids = d.graph.edges.map(e => e.id);
  assert.deepEqual(ids, ['e0', 'e2', 'e3']); // e1 dropped (dup of e0); e2 (diff label) and e3 kept
  assert.ok(d.layout.edges.e0 && d.layout.edges.e2); // kept edges retain their routing
  assert.equal(d.layout.edges.e1, undefined);
});

test('dedupeEdges with ignoreLabels collapses any same source→target pair', () => {
  const d = dedupeEdges(doc(), { ignoreLabels: true });
  assert.deepEqual(d.graph.edges.map(e => e.id), ['e0', 'e3']); // e1 and e2 both collapse into e0; self-loop kept
});

test('dedupeEdges with selfLoops also drops a→a edges', () => {
  const d = dedupeEdges(doc(), { selfLoops: true });
  assert.deepEqual(d.graph.edges.map(e => e.id), ['e0', 'e2']); // e3 (self-loop) removed
});

test('dedupeEdges is a no-op (and pure) when there are no duplicates', () => {
  const clean = createDocument({ nodes: [{ id: 'a', type: 'process', title: 'A' }, { id: 'b', type: 'process', title: 'B' }], edges: [{ id: 'e0', source: 'a', target: 'b' }] });
  const snap = JSON.stringify(clean);
  const d = dedupeEdges(clean);
  assert.equal(d.graph.edges.length, 1);
  assert.equal(JSON.stringify(clean), snap); // input untouched
});

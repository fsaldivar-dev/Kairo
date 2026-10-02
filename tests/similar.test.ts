import { test } from 'node:test';
import assert from 'node:assert/strict';
import { jaccardSimilarity, similarNodes } from '../packages/diagram/src/algorithms.ts';
import { createDocument } from '../packages/diagram/src/document.ts';

// a and b both connect to the same hub h (and only that); c connects elsewhere.
const doc = createDocument({
  nodes: ['h', 'a', 'b', 'c', 'x'].map(id => ({ id, type: 'process' as const, title: id.toUpperCase() })),
  edges: [
    { id: 'e0', source: 'h', target: 'a' }, { id: 'e1', source: 'h', target: 'b' },
    { id: 'e2', source: 'c', target: 'x' },
  ],
});

test('jaccardSimilarity is 1 for nodes with identical neighbor sets, 0 for disjoint', () => {
  // a and b both have neighbor {h} -> identical -> 1
  assert.equal(jaccardSimilarity(doc.graph, 'a', 'b'), 1);
  // a (neighbor {h}) vs c (neighbor {x}) -> disjoint -> 0
  assert.equal(jaccardSimilarity(doc.graph, 'a', 'c'), 0);
  // self with neighbors -> 1
  assert.equal(jaccardSimilarity(doc.graph, 'a', 'a'), 1);
});

test('jaccardSimilarity handles partial overlap', () => {
  // triangle-ish: p-q, p-r, q-r, plus p-s. N(q)={p,r}, N(r)={p,q} -> inter {p} =1, union {p,q,r}=3 -> 1/3
  const d = createDocument({
    nodes: ['p', 'q', 'r', 's'].map(id => ({ id, type: 'process' as const, title: id })),
    edges: [{ id: 'e0', source: 'p', target: 'q' }, { id: 'e1', source: 'p', target: 'r' }, { id: 'e2', source: 'q', target: 'r' }, { id: 'e3', source: 'p', target: 's' }],
  });
  assert.equal(jaccardSimilarity(d.graph, 'q', 'r'), 0.3333);
});

test('similarNodes ranks by Jaccard, excludes self and zero-score nodes', () => {
  const result = similarNodes(doc.graph, 'a');
  assert.equal(result[0].id, 'b');     // b is the only node sharing a's neighbor
  assert.equal(result[0].score, 1);
  assert.ok(!result.some(r => r.id === 'a'));                 // self excluded
  assert.ok(!result.some(r => r.id === 'c' || r.id === 'x')); // zero-similarity excluded
  assert.equal(similarNodes(doc.graph, 'a').length, 1);
});

test('similarNodes returns [] for an unknown id or a node with no co-neighbors', () => {
  assert.deepEqual(similarNodes(doc.graph, 'zzz'), []);
  assert.deepEqual(similarNodes(doc.graph, 'c'), []); // c shares no neighbor with anyone
});

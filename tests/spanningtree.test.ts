import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spanningTree } from '../packages/diagram/src/layout.ts';
import { createDocument } from '../packages/diagram/src/document.ts';
import { findCycle } from '../packages/diagram/src/algorithms.ts';

test('spanningTree drops cycle edges, leaving V-1 edges for one component', () => {
  const tri = createDocument({ nodes: [{ id: 'a', type: 'process', title: 'A' }, { id: 'b', type: 'process', title: 'B' }, { id: 'c', type: 'process', title: 'C' }], edges: [{ id: 'e0', source: 'a', target: 'b' }, { id: 'e1', source: 'b', target: 'c' }, { id: 'e2', source: 'c', target: 'a' }] });
  const d = spanningTree(tri);
  assert.equal(d.graph.nodes.length, 3);
  assert.equal(d.graph.edges.length, 2); // V-1, one edge removed
  assert.equal(findCycle(d.graph), null); // acyclic now
  for (const e of d.graph.edges) assert.ok(d.layout.edges[e.id]); // kept edges keep routing
});

test('spanningTree yields V - components edges across multiple components', () => {
  const g = createDocument({
    nodes: ['a', 'b', 'c', 'x', 'y'].map(id => ({ id, type: 'process' as const, title: id })),
    edges: [{ id: 'e0', source: 'a', target: 'b' }, { id: 'e1', source: 'b', target: 'c' }, { id: 'e2', source: 'a', target: 'c' }, { id: 'e3', source: 'x', target: 'y' }],
  });
  const d = spanningTree(g);
  assert.equal(d.graph.edges.length, 3); // 5 nodes - 2 components = 3
});

test('spanningTree is a no-op for a graph that is already a forest, and is pure', () => {
  const forest = createDocument({ nodes: [{ id: 'a', type: 'process', title: 'A' }, { id: 'b', type: 'process', title: 'B' }, { id: 'c', type: 'process', title: 'C' }], edges: [{ id: 'e0', source: 'a', target: 'b' }, { id: 'e1', source: 'a', target: 'c' }] });
  const snap = JSON.stringify(forest);
  const d = spanningTree(forest);
  assert.equal(d.graph.edges.length, 2);
  assert.equal(JSON.stringify(forest), snap); // input untouched
});

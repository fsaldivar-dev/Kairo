import { test } from 'node:test';
import assert from 'node:assert/strict';
import { reduceCrossings, autoLayout } from '../packages/diagram/src/layout.ts';
import { countCrossings } from '../packages/diagram/src/flow.ts';
import { createDocument } from '../packages/diagram/src/document.ts';
import type { DiagramDocument } from '../packages/diagram/src/types.ts';

// Classic crossing: rank0 {a,b}, rank1 {c,d}; edges a->d, b->c cross in declaration order.
function crossing(): DiagramDocument {
  return createDocument({
    nodes: [
      { id: 'a', type: 'process', title: 'A' }, { id: 'b', type: 'process', title: 'B' },
      { id: 'c', type: 'process', title: 'C' }, { id: 'd', type: 'process', title: 'D' },
    ],
    edges: [{ id: 'ad', source: 'a', target: 'd' }, { id: 'bc', source: 'b', target: 'c' }],
  });
}

test('reduceCrossings lays the bipartite case out crossing-free (barycenter reorders the second rank)', () => {
  const doc = crossing();
  const after = countCrossings(reduceCrossings(doc));
  assert.equal(after, 0, 'barycenter ordering should produce no crossings');
  assert.ok(after <= countCrossings(autoLayout(doc)), 'and no worse than the plain layered layout');
});

test('reduceCrossings never increases crossings vs the plain layered layout on the sample-like graph', () => {
  const doc = createDocument({
    nodes: ['s', 'a', 'b', 'c', 'd', 'e'].map(id => ({ id, type: 'process' as const, title: id })),
    edges: [
      { id: '1', source: 's', target: 'a' }, { id: '2', source: 's', target: 'b' },
      { id: '3', source: 'a', target: 'd' }, { id: '4', source: 'b', target: 'c' },
      { id: '5', source: 'c', target: 'e' }, { id: '6', source: 'd', target: 'e' },
    ],
  });
  const layered = countCrossings(autoLayout(doc));
  const reduced = countCrossings(reduceCrossings(doc));
  assert.ok(reduced <= layered, `reduced (${reduced}) should be <= layered (${layered})`);
});

test('reduceCrossings preserves the graph and all node sizes, and is deterministic & pure', () => {
  const doc = crossing(), snapshot = JSON.stringify(doc);
  const a = reduceCrossings(doc), b = reduceCrossings(doc);
  assert.deepEqual(a.graph, doc.graph);               // semantics untouched
  assert.deepEqual(a.layout, b.layout);               // deterministic
  assert.equal(Object.keys(a.layout.nodes).length, 4);
  for (const id of ['a', 'b', 'c', 'd']) assert.deepEqual([a.layout.nodes[id].width, a.layout.nodes[id].height], [doc.layout.nodes[id].width, doc.layout.nodes[id].height]);
  assert.equal(JSON.stringify(doc), snapshot);        // input not mutated
});

test('reduceCrossings handles an empty graph', () => {
  const m = reduceCrossings(createDocument({ nodes: [], edges: [] }));
  assert.equal(m.graph.nodes.length, 0);
});

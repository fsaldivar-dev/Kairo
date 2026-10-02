import { test } from 'node:test';
import assert from 'node:assert/strict';
import { bypassNode } from '../packages/diagram/src/layout.ts';
import { createDocument } from '../packages/diagram/src/document.ts';
import type { DiagramDocument } from '../packages/diagram/src/types.ts';

// p1->x, p2->x, x->s1, x->s2, and a pre-existing p1->s1 (to test dedupe).
function doc(): DiagramDocument {
  return createDocument({
    nodes: ['p1', 'p2', 'x', 's1', 's2'].map(id => ({ id, type: 'process' as const, title: id })),
    edges: [
      { id: 'e1', source: 'p1', target: 'x' }, { id: 'e2', source: 'p2', target: 'x' },
      { id: 'e3', source: 'x', target: 's1' }, { id: 'e4', source: 'x', target: 's2' },
      { id: 'e5', source: 'p1', target: 's1' }, // already exists -> must not be duplicated
    ],
  });
}

test('bypassNode reconnects every predecessor to every successor (cartesian), minus duplicates', () => {
  const m = bypassNode(doc(), 'x').graph;
  assert.ok(!m.nodes.some(n => n.id === 'x'));
  assert.ok(!m.edges.some(e => e.source === 'x' || e.target === 'x')); // no edge touches x
  const pairs = m.edges.map(e => `${e.source}->${e.target}`).sort();
  // expected: p1->s1 (pre-existing, kept once), p1->s2, p2->s1, p2->s2
  assert.deepEqual(pairs, ['p1->s1', 'p1->s2', 'p2->s1', 'p2->s2']);
});

test('bypassNode with no successors just deletes the node and its edges (no new edges)', () => {
  const d = createDocument({
    nodes: [{ id: 'a', type: 'process', title: 'A' }, { id: 'b', type: 'process', title: 'B' }],
    edges: [{ id: 'ab', source: 'a', target: 'b' }],
  });
  const m = bypassNode(d, 'b').graph; // b is a sink
  assert.deepEqual(m.nodes.map(n => n.id), ['a']);
  assert.equal(m.edges.length, 0);
});

test('bypassNode is a no-op for an unknown id and does not mutate the input', () => {
  const d = doc(), snapshot = JSON.stringify(d);
  assert.equal(bypassNode(d, 'ghost').graph.nodes.length, 5);
  assert.equal(JSON.stringify(d), snapshot);
});

test('bypassNode drops self-loops that would arise (pred == succ)', () => {
  const d = createDocument({
    nodes: ['a', 'x'].map(id => ({ id, type: 'process' as const, title: id })),
    edges: [{ id: 'ax', source: 'a', target: 'x' }, { id: 'xa', source: 'x', target: 'a' }],
  });
  const m = bypassNode(d, 'x').graph; // pred={a}, succ={a} -> a->a self-loop must be skipped
  assert.deepEqual(m.nodes.map(n => n.id), ['a']);
  assert.equal(m.edges.length, 0);
});

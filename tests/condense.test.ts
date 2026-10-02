import { test } from 'node:test';
import assert from 'node:assert/strict';
import { condense } from '../packages/diagram/src/layout.ts';
import { findCycle } from '../packages/diagram/src/algorithms.ts';
import { createDocument } from '../packages/diagram/src/document.ts';
import type { DiagramDocument } from '../packages/diagram/src/types.ts';

// a->b->c->a is an SCC; c->d exits it.
function cyclic(): DiagramDocument {
  return createDocument({
    nodes: ['a', 'b', 'c', 'd'].map(id => ({ id, type: 'process' as const, title: id })),
    edges: [
      { id: '1', source: 'a', target: 'b' }, { id: '2', source: 'b', target: 'c' },
      { id: '3', source: 'c', target: 'a' }, { id: '4', source: 'c', target: 'd' },
    ],
  });
}

test('condense collapses a strongly-connected component into one node, leaving a DAG', () => {
  const out = condense(cyclic());
  assert.equal(out.graph.nodes.length, 2);            // {a,b,c} -> a, plus d
  assert.ok(out.graph.nodes.some(n => n.id === 'a') && out.graph.nodes.some(n => n.id === 'd'));
  assert.equal(findCycle(out.graph), null);           // condensation is always acyclic
  assert.ok(out.graph.edges.some(e => e.source === 'a' && e.target === 'd')); // the exit edge survives
});

test('condense leaves an already-acyclic graph unchanged in structure', () => {
  const dag = createDocument({
    nodes: ['x', 'y', 'z'].map(id => ({ id, type: 'process' as const, title: id })),
    edges: [{ id: '1', source: 'x', target: 'y' }, { id: '2', source: 'y', target: 'z' }],
  });
  const out = condense(dag);
  assert.equal(out.graph.nodes.length, 3);
  assert.equal(out.graph.edges.length, 2);
});

test('condense collapses two separate SCCs independently and is pure', () => {
  const d = createDocument({
    nodes: ['a', 'b', 'c', 'd'].map(id => ({ id, type: 'process' as const, title: id })),
    edges: [
      { id: '1', source: 'a', target: 'b' }, { id: '2', source: 'b', target: 'a' }, // SCC {a,b}
      { id: '3', source: 'c', target: 'd' }, { id: '4', source: 'd', target: 'c' }, // SCC {c,d}
      { id: '5', source: 'b', target: 'c' },
    ],
  });
  const snapshot = JSON.stringify(d);
  const out = condense(d);
  assert.equal(out.graph.nodes.length, 2);  // {a,b}->a, {c,d}->c
  assert.equal(findCycle(out.graph), null);
  assert.equal(JSON.stringify(d), snapshot); // input untouched
});

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mergeDuplicates } from '../packages/diagram/src/layout.ts';
import { createDocument } from '../packages/diagram/src/document.ts';

test('mergeDuplicates merges nodes sharing a title and rewires edges', () => {
  const d = createDocument({
    nodes: [{ id: 'a', type: 'database', title: 'DB' }, { id: 'b', type: 'database', title: 'DB' }, { id: 'c', type: 'service', title: 'App' }],
    edges: [{ id: 'ac', source: 'a', target: 'c' }, { id: 'bc', source: 'b', target: 'c' }],
  });
  const m = mergeDuplicates(d).graph;
  assert.deepEqual(m.nodes.map(n => n.title).sort(), ['App', 'DB']); // the two DBs became one
  assert.equal(m.nodes.length, 2);
  assert.equal(m.edges.length, 1); // a->c and b->c collapse to one a->c
  assert.ok(m.nodes.some(n => n.id === 'a')); // first of the group survives
});

test('mergeDuplicates leaves a document with unique titles unchanged', () => {
  const d = createDocument({
    nodes: ['x', 'y', 'z'].map(id => ({ id, type: 'process' as const, title: id })),
    edges: [{ id: 'xy', source: 'x', target: 'y' }],
  });
  const m = mergeDuplicates(d).graph;
  assert.equal(m.nodes.length, 3);
  assert.equal(m.edges.length, 1);
});

test('mergeDuplicates by type collapses all nodes of the same type', () => {
  const d = createDocument({
    nodes: [{ id: 'a', type: 'process', title: 'A' }, { id: 'b', type: 'process', title: 'B' }, { id: 'c', type: 'decision', title: 'C' }],
    edges: [{ id: 'ab', source: 'a', target: 'b' }, { id: 'bc', source: 'b', target: 'c' }],
  });
  const m = mergeDuplicates(d, { by: 'type' }).graph;
  assert.equal(m.nodes.length, 2); // the two 'process' merged, 'decision' stays
});

test('mergeDuplicates is pure', () => {
  const d = createDocument({ nodes: [{ id: 'a', type: 'process', title: 'T' }, { id: 'b', type: 'process', title: 'T' }], edges: [] });
  const snap = JSON.stringify(d); mergeDuplicates(d); assert.equal(JSON.stringify(d), snap);
});

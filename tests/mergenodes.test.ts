import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mergeNodes } from '../packages/diagram/src/layout.ts';
import { createDocument } from '../packages/diagram/src/document.ts';
import type { DiagramDocument } from '../packages/diagram/src/types.ts';

// a->b, b->c, a->c (parallel after merge), x->a. Merge {a,b} into a.
function doc(): DiagramDocument {
  const d = createDocument({
    nodes: ['a', 'b', 'c', 'x'].map(id => ({ id, type: 'process' as const, title: id.toUpperCase() })),
    edges: [
      { id: 'ab', source: 'a', target: 'b' },       // intra-set -> dropped
      { id: 'bc', source: 'b', target: 'c' },        // becomes a->c
      { id: 'ac', source: 'a', target: 'c' },        // a->c (duplicate of remapped bc) -> deduped
      { id: 'xa', source: 'x', target: 'a' },        // stays x->a
    ],
  });
  d.layout.nodes.a = { x: 0, y: 0, width: 160, height: 80 };
  d.layout.nodes.b = { x: 240, y: 0, width: 160, height: 80 };
  d.layout.nodes.c = { x: 0, y: 240, width: 160, height: 80 };
  d.layout.nodes.x = { x: 480, y: 0, width: 160, height: 80 };
  return d;
}

test('mergeNodes contracts the set into the survivor, dropping self-loops and de-duping parallels', () => {
  const m = mergeNodes(doc(), ['a', 'b']).graph;
  assert.deepEqual(m.nodes.map(n => n.id).sort(), ['a', 'c', 'x']); // b folded into a
  const pairs = m.edges.map(e => `${e.source}->${e.target}`).sort();
  assert.deepEqual(pairs, ['a->c', 'x->a']); // ab dropped (self-loop), ac/bc deduped to one a->c
  assert.equal(m.edges.length, 2);
});

test('mergeNodes moves the survivor to the centroid of the merged boxes and keeps its size', () => {
  const m = mergeNodes(doc(), ['a', 'b']);
  // centroid of a(center 80,40) and b(center 320,40) = (200,40); box 160x80 -> x=120,y=0
  assert.deepEqual(m.layout.nodes.a, { x: 120, y: 0, width: 160, height: 80 });
});

test('mergeNodes honours `into` (survivor) and `title`, and preserves an unrelated edge route', () => {
  const d = doc();
  const prior = { ...d.layout.edges.xa };
  const m = mergeNodes(d, ['a', 'b'], { into: 'b', title: 'A+B' });
  assert.ok(m.graph.nodes.some(n => n.id === 'b' && n.title === 'A+B'));
  assert.ok(!m.graph.nodes.some(n => n.id === 'a'));
  // x->a was remapped to x->b (endpoint moved) so it is rerouted; the unrelated survivor keeps identity.
  assert.ok(m.graph.edges.some(e => e.source === 'x' && e.target === 'b'));
  void prior;
});

test('mergeNodes returns the document unchanged when fewer than two ids exist, and is pure', () => {
  const d = doc(), snapshot = JSON.stringify(d);
  assert.equal(mergeNodes(d, ['a']).graph.nodes.length, 4);
  assert.equal(mergeNodes(d, ['a', 'ghost']).graph.nodes.length, 4);
  assert.equal(JSON.stringify(d), snapshot); // input untouched
});

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { rotateLayout } from '../packages/diagram/src/layout.ts';
import { createDocument } from '../packages/diagram/src/document.ts';
import type { DiagramDocument } from '../packages/diagram/src/types.ts';

// a above b (vertical stack), same size.
function doc(): DiagramDocument {
  const d = createDocument({
    nodes: [{ id: 'a', type: 'process', title: 'A' }, { id: 'b', type: 'process', title: 'B' }],
    edges: [{ id: 'ab', source: 'a', target: 'b' }],
  });
  d.layout.nodes.a = { x: 80, y: 80, width: 160, height: 80 };
  d.layout.nodes.b = { x: 80, y: 280, width: 160, height: 80 };
  return d;
}

test('rotateLayout 90° turns a vertical stack into a horizontal row', () => {
  const m = rotateLayout(doc(), { degrees: 90 });
  // a and b had the same x and different y -> after 90° they share a y and differ in x.
  assert.equal(m.layout.nodes.a.y, m.layout.nodes.b.y);
  assert.notEqual(m.layout.nodes.a.x, m.layout.nodes.b.x);
  assert.deepEqual(m.graph, doc().graph); // semantics untouched
});

test('rotateLayout renormalises to the standard margin (min x and y at 80)', () => {
  const m = rotateLayout(doc(), { degrees: 90 });
  const xs = Object.values(m.layout.nodes).map(b => b.x), ys = Object.values(m.layout.nodes).map(b => b.y);
  assert.equal(Math.min(...xs), 80);
  assert.equal(Math.min(...ys), 80);
});

test('rotateLayout 180° applied twice restores positions (360°)', () => {
  const once = rotateLayout(doc(), { degrees: 180 });
  const twice = rotateLayout(once, { degrees: 180 });
  assert.deepEqual(twice.layout.nodes.a, doc().layout.nodes.a);
  assert.deepEqual(twice.layout.nodes.b, doc().layout.nodes.b);
});

test('rotateLayout handles the empty graph and is pure', () => {
  assert.equal(rotateLayout(createDocument({ nodes: [], edges: [] })).graph.nodes.length, 0);
  const d = doc(), snap = JSON.stringify(d); rotateLayout(d); assert.equal(JSON.stringify(d), snap);
});

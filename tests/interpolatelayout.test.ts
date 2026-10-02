import { test } from 'node:test';
import assert from 'node:assert/strict';
import { interpolateLayout } from '../packages/diagram/src/layout.ts';
import { createDocument } from '../packages/diagram/src/document.ts';

const at = (x: number, y: number) => {
  const d = createDocument({ nodes: [{ id: 'a', type: 'process', title: 'A' }, { id: 'b', type: 'process', title: 'B' }], edges: [{ id: 'e0', source: 'a', target: 'b' }] });
  d.layout.nodes.a = { x, y, width: 200, height: 92 };
  d.layout.nodes.b = { x: x + 300, y: y + 300, width: 200, height: 92 };
  return d;
};

test('interpolateLayout blends positions: t=0 is from, t=1 is to, t=0.5 is the midpoint', () => {
  const from = at(100, 100), to = at(500, 700);
  assert.deepEqual([interpolateLayout(from, to, 0).layout.nodes.a.x, interpolateLayout(from, to, 0).layout.nodes.a.y], [100, 100]);
  assert.deepEqual([interpolateLayout(from, to, 1).layout.nodes.a.x, interpolateLayout(from, to, 1).layout.nodes.a.y], [500, 700]);
  const mid = interpolateLayout(from, to, 0.5).layout.nodes.a;
  assert.deepEqual([mid.x, mid.y], [300, 400]); // halfway
});

test('interpolateLayout clamps t to [0,1] and honours an easing function', () => {
  const from = at(0, 0), to = at(400, 0);
  assert.equal(interpolateLayout(from, to, -5).layout.nodes.a.x, 0);   // clamped low
  assert.equal(interpolateLayout(from, to, 9).layout.nodes.a.x, 400);  // clamped high
  // easing that maps 0.5 -> 0.25 pulls the midpoint toward `from`
  assert.equal(interpolateLayout(from, to, 0.5, { easing: t => t * t }).layout.nodes.a.x, 100);
});

test('interpolateLayout uses the `to` graph; a node absent from `from` stays at its `to` place; pure', () => {
  const from = createDocument({ nodes: [{ id: 'a', type: 'process', title: 'A' }], edges: [] });
  from.layout.nodes.a = { x: 0, y: 0, width: 200, height: 92 };
  const to = at(500, 500); // has a and b
  const snap = JSON.stringify(to);
  const out = interpolateLayout(from, to, 0.5);
  assert.equal(out.graph.nodes.length, 2);                 // graph from `to`
  assert.deepEqual([out.layout.nodes.b.x, out.layout.nodes.b.y], [800, 800]); // b (not in from) kept at to
  assert.equal(out.layout.nodes.a.x, 250);                 // a blended 0->500 at 0.5
  assert.equal(JSON.stringify(to), snap);                  // inputs untouched
});

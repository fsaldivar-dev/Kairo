import { test } from 'node:test';
import assert from 'node:assert/strict';
import { flipLayout } from '../packages/diagram/src/layout.ts';
import { createDocument } from '../packages/diagram/src/document.ts';
import type { DiagramDocument } from '../packages/diagram/src/types.ts';

function doc(): DiagramDocument {
  const d = createDocument({
    nodes: [{ id: 'a', type: 'process', title: 'A' }, { id: 'b', type: 'process', title: 'B' }],
    edges: [{ id: 'ab', source: 'a', target: 'b' }],
  });
  d.layout.nodes.a = { x: 100, y: 100, width: 160, height: 80 };
  d.layout.nodes.b = { x: 400, y: 300, width: 160, height: 80 };
  return d;
}

test('flipLayout horizontal mirrors x within the bounding box and leaves y', () => {
  const m = flipLayout(doc(), { axis: 'horizontal' });
  // bbox x: [100, 560]; a(100,w160) -> 100+560-(100+160)=400; b(400) -> 100
  assert.equal(m.layout.nodes.a.x, 400);
  assert.equal(m.layout.nodes.b.x, 100);
  assert.equal(m.layout.nodes.a.y, 100); // y unchanged
  assert.equal(m.layout.nodes.b.y, 300);
});

test('flipLayout vertical mirrors y and leaves x; sizes and graph preserved', () => {
  const m = flipLayout(doc(), { axis: 'vertical' });
  // bbox y: [100, 380]; a(100,h80) -> 100+380-(100+80)=300; b(300) -> 100
  assert.equal(m.layout.nodes.a.y, 300);
  assert.equal(m.layout.nodes.b.y, 100);
  assert.equal(m.layout.nodes.a.x, 100); // x unchanged
  assert.deepEqual(m.graph, doc().graph); // semantics untouched
  assert.equal(m.layout.nodes.a.width, 160);
});

test('flipLayout defaults to horizontal and is an involution (double flip restores positions)', () => {
  const once = flipLayout(doc());
  const twice = flipLayout(once);
  assert.deepEqual(twice.layout.nodes.a, doc().layout.nodes.a);
  assert.deepEqual(twice.layout.nodes.b, doc().layout.nodes.b);
});

test('flipLayout handles the empty graph and is pure', () => {
  const empty = createDocument({ nodes: [], edges: [] });
  assert.equal(flipLayout(empty).graph.nodes.length, 0);
  const d = doc(), snap = JSON.stringify(d); flipLayout(d); assert.equal(JSON.stringify(d), snap);
});

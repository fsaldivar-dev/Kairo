import { test } from 'node:test';
import assert from 'node:assert/strict';
import { scaleLayout } from '../packages/diagram/src/layout.ts';
import { createDocument } from '../packages/diagram/src/document.ts';
import type { DiagramDocument } from '../packages/diagram/src/types.ts';

function doc(): DiagramDocument {
  const d = createDocument({
    nodes: [{ id: 'a', type: 'process', title: 'A' }, { id: 'b', type: 'process', title: 'B' }],
    edges: [{ id: 'ab', source: 'a', target: 'b' }],
  });
  d.layout.nodes.a = { x: 80, y: 80, width: 160, height: 80 };
  d.layout.nodes.b = { x: 80, y: 280, width: 160, height: 80 }; // 200px centre gap vertically
  return d;
}

const gapY = (d: DiagramDocument) => Math.abs((d.layout.nodes.b.y + d.layout.nodes.b.height / 2) - (d.layout.nodes.a.y + d.layout.nodes.a.height / 2));

test('scaleLayout factor 2 doubles the spacing between node centres, keeping sizes', () => {
  const before = gapY(doc());            // 200
  const m = scaleLayout(doc(), { factor: 2 });
  assert.equal(gapY(m), before * 2);     // 400
  assert.equal(m.layout.nodes.a.width, 160); // size unchanged
});

test('scaleLayout factor < 1 tightens the spacing', () => {
  const m = scaleLayout(doc(), { factor: 0.5 });
  assert.equal(gapY(m), 100);            // half of 200
});

test('scaleLayout renormalises to the margin and defaults to a mild spread (1.25)', () => {
  const m = scaleLayout(doc());
  const xs = Object.values(m.layout.nodes).map(b => b.x), ys = Object.values(m.layout.nodes).map(b => b.y);
  assert.equal(Math.min(...xs), 80);
  assert.equal(Math.min(...ys), 80);
  assert.equal(gapY(m), 250);            // 200 * 1.25
});

test('scaleLayout keeps the graph, handles empty, and is pure', () => {
  const m = scaleLayout(doc(), { factor: 1.5 });
  assert.deepEqual(m.graph, doc().graph);
  assert.equal(scaleLayout(createDocument({ nodes: [], edges: [] })).graph.nodes.length, 0);
  const d = doc(), snap = JSON.stringify(d); scaleLayout(d); assert.equal(JSON.stringify(d), snap);
});

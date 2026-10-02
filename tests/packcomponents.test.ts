import { test } from 'node:test';
import assert from 'node:assert/strict';
import { packComponents, documentBounds } from '../packages/diagram/src/layout.ts';
import { createDocument } from '../packages/diagram/src/document.ts';

// Two components placed far apart on the canvas.
const scattered = () => {
  const d = createDocument({
    nodes: [{ id: 'a', type: 'process', title: 'A' }, { id: 'b', type: 'process', title: 'B' }, { id: 'c', type: 'process', title: 'C' }, { id: 'd', type: 'process', title: 'D' }],
    edges: [{ id: 'e0', source: 'a', target: 'b' }, { id: 'e1', source: 'c', target: 'd' }],
  });
  d.layout.nodes.a = { x: 0, y: 0, width: 200, height: 92 };
  d.layout.nodes.b = { x: 0, y: 200, width: 200, height: 92 };
  d.layout.nodes.c = { x: 4000, y: 3000, width: 200, height: 92 };
  d.layout.nodes.d = { x: 4000, y: 3200, width: 200, height: 92 };
  return d;
};

test('packComponents brings scattered components together and shrinks the overall bounds', () => {
  const before = documentBounds(scattered());
  const d = packComponents(scattered(), { gap: 80 });
  const after = documentBounds(d);
  assert.ok(after.width < before.width && after.height < before.height); // much tighter
  // internal relative layout preserved within each component
  assert.ok(d.layout.nodes.b.y - d.layout.nodes.a.y === 200); // a above b, same spacing
  assert.ok(d.layout.nodes.d.y - d.layout.nodes.c.y === 200);
  // both components start at the 80 margin corner region
  assert.ok(Math.min(d.layout.nodes.a.x, d.layout.nodes.c.x) >= 80);
});

test('packComponents places components without overlapping bounding boxes', () => {
  const d = packComponents(scattered(), { gap: 80 });
  const box = (ids: string[]) => { let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity; for (const id of ids) { const b = d.layout.nodes[id]; minX = Math.min(minX, b.x); minY = Math.min(minY, b.y); maxX = Math.max(maxX, b.x + b.width); maxY = Math.max(maxY, b.y + b.height); } return { minX, minY, maxX, maxY }; };
  const b1 = box(['a', 'b']), b2 = box(['c', 'd']);
  const disjoint = b1.maxX <= b2.minX || b2.maxX <= b1.minX || b1.maxY <= b2.minY || b2.maxY <= b1.minY;
  assert.ok(disjoint); // the two component boxes don't overlap
});

test('packComponents is a no-op for a single connected component and is pure', () => {
  const one = createDocument({ nodes: [{ id: 'a', type: 'process', title: 'A' }, { id: 'b', type: 'process', title: 'B' }], edges: [{ id: 'e0', source: 'a', target: 'b' }] });
  const snap = JSON.stringify(one);
  const d = packComponents(one);
  assert.equal(d.graph.nodes.length, 2);
  assert.equal(JSON.stringify(one), snap); // input untouched
});

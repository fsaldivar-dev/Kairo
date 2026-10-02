import { test } from 'node:test';
import assert from 'node:assert/strict';
import { findOverlaps } from '../packages/diagram/src/flow.ts';
import { resolveOverlaps } from '../packages/diagram/src/layout.ts';
import { createDocument } from '../packages/diagram/src/document.ts';
import type { DiagramDocument } from '../packages/diagram/src/types.ts';

function overlapping(): DiagramDocument {
  const doc = createDocument({
    nodes: [{ id: 'a', type: 'process', title: 'A' }, { id: 'b', type: 'process', title: 'B' }, { id: 'c', type: 'process', title: 'C' }],
    edges: [{ id: 'ab', source: 'a', target: 'b' }],
  });
  doc.layout.nodes.a = { x: 100, y: 100, width: 160, height: 80 };
  doc.layout.nodes.b = { x: 120, y: 110, width: 160, height: 80 }; // overlaps a
  doc.layout.nodes.c = { x: 600, y: 600, width: 160, height: 80 }; // far away
  return doc;
}

test('findOverlaps reports colliding pairs in document order and respects padding', () => {
  const doc = overlapping();
  assert.deepEqual(findOverlaps(doc), [['a', 'b']]);
  assert.deepEqual(findOverlaps(doc, { padding: 0 }).length, 1);
  // Nodes that merely touch are not overlapping without padding, but are with padding.
  doc.layout.nodes.b = { x: 260, y: 100, width: 160, height: 80 }; // a ends at x=260, b starts at 260
  assert.deepEqual(findOverlaps(doc), []);
  assert.deepEqual(findOverlaps(doc, { padding: 10 }), [['a', 'b']]);
});
test('resolveOverlaps separates all boxes and is pure', () => {
  const doc = overlapping(), original = JSON.stringify(doc);
  const fixed = resolveOverlaps(doc, { padding: 8 });
  assert.deepEqual(findOverlaps(fixed, { padding: 8 }), []); // no residual overlaps
  assert.equal(JSON.stringify(doc), original); // input untouched
  assert.deepEqual(fixed.graph, doc.graph); // semantics preserved
});
test('resolveOverlaps preserves sizes, keeps coordinates padded and recomputes ports', () => {
  const fixed = resolveOverlaps(overlapping());
  assert.equal(fixed.layout.nodes.a.width, 160);
  for (const id of ['a', 'b', 'c']) { assert.ok(fixed.layout.nodes[id].x >= 0 && fixed.layout.nodes[id].y >= 0); }
  assert.ok(fixed.layout.edges.ab.sourcePort);
});
test('resolveOverlaps is a no-op when nothing overlaps', () => {
  const doc = createDocument({ nodes: [{ id: 'x', type: 'process', title: 'X' }, { id: 'y', type: 'process', title: 'Y' }], edges: [] });
  doc.layout.nodes.x = { x: 80, y: 80, width: 160, height: 80 };
  doc.layout.nodes.y = { x: 400, y: 400, width: 160, height: 80 };
  const fixed = resolveOverlaps(doc);
  assert.deepEqual(fixed.layout.nodes.x, { x: 80, y: 80, width: 160, height: 80 });
});
test('resolveOverlaps separates two exactly-coincident boxes deterministically', () => {
  const doc = createDocument({ nodes: [{ id: 'a', type: 'process', title: 'A' }, { id: 'b', type: 'process', title: 'B' }], edges: [] });
  doc.layout.nodes.a = { x: 200, y: 200, width: 160, height: 80 };
  doc.layout.nodes.b = { x: 200, y: 200, width: 160, height: 80 }; // identical
  const a = resolveOverlaps(doc), b = resolveOverlaps(doc);
  assert.deepEqual(findOverlaps(a), []);
  assert.deepEqual(a.layout.nodes, b.layout.nodes); // deterministic tie-break
});

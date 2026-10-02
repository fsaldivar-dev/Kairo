import { test } from 'node:test';
import assert from 'node:assert/strict';
import { layoutMetrics } from '../packages/diagram/src/flow.ts';
import { createDocument } from '../packages/diagram/src/document.ts';
import type { DiagramDocument } from '../packages/diagram/src/types.ts';

// Four nodes on a 100-grid: a(0,0) b(200,0) c(0,200) d(200,200). Edges a-d and b-c cross; boxes don't overlap.
function grid(): DiagramDocument {
  const doc = createDocument({
    nodes: [{ id: 'a', type: 'process', title: 'A' }, { id: 'b', type: 'process', title: 'B' }, { id: 'c', type: 'process', title: 'C' }, { id: 'd', type: 'process', title: 'D' }],
    edges: [{ id: 'ad', source: 'a', target: 'd' }, { id: 'bc', source: 'b', target: 'c' }],
  });
  doc.layout.nodes.a = { x: 0, y: 0, width: 100, height: 100 };
  doc.layout.nodes.b = { x: 200, y: 0, width: 100, height: 100 };
  doc.layout.nodes.c = { x: 0, y: 200, width: 100, height: 100 };
  doc.layout.nodes.d = { x: 200, y: 200, width: 100, height: 100 };
  return doc;
}

test('layoutMetrics reports crossings, edge length, bounding box, density and aspect ratio', () => {
  const m = layoutMetrics(grid());
  assert.equal(m.nodes, 4);
  assert.equal(m.edges, 2);
  assert.equal(m.crossings, 1);      // the two diagonals cross
  assert.equal(m.overlaps, 0);       // boxes are spaced apart
  assert.equal(m.width, 300);        // 0..300
  assert.equal(m.height, 300);
  assert.equal(m.area, 90000);
  assert.equal(m.aspectRatio, 1);    // square
  assert.equal(m.density, +(40000 / 90000).toFixed(3)); // 4 boxes of 100x100
  // Each diagonal spans (200,200): length = sqrt(200^2+200^2) ~= 282.84; two of them.
  assert.equal(m.averageEdgeLength, 283);
  assert.equal(m.totalEdgeLength, 566);
});

test('layoutMetrics: an uncrossed, overlapping layout scores 0 crossings and counts overlaps', () => {
  const doc = grid();
  doc.graph.edges = [{ id: 'ab', source: 'a', target: 'b' }]; // horizontal, no crossing
  doc.layout.nodes.b = { x: 50, y: 10, width: 100, height: 100 }; // now overlaps a
  const m = layoutMetrics(doc);
  assert.equal(m.crossings, 0);
  assert.ok(m.overlaps >= 1);
  assert.equal(m.edges, 1);
});

test('layoutMetrics handles an empty graph without dividing by zero', () => {
  const m = layoutMetrics(createDocument({ nodes: [], edges: [] }));
  assert.deepEqual([m.nodes, m.edges, m.crossings, m.overlaps, m.totalEdgeLength, m.averageEdgeLength, m.area, m.density, m.aspectRatio], [0, 0, 0, 0, 0, 0, 0, 0, 0]);
});

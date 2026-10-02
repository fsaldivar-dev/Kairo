import { test } from 'node:test';
import assert from 'node:assert/strict';
import { toTypst } from '../packages/diagram/src/typst.ts';
import { createDocument } from '../packages/diagram/src/document.ts';
import type { DiagramDocument } from '../packages/diagram/src/types.ts';

function doc(): DiagramDocument {
  const d = createDocument({
    nodes: [{ id: 'a', type: 'start', title: 'Inicio "x"' }, { id: 'b', type: 'process', title: 'Paso' }],
    edges: [{ id: 'ab', source: 'a', target: 'b', label: 'ok' }],
  });
  d.layout.nodes.a = { x: 0, y: 0, width: 120, height: 60 };
  d.layout.nodes.b = { x: 0, y: 180, width: 120, height: 60 };
  d.layout.edges.ab = { ...d.layout.edges.ab, dashed: true };
  return d;
}

test('toTypst emits a CeTZ canvas with import, rects, centred labels and an arrow line', () => {
  const t = toTypst(doc());
  assert.match(t, /^#import "@preview\/cetz:0\.2\.2"/);
  assert.ok(t.includes('#cetz.canvas({'));
  assert.ok(t.includes('import cetz.draw: *'));
  assert.ok(/rect\(\(/.test(t));
  assert.ok(t.includes('content((1, -0.5), "Inicio \\"x\\"")')); // center (60/60, -30/60), quotes escaped
  assert.ok(t.includes('mark: (end: ">")'));
  assert.ok(t.includes('stroke: (dash: "dashed")')); // dashed edge
  assert.ok(t.includes('"ok"')); // edge label at midpoint
  assert.ok(t.trimEnd().endsWith('})'));
});

test('toTypst flips Y (axis points up) and scales by the option', () => {
  const t = toTypst(doc(), { scale: 120, importLine: false });
  assert.ok(!t.startsWith('#import')); // import suppressed
  assert.ok(t.startsWith('#cetz.canvas({'));
  // node b center is (60,210) px -> (0.5, -1.75) at scale 120
  assert.ok(t.includes('content((0.5, -1.75), "Paso")'));
});

test('toTypst skips edges with missing endpoints and is a pure string export', () => {
  const d = doc(); d.graph.edges.push({ id: 'bad', source: 'a', target: 'ghost' });
  const snapshot = JSON.stringify(d);
  const t = toTypst(d);
  assert.equal((t.match(/line\(/g) ?? []).length, 1); // only the valid edge
  assert.equal(JSON.stringify(d), snapshot);
});

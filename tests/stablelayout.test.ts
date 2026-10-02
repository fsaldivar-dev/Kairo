import { test } from 'node:test';
import assert from 'node:assert/strict';
import { stableLayout } from '../packages/diagram/src/layout.ts';
import { createDocument } from '../packages/diagram/src/document.ts';
import type { DiagramDocument } from '../packages/diagram/src/types.ts';

function ref(): DiagramDocument {
  const d = createDocument({
    nodes: [{ id: 'a', type: 'process', title: 'A' }, { id: 'b', type: 'process', title: 'B' }],
    edges: [{ id: 'ab', source: 'a', target: 'b' }],
  });
  d.layout.nodes.a = { x: 100, y: 100, width: 160, height: 80 };
  d.layout.nodes.b = { x: 400, y: 100, width: 160, height: 80 };
  return d;
}

test('stableLayout keeps existing nodes at their reference positions and places a new node without overlap', () => {
  const reference = ref();
  const next = createDocument({
    nodes: [{ id: 'a', type: 'process', title: 'A' }, { id: 'b', type: 'process', title: 'B' }, { id: 'c', type: 'process', title: 'C' }],
    edges: [{ id: 'ab', source: 'a', target: 'b' }, { id: 'bc', source: 'b', target: 'c' }],
  });
  const out = stableLayout(next, reference);
  assert.deepEqual([out.layout.nodes.a.x, out.layout.nodes.a.y], [100, 100]); // unchanged
  assert.deepEqual([out.layout.nodes.b.x, out.layout.nodes.b.y], [400, 100]); // unchanged
  const c = out.layout.nodes.c;
  assert.ok(c, 'new node placed');
  // c must not overlap a or b.
  const over = (p: {x:number;y:number;width:number;height:number}, q: typeof p) => p.x < q.x+q.width && p.x+p.width > q.x && p.y < q.y+q.height && p.y+p.height > q.y;
  assert.ok(!over(c, out.layout.nodes.a) && !over(c, out.layout.nodes.b));
});

test('stableLayout places a new node near its placed neighbour (horizontal proximity to b)', () => {
  const reference = ref();
  const next = createDocument({
    nodes: ['a', 'b', 'c'].map(id => ({ id, type: 'process' as const, title: id })),
    edges: [{ id: 'bc', source: 'b', target: 'c' }],
  });
  const out = stableLayout(next, reference);
  // c anchors on b (centre x=480); its centre should be nearer b than to a (centre x=180).
  const cCenter = out.layout.nodes.c.x + out.layout.nodes.c.width / 2;
  assert.ok(Math.abs(cCenter - 480) < Math.abs(cCenter - 180));
});

test('stableLayout with an empty reference places everything in a fresh row (no crash) and is pure', () => {
  const next = ref(); const snapshot = JSON.stringify(next);
  const empty = createDocument({ nodes: [], edges: [] });
  const out = stableLayout(next, empty);
  assert.equal(Object.keys(out.layout.nodes).length, 2);
  assert.notDeepEqual(out.layout.nodes.a, out.layout.nodes.b); // distinct positions
  assert.equal(JSON.stringify(next), snapshot); // input untouched
});

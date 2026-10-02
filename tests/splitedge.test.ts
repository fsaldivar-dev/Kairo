import { test } from 'node:test';
import assert from 'node:assert/strict';
import { splitEdge } from '../packages/diagram/src/layout.ts';
import { createDocument } from '../packages/diagram/src/document.ts';
import type { DiagramDocument } from '../packages/diagram/src/types.ts';

function doc(): DiagramDocument {
  const d = createDocument({
    nodes: [{ id: 'a', type: 'start', title: 'A' }, { id: 'b', type: 'end', title: 'B' }],
    edges: [{ id: 'ab', source: 'a', target: 'b', label: 'sí', condition: 'x>0' }],
  });
  d.layout.nodes.a = { x: 0, y: 0, width: 160, height: 80 };
  d.layout.nodes.b = { x: 400, y: 200, width: 160, height: 80 };
  return d;
}

test('splitEdge replaces s->t with s->new->t and moves edge semantics to the first segment', () => {
  const m = splitEdge(doc(), 'ab', { id: 'mid', title: 'Paso', type: 'process' }).graph;
  assert.deepEqual(m.nodes.map(n => n.id).sort(), ['a', 'b', 'mid']);
  assert.ok(!m.edges.some(e => e.id === 'ab')); // original edge gone
  const seg1 = m.edges.find(e => e.source === 'a' && e.target === 'mid')!;
  const seg2 = m.edges.find(e => e.source === 'mid' && e.target === 'b')!;
  assert.ok(seg1 && seg2);
  assert.equal(seg1.label, 'sí');       // semantics on the first segment
  assert.equal(seg1.condition, 'x>0');
  assert.equal(seg2.label, undefined);  // second segment is plain
  assert.equal(m.edges.length, 2);
});

test('splitEdge places the new node at the midpoint of the endpoints, sized from type defaults', () => {
  const m = splitEdge(doc(), 'ab', { id: 'mid' });
  // a center (80,40), b center (480,240) -> midpoint (280,140); process defaults 200x92 -> x=180,y=94
  const box = m.layout.nodes.mid;
  assert.equal(box.x, 280 - box.width / 2);
  assert.equal(box.y, 140 - box.height / 2);
  assert.ok(box.width >= 140 && box.height >= 76); // valid per the layout validator
  assert.ok(m.layout.edges['ab'] === undefined);   // old edge route removed
});

test('splitEdge de-dupes generated ids and returns the document unchanged for an unknown edge, purely', () => {
  const d = doc();
  d.graph.nodes.push({ id: 'ab-mid', type: 'process', title: 'clash' });
  d.layout.nodes['ab-mid'] = { x: 600, y: 600, width: 160, height: 80 };
  const m = splitEdge(d, 'ab'); // default id 'ab-mid' already taken -> de-duped
  assert.ok(m.graph.nodes.some(n => n.id === 'ab-mid-2'));
  const snapshot = JSON.stringify(d);
  assert.equal(splitEdge(d, 'ghost').graph.edges.length, d.graph.edges.length); // unknown edge -> unchanged
  assert.equal(JSON.stringify(d), snapshot); // input untouched
});

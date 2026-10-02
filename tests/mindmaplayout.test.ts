import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mindmapLayout } from '../packages/diagram/src/layout.ts';
import { createDocument } from '../packages/diagram/src/document.ts';
import type { DiagramDocument } from '../packages/diagram/src/types.ts';

// root -> c1 -> g1 ; root -> c2 : c1 goes right (first half), c2 goes left.
function doc(): DiagramDocument {
  return createDocument({
    nodes: ['root', 'c1', 'g1', 'c2'].map(id => ({ id, type: 'process' as const, title: id })),
    edges: [{ id: '1', source: 'root', target: 'c1' }, { id: '2', source: 'c1', target: 'g1' }, { id: '3', source: 'root', target: 'c2' }],
  });
}
const cx = (d: DiagramDocument, id: string) => d.layout.nodes[id].x + d.layout.nodes[id].width / 2;

test('mindmapLayout fans the root children to opposite sides', () => {
  const m = mindmapLayout(doc());
  const root = cx(m, 'root');
  assert.ok(cx(m, 'c1') > root, 'first child to the right');
  assert.ok(cx(m, 'c2') < root, 'second child to the left');
});

test('mindmapLayout grows each side outward by depth', () => {
  const m = mindmapLayout(doc());
  assert.ok(cx(m, 'g1') > cx(m, 'c1')); // grandchild further right than its parent
});

test('mindmapLayout preserves the graph and positions every node; is pure', () => {
  const d = doc(), snap = JSON.stringify(d);
  const m = mindmapLayout(d);
  assert.deepEqual(m.graph, doc().graph);
  for (const n of m.graph.nodes) assert.ok(m.layout.nodes[n.id]);
  assert.equal(JSON.stringify(d), snap);
});

test('mindmapLayout handles the empty graph', () => {
  assert.equal(mindmapLayout(createDocument({ nodes: [], edges: [] })).graph.nodes.length, 0);
});

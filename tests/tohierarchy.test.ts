import { test } from 'node:test';
import assert from 'node:assert/strict';
import { toHierarchy, fromJson } from '../packages/diagram/src/jsontree.ts';
import { createDocument } from '../packages/diagram/src/document.ts';

test('toHierarchy nests children under their parent from a single root', () => {
  const d = createDocument({
    nodes: [{ id: 'a', type: 'process', title: 'A' }, { id: 'b', type: 'process', title: 'B' }, { id: 'c', type: 'process', title: 'C' }, { id: 'd', type: 'process', title: 'D' }],
    edges: [{ id: 'e0', source: 'a', target: 'b' }, { id: 'e1', source: 'a', target: 'c' }, { id: 'e2', source: 'b', target: 'd' }],
  });
  const h = toHierarchy(d);
  assert.equal(h.id, 'a');
  assert.deepEqual(h.children!.map(c => c.id), ['b', 'c']);
  assert.deepEqual(h.children![0].children!.map(c => c.id), ['d']); // b -> d
  assert.equal(h.children![1].children, undefined); // c is a leaf
});

test('toHierarchy wraps a forest (multiple roots) under a synthetic root', () => {
  const d = createDocument({
    nodes: [{ id: 'r1', type: 'process', title: 'R1' }, { id: 'r2', type: 'process', title: 'R2' }, { id: 'x', type: 'process', title: 'X' }],
    edges: [{ id: 'e0', source: 'r1', target: 'x' }],
  });
  const h = toHierarchy(d, { rootName: 'Todo' });
  assert.equal(h.id, '__root__');
  assert.equal(h.name, 'Todo');
  assert.deepEqual(h.children!.map(c => c.id).sort(), ['r1', 'r2']);
});

test('toHierarchy round-trips through fromJson (same tree structure)', () => {
  const d = createDocument({
    nodes: [{ id: 'root', type: 'process', title: 'Root' }, { id: 'a', type: 'process', title: 'A' }, { id: 'b', type: 'process', title: 'B' }],
    edges: [{ id: 'e0', source: 'root', target: 'a' }, { id: 'e1', source: 'root', target: 'b' }],
  });
  const back = fromJson(toHierarchy(d)).graph;
  assert.deepEqual(back.nodes.map(n => n.title), ['Root', 'A', 'B']);
  assert.equal(back.edges.length, 2);
});

test('toHierarchy breaks cycles via the visited set (each node once)', () => {
  const d = createDocument({
    nodes: [{ id: 'a', type: 'process', title: 'A' }, { id: 'b', type: 'process', title: 'B' }],
    edges: [{ id: 'e0', source: 'a', target: 'b' }, { id: 'e1', source: 'b', target: 'a' }], // cycle
  });
  const h = toHierarchy(d);
  // no indeg-0 node -> first node 'a' is the root; b under a; the b->a back-edge is skipped (a already visited)
  const count = (n: { children?: unknown[] }): number => 1 + ((n.children as { children?: unknown[] }[] ?? []).reduce((s, c) => s + count(c), 0));
  assert.equal(count(h), 2);
});

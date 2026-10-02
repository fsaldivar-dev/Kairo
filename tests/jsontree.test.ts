import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fromJson } from '../packages/diagram/src/jsontree.ts';

test('fromJson builds a tree from nested objects with children', () => {
  const org = { name: 'CEO', children: [{ name: 'CTO', children: [{ name: 'Dev' }] }, { name: 'CFO' }] };
  const doc = fromJson(org);
  assert.deepEqual(doc.graph.nodes.map(n => n.title), ['CEO', 'CTO', 'Dev', 'CFO']);
  assert.equal(doc.graph.edges.length, 3); // CEO->CTO, CTO->Dev, CEO->CFO
  const byTitle = Object.fromEntries(doc.graph.nodes.map(n => [n.title, n.id]));
  assert.ok(doc.graph.edges.some(e => e.source === byTitle.CEO && e.target === byTitle.CTO));
  assert.ok(doc.layout.nodes[byTitle.CTO].y > doc.layout.nodes[byTitle.CEO].y); // child below parent
});
test('fromJson accepts a JSON string, an array forest, and custom keys', () => {
  const forest = fromJson('[{"name":"A"},{"name":"B","children":[{"name":"B1"}]}]');
  assert.deepEqual(forest.graph.nodes.map(n => n.title), ['A', 'B', 'B1']);
  assert.equal(forest.graph.edges.length, 1); // B->B1 only (A and B are roots)
  const custom = fromJson({ label: 'root', kids: [{ label: 'child' }] }, { label: 'label', children: 'kids' });
  assert.deepEqual(custom.graph.nodes.map(n => n.title), ['root', 'child']);
});
test('fromJson labels primitive leaves and falls back for unlabeled objects', () => {
  const doc = fromJson({ name: 'tags', children: ['red', 'green', { id: 'x1' }] });
  assert.deepEqual(doc.graph.nodes.map(n => n.title), ['tags', 'red', 'green', 'x1']);
});
test('fromJson gives unique ids to duplicate labels and throws on empty input', () => {
  const doc = fromJson({ name: 'root', children: [{ name: 'dup' }, { name: 'dup' }] });
  assert.equal(new Set(doc.graph.nodes.map(n => n.id)).size, 3);
  assert.throws(() => fromJson([]), /no produjo ningún nodo/);
});

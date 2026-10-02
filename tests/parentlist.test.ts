import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fromParentList } from '../packages/diagram/src/parentlist.ts';

test('fromParentList builds a tree from id/parentId records', () => {
  const d = fromParentList([
    { id: 'ceo', label: 'CEO' },
    { id: 'cto', parentId: 'ceo', label: 'CTO' },
    { id: 'eng', parentId: 'cto', label: 'Ingeniería' },
    { id: 'cfo', parentId: 'ceo', label: 'CFO' },
  ]);
  assert.deepEqual(d.graph.nodes.map(n => n.title), ['CEO', 'CTO', 'Ingeniería', 'CFO']);
  const id = (t: string) => d.graph.nodes.find(n => n.title === t)!.id;
  const has = (a: string, b: string) => d.graph.edges.some(e => e.source === id(a) && e.target === id(b));
  assert.ok(has('CEO', 'CTO') && has('CTO', 'Ingeniería') && has('CEO', 'CFO'));
  assert.equal(d.graph.edges.length, 3);
  // children sit on deeper layers than their parent
  assert.ok(d.layout.nodes[id('Ingeniería')].y > d.layout.nodes[id('CEO')].y);
});

test('fromParentList accepts a JSON string, common key aliases, and roots (null/unknown parent)', () => {
  const json = JSON.stringify([
    { key: 'a', name: 'A', parent: null },
    { key: 'b', name: 'B', parent: 'a' },
    { key: 'c', name: 'C', parent: 'ghost' }, // unknown parent -> treated as a root
  ]);
  const g = fromParentList(json).graph;
  assert.equal(g.nodes.length, 3);
  assert.equal(g.edges.length, 1); // only b->a; c's ghost parent dropped
  assert.deepEqual(g.nodes.map(n => n.title), ['A', 'B', 'C']);
});

test('fromParentList honours custom keys and dedupes repeated ids', () => {
  const d = fromParentList([
    { uid: '1', up: '', text: 'Root' },
    { uid: '2', up: '1', text: 'Child' },
    { uid: '1', up: '', text: 'DUPLICATE' }, // repeated id ignored
  ], { idKey: 'uid', parentKey: 'up', labelKey: 'text' });
  assert.equal(d.graph.nodes.length, 2);
  assert.deepEqual(d.graph.nodes.map(n => n.title), ['Root', 'Child']);
  assert.equal(d.graph.edges.length, 1);
});

test('fromParentList throws on a non-array or record-less input', () => {
  assert.throws(() => fromParentList('{}' as unknown as string), /array/);
  assert.throws(() => fromParentList([{ foo: 'bar' }]), /no contiene registros/);
});

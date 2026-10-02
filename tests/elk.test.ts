import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createDocument } from '../packages/diagram/src/document.ts';
import { fromElk, toElk } from '../packages/diagram/src/elk.ts';
import { detectFormat, parseAny, serializeAs } from '../packages/diagram/src/convert.ts';

const doc = () => {
  const d = createDocument({
    nodes: [{ id: 'ui', type: 'screen', title: 'Login' }, { id: 'auth', type: 'service', title: 'Auth' }, { id: 'db', type: 'database', title: 'Users' }],
    edges: [{ id: 'e0', source: 'ui', target: 'auth', label: 'verifica' }, { id: 'e1', source: 'auth', target: 'db' }],
  });
  d.layout.nodes.ui = { x: 100, y: 100, width: 200, height: 92 };
  d.layout.nodes.auth = { x: 100, y: 260, width: 200, height: 92 };
  d.layout.nodes.db = { x: 100, y: 420, width: 200, height: 92 };
  return d;
};

test('toElk emits children (id/size/pos/labels) and edges with sources/targets arrays', () => {
  const g = toElk(doc());
  assert.equal(g.id, 'root');
  assert.deepEqual(g.children!.map(c => c.id), ['ui', 'auth', 'db']);
  assert.deepEqual(g.children![0].labels, [{ text: 'Login' }]);
  assert.deepEqual([g.children![1].x, g.children![1].y, g.children![1].width], [100, 260, 200]);
  assert.deepEqual(g.edges![0].sources, ['ui']);
  assert.deepEqual(g.edges![0].targets, ['auth']);
  assert.deepEqual(g.edges![0].labels, [{ text: 'verifica' }]);
  assert.equal(g.edges![1].labels, undefined); // no label -> no labels array
});

test('fromElk round-trips structure, titles, edge labels and ELK positions', () => {
  const back = fromElk(toElk(doc()));
  assert.deepEqual(back.graph.nodes.map(n => n.title), ['Login', 'Auth', 'Users']);
  assert.equal(back.graph.edges.length, 2);
  // positions preserved (ui top, db bottom); normalised so the top node starts at 80
  assert.ok(back.layout.nodes.ui.y < back.layout.nodes.auth.y);
  assert.ok(back.layout.nodes.auth.y < back.layout.nodes.db.y);
  assert.equal(Math.min(back.layout.nodes.ui.y, back.layout.nodes.auth.y, back.layout.nodes.db.y), 80);
});

test('fromElk accepts a JSON string, single source/target, missing labels, and clamps sizes to our minimum', () => {
  const json = JSON.stringify({
    id: 'root',
    children: [{ id: 'a', width: 20, height: 10 }, { id: 'b', labels: [{ text: 'Bee' }] }],
    edges: [{ id: 'x', source: 'a', target: 'b' }], // single source/target instead of arrays
  });
  const d = fromElk(json).graph;
  assert.deepEqual(d.nodes.map(n => n.title), ['a', 'Bee']); // no label -> id
  assert.equal(d.edges.length, 1);
  const back = fromElk(json);
  assert.ok(back.layout.nodes.a.width >= 200 && back.layout.nodes.a.height >= 92); // clamped
});

test('fromElk falls back to a layered layout without positions and drops edges to unknown nodes', () => {
  const g = { children: [{ id: 'a' }, { id: 'b' }], edges: [{ sources: ['a'], targets: ['b'] }, { sources: ['a'], targets: ['ghost'] }] };
  const snapshot = JSON.stringify(g);
  const d = fromElk(g);
  assert.equal(d.graph.edges.length, 1);                       // ghost edge dropped
  assert.ok(d.layout.nodes.b.y > d.layout.nodes.a.y);          // layered: b below a
  assert.equal(JSON.stringify(g), snapshot);                   // pure
});

test('fromElk throws when there are no nodes', () => {
  assert.throws(() => fromElk({ children: [], edges: [] }), /no contiene nodos/);
});

test('detectFormat recognises ELK (children + edges) and convert round-trips through it', () => {
  const json = serializeAs(doc(), 'elk');
  assert.equal(detectFormat(json), 'elk');
  const back = parseAny(json, 'elk').graph;
  assert.equal(back.nodes.length, 3);
  assert.equal(back.edges.length, 2);
});

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createDocument } from '../packages/diagram/src/document.ts';
import { fromGml, toGml } from '../packages/diagram/src/gml.ts';
import { detectFormat } from '../packages/diagram/src/convert.ts';

const doc = () => createDocument({
  nodes: [
    { id: 'auth', type: 'service', title: 'Auth "svc"', group: 'Backend' },
    { id: 'db', type: 'database', title: 'Users', group: 'Backend' },
    { id: 'ui', type: 'screen', title: 'Login' },
  ],
  edges: [{ id: 'e0', source: 'ui', target: 'auth', label: 'verifica' }, { id: 'e1', source: 'auth', target: 'db' }],
});

test('toGml emits a directed graph with id/name/label/type/group and escapes quotes', () => {
  const gml = toGml(doc());
  assert.match(gml, /^graph \[\n {2}directed 1/);
  assert.ok(gml.includes('node ['));
  assert.ok(gml.includes('name "auth"'));
  assert.ok(gml.includes('label "Auth \\"svc\\""')); // inner quotes escaped
  assert.ok(gml.includes('type "service"'));
  assert.ok(gml.includes('group "Backend"'));
  assert.ok(gml.includes('label "verifica"'));
});

test('fromGml restores ids, titles, types, groups and edge labels (round-trip)', () => {
  const back = fromGml(toGml(doc())).graph;
  assert.deepEqual(back.nodes.map(n => n.id), ['auth', 'db', 'ui']);
  assert.equal(back.nodes.find(n => n.id === 'auth')!.title, 'Auth "svc"');
  assert.equal(back.nodes.find(n => n.id === 'auth')!.type, 'service');
  assert.equal(back.nodes.find(n => n.id === 'db')!.group, 'Backend');
  assert.equal(back.edges.length, 2);
  assert.equal(back.edges.find(e => e.source === 'ui')!.label, 'verifica');
});

test('fromGml parses a plain NetworkX-style GML (numeric ids, no Kairo extras)', () => {
  const gml = `graph [
  directed 1
  node [ id 0 label "A" ]
  node [ id 1 label "B" ]
  edge [ source 0 target 1 label "rel" ]
]`;
  const g = fromGml(gml).graph;
  assert.equal(g.nodes.length, 2);
  assert.equal(g.nodes[0].title, 'A');
  assert.equal(g.nodes[0].type, 'process'); // default when no type key
  assert.equal(g.edges.length, 1);
  assert.equal(g.edges[0].label, 'rel');
});

test('detectFormat recognises GML and tells it apart from Mermaid/DOT', () => {
  assert.equal(detectFormat(toGml(doc())), 'gml');
  assert.equal(detectFormat('graph TD\n  A --> B'), 'mermaid'); // not mislabelled as gml
  assert.equal(detectFormat('digraph { a -> b }'), 'dot');
});

test('fromGml rejects input without a graph block or nodes', () => {
  assert.throws(() => fromGml('node [ id 0 ]'), /bloque `graph/);
  assert.throws(() => fromGml('graph [ directed 1 ]'), /no declara nodos/);
});

test('toGml emits graphics coordinates and fromGml preserves them (layout round-trip)', () => {
  const d = doc();
  d.layout.nodes.auth = { x: 300, y: 120, width: 180, height: 90 };
  d.layout.nodes.db = { x: 600, y: 400, width: 160, height: 80 };
  d.layout.nodes.ui = { x: 40, y: 40, width: 160, height: 80 };
  const gml = toGml(d);
  assert.ok(/graphics \[ x 390 y 165 w 180 h 90 \]/.test(gml)); // auth centre = (300+90, 120+45)
  const back = fromGml(gml);
  assert.deepEqual(back.layout.nodes.auth, { x: 300, y: 120, width: 180, height: 90 }); // restored exactly
  assert.deepEqual(back.layout.nodes.db, { x: 600, y: 400, width: 160, height: 80 });
});

test('fromGml falls back to layered layout when any node lacks graphics', () => {
  const gml = 'graph [\n  node [ id 0 label "A" graphics [ x 100 y 100 w 160 h 80 ] ]\n  node [ id 1 label "B" ]\n  edge [ source 0 target 1 ]\n]';
  const back = fromGml(gml);
  // Node B has no graphics -> layered layout used for all (deterministic slots, not the graphics x=100).
  assert.notEqual(back.layout.nodes.A.x, 20); // not derived from the partial graphics (100-160/2)
  assert.equal(back.graph.nodes.length, 2);
});

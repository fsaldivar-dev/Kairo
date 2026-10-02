import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createDocument } from '../packages/diagram/src/document.ts';
import { fromGraphology, toGraphology } from '../packages/diagram/src/graphology.ts';
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

test('toGraphology emits nodes keyed by `key` with label + centre x/y, and source/target edges', () => {
  const g = toGraphology(doc());
  assert.deepEqual(g.nodes.map(n => n.key), ['ui', 'auth', 'db']);
  assert.equal(g.nodes[0].attributes!.label, 'Login');
  assert.deepEqual([g.nodes[1].attributes!.x, g.nodes[1].attributes!.y], [200, 306]); // centre of auth
  assert.deepEqual([g.edges[0].source, g.edges[0].target], ['ui', 'auth']);
  assert.equal(g.edges[0].attributes!.label, 'verifica');
  assert.equal(g.options!.type, 'directed');
});

test('fromGraphology round-trips structure, labels and positions (centres)', () => {
  const back = fromGraphology(toGraphology(doc()));
  assert.deepEqual(back.graph.nodes.map(n => n.title), ['Login', 'Auth', 'Users']);
  assert.equal(back.graph.edges.length, 2);
  assert.ok(back.layout.nodes.ui.y < back.layout.nodes.auth.y && back.layout.nodes.auth.y < back.layout.nodes.db.y);
  assert.ok(Math.min(...Object.values(back.layout.nodes).map(n => n.y)) >= 80); // kept on-canvas (>= margin)
});

test('fromGraphology accepts a JSON string, numeric keys and layered fallback without positions', () => {
  const json = JSON.stringify({ nodes: [{ key: 1, attributes: { label: 'One' } }, { key: 2 }], edges: [{ source: 1, target: 2 }, { source: 1, target: 99 }] });
  const d = fromGraphology(json).graph;
  assert.deepEqual(d.nodes.map(n => n.title), ['One', '2']); // no label -> key
  assert.equal(d.edges.length, 1); // edge to undeclared 99 dropped
});

test('detectFormat recognises graphology (nodes with `key`) and convert round-trips', () => {
  const json = serializeAs(doc(), 'graphology');
  assert.equal(detectFormat(json), 'graphology'); // not misread as reactflow despite source/target edges
  assert.equal(parseAny(json, 'graphology').graph.nodes.length, 3);
  assert.throws(() => fromGraphology({ nodes: [], edges: [] }), /no contiene nodos/);
});

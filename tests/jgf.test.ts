import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createDocument } from '../packages/diagram/src/document.ts';
import { fromJgf, toJgf } from '../packages/diagram/src/jgf.ts';
import { detectFormat, parseAny, serializeAs } from '../packages/diagram/src/convert.ts';

const doc = () => {
  const d = createDocument({
    nodes: [{ id: 'ui', type: 'screen', title: 'Login' }, { id: 'auth', type: 'service', title: 'Auth' }, { id: 'db', type: 'database', title: 'Users' }],
    edges: [{ id: 'e0', source: 'ui', target: 'auth', label: 'verifica', relation: 'usa' }, { id: 'e1', source: 'auth', target: 'db' }],
  });
  d.layout.nodes.ui = { x: 100, y: 100, width: 200, height: 92 };
  d.layout.nodes.auth = { x: 100, y: 260, width: 200, height: 92 };
  d.layout.nodes.db = { x: 100, y: 420, width: 200, height: 92 };
  return d;
};

test('toJgf wraps a graph with id-keyed nodes (label+metadata) and source/target edges', () => {
  const g = toJgf(doc()).graph!;
  assert.equal(g.directed, true);
  const nodes = g.nodes as Record<string, { label?: string; metadata?: Record<string, unknown> }>;
  assert.deepEqual(Object.keys(nodes), ['ui', 'auth', 'db']);
  assert.equal(nodes.ui.label, 'Login');
  assert.equal(nodes.ui.metadata!.type, 'screen');           // type travels in metadata
  assert.deepEqual([nodes.auth.metadata!.x, nodes.auth.metadata!.y], [100, 260]); // geometry travels too
  assert.deepEqual(g.edges![0], { source: 'ui', target: 'auth', directed: true, relation: 'usa', label: 'verifica' });
  assert.equal(g.edges![1].label, undefined); // no label -> omitted
});

test('fromJgf round-trips structure, titles, edge label/relation, node type and positions', () => {
  const back = fromJgf(toJgf(doc()));
  assert.deepEqual(back.graph.nodes.map(n => n.title), ['Login', 'Auth', 'Users']);
  assert.deepEqual(back.graph.nodes.map(n => n.type), ['screen', 'service', 'database']);
  const e = back.graph.edges.find(x => x.label === 'verifica')!;
  assert.equal(e.relation, 'usa');
  assert.ok(back.layout.nodes.ui.y < back.layout.nodes.auth.y && back.layout.nodes.auth.y < back.layout.nodes.db.y);
  assert.equal(Math.min(back.layout.nodes.ui.y, back.layout.nodes.auth.y, back.layout.nodes.db.y), 80); // normalised
});

test('fromJgf accepts a JSON string, the multi-graph form, and drops edges to unknown nodes', () => {
  const json = JSON.stringify({ graphs: [{ directed: true, nodes: { a: { label: 'A' }, b: {} }, edges: [{ source: 'a', target: 'b' }, { source: 'a', target: 'ghost' }] }] });
  const d = fromJgf(json).graph;
  assert.deepEqual(d.nodes.map(n => n.title), ['A', 'b']); // no label -> id
  assert.equal(d.edges.length, 1);                          // ghost dropped
});

test('fromJgf falls back to a layered layout without metadata positions and is pure', () => {
  const g = { graph: { nodes: { a: {}, b: {} }, edges: [{ source: 'a', target: 'b' }] } };
  const snapshot = JSON.stringify(g);
  const d = fromJgf(g);
  assert.ok(d.layout.nodes.b.y > d.layout.nodes.a.y);
  assert.equal(JSON.stringify(g), snapshot);
});

test('fromJgf throws when there are no nodes', () => {
  assert.throws(() => fromJgf({ graph: { nodes: {}, edges: [] } }), /no contiene nodos/);
});

test('detectFormat recognises JGF (graph with nodes/edges, no version/layout) and convert round-trips', () => {
  const json = serializeAs(doc(), 'jgf');
  assert.equal(detectFormat(json), 'jgf');
  // a Kairo-native doc (version+graph+layout) must NOT be misread as JGF
  assert.equal(detectFormat(JSON.stringify(doc())), 'json');
  const back = parseAny(json, 'jgf').graph;
  assert.equal(back.nodes.length, 3);
  assert.equal(back.edges.length, 2);
});

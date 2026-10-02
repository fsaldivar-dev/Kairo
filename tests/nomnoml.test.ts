import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createDocument } from '../packages/diagram/src/document.ts';
import { fromNomnoml, toNomnoml } from '../packages/diagram/src/nomnoml.ts';
import { detectFormat } from '../packages/diagram/src/convert.ts';

const doc = () => createDocument({
  nodes: [{ id: 'ui', type: 'screen', title: 'Login' }, { id: 'auth', type: 'service', title: 'Auth' }, { id: 'db', type: 'database', title: 'Users' }],
  edges: [{ id: 'e0', source: 'ui', target: 'auth', label: 'verifica' }, { id: 'e1', source: 'auth', target: 'db' }],
});

test('toNomnoml emits [source] label -> [target] associations identified by title', () => {
  const n = toNomnoml(doc());
  assert.ok(n.includes('[Login] verifica -> [Auth]'));
  assert.ok(n.includes('[Auth] -> [Users]'));
});

test('fromNomnoml parses nodes and labelled associations (round-trip of structure)', () => {
  const back = fromNomnoml(toNomnoml(doc())).graph;
  assert.deepEqual(back.nodes.map(n => n.title).sort(), ['Auth', 'Login', 'Users']);
  assert.equal(back.edges.length, 2);
  const titleOf = (id: string) => back.nodes.find(n => n.id === id)!.title;
  assert.ok(back.edges.some(e => titleOf(e.source) === 'Login' && titleOf(e.target) === 'Auth' && e.label === 'verifica'));
});

test('fromNomnoml handles various connectors, compartments and bare node declarations', () => {
  const g = fromNomnoml('[A|x: int] uses -> [B]\n[B] <-> [C]\n[D]').graph;
  assert.deepEqual(g.nodes.map(n => n.title).sort(), ['A', 'B', 'C', 'D']); // compartment -> name only; D is isolated
  assert.equal(g.edges.length, 2);
  assert.equal(g.edges[0].label, 'uses');
});

test('detectFormat recognises nomnoml and distinguishes it from D2/Mermaid', () => {
  assert.equal(detectFormat('[A] -> [B]'), 'nomnoml');
  assert.equal(detectFormat('a -> b'), 'd2');            // no brackets -> D2
  assert.equal(detectFormat('flowchart TD\n A[x] --> B[y]'), 'mermaid'); // mermaid keyword wins
  assert.throws(() => fromNomnoml('#direction: right'), /no declara nodos/);
});

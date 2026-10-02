import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createDocument } from '../packages/diagram/src/document.ts';
import { fromTgf, toTgf } from '../packages/diagram/src/tgf.ts';

const doc = () => createDocument({
  nodes: [{ id: 'ui', type: 'screen', title: 'Login' }, { id: 'auth', type: 'service', title: 'Auth Service' }, { id: 'db', type: 'database', title: 'Users' }],
  edges: [{ id: 'e0', source: 'ui', target: 'auth', label: 'verifica' }, { id: 'e1', source: 'auth', target: 'db' }],
});

test('toTgf emits numbered node lines, a # separator, then edge lines', () => {
  const tgf = toTgf(doc());
  const lines = tgf.trim().split('\n');
  assert.equal(lines[0], '1 Login');
  assert.equal(lines[1], '2 Auth Service');
  assert.equal(lines[2], '3 Users');
  assert.equal(lines[3], '#');
  assert.equal(lines[4], '1 2 verifica');
  assert.equal(lines[5], '2 3');
});

test('fromTgf round-trips structure, titles and edge labels', () => {
  const back = fromTgf(toTgf(doc())).graph;
  assert.deepEqual(back.nodes.map(n => n.title), ['Login', 'Auth Service', 'Users']);
  assert.equal(back.edges.length, 2);
  const titleOf = (id: string) => back.nodes.find(n => n.id === id)!.title;
  const e = back.edges.find(x => x.label === 'verifica')!;
  assert.equal(titleOf(e.source), 'Login');
  assert.equal(titleOf(e.target), 'Auth Service');
});

test('fromTgf parses nodes without labels and ignores edges with unknown endpoints', () => {
  const g = fromTgf('1 A\n2\n#\n1 2\n1 99 ghost').graph;
  assert.equal(g.nodes.length, 2);
  assert.equal(g.nodes[1].title, '2'); // no label -> id as title
  assert.equal(g.edges.length, 1);     // 1->99 dropped (99 undeclared)
});

test('fromTgf throws when there are no nodes', () => {
  assert.throws(() => fromTgf('#\n1 2'), /no declara nodos/);
});

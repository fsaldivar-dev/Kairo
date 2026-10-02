import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createDocument } from '../packages/diagram/src/document.ts';
import { fromPajek, toPajek } from '../packages/diagram/src/pajek.ts';
import { detectFormat } from '../packages/diagram/src/convert.ts';

const doc = () => createDocument({
  nodes: [{ id: 'auth', type: 'service', title: 'Auth "svc"' }, { id: 'db', type: 'database', title: 'Users' }, { id: 'ui', type: 'screen', title: 'Login' }],
  edges: [{ id: 'e0', source: 'ui', target: 'auth' }, { id: 'e1', source: 'auth', target: 'db' }],
});

test('toPajek emits a *Vertices block (1-based, quoted) and an *Arcs block; quotes sanitised', () => {
  const net = toPajek(doc());
  const lines = net.trim().split('\n');
  assert.equal(lines[0], '*Vertices 3');
  assert.equal(lines[1], "1 \"Auth 'svc'\""); // inner double-quotes -> single
  assert.equal(lines[2], '2 "Users"');
  assert.equal(lines[3], '3 "Login"');
  assert.equal(lines[4], '*Arcs');
  assert.ok(net.includes('3 1 1')); // ui(3) -> auth(1)
  assert.ok(net.includes('1 2 1')); // auth(1) -> db(2)
});

test('fromPajek restores titles and directed edges (round-trip of structure)', () => {
  const back = fromPajek(toPajek(doc())).graph;
  assert.deepEqual(back.nodes.map(n => n.title), ['Auth \'svc\'', 'Users', 'Login']);
  assert.equal(back.edges.length, 2);
  const titleOf = (id: string) => back.nodes.find(n => n.id === id)!.title;
  assert.ok(back.edges.some(e => titleOf(e.source) === 'Login' && titleOf(e.target) === 'Auth \'svc\''));
});

test('fromPajek reads *Edges and the *Arcslist adjacency form', () => {
  const g1 = fromPajek('*Vertices 2\n1 "A"\n2 "B"\n*Edges\n1 2 5').graph;
  assert.equal(g1.edges.length, 1);
  const g2 = fromPajek('*Vertices 3\n1 "A"\n2 "B"\n3 "C"\n*Arcslist\n1 2 3').graph; // A -> B and A -> C
  assert.equal(g2.edges.length, 2);
  assert.ok(g2.edges.every(e => g2.nodes.find(n => n.id === e.source)!.title === 'A'));
});

test('detectFormat recognises Pajek and fromPajek rejects input without vertices', () => {
  assert.equal(detectFormat(toPajek(doc())), 'pajek');
  assert.equal(detectFormat('%comment\n*Vertices 1\n1 "x"'), 'pajek');
  assert.throws(() => fromPajek('*Arcs\n1 2'), /no declara vértices/);
});

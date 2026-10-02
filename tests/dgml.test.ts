import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createDocument } from '../packages/diagram/src/document.ts';
import { fromDgml, toDgml } from '../packages/diagram/src/dgml.ts';
import { detectFormat, parseAny, serializeAs } from '../packages/diagram/src/convert.ts';

const doc = () => createDocument({
  nodes: [{ id: 'ui', type: 'screen', title: 'Login & Home' }, { id: 'auth', type: 'service', title: 'Auth Service' }, { id: 'db', type: 'database', title: 'Users' }],
  edges: [{ id: 'e0', source: 'ui', target: 'auth', label: 'verifica' }, { id: 'e1', source: 'auth', target: 'db' }],
});

test('toDgml emits a DirectedGraph with Node (Id/Label/Category) and Link elements, XML-escaped', () => {
  const xml = toDgml(doc());
  assert.match(xml, /<DirectedGraph xmlns="http:\/\/schemas\.microsoft\.com\/vs\/2009\/dgml">/);
  assert.match(xml, /<Node Id="ui" Label="Login &amp; Home" Category="screen" \/>/); // & escaped, type as Category
  assert.match(xml, /<Node Id="auth" Label="Auth Service" Category="service" \/>/);
  assert.match(xml, /<Link Source="ui" Target="auth" Label="verifica" \/>/);
  assert.match(xml, /<Link Source="auth" Target="db" \/>/); // no label attr when absent
});

test('fromDgml round-trips structure, titles, edge labels and node type (via Category)', () => {
  const back = fromDgml(toDgml(doc())).graph;
  assert.deepEqual(back.nodes.map(n => n.title), ['Login & Home', 'Auth Service', 'Users']); // entities decoded
  assert.deepEqual(back.nodes.map(n => n.type), ['screen', 'service', 'database']); // Category -> type preserved
  assert.equal(back.edges.length, 2);
  const titleOf = (id: string) => back.nodes.find(n => n.id === id)!.title;
  const e = back.edges.find(x => x.label === 'verifica')!;
  assert.equal(titleOf(e.source), 'Login & Home');
  assert.equal(titleOf(e.target), 'Auth Service');
});

test('fromDgml tolerates attribute order/quotes, unknown Category, self-closing and links to new nodes', () => {
  const xml = `<?xml version="1.0"?><DirectedGraph>
    <Nodes><Node Category='widget' Id="a" Label='Start'/><Node Id="b"/></Nodes>
    <Links><Link Target="b" Source="a" Label="go"></Link><Link Source="a" Target="c"/></Links>
  </DirectedGraph>`;
  const g = fromDgml(xml).graph;
  assert.equal(g.nodes.length, 3);                       // c created from the link
  assert.equal(g.nodes[0].type, 'process');              // unknown Category -> process
  assert.equal(g.nodes[0].title, 'Start');
  assert.equal(g.nodes[1].title, 'b');                   // no Label -> id
  assert.equal(g.edges.length, 2);
  assert.equal(g.edges.find(e => e.label === 'go')!.source, 'a');
});

test('fromDgml throws when there are no nodes', () => {
  assert.throws(() => fromDgml('<DirectedGraph><Nodes></Nodes></DirectedGraph>'), /no declara nodos/);
});

test('detectFormat recognises DGML and convert round-trips through it', () => {
  const xml = toDgml(doc());
  assert.equal(detectFormat(xml), 'dgml');
  const back = parseAny(serializeAs(doc(), 'dgml'), 'dgml').graph;
  assert.equal(back.nodes.length, 3);
  assert.equal(back.edges.length, 2);
});

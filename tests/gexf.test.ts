import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createDocument } from '../packages/diagram/src/document.ts';
import { toGexf, fromGexf } from '../packages/diagram/src/gexf.ts';
import { convertText, detectFormat } from '../packages/diagram/src/convert.ts';

const doc = () => createDocument({
  nodes: [
    { id: 'a', type: 'service', title: 'Auth', group: 'Backend' },
    { id: 'b', type: 'database', title: 'Users', group: 'Backend' },
    { id: 'c', type: 'screen', title: 'Login' },
  ],
  edges: [{ id: 'ab', source: 'a', target: 'b', label: 'reads' }, { id: 'ca', source: 'c', target: 'a' }],
}, {
  nodes: { a: { x: 100, y: 100, width: 200, height: 92 }, b: { x: 400, y: 100, width: 200, height: 92 }, c: { x: 100, y: 300, width: 200, height: 92 } },
  edges: { ab: { sourcePort: 'right', targetPort: 'left' }, ca: { sourcePort: 'top', targetPort: 'bottom' } },
}, 'architecture');

test('toGexf emits a GEXF 1.3 document with labels, viz positions and group/type attvalues', () => {
  const xml = toGexf(doc());
  assert.match(xml, /<gexf[^>]*version="1.3"/);
  assert.match(xml, /<node id="a" label="Auth">/);
  assert.match(xml, /<attvalue for="group" value="Backend"\/>/);
  assert.match(xml, /<attvalue for="type" value="service"\/>/);
  assert.match(xml, /<viz:position x="200" y="146"/); // centre of a (100+100, 100+46)
  assert.match(xml, /<edge id="e0" source="a" target="b" label="reads"\/>/);
});
test('fromGexf imports nodes/edges, restores group, type and positions', () => {
  const d = fromGexf(toGexf(doc()));
  const byId = Object.fromEntries(d.graph.nodes.map(n => [n.id, n]));
  assert.equal(byId.a.title, 'Auth');
  assert.equal(byId.a.type, 'service'); // type restored from attvalue
  assert.equal(byId.a.group, 'Backend');
  assert.equal(byId.c.group, undefined);
  assert.equal(d.layout.nodes.a.x, 100); // centre shifted back to top-left
  assert.equal(d.layout.nodes.a.y, 100);
  assert.equal(d.graph.edges.find(e => e.source === 'a')!.label, 'reads');
});
test('GEXF round-trips structure, labels, groups, types and positions', () => {
  const src = doc();
  const round = fromGexf(toGexf(src));
  assert.deepEqual(round.graph.nodes.map(n => ({ id: n.id, type: n.type, title: n.title, group: n.group ?? null })),
    src.graph.nodes.map(n => ({ id: n.id, type: n.type, title: n.title, group: n.group ?? null })));
  assert.deepEqual(round.graph.edges.map(e => ({ s: e.source, t: e.target, l: e.label ?? null })),
    src.graph.edges.map(e => ({ s: e.source, t: e.target, l: e.label ?? null })));
  for (const id of Object.keys(src.layout.nodes)) assert.equal(round.layout.nodes[id].x, src.layout.nodes[id].x);
});
test('fromGexf without positions falls back to a layered layout; rejects empty', () => {
  const xml = '<gexf version="1.3"><graph defaultedgetype="directed"><nodes><node id="x" label="X"/><node id="y" label="Y"/></nodes><edges><edge id="e" source="x" target="y"/></edges></graph></gexf>';
  const d = fromGexf(xml);
  assert.equal(d.graph.nodes.length, 2);
  assert.ok(d.layout.nodes.y.y > d.layout.nodes.x.y || d.layout.nodes.y.x !== d.layout.nodes.x.x); // laid out, not overlapping at origin
  assert.throws(() => fromGexf('<gexf><graph><nodes></nodes></graph></gexf>'), /no contiene nodos/);
});
test('detectFormat and convertText recognise GEXF and convert to Mermaid', () => {
  const xml = toGexf(doc());
  assert.equal(detectFormat(xml), 'gexf');
  const mermaid = convertText(xml, 'gexf', 'mermaid');
  assert.match(mermaid, /Auth/);
  assert.match(mermaid, /reads/);
});

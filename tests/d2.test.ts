import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createDocument } from '../packages/diagram/src/document.ts';
import { toD2, parseD2 } from '../packages/diagram/src/d2.ts';
import { convertText, detectFormat } from '../packages/diagram/src/convert.ts';

const doc = () => createDocument({
  nodes: [
    { id: 'a', type: 'service', title: 'Auth', group: 'Backend' },
    { id: 'b', type: 'database', title: 'Users', group: 'Backend' },
    { id: 'c', type: 'decision', title: 'OK?' },
  ],
  edges: [{ id: 'ab', source: 'a', target: 'b', label: 'reads' }, { id: 'ca', source: 'c', target: 'a' }],
}, {
  nodes: { a: { x: 0, y: 0, width: 200, height: 92 }, b: { x: 300, y: 0, width: 200, height: 92 }, c: { x: 0, y: 300, width: 200, height: 92, shape: 'diamond' } },
  edges: { ab: { sourcePort: 'right', targetPort: 'left' }, ca: { sourcePort: 'top', targetPort: 'bottom' } },
}, 'flow');

test('toD2 emits containers for groups, labels, shapes and dotted-path connections', () => {
  const d2 = toD2(doc());
  assert.match(d2, /Backend: \{/);
  assert.match(d2, /a: Auth/);
  assert.match(d2, /c: "OK\?" \{ shape: diamond \}/);
  assert.match(d2, /Backend\.a -> Backend\.b: reads/);
  assert.match(d2, /c -> Backend\.a/);
});
test('parseD2 imports nodes, container groups, shapes and edges', () => {
  const d = parseD2(toD2(doc()));
  const byId = Object.fromEntries(d.graph.nodes.map(n => [n.id, n]));
  assert.equal(byId.a.title, 'Auth');
  assert.equal(byId.a.group, 'Backend');
  assert.equal(byId.b.group, 'Backend');
  assert.equal(byId.c.group, undefined);
  assert.equal(byId.c.type, 'decision'); // diamond -> decision
  assert.equal(d.layout.nodes.c.shape, 'diamond');
  assert.deepEqual(d.graph.edges.map(e => e.source + '->' + e.target + (e.label ? ':' + e.label : '')), ['a->b:reads', 'c->a']);
});
test('D2 round-trips structure, labels, groups and shapes', () => {
  const src = doc();
  const round = parseD2(toD2(src));
  const key = (a: { id: string }, b: { id: string }) => a.id < b.id ? -1 : 1;
  assert.deepEqual(round.graph.nodes.map(n => ({ id: n.id, t: n.title, g: n.group ?? null })).sort(key), src.graph.nodes.map(n => ({ id: n.id, t: n.title, g: n.group ?? null })).sort(key)); // order differs (containers emitted last)
  assert.deepEqual(round.graph.edges.map(e => ({ s: e.source, t: e.target, l: e.label ?? null })), src.graph.edges.map(e => ({ s: e.source, t: e.target, l: e.label ?? null })));
});
test('parseD2 handles bare ids, inline shape and comments; rejects empty', () => {
  const d = parseD2(`# a flow\nstart\nmid: Middle { shape: oval }\nstart -> mid\nmid -> start: loop`);
  assert.equal(d.graph.nodes.length, 2);
  assert.equal(d.graph.nodes.find(n => n.id === 'mid')!.title, 'Middle');
  assert.equal(d.layout.nodes.mid.shape, 'ellipse'); // oval -> ellipse
  assert.equal(d.graph.edges.length, 2);
  assert.throws(() => parseD2('# only a comment\n'), /no contiene nodos/);
});
test('detectFormat and convertText recognise D2 and convert to Mermaid', () => {
  const d2 = toD2(doc());
  assert.equal(detectFormat(d2), 'd2');
  const mermaid = convertText(d2, 'd2', 'mermaid');
  assert.match(mermaid, /Auth/);
  assert.match(mermaid, /reads/);
});

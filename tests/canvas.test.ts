import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createDocument } from '../packages/diagram/src/document.ts';
import { toCanvas, fromCanvas } from '../packages/diagram/src/canvas.ts';

const doc = () => createDocument({
  nodes: [{ id: 'a', type: 'service', title: 'Auth', source: 'src/Auth.ts' }, { id: 'b', type: 'database', title: 'Users' }],
  edges: [{ id: 'ab', source: 'a', target: 'b', label: 'reads' }],
}, {
  nodes: { a: { x: 10, y: 20, width: 200, height: 92 }, b: { x: 300, y: 20, width: 200, height: 92 } },
  edges: { ab: { sourcePort: 'right', targetPort: 'left' } },
});

test('toCanvas maps nodes to text nodes, ports to sides, and edges', () => {
  const c = toCanvas(doc());
  assert.equal(c.nodes.length, 2);
  assert.deepEqual(c.nodes[0], { id: 'a', type: 'text', x: 10, y: 20, width: 200, height: 92, text: 'Auth\nsrc/Auth.ts' });
  assert.deepEqual(c.edges[0], { id: 'ab', fromNode: 'a', toNode: 'b', fromSide: 'right', toSide: 'left', label: 'reads' });
});
test('fromCanvas imports nodes/edges, clamps sizes and maps sides to ports', () => {
  const canvas = { nodes: [{ id: 'x', type: 'text', x: 0, y: 0, width: 50, height: 10, text: 'Small\nextra' }, { id: 'y', type: 'text', x: 300, y: 0, width: 200, height: 100, label: 'Grupo' }], edges: [{ id: 'xy', fromNode: 'x', toNode: 'y', fromSide: 'right', toSide: 'left', label: 'to' }] };
  const d = fromCanvas(canvas);
  assert.equal(d.graph.nodes.find(n => n.id === 'x')!.title, 'Small'); // first line only
  assert.equal(d.graph.nodes.find(n => n.id === 'y')!.type, 'generic'); // text -> generic
  assert.equal(d.layout.nodes.x.width, 140); // clamped from 50
  assert.equal(d.layout.nodes.x.height, 76); // clamped from 10
  assert.deepEqual(d.layout.edges.xy, { sourcePort: 'right', targetPort: 'left' });
  assert.equal(d.graph.edges[0].label, 'to');
});
test('Canvas round-trips structure, labels, positions and ports', () => {
  const source = doc();
  const round = fromCanvas(toCanvas(source));
  assert.deepEqual(round.graph.edges.map(e => ({ s: e.source, t: e.target, l: e.label })), source.graph.edges.map(e => ({ s: e.source, t: e.target, l: e.label })));
  for (const id of Object.keys(source.layout.nodes)) {
    assert.equal(round.layout.nodes[id].x, source.layout.nodes[id].x);
    assert.equal(round.layout.nodes[id].width, source.layout.nodes[id].width);
  }
  assert.deepEqual(round.layout.edges.ab, source.layout.edges.ab);
});
test('fromCanvas rejects malformed input and skips bad edges', () => {
  assert.throws(() => fromCanvas({} as never), /JSON Canvas inválido/);
  assert.throws(() => fromCanvas('not json'));
  const d = fromCanvas({ nodes: [{ id: 'a', x: 0, y: 0, width: 200, height: 92, text: 'A' }], edges: [{ id: 'bad', fromNode: 'a', toNode: 'ghost' }] });
  assert.equal(d.graph.edges.length, 0); // endpoint missing -> skipped
});

import { toCanvas as toCanvasG, fromCanvas as fromCanvasG } from '../packages/diagram/src/canvas.ts';
import { createDocument as makeDocCanvas } from '../packages/diagram/src/document.ts';
test('toCanvas emits native group boxes and fromCanvas assigns membership by containment', () => {
  const doc = makeDocCanvas({
    nodes: [{ id: 'a', type: 'process', title: 'A', group: 'Backend' }, { id: 'b', type: 'process', title: 'B', group: 'Backend' }, { id: 'c', type: 'process', title: 'C' }],
    edges: [{ id: 'ab', source: 'a', target: 'b' }],
  });
  const canvas = toCanvasG(doc);
  const groups = canvas.nodes.filter(n => n.type === 'group');
  assert.equal(groups.length, 1);
  assert.equal(groups[0].label, 'Backend');
  const back = fromCanvasG(canvas);
  const byId = Object.fromEntries(back.graph.nodes.map(n => [n.id, n]));
  assert.equal(byId.a.group, 'Backend');
  assert.equal(byId.b.group, 'Backend');
  assert.equal(byId.c.group, undefined);
  assert.equal(back.graph.nodes.length, 3); // the group box is not a node
});
test('fromCanvas reads a hand-written group box and nests contained nodes', () => {
  const canvas = { nodes: [
    { id: 'g', type: 'group', label: 'Zona', x: 0, y: 0, width: 600, height: 400 },
    { id: 'n1', type: 'text', x: 40, y: 40, width: 160, height: 80, text: 'Uno' },
    { id: 'n2', type: 'text', x: 800, y: 40, width: 160, height: 80, text: 'Fuera' },
  ], edges: [] };
  const back = fromCanvasG(canvas);
  const byId = Object.fromEntries(back.graph.nodes.map(n => [n.id, n]));
  assert.equal(byId.n1.group, 'Zona'); // inside the box
  assert.equal(byId.n2.group, undefined); // outside
  assert.equal(back.graph.nodes.length, 2); // group box excluded
});

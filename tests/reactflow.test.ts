import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createDocument } from '../packages/diagram/src/document.ts';
import { toReactFlow, fromReactFlow } from '../packages/diagram/src/reactflow.ts';
import { convertText, detectFormat } from '../packages/diagram/src/convert.ts';

const doc = () => createDocument({
  nodes: [{ id: 'a', type: 'start', title: 'Inicio' }, { id: 'b', type: 'decision', title: '¿Ok?' }, { id: 'c', type: 'end', title: 'Fin', source: 'src/end.ts' }],
  edges: [{ id: 'ab', source: 'a', target: 'b' }, { id: 'bc', source: 'b', target: 'c', label: 'sí' }],
}, {
  nodes: { a: { x: 0, y: 0, width: 200, height: 92 }, b: { x: 0, y: 200, width: 200, height: 92 }, c: { x: 0, y: 400, width: 200, height: 92 } },
  edges: { ab: { sourcePort: 'bottom', targetPort: 'top' }, bc: { sourcePort: 'bottom', targetPort: 'top' } },
}, 'flow');

test('toReactFlow maps roles to input/output, keeps positions, labels and handles', () => {
  const rf = toReactFlow(doc());
  assert.equal(rf.nodes.length, 3);
  assert.equal(rf.nodes.find(n => n.id === 'a')!.type, 'input');
  assert.equal(rf.nodes.find(n => n.id === 'c')!.type, 'output');
  assert.deepEqual(rf.nodes.find(n => n.id === 'b')!.position, { x: 0, y: 200 });
  assert.equal(rf.nodes.find(n => n.id === 'c')!.data!.label, 'Fin\nsrc/end.ts');
  const bc = rf.edges.find(e => e.id === 'bc')!;
  assert.equal(bc.label, 'sí');
  assert.equal(bc.sourceHandle, 'bottom');
  assert.equal(bc.targetHandle, 'top');
});

test('fromReactFlow imports nodes/edges, maps input/output and handles to ports, clamps sizes', () => {
  const d = fromReactFlow({
    nodes: [
      { id: 'x', type: 'input', position: { x: 10, y: 20 }, data: { label: 'X' }, width: 50, height: 10 },
      { id: 'y', type: 'output', position: { x: 300, y: 20 }, data: { label: 'Y' } },
    ],
    edges: [{ id: 'xy', source: 'x', target: 'y', label: 'to', sourceHandle: 'right', targetHandle: 'left' }],
  });
  assert.equal(d.graph.nodes.find(n => n.id === 'x')!.type, 'start');
  assert.equal(d.graph.nodes.find(n => n.id === 'y')!.type, 'end');
  assert.equal(d.layout.nodes.x.width, 140); // clamped
  assert.equal(d.layout.nodes.x.height, 76); // clamped
  assert.deepEqual(d.layout.edges.xy, { sourcePort: 'right', targetPort: 'left' });
  assert.equal(d.graph.edges[0].label, 'to');
});

test('React Flow round-trips structure, labels, positions and ports', () => {
  const source = doc();
  const round = fromReactFlow(toReactFlow(source));
  assert.deepEqual(round.graph.edges.map(e => ({ s: e.source, t: e.target, l: e.label })), source.graph.edges.map(e => ({ s: e.source, t: e.target, l: e.label })));
  for (const id of Object.keys(source.layout.nodes)) {
    assert.equal(round.layout.nodes[id].x, source.layout.nodes[id].x);
    assert.equal(round.layout.nodes[id].y, source.layout.nodes[id].y);
  }
  assert.deepEqual(round.layout.edges.bc, source.layout.edges.bc);
});

test('groups survive via parentId with child positions resolved to absolute', () => {
  const grouped = createDocument({
    nodes: [{ id: 'a', type: 'process', title: 'A', group: 'Backend' }, { id: 'b', type: 'process', title: 'B', group: 'Backend' }, { id: 'c', type: 'process', title: 'C' }],
    edges: [{ id: 'ab', source: 'a', target: 'b' }],
  }, {
    nodes: { a: { x: 100, y: 100, width: 200, height: 92 }, b: { x: 100, y: 300, width: 200, height: 92 }, c: { x: 600, y: 100, width: 200, height: 92 } },
    edges: { ab: { sourcePort: 'bottom', targetPort: 'top' } },
  }, 'flow');
  const rf = toReactFlow(grouped);
  const groupNode = rf.nodes.find(n => n.type === 'group')!;
  assert.equal(groupNode.data!.label, 'Backend');
  // Child positions are relative to the group origin in React Flow.
  const a = rf.nodes.find(n => n.id === 'a')!;
  assert.equal(a.parentId, groupNode.id);
  assert.ok(a.position.x >= 0 && a.position.y >= 0);
  const back = fromReactFlow(rf);
  const byId = Object.fromEntries(back.graph.nodes.map(n => [n.id, n]));
  assert.equal(byId.a.group, 'Backend');
  assert.equal(byId.b.group, 'Backend');
  assert.equal(byId.c.group, undefined);
  assert.equal(back.graph.nodes.length, 3); // the group container is not a node
  assert.equal(back.layout.nodes.a.x, 100); // absolute position restored
  assert.equal(back.layout.nodes.a.y, 100);
});

test('fromReactFlow rejects malformed input and skips dangling edges', () => {
  assert.throws(() => fromReactFlow({} as never), /React Flow inválido/);
  assert.throws(() => fromReactFlow({ nodes: [], edges: [] }), /sin nodos/);
  const d = fromReactFlow({ nodes: [{ id: 'a', position: { x: 0, y: 0 }, data: { label: 'A' } }], edges: [{ id: 'bad', source: 'a', target: 'ghost' }] });
  assert.equal(d.graph.edges.length, 0);
});

test('detectFormat and convertText recognise React Flow JSON and convert to Mermaid', () => {
  const rf = JSON.stringify(toReactFlow(doc()));
  assert.equal(detectFormat(rf), 'reactflow');
  const mermaid = convertText(rf, 'reactflow', 'mermaid');
  assert.match(mermaid, /flowchart|graph/);
  assert.match(mermaid, /Inicio/);
});

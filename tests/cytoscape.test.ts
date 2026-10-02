import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fromCytoscape, toCytoscape } from '../packages/diagram/src/cytoscape.ts';
import { createDocument } from '../packages/diagram/src/document.ts';
import { convertText } from '../packages/diagram/src/convert.ts';

test('fromCytoscape reads the nodes/edges object form with positions', () => {
  const cy = { elements: { nodes: [
    { data: { id: 'a', label: 'Auth' }, position: { x: 300, y: 200 } },
    { data: { id: 'b', label: 'Users' }, position: { x: 300, y: 400 } },
  ], edges: [{ data: { id: 'e1', source: 'a', target: 'b', label: 'verifica' } }] } };
  const doc = fromCytoscape(cy);
  assert.deepEqual(doc.graph.nodes.map(n => n.title), ['Auth', 'Users']);
  assert.equal(doc.graph.edges[0].label, 'verifica');
  // position is the node center; stored layout is top-left (center - size/2), normalized to >= 80.
  assert.ok(doc.layout.nodes.b.y > doc.layout.nodes.a.y);
});
test('fromCytoscape accepts a flat element array and a JSON string', () => {
  const flat = { elements: [{ data: { id: 'x', label: 'X' } }, { data: { id: 'y' } }, { data: { source: 'x', target: 'y' } }] };
  const doc = fromCytoscape(JSON.stringify(flat));
  assert.deepEqual(doc.graph.nodes.map(n => n.id), ['x', 'y']);
  assert.equal(doc.graph.edges.length, 1);
  assert.equal(doc.graph.nodes[1].title, 'y'); // falls back to id when no label
});
test('fromCytoscape falls back to a layered layout when positions are absent and throws when empty', () => {
  const doc = fromCytoscape({ elements: { nodes: [{ data: { id: 'a' } }, { data: { id: 'b' } }], edges: [{ data: { source: 'a', target: 'b' } }] } });
  assert.ok(doc.layout.nodes.b.y > doc.layout.nodes.a.y); // layered: b below a
  assert.throws(() => fromCytoscape({ elements: { nodes: [], edges: [] } }), /no contiene nodos/);
});
test('toCytoscape emits elements with positions and round-trips through fromCytoscape', () => {
  const d = createDocument({ nodes: [{ id: 'a', type: 'service', title: 'Auth' }, { id: 'b', type: 'database', title: 'Users' }], edges: [{ id: 'ab', source: 'a', target: 'b', label: 'usa' }] });
  const cy = toCytoscape(d);
  assert.equal(cy.elements.nodes.length, 2);
  assert.ok(cy.elements.nodes[0].position);
  const back = fromCytoscape(cy);
  assert.deepEqual(back.graph.nodes.map(n => n.title), ['Auth', 'Users']);
  assert.equal(back.graph.edges[0].label, 'usa');
});
test('convertText bridges Cytoscape to Mermaid and Mermaid to Cytoscape', () => {
  const cy = JSON.stringify({ elements: { nodes: [{ data: { id: 'a', label: 'A' } }, { data: { id: 'b', label: 'B' } }], edges: [{ data: { source: 'a', target: 'b', label: 'go' } }] } });
  assert.ok(convertText(cy, 'cytoscape', 'mermaid').includes('go'));
  const out = convertText('flowchart TD\n A[Uno] --> B[Dos]', 'mermaid', 'cytoscape');
  assert.ok(out.includes('"elements"'));
  assert.ok(out.includes('"source"'));
});

test('toCytoscape emits compound parents and fromCytoscape round-trips groups', () => {
  const doc = createDocument({
    nodes: [{ id: 'a', type: 'process', title: 'A', group: 'Backend' }, { id: 'b', type: 'process', title: 'B', group: 'Backend' }, { id: 'c', type: 'process', title: 'C' }],
    edges: [{ id: 'ab', source: 'a', target: 'b' }],
  });
  const cy = toCytoscape(doc);
  const parent = cy.elements.nodes.find(n => n.data.label === 'Backend' && !n.data.parent);
  assert.ok(parent, 'a compound parent node is emitted');
  assert.equal(cy.elements.nodes.find(n => n.data.id === 'a')!.data.parent, parent!.data.id);
  const back = fromCytoscape(cy);
  const byId = Object.fromEntries(back.graph.nodes.map(n => [n.id, n]));
  assert.equal(byId.a.group, 'Backend');
  assert.equal(byId.b.group, 'Backend');
  assert.equal(byId.c.group, undefined);
  assert.equal(back.graph.nodes.length, 3); // compound parent is not a node
});
test('fromCytoscape reads a hand-written compound parent as a group', () => {
  const cy = { elements: { nodes: [
    { data: { id: 'grp', label: 'Servicios' } },
    { data: { id: 'x', label: 'X', parent: 'grp' } },
    { data: { id: 'y', label: 'Y' } },
  ], edges: [{ data: { source: 'x', target: 'y' } }] } };
  const back = fromCytoscape(cy);
  const byId = Object.fromEntries(back.graph.nodes.map(n => [n.id, n]));
  assert.equal(byId.x.group, 'Servicios');
  assert.equal(byId.y.group, undefined);
  assert.equal(back.graph.nodes.length, 2); // parent excluded
});

test('toCytoscape emits width/height + position and fromCytoscape restores the exact box (layout round-trip)', () => {
  const d = createDocument({
    nodes: [{ id: 'a', type: 'process', title: 'A' }, { id: 'b', type: 'process', title: 'B' }],
    edges: [{ id: 'ab', source: 'a', target: 'b' }],
  });
  d.layout.nodes.a = { x: 120, y: 100, width: 180, height: 90 };
  d.layout.nodes.b = { x: 500, y: 300, width: 160, height: 80 };
  const cy = toCytoscape(d);
  const aEl = cy.elements.nodes.find(n => n.data.id === 'a')!;
  assert.equal(aEl.data.width, 180);
  assert.equal(aEl.data.height, 90);
  assert.deepEqual(aEl.position, { x: 210, y: 145 }); // centre of (120,100,180,90)
  const back = fromCytoscape(cy);
  assert.deepEqual(back.layout.nodes.a, { x: 120, y: 100, width: 180, height: 90 });
  assert.deepEqual(back.layout.nodes.b, { x: 500, y: 300, width: 160, height: 80 });
});

test('fromCytoscape clamps tiny data width/height to the valid minimum', () => {
  const back = fromCytoscape({ elements: { nodes: [
    { data: { id: 'x', label: 'X', width: 10, height: 10 }, position: { x: 100, y: 100 } },
    { data: { id: 'y', label: 'Y', width: 10, height: 10 }, position: { x: 400, y: 100 } },
  ], edges: [] } });
  assert.ok(back.layout.nodes.x.width >= 140 && back.layout.nodes.x.height >= 76);
});

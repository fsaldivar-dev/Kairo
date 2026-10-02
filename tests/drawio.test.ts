import { test } from 'node:test';
import assert from 'node:assert/strict';
import { toDrawio, fromDrawio } from '../packages/diagram/src/drawio.ts';
import { createDocument } from '../packages/diagram/src/document.ts';
import { convertText } from '../packages/diagram/src/convert.ts';

function doc() {
  const d = createDocument({
    nodes: [{ id: 'auth', type: 'service', title: 'Auth & Co' }, { id: 'check', type: 'decision', title: '¿Ok?' }, { id: 'users', type: 'database', title: 'Users' }],
    edges: [{ id: 'ac', source: 'auth', target: 'check' }, { id: 'cu', source: 'check', target: 'users', label: 'Sí' }],
  });
  d.layout.nodes.check = { ...d.layout.nodes.check, shape: 'diamond' };
  return d;
}

test('toDrawio emits an mxfile with vertices, edges and geometry', () => {
  const xml = toDrawio(doc());
  assert.ok(xml.startsWith('<mxfile'));
  assert.ok(xml.includes('<mxGraphModel'));
  assert.ok(xml.includes('vertex="1"'));
  assert.ok(xml.includes('edge="1"'));
  assert.ok(xml.includes('value="Auth &amp; Co"')); // XML-escaped
  assert.ok(xml.includes('rhombus')); // decision -> diamond -> rhombus style
  assert.match(xml, /<mxGeometry x="\d+" y="\d+" width="\d+" height="\d+"/);
});
test('fromDrawio round-trips structure, labels, shapes and geometry', () => {
  const d = doc(), back = fromDrawio(toDrawio(d));
  assert.deepEqual(back.graph.nodes.map(n => n.title).sort(), ['Auth & Co', 'Users', '¿Ok?'].sort());
  assert.equal(back.graph.edges.length, 2);
  assert.equal(back.graph.edges.find(e => e.label)!.label, 'Sí');
  assert.equal(back.layout.nodes.check.shape, 'diamond');
  // Geometry preserved (same x as exported).
  assert.equal(back.layout.nodes.auth.x, Math.round(d.layout.nodes.auth.x));
});
test('fromDrawio clamps undersized geometry to the minimum node size', () => {
  const xml = `<mxfile><diagram><mxGraphModel><root><mxCell id="0"/><mxCell id="1" parent="0"/>
    <mxCell id="n1" value="Tiny" style="rounded=0;" vertex="1" parent="1"><mxGeometry x="20" y="20" width="120" height="60" as="geometry"/></mxCell>
  </root></mxGraphModel></diagram></mxfile>`;
  const back = fromDrawio(xml);
  assert.ok(back.layout.nodes.n1.width >= 140);
  assert.ok(back.layout.nodes.n1.height >= 76);
});
test('fromDrawio rejects compressed diagrams and empty graphs', () => {
  assert.throws(() => fromDrawio('<mxfile><diagram>7VpZc9o4FP41PCbjRbbFYwIkbTdNMwnd7WvG2Aa8tS3Hkl9/jiwb</diagram></mxfile>'), /comprimido/);
  assert.throws(() => fromDrawio('<mxfile><diagram><mxGraphModel><root><mxCell id="0"/></root></mxGraphModel></diagram></mxfile>'), /no contiene nodos/);
});
test('convertText bridges draw.io to Mermaid and DOT to draw.io', () => {
  const xml = toDrawio(doc());
  assert.ok(convertText(xml, 'drawio', 'mermaid').includes('Sí'));
  const out = convertText('digraph { A -> B [label="x"] }', 'dot', 'drawio');
  assert.ok(out.includes('<mxfile'));
  assert.ok(out.includes('edge="1"'));
});

test('toDrawio emits group containers and fromDrawio round-trips group + absolute positions', () => {
  const doc = createDocument({
    nodes: [
      { id: 'a', type: 'process', title: 'A', group: 'Backend' },
      { id: 'b', type: 'process', title: 'B', group: 'Backend' },
      { id: 'c', type: 'process', title: 'C' },
    ],
    edges: [{ id: 'ab', source: 'a', target: 'b' }],
  });
  const xml = toDrawio(doc);
  assert.match(xml, /value="Backend"[^>]*vertex="1"/);
  assert.match(xml, /style="group;/);
  const back = fromDrawio(xml);
  const byId = Object.fromEntries(back.graph.nodes.map(n => [n.id, n]));
  assert.equal(byId.a.group, 'Backend');
  assert.equal(byId.b.group, 'Backend');
  assert.equal(byId.c.group, undefined);
  assert.equal(back.graph.nodes.length, 3); // the container is not a node
  // absolute position preserved within a tolerance (child relative + container origin).
  assert.ok(Math.abs(back.layout.nodes.a.x - Math.round(doc.layout.nodes.a.x)) <= 1);
});
test('fromDrawio treats a cell with child vertices as a container even without group style', () => {
  const xml = `<mxfile><diagram><mxGraphModel><root><mxCell id="0"/><mxCell id="1" parent="0"/>
    <mxCell id="box" value="Zona" vertex="1" parent="1"><mxGeometry x="40" y="40" width="300" height="200" as="geometry"/></mxCell>
    <mxCell id="n1" value="Uno" style="rounded=0;" vertex="1" parent="box"><mxGeometry x="20" y="30" width="160" height="80" as="geometry"/></mxCell>
  </root></mxGraphModel></diagram></mxfile>`;
  const back = fromDrawio(xml);
  assert.equal(back.graph.nodes.length, 1); // box is a container, not a node
  assert.equal(back.graph.nodes[0].title, 'Uno');
  assert.equal(back.graph.nodes[0].group, 'Zona');
  assert.equal(back.layout.nodes.n1.x, 60); // 40 (container) + 20 (relative)
});

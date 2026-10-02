import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fromGraphml, toGraphml } from '../packages/diagram/src/graphml.ts';
import { createDocument } from '../packages/diagram/src/document.ts';
import { convertText } from '../packages/diagram/src/convert.ts';

const STANDARD = `<?xml version="1.0" encoding="UTF-8"?>
<graphml xmlns="http://graphml.graphdrawing.org/xmlns">
  <key id="d0" for="node" attr.name="label" attr.type="string"/>
  <key id="d1" for="edge" attr.name="label" attr.type="string"/>
  <graph id="G" edgedefault="directed">
    <node id="a"><data key="d0">Auth &amp; Co</data></node>
    <node id="b"><data key="d0">Users</data></node>
    <node id="c"/>
    <edge source="a" target="b"><data key="d1">verifica</data></edge>
    <edge source="b" target="c"/>
  </graph>
</graphml>`;

test('fromGraphml reads labelled nodes/edges, decodes entities and lays out in layers', () => {
  const doc = fromGraphml(STANDARD);
  assert.deepEqual(doc.graph.nodes.map(n => n.title), ['Auth & Co', 'Users', 'c']);
  assert.equal(doc.graph.edges.length, 2);
  assert.equal(doc.graph.edges[0].label, 'verifica');
  assert.equal(doc.graph.edges[1].label, undefined);
  assert.ok(doc.layout.nodes.b.y > doc.layout.nodes.a.y); // b is one layer below a
});
test('fromGraphml falls back to yEd NodeLabel/EdgeLabel text', () => {
  const yed = `<graphml><graph edgedefault="directed">
    <node id="n0"><data key="d6"><y:ShapeNode><y:NodeLabel alignment="center">Gateway</y:NodeLabel></y:ShapeNode></data></node>
    <node id="n1"><data key="d6"><y:ShapeNode><y:NodeLabel>Firebase</y:NodeLabel></y:ShapeNode></data></node>
    <edge source="n0" target="n1"><data key="d10"><y:PolyLineEdge><y:EdgeLabel>OAuth</y:EdgeLabel></y:PolyLineEdge></data></edge>
  </graph></graphml>`;
  const doc = fromGraphml(yed);
  assert.deepEqual(doc.graph.nodes.map(n => n.title), ['Gateway', 'Firebase']);
  assert.equal(doc.graph.edges[0].label, 'OAuth');
});
test('toGraphml emits valid directed GraphML that round-trips through fromGraphml', () => {
  const doc = createDocument({
    nodes: [{ id: 'auth', type: 'service', title: 'Auth "svc"' }, { id: 'users', type: 'database', title: 'Users' }],
    edges: [{ id: 'au', source: 'auth', target: 'users', label: 'verifica' }],
  });
  const xml = toGraphml(doc);
  assert.ok(xml.startsWith('<?xml'));
  assert.ok(xml.includes('edgedefault="directed"'));
  assert.ok(xml.includes('Auth &quot;svc&quot;')); // quotes escaped
  const back = fromGraphml(xml);
  assert.deepEqual(back.graph.nodes.map(n => n.title), ['Auth "svc"', 'Users']);
  assert.equal(back.graph.edges[0].label, 'verifica');
  assert.equal(back.graph.edges[0].source, 'auth');
});
test('toGraphml is pure and throws on empty input', () => {
  const doc = createDocument({ nodes: [{ id: 'x', type: 'process', title: 'X' }], edges: [] });
  const original = JSON.stringify(doc);
  toGraphml(doc);
  assert.equal(JSON.stringify(doc), original);
  assert.throws(() => fromGraphml('<graphml><graph/></graphml>'), /no contiene nodos/);
});
test('convertText bridges GraphML to Mermaid and DOT to GraphML', () => {
  assert.ok(convertText(STANDARD, 'graphml', 'mermaid').includes('verifica'));
  const xml = convertText('digraph { A -> B [label="x"] }', 'dot', 'graphml');
  assert.ok(xml.includes('edgedefault="directed"'));
  assert.ok(xml.includes('>x<'));
});

import { createDocument as makeDocGml } from '../packages/diagram/src/document.ts';
test('toGraphml/fromGraphml round-trip node groups via a data key', () => {
  const doc = makeDocGml({
    nodes: [{ id: 'a', type: 'process', title: 'A', group: 'Backend' }, { id: 'b', type: 'process', title: 'B', group: 'Backend' }, { id: 'c', type: 'process', title: 'C' }],
    edges: [{ id: 'ab', source: 'a', target: 'b' }],
  });
  const xml = toGraphml(doc);
  assert.match(xml, /attr\.name="group"/);
  assert.match(xml, /<data key="d_group">Backend<\/data>/);
  const back = fromGraphml(xml);
  const byId = Object.fromEntries(back.graph.nodes.map(n => [n.id, n]));
  assert.equal(byId.a.group, 'Backend');
  assert.equal(byId.b.group, 'Backend');
  assert.equal(byId.c.group, undefined);
  assert.equal(byId.a.title, 'A'); // group data not mistaken for the label
});

test('toGraphml emits x/y/w/h data and fromGraphml restores the layout (round-trip)', () => {
  const d = createDocument({
    nodes: [{ id: 'a', type: 'process', title: 'A' }, { id: 'b', type: 'process', title: 'B' }],
    edges: [{ id: 'ab', source: 'a', target: 'b' }],
  });
  d.layout.nodes.a = { x: 120, y: 60, width: 180, height: 90 };
  d.layout.nodes.b = { x: 500, y: 300, width: 160, height: 80 };
  const xml = toGraphml(d);
  assert.ok(xml.includes('<data key="d_x">120</data>'));
  assert.ok(xml.includes('<data key="d_w">180</data>'));
  const back = fromGraphml(xml);
  assert.deepEqual(back.layout.nodes.a, { x: 120, y: 60, width: 180, height: 90 });
  assert.deepEqual(back.layout.nodes.b, { x: 500, y: 300, width: 160, height: 80 });
});

test('fromGraphml reads yEd <y:Geometry> coordinates (top-left)', () => {
  const xml = `<?xml version="1.0"?>
  <graphml xmlns="http://graphml.graphdrawing.org/xmlns" xmlns:y="http://www.yworks.com/xml/graphml">
    <key id="d0" for="node" yfiles.type="nodegraphics"/>
    <graph edgedefault="directed">
      <node id="n0"><data key="d0"><y:ShapeNode><y:Geometry height="80.0" width="160.0" x="200.0" y="150.0"/><y:NodeLabel>Server</y:NodeLabel></y:ShapeNode></data></node>
      <node id="n1"><data key="d0"><y:ShapeNode><y:Geometry height="80.0" width="160.0" x="500.0" y="150.0"/><y:NodeLabel>DB</y:NodeLabel></y:ShapeNode></data></node>
      <edge source="n0" target="n1"/>
    </graph>
  </graphml>`;
  const g = fromGraphml(xml);
  assert.equal(g.graph.nodes.find(n => n.id === 'n0')!.title, 'Server');
  assert.deepEqual(g.layout.nodes.n0, { x: 200, y: 150, width: 160, height: 80 });
});

test('fromGraphml falls back to layered layout when a node lacks coordinates', () => {
  const xml = `<graphml><key id="dx" for="node" attr.name="x" attr.type="double"/><key id="dy" for="node" attr.name="y" attr.type="double"/><key id="dl" for="node" attr.name="label" attr.type="string"/>
    <graph edgedefault="directed">
      <node id="a"><data key="dl">A</data><data key="dx">100</data><data key="dy">100</data></node>
      <node id="b"><data key="dl">B</data></node>
      <edge source="a" target="b"/>
    </graph></graphml>`;
  const g = fromGraphml(xml);
  assert.equal(g.graph.nodes.length, 2);
  assert.notEqual(g.layout.nodes.a.x, 100); // b lacks coords -> layered for all
});

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseDotText } from '../packages/diagram/src/dot.ts';

test('parses a digraph with labels, shapes and edge styles', () => {
  const doc = parseDotText(`digraph G {
    rankdir=TB;
    start [label="Solicitud", shape=box];
    check [label="¿Autorizado?", shape=diamond];
    ok [label="Conceder", shape=ellipse];
    start -> check;
    check -> ok [label="Sí"];
    check -> start [style=dashed];
  }`);
  assert.equal(doc.profile, 'flow');
  assert.deepEqual(doc.graph.nodes.map(n => n.id), ['start', 'check', 'ok']);
  assert.equal(doc.graph.nodes.find(n => n.id === 'start')!.title, 'Solicitud');
  assert.equal(doc.graph.nodes.find(n => n.id === 'check')!.type, 'decision');
  assert.equal(doc.layout.nodes.check.shape, 'diamond');
  assert.equal(doc.layout.nodes.ok.shape, 'ellipse');
  assert.equal(doc.graph.edges.find(e => e.target === 'ok')!.label, 'Sí');
  const back = doc.graph.edges.find(e => e.source === 'check' && e.target === 'start')!;
  assert.equal(doc.layout.edges[back.id].dashed, true);
});
test('chained edges and quoted ids with punctuation are handled', () => {
  const doc = parseDotText('digraph { "svc.a" -> "svc.b" -> "svc.c"; }');
  assert.deepEqual(doc.graph.nodes.map(n => n.id), ['svc_a', 'svc_b', 'svc_c']);
  assert.equal(doc.graph.edges.length, 2);
  assert.ok(doc.layout.nodes.svc_a.y < doc.layout.nodes.svc_c.y); // layered by depth
});
test('undirected graphs use -- and drop the arrowhead; comments are ignored', () => {
  const doc = parseDotText(`// a plain graph
    graph { a -- b; /* inline */ b -- c; }`);
  assert.equal(doc.graph.edges.length, 2);
  for (const e of doc.graph.edges) assert.equal(doc.layout.edges[e.id].endMarker, 'none');
});
test('graph-level statements are ignored and empty input is rejected', () => {
  assert.throws(() => parseDotText('digraph { rankdir=LR; node [shape=box]; }'), /no contiene nodos/);
  const doc = parseDotText('digraph { bgcolor="white"; a -> b; }');
  assert.deepEqual(doc.graph.nodes.map(n => n.id), ['a', 'b']);
});

import { toDotText } from '../packages/diagram/src/dot.ts';
import { createDocument } from '../packages/diagram/src/document.ts';

test('toDotText emits a digraph with shapes, labels and dashed styles', () => {
  const doc = parseDotText(`digraph { a [label="Inicio" shape=box]; b [label="¿Ok?" shape=diamond]; a -> b [label="go"]; b -> a [style=dashed]; }`);
  const dot = toDotText(doc);
  assert.ok(dot.startsWith('digraph {'));
  assert.ok(dot.includes('shape=diamond'));
  assert.ok(dot.includes('label="go"'));
  assert.ok(dot.includes('style=dashed'));
  assert.ok(dot.trimEnd().endsWith('}'));
});
test('DOT survives a parse -> serialize -> parse round trip (structure, labels, shapes, dashed)', () => {
  const source = parseDotText(`digraph {
    a [label="A" shape=box];
    b [label="B" shape=diamond];
    c [label="C" shape=ellipse];
    a -> b [label="x"];
    b -> c [style=dashed];
  }`);
  const round = parseDotText(toDotText(source));
  assert.deepEqual(round.graph.nodes, source.graph.nodes);
  assert.deepEqual(round.graph.edges.map(e => ({ s: e.source, t: e.target, l: e.label })), source.graph.edges.map(e => ({ s: e.source, t: e.target, l: e.label })));
  for (const id of Object.keys(source.layout.nodes)) assert.equal(round.layout.nodes[id].shape, source.layout.nodes[id].shape);
  const dashedSrc = source.graph.edges.find(e => source.layout.edges[e.id].dashed)!;
  assert.equal(round.layout.edges[dashedSrc.id].dashed, true);
});
test('toDotText quotes ids and labels with special characters', () => {
  const doc = createDocument({ nodes: [{ id: 'a', type: 'service', title: 'A "x"' }, { id: 'b', type: 'decision', title: 'B' }], edges: [{ id: 'ab', source: 'a', target: 'b' }] });
  const dot = toDotText(doc);
  assert.ok(dot.includes('label="A \\"x\\""'));
  assert.equal(parseDotText(dot).graph.nodes.find(n => n.id === 'a')!.title, 'A "x"');
});

import { toDotText as toDotG, parseDotText as parseDotG } from '../packages/diagram/src/dot.ts';
import { createDocument as makeDocDot } from '../packages/diagram/src/document.ts';
test('toDotText emits groups as cluster subgraphs and parseDotText reads them back', () => {
  const doc = makeDocDot({
    nodes: [
      { id: 'a', type: 'process', title: 'A', group: 'Backend' },
      { id: 'b', type: 'process', title: 'B', group: 'Backend' },
      { id: 'c', type: 'process', title: 'C' },
    ],
    edges: [{ id: 'ab', source: 'a', target: 'b' }, { id: 'ac', source: 'a', target: 'c' }],
  });
  const dot = toDotG(doc);
  assert.match(dot, /subgraph cluster_0 \{/);
  assert.match(dot, /label="Backend";/);
  const back = parseDotG(dot);
  const byId = Object.fromEntries(back.graph.nodes.map(n => [n.id, n]));
  assert.equal(byId.a.group, 'Backend');
  assert.equal(byId.b.group, 'Backend');
  assert.equal(byId.c.group, undefined);
  assert.equal(back.graph.edges.length, 2);
});
test('parseDotText assigns the cluster label as group and ignores non-cluster subgraphs', () => {
  const back = parseDotG('digraph { subgraph cluster_x { label="Datos"; a [label="A"]; b [label="B"] } subgraph plain { c [label="C"] } a -> b }');
  const byId = Object.fromEntries(back.graph.nodes.map(n => [n.id, n]));
  assert.equal(byId.a.group, 'Datos');
  assert.equal(byId.b.group, 'Datos');
  assert.equal(byId.c.group, undefined); // non-cluster subgraph: no visual group
});

import { toDotText as toDotPos } from '../packages/diagram/src/dot.ts';
import { createDocument as mkDocPos } from '../packages/diagram/src/document.ts';
test('toDotText({positions:true}) emits pinned pos (y-up), inch sizes, and leaves default export untouched', () => {
  const d = mkDocPos({
    nodes: [{ id: 'a', type: 'process', title: 'A' }, { id: 'b', type: 'process', title: 'B' }],
    edges: [{ id: 'e0', source: 'a', target: 'b' }],
  });
  d.layout.nodes.a = { x: 100, y: 100, width: 144, height: 72 };
  d.layout.nodes.b = { x: 100, y: 300, width: 144, height: 72 };
  const dot = toDotPos(d, { positions: true });
  // a centre (172,136) -> pos "172,-136!" (y flipped); 144pt = 2in, 72pt = 1in
  assert.match(dot, /"a" \[[^\]]*pos="172,-136!"[^\]]*width=2[^\]]*height=1[^\]]*fixedsize=true\]/);
  // b is lower on screen (bigger y) -> more negative Graphviz y than a
  const ay = Number(/"a" \[[^\]]*pos="\d+,(-?\d+)!"/.exec(dot)![1]);
  const by = Number(/"b" \[[^\]]*pos="\d+,(-?\d+)!"/.exec(dot)![1]);
  assert.ok(by < ay);
  // default export carries no pos/fixedsize
  assert.ok(!/pos=|fixedsize/.test(toDotPos(d)));
});

import { parseDotText as parseDotPos } from '../packages/diagram/src/dot.ts';
test('parseDotText keeps Graphviz pos when every node has one (y flipped, normalized to 80)', () => {
  const d = parseDotPos('digraph {\n  a [label="A", pos="100,200!"];\n  b [label="B", pos="100,50!"];\n  a -> b;\n}');
  // Graphviz y-up: a (pos.y 200) is above b (pos.y 50). Flipped+normalized: a at the 80 margin, b 150 below.
  assert.deepEqual([d.layout.nodes.a.x, d.layout.nodes.a.y], [80, 80]);
  assert.deepEqual([d.layout.nodes.b.x, d.layout.nodes.b.y], [80, 230]);
});
test('parseDotText falls back to the layered layout when any node lacks pos', () => {
  const d = parseDotPos('digraph {\n  a [label="A", pos="100,200!"];\n  b [label="B"];\n  a -> b;\n}');
  assert.equal(d.layout.nodes.a.y, 80);
  assert.equal(d.layout.nodes.b.y, 236); // depth 1 * (92+64) + 80 -> layered, not positioned
});

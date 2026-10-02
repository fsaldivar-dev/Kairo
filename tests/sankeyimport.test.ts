import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseSankey } from '../packages/diagram/src/sankeyimport.ts';
import { toSankey } from '../packages/diagram/src/report.ts';
import { createDocument } from '../packages/diagram/src/document.ts';

test('parseSankey builds a node per unique name and an edge per row', () => {
  const doc = parseSankey('sankey-beta\n\nVisitas,Registro,120\nVisitas,Salida,80\nRegistro,Compra,45');
  assert.equal(doc.graph.nodes.length, 4); // Visitas, Registro, Salida, Compra
  assert.equal(doc.graph.edges.length, 3);
  const titles = doc.graph.nodes.map(n => n.title).sort();
  assert.deepEqual(titles, ['Compra', 'Registro', 'Salida', 'Visitas']);
  // every edge got a laid-out position
  for (const e of doc.graph.edges) assert.ok(doc.layout.nodes[e.source] && doc.layout.nodes[e.target]);
});

test('parseSankey keeps a value > 1 as the edge label but omits it for 1', () => {
  const doc = parseSankey('sankey-beta\n\nA,B,7\nB,C,1');
  const ab = doc.graph.edges.find(e => doc.graph.nodes.find(n => n.id === e.source)!.title === 'A')!;
  const bc = doc.graph.edges.find(e => doc.graph.nodes.find(n => n.id === e.source)!.title === 'B')!;
  assert.equal(ab.label, '7');
  assert.equal(bc.label, undefined);
});

test('parseSankey honours quoted fields, skips the header/comments/self-loops, and throws when empty', () => {
  const doc = parseSankey('sankey-beta\n%% a comment\n"Node, with comma","Target",3\nLoop,Loop,5');
  assert.equal(doc.graph.edges.length, 1); // self-loop dropped
  assert.equal(doc.graph.nodes.find(n => n.id === doc.graph.edges[0].source)!.title, 'Node, with comma');
  assert.throws(() => parseSankey('sankey-beta\n\n'), /no contiene enlaces/);
});

test('toSankey → parseSankey round-trips the structure', () => {
  const original = createDocument({
    nodes: [{ id: 'a', type: 'process', title: 'Alpha' }, { id: 'b', type: 'process', title: 'Beta' }, { id: 'c', type: 'process', title: 'Gamma' }],
    edges: [{ id: 'e0', source: 'a', target: 'b' }, { id: 'e1', source: 'b', target: 'c' }, { id: 'e2', source: 'a', target: 'c' }],
  });
  const back = parseSankey(toSankey(original));
  assert.equal(back.graph.nodes.length, 3);
  assert.equal(back.graph.edges.length, 3);
  const edgePairs = back.graph.edges.map(e => `${back.graph.nodes.find(n => n.id === e.source)!.title}->${back.graph.nodes.find(n => n.id === e.target)!.title}`).sort();
  assert.deepEqual(edgePairs, ['Alpha->Beta', 'Alpha->Gamma', 'Beta->Gamma']);
});

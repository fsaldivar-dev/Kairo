import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseMermaidBlock } from '../packages/diagram/src/blockimport.ts';
import { toMermaidBlock } from '../packages/diagram/src/block.ts';
import { createDocument } from '../packages/diagram/src/document.ts';

test('parseMermaidBlock builds nodes from blocks and edges from arrows, keeping labels', () => {
  const doc = parseMermaidBlock('block-beta\n  columns 3\n  a["Cliente"]\n  b["API"]\n  c["Base"]\n  a -- "pide" --> b\n  b --> c');
  assert.equal(doc.graph.nodes.length, 3);
  assert.equal(doc.graph.edges.length, 2);
  const byTitle = new Map(doc.graph.nodes.map(n => [n.title, n]));
  assert.ok(byTitle.has('Cliente') && byTitle.has('API') && byTitle.has('Base'));
  const labelled = doc.graph.edges.find(e => e.label);
  assert.equal(labelled!.label, 'pide');
});

test('parseMermaidBlock ignores grid directives, accepts bare/bracket forms and creates undeclared endpoints', () => {
  const doc = parseMermaidBlock('block-beta\n  columns 2\n  space\n  x\n  y{"Why"}\n  x --> y\n  y --> z');
  const byId = new Map(doc.graph.nodes.map(n => [n.id, n]));
  assert.equal(byId.get('x')!.title, 'x');     // bare id -> title defaults to id
  assert.equal(byId.get('y')!.title, 'Why');   // {"..."} label parsed
  assert.ok(byId.has('z'));                      // z created on demand from the arrow
  assert.equal(doc.graph.edges.length, 2);
});

test('parseMermaidBlock throws when there are no blocks', () => {
  assert.throws(() => parseMermaidBlock('block-beta\n  columns 1'), /no contiene bloques/);
});

test('toMermaidBlock → parseMermaidBlock round-trips structure and labels', () => {
  const original = createDocument({
    nodes: [{ id: 'a', type: 'process', title: 'Alpha' }, { id: 'b', type: 'process', title: 'Beta' }, { id: 'c', type: 'process', title: 'Gamma' }],
    edges: [{ id: 'e0', source: 'a', target: 'b', label: 'ok' }, { id: 'e1', source: 'b', target: 'c' }],
  });
  const back = parseMermaidBlock(toMermaidBlock(original));
  assert.equal(back.graph.nodes.length, 3);
  assert.equal(back.graph.edges.length, 2);
  const titles = back.graph.nodes.map(n => n.title).sort();
  assert.deepEqual(titles, ['Alpha', 'Beta', 'Gamma']);
  const pairs = back.graph.edges.map(e => `${back.graph.nodes.find(n => n.id === e.source)!.title}->${back.graph.nodes.find(n => n.id === e.target)!.title}${e.label ? `(${e.label})` : ''}`).sort();
  assert.deepEqual(pairs, ['Alpha->Beta(ok)', 'Beta->Gamma']);
});

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parsePlantumlMindmap } from '../packages/diagram/src/plantumlmindmapimport.ts';
import { toPlantumlMindmap } from '../packages/diagram/src/plantumlmindmap.ts';
import { createDocument } from '../packages/diagram/src/document.ts';

test('parsePlantumlMindmap builds a tree from depth markers', () => {
  const doc = parsePlantumlMindmap('@startmindmap\n* Root\n** A\n*** A1\n** B\n@endmindmap');
  assert.equal(doc.profile, 'mindmap');
  assert.equal(doc.graph.nodes.length, 4);
  assert.equal(doc.graph.edges.length, 3); // Root->A, A->A1, Root->B
  const id = (title: string) => doc.graph.nodes.find(n => n.title === title)!.id;
  const parentOf = (title: string) => { const e = doc.graph.edges.find(e => e.target === id(title)); return e ? doc.graph.nodes.find(n => n.id === e.source)!.title : null; };
  assert.equal(parentOf('A'), 'Root');
  assert.equal(parentOf('A1'), 'A');
  assert.equal(parentOf('B'), 'Root');
});

test('parsePlantumlMindmap tolerates colour markers, boxless underscore, comments and side markers', () => {
  const doc = parsePlantumlMindmap("@startmindmap\n* Root\n'a comment\n**[#lightblue] Coloured\n**_ Boxless\n++ Right side\n@endmindmap");
  const titles = doc.graph.nodes.map(n => n.title);
  assert.ok(titles.includes('Coloured') && titles.includes('Boxless') && titles.includes('Right side'));
  assert.ok(!titles.some(t => t.startsWith("'"))); // comment skipped
});

test('parsePlantumlMindmap parses without @start/@end wrappers and throws when empty', () => {
  const doc = parsePlantumlMindmap('* Solo\n** Hijo');
  assert.equal(doc.graph.nodes.length, 2);
  assert.throws(() => parsePlantumlMindmap('@startmindmap\n@endmindmap'), /no contiene nodos/);
});

test('toPlantumlMindmap → parsePlantumlMindmap round-trips a single-root tree', () => {
  const original = createDocument({
    nodes: [{ id: 'r', type: 'start', title: 'Root' }, { id: 'a', type: 'process', title: 'Alpha' }, { id: 'b', type: 'process', title: 'Beta' }, { id: 'a1', type: 'process', title: 'Leaf' }],
    edges: [{ id: 'e0', source: 'r', target: 'a' }, { id: 'e1', source: 'r', target: 'b' }, { id: 'e2', source: 'a', target: 'a1' }],
  });
  const back = parsePlantumlMindmap(toPlantumlMindmap(original));
  assert.equal(back.graph.nodes.length, 4);
  assert.equal(back.graph.edges.length, 3);
  const pairs = back.graph.edges.map(e => `${back.graph.nodes.find(n => n.id === e.source)!.title}->${back.graph.nodes.find(n => n.id === e.target)!.title}`).sort();
  assert.deepEqual(pairs, ['Alpha->Leaf', 'Root->Alpha', 'Root->Beta']);
});

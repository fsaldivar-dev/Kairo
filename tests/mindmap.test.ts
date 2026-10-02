import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseMindmap, parseMermaid, toMermaid } from '../packages/diagram/src/text.ts';

const MM = `mindmap
  root((Kairo))
    Formatos
      Mermaid
      GraphML
    Análisis
    [Interfaz]`;

test('parseMindmap builds a parent/child tree from indentation', () => {
  const doc = parseMindmap(MM);
  assert.equal(doc.profile, 'mindmap');
  assert.deepEqual(doc.graph.nodes.map(n => n.title), ['Kairo', 'Formatos', 'Mermaid', 'GraphML', 'Análisis', 'Interfaz']);
  // root -> Formatos, root -> Análisis, root -> Interfaz, Formatos -> Mermaid, Formatos -> GraphML
  assert.equal(doc.graph.edges.length, 5);
  const byId = Object.fromEntries(doc.graph.nodes.map(n => [n.title, n.id]));
  const edge = (a: string, b: string) => doc.graph.edges.some(e => e.source === byId[a] && e.target === byId[b]);
  assert.ok(edge('Kairo', 'Formatos'));
  assert.ok(edge('Formatos', 'Mermaid'));
  assert.ok(edge('Formatos', 'GraphML'));
  assert.ok(edge('Kairo', 'Análisis'));
  assert.ok(edge('Kairo', 'Interfaz'));
});
test('parseMindmap reads bracket shapes and places the root above its children', () => {
  const doc = parseMindmap(MM);
  const root = doc.graph.nodes.find(n => n.title === 'Kairo')!;
  assert.equal(doc.layout.nodes[root.id].shape, 'ellipse'); // (( )) -> ellipse
  const ui = doc.graph.nodes.find(n => n.title === 'Interfaz')!;
  assert.equal(doc.layout.nodes[ui.id].shape, 'rectangle'); // [ ] -> rectangle
  assert.ok(doc.layout.nodes[doc.graph.nodes.find(n => n.title === 'Formatos')!.id].y > doc.layout.nodes[root.id].y);
});
test('parseMermaid dispatches a mindmap header to parseMindmap', () => {
  const doc = parseMermaid('mindmap\n  Root\n    Child');
  assert.equal(doc.profile, 'mindmap');
  assert.match(toMermaid(doc), /^mindmap\n/);
  assert.deepEqual(doc.graph.nodes.map(n => n.title), ['Root', 'Child']);
  assert.equal(doc.graph.edges.length, 1);
});
test('parseMindmap gives distinct ids to repeated labels and throws when empty', () => {
  const doc = parseMindmap('mindmap\n  Root\n    Dup\n    Dup');
  assert.equal(new Set(doc.graph.nodes.map(n => n.id)).size, 3); // unique ids despite same title
  assert.throws(() => parseMindmap('mindmap\n'), /no contiene nodos/);
});

import { toMindmap } from '../packages/diagram/src/text.ts';
test('toMindmap emits an indented tree that round-trips through parseMindmap', () => {
  const src = parseMindmap('mindmap\n  root((Kairo))\n    Formatos\n      Mermaid\n    Análisis');
  const text = toMindmap(src);
  assert.ok(text.startsWith('mindmap\n'));
  assert.ok(text.includes('((Kairo))')); // ellipse shape preserved
  const back = parseMindmap(text);
  assert.deepEqual(back.graph.nodes.map(n => n.title).sort(), ['Análisis', 'Formatos', 'Kairo', 'Mermaid'].sort());
  assert.equal(back.graph.edges.length, src.graph.edges.length); // same tree structure
});
test('toMindmap indents children deeper than their parent', () => {
  const doc = parseMindmap('mindmap\n  Root\n    Child\n      Grand');
  const lines = toMindmap(doc).split('\n');
  const indent = (t: string) => (/^\s*/.exec(lines.find(l => l.trim() === t)!)![0]).length;
  assert.ok(indent('Child') > indent('Root'));
  assert.ok(indent('Grand') > indent('Child'));
});
test('toMindmap emits a spanning tree for a graph with shared children (no duplicates)', () => {
  // a->c, b->c : c is shared; toMindmap should emit c once (spanning tree).
  const doc = parseMermaid('flowchart TD\n a[A] --> c[C]\n b[B] --> c');
  const text = toMindmap(doc);
  assert.equal((text.match(/\[C\]/g) || []).length, 1); // shared child C appears once (spanning tree)
});

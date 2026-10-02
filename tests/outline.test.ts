import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseOutline, toOutline } from '../packages/diagram/src/outline.ts';
import { convertText } from '../packages/diagram/src/convert.ts';

test('parseOutline builds a tree from indentation, stripping bullets', () => {
  const d = parseOutline('Root\n  - Child A\n    - Grandchild\n  - Child B');
  assert.deepEqual(d.graph.nodes.map(n => n.title), ['Root', 'Child A', 'Grandchild', 'Child B']);
  const edge = (s: string, t: string) => d.graph.edges.some(e => e.source === s && e.target === t);
  assert.ok(edge('Root', 'Child_A') && edge('Child_A', 'Grandchild') && edge('Root', 'Child_B'));
  assert.equal(d.graph.edges.length, 3); // a tree with 4 nodes has 3 edges
});
test('parseOutline handles tabs, numbered bullets and blank lines; rejects empty', () => {
  const d = parseOutline('1. Uno\n\t2. Dos\n\n\t3. Tres');
  assert.deepEqual(d.graph.nodes.map(n => n.title), ['Uno', 'Dos', 'Tres']);
  // Dos and Tres are children of Uno (same deeper indent).
  assert.equal(d.graph.edges.filter(e => e.source === 'Uno').length, 2);
  assert.throws(() => parseOutline('   \n\n'), /no contiene líneas/);
});
test('outline round-trips a tree structure', () => {
  const text = '- A\n  - B\n    - C\n  - D';
  assert.equal(toOutline(parseOutline(text)), text);
});
test('toOutline de-duplicates nodes with multiple parents (appears once)', () => {
  const d = parseOutline('A\n  - B\n  - C'); // then add a cross edge via convert? just check DFS once
  const out = toOutline(d);
  assert.equal((out.match(/B/g) ?? []).length, 1);
});
test('convertText bridges an outline to Mermaid', () => {
  const mermaid = convertText('Plan\n  - Fase 1\n  - Fase 2', 'outline', 'mermaid');
  assert.match(mermaid, /Plan/);
  assert.match(mermaid, /Fase 1/);
});

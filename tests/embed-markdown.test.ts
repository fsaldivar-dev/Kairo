import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mermaidToSvg, codeToSvg, currentColorTheme, errorSvg } from '../packages/diagram/src/mdembed.ts';
import { tryParse, parseAny } from '../packages/diagram/src/convert.ts';
import { parseMermaid } from '../packages/diagram/src/text.ts';

test('parseMermaid accepts ; as a statement separator (graph TD;A-->B)', () => {
  const d = parseMermaid('graph TD;A-->B');
  assert.equal(d.graph.nodes.length, 2);
  assert.equal(d.graph.edges.length, 1);
  // inline one-liner with labels and shapes
  const d2 = parseMermaid('graph LR; A[Start] --> B{Choice}; B -->|yes| C; B -->|no| D');
  assert.equal(d2.graph.nodes.length, 4);
  assert.equal(d2.graph.edges.length, 3);
  // a ';' inside a label must NOT split the statement
  const d3 = parseMermaid('graph TD; A["a;b"] --> B');
  assert.equal(d3.graph.nodes.length, 2);
  assert.equal(d3.graph.nodes.find(n => n.id === 'A')!.title, 'a;b');
});

test('mermaidToSvg returns an SVG for valid code and an error SVG (never throws) for bad code', () => {
  const ok = mermaidToSvg('graph TD;A-->B');
  assert.ok(ok.startsWith('<svg') && ok.includes('</svg>'));
  assert.ok(!ok.includes('aria-label="Diagrama no válido"')); // a real diagram, not the error placeholder
  let bad!: string;
  assert.doesNotThrow(() => { bad = mermaidToSvg('%% nothing here'); });
  assert.ok(bad.startsWith('<svg') && bad.includes('aria-label="Diagrama no válido"'));
});

test("theme 'currentColor' makes the SVG inherit the container colour", () => {
  const svg = mermaidToSvg('graph TD;A-->B', { theme: 'currentColor' });
  assert.ok(svg.includes('currentColor'));           // strokes/text use currentColor
  assert.ok(!svg.includes('fill="#ffffff"'));          // opaque default node fill replaced
  // the exported token theme is also usable directly and includes the key tokens
  assert.equal(currentColorTheme.edge, 'currentColor');
  assert.equal(currentColorTheme.nodeText, 'currentColor');
});

test('codeToSvg renders other text formats (DOT) and falls back to an error SVG for an unknown-bad block', () => {
  const dot = codeToSvg('digraph { a -> b }', 'dot');
  assert.ok(dot.startsWith('<svg') && !dot.includes('Diagrama no válido'));
  assert.ok(codeToSvg('', 'dot').includes('Diagrama no válido')); // empty -> error SVG, no throw
});

test('tryParse returns a document or null without throwing', () => {
  assert.ok(tryParse('graph TD;A-->B', 'mermaid'));
  assert.equal(tryParse('%% nothing', 'mermaid'), null);
  // parity: parseAny throws where tryParse returns null
  assert.throws(() => parseAny('%% nothing', 'mermaid'));
  assert.ok(errorSvg('boom').includes('boom'));
});

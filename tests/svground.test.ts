import { test } from 'node:test';
import assert from 'node:assert/strict';
import { toEditableSvg, toSVG } from '../packages/diagram/src/export.ts';
import { fromSvg, isEditableSvg } from '../packages/diagram/src/svgimport.ts';
import { createDocument } from '../packages/diagram/src/document.ts';
import type { DiagramDocument } from '../packages/diagram/src/types.ts';

function doc(): DiagramDocument {
  const d = createDocument({
    nodes: [
      { id: 'a', type: 'decision', title: 'A & <B> "C"', group: 'G1', tags: ['t1', 't2'] },
      { id: 'b', type: 'process', title: 'Paso' },
    ],
    edges: [{ id: 'ab', source: 'a', target: 'b', label: 'sí', condition: 'x>0' }],
  });
  return d;
}

test('toEditableSvg produces valid SVG with a kairo-document metadata block', () => {
  const svg = toEditableSvg(doc());
  assert.ok(svg.startsWith('<svg '));
  assert.ok(svg.trimEnd().endsWith('</svg>'));
  assert.ok(svg.includes('<metadata id="kairo-document" data-format="kairo-v2">'));
  assert.ok(isEditableSvg(svg));
  assert.ok(!isEditableSvg(toSVG(doc()))); // plain export carries no metadata
  // The metadata sits right after the opening tag (before the content group).
  assert.ok(svg.indexOf('<metadata') < svg.indexOf('<g'));
});

test('fromSvg round-trips the full document (shapes, tags, groups, edge semantics, special chars)', () => {
  const original = doc();
  const back = fromSvg(toEditableSvg(original));
  assert.deepEqual(back.graph, original.graph); // titles with & < > " survive XML escaping
  assert.deepEqual(back.layout, original.layout);
  const a = back.graph.nodes.find(n => n.id === 'a')!;
  assert.deepEqual(a.tags, ['t1', 't2']);
  assert.equal(a.group, 'G1');
  assert.equal(back.graph.edges[0].condition, 'x>0');
});

test('fromSvg throws on an SVG without Kairo metadata', () => {
  assert.throws(() => fromSvg(toSVG(doc())), /no contiene datos de Kairo/);
  assert.throws(() => fromSvg('<svg></svg>'), /no contiene datos de Kairo/);
});

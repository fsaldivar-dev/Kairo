import { test } from 'node:test';
import assert from 'node:assert/strict';
import { toMermaidBlock } from '../packages/diagram/src/block.ts';
import { createDocument } from '../packages/diagram/src/document.ts';

test('toMermaidBlock emits a columns header, a labelled block per node and an arrow per edge', () => {
  const d = createDocument({
    nodes: [{ id: 'a', type: 'process', title: 'Alpha' }, { id: 'b', type: 'process', title: 'Beta' }, { id: 'c', type: 'process', title: 'Gamma' }],
    edges: [{ id: 'e0', source: 'a', target: 'b', label: 'ok' }, { id: 'e1', source: 'b', target: 'c' }],
  });
  const out = toMermaidBlock(d);
  assert.equal(out.split('\n')[0], 'block-beta');
  assert.match(out, /^ {2}columns \d+$/m);
  assert.ok(out.includes('["Alpha"]') && out.includes('["Gamma"]'));
  assert.match(out, /a -- "ok" --> b/);  // labelled edge
  assert.match(out, /b --> c/);          // plain edge
});

test('toMermaidBlock defaults columns to ~sqrt(n) and skips self-loops', () => {
  const d = createDocument({
    nodes: ['n0', 'n1', 'n2', 'n3'].map(id => ({ id, type: 'process' as const, title: id })),
    edges: [{ id: 'e0', source: 'n0', target: 'n1' }, { id: 'e1', source: 'n0', target: 'n0' }],
  });
  const out = toMermaidBlock(d);
  assert.ok(out.includes('  columns 2')); // ceil(sqrt(4)) = 2
  assert.equal((out.match(/ --> /g) ?? []).length, 1); // self-loop e1 dropped
});

test('toMermaidBlock sanitizes ids, quote-escapes labels and handles an empty graph', () => {
  const d = createDocument({ nodes: [{ id: '1 odd', type: 'process', title: 'He said "hi"' }], edges: [] });
  const out = toMermaidBlock(d);
  assert.match(out, /b_1_odd\["He said 'hi'"\]/); // id prefixed+sanitized, quotes downgraded
  assert.equal(toMermaidBlock(createDocument({ nodes: [], edges: [] })), 'block-beta\n  columns 1\n');
});

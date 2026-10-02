import { test } from 'node:test';
import assert from 'node:assert/strict';
import { toCategorySvg } from '../packages/diagram/src/category.ts';
import { createDocument } from '../packages/diagram/src/document.ts';

const doc = () => createDocument({
  nodes: [
    { id: 'a', type: 'service', title: 'A', group: 'Backend' },
    { id: 'b', type: 'database', title: 'B', group: 'Backend' },
    { id: 'c', type: 'screen', title: 'C', group: 'Frontend' },
  ],
  edges: [{ id: 'e', source: 'c', target: 'a' }],
});

const fills = (svg: string): string[] => [...svg.matchAll(/fill="(#[0-9a-f]{6})"/gi)].map(m => m[1].toLowerCase());

test('toCategorySvg colours nodes by group: same group shares a colour, different groups differ', () => {
  const svg = toCategorySvg(doc(), { by: 'group' });
  assert.ok(svg.startsWith('<svg '));
  const f = new Set(fills(svg));
  assert.ok(f.has('#e0f2fe')); // first palette colour (Backend)
  assert.ok(f.has('#dcfce7')); // second palette colour (Frontend)
});

test('toCategorySvg by type uses a distinct colour per node type', () => {
  const svg = toCategorySvg(doc(), { by: 'type' });
  // 3 distinct types -> 3 distinct palette fills present.
  for (const c of ['#e0f2fe', '#dcfce7', '#fef9c3']) assert.ok(fills(svg).includes(c), `expected ${c}`);
});

test('toCategorySvg honours a custom palette and cycles it', () => {
  const svg = toCategorySvg(doc(), { by: 'group', palette: ['#111111', '#222222'] });
  const f = new Set(fills(svg));
  assert.ok(f.has('#111111') && f.has('#222222'));
});

test('toCategorySvg leaves nodes without a category at the theme default (no crash)', () => {
  const d = createDocument({ nodes: [{ id: 'x', type: 'process', title: 'X' }], edges: [] });
  const svg = toCategorySvg(d, { by: 'group' }); // no groups
  assert.ok(svg.startsWith('<svg '));
});

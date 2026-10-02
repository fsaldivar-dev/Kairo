import { test } from 'node:test';
import assert from 'node:assert/strict';
import { toPie } from '../packages/diagram/src/report.ts';
import { createDocument } from '../packages/diagram/src/document.ts';

const doc = () => createDocument({
  nodes: [
    { id: 'a', type: 'process', title: 'A', group: 'Core' },
    { id: 'b', type: 'process', title: 'B', group: 'Core' },
    { id: 'c', type: 'process', title: 'C' },
    { id: 'd', type: 'decision', title: 'D', group: 'Core' },
    { id: 'e', type: 'end', title: 'E' },
  ],
  edges: [{ id: 'e0', source: 'a', target: 'd' }],
});

test('toPie counts nodes by type by default, sorted by count then name', () => {
  const pie = toPie(doc(), { title: 'Tipos' });
  const lines = pie.trim().split('\n');
  assert.equal(lines[0], 'pie title Tipos');
  assert.equal(lines[1], '  "process" : 3'); // most common first
  // decision and end both have count 1 -> alphabetical
  assert.equal(lines[2], '  "decision" : 1');
  assert.equal(lines[3], '  "end" : 1');
  assert.equal(lines.length, 4);
});

test('toPie can bucket by group, with ungrouped nodes in "(sin grupo)"', () => {
  const pie = toPie(doc(), { by: 'group' });
  assert.match(pie, /"Core" : 3/);           // a, b, d
  assert.match(pie, /"\(sin grupo\)" : 2/);  // c, e
  const total = [...pie.matchAll(/ : (\d+)/g)].reduce((s, m) => s + Number(m[1]), 0);
  assert.equal(total, 5); // every node counted exactly once
});

test('toPie escapes quotes/newlines in keys and titles', () => {
  const d = createDocument({ nodes: [{ id: 'n', type: 'process', title: 'N', group: 'A "x"\ny' }], edges: [] });
  const pie = toPie(d, { by: 'group', title: 'T "q"' });
  assert.ok(pie.startsWith("pie title T 'q'"));
  assert.match(pie, /"A 'x' y" : 1/);
});

test('toPie on an empty graph yields just the header', () => {
  assert.equal(toPie(createDocument({ nodes: [], edges: [] })).trim(), 'pie title Composición');
});
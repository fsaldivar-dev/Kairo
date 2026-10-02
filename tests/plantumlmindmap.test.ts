import { test } from 'node:test';
import assert from 'node:assert/strict';
import { toPlantumlMindmap } from '../packages/diagram/src/plantumlmindmap.ts';
import { createDocument } from '../packages/diagram/src/document.ts';

test('toPlantumlMindmap emits depth-marked nodes for a single-root tree', () => {
  const d = createDocument({
    nodes: [
      { id: 'root', type: 'start', title: 'Root' },
      { id: 'a', type: 'process', title: 'A' }, { id: 'b', type: 'process', title: 'B' },
      { id: 'a1', type: 'process', title: 'A1' },
    ],
    edges: [{ id: 'e0', source: 'root', target: 'a' }, { id: 'e1', source: 'root', target: 'b' }, { id: 'e2', source: 'a', target: 'a1' }],
  });
  const out = toPlantumlMindmap(d);
  assert.ok(out.startsWith('@startmindmap\n') && out.trim().endsWith('@endmindmap'));
  assert.ok(out.includes('* Root'));      // depth 1
  assert.ok(out.includes('** A'));         // depth 2
  assert.ok(out.includes('*** A1'));       // depth 3
  assert.ok(out.includes('** B'));
});

test('toPlantumlMindmap wraps multiple roots under a synthetic root', () => {
  const d = createDocument({
    nodes: [{ id: 'x', type: 'process', title: 'X' }, { id: 'y', type: 'process', title: 'Y' }],
    edges: [],
  });
  const out = toPlantumlMindmap(d, { root: 'Todo' });
  assert.ok(out.includes('* Todo'));  // synthetic root at depth 1
  assert.ok(out.includes('** X') && out.includes('** Y')); // the two roots nested below
});

test('toPlantumlMindmap flattens newlines in titles and handles an empty graph', () => {
  const d = createDocument({ nodes: [{ id: 'r', type: 'process', title: 'Line one\nLine two' }], edges: [] });
  assert.ok(toPlantumlMindmap(d).includes('* Line one Line two'));
  assert.equal(toPlantumlMindmap(createDocument({ nodes: [], edges: [] })), '@startmindmap\n@endmindmap\n');
});

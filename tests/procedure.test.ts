import { test } from 'node:test';
import assert from 'node:assert/strict';
import { toProcedure } from '../packages/diagram/src/report.ts';
import { createDocument } from '../packages/diagram/src/document.ts';

const flow = () => createDocument({
  nodes: [
    { id: 'start', type: 'start', title: 'Inicio' },
    { id: 'check', type: 'decision', title: '¿Autenticado?' },
    { id: 'ok', type: 'process', title: 'Panel' },
    { id: 'no', type: 'end', title: 'Error' },
  ],
  edges: [
    { id: 'e0', source: 'start', target: 'check' },
    { id: 'e1', source: 'check', target: 'ok', label: 'sí' },
    { id: 'e2', source: 'check', target: 'no', label: 'no' },
  ],
});

test('toProcedure numbers steps in topological order and lists labelled branches to step numbers', () => {
  const p = toProcedure(flow(), { title: 'Login' });
  const lines = p.trim().split('\n');
  assert.equal(lines[0], '# Login');
  assert.equal(lines[2], '1. **Inicio** _(start)_');
  assert.ok(p.includes('   - → ¿Autenticado? (paso 2)'));
  assert.ok(p.includes('2. **¿Autenticado?** _(decision)_'));
  assert.ok(p.includes('   - **sí** → Panel (paso 3)'));
  assert.ok(p.includes('   - **no** → Error (paso 4)'));
});

test('toProcedure marks terminal steps with (fin)', () => {
  const p = toProcedure(flow());
  // 'Panel' and 'Error' have no outgoing edges.
  const block = p.split('\n');
  const panelIdx = block.findIndex(l => l.includes('**Panel**'));
  assert.ok(block[panelIdx + 1].includes('(fin)'));
});

test('toProcedure falls back to declaration order on a cyclic graph (no crash)', () => {
  const d = createDocument({
    nodes: [{ id: 'a', type: 'process', title: 'A' }, { id: 'b', type: 'process', title: 'B' }],
    edges: [{ id: 'ab', source: 'a', target: 'b' }, { id: 'ba', source: 'b', target: 'a' }],
  });
  const p = toProcedure(d);
  assert.ok(p.includes('1. **A**'));
  assert.ok(p.includes('2. **B**'));
  assert.ok(p.includes('→ B (paso 2)')); // step cross-reference still resolves
});

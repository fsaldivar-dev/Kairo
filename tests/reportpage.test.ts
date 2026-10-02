import { test } from 'node:test';
import assert from 'node:assert/strict';
import { toReportPage } from '../packages/diagram/src/report.ts';
import { createDocument } from '../packages/diagram/src/document.ts';

test('toReportPage renders a self-contained HTML page with description, stats card, metrics and diagnostics', () => {
  const d = createDocument({
    nodes: [{ id: 'start', type: 'start', title: 'Inicio' }, { id: 'step', type: 'process', title: 'Paso' }, { id: 'end', type: 'end', title: 'Fin' }],
    edges: [{ id: 'e0', source: 'start', target: 'step' }, { id: 'e1', source: 'step', target: 'end' }],
  }, undefined, 'flow');
  const html = toReportPage(d, { title: 'Mi flujo' });
  assert.ok(html.startsWith('<!doctype html>'));
  assert.ok(html.includes('<title>Mi flujo</title>') && html.includes('<h1>Mi flujo</h1>'));
  assert.ok(html.includes('<svg')); // embedded stats card
  assert.ok(html.includes('<h2>Métricas</h2>') && html.includes('<th>Nodos</th>') && html.includes('<td>3</td>'));
  assert.ok(html.includes('<h2>Diagnósticos</h2>'));
  assert.ok(html.includes('✓ Sin diagnósticos.')); // a valid start->step->end flow lints clean
  assert.ok(!/<script/i.test(html)); // no scripts
});

test('toReportPage lists lint diagnostics for a broken flow and escapes HTML in the title', () => {
  const d = createDocument({
    nodes: [{ id: 'a', type: 'process', title: 'A' }, { id: 'b', type: 'process', title: 'B' }],
    edges: [{ id: 'e0', source: 'a', target: 'b' }],
  }, undefined, 'flow'); // no start/end -> lint warnings
  const html = toReportPage(d, { title: 'X & <Y>' });
  assert.ok(html.includes('<title>X &amp; &lt;Y&gt;</title>'));
  assert.ok(html.includes('class="diag"')); // diagnostics list present
  assert.ok(/class="(error|warning)"/.test(html));
});

test('toReportPage works on an empty graph without throwing', () => {
  const html = toReportPage(createDocument({ nodes: [], edges: [] }));
  assert.ok(html.startsWith('<!doctype html>') && html.includes('Informe del diagrama'));
});

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { templates, templateNames, getTemplate, emptyFlow, decision, architecture, mindmap, swimlane, microservices, cicdPipeline, authFlow, stateMachine } from '../packages/diagram/src/templates.ts';
import { parseDocument } from '../packages/diagram/src/document.ts';
import { validateFlow } from '../packages/diagram/src/flow.ts';

test('every template returns a fresh, validated, laid-out document', () => {
  for (const name of templateNames) {
    const doc = getTemplate(name);
    assert.doesNotThrow(() => parseDocument(doc)); // valid v2
    assert.ok(doc.graph.nodes.length > 0);
    for (const n of doc.graph.nodes) { assert.ok(Number.isFinite(doc.layout.nodes[n.id].x)); assert.ok(Number.isFinite(doc.layout.nodes[n.id].y)); }
    assert.notEqual(getTemplate(name), getTemplate(name)); // fresh instance each call
  }
});
test('getTemplate falls back to an empty flow for an unknown name', () => {
  const fb = getTemplate('does-not-exist');
  assert.equal(fb.graph.nodes.length, emptyFlow().graph.nodes.length);
  assert.equal(fb.profile, 'flow');
});
test('emptyFlow is a minimal start -> step -> end flow', () => {
  const d = emptyFlow();
  assert.equal(d.graph.nodes.length, 3);
  assert.equal(d.graph.edges.length, 2);
  assert.equal(d.profile, 'flow');
  assert.ok(d.graph.nodes.some(n => n.type === 'start') && d.graph.nodes.some(n => n.type === 'end'));
});
test('decision has a decision node with two labelled branches that rejoin', () => {
  const d = decision();
  assert.equal(d.graph.nodes.length, 5);
  assert.equal(d.graph.edges.length, 5);
  assert.ok(d.graph.nodes.some(n => n.type === 'decision'));
  assert.deepEqual(d.graph.edges.filter(e => e.label).map(e => e.label).sort(), ['No', 'Sí']);
});
test('architecture is a 4-layer client->api->service->db chain', () => {
  const d = architecture();
  assert.equal(d.graph.nodes.length, 4);
  assert.equal(d.graph.edges.length, 3);
  assert.ok(d.graph.nodes.some(n => n.type === 'database') && d.graph.nodes.some(n => n.type === 'api'));
});
test('mindmap is a central node with four branches', () => {
  const d = mindmap();
  assert.equal(d.graph.nodes.length, 5);
  assert.equal(d.graph.edges.length, 4);
});
test('swimlane tags nodes with their lane', () => {
  const d = swimlane();
  assert.equal(d.graph.nodes.length, 3);
  assert.deepEqual([...new Set(d.graph.nodes.map(n => n.lane))].sort(), ['Cliente', 'Servidor']);
});
test('the new real-world templates have the expected shape', () => {
  assert.equal(microservices().graph.nodes.length, 8);
  assert.equal(cicdPipeline().graph.nodes.length, 6);
  assert.equal(authFlow().graph.nodes.length, 6);
  assert.equal(stateMachine().graph.nodes.length, 4);
  assert.ok(cicdPipeline().graph.edges.some(e => e.label === 'Sí'));
  assert.ok(authFlow().graph.edges.some(e => e.label === 'Reintentar'));
  assert.equal(templates.stateMachine, stateMachine); // registered in the map
});
test('flow templates validate structurally without throwing', () => {
  for (const t of [emptyFlow, decision, cicdPipeline, authFlow, stateMachine]) assert.doesNotThrow(() => validateFlow(t().graph));
});

import { kubernetes, dataPipeline, incidentResponse } from '../packages/diagram/src/templates.ts';
test('kubernetes template routes ingress -> service -> deployment -> pods -> db', () => {
  const g = kubernetes().graph;
  const has = (s: string, t: string) => g.edges.some(e => e.source === s && e.target === t);
  assert.ok(has('ingress', 'svc') && has('svc', 'deploy') && has('deploy', 'pod1') && has('deploy', 'pod2'));
  assert.ok(has('pod1', 'db') && has('pod2', 'db'));
  assert.equal(g.nodes.find(n => n.id === 'db')!.type, 'database');
});
test('dataPipeline is a linear ETL chain ending at a BI dashboard', () => {
  const g = dataPipeline().graph;
  assert.deepEqual(g.nodes.map(n => n.id), ['src', 'ingest', 'lake', 'transform', 'warehouse', 'bi']);
  assert.equal(g.edges.length, 5); // one hop between each stage
  assert.equal(g.nodes.find(n => n.id === 'bi')!.type, 'screen');
});
test('incidentResponse branches on severity and both paths reach the postmortem', () => {
  const d = incidentResponse();
  assert.equal(d.profile, 'flow');
  const g = d.graph;
  assert.equal(g.nodes.find(n => n.id === 'sev')!.type, 'decision');
  assert.ok(g.edges.some(e => e.source === 'sev' && e.label === 'Sí'));
  assert.ok(g.edges.some(e => e.source === 'sev' && e.label === 'No'));
  assert.ok(g.edges.some(e => e.target === 'postmortem') && g.nodes.find(n => n.id === 'postmortem')!.type === 'end');
});

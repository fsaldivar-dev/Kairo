import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateFlow } from '../packages/diagram/src/flow.ts';
import type { SemanticGraph } from '../packages/diagram/src/types.ts';

function flow(): SemanticGraph { return {
  nodes: [{ id: 's', type: 'start', title: 'Start' }, { id: 'd', type: 'decision', title: 'Ready?' }, { id: 'p', type: 'process', title: 'Work' }, { id: 'e', type: 'end', title: 'End' }],
  edges: [{ id: 'sd', source: 's', target: 'd' }, { id: 'yes', source: 'd', target: 'p', label: 'Sí', condition: 'user.canProceed' }, { id: 'no', source: 'd', target: 'e', label: 'No' }, { id: 'pe', source: 'p', target: 'e' }],
}; }
test('valid branched flow has no diagnostics and validation is pure', () => {
  const graph = flow(), original = JSON.stringify(graph);
  assert.deepEqual(validateFlow(graph), []);
  assert.equal(JSON.stringify(graph), original);
});
test('empty and incomplete flows report missing start/end and dead ends', () => {
  assert.deepEqual(validateFlow({ nodes: [], edges: [] }).map(d => d.code), ['start-count', 'end-missing']);
  const graph = flow(); graph.edges = graph.edges.filter(e => e.id !== 'pe');
  assert.ok(validateFlow(graph).some(d => d.code === 'dead-end' && d.nodeId === 'p'));
});
test('branch names are required and unique after normalization', () => {
  const graph = flow(); graph.edges[2].label = ' sí ';
  assert.ok(validateFlow(graph).some(d => d.code === 'branch-duplicate' && d.edgeId === 'no'));
  graph.edges[2].label = ' ';
  assert.ok(validateFlow(graph).some(d => d.code === 'branch-label' && d.edgeId === 'no'));
  graph.edges.splice(2, 1);
  assert.ok(validateFlow(graph).some(d => d.code === 'decision-branches' && d.nodeId === 'd'));
});
test('invalid endpoints and reversed start/end connections are diagnosed', () => {
  const graph = flow(); graph.edges.push({ id: 'bad', source: 'absent', target: 'p' }, { id: 'back', source: 'e', target: 's' });
  const codes = validateFlow(graph).map(d => d.code);
  assert.ok(codes.includes('endpoint-missing')); assert.ok(codes.includes('start-incoming')); assert.ok(codes.includes('end-outgoing'));
});
test('unreachable nodes and cycles without an exit are different diagnostics', () => {
  const graph = flow(); graph.edges.find(e => e.id === 'pe')!.target = 'p';
  graph.nodes.push({ id: 'orphan', type: 'process', title: 'Unused' });
  const diagnostics = validateFlow(graph);
  assert.ok(diagnostics.some(d => d.code === 'unreachable' && d.nodeId === 'orphan'));
  assert.ok(diagnostics.some(d => d.code === 'no-exit' && d.nodeId === 'p'));
  assert.ok(!diagnostics.some(d => d.code === 'cycle'));
  assert.ok(validateFlow(graph, { allowCycles: false }).some(d => d.code === 'cycle' && d.edgeId === 'pe'));
});
test('cycle with a reachable exit is allowed unless the profile forbids it', () => {
  const graph = flow(); graph.edges.find(e => e.id === 'pe')!.target = 'd';
  assert.deepEqual(validateFlow(graph), []);
  assert.ok(validateFlow(graph, { allowCycles: false }).some(d => d.code === 'cycle'));
});
test('multiple starts are controlled by the host profile', () => {
  const graph = flow(); graph.nodes.push({ id: 's2', type: 'start', title: 'Other start' }); graph.edges.push({ id: 's2d', source: 's2', target: 'd' });
  assert.ok(validateFlow(graph).some(d => d.code === 'start-count'));
  assert.deepEqual(validateFlow(graph, { allowMultipleStarts: true }), []);
});
test('deep flows are validated without recursive stack overflow', () => {
  const nodes: SemanticGraph['nodes'] = Array.from({ length: 5000 }, (_, i) => ({ id: String(i), title: String(i), type: i === 0 ? 'start' : i === 4999 ? 'end' : 'process' }));
  const edges = nodes.slice(1).map((n, i) => ({ id: 'e' + i, source: String(i), target: n.id }));
  assert.deepEqual(validateFlow({ nodes, edges }, { allowCycles: false }), []);
});
import { describeDiagram } from '../packages/diagram/src/flow.ts';
test('describeDiagram summarizes counts, flow roles and node titles', () => {
  const g = flow();
  const text = describeDiagram(g);
  assert.match(text, /4 nodos y 4 conexiones/);
  assert.match(text, /1 inicio,/);
  assert.match(text, /1 final/);
  assert.match(text, /Nodos: Start, Ready\?/);
  assert.equal(describeDiagram({ nodes: [{ id: 'a', type: 'service', title: 'Solo' }], edges: [] }), 'Diagrama con 1 nodo y 0 conexiones. Nodos: Solo.');
});
import { diffDocuments } from '../packages/diagram/src/flow.ts';
import { createDocument } from '../packages/diagram/src/document.ts';
test('diffDocuments reports added, removed and changed nodes and edges', () => {
  const before = createDocument({ nodes: [{ id: 'a', type: 'service', title: 'A' }, { id: 'b', type: 'database', title: 'B' }], edges: [{ id: 'ab', source: 'a', target: 'b' }] });
  const after = createDocument({ nodes: [{ id: 'a', type: 'service', title: 'A2' }, { id: 'c', type: 'api', title: 'C' }], edges: [] });
  const d = diffDocuments(before, after);
  assert.deepEqual(d.nodes.added, ['c']);
  assert.deepEqual(d.nodes.removed, ['b']);
  assert.deepEqual(d.nodes.changed, ['a']); // title A -> A2
  assert.deepEqual(d.edges.removed, ['ab']);
  const same = diffDocuments(before, before);
  assert.deepEqual(same, { nodes: { added: [], removed: [], changed: [] }, edges: { added: [], removed: [], changed: [] } });
});
test('diffDocuments detects layout-only changes', () => {
  const before = createDocument({ nodes: [{ id: 'a', type: 'service', title: 'A' }], edges: [] });
  const after = structuredClone(before); after.layout.nodes.a.x += 50;
  assert.deepEqual(diffDocuments(before, after).nodes.changed, ['a']);
});
import { analyzeGraph } from '../packages/diagram/src/flow.ts';
test('analyzeGraph reports roots, leaves, isolated, depth, cycles and density', () => {
  const g = flow(); // s->d, d->p, d->e, p->e  (s start, e end)
  const m = analyzeGraph(g);
  assert.equal(m.nodeCount, 4);
  assert.equal(m.edgeCount, 4);
  assert.deepEqual(m.roots, ['s']);
  assert.deepEqual(m.leaves, ['e']);
  assert.deepEqual(m.isolated, []);
  assert.equal(m.hasCycle, false);
  assert.equal(m.depth, 4); // 4 levels: s(0) d(1) p(2) e(3)
  assert.equal(m.byType.start, 1);
});
test('analyzeGraph flags cycles and isolated nodes', () => {
  const g = { nodes: [{ id: 'a', type: 'process' as const, title: 'A' }, { id: 'b', type: 'process' as const, title: 'B' }, { id: 'x', type: 'process' as const, title: 'X' }], edges: [{ id: 'ab', source: 'a', target: 'b' }, { id: 'ba', source: 'b', target: 'a' }] };
  const m = analyzeGraph(g);
  assert.equal(m.hasCycle, true);
  assert.deepEqual(m.isolated, ['x']);
  assert.equal(m.nodeCount, 3);
});
import { lintDocument } from '../packages/diagram/src/flow.ts';
import { createDocument as makeDoc } from '../packages/diagram/src/document.ts';
test('lintDocument is ok for a valid flow and reports errors otherwise', () => {
  const valid = makeDoc(flow());
  const ok = lintDocument(valid);
  assert.equal(ok.ok, true);
  assert.equal(ok.errors, 0);
  assert.equal(ok.metrics.nodeCount, 4);
  // Remove the start node's type -> flow needs a start -> error.
  const broken = makeDoc({ nodes: [{ id: 'p', type: 'process', title: 'P' }], edges: [] });
  const bad = lintDocument(broken);
  assert.equal(bad.ok, false);
  assert.ok(bad.errors >= 1);
  assert.ok(bad.diagnostics.some(d => d.code === 'start-count'));
});

import { countCrossings } from '../packages/diagram/src/flow.ts';
import { createDocument as makeDocX } from '../packages/diagram/src/document.ts';
test('countCrossings detects crossing edges and ignores shared-endpoint and parallel ones', () => {
  // Four corners; edges a-d and b-c cross in an X. a top-left, b top-right, c bottom-left, d bottom-right.
  const doc = makeDocX({
    nodes: [
      { id: 'a', type: 'process', title: 'A' }, { id: 'b', type: 'process', title: 'B' },
      { id: 'c', type: 'process', title: 'C' }, { id: 'd', type: 'process', title: 'D' },
    ],
    edges: [{ id: 'ad', source: 'a', target: 'd' }, { id: 'bc', source: 'b', target: 'c' }],
  });
  doc.layout.nodes.a = { x: 0, y: 0, width: 160, height: 80 };
  doc.layout.nodes.b = { x: 400, y: 0, width: 160, height: 80 };
  doc.layout.nodes.c = { x: 0, y: 400, width: 160, height: 80 };
  doc.layout.nodes.d = { x: 400, y: 400, width: 160, height: 80 };
  assert.equal(countCrossings(doc), 1); // a->d crosses b->c
  // Edges sharing a node never count as a crossing.
  const star = makeDocX({ nodes: [{ id: 'h', type: 'process', title: 'H' }, { id: 'x', type: 'process', title: 'X' }, { id: 'y', type: 'process', title: 'Y' }], edges: [{ id: 'hx', source: 'h', target: 'x' }, { id: 'hy', source: 'h', target: 'y' }] });
  assert.equal(countCrossings(star), 0);
});
test('countCrossings is zero for a non-crossing layout and is pure', () => {
  const doc = makeDocX({ nodes: [{ id: 'a', type: 'process', title: 'A' }, { id: 'b', type: 'process', title: 'B' }], edges: [{ id: 'ab', source: 'a', target: 'b' }] });
  const original = JSON.stringify(doc);
  assert.equal(countCrossings(doc), 0);
  assert.equal(JSON.stringify(doc), original);
});

import { lintArchitecture } from '../packages/diagram/src/flow.ts';
import { createDocument as mkArchDoc } from '../packages/diagram/src/document.ts';
test('lintArchitecture flags UI->DB shortcuts, DB-initiated edges and isolated backend nodes', () => {
  const d = mkArchDoc({
    nodes: [
      { id: 'ui', type: 'screen', title: 'UI' }, { id: 'db', type: 'database', title: 'DB' },
      { id: 'svc', type: 'service', title: 'Svc' }, { id: 'lonely', type: 'service', title: 'Huérfano' },
    ],
    edges: [{ id: 'ui-db', source: 'ui', target: 'db' }, { id: 'db-svc', source: 'db', target: 'svc' }],
  });
  const diags = lintArchitecture(d);
  const codes = diags.map(x => x.code);
  assert.ok(codes.includes('ui-to-db'));
  assert.ok(codes.includes('db-initiates'));
  assert.ok(codes.includes('isolated-backend'));
  assert.equal(diags.find(x => x.code === 'ui-to-db')!.edgeId, 'ui-db');
  assert.equal(diags.find(x => x.code === 'isolated-backend')!.nodeId, 'lonely');
  assert.equal(diags.find(x => x.code === 'ui-to-db')!.severity, 'warning');
});
test('lintArchitecture returns nothing for a clean layered diagram', () => {
  const d = mkArchDoc({
    nodes: [{ id: 'ui', type: 'screen', title: 'UI' }, { id: 'api', type: 'api', title: 'API' }, { id: 'svc', type: 'service', title: 'Svc' }, { id: 'db', type: 'database', title: 'DB' }],
    edges: [{ id: 'e1', source: 'ui', target: 'api' }, { id: 'e2', source: 'api', target: 'svc' }, { id: 'e3', source: 'svc', target: 'db' }],
  });
  assert.deepEqual(lintArchitecture(d), []);
});

import { describeDiff } from '../packages/diagram/src/flow.ts';
import { createDocument as mkDiffDoc } from '../packages/diagram/src/document.ts';
test('describeDiff summarises added/removed/changed nodes and edges, with singular/plural', () => {
  const a = mkDiffDoc({ nodes: [{ id: 'x', type: 'process', title: 'X' }, { id: 'y', type: 'process', title: 'Y' }], edges: [{ id: 'xy', source: 'x', target: 'y' }] });
  const b = mkDiffDoc({ nodes: [{ id: 'x', type: 'process', title: 'X2' }, { id: 'z', type: 'process', title: 'Z' }], edges: [{ id: 'xz', source: 'x', target: 'z' }] });
  const s = describeDiff(a, b);
  assert.match(s, /\+1 nodo\b/);
  assert.match(s, /−1 nodo\b/);
  assert.match(s, /1 nodo modificado/);
  assert.match(s, /\+1 conexión/);
  assert.match(s, /−1 conexión/);
});
test('describeDiff returns "Sin cambios" for identical documents and pluralises', () => {
  const a = mkDiffDoc({ nodes: [{ id: 'x', type: 'process', title: 'X' }], edges: [] });
  assert.equal(describeDiff(a, a), 'Sin cambios');
  const b = mkDiffDoc({ nodes: [{ id: 'x', type: 'process', title: 'X' }, { id: 'y', type: 'process', title: 'Y' }, { id: 'z', type: 'process', title: 'Z' }], edges: [] });
  assert.match(describeDiff(a, b), /\+2 nodos/); // plural
});

import { healthCheck } from '../packages/diagram/src/flow.ts';
import { createDocument as mkHealthDoc } from '../packages/diagram/src/document.ts';
test('healthCheck unifies structural lint and architecture advisories with counts', () => {
  const d = mkHealthDoc({ nodes: [{ id: 'ui', type: 'screen', title: 'UI' }, { id: 'db', type: 'database', title: 'DB' }], edges: [{ id: 'uidb', source: 'ui', target: 'db' }] });
  const r = healthCheck(d);
  assert.equal(typeof r.ok, 'boolean');
  assert.equal(r.ok, r.errors === 0);
  assert.ok(r.warnings >= 1); // ui-to-db architecture advisory
  assert.ok(r.diagnostics.some(x => x.code === 'ui-to-db' && x.severity === 'warning'));
  assert.equal(r.errors + r.warnings + r.info, r.diagnostics.length);
});
test('healthCheck on a valid linear flow has no errors and is ok', () => {
  const d = mkHealthDoc({ nodes: [{ id: 'a', type: 'start', title: 'Inicio' }, { id: 'b', type: 'process', title: 'Paso' }, { id: 'c', type: 'end', title: 'Fin' }],
    edges: [{ id: 'ab', source: 'a', target: 'b' }, { id: 'bc', source: 'b', target: 'c' }] });
  const r = healthCheck(d);
  assert.equal(r.errors, 0);
  assert.equal(r.ok, true);
});

test('lintDocument skips flow validation for a non-flow (architecture) profile', () => {
  const arch = mkHealthDoc({ nodes: [{ id: 'ui', type: 'screen', title: 'UI' }, { id: 'db', type: 'database', title: 'DB' }], edges: [{ id: 'uidb', source: 'ui', target: 'db' }] }, undefined, 'architecture');
  const r = lintDocument(arch);
  assert.equal(r.ok, true);
  assert.equal(r.diagnostics.length, 0); // no spurious start/end errors
  // healthCheck still surfaces the architecture advisory (as a warning, not an error).
  const h = healthCheck(arch);
  assert.equal(h.errors, 0);
  assert.ok(h.warnings >= 1);
  // A flow-profile document is still validated.
  const flow = mkHealthDoc({ nodes: [{ id: 'x', type: 'process', title: 'X' }], edges: [] }, undefined, 'flow');
  assert.ok(lintDocument(flow).errors > 0);
});

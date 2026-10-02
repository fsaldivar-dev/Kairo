import { test } from 'node:test';
import assert from 'node:assert/strict';
import { toScheduleCsv } from '../packages/diagram/src/report.ts';
import { createDocument } from '../packages/diagram/src/document.ts';

// start -> check -> allow -> done, check -> deny.  Critical: start,check,allow,done; deny has slack.
const flow = () => createDocument({
  nodes: [
    { id: 'start', type: 'start', title: 'Inicio' },
    { id: 'check', type: 'decision', title: '¿OK?' },
    { id: 'allow', type: 'process', title: 'Permitir' },
    { id: 'deny', type: 'end', title: 'Denegar' },
    { id: 'done', type: 'end', title: 'Fin' },
  ],
  edges: [
    { id: 'e0', source: 'start', target: 'check' },
    { id: 'e1', source: 'check', target: 'allow' },
    { id: 'e2', source: 'allow', target: 'done' },
    { id: 'e3', source: 'check', target: 'deny' },
  ],
});

const rows = (csv: string) => csv.trim().split('\n').slice(1).map(l => l.split(','));

test('toScheduleCsv emits a header and one CPM row per node', () => {
  const csv = toScheduleCsv(flow());
  assert.equal(csv.split('\n')[0], 'id,title,type,earliestStart,earliestFinish,latestStart,latestFinish,slack,critical');
  const r = rows(csv);
  assert.equal(r.length, 5);
  const byId = Object.fromEntries(r.map(c => [c[0], c]));
  // start: es 0, ef 1, critical
  assert.deepEqual(byId.start.slice(3), ['0', '1', '0', '1', '0', 'true']);
  // deny: es 2, has slack, not critical
  assert.equal(byId.deny[3], '2');
  assert.ok(Number(byId.deny[7]) > 0);     // slack
  assert.equal(byId.deny[8], 'false');     // not critical
});

test('toScheduleCsv honours custom durations', () => {
  const csv = toScheduleCsv(flow(), { duration: id => (id === 'check' ? 3 : 1) });
  const byId = Object.fromEntries(rows(csv).map(c => [c[0], c]));
  assert.equal(byId.allow[3], '4'); // start(1) + check(3) = 4
});

test('toScheduleCsv escapes commas/quotes in titles', () => {
  const d = createDocument({ nodes: [{ id: 'n', type: 'process', title: 'Pagar, "ya"' }], edges: [] });
  const csv = toScheduleCsv(d);
  assert.match(csv, /"Pagar, ""ya"""/);
});

test('toScheduleCsv falls back to a sequential schedule on a cyclic graph', () => {
  const d = createDocument({
    nodes: [{ id: 'a', type: 'process', title: 'A' }, { id: 'b', type: 'process', title: 'B' }],
    edges: [{ id: 'e0', source: 'a', target: 'b' }, { id: 'e1', source: 'b', target: 'a' }],
  });
  const byId = Object.fromEntries(rows(toScheduleCsv(d)).map(c => [c[0], c]));
  assert.equal(byId.a[3], '0'); // a starts at 0
  assert.equal(byId.b[3], '1'); // b sequential after a
});

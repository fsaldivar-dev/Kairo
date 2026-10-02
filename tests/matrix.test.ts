import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createDocument } from '../packages/diagram/src/document.ts';
import { toAdjacencyMatrix, toMatrixCsv } from '../packages/diagram/src/matrix.ts';

const doc = () => createDocument({
  nodes: [{ id: 'a', type: 'process', title: 'A' }, { id: 'b', type: 'process', title: 'B' }, { id: 'c', type: 'process', title: 'C' }],
  edges: [{ id: 'ab', source: 'a', target: 'b' }, { id: 'ab2', source: 'a', target: 'b' }, { id: 'bc', source: 'b', target: 'c' }, { id: 'cc', source: 'c', target: 'c' }],
});

test('toAdjacencyMatrix counts directed edges (incl. parallels and self-loops) in declaration order', () => {
  const { ids, matrix } = toAdjacencyMatrix(doc().graph);
  assert.deepEqual(ids, ['a', 'b', 'c']);
  assert.deepEqual(matrix, [
    [0, 2, 0], // a->b twice
    [0, 0, 1], // b->c
    [0, 0, 1], // c->c self-loop on the diagonal
  ]);
});
test('toMatrixCsv emits a labelled header row and first column, pandas-friendly', () => {
  const csv = toMatrixCsv(doc());
  const lines = csv.split('\n');
  assert.equal(lines[0], 'node,A,B,C');
  assert.equal(lines[1], 'A,0,2,0');
  assert.equal(lines[2], 'B,0,0,1');
  assert.equal(lines[3], 'C,0,0,1');
});
test('toMatrixCsv escapes delimiters/quotes in labels and supports useIds and custom delimiter', () => {
  const d = createDocument({ nodes: [{ id: 'x', type: 'process', title: 'A, "B"' }, { id: 'y', type: 'process', title: 'Y' }], edges: [{ id: 'xy', source: 'x', target: 'y' }] });
  const csv = toMatrixCsv(d);
  assert.ok(csv.includes('"A, ""B"""')); // quoted + doubled inner quotes
  const ids = toMatrixCsv(d, { useIds: true }).split('\n')[0];
  assert.equal(ids, 'node,x,y');
  const tsv = toMatrixCsv(d, { delimiter: '\t', useIds: true }).split('\n')[0];
  assert.equal(tsv, 'node\tx\ty'); // tab-separated with ids
});
test('toAdjacencyMatrix ignores edges with unknown endpoints and handles an empty graph', () => {
  const d = createDocument({ nodes: [{ id: 'a', type: 'process', title: 'A' }], edges: [] });
  assert.deepEqual(toAdjacencyMatrix(d.graph).matrix, [[0]]);
  const empty = createDocument({ nodes: [], edges: [] });
  assert.deepEqual(toAdjacencyMatrix(empty.graph), { ids: [], labels: [], matrix: [] });
  assert.equal(toMatrixCsv(empty), 'node');
});

import { fromMatrixCsv } from '../packages/diagram/src/matrix.ts';

test('fromMatrixCsv round-trips toMatrixCsv structure (nodes + directed edges with parallels/self-loops)', () => {
  const csv = toMatrixCsv(doc());
  const back = fromMatrixCsv(csv).graph;
  assert.deepEqual(back.nodes.map(n => n.title), ['A', 'B', 'C']);
  const pair = (s: string, t: string) => back.edges.filter(e => {
    const bs = back.nodes.find(n => n.id === e.source)!.title, bt = back.nodes.find(n => n.id === e.target)!.title;
    return bs === s && bt === t;
  }).length;
  assert.equal(pair('A', 'B'), 2); // parallel count preserved
  assert.equal(pair('B', 'C'), 1);
  assert.equal(pair('C', 'C'), 1); // self-loop on the diagonal
  assert.equal(back.edges.length, 4);
});
test('fromMatrixCsv auto-detects the delimiter and skips zero/empty cells', () => {
  const tsv = 'node\tA\tB\nA\t0\t1\nB\t\t0';
  const g = fromMatrixCsv(tsv).graph;
  assert.equal(g.nodes.length, 2);
  assert.equal(g.edges.length, 1);
  const e = g.edges[0];
  assert.equal(g.nodes.find(n => n.id === e.source)!.title, 'A');
  assert.equal(g.nodes.find(n => n.id === e.target)!.title, 'B');
});
test('fromMatrixCsv rejects input without a data row or columns', () => {
  assert.throws(() => fromMatrixCsv('node,A,B'), /al menos una fila/);
  assert.throws(() => fromMatrixCsv('node\nA'), /no declara columnas/);
});

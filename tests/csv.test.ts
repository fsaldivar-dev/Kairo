import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fromCsv, toCsv } from '../packages/diagram/src/csv.ts';
import { convertText } from '../packages/diagram/src/convert.ts';

test('fromCsv reads a headerless edge list and lays it out in layers', () => {
  const doc = fromCsv('A,B,usa\nB,C\nA,C,salta');
  assert.deepEqual(doc.graph.nodes.map(n => n.title), ['A', 'B', 'C']);
  assert.equal(doc.graph.edges.length, 3);
  const ab = doc.graph.edges[0];
  assert.equal(ab.label, 'usa');
  // B is one level below A; layers place them on increasing y.
  assert.ok(doc.layout.nodes.B.y > doc.layout.nodes.A.y);
});
test('fromCsv honours a named header in any column order', () => {
  const doc = fromCsv('label,target,source\nverifica,Users,Auth');
  assert.deepEqual(doc.graph.nodes.map(n => n.title), ['Auth', 'Users']);
  assert.equal(doc.graph.edges[0].source, 'Auth');
  assert.equal(doc.graph.edges[0].target, 'Users');
  assert.equal(doc.graph.edges[0].label, 'verifica');
});
test('fromCsv auto-detects tab and semicolon delimiters', () => {
  assert.equal(fromCsv('A\tB\nB\tC').graph.edges.length, 2);
  assert.equal(fromCsv('A;B;rel').graph.edges[0].label, 'rel');
});
test('fromCsv parses quoted fields with commas and escaped quotes, skips comments', () => {
  const doc = fromCsv('# relations\n"Node, one","Say ""hi""",greets');
  assert.equal(doc.graph.nodes[0].title, 'Node, one');
  assert.equal(doc.graph.nodes[1].title, 'Say "hi"');
  assert.equal(doc.graph.edges[0].label, 'greets');
});
test('a row with an empty target just declares a node', () => {
  const doc = fromCsv('from,to\nSolo,\nA,B');
  assert.deepEqual(doc.graph.nodes.map(n => n.title), ['Solo', 'A', 'B']);
  assert.equal(doc.graph.edges.length, 1);
});
test('toCsv emits a header, edges and isolated nodes, and round-trips through fromCsv', () => {
  const doc = fromCsv('A,B,usa\nIsla,');
  const csv = toCsv(doc);
  assert.equal(csv.split('\n')[0], 'from,to,label');
  assert.ok(csv.includes('A,B,usa'));
  assert.ok(csv.includes('Isla,,')); // isolated node, empty to/label
  const back = fromCsv(csv);
  assert.deepEqual(back.graph.nodes.map(n => n.title), ['A', 'B', 'Isla']);
  assert.equal(back.graph.edges.length, 1);
});
test('toCsv quotes fields containing the delimiter and is pure', () => {
  const doc = fromCsv('"a,b",c');
  const original = JSON.stringify(doc);
  assert.ok(toCsv(doc).includes('"a,b",c,'));
  assert.equal(JSON.stringify(doc), original);
});
test('convertText bridges CSV to Mermaid and DOT to CSV', () => {
  const mermaid = convertText('A,B,usa', 'csv', 'mermaid');
  assert.ok(mermaid.includes('usa'));
  const csv = convertText('digraph { A -> B [label="x"] }', 'dot', 'csv');
  assert.ok(csv.includes('A,B,x'));
});

test('fromCsv reads a node table with type and tags columns (no edges)', () => {
  const doc = fromCsv('id,name,type,tags\nauth,AuthService,service,core;seguridad\ndb,UserDB,database,datos');
  assert.equal(doc.graph.edges.length, 0);
  assert.deepEqual(doc.graph.nodes.map(n => n.title), ['AuthService', 'UserDB']);
  assert.equal(doc.graph.nodes[0].type, 'service');
  assert.equal(doc.graph.nodes[1].type, 'database');
  assert.deepEqual(doc.graph.nodes[0].tags, ['core', 'seguridad']);
  assert.equal(doc.graph.nodes[0].id, 'auth'); // id column used as id
});
test('fromCsv node table falls back to process for unknown types and needs no id column', () => {
  const doc = fromCsv('name,type\nUno,bogus\nDos,api');
  assert.equal(doc.graph.nodes[0].type, 'process'); // unknown -> process
  assert.equal(doc.graph.nodes[1].type, 'api');
  assert.equal(doc.graph.nodes.length, 2);
  assert.equal(doc.graph.edges.length, 0);
});
test('fromCsv still treats a from/to header as an edge list even with extra columns', () => {
  const doc = fromCsv('from,to,label\nA,B,usa');
  assert.equal(doc.graph.edges.length, 1); // edge-list mode wins when to/target present
});

import { toCsvNodes } from '../packages/diagram/src/csv.ts';
import { createDocument as mkCsvDoc } from '../packages/diagram/src/document.ts';
test('toCsvNodes exports a node inventory table with escaping and joined tags', () => {
  const d = mkCsvDoc({ nodes: [
    { id: 'a', type: 'service', title: 'Auth, v2', group: 'Backend', tags: ['core', 'x'], source: 'src/a.ts' },
    { id: 'b', type: 'database', title: 'Users' },
  ], edges: [] });
  const lines = toCsvNodes(d).split('\n');
  assert.equal(lines[0], 'id,title,type,group,tags,source');
  assert.equal(lines[1], 'a,"Auth, v2",service,Backend,core;x,src/a.ts'); // comma in title quoted; tags joined
  assert.equal(lines[2], 'b,Users,database,,,'); // empty group/tags/source
});
test('toCsvNodes honours delimiter, tagSeparator and header:false', () => {
  const d = mkCsvDoc({ nodes: [{ id: 'a', type: 'process', title: 'A', tags: ['p', 'q'] }], edges: [] });
  const tsv = toCsvNodes(d, { delimiter: '\t', tagSeparator: '|', header: false });
  assert.equal(tsv, 'a\tA\tprocess\t\tp|q\t');
});

test('fromCsv node-table mode reads group and source, round-tripping toCsvNodes', () => {
  const d = mkCsvDoc({
    nodes: [
      { id: 'a', type: 'service', title: 'Auth', group: 'Backend', tags: ['secure', 'core'], source: 'auth.ts' },
      { id: 'b', type: 'database', title: 'DB', group: 'Backend' },
      { id: 'c', type: 'process', title: 'Plain' },
    ],
    edges: [],
  });
  const back = fromCsv(toCsvNodes(d)).graph;
  assert.deepEqual(back.nodes.map(n => n.title), ['Auth', 'DB', 'Plain']);
  assert.deepEqual(back.nodes.map(n => n.type), ['service', 'database', 'process']);
  const a = back.nodes.find(n => n.id === 'a')!;
  assert.equal(a.group, 'Backend');
  assert.equal(a.source, 'auth.ts');
  assert.deepEqual(a.tags, ['secure', 'core']);
  assert.equal(back.nodes.find(n => n.id === 'c')!.group, undefined); // empty cells stay absent
  assert.equal(back.edges.length, 0);
});

test('fromCsv enters node-table mode from a group column alone (no type/tags)', () => {
  const g = fromCsv('id,group\nx,Uno\ny,Dos').graph;
  assert.equal(g.nodes.length, 2);
  assert.equal(g.nodes.find(n => n.id === 'x')!.group, 'Uno');
  assert.equal(g.edges.length, 0);
});

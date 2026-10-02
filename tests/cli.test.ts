import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

// The CLIs import the built bundles; build once if missing.
before(() => {
  for (const f of ['io.js', 'export.js', 'analysis.js']) {
    if (!existsSync(join('packages/diagram/dist', f))) { spawnSync('npm', ['run', 'build:lib'], { stdio: 'ignore' }); break; }
  }
});
const run = (script: string, args: string[], input?: string) =>
  spawnSync('node', [`scripts/${script}`, ...args], { input, encoding: 'utf8' });

test('kairo-convert: auto-detects an unknown extension and writes the target format', () => {
  const dir = mkdtempSync(join(tmpdir(), 'kcli-'));
  const inp = join(dir, 'd.txt'), out = join(dir, 'd.svg');
  writeFileSync(inp, 'flowchart TD\n A[Uno] --> B[Dos]\n');
  const r = run('kairo-convert.mjs', [inp, out]);
  assert.equal(r.status, 0);
  assert.ok(existsSync(out));
});
test('kairo-convert: reads stdin and writes stdout with --to', () => {
  const r = run('kairo-convert.mjs', ['-', '-', '--to=dot'], 'A,B,usa\nB,C\n');
  assert.equal(r.status, 0);
  assert.ok(r.stdout.startsWith('digraph {'));
  assert.ok(r.stdout.includes('"A"'));
});
test('kairo-convert: fails cleanly on an unrecognisable input', () => {
  const r = run('kairo-convert.mjs', ['-', '-', '--to=dot'], 'xyzzy plain words only');
  assert.notEqual(r.status, 0);
});
test('kairo-lint: exits 0 for a valid flow and 1 for a broken one', () => {
  const ok = run('kairo-lint.mjs', ['-'], 'stateDiagram-v2\n [*] --> A\n A --> [*]\n');
  assert.equal(ok.status, 0);
  assert.match(ok.stdout, /OK/);
  const bad = run('kairo-lint.mjs', ['-'], 'flowchart TD\n A[Solo]\n');
  assert.equal(bad.status, 1);
  assert.match(bad.stdout, /ERROR/);
});

test('kairo-convert: emits GML (--to=gml) and reads it back by auto-detection', () => {
  const g = run('kairo-convert.mjs', ['-', '-', '--to=gml'], 'A,B,usa\nB,C\n');
  assert.equal(g.status, 0);
  assert.ok(g.stdout.startsWith('graph ['), 'GML output starts with a graph block');
  assert.ok(g.stdout.includes('label "A"'));
  const back = run('kairo-convert.mjs', ['-', '-', '--to=dot'], g.stdout); // auto-detect GML input
  assert.equal(back.status, 0);
  assert.ok(back.stdout.startsWith('digraph {'));
  assert.ok(back.stdout.includes('"A"'));
});

test('kairo-convert: renders Typst/CeTZ with --to=typst', () => {
  const r = run('kairo-convert.mjs', ['-', '-', '--to=typst'], 'flowchart TD\n A[Uno] --> B[Dos]\n');
  assert.equal(r.status, 0);
  assert.ok(r.stdout.includes('#cetz.canvas({'));
  assert.ok(r.stdout.includes('"Uno"'));
});

test('kairo-convert: emits Pajek (--to=pajek) and reads it back by auto-detection', () => {
  const g = run('kairo-convert.mjs', ['-', '-', '--to=pajek'], 'A,B,usa\nB,C\n');
  assert.equal(g.status, 0);
  assert.ok(g.stdout.startsWith('*Vertices'));
  const back = run('kairo-convert.mjs', ['-', '-', '--to=dot'], g.stdout); // auto-detect Pajek
  assert.equal(back.status, 0);
  assert.ok(back.stdout.startsWith('digraph {'));
});

test('kairo-convert: renders Structurizr DSL with --to=structurizr', () => {
  const r = run('kairo-convert.mjs', ['-', '-', '--to=structurizr'], 'flowchart TD\n A[Uno] --> B[Dos]\n');
  assert.equal(r.status, 0);
  assert.ok(r.stdout.startsWith('workspace '));
  assert.ok(r.stdout.includes('model {'));
  assert.ok(r.stdout.includes('"Uno"'));
});

test('kairo-convert: round-trips through Structurizr DSL (.dsl auto-detected on input)', () => {
  const dsl = run('kairo-convert.mjs', ['-', '-', '--to=structurizr'], 'A,B,usa\nB,C\n');
  assert.equal(dsl.status, 0);
  assert.ok(dsl.stdout.startsWith('workspace '));
  const back = run('kairo-convert.mjs', ['-', '-', '--from=structurizr', '--to=dot'], dsl.stdout);
  assert.equal(back.status, 0);
  assert.ok(back.stdout.startsWith('digraph {'));
});

test('kairo-convert: renders Mermaid C4 with --to=mermaidc4', () => {
  const r = run('kairo-convert.mjs', ['-', '-', '--to=mermaidc4'], 'flowchart TD\n A[Uno] --> B[Dos]\n');
  assert.equal(r.status, 0);
  assert.ok(r.stdout.startsWith('C4Context'));
  assert.ok(r.stdout.includes('"Uno"'));
  assert.ok(r.stdout.includes('Rel('));
});

test('kairo-convert: round-trips through nomnoml (.noml auto-detected)', () => {
  const noml = run('kairo-convert.mjs', ['-', '-', '--to=nomnoml'], 'A,B,usa\nB,C\n');
  assert.equal(noml.status, 0);
  assert.ok(/\[A\].*->.*\[B\]/.test(noml.stdout));
  const back = run('kairo-convert.mjs', ['-', '-', '--to=dot'], noml.stdout);
  assert.equal(back.status, 0);
  assert.ok(back.stdout.startsWith('digraph {'));
});

test('kairo-convert: round-trips through TGF (--from=tgf)', () => {
  const tgf = run('kairo-convert.mjs', ['-', '-', '--to=tgf'], 'A,B,usa\nB,C\n');
  assert.equal(tgf.status, 0);
  assert.ok(tgf.stdout.includes('#'));
  const back = run('kairo-convert.mjs', ['-', '-', '--from=tgf', '--to=dot'], tgf.stdout);
  assert.equal(back.status, 0);
  assert.ok(back.stdout.startsWith('digraph {'));
});

test('kairo-convert: round-trips through DGML (auto-detected on input)', () => {
  const dgml = run('kairo-convert.mjs', ['-', '-', '--to=dgml'], 'A,B,usa\nB,C\n');
  assert.equal(dgml.status, 0);
  assert.ok(dgml.stdout.includes('<DirectedGraph'));
  const back = run('kairo-convert.mjs', ['-', '-', '--to=dot'], dgml.stdout); // no --from: detectFormat sees DGML
  assert.equal(back.status, 0);
  assert.ok(back.stdout.startsWith('digraph {'));
});

test('kairo-convert: round-trips through ELK JSON (auto-detected on input)', () => {
  const elk = run('kairo-convert.mjs', ['-', '-', '--to=elk'], 'A,B,usa\nB,C\n');
  assert.equal(elk.status, 0);
  assert.ok(elk.stdout.includes('"children"'));
  const back = run('kairo-convert.mjs', ['-', '-', '--to=dot'], elk.stdout); // detectFormat sees children+edges
  assert.equal(back.status, 0);
  assert.ok(back.stdout.startsWith('digraph {'));
});

test('kairo-convert: round-trips through JGF (auto-detected on input)', () => {
  const jgf = run('kairo-convert.mjs', ['-', '-', '--to=jgf'], 'A,B,usa\nB,C\n');
  assert.equal(jgf.status, 0);
  assert.ok(jgf.stdout.includes('"graph"'));
  const back = run('kairo-convert.mjs', ['-', '-', '--to=dot'], jgf.stdout); // detectFormat sees graph.nodes/edges
  assert.equal(back.status, 0);
  assert.ok(back.stdout.startsWith('digraph {'));
});

test('kairo-convert: round-trips through OPML (auto-detected on input)', () => {
  const opml = run('kairo-convert.mjs', ['-', '-', '--to=opml'], 'A,B,usa\nB,C\n');
  assert.equal(opml.status, 0);
  assert.ok(opml.stdout.includes('<opml'));
  const back = run('kairo-convert.mjs', ['-', '-', '--to=dot'], opml.stdout); // detectFormat sees <opml
  assert.equal(back.status, 0);
  assert.ok(back.stdout.startsWith('digraph {'));
});

test('kairo-convert: round-trips through BPMN (auto-detected on input)', () => {
  const bpmn = run('kairo-convert.mjs', ['-', '-', '--to=bpmn'], 'A,B,usa\nB,C\n');
  assert.equal(bpmn.status, 0);
  assert.ok(bpmn.stdout.includes('<bpmn:definitions'));
  const back = run('kairo-convert.mjs', ['-', '-', '--to=dot'], bpmn.stdout); // detectFormat sees definitions+sequenceFlow
  assert.equal(back.status, 0);
  assert.ok(back.stdout.startsWith('digraph {'));
});

test('kairo-convert: round-trips through graphology (auto-detected on input)', () => {
  const gl = run('kairo-convert.mjs', ['-', '-', '--to=graphology'], 'A,B,usa\nB,C\n');
  assert.equal(gl.status, 0);
  assert.ok(gl.stdout.includes('"key"'));
  const back = run('kairo-convert.mjs', ['-', '-', '--to=dot'], gl.stdout); // detectFormat sees nodes with `key`
  assert.equal(back.status, 0);
  assert.ok(back.stdout.startsWith('digraph {'));
});

test('kairo-convert: round-trips through vis-network (.visjs auto-detected)', () => {
  const vis = run('kairo-convert.mjs', ['-', '-', '--to=visnetwork'], 'A,B,usa\nB,C\n');
  assert.equal(vis.status, 0);
  assert.ok(vis.stdout.includes('"from"') && vis.stdout.includes('"to"'));
  const back = run('kairo-convert.mjs', ['-', '-', '--to=dot'], vis.stdout);
  assert.equal(back.status, 0);
  assert.ok(back.stdout.startsWith('digraph {'));
});

test('kairo-convert: round-trips through node-link JSON (--to=nodelink)', () => {
  const nl = run('kairo-convert.mjs', ['-', '-', '--to=nodelink'], 'A,B,usa\nB,C\n');
  assert.equal(nl.status, 0);
  assert.ok(nl.stdout.includes('"links"') && nl.stdout.includes('"source"'));
  const back = run('kairo-convert.mjs', ['-', '-', '--to=dot'], nl.stdout);
  assert.equal(back.status, 0);
  assert.ok(back.stdout.startsWith('digraph {'));
});

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { convertText, parseAny, serializeAs } from '../packages/diagram/src/convert.ts';

test('convertText bridges Mermaid -> DOT and DOT -> JSON Canvas', () => {
  const dot = convertText('flowchart TD\n A-->B', 'mermaid', 'dot');
  assert.ok(dot.startsWith('digraph {'));
  const canvas = JSON.parse(convertText(dot, 'dot', 'canvas'));
  assert.equal(canvas.nodes.length, 2);
  assert.equal(canvas.edges.length, 1);
});
test('convertText round-trips a document through json and excalidraw', () => {
  const mermaid = 'flowchart TD\n A[Auth] --> B[Users]';
  const json = convertText(mermaid, 'mermaid', 'json');
  const doc = parseAny(json, 'json');
  assert.equal(doc.graph.nodes.length, 2);
  const scene = JSON.parse(serializeAs(doc, 'excalidraw'));
  assert.equal(scene.type, 'excalidraw');
  const back = parseAny(JSON.stringify(scene), 'excalidraw');
  assert.equal(back.graph.nodes.length, 2);
});

import { detectFormat, importAny } from '../packages/diagram/src/convert.ts';
test('detectFormat recognises each text and JSON format', () => {
  assert.equal(detectFormat('@startuml\nA --> B\n@enduml'), 'plantuml');
  assert.equal(detectFormat('<mxfile><diagram><mxGraphModel><root><mxCell id="0"/></root></mxGraphModel></diagram></mxfile>'), 'drawio');
  assert.equal(detectFormat('<graphml><graph edgedefault="directed"></graph></graphml>'), 'graphml');
  assert.equal(detectFormat('# T\n```mermaid\nflowchart TD\n A-->B\n```'), 'markdown');
  assert.equal(detectFormat('flowchart TD\n A --> B'), 'mermaid');
  assert.equal(detectFormat('digraph { A -> B }'), 'dot');
  assert.equal(detectFormat('from,to,label\nA,B,x'), 'csv');
  assert.equal(detectFormat('{"elements":{"nodes":[],"edges":[]}}'), 'cytoscape');
  assert.equal(detectFormat('{"type":"excalidraw","elements":[]}'), 'excalidraw');
  assert.equal(detectFormat('{"nodes":[],"edges":[]}'), 'canvas'); // JSON Canvas
  assert.equal(detectFormat('{"version":2,"graph":{"nodes":[],"edges":[]},"layout":{"nodes":{},"edges":{}}}'), 'json');
  assert.equal(detectFormat(''), null);
  assert.equal(detectFormat('just some prose without structure'), null);
});
test('importAny auto-detects and parses, and throws on unknown content', () => {
  const doc = importAny('flowchart TD\n A[Uno] --> B[Dos]');
  assert.equal(doc.graph.nodes.length, 2);
  const cy = importAny('{"elements":{"nodes":[{"data":{"id":"a","label":"A"}}],"edges":[]}}');
  assert.equal(cy.graph.nodes[0].title, 'A');
  assert.throws(() => importAny('???'), /No se reconoció/);
});

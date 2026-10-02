import { test } from 'node:test';
import assert from 'node:assert/strict';
import { encodeDocument, decodeDocument, toShareLink, fromShareLink } from '../packages/diagram/src/share.ts';
import { createDocument } from '../packages/diagram/src/document.ts';

function doc() {
  return createDocument({
    nodes: [{ id: 'a', type: 'service', title: 'Auth · Café ☕' }, { id: 'b', type: 'database', title: 'Users' }],
    edges: [{ id: 'ab', source: 'a', target: 'b', label: 'verifica <2x>' }],
  });
}

test('encodeDocument produces a prefixed, URL-safe code that decodes losslessly', () => {
  const d = doc(), code = encodeDocument(d);
  assert.ok(code.startsWith('K1:'));
  assert.match(code, /^K1:[A-Za-z0-9\-_]+$/); // URL-safe, no +/= so it survives a query/fragment untouched
  const back = decodeDocument(code);
  assert.deepEqual(back.graph, d.graph);
  assert.deepEqual(back.layout, d.layout);
});
test('round-trip preserves non-ASCII titles and reserved characters', () => {
  const back = decodeDocument(encodeDocument(doc()));
  assert.equal(back.graph.nodes[0].title, 'Auth · Café ☕');
  assert.equal(back.graph.edges[0].label, 'verifica <2x>');
});
test('encodeDocument is pure and validates before encoding', () => {
  const d = doc(), original = JSON.stringify(d);
  encodeDocument(d);
  assert.equal(JSON.stringify(d), original);
});
test('decodeDocument rejects a missing prefix or corrupt body', () => {
  assert.throws(() => decodeDocument('not-a-code'), /no reconocido/);
  assert.throws(() => decodeDocument('K1:@@@@'), /.*/); // garbage body -> parse error
});
test('toShareLink builds a #d= fragment and fromShareLink reads it back', () => {
  const d = doc(), link = toShareLink(d, 'https://app.example/diagram');
  assert.ok(link.startsWith('https://app.example/diagram#d=K1:'));
  const restored = fromShareLink(link);
  assert.ok(restored);
  assert.deepEqual(restored!.graph, d.graph);
});
test('fromShareLink accepts a bare hash or a bare code, and returns null when absent', () => {
  const code = encodeDocument(doc());
  assert.ok(fromShareLink('#d=' + code));
  assert.ok(fromShareLink(code)); // bare code
  assert.equal(fromShareLink('https://app.example/diagram'), null);
  assert.equal(fromShareLink('#d=K1:@@@'), null); // malformed -> null, not throw
});

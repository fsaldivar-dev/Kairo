import { test } from 'node:test';
import assert from 'node:assert/strict';
import { embedDocumentInPng, readDocumentFromPng, isPng } from '../packages/diagram/src/pngmeta.ts';
import { createDocument } from '../packages/diagram/src/document.ts';

const SIG = [137, 80, 78, 71, 13, 10, 26, 10];
// A minimal structurally-valid PNG: signature + IHDR (13 zero bytes) + IEND. Enough for chunk walking.
function crc32(bytes: Uint8Array): number { let c = 0xffffffff; for (let i = 0; i < bytes.length; i++) { c ^= bytes[i]; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; } return (c ^ 0xffffffff) >>> 0; }
function chunk(type: string, data: Uint8Array): Uint8Array {
  const out = new Uint8Array(12 + data.length), dv = new DataView(out.buffer);
  dv.setUint32(0, data.length); for (let i = 0; i < 4; i++) out[4 + i] = type.charCodeAt(i); out.set(data, 8);
  dv.setUint32(8 + data.length, crc32(out.subarray(4, 8 + data.length))); return out;
}
function minimalPng(): Uint8Array {
  const parts = [Uint8Array.from(SIG), chunk('IHDR', new Uint8Array(13)), chunk('IEND', new Uint8Array(0))];
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0)); let o = 0; for (const p of parts) { out.set(p, o); o += p.length; } return out;
}
// Walk chunk types to confirm the PNG stays well-formed (ends at IEND).
function chunkTypes(png: Uint8Array): string[] {
  const types: string[] = []; let p = 8; const dv = new DataView(png.buffer, png.byteOffset, png.byteLength);
  while (p + 8 <= png.length) { const len = dv.getUint32(p); const t = String.fromCharCode(png[p + 4], png[p + 5], png[p + 6], png[p + 7]); types.push(t); p += 12 + len; if (t === 'IEND') break; }
  return types;
}

const doc = () => createDocument({
  nodes: [{ id: 'a', type: 'start', title: 'Início €' }, { id: 'b', type: 'end', title: 'Fin' }],
  edges: [{ id: 'e0', source: 'a', target: 'b', label: 'ok' }],
});

test('embedDocumentInPng inserts an iTXt chunk before IEND and keeps the PNG well-formed', () => {
  const png = minimalPng(), embedded = embedDocumentInPng(png, doc());
  assert.ok(embedded.length > png.length);
  assert.deepEqual(chunkTypes(embedded), ['IHDR', 'iTXt', 'IEND']); // chunk order valid, IEND still last
  assert.ok(isPng(embedded));
});

test('readDocumentFromPng round-trips the document, including UTF-8 titles', () => {
  const back = readDocumentFromPng(embedDocumentInPng(minimalPng(), doc()));
  assert.ok(back);
  assert.deepEqual(back!.graph.nodes.map(n => n.title), ['Início €', 'Fin']); // UTF-8 (iTXt) survives
  assert.equal(back!.graph.edges[0].label, 'ok');
});

test('re-embedding replaces the previous chunk (no duplication)', () => {
  const once = embedDocumentInPng(minimalPng(), doc());
  const twice = embedDocumentInPng(once, doc());
  assert.deepEqual(chunkTypes(twice), ['IHDR', 'iTXt', 'IEND']); // still exactly one iTXt
  assert.ok(readDocumentFromPng(twice));
});

test('readDocumentFromPng returns null for a plain PNG and isPng rejects non-PNG bytes', () => {
  assert.equal(readDocumentFromPng(minimalPng()), null);     // no kairo chunk
  assert.equal(readDocumentFromPng(new Uint8Array([1, 2, 3])), null);
  assert.equal(isPng(new Uint8Array([1, 2, 3])), false);
  assert.throws(() => embedDocumentInPng(new Uint8Array([1, 2, 3]), doc()), /no es un png/i);
});

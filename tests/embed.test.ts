import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createDocument } from '../packages/diagram/src/document.ts';
import { toMermaid } from '../packages/diagram/src/text.ts';
import { toMermaidInkUrl, toMermaidInkMarkdown } from '../packages/diagram/src/embed.ts';

const doc = () => createDocument({
  nodes: [{ id: 'a', type: 'start', title: 'Inicio' }, { id: 'b', type: 'process', title: 'Pagar €5 / día' }, { id: 'c', type: 'end', title: 'Fin' }],
  edges: [{ id: 'ab', source: 'a', target: 'b' }, { id: 'bc', source: 'b', target: 'c', label: 'ok' }],
});

// Decode the base64url path segment the way mermaid.ink's js-base64 would, to prove it round-trips to the Mermaid source.
const B64URL = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
function decodeB64url(s: string): string {
  const look = new Int16Array(128).fill(-1); for (let i = 0; i < B64URL.length; i++) look[B64URL.charCodeAt(i)] = i;
  const bytes: number[] = [];
  for (let i = 0; i < s.length; i += 4) {
    const a = look[s.charCodeAt(i)], b = look[s.charCodeAt(i + 1)];
    const c = i + 2 < s.length ? look[s.charCodeAt(i + 2)] : -1, d = i + 3 < s.length ? look[s.charCodeAt(i + 3)] : -1;
    if (a < 0 || b < 0) break;
    bytes.push((a << 2) | (b >> 4));
    if (c >= 0) bytes.push(((b & 15) << 4) | (c >> 2));
    if (d >= 0) bytes.push(((c & 3) << 6) | d);
  }
  return new TextDecoder().decode(Uint8Array.from(bytes));
}

test('toMermaidInkUrl builds an img URL whose path base64url-decodes to the Mermaid source (incl. UTF-8)', () => {
  const url = toMermaidInkUrl(doc());
  assert.match(url, /^https:\/\/mermaid\.ink\/img\/[A-Za-z0-9\-_]+$/);
  const encoded = url.slice('https://mermaid.ink/img/'.length);
  assert.equal(decodeB64url(encoded), toMermaid(doc())); // lossless, and the € / é survive UTF-8
});
test('toMermaidInkUrl honours format, theme, bgColor, scale and width (query params) and a custom host', () => {
  const url = toMermaidInkUrl(doc(), { host: 'https://my.kroki.local/', format: 'svg', theme: 'dark', bgColor: '#1e1e1e', scale: 2, width: 800 });
  assert.ok(url.startsWith('https://my.kroki.local/svg/')); // trailing slash trimmed, svg route
  const qs = new URL(url).searchParams;
  assert.equal(qs.get('theme'), 'dark');
  assert.equal(qs.get('bgColor'), '1e1e1e'); // leading '#' stripped
  assert.equal(qs.get('scale'), '2');
  assert.equal(qs.get('width'), '800');
});
test('toMermaidInkMarkdown wraps the URL as a Markdown image, with optional link and sanitised alt', () => {
  const md = toMermaidInkMarkdown(doc(), { alt: 'Mi [flujo]' });
  assert.match(md, /^!\[Mi  flujo\]\(https:\/\/mermaid\.ink\/img\/[A-Za-z0-9\-_]+\)$/);
  const linked = toMermaidInkMarkdown(doc(), { link: 'https://example.com' });
  assert.match(linked, /^\[!\[Diagrama\]\(https:\/\/mermaid\.ink\/img\/[^)]+\)\]\(https:\/\/example\.com\)$/);
});

import { inflateSync } from 'node:zlib';
import { toKrokiUrl, toKrokiMarkdown } from '../packages/diagram/src/embed.ts';
import { toDotText } from '../packages/diagram/src/dot.ts';

function decodeKrokiPayload(url: string): string {
  const encoded = url.slice(url.lastIndexOf('/') + 1);
  // base64url -> bytes
  const B = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
  const look = new Int16Array(128).fill(-1); for (let i = 0; i < B.length; i++) look[B.charCodeAt(i)] = i;
  const bytes: number[] = [];
  for (let i = 0; i < encoded.length; i += 4) {
    const a = look[encoded.charCodeAt(i)], b = look[encoded.charCodeAt(i + 1)];
    const c = i + 2 < encoded.length ? look[encoded.charCodeAt(i + 2)] : -1, d = i + 3 < encoded.length ? look[encoded.charCodeAt(i + 3)] : -1;
    if (a < 0 || b < 0) break;
    bytes.push((a << 2) | (b >> 4));
    if (c >= 0) bytes.push(((b & 15) << 4) | (c >> 2));
    if (d >= 0) bytes.push(((c & 3) << 6) | d);
  }
  return inflateSync(Buffer.from(bytes)).toString('utf8'); // throws if the zlib stream is invalid
}

test('toKrokiUrl builds a /<diagram>/<format>/<payload> URL whose zlib payload inflates to the Mermaid source', () => {
  const url = toKrokiUrl(doc());
  assert.match(url, /^https:\/\/kroki\.io\/mermaid\/svg\/[A-Za-z0-9\-_]+$/);
  assert.equal(decodeKrokiPayload(url), toMermaid(doc())); // valid zlib + lossless
});
test('toKrokiUrl honours diagram language, format and a self-hosted host', () => {
  const url = toKrokiUrl(doc(), { diagram: 'graphviz', format: 'png', host: 'https://kroki.internal/' });
  assert.match(url, /^https:\/\/kroki\.internal\/graphviz\/png\/[A-Za-z0-9\-_]+$/);
  assert.equal(decodeKrokiPayload(url), toDotText(doc()));
});
test('toKrokiMarkdown wraps the URL as a Markdown image with optional link', () => {
  assert.match(toKrokiMarkdown(doc(), { alt: 'G' }), /^!\[G\]\(https:\/\/kroki\.io\/mermaid\/svg\/[^)]+\)$/);
  assert.match(toKrokiMarkdown(doc(), { link: 'https://x.y' }), /^\[!\[Diagrama\]\([^)]+\)\]\(https:\/\/x\.y\)$/);
});

import { toMermaidLiveUrl } from '../packages/diagram/src/embed.ts';
function b64urlToBytes(str: string): Buffer {
  const B = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
  const look = new Int16Array(128).fill(-1); for (let i = 0; i < B.length; i++) look[B.charCodeAt(i)] = i;
  const out: number[] = [];
  for (let i = 0; i < str.length; i += 4) {
    const a = look[str.charCodeAt(i)], b = look[str.charCodeAt(i + 1)];
    const c = i + 2 < str.length ? look[str.charCodeAt(i + 2)] : -1, d = i + 3 < str.length ? look[str.charCodeAt(i + 3)] : -1;
    if (a < 0 || b < 0) break;
    out.push((a << 2) | (b >> 4));
    if (c >= 0) out.push(((b & 15) << 4) | (c >> 2));
    if (d >= 0) out.push(((c & 3) << 6) | d);
  }
  return Buffer.from(out);
}
test('toMermaidLiveUrl builds an /edit#pako: link whose inflated state carries the Mermaid code', () => {
  const url = toMermaidLiveUrl(doc());
  assert.match(url, /^https:\/\/mermaid\.live\/edit#pako:[A-Za-z0-9\-_]+$/);
  const encoded = url.slice(url.indexOf('#pako:') + 6);
  const state = JSON.parse(inflateSync(b64urlToBytes(encoded)).toString('utf8'));
  assert.equal(state.code, toMermaid(doc())); // valid zlib + the editor receives the right source
  assert.ok(state.mermaid.includes('theme'));
});
test('toMermaidLiveUrl honours view mode, theme and a custom host', () => {
  const url = toMermaidLiveUrl(doc(), { mode: 'view', theme: 'dark', host: 'https://mm.local/' });
  assert.ok(url.startsWith('https://mm.local/view#pako:'));
  const state = JSON.parse(inflateSync(b64urlToBytes(url.slice(url.indexOf('#pako:') + 6))).toString('utf8'));
  assert.ok(state.mermaid.includes('dark'));
});

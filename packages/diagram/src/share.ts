import type { DiagramDocument } from './types';
import { parseDocument } from './document';

/** Shareable deep-link codes: a diagram becomes a compact, URL-safe string you can drop into a link,
 * an embed or a bookmark, and read back losslessly. Dependency-free; runs in Node and the browser. */

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
const LOOKUP = (() => { const m = new Int16Array(128).fill(-1); for (let i = 0; i < ALPHABET.length; i++) m[ALPHABET.charCodeAt(i)] = i; return m; })();
const PREFIX = 'K1:'; // version tag, so a stray string is rejected rather than mis-decoded.

/** base64url (RFC 4648 §5, no padding) over raw bytes. */
function bytesToBase64url(bytes: Uint8Array): string {
  let out = '';
  for (let i = 0; i < bytes.length; i += 3) {
    const a = bytes[i], b = i + 1 < bytes.length ? bytes[i + 1] : -1, c = i + 2 < bytes.length ? bytes[i + 2] : -1;
    out += ALPHABET[a >> 2] + ALPHABET[((a & 3) << 4) | (b < 0 ? 0 : b >> 4)];
    if (b >= 0) out += ALPHABET[((b & 15) << 2) | (c < 0 ? 0 : c >> 6)];
    if (c >= 0) out += ALPHABET[c & 63];
  }
  return out;
}
function base64urlToBytes(text: string): Uint8Array {
  const clean = text.replace(/[^A-Za-z0-9\-_]/g, '');
  const bytes: number[] = [];
  for (let i = 0; i < clean.length; i += 4) {
    const a = LOOKUP[clean.charCodeAt(i)], b = LOOKUP[clean.charCodeAt(i + 1)];
    const c = i + 2 < clean.length ? LOOKUP[clean.charCodeAt(i + 2)] : -1, d = i + 3 < clean.length ? LOOKUP[clean.charCodeAt(i + 3)] : -1;
    if (a < 0 || b < 0) break;
    bytes.push((a << 2) | (b >> 4));
    if (c >= 0) bytes.push(((b & 15) << 4) | (c >> 2));
    if (d >= 0) bytes.push(((c & 3) << 6) | d);
  }
  return Uint8Array.from(bytes);
}

/** Encodes a document as a compact, URL-safe code (prefixed `K1:`). Validates first, so the code is always importable. */
export function encodeDocument(document: DiagramDocument): string {
  const json = JSON.stringify(parseDocument(document));
  return PREFIX + bytesToBase64url(new TextEncoder().encode(json));
}
/** Decodes a code from encodeDocument back into a validated document. Throws on a malformed or wrong-version code. */
export function decodeDocument(code: string): DiagramDocument {
  const trimmed = code.trim();
  if (!trimmed.startsWith(PREFIX)) throw new Error('Código de diagrama no reconocido (falta el prefijo de versión).');
  const json = new TextDecoder().decode(base64urlToBytes(trimmed.slice(PREFIX.length)));
  return parseDocument(json);
}

/** Builds a shareable URL by putting the code in the fragment as `#d=<code>`. `base` defaults to '' (a bare `#d=…`). */
export function toShareLink(document: DiagramDocument, base = ''): string {
  return `${base}#d=${encodeDocument(document)}`;
}
/** Reads a document from a URL or hash that carries `d=<code>` (or a bare code). Returns null when none is present. */
export function fromShareLink(urlOrHash: string): DiagramDocument | null {
  const match = /[#&?]d=([^&]+)/.exec(urlOrHash) ?? (urlOrHash.includes(PREFIX) ? [null, urlOrHash.slice(urlOrHash.indexOf(PREFIX))] as const : null);
  if (!match || !match[1]) return null;
  try { return decodeDocument(decodeURIComponent(match[1])); } catch { return null; }
}

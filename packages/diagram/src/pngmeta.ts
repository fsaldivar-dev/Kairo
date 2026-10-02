import type { DiagramDocument } from './types';
import { parseDocument } from './document';

/** Round-trippable PNG — embed the Kairo document inside an exported PNG (as a private `iTXt` chunk) so the image
 * reopens as an editable diagram, the way Excalidraw and draw.io embed their scene. The pixels still come from the
 * browser (`toPNG`); these helpers are pure byte operations (dependency-free CRC32), so they run and test in Node
 * too. UTF-8 safe (iTXt), no eval. */
const SIGNATURE = [137, 80, 78, 71, 13, 10, 26, 10];
const KEYWORD = 'kairo';

let CRC_TABLE: Uint32Array | null = null;
const crcTable = (): Uint32Array => {
  if (CRC_TABLE) return CRC_TABLE;
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; }
  return (CRC_TABLE = t);
};
const crc32 = (bytes: Uint8Array): number => {
  const t = crcTable(); let c = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) c = t[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};
const hasSignature = (png: Uint8Array): boolean => SIGNATURE.every((b, i) => png[i] === b);
const typeOf = (png: Uint8Array, at: number): string => String.fromCharCode(png[at], png[at + 1], png[at + 2], png[at + 3]);
const u32 = (png: Uint8Array, at: number): number => (png[at] * 0x1000000) + (png[at + 1] << 16) + (png[at + 2] << 8) + png[at + 3];

/** Walks the PNG chunk list, returning `[dataStart, type, totalStart, totalEnd]` for each (totalEnd is exclusive,
 * covering length+type+data+crc). Stops after IEND. Returns [] when the signature is missing. */
function chunks(png: Uint8Array): Array<{ type: string; start: number; dataStart: number; length: number; end: number }> {
  if (!hasSignature(png)) return [];
  const out: Array<{ type: string; start: number; dataStart: number; length: number; end: number }> = [];
  let p = 8;
  while (p + 8 <= png.length) {
    const length = u32(png, p), type = typeOf(png, p + 4), end = p + 12 + length;
    if (end > png.length) break;
    out.push({ type, start: p, dataStart: p + 8, length, end });
    p = end;
    if (type === 'IEND') break;
  }
  return out;
}

const makeChunk = (type: string, data: Uint8Array): Uint8Array => {
  const out = new Uint8Array(12 + data.length);
  out[0] = (data.length >>> 24) & 0xff; out[1] = (data.length >>> 16) & 0xff; out[2] = (data.length >>> 8) & 0xff; out[3] = data.length & 0xff;
  for (let i = 0; i < 4; i++) out[4 + i] = type.charCodeAt(i);
  out.set(data, 8);
  const crc = crc32(out.subarray(4, 8 + data.length));
  out[8 + data.length] = (crc >>> 24) & 0xff; out[9 + data.length] = (crc >>> 16) & 0xff; out[10 + data.length] = (crc >>> 8) & 0xff; out[11 + data.length] = crc & 0xff;
  return out;
};

/** Returns a new PNG with the document stored in a private `iTXt` chunk (keyword "kairo"), inserted before IEND;
 * any existing Kairo chunk is replaced. Throws if the input is not a PNG. */
export function embedDocumentInPng(png: Uint8Array, document: DiagramDocument): Uint8Array {
  if (!hasSignature(png)) throw new Error('No es un PNG válido.');
  const list = chunks(png);
  const iend = list.find(c => c.type === 'IEND');
  const text = new TextEncoder().encode(JSON.stringify(document));
  const kw = Uint8Array.from(KEYWORD, c => c.charCodeAt(0));
  const data = new Uint8Array(kw.length + 5 + text.length); // kw \0 compFlag(0) compMethod(0) lang\0 transKw\0 text
  data.set(kw, 0); // the 5 bytes after kw are already 0: separator, compFlag, compMethod, empty lang term, empty transKw term
  data.set(text, kw.length + 5);
  const chunk = makeChunk('iTXt', data);
  // Rebuild the stream, dropping any prior Kairo iTXt and inserting the fresh chunk right before IEND.
  const parts: Uint8Array[] = [png.subarray(0, 8)];
  for (const c of list) {
    if (c.type === 'iTXt' && readKeyword(png.subarray(c.dataStart, c.dataStart + c.length)) === KEYWORD) continue;
    if (c === iend) parts.push(chunk);
    parts.push(png.subarray(c.start, c.end));
  }
  if (!iend) parts.push(chunk); // malformed input without IEND: append anyway
  const total = parts.reduce((n, p) => n + p.length, 0), result = new Uint8Array(total);
  let off = 0; for (const p of parts) { result.set(p, off); off += p.length; }
  return result;
}

const readKeyword = (data: Uint8Array): string => { const z = data.indexOf(0); return z < 0 ? '' : String.fromCharCode(...data.subarray(0, z)); };

/** Extracts a Kairo document previously embedded by {@link embedDocumentInPng}, or null when the PNG carries none
 * (or is invalid). Reads both `iTXt` (UTF-8) and `tEXt` (Latin-1) chunks; compressed iTXt is skipped. */
export function readDocumentFromPng(png: Uint8Array): DiagramDocument | null {
  for (const c of chunks(png)) {
    if (c.type !== 'iTXt' && c.type !== 'tEXt') continue;
    const data = png.subarray(c.dataStart, c.dataStart + c.length);
    const z = data.indexOf(0); if (z < 0 || readKeyword(data) !== KEYWORD) continue;
    let text: string;
    if (c.type === 'tEXt') text = new TextDecoder('latin1').decode(data.subarray(z + 1));
    else {
      if (data[z + 1] !== 0) continue; // compressed iTXt not supported
      const langEnd = data.indexOf(0, z + 3); if (langEnd < 0) continue;
      const transEnd = data.indexOf(0, langEnd + 1); if (transEnd < 0) continue;
      text = new TextDecoder().decode(data.subarray(transEnd + 1));
    }
    try { return parseDocument(JSON.parse(text)); } catch { return null; }
  }
  return null;
}

/** Quick check for the PNG signature, so callers can route a dropped/opened file to {@link readDocumentFromPng}. */
export function isPng(bytes: Uint8Array): boolean { return hasSignature(bytes); }

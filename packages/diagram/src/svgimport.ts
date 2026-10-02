import type { DiagramDocument } from './types';
import { parseDocument } from './document';

/** Re-imports an "editable SVG" produced by `toEditableSvg`: an ordinary SVG that also carries the full source
 * document in a `<metadata id="kairo-document">` element. This makes SVG a lossless round-trip format — export a
 * picture, edit or embed it elsewhere, then read it back with full fidelity (shapes, tags, groups, ports). The
 * metadata is XML-escaped JSON; everything else in the SVG is ignored. No eval. */
const unescapeXml = (s: string): string =>
  s.replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/&gt;/g, '>').replace(/&lt;/g, '<').replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(+d)).replace(/&amp;/g, '&');

/** Parses the embedded document from an editable SVG. Throws when the SVG carries no Kairo metadata. */
export function fromSvg(svg: string): DiagramDocument {
  const m = /<metadata\b[^>]*\bid="kairo-document"[^>]*>([\s\S]*?)<\/metadata>/.exec(svg);
  if (!m) throw new Error('El SVG no contiene datos de Kairo (expórtalo con toEditableSvg).');
  return parseDocument(unescapeXml(m[1].trim()));
}

/** True when the SVG carries an embedded Kairo document (i.e. `fromSvg` will succeed). */
export const isEditableSvg = (svg: string): boolean => /<metadata\b[^>]*\bid="kairo-document"/.test(svg);

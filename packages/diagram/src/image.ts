import type { DiagramDocument } from './types';
import { toSVG, type SvgExportOptions } from './export';

/** Standard base64 (RFC 4648 §4, with padding) over raw bytes — the encoding `data:...;base64,` expects.
 * Dependency-free so it runs identically in Node and the browser. */
const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
function base64(bytes: Uint8Array): string {
  let out = '';
  for (let i = 0; i < bytes.length; i += 3) {
    const a = bytes[i], b = i + 1 < bytes.length ? bytes[i + 1] : undefined, c = i + 2 < bytes.length ? bytes[i + 2] : undefined;
    out += B64[a >> 2] + B64[((a & 3) << 4) | ((b ?? 0) >> 4)];
    out += b === undefined ? '=' : B64[((b & 15) << 2) | ((c ?? 0) >> 6)];
    out += c === undefined ? '=' : B64[c & 63];
  }
  return out;
}

/** Renders the diagram to a self-contained `data:image/svg+xml;base64,…` URI. Drop it straight into an
 * `<img src>`, a Markdown image, a CSS `url()` or an email — no server, no external request. Offline and pure.
 * Accepts every {@link SvgExportOptions} (theme, wrapLabels, legend, links, …). */
export function toSvgDataUri(document: DiagramDocument, options: SvgExportOptions = {}): string {
  return 'data:image/svg+xml;base64,' + base64(new TextEncoder().encode(toSVG(document, options)));
}

/** A ready-to-paste Markdown image referencing the SVG data URI: `![alt](data:...)`. Pure and offline. */
export function toSvgMarkdownImage(document: DiagramDocument, options: SvgExportOptions & { alt?: string } = {}): string {
  const { alt = 'Diagrama Kairo', ...svg } = options;
  return `![${alt.replace(/[[\]]/g, '')}](${toSvgDataUri(document, svg)})`;
}

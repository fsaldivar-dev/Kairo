import type { DiagramDocument } from './types';
import { toMermaid } from './text';
import { toDotText } from './dot';
import { toPlantuml } from './plantuml';
import { toD2 } from './d2';

/** Live-image embed links: turn a diagram into a URL that renders as an image on any platform that shows an
 * `<img>` — GitHub/GitLab READMEs, Confluence, Notion, a wiki, a chat — via the public mermaid.ink service.
 * The Mermaid source is URL-safe base64-encoded into the path (js-base64 on the server decodes it), so no
 * server round-trip and no dependency here. Pure. Complements the in-app deep-link `toShareLink` (which points
 * back to Kairo) with a universally renderable picture. */

const B64URL = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
/** URL-safe base64 (RFC 4648 §5, no padding) over raw bytes. */
function bytesToBase64url(bytes: Uint8Array): string {
  let out = '';
  for (let i = 0; i < bytes.length; i += 3) {
    const a = bytes[i], b = i + 1 < bytes.length ? bytes[i + 1] : -1, c = i + 2 < bytes.length ? bytes[i + 2] : -1;
    out += B64URL[a >> 2] + B64URL[((a & 3) << 4) | (b < 0 ? 0 : b >> 4)];
    if (b >= 0) out += B64URL[((b & 15) << 2) | (c < 0 ? 0 : c >> 6)];
    if (c >= 0) out += B64URL[c & 63];
  }
  return out;
}
/** base64url over a UTF-8 string; mermaid.ink's js-base64 decodes this variant. */
const toBase64url = (text: string): string => bytesToBase64url(new TextEncoder().encode(text));

/** Adler-32 checksum (zlib trailer). */
function adler32(bytes: Uint8Array): number {
  let a = 1, b = 0; const MOD = 65521;
  for (let i = 0; i < bytes.length; i++) { a = (a + bytes[i]) % MOD; b = (b + a) % MOD; }
  return ((b << 16) | a) >>> 0;
}
/** Wraps raw bytes in a valid zlib stream using only *stored* (uncompressed) DEFLATE blocks — no compressor, yet
 * any inflater (pako, Kroki, Node zlib) decodes it. Header 0x78 0x01, stored blocks ≤ 65535 bytes, Adler-32 trailer. */
function zlibStore(data: Uint8Array): Uint8Array {
  const out: number[] = [0x78, 0x01];
  if (data.length === 0) out.push(0x01, 0x00, 0x00, 0xff, 0xff);
  else for (let i = 0; i < data.length;) {
    const len = Math.min(65535, data.length - i), last = i + len >= data.length ? 1 : 0;
    out.push(last, len & 0xff, (len >> 8) & 0xff, ~len & 0xff, (~len >> 8) & 0xff);
    for (let j = 0; j < len; j++) out.push(data[i + j]);
    i += len;
  }
  const ad = adler32(data);
  out.push((ad >>> 24) & 0xff, (ad >>> 16) & 0xff, (ad >>> 8) & 0xff, ad & 0xff);
  return Uint8Array.from(out);
}

export interface MermaidInkOptions {
  /** Service origin (self-hostable). Default 'https://mermaid.ink'. Trailing slashes trimmed. */
  host?: string;
  /** Output route: 'img' (PNG, default), 'svg' or 'pdf'. */
  format?: 'img' | 'svg' | 'pdf';
  /** Mermaid theme applied by the service. */
  theme?: 'default' | 'neutral' | 'dark' | 'forest';
  /** Background colour, e.g. 'white' or '#1e1e1e' (a leading '#' is optional). */
  bgColor?: string;
  /** Device pixel scale (1–3) for the PNG route. */
  scale?: number;
  /** Target pixel width. */
  width?: number;
}

/** Builds a mermaid.ink image URL for the document (the Mermaid export, base64url-encoded into the path). Drop
 * it in an `<img src>` or a Markdown image and it renders anywhere, no build step. Pure. */
export function toMermaidInkUrl(document: DiagramDocument, options: MermaidInkOptions = {}): string {
  const host = (options.host ?? 'https://mermaid.ink').replace(/\/+$/, '');
  const format = options.format ?? 'img';
  const encoded = toBase64url(toMermaid(document));
  const q = new URLSearchParams();
  if (options.theme) q.set('theme', options.theme);
  if (options.bgColor) q.set('bgColor', options.bgColor.replace(/^#/, ''));
  if (options.scale != null) q.set('scale', String(options.scale));
  if (options.width != null) q.set('width', String(options.width));
  const qs = q.toString();
  return `${host}/${format}/${encoded}${qs ? `?${qs}` : ''}`;
}

/** Source languages Kroki can render from a Kairo document (mapped to its text exporters). */
export type KrokiDiagram = 'mermaid' | 'graphviz' | 'plantuml' | 'd2';
const KROKI_SOURCE: Record<KrokiDiagram, (d: DiagramDocument) => string> = {
  mermaid: toMermaid, graphviz: toDotText, plantuml: toPlantuml, d2: toD2,
};

export interface KrokiOptions {
  /** Service origin (self-hostable). Default 'https://kroki.io'. Trailing slashes trimmed. */
  host?: string;
  /** Source language Kroki renders from (default 'mermaid'). */
  diagram?: KrokiDiagram;
  /** Output format (default 'svg'). */
  format?: 'svg' | 'png' | 'pdf' | 'jpeg';
}

/** Builds a Kroki image URL for the document. Kroki (kroki.io, self-hostable; used by GitLab, Confluence, Antora
 * and Asciidoctor) renders 25+ diagram languages to SVG/PNG/PDF. The source is exported to the chosen language,
 * zlib-compressed (stored blocks, dependency-free) and base64url-encoded into the path — exactly what Kroki's
 * GET endpoint expects: `<host>/<diagram>/<format>/<encoded>`. Pure, no server round-trip here. */
export function toKrokiUrl(document: DiagramDocument, options: KrokiOptions = {}): string {
  const host = (options.host ?? 'https://kroki.io').replace(/\/+$/, '');
  const diagram = options.diagram ?? 'mermaid', format = options.format ?? 'svg';
  const encoded = bytesToBase64url(zlibStore(new TextEncoder().encode(KROKI_SOURCE[diagram](document))));
  return `${host}/${diagram}/${format}/${encoded}`;
}

export interface KrokiMarkdownOptions extends KrokiOptions { alt?: string; link?: string }
/** Wraps {@link toKrokiUrl} as a Markdown image `![alt](url)`; with `link`, wraps the image in a link. Pure. */
export function toKrokiMarkdown(document: DiagramDocument, options: KrokiMarkdownOptions = {}): string {
  const alt = (options.alt ?? 'Diagrama').replace(/[[\]]/g, ' ').trim();
  const img = `![${alt}](${toKrokiUrl(document, options)})`;
  return options.link ? `[${img}](${options.link})` : img;
}

export interface MermaidInkMarkdownOptions extends MermaidInkOptions { alt?: string; link?: string }
/** Wraps {@link toMermaidInkUrl} as a Markdown image `![alt](url)` — paste straight into a README. With `link`
 * set, the image is wrapped in a Markdown link. Pure. */
export function toMermaidInkMarkdown(document: DiagramDocument, options: MermaidInkMarkdownOptions = {}): string {
  const alt = (options.alt ?? 'Diagrama').replace(/[[\]]/g, ' ').trim();
  const img = `![${alt}](${toMermaidInkUrl(document, options)})`;
  return options.link ? `[${img}](${options.link})` : img;
}

export interface MermaidLiveOptions {
  /** 'edit' (default) opens the editable playground; 'view' opens the read-only viewer. */
  mode?: 'edit' | 'view';
  /** Mermaid theme stored in the shared state. */
  theme?: 'default' | 'neutral' | 'dark' | 'forest';
  /** Service origin (default 'https://mermaid.live'). */
  host?: string;
}

/** Builds a mermaid.live deep link that opens the diagram in the Mermaid Live Editor — editable, not just a
 * rendered image. mermaid.live stores its state as a pako-(zlib)-deflated, base64url-encoded JSON blob after
 * `#pako:`; the dependency-free {@link zlibStore} produces a valid zlib stream that the editor's pako inflates.
 * Complements the render-only mermaid.ink / Kroki links with an editing entry point. Pure. */
export function toMermaidLiveUrl(document: DiagramDocument, options: MermaidLiveOptions = {}): string {
  const host = (options.host ?? 'https://mermaid.live').replace(/\/+$/, '');
  const mode = options.mode ?? 'edit', theme = options.theme ?? 'default';
  const state = JSON.stringify({ code: toMermaid(document), mermaid: JSON.stringify({ theme }), autoSync: true, updateDiagram: true });
  const encoded = bytesToBase64url(zlibStore(new TextEncoder().encode(state)));
  return `${host}/${mode}#pako:${encoded}`;
}

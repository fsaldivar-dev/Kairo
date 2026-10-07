import type { DiagramTheme } from './types';
import type { SvgExportOptions } from './export';
import { toSVG } from './export';
import { tryParse, type InputFormat } from './convert';

/** A theme can be a partial {@link DiagramTheme} or the string `'currentColor'`, which expands to
 * {@link currentColorTheme} so the SVG inherits the container's text colour (and light/dark mode). */
export type EmbedTheme = Partial<DiagramTheme> | 'currentColor';
/** Options for {@link mermaidToSvg}: every {@link SvgExportOptions} plus a `theme` that also accepts
 * `'currentColor'`. */
export type EmbedOptions = Omit<SvgExportOptions, 'theme'> & { theme?: EmbedTheme };

/** A token theme wired to `currentColor`/transparent: the exported SVG inherits the host's `color` for strokes
 * and text and lets the container background show through, so a diagram tracks light/dark with no theme mapping.
 * Pass it (or just `theme: 'currentColor'`) to {@link mermaidToSvg}/{@link enhanceMarkdown}. CSS variables work
 * too — any theme value is emitted verbatim, e.g. `{ edge: 'var(--line)' }`. */
export const currentColorTheme: Partial<DiagramTheme> = {
  nodeBackground: 'transparent', nodeBorder: 'currentColor', nodeText: 'currentColor', nodeSecondaryText: 'currentColor',
  nodeHoverBorder: 'currentColor', selectedBorder: 'currentColor', selectedBackground: 'transparent',
  edge: 'currentColor', edgeSelected: 'currentColor', edgeHover: 'currentColor',
  canvasBackground: 'transparent', grid: 'currentColor', iconBackground: 'transparent', icon: 'currentColor',
};

const resolveTheme = (theme: EmbedTheme | undefined): Partial<DiagramTheme> | undefined =>
  theme === 'currentColor' ? currentColorTheme : theme;

const escXml = (s: string): string => s.replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]!));

/** A small, self-describing SVG used in place of a diagram that could not be parsed/rendered. Uses `currentColor`
 * so it stays legible in light and dark. Never thrown — returned. */
export function errorSvg(message: string): string {
  const text = escXml(message).slice(0, 160);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="360" height="56" viewBox="0 0 360 56" role="img" aria-label="Diagrama no válido"><rect x="0.5" y="0.5" width="359" height="55" rx="6" fill="none" stroke="currentColor" stroke-dasharray="4 3" opacity="0.5"/><text x="14" y="32" font-family="system-ui, sans-serif" font-size="12" fill="currentColor">⚠ ${text}</text></svg>`;
}

/** Renders a code block of a given format straight to an SVG string, throw-safe. On a parse or render failure it
 * returns an {@link errorSvg} instead of throwing. Pure and synchronous. */
export function codeToSvg(code: string, from: InputFormat, options: EmbedOptions = {}): string {
  const doc = tryParse(code, from);
  if (!doc) return errorSvg(`No se pudo interpretar el diagrama (${from}).`);
  try { return toSVG(doc, { ...options, theme: resolveTheme(options.theme) }); }
  catch (error) { return errorSvg(String((error as Error)?.message ?? error)); }
}

/** One-call Mermaid → SVG, throw-safe: `mermaidToSvg('graph TD;A-->B')` returns an inline SVG; invalid syntax
 * returns an {@link errorSvg}, never throws. Pure and synchronous — no Mermaid runtime, no DOM. */
export function mermaidToSvg(code: string, options: EmbedOptions = {}): string {
  return codeToSvg(code, 'mermaid', options);
}

/** Code-fence language → Kairo input format. Covers the diagram languages that render from text. */
const LANG_TO_FORMAT: Record<string, InputFormat> = {
  mermaid: 'mermaid', dot: 'dot', graphviz: 'dot', gv: 'dot', d2: 'd2', plantuml: 'plantuml', puml: 'plantuml',
};

export interface EnhanceMarkdownOptions {
  /** Which fenced-code languages to replace (default: all of `mermaid`, `dot`/`graphviz`/`gv`, `d2`, `plantuml`/`puml`). */
  languages?: string[];
  /** Theme for the rendered SVGs; `'currentColor'` makes them inherit the container's light/dark. */
  theme?: EmbedTheme;
  /** Called when a block can't be parsed/rendered; the block is left untouched. */
  onError?: (error: unknown, code: string, language: string) => void;
}

const languageOf = (code: Element): string | null => {
  for (const cls of Array.from(code.classList)) { const m = /^language-([\w-]+)$/.exec(cls); if (m) return m[1].toLowerCase(); }
  return null;
};

/** Synchronously replaces fenced diagram code blocks (`<pre><code class="language-mermaid|dot|d2|plantuml…">`)
 * inside the given tree with inline SVG — no async, no Mermaid runtime, no network. Only reads/writes the tree it
 * receives (via its own document). Unsupported languages are left as-is; a block that fails to parse is left in
 * place and reported through `onError`. */
export function enhanceMarkdown(root: ParentNode, options: EnhanceMarkdownOptions = {}): void {
  const langs = options.languages ?? Object.keys(LANG_TO_FORMAT);
  for (const code of Array.from(root.querySelectorAll('pre > code'))) {
    const lang = languageOf(code);
    if (!lang || !langs.includes(lang)) continue;
    const from = LANG_TO_FORMAT[lang];
    if (!from) continue;
    const pre = code.parentElement, ownerDoc = pre?.ownerDocument;
    if (!pre || !ownerDoc) continue;
    const source = code.textContent ?? '';
    const doc = tryParse(source, from);
    if (!doc) { options.onError?.(new Error(`No se pudo interpretar ${lang}.`), source, lang); continue; }
    let svg: string;
    try { svg = toSVG(doc, { theme: resolveTheme(options.theme) }); }
    catch (error) { options.onError?.(error, source, lang); continue; }
    const figure = ownerDoc.createElement('figure');
    figure.className = 'kairo-diagram';
    figure.setAttribute('data-lang', lang);
    figure.innerHTML = svg;
    pre.replaceWith(figure);
  }
}

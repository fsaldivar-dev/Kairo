// Opt-in Markdown bundle for @fsaldivar.dev/diagram/markdown:
// the existing Markdown import/export, plus a synchronous one-call render and an in-place enhancer for rendered HTML.
export { toMarkdown, fromMarkdown, toMarkdownTables, toReadme } from './markdown';
export type { MarkdownExportOptions, MarkdownTablesOptions, ReadmeOptions } from './markdown';
export { mermaidToSvg, codeToSvg, enhanceMarkdown, errorSvg, currentColorTheme } from './mdembed';
export type { EmbedTheme, EmbedOptions, EnhanceMarkdownOptions } from './mdembed';

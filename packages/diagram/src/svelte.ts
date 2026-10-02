import { documentBinding } from './binding';
import { createDiagram, type DiagramEditor } from './editor';
import type { DiagramDocument, DiagramTheme, Selection } from './types';

export interface KairoActionParams {
  document: DiagramDocument;
  theme?: Partial<DiagramTheme>;
  readOnly?: boolean;
  onChange?: (document: DiagramDocument) => void;
  onSelectionChange?: (selection: Selection) => void;
  onReady?: (editor: DiagramEditor) => void;
}
/** Minimal Svelte ActionReturn; declared locally so the subpath has no Svelte dependency. */
export interface KairoAction {
  update(params: KairoActionParams): void;
  destroy(): void;
}

/**
 * Svelte action wrapping the Kairo editor: `<div use:kairo={{ document }} />`.
 * The idiomatic way to drive an imperative library from Svelte, with no compiler
 * or component file required. Callbacks are read live, so reassigning a handler
 * between renders takes effect without remounting. Import '@fsaldivar.dev/diagram/style.css' once.
 */
export function kairo(node: HTMLElement, params: KairoActionParams): KairoAction {
  let current = params;
  const binding = documentBinding(d => current.onChange?.(d));
  const editor = createDiagram(node, {
    document: params.document,
    theme: params.theme,
    readOnly: params.readOnly,
    onChange: binding.change,
    onSelectionChange: s => current.onSelectionChange?.(s),
  });
  current.onReady?.(editor);
  return {
    update(next: KairoActionParams) {
      binding.receive(editor, next.document);
      if (next.theme && next.theme !== current.theme) editor.setTheme(next.theme);
      if (!!next.readOnly !== !!current.readOnly) editor.setReadOnly(!!next.readOnly);
      current = next;
    },
    destroy() { editor.destroy(); },
  };
}

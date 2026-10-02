import { documentBinding } from './binding';
import { createElement, useEffect, useRef } from 'react';
import type { CSSProperties } from 'react';
import { createDiagram, type DiagramEditor } from './editor';
import type { DiagramDocument, DiagramTheme, Selection } from './types';

export interface KairoDiagramProps {
  document: DiagramDocument;
  theme?: Partial<DiagramTheme>;
  readOnly?: boolean;
  className?: string;
  style?: CSSProperties;
  onChange?: (document: DiagramDocument) => void;
  onSelectionChange?: (selection: Selection) => void;
  onReady?: (editor: DiagramEditor) => void;
}
/** React wrapper around the Kairo editor. Mounts once; syncs document/theme/readOnly on prop changes. Import '@fsaldivar.dev/diagram/style.css' once. */
export function KairoDiagram(props: KairoDiagramProps) {
  const host = useRef<HTMLDivElement>(null);
  const editor = useRef<DiagramEditor | null>(null);
  const cbs = useRef(props);
  cbs.current = props;
  const binding = useRef(documentBinding(d => cbs.current.onChange?.(d)));
  useEffect(() => {
    if (!host.current) return;
    const instance = createDiagram(host.current, {
      document: props.document,
      theme: props.theme,
      readOnly: props.readOnly,
      onChange: binding.current.change,
      onSelectionChange: s => cbs.current.onSelectionChange?.(s),
    });
    editor.current = instance;
    cbs.current.onReady?.(instance);
    return () => { instance.destroy(); editor.current = null; };
    // Mount once; prop changes are handled by the sync effects below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => { if (editor.current) binding.current.receive(editor.current, props.document); }, [props.document]);
  useEffect(() => { if (props.theme) editor.current?.setTheme(props.theme); }, [props.theme]);
  useEffect(() => { editor.current?.setReadOnly(!!props.readOnly); }, [props.readOnly]);
  return createElement('div', { ref: host, className: props.className, style: { width: '100%', height: '100%', ...props.style } });
}

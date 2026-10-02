import type { DiagramDocument } from './types';
import type { DiagramEditor } from './editor';
import { parseDocument } from './document';

/** External props replace documents silently; echoes of local edits preserve history and selection. */
export function documentBinding(notify: (document: DiagramDocument) => void) {
  let receiving = false;
  return {
    change(document: DiagramDocument): void { if (!receiving) notify(document); },
    receive(editor: DiagramEditor, document: DiagramDocument): void {
      const next = parseDocument(document);
      if (JSON.stringify(next) === JSON.stringify(editor.getDocument())) return;
      receiving = true;
      try { editor.setDocument(next); } finally { receiving = false; }
    },
  };
}

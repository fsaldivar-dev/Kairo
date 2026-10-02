import { createDraftStore, createDraftRecovery, type DraftEntry, type DraftStatus } from '@fsaldivar.dev/diagram/recovery';
import type { DiagramDocument, DiagramEditor } from '@fsaldivar.dev/diagram';
import { confirmAction } from './confirm';
import './recovery.css';

interface RecoveryOptions {
  dirty(): boolean;
  title(): string;
  restored(title: string): void;
  stop(): void;
  notify(message: string): void;
}
export function installRecovery(editor: DiagramEditor, options: RecoveryOptions) {
  const id = crypto.randomUUID(), namespace = 'kairo-draft-v1:';
  const store = createDraftStore({ storage: () => localStorage, namespace });
  const button = document.createElement('button');
  button.id = 'drafts-open'; button.className = 'drafts-button'; button.type = 'button';
  button.textContent = 'Borradores'; button.setAttribute('aria-haspopup', 'dialog');
  const live = document.createElement('span'); live.className = 'drafts-live'; live.id = 'draft-status'; live.setAttribute('role', 'status');
  button.setAttribute('aria-describedby', live.id);
  document.querySelector('#save-status')!.before(button, live);
  const dialog = document.createElement('dialog'); dialog.className = 'studio-dialog recovery-dialog';
  dialog.id = 'drafts-dialog'; dialog.setAttribute('aria-labelledby', 'drafts-heading');
  dialog.innerHTML = `<div class="studio-dialog-heading"><div><h2 id="drafts-heading">Recuperar borradores</h2><p>Copias locales de tus ediciones. Guardar conserva por separado tu versión definitiva.</p></div><button class="button dialog-close" aria-label="Cerrar borradores">Cerrar</button></div><p class="drafts-message" role="status"></p><div class="drafts-list" tabindex="-1"></div><div class="dialog-footer"><span>Recuperar permite deshacer. Ningún borrador se abre ni se elimina automáticamente.</span><button class="button drafts-refresh">Actualizar</button></div>`;
  document.body.append(dialog);
  const list = dialog.querySelector<HTMLDivElement>('.drafts-list')!, message = dialog.querySelector<HTMLParagraphElement>('.drafts-message')!;
  let queued: { document: DiagramDocument; revision: number } | null = null, destroyed = false;
  let entries: DraftEntry[] = [];
  function refresh(render = false): void {
    try {
      entries = store.list(); button.textContent = `Borradores (${entries.length})`;
      message.textContent = entries.length ? 'Elige una copia para recuperarla o exportarla.' : 'No hay borradores. Edita un diagrama y tu copia aparecerá aquí.';
      if (render) renderList();
    } catch {
      message.textContent = 'El almacenamiento local no está disponible. Puedes seguir editando y exportar tu diagrama.';
      button.dataset.state = 'error'; live.textContent = 'Borradores no disponibles';
      if (render) list.replaceChildren();
    }
  }
  function onStatus(status: DraftStatus): void {
    button.dataset.state = status.state;
    live.textContent = status.state === 'saved' ? 'Copia local del borrador lista' : status.state === 'error' ? 'No se pudo conservar el borrador. Exporta tu diagrama o libera espacio en Borradores.' : status.state === 'pending' ? 'Preparando copia local' : '';
    button.title = live.textContent || 'Ver copias locales';
    if (status.state === 'saved' || status.state === 'idle') refresh();
  }
  const controller = createDraftRecovery({ store, id, onStatus });
  function drain(): void {
    if (!queued || destroyed) return;
    const value = queued; queued = null;
    controller.schedule(value.document, { revision: value.revision, title: options.title().slice(0,200) });
  }
  function flush(): void { drain(); controller.flush(); }
  function action(label: string, run: () => void | Promise<void>): HTMLButtonElement {
    const b = document.createElement('button'); b.type='button'; b.className='button'; b.textContent=label;
    b.onclick = async () => { b.focus(); try { await run(); } catch { options.notify('No se pudo leer esta copia. El diagrama actual se conserva.'); } };
    return b;
  }
  function renderList(): void {
    list.replaceChildren();
    for (const entry of entries) {
      const row = document.createElement('article'); row.className='draft-card'; row.dataset.draftId=entry.id;
      const info = document.createElement('div'), title = document.createElement('h3'), detail = document.createElement('p');
      title.textContent = entry.record?.title || 'Borrador sin título';
      detail.textContent = entry.record ? `${new Date(entry.record.updatedAt).toLocaleString()} · ${entry.record.document.graph.nodes.length} nodos · ${entry.record.document.graph.edges.length} conexiones${entry.id === id ? ' · Esta ventana' : ''}` : 'Esta copia está dañada, es demasiado grande o pertenece a una versión no compatible.';
      info.append(title,detail); row.append(info);
      if (entry.record) {
        const preview=document.createElement('p'); preview.className='draft-preview';
        preview.textContent=entry.record.document.graph.nodes.slice(0,3).map(node=>node.title).join(' · ') || 'Diagrama vacío';
        info.append(preview);
      }
      const actions = document.createElement('div'); actions.className='draft-actions';
      if (entry.record) {
        const recover = action('Recuperar', async () => {
          if (editor.isReadOnly()) return;
          if (options.dirty() && !await confirmAction('¿Recuperar este borrador y reemplazar el diagrama actual? Puedes deshacer este cambio.', 'Recuperar')) return;
          if (destroyed || editor.isReadOnly()) return;
          const record = store.read(entry.id); if (!record) { refresh(true); return; }
          flush(); options.stop(); editor.replaceDocument(record.document); editor.fit(); options.restored(record.title);
          dialog.close(); options.notify('Borrador recuperado. Puedes deshacer o guardar esta versión.');
        });
        recover.disabled = editor.isReadOnly(); actions.append(recover);
        actions.append(action('Exportar JSON', () => {
          const record = store.read(entry.id); if (!record) { refresh(true); return; }
          const url = URL.createObjectURL(new Blob([JSON.stringify(record.document,null,2)],{type:'application/json'}));
          const link = document.createElement('a'); link.href=url; link.download=`kairo-borrador-${record.id}.json`; link.click();
          setTimeout(() => URL.revokeObjectURL(url),1000);
        }));
      }
      actions.append(action('Eliminar copia', async () => {
        if (!await confirmAction('¿Eliminar esta copia local? El diagrama abierto y la versión guardada se conservan.', 'Eliminar copia') || destroyed) return;
        if (entry.id === id) { queued=null; if (!controller.discard()) return; } else store.remove(entry.id);
        refresh(true); list.focus();
      }));
      row.append(actions); list.append(row);
    }
  }
  button.onclick = () => { flush(); refresh(true); dialog.showModal(); };
  dialog.querySelector<HTMLButtonElement>('.dialog-close')!.onclick = () => dialog.close();
  dialog.querySelector<HTMLButtonElement>('.drafts-refresh')!.onclick = () => { flush(); refresh(true); };
  dialog.addEventListener('close', () => button.focus());
  const hidden = (): void => { if (document.hidden) flush(); };
  const storage = (event: StorageEvent): void => {
    if (event.key === null || event.key.startsWith(namespace)) {
      if (dialog.open) message.textContent = 'Las copias cambiaron en otra ventana. Pulsa Actualizar para verlas.';
      else refresh();
    }
  };
  const pagehide = (): void => { flush(); };
  document.addEventListener('visibilitychange', hidden);
  window.addEventListener('pagehide', pagehide);
  window.addEventListener('storage', storage);
  refresh();
  return {
    changed(document: DiagramDocument, revision: number) {
      if (destroyed) return;
      queued={document,revision}; queueMicrotask(drain);
    },
    markSaved(revision: number) {
      if (queued && queued.revision <= revision) queued=null;
      controller.markSaved(revision);
    },
    destroy() {
      destroyed=true; queued=null; controller.destroy();
      document.removeEventListener('visibilitychange',hidden); window.removeEventListener('pagehide',pagehide); window.removeEventListener('storage',storage);
      dialog.remove(); button.remove(); live.remove();
    },
  };
}

import { isTauri } from '@fsaldivar.dev/plugin';
import './text-prompt.css';

let active = false;

/** Native WebViews may not display JavaScript prompts; use an accessible text dialog there. */
export function textPrompt(message: string, initial = '', invoker?: HTMLElement | null): Promise<string | null> {
  if (!isTauri()) return Promise.resolve(window.prompt(message, initial));
  if (active) return Promise.resolve(null);
  active = true;
  const previous = invoker ?? document.activeElement;
  const dialog = document.createElement('dialog');
  dialog.className = 'studio-dialog text-prompt-dialog';
  dialog.setAttribute('aria-labelledby', 'text-prompt-heading');
  dialog.innerHTML = '<div class="studio-dialog-heading"><div><h2 id="text-prompt-heading"></h2><p id="text-prompt-description"></p></div></div><div class="text-prompt-body"><label id="text-prompt-label" for="text-prompt-value">Contenido</label><textarea id="text-prompt-value" spellcheck="false"></textarea><p class="text-prompt-hint">⌘/Ctrl + Intro para aplicar · Escape para cancelar</p></div><div class="dialog-footer"><button class="button" type="button">Cancelar</button><button class="button primary" type="button">Aplicar</button></div>';
  const named = message.startsWith('Nombre del ');
  if (named) dialog.classList.add('text-prompt-name');
  dialog.querySelector('#text-prompt-heading')!.textContent = named ? 'Asignar nombre' : 'Importar texto';
  dialog.querySelector('#text-prompt-description')!.textContent = message;
  dialog.querySelector('#text-prompt-label')!.textContent = named ? 'Nombre' : 'Contenido';
  const field = dialog.querySelector<HTMLTextAreaElement>('#text-prompt-value')!;
  field.value = initial;
  const [cancel, accept] = dialog.querySelectorAll<HTMLButtonElement>('.dialog-footer button');
  document.body.append(dialog);
  return new Promise(resolve => {
    let settled = false;
    const finish = (value: string | null): void => {
      if (settled) return;
      settled = true;
      if (dialog.open) dialog.close();
      dialog.remove(); active = false;
      if (previous instanceof HTMLElement && previous.isConnected) previous.focus();
      resolve(value);
    };
    cancel.onclick = () => finish(null);
    accept.onclick = () => finish(field.value);
    field.addEventListener('keydown', event => {
      if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) { event.preventDefault(); finish(field.value); }
    });
    dialog.addEventListener('cancel', event => { event.preventDefault(); finish(null); });
    dialog.addEventListener('close', () => finish(null), { once: true });
    dialog.showModal(); field.focus();
  });
}

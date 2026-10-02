import './confirm.css';

let active = false;
/** HTML confirmation works in both browsers and WebViews without a native dialog plugin. */
export function confirmAction(message: string, accept = 'Continuar'): Promise<boolean> {
  if (active) return Promise.resolve(false);
  active = true;
  const previous = document.activeElement;
  const dialog = document.createElement('dialog');
  dialog.className = 'studio-dialog confirm-dialog';
  dialog.setAttribute('aria-labelledby', 'confirm-heading');
  dialog.setAttribute('aria-describedby', 'confirm-message');
  dialog.innerHTML = '<div class="studio-dialog-heading"><div><h2 id="confirm-heading">Confirmar cambio</h2><p id="confirm-message"></p></div></div><div class="dialog-footer"><button class="button" type="button" autofocus>Cancelar</button><button class="button primary" type="button"></button></div>';
  dialog.querySelector('#confirm-message')!.textContent = message;
  const [cancel, yes] = dialog.querySelectorAll<HTMLButtonElement>('button');
  yes.textContent = accept;
  document.body.append(dialog);
  return new Promise(resolve => {
    let settled = false;
    const finish = (accepted: boolean): void => {
      if (settled) return;
      settled = true;
      if (dialog.open) dialog.close();
      dialog.remove(); active = false;
      if (previous instanceof HTMLElement && previous.isConnected) previous.focus();
      resolve(accepted);
    };
    cancel.onclick = () => finish(false);
    yes.onclick = () => finish(true);
    dialog.addEventListener('cancel', event => { event.preventDefault(); finish(false); });
    dialog.addEventListener('close', () => finish(false), { once: true });
    dialog.showModal(); cancel.focus();
  });
}

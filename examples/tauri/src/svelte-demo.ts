// Drives the @fsaldivar.dev/diagram/svelte action imperatively, exactly as Svelte's runtime
// invokes an action: kairo(node, params) on mount, action.update(next) on prop change,
// action.destroy() on unmount. This exercises the real action contract without the
// Svelte compiler, so the example stays a plain multi-page Vite app.
import { kairo, type KairoAction } from '@fsaldivar.dev/diagram/svelte';
import { createDocument, lightTheme } from '@fsaldivar.dev/diagram';
import '@fsaldivar.dev/diagram/style.css';

const docA = createDocument({ nodes: [{ id: 'a', type: 'service', title: 'AuthService' }, { id: 'b', type: 'database', title: 'UserDatabase' }], edges: [{ id: 'ab', source: 'a', target: 'b', label: 'verifica' }] });
const docB = createDocument({ nodes: [{ id: 'ui', type: 'screen', title: 'LoginView' }, { id: 'api', type: 'api', title: 'Gateway' }, { id: 'db', type: 'database', title: 'Users' }], edges: [{ id: 'x', source: 'ui', target: 'api' }, { id: 'y', source: 'api', target: 'db' }] });

const root = document.getElementById('root')!;
root.style.cssText = 'height:100vh;display:flex;flex-direction:column;font-family:sans-serif';
const button = document.createElement('button');
button.id = 'swap'; button.textContent = 'Cambiar documento';
button.style.cssText = 'margin:8px;padding:8px 12px;align-self:flex-start';
const host = document.createElement('div');
host.style.cssText = 'flex:1;min-height:0';
root.append(button, host);

let showA = true;
const action: KairoAction = kairo(host, { document: docA, theme: lightTheme });
button.addEventListener('click', () => {
  showA = !showA;
  action.update({ document: showA ? docA : docB, theme: lightTheme });
});
window.addEventListener('beforeunload', () => action.destroy());

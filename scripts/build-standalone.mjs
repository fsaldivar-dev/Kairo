#!/usr/bin/env node
// Builds a single, self-contained, offline HTML editor from the global bundle.
// Inlines dist/kairo.global.css + dist/kairo.global.js and a tiny editor shell.
// Output: artifacts/kairo-standalone.html (double-click to edit diagrams offline).
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const read = (p) => readFileSync(root + p, 'utf8');
let css, js;
try { css = read('packages/diagram/dist/kairo.global.css'); js = read('packages/diagram/dist/kairo.global.js'); }
catch { console.error('Falta el build global. Ejecuta: npm run build:lib'); process.exit(1); }

const bootstrap = `
const { createDiagram, createDocument, parseDocument, lightTheme, darkTheme } = window.Kairo;
const KEY = 'kairo-standalone-doc';
const dark = matchMedia('(prefers-color-scheme: dark)').matches;
document.documentElement.dataset.theme = dark ? 'dark' : 'light';
const fallback = () => createDocument({ nodes: [{ id: 'n1', type: 'process', title: 'Doble clic para editar' }], edges: [] });
let initial; try { const s = localStorage.getItem(KEY); initial = s ? parseDocument(s) : fallback(); } catch { initial = fallback(); }
const editor = createDiagram(document.getElementById('canvas'), { document: initial, theme: dark ? darkTheme : lightTheme });
const toast = (m) => { const t = document.getElementById('toast'); t.textContent = m; t.style.opacity = '1'; clearTimeout(t._h); t._h = setTimeout(() => (t.style.opacity = '0'), 1800); };
document.getElementById('add').onclick = () => { editor.addNode('process', 'Nuevo nodo'); };
document.getElementById('save').onclick = () => { try { localStorage.setItem(KEY, JSON.stringify(editor.getDocument())); toast('Guardado en este navegador.'); } catch { toast('No se pudo guardar.'); } };
document.getElementById('open').onclick = () => { try { const s = localStorage.getItem(KEY); if (!s) return toast('No hay nada guardado.'); editor.setDocument(parseDocument(s)); editor.fit(); toast('Abierto.'); } catch { toast('Guardado inválido.'); } };
document.getElementById('clear').onclick = () => { editor.setDocument(fallback()); editor.fit(); toast('Lienzo nuevo.'); };
document.getElementById('json').onclick = () => { const url = URL.createObjectURL(new Blob([JSON.stringify(editor.getDocument(), null, 2)], { type: 'application/json' })); const a = document.createElement('a'); a.href = url; a.download = 'diagrama.kairo.json'; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); };
`;

const html = `<!doctype html>
<html lang="es" data-kairo-standalone>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Kairo — editor autónomo</title>
<style>
${css}
:root { color-scheme: light dark; }
* { box-sizing: border-box; }
body { margin: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
.bar { position: fixed; inset: 0 0 auto 0; height: 48px; display: flex; gap: 8px; align-items: center; padding: 0 12px; background: Canvas; border-bottom: 1px solid rgba(128,128,128,.25); z-index: 2; }
.bar strong { margin-right: auto; font-size: 14px; }
.bar button { font: inherit; padding: 6px 12px; border-radius: 8px; border: 1px solid rgba(128,128,128,.4); background: transparent; color: inherit; cursor: pointer; }
.bar button:hover { background: rgba(128,128,128,.12); }
#canvas { position: fixed; inset: 48px 0 0 0; }
#toast { position: fixed; bottom: 16px; left: 50%; transform: translateX(-50%); background: rgba(20,20,25,.92); color: #fff; padding: 8px 14px; border-radius: 10px; opacity: 0; transition: opacity .2s; z-index: 3; font-size: 13px; }
</style>
</head>
<body>
<div class="bar"><strong>Kairo</strong><button id="add">Añadir nodo</button><button id="clear">Nuevo</button><button id="open">Abrir</button><button id="save">Guardar</button><button id="json">Exportar JSON</button></div>
<div id="canvas"></div>
<div id="toast" role="status" aria-live="polite"></div>
<script>${js}</script>
<script>${bootstrap}</script>
</body>
</html>
`;

mkdirSync(root + 'artifacts', { recursive: true });
writeFileSync(root + 'artifacts/kairo-standalone.html', html);
const kb = (Buffer.byteLength(html) / 1024).toFixed(0);
console.log(`artifacts/kairo-standalone.html (${kb} KiB, autónomo y sin conexión)`);

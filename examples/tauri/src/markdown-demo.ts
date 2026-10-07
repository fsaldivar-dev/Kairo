import { enhanceMarkdown, mermaidToSvg } from '@fsaldivar.dev/diagram/markdown';

const status = document.getElementById('status')!;
const doc = document.getElementById('doc')!;
const out = document.getElementById('one-call-out')!;
let failures = 0;

document.getElementById('enhance')!.addEventListener('click', () => {
  failures = 0;
  enhanceMarkdown(doc, { theme: 'currentColor', onError: () => { failures++; } });
  const rendered = doc.querySelectorAll('figure.kairo-diagram svg').length;
  status.textContent = `Bloques renderizados: ${rendered}; con error: ${failures}.`;
});

document.getElementById('one-call')!.addEventListener('click', () => {
  out.innerHTML = mermaidToSvg('graph TD;A-->B', { theme: 'currentColor' });
  status.textContent = `mermaidToSvg devolvió ${out.querySelector('svg') ? 'un SVG' : 'texto'}.`;
});

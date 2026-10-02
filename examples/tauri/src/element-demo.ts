import { createDocument, type DiagramDocument } from '@fsaldivar.dev/diagram';
import { defineKairoElement, type KairoDiagramHost } from '@fsaldivar.dev/diagram/element';
import '@fsaldivar.dev/diagram/style.css';
import './element-demo.css';

defineKairoElement();
const diagram = document.querySelector<KairoDiagramHost>('#diagram')!;
const status = document.querySelector<HTMLElement>('#status')!;
let loadCount = 0;

diagram.addEventListener('documentload', event => {
  const { src, document: loaded } = (event as CustomEvent<{ src: string; document: DiagramDocument }>).detail;
  status.textContent = `Cargado ${src}: ${loaded.graph.nodes.length} nodos · carga ${++loadCount}`;
});
diagram.addEventListener('documenterror', event => {
  const { src, error } = (event as CustomEvent<{ src: string; error: string }>).detail;
  status.textContent = `No se pudo cargar ${src}: ${error}. El diagrama anterior sigue visible.`;
});

document.querySelector('#load-a')!.addEventListener('click', () => diagram.setAttribute('src', '/embedded-a.json'));
document.querySelector('#load-b')!.addEventListener('click', () => diagram.setAttribute('src', '/embedded-b.json'));
document.querySelector('#reload')!.addEventListener('click', () => { status.textContent = 'Recargando URL actual…'; void diagram.reload(); });
document.querySelector('#clear')!.addEventListener('click', () => { diagram.document = undefined; status.textContent = 'Vista vacía. Recarga la URL para restaurar el diagrama.'; });
document.querySelector('#fail')!.addEventListener('click', () => diagram.setAttribute('src', '/embedded-invalid.json'));
document.querySelector('#replace')!.addEventListener('click', () => {
  diagram.document = createDocument({
    nodes: [{ id: 'host', type: 'service', title: 'Tu sistema' }, { id: 'kairo', type: 'process', title: 'Kairo embebido' }],
    edges: [{ id: 'host-kairo', source: 'host', target: 'kairo', label: 'document' }],
  });
  status.textContent = 'El host reemplazó el documento mediante la propiedad document.';
});

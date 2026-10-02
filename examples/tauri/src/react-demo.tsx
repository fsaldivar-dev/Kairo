import { createElement as h, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { KairoDiagram } from '@fsaldivar.dev/diagram/react';
import { createDocument, lightTheme, type DiagramEditor } from '@fsaldivar.dev/diagram';
import '@fsaldivar.dev/diagram/style.css';

const docA = createDocument({ nodes: [{ id: 'a', type: 'service', title: 'AuthService' }, { id: 'b', type: 'database', title: 'UserDatabase' }], edges: [{ id: 'ab', source: 'a', target: 'b', label: 'verifica' }] });
const docB = createDocument({ nodes: [{ id: 'ui', type: 'screen', title: 'LoginView' }, { id: 'api', type: 'api', title: 'Gateway' }, { id: 'db', type: 'database', title: 'Users' }], edges: [{ id: 'x', source: 'ui', target: 'api' }, { id: 'y', source: 'api', target: 'db' }] });

function App() {
  const [doc, setDoc] = useState(docA);
  const [changes, setChanges] = useState(0);
  const editor = useRef<Pick<DiagramEditor, 'undo'> | null>(null);
  return h('div', { style: { height: '100vh', display: 'flex', flexDirection: 'column', fontFamily: 'sans-serif' } },
    h('nav', { style: { display: 'flex', alignItems: 'center', gap: 12, padding: 12 } },
      h('button', { id: 'swap', onClick: () => setDoc(d => d.graph.nodes[0]?.id === 'a' ? docB : docA) }, 'Cambiar documento'),
      h('button', { id: 'undo', onClick: () => editor.current?.undo() }, 'Deshacer'),
      h('output', { id: 'changes' }, `Cambios: ${changes}`),
      h('span', null, 'Estado controlado por React · Doble clic para editar un nodo'),
    ),
    h('div', { style: { flex: 1, minHeight: 0 } }, h(KairoDiagram, { document: doc, theme: lightTheme, onReady: e => { editor.current = e; }, onChange: next => { setDoc(next); setChanges(n => n + 1); } })),
  );
}
createRoot(document.getElementById('root')!).render(h(App));

import { createApp, h, shallowRef, ref } from 'vue';
import { KairoDiagram } from '@fsaldivar.dev/diagram/vue';
import { createDocument, lightTheme, type DiagramEditor, type DiagramDocument } from '@fsaldivar.dev/diagram';
import '@fsaldivar.dev/diagram/style.css';

const docA = createDocument({ nodes: [{ id: 'a', type: 'service', title: 'AuthService' }, { id: 'b', type: 'database', title: 'UserDatabase' }], edges: [{ id: 'ab', source: 'a', target: 'b', label: 'verifica' }] });
const docB = createDocument({ nodes: [{ id: 'ui', type: 'screen', title: 'LoginView' }, { id: 'api', type: 'api', title: 'Gateway' }, { id: 'db', type: 'database', title: 'Users' }], edges: [{ id: 'x', source: 'ui', target: 'api' }, { id: 'y', source: 'api', target: 'db' }] });

createApp({
  setup() {
    const doc = shallowRef(docA), changes = ref(0);
    let editor: DiagramEditor | undefined;
    return () => h('div', { style: { height: '100vh', display: 'flex', flexDirection: 'column', fontFamily: 'sans-serif' } }, [
      h('nav', { style: { display: 'flex', alignItems: 'center', gap: '12px', padding: '12px' } }, [
        h('button', { id: 'swap', onClick: () => { doc.value = doc.value.graph.nodes[0]?.id === 'a' ? docB : docA; } }, 'Cambiar documento'),
        h('button', { id: 'undo', onClick: () => editor?.undo() }, 'Deshacer'),
        h('output', { id: 'changes' }, `Cambios: ${changes.value}`),
        h('span', 'Estado controlado por Vue · Doble clic para editar un nodo'),
      ]),
      h('div', { style: { flex: 1, minHeight: 0 } }, [h(KairoDiagram, { document: doc.value, theme: lightTheme, onReady: (e: DiagramEditor) => { editor = e; }, onChange: (next: DiagramDocument) => { doc.value = next; changes.value++; } })]),
    ]);
  },
}).mount('#root');

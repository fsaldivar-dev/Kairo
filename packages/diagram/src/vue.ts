import { documentBinding } from './binding';
import { defineComponent, h, onBeforeUnmount, onMounted, ref, watch, type PropType } from 'vue';
import { createDiagram, type DiagramEditor } from './editor';
import type { DiagramDocument, DiagramTheme } from './types';

/** Vue 3 component wrapping the Kairo editor. Mounts once; syncs document/theme/readOnly props. Emits `change`, `selectionChange`, `ready`. Import '@fsaldivar.dev/diagram/style.css' once. */
export const KairoDiagram = defineComponent({
  name: 'KairoDiagram',
  props: {
    document: { type: Object as PropType<DiagramDocument>, required: true },
    theme: { type: Object as PropType<Partial<DiagramTheme>>, default: undefined },
    readOnly: { type: Boolean, default: false },
  },
  emits: ['change', 'selectionChange', 'ready'],
  setup(props, { emit }) {
    const host = ref<HTMLDivElement | null>(null);
    let editor: DiagramEditor | null = null;
    const binding = documentBinding(d => emit('change', d));
    onMounted(() => {
      if (!host.value) return;
      editor = createDiagram(host.value, {
        document: props.document, theme: props.theme, readOnly: props.readOnly,
        onChange: binding.change, onSelectionChange: s => emit('selectionChange', s),
      });
      emit('ready', editor);
    });
    onBeforeUnmount(() => { editor?.destroy(); editor = null; });
    watch(() => props.document, d => { if (editor) binding.receive(editor, d); });
    watch(() => props.theme, t => { if (t) editor?.setTheme(t); });
    watch(() => props.readOnly, r => editor?.setReadOnly(!!r));
    return () => h('div', { ref: host, style: { width: '100%', height: '100%' } });
  },
});

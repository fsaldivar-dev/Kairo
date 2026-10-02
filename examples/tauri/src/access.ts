import type { DiagramEditor } from '@fsaldivar.dev/diagram';
/** One UI editing boundary for menus, inspector fields, toolbar actions and the palette. */
export function installAccess(editor: DiagramEditor) {
  const mutations = '[data-add], [data-align], [data-distribute], #inspector-content input, #inspector-content select, #delete, #delete-multi, #add-empty, #reverse, #group-nodes, #ungroup-nodes, #lane-nodes, #undo, #redo, #example-select, #template-select, #load, #file-input';
  function update(): void {
    document.querySelectorAll<HTMLElement>(mutations).forEach(el=>el.setAttribute('data-mutation',''));
    for(const label of ['Layout','Importar']) {
      const menu=[...document.querySelectorAll('.cd-menu')].find(m=>m.querySelector('.cd-menu-trigger')?.textContent?.trim()===label);
      menu?.querySelectorAll('button:not(.cd-menu-trigger)').forEach(el=>el.setAttribute('data-mutation',''));
    }
    document.getElementById('simplify')?.setAttribute('data-mutation','');
    for(const el of document.querySelectorAll<HTMLButtonElement|HTMLInputElement|HTMLSelectElement>('[data-mutation]')) {
      if(editor.isReadOnly()) { if(!el.hasAttribute('data-ro-disabled')) el.setAttribute('data-ro-disabled',String(el.disabled)); el.disabled=true; }
      else if(el.hasAttribute('data-ro-disabled')) {el.disabled=el.getAttribute('data-ro-disabled')==='true';el.removeAttribute('data-ro-disabled');}
    }
    document.body.classList.toggle('viewer-mode',editor.isReadOnly());
  }
  const guard=(e:Event)=>{if(editor.isReadOnly()&&(e.target as Element).closest('[data-mutation]')){e.preventDefault();e.stopImmediatePropagation();}};
  document.addEventListener('click',guard,true);document.addEventListener('change',guard,true);
  update();return {update};
}

import { createDocument, type DiagramDocument, type DiagramEditor, type DiagramTheme, type EdgeStyle } from '@fsaldivar.dev/diagram';
import { fromMarkdown, parseAny, serializeAs, type InputFormat } from '@fsaldivar.dev/diagram/io';
import { autoLayout, mergeDocuments, mergeLayout, gridLayout } from '@fsaldivar.dev/diagram/layout';
import { toSVG, toPNG, toEditableSvg } from '@fsaldivar.dev/diagram/export';
import { getTemplate } from '@fsaldivar.dev/diagram/templates';
import { PathPlayer, flowSteps } from '@fsaldivar.dev/diagram/player';
import { sampleDocument, decisionDocument } from './sample';
import markdownExample from './samples/markdown.md?raw';
import { shapesDocument } from './shapes';
import { labelsDocument } from './labels';

const escape = (s: string) => s.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
const formats: [InputFormat, string][] = [['mermaid','Mermaid'],['json','Kairo JSON (sin pérdida)'],['dot','Graphviz DOT'],['drawio','draw.io XML'],['plantuml','PlantUML'],['d2','D2'],['canvas','Obsidian Canvas'],['reactflow','React Flow'],['cytoscape','Cytoscape'],['excalidraw','Excalidraw'],['graphml','GraphML'],['gexf','GEXF'],['gml','GML'],['csv','CSV'],['matrix','Matriz CSV'],['outline','Esquema'],['markdown','Markdown'],['pajek','Pajek']];
interface Example { id: string; name: string; description: string; kind: string; build: () => DiagramDocument; tasks: string[]; source?: { format: InputFormat; text: string } }
function connections(): DiagramDocument {
  const d = createDocument({nodes:[
    {id:'origin',type:'start',title:'Inicio',tags:['entrada']}, {id:'rule',type:'decision',title:'¿Continuamos?',tags:['decisión']},
    {id:'work',type:'process',title:'Procesar',tags:['operación']}, {id:'done',type:'end',title:'Completado'},
    {id:'retry',type:'service',title:'Reintentar',tags:['opcional']},
  ],edges:[{id:'a',source:'origin',target:'rule',label:'solicitud'}, {id:'yes',source:'rule',target:'work',label:'Sí',condition:'ready'}, {id:'no',source:'rule',target:'retry',label:'No',condition:'!ready'}, {id:'end',source:'work',target:'done',label:'resultado'}, {id:'back',source:'retry',target:'rule',label:'volver'}]},undefined,'flow');
  const positions: Record<string,[number,number]>={origin:[60,80],rule:[360,50],work:[690,80],done:[1010,80],retry:[370,340]};
  for(const [id,[x,y]] of Object.entries(positions)) Object.assign(d.layout.nodes[id],{x,y});
  d.layout.nodes.done.shape='ellipse';
  d.layout.edges={a:{sourcePort:'right',targetPort:'left',startMarker:'dot'},yes:{sourcePort:'right',targetPort:'left'},no:{sourcePort:'bottom',targetPort:'top',dashed:true},end:{sourcePort:'right',targetPort:'left',endMarker:'dot'},back:{sourcePort:'left',targetPort:'left',dashed:true,labelPosition:'start',labelOffset:16}};
  return d;
}
function groups(): DiagramDocument {
  const d=sampleDocument();
  for(const n of d.graph.nodes) n.group=['login','dashboard'].includes(n.id)?'Producto/Cliente':['users','firebase'].includes(n.id)?'Producto/Datos':'Producto/Servicios';
  return d;
}
function scale(): DiagramDocument {
  return gridLayout(createDocument({nodes:Array.from({length:100},(_,i)=>({id:`n${i}`,type:'process',title:`Paso ${i+1}`,tags:i%10===0?['hito']:undefined})),edges:Array.from({length:99},(_,i)=>({id:`e${i}`,source:`n${i}`,target:`n${i+1}`}))}),{columns:10});
}
const examples: Example[] = [
  {id:'labels',name:'Etiquetas multilínea',description:'Títulos largos que se ajustan al espacio, con referencias y saltos de línea.',kind:'TEXTO',build:labelsDocument,tasks:['Selecciona el primer nodo y arrastra su esquina para ajustar el texto en vivo.','Cambia el ancho o el título desde Propiedades; Deshacer restaura el cambio.','Exporta como SVG y comprueba que conserva las mismas líneas.']},
  {id:'shapes',name:'Catálogo de formas',description:'Doce formas para datos, documentos, decisiones y procesos.',kind:'FORMAS',build:shapesDocument,tasks:['Selecciona una forma y cambia sus dimensiones.','Arrastra desde un puerto y comprueba cómo se ajusta al contorno.','Abre el taller para exportar el catálogo como SVG editable o PNG.']},
  {id:'decisions',name:'Decisiones de acceso',description:'Ramas Sí/No, condiciones y finales alternativos.',kind:'FLUJOS',build:decisionDocument,tasks:['Selecciona una flecha y cambia su condición.','Arrastra desde un puerto para crear otra ruta.','Reorganiza sin perder etiquetas ni estilos.']},
  {id:'markdown',name:'Markdown → diagrama',description:'Edita un README con un bloque Mermaid y mira cómo se convierte en diagrama.',kind:'DOCUMENTACIÓN',build:()=>fromMarkdown(markdownExample),source:{format:'markdown',text:markdownExample},tasks:['Abre «Probar Markdown» para editar el README de ejemplo.','Modifica un nodo o una etiqueta dentro del bloque Mermaid.','Aplica el resultado al lienzo y prueba Deshacer.']},
  {id:'connections',name:'Formas y conexiones',description:'Cuatro formas, tags, marcadores y rutas de retorno.',kind:'LENGUAJE VISUAL',build:connections,tasks:['Cambia entre curvas suaves y ángulos rectos.','Selecciona una conexión y prueba ambas puntas.','Edita una etiqueta con doble clic y desplázala.']},
  {id:'architecture',name:'Sistema de acceso',description:'Pantallas, servicios, API y bases de datos.',kind:'ARQUITECTURA',build:sampleDocument,tasks:['Añade una pieza desde la biblioteca.','Conecta dos nodos desde sus puertos.','Prueba búsqueda, minimapa y selección múltiple.']},
  {id:'groups',name:'Grupos anidados',description:'Cliente, servicios y datos dentro de Producto.',kind:'ORGANIZACIÓN',build:groups,tasks:['Pulsa el triángulo de un grupo para colapsarlo.','Arrastra su encabezado y observa las conexiones.','Usa Shift para seleccionar y agrupar varios nodos.']},
  {id:'swimlane',name:'Carriles de trabajo',description:'Un proceso repartido entre cliente y servidor.',kind:'PROCESOS',build:()=>getTemplate('swimlane'),tasks:['Arrastra una tarea al carril vecino.','Edita el carril desde sus propiedades.','Exporta la vista con los carriles incluidos.']},
  {id:'cicd',name:'Entrega continua',description:'Pipeline con aprobación y un ciclo de corrección.',kind:'DECISIONES',build:()=>getTemplate('cicdPipeline'),tasks:['Explora el ciclo y la ruta de aprobación.','Reproduce el recorrido paso a paso.','Abre el texto y cambia el nombre de una etapa.']},
  {id:'microservices',name:'Microservicios',description:'Gateway, servicios independientes y eventos.',kind:'SISTEMAS',build:()=>getTemplate('microservices'),tasks:['Prueba layouts y sus cuatro direcciones.','Resalta el vecindario de un servicio.','Agrupa servicios por tipo o comunidad.']},
  {id:'state',name:'Máquina de estados',description:'Carga, éxito, error y reintentos.',kind:'ESTADOS',build:()=>getTemplate('stateMachine'),tasks:['Inspecciona las transiciones con etiquetas.','Cambia los puertos sin cambiar su significado.','Exporta como SVG editable y vuelve a importarlo.']},
  {id:'scale',name:'100 nodos',description:'Prueba navegación, búsqueda y selección a escala.',kind:'RENDIMIENTO',build:scale,tasks:['Busca «Paso 80» y navega con el minimapa.','Acércate para comprobar los niveles de detalle.','Selecciona un conjunto y alinéalo.']},
];
export interface StudioOptions { theme(): DiagramTheme; edgeStyle(): EdgeStyle; changed(title?: string): void; notify(message: string): void; stop(): void }
export function createStudio(editor: DiagramEditor, options: StudioOptions) {
  const $ = <T extends HTMLElement = HTMLElement>(s:string)=>document.querySelector<T>(s)!;
  let active=examples.find(e=>e.id==='architecture')!, player:PathPlayer|null=null, revision='', parsing=0;
  let previewDoc:DiagramDocument|null=null, sourceDoc:DiagramDocument|null=null, canvasSource:DiagramDocument|null=null, previewFormat:InputFormat='mermaid';
  let pendingExample:Example|undefined;
  const panel=document.createElement('div'); panel.id='studio-panel'; panel.hidden=true;
  panel.innerHTML=`<div class="studio-intro"><span class="studio-kicker">PRUEBA KAIRO</span><h2 id="studio-title">${active.name}</h2><p id="studio-description">${active.description}</p><button class="button primary" id="studio-gallery">Explorar ejemplos <span>↗</span></button></div>
  <div class="studio-section"><h3>Prueba en este diagrama</h3><ol id="studio-tasks"></ol></div>
  <div class="studio-section"><h3>Conexiones permitidas</h3><p>Prueba estas reglas al crear o reconectar una flecha.</p><label class="studio-check"><input type="checkbox" data-policy="allowSelfLoops" data-mutation> Bucles sobre el mismo nodo</label><label class="studio-check"><input type="checkbox" data-policy="allowMultipleEdges" data-mutation> Varias conexiones entre nodos</label><label class="studio-check"><input type="checkbox" data-policy="allowCycles" data-mutation> Rutas con ciclos</label></div>
  <div class="studio-section"><h3>Organizar el diagrama</h3><label class="studio-field">Dirección<select id="studio-direction"><option value="LR">Izquierda → derecha</option><option value="RL">Derecha → izquierda</option><option value="TB">Arriba → abajo</option><option value="BT">Abajo → arriba</option></select></label><button class="button" id="studio-layout" data-mutation>Aplicar layout jerárquico</button></div>
  <div class="studio-section"><h3>Recorrido visual</h3><p>Resalta los nodos en orden de recorrido.</p><div class="player-controls"><button class="button" id="studio-prev" aria-label="Paso anterior">←</button><button class="button" id="studio-play">Reproducir</button><button class="button" id="studio-next" aria-label="Paso siguiente">→</button><button class="button" id="studio-stop">Detener</button></div><output id="studio-progress" aria-live="polite">Sin reproducir</output></div>
  <div class="studio-section"><h3>Texto y exportación</h3><p>Edita Mermaid o JSON, compara el resultado y aplica los cambios cuando estén listos.</p><button class="button" id="studio-code">Abrir taller de texto</button><button class="button" id="studio-markdown">Probar Markdown → diagrama</button></div>`;
  $('.inspector').append(panel);
  $('.inspector-heading').innerHTML='<div class="inspector-tabs" role="tablist" aria-label="Panel lateral"><button id="tab-properties" role="tab" aria-selected="true">Propiedades</button><button id="tab-studio" role="tab" aria-selected="false">Probar Kairo</button></div>';
  const gallery=document.createElement('dialog');gallery.id='example-gallery';gallery.className='studio-dialog';gallery.setAttribute('aria-label','Galería de diagramas');
  gallery.innerHTML=`<div class="studio-dialog-heading"><div><span class="studio-kicker">KAIRO / EXPLORAR</span><h2>Un lienzo. Muchas posibilidades.</h2><p>Elige un diagrama para probarlo. Puedes volver al anterior con Deshacer.</p></div><button class="button dialog-close" aria-label="Cerrar galería">Cerrar ×</button></div><div class="gallery-grid">${examples.map(e=>`<button class="example-card" data-example="${e.id}" ${e.source ? '' : 'data-mutation'}><span class="example-picture" aria-hidden="true"></span><span class="studio-kicker">${e.kind}</span><strong>${e.name}</strong><span class="example-description">${e.description}</span><span class="example-open">${e.source ? 'Abrir texto y vista previa' : 'Abrir diagrama'} <span>↗</span></span></button>`).join('')}</div><div class="dialog-footer"><span>Todos los ejemplos son editables.</span><button class="button" id="studio-blank" data-mutation>Crear diagrama vacío</button></div>`;
  const workshop=document.createElement('dialog');workshop.id='text-workshop';workshop.className='studio-dialog';workshop.setAttribute('aria-label','Taller de texto y vista previa');
  workshop.innerHTML=`<div class="studio-dialog-heading"><div><span class="studio-kicker">KAIRO / TEXTO Y VISTA PREVIA</span><h2 id="studio-workshop-title">Del texto al diagrama.</h2><p id="studio-workshop-description">Edita, comprueba y aplica. El lienzo conserva tu trabajo mientras pruebas.</p></div><button class="button dialog-close" aria-label="Cerrar taller">Cerrar ×</button></div>
  <div class="workshop-toolbar"><label>Formato <select id="studio-format">${formats.map(([id,name])=>`<option value="${id}">${name}</option>`).join('')}</select></label><label class="studio-check"><input type="checkbox" id="studio-keep-layout" checked> Conservar posiciones al aplicar</label><button class="button" id="studio-refresh">Cargar desde el lienzo</button></div>
  <div class="workshop-body"><div class="code-pane"><div class="pane-heading">DOCUMENTO <span id="studio-format-note"></span></div><textarea id="studio-source" aria-label="Código del diagrama" spellcheck="false"></textarea><output id="studio-parse-status" role="status"></output></div><div class="preview-pane"><div class="pane-heading">VISTA PREVIA <label class="studio-check"><input id="studio-animate" type="checkbox"> Animar flechas</label></div><div id="studio-preview"></div></div></div>
  <div class="dialog-footer"><div class="workshop-exports"><button class="button" id="studio-svg">Descargar SVG editable</button><button class="button" id="studio-png">Descargar PNG</button></div><div class="workshop-apply"><button class="button" id="studio-insert" data-mutation>Insertar junto al actual</button><button class="button primary" id="studio-apply" data-mutation>Aplicar al lienzo</button></div></div>`;
  document.body.append(gallery,workshop);
  for(const dialog of [gallery,workshop]) {dialog.querySelector<HTMLButtonElement>('.dialog-close')!.onclick=()=>dialog.close();dialog.addEventListener('click',e=>{if(e.target===dialog) {const b=dialog.getBoundingClientRect();if(e.clientX<b.left||e.clientX>b.right||e.clientY<b.top||e.clientY>b.bottom) dialog.close();}});}
  function tab(studio:boolean):void {panel.hidden=!studio;$('#inspector-content').hidden=studio;$('.inspector-note').hidden=studio;$('#tab-studio').setAttribute('aria-selected',String(studio));$('#tab-properties').setAttribute('aria-selected',String(!studio));}
  $('#tab-studio').onclick=()=>tab(true);$('#tab-properties').onclick=()=>tab(false);
  function showGallery():void {
    gallery.querySelectorAll<HTMLElement>('[data-example]').forEach(el=>{const e=examples.find(e=>e.id===el.dataset.example)!;el.querySelector('.example-picture')!.innerHTML=toSVG(e.build(),{theme:options.theme(),padding:45,wrapLabels:true});});
    gallery.showModal(); update();
  }
  $('#studio-gallery').onclick=showGallery;
  gallery.addEventListener('click',event=>{
    const id=(event.target as Element).closest<HTMLElement>('[data-example]')?.dataset.example;
    const example=examples.find(e=>e.id===id);if(!example)return;
    if(example.source){gallery.close();openWorkshop(example);return;}
    if(editor.isReadOnly())return;
    active=example;stop();options.stop();editor.replaceDocument(active.build());options.changed(active.name);editor.fit();gallery.close();tab(true);update();options.notify(`«${active.name}» listo para probar. Deshacer restaura el anterior.`);
  });
  $('#studio-blank').onclick=()=>{if(editor.isReadOnly())return;stop();options.stop();editor.replaceDocument(createDocument({nodes:[],edges:[]}));options.changed('Diagrama sin título');editor.fit();gallery.close();tab(false);};
  for(const input of panel.querySelectorAll<HTMLInputElement>('[data-policy]')) input.onchange=()=>{if(editor.isReadOnly())return;editor.setConnectionPolicy({...editor.getConnectionPolicy(),[input.dataset.policy!]:input.checked});};
  $('#studio-layout').onclick=()=>{if(editor.isReadOnly())return;editor.replaceDocument(autoLayout(editor.getDocument(),{direction:$<HTMLSelectElement>('#studio-direction').value as 'LR'|'RL'|'TB'|'BT'}));editor.fit();options.notify('Layout aplicado. Las conexiones conservan su estilo.');};
  function refreshPlayer():void {$('#studio-play').textContent=player?.playing?'Pausar':'Reproducir';$('#studio-progress').textContent=player&&player.index>=0?`Paso ${player.index+1} de ${player.length}`:'Sin reproducir';}
  function ensurePlayer():PathPlayer {if(!player){options.stop();player=new PathPlayer(editor,flowSteps(editor.getDocument().graph),{intervalMs:850,onStep:()=>queueMicrotask(()=>{if(player?.index===player!.length-1)player.pause();refreshPlayer();})});}return player;}
  function stop():void {player?.stop();player=null;refreshPlayer();}
  $('#studio-play').onclick=()=>{const p=ensurePlayer();if(!p.playing&&p.index===p.length-1)p.goTo(0);p.toggle();refreshPlayer();};
  $('#studio-prev').onclick=()=>{ensurePlayer().pause();ensurePlayer().prev();refreshPlayer();};$('#studio-next').onclick=()=>{ensurePlayer().pause();ensurePlayer().next();refreshPlayer();};$('#studio-stop').onclick=stop;
  function preview():void {
    window.clearTimeout(parsing);
    try {const format=$<HTMLSelectElement>('#studio-format').value as InputFormat;const code=$<HTMLTextAreaElement>('#studio-source').value;
      // Keep the original document until text actually changes: text formats can be intentionally lossy.
      previewDoc=sourceDoc && format===previewFormat && code===serializeAs(sourceDoc,format)?sourceDoc:parseAny(code,format);
      $('#studio-preview').innerHTML=toSVG(previewDoc,{theme:options.theme(),edgeStyle:options.edgeStyle(),includeTags:true,wrapLabels:true,animated:$<HTMLInputElement>('#studio-animate').checked});
      $('#studio-parse-status').textContent=`${previewDoc.graph.nodes.length} nodos · ${previewDoc.graph.edges.length} conexiones · Listo para aplicar`;
      $('#studio-parse-status').dataset.state='valid';
    }catch(error){previewDoc=null;$('#studio-preview').innerHTML='<p class="preview-empty">Corrige el texto para actualizar la vista previa.</p>';$('#studio-parse-status').textContent=error instanceof Error?error.message:String(error);$('#studio-parse-status').dataset.state='error';}
    for(const id of ['studio-apply','studio-insert']) $<HTMLButtonElement>('#'+id).disabled=!previewDoc||editor.isReadOnly();
    for(const id of ['studio-svg','studio-png']) $<HTMLButtonElement>('#'+id).disabled=!previewDoc;
    const format=$<HTMLSelectElement>('#studio-format').value;
    $('#studio-format-note').textContent=format==='json'?'Todos los datos':format==='markdown'?'Se renderiza el primer bloque Mermaid':'Puede omitir metadatos y estilos';
  }
  function loadSource():void {pendingExample=undefined;setWorkshopHeading();sourceDoc=canvasSource=editor.getDocument();previewFormat=$<HTMLSelectElement>('#studio-format').value as InputFormat;$<HTMLTextAreaElement>('#studio-source').value=serializeAs(sourceDoc,previewFormat);preview();}
  function setWorkshopHeading():void {
    $('#studio-workshop-title').textContent=pendingExample?.name??'Del texto al diagrama.';
    $('#studio-workshop-description').textContent=pendingExample?'Edita el bloque Mermaid del README y comprueba el resultado antes de aplicarlo al lienzo.':'Edita, comprueba y aplica. El lienzo conserva tu trabajo mientras pruebas.';
  }
  function openWorkshop(example?:Example):void {
    if(example?.source){
      pendingExample=example;sourceDoc=canvasSource=null;previewFormat=example.source.format;
      $<HTMLSelectElement>('#studio-format').value=example.source.format;
      $<HTMLTextAreaElement>('#studio-source').value=example.source.text;
      $<HTMLTextAreaElement>('#studio-source').scrollTop=0;
      setWorkshopHeading();preview();
    }else loadSource();
    workshop.showModal();
  }
  $('#studio-code').onclick=()=>openWorkshop();$('#studio-refresh').onclick=loadSource;
  $('#studio-markdown').onclick=()=>openWorkshop(examples.find(e=>e.id==='markdown'));
  $('#studio-format').onchange=()=>{if(previewDoc) {sourceDoc=previewDoc;previewFormat=$<HTMLSelectElement>('#studio-format').value as InputFormat;$<HTMLTextAreaElement>('#studio-source').value=serializeAs(previewDoc,previewFormat);}preview();};
  $('#studio-source').oninput=()=>{window.clearTimeout(parsing);parsing=window.setTimeout(preview,180);};$('#studio-animate').onchange=preview;
  function apply(insert:boolean):void {preview();if(!previewDoc||editor.isReadOnly())return;stop();options.stop();let next=previewDoc;if(insert)next=mergeDocuments(editor.getDocument(),next);else if(next!==canvasSource&&$<HTMLInputElement>('#studio-keep-layout').checked)next=mergeLayout(next,editor.getDocument());editor.replaceDocument(next);if(pendingExample&&!insert){active=pendingExample;tab(true);}options.changed(!insert?pendingExample?.name:undefined);update();editor.fit();workshop.close();options.notify(insert?'Diagrama insertado.':'Cambios aplicados. Puedes deshacerlos.');}
  $('#studio-apply').onclick=()=>apply(false);$('#studio-insert').onclick=()=>apply(true);
  function download(blob:Blob,name:string):void {const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
  $('#studio-svg').onclick=()=>{preview();if(previewDoc)download(new Blob([toEditableSvg(previewDoc,{theme:options.theme(),edgeStyle:options.edgeStyle(),includeTags:true,wrapLabels:true,animated:$<HTMLInputElement>('#studio-animate').checked})],{type:'image/svg+xml'}),'kairo.editable.svg');};
  $('#studio-png').onclick=async()=>{preview();if(!previewDoc)return;const button=$<HTMLButtonElement>('#studio-png');button.disabled=true;try{download(await toPNG(previewDoc,{theme:options.theme(),edgeStyle:options.edgeStyle(),includeTags:true,wrapLabels:true}),'kairo.png');}catch(e){options.notify(`No se pudo exportar: ${String(e)}`);}finally{button.disabled=!previewDoc;}};
  function update():void {
    const next=JSON.stringify(editor.getDocument());if(next!==revision){if(revision)stop();revision=next;}
    $('#studio-title').textContent=active.name;$('#studio-description').textContent=active.description;$('#studio-tasks').innerHTML=active.tasks.map(t=>`<li>${escape(t)}</li>`).join('');
    const policy=editor.getConnectionPolicy();for(const input of panel.querySelectorAll<HTMLInputElement>('[data-policy]')){const key=input.dataset.policy as keyof typeof policy;input.checked=key==='allowCycles'?policy[key]!==false:!!policy[key];}
    for(const el of [...panel.querySelectorAll<HTMLInputElement|HTMLButtonElement>('[data-mutation]'),...gallery.querySelectorAll<HTMLButtonElement>('[data-mutation]')])el.disabled=editor.isReadOnly();
    refreshPlayer();
  }
  update();
  return {update,showGallery,openWorkshop,showProperties:()=>tab(false),stop,destroy(){stop();clearTimeout(parsing);gallery.remove();workshop.remove();panel.remove();}};
}

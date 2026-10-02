import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createDocument } from '../packages/diagram/src/document.ts';
import { fromBpmn, toBpmn } from '../packages/diagram/src/bpmn.ts';
import { detectFormat, parseAny, serializeAs } from '../packages/diagram/src/convert.ts';

const doc = () => createDocument({
  nodes: [
    { id: 'begin', type: 'start', title: 'Inicio' },
    { id: 'check', type: 'decision', title: '¿Aprobado?' },
    { id: 'work', type: 'process', title: 'Procesar' },
    { id: 'done', type: 'end', title: 'Fin' },
  ],
  edges: [
    { id: 'e0', source: 'begin', target: 'check' },
    { id: 'e1', source: 'check', target: 'work', label: 'Sí' },
    { id: 'e2', source: 'work', target: 'done' },
  ],
});

test('toBpmn maps node types to BPMN elements and edges to sequenceFlow, with BPMNDI', () => {
  const xml = toBpmn(doc());
  assert.match(xml, /<bpmn:definitions /);
  assert.match(xml, /<bpmn:startEvent id="begin" name="Inicio" \/>/);
  assert.match(xml, /<bpmn:exclusiveGateway id="check" name="¿Aprobado\?" \/>/);
  assert.match(xml, /<bpmn:task id="work" name="Procesar" \/>/);
  assert.match(xml, /<bpmn:endEvent id="done" name="Fin" \/>/);
  assert.match(xml, /<bpmn:sequenceFlow id="e1" sourceRef="check" targetRef="work" name="Sí" \/>/);
  assert.match(xml, /<bpmndi:BPMNShape bpmnElement="begin"><dc:Bounds /); // DI so it renders in bpmn.io
  assert.match(xml, /<bpmndi:BPMNEdge bpmnElement="e0"><di:waypoint /);
});

test('fromBpmn round-trips structure, labels and node type (via element), keeping BPMNDI positions', () => {
  const back = fromBpmn(toBpmn(doc()));
  assert.deepEqual(back.graph.nodes.map(n => n.title), ['Inicio', '¿Aprobado?', 'Procesar', 'Fin']);
  assert.deepEqual(back.graph.nodes.map(n => n.type), ['start', 'decision', 'process', 'end']);
  assert.equal(back.graph.edges.length, 3);
  assert.equal(back.graph.edges.find(e => e.label === 'Sí')!.source, 'check');
  // layout came from BPMNDI (every shape had Bounds), normalized to the 80 margin
  const ys = Object.values(back.layout.nodes).map(n => n.y);
  assert.equal(Math.min(...ys), 80);
});

test('fromBpmn accepts namespaced/prefixless tags and various task kinds, falling back to layered layout', () => {
  const xml = `<definitions xmlns="http://www.omg.org/spec/BPMN/20100524/MODEL">
    <process>
      <startEvent id="s" name="Go"/>
      <userTask id="u" name="Revisar"/>
      <serviceTask id="v" name="Enviar"/>
      <endEvent id="e"/>
      <sequenceFlow id="f1" sourceRef="s" targetRef="u"/>
      <sequenceFlow id="f2" sourceRef="u" targetRef="v"/>
      <sequenceFlow id="f3" sourceRef="v" targetRef="e"/>
    </process>
  </definitions>`;
  const g = fromBpmn(xml).graph;
  assert.deepEqual(g.nodes.map(n => n.type), ['start', 'process', 'process', 'end']);
  assert.equal(g.nodes.find(n => n.id === 'e')!.title, 'e'); // no name -> id
  assert.equal(g.edges.length, 3);
});

test('fromBpmn throws without flow elements; detectFormat recognises BPMN and convert round-trips', () => {
  assert.throws(() => fromBpmn('<bpmn:definitions></bpmn:definitions>'), /no contiene elementos de flujo/);
  assert.equal(detectFormat(toBpmn(doc())), 'bpmn');
  const back = parseAny(serializeAs(doc(), 'bpmn'), 'bpmn').graph;
  assert.equal(back.nodes.length, 4);
  assert.equal(back.edges.length, 3);
});

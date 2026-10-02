import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createDocument } from '../packages/diagram/src/document.ts';
import { autoLayout, organicLayout, radialLayout, treeLayout, circularLayout, gridLayout, resolveOverlaps, clusterLayout, mergeDocuments } from '../packages/diagram/src/layout.ts';
import { redundantEdges, shortestPath } from '../packages/diagram/src/algorithms.ts';
import { toDrawio, fromDrawio } from '../packages/diagram/src/drawio.ts';
import { importAny, detectFormat } from '../packages/diagram/src/convert.ts';
import { parseMermaid } from '../packages/diagram/src/text.ts';
import type { SemanticGraph } from '../packages/diagram/src/types.ts';

const graph = (): SemanticGraph => ({nodes:['a','b','c'].map(id=>({id,type:'process',title:id})),edges:[['a','b'],['b','a'],['a','c'],['b','c']].map(([source,target])=>({id:source+target,source,target}))});
test('audit: simplifying cycles preserves every reachable pair, including mutually dependent alternate routes',()=>{
  let seed=123;
  for(let trial=0;trial<60;trial++) {
    const g=graph();
    if(trial) { g.edges=[]; for(const a of g.nodes) for(const b of g.nodes) {seed=(seed*1664525+1013904223)>>>0; if(seed%3) g.edges.push({id:a.id+b.id,source:a.id,target:b.id});} }
    const remove=new Set(redundantEdges(g)); const after={...g,edges:g.edges.filter(e=>!remove.has(e.id))};
    for(const a of g.nodes) for(const b of g.nodes) assert.equal(!!shortestPath(after,a.id,b.id),!!shortestPath(g,a.id,b.id));
  }
});
test('audit: simplifying retains conditional and labelled relationships',()=>{
  const g=graph();g.edges[2].condition='authorized';g.edges[3].label='fallback';
  assert.ok(!redundantEdges(g).includes('ac'));assert.ok(!redundantEdges(g).includes('bc'));
});
test('audit: every layout preserves edge presentation, including composing ID collisions',()=>{
  const d=createDocument(graph());
  const presentation={startMarker:'dot' as const,endMarker:'none' as const,dashed:true,labelPosition:'end' as const,labelOffset:40};
  Object.assign(d.layout.edges.ab,presentation);
  for(const layout of [autoLayout,organicLayout,radialLayout,treeLayout,circularLayout,gridLayout,resolveOverlaps,clusterLayout]) {
    const result=layout(d);
    for(const [k,v] of Object.entries(presentation)) assert.equal((result.layout.edges.ab as unknown as Record<string,unknown>)[k],v);
  }
  const merged=mergeDocuments(d,d);
  assert.deepEqual(merged.layout.edges.ab,d.layout.edges.ab);assert.deepEqual(merged.layout.edges['ab-2'],d.layout.edges.ab);
});
test('audit: BT/RL reverse layout direction in API and Mermaid imports',()=>{
  const doc=createDocument({nodes:graph().nodes.slice(0,2),edges:[{id:'ab',source:'a',target:'b'}]});
  for(const direction of ['BT','RL'] as const) {
    for(const d of [autoLayout(doc,{direction}),parseMermaid(`flowchart ${direction}\na[A] --> b[B]`)]) {
      assert.ok(direction==='BT'? d.layout.nodes.a.y>d.layout.nodes.b.y:d.layout.nodes.a.x>d.layout.nodes.b.x);
    }
  }
});
test('audit: draw.io separates root, group, node and edge ID namespaces',()=>{
  const doc=createDocument({nodes:['0','1','group-0','kn0'].map(id=>({id,title:id,type:'process',group:'Area'})),edges:[{id:'0',source:'0',target:'1'},{id:'1',source:'group-0',target:'kn0'}]});
  const xml=toDrawio(doc), ids=[...xml.matchAll(/<mxCell id="([^"]+)"/g)].map(m=>m[1]);
  assert.equal(new Set(ids).size,ids.length);
  const back=fromDrawio(xml);assert.deepEqual(back.graph.nodes.map(n=>n.id),doc.graph.nodes.map(n=>n.id));assert.deepEqual(back.graph.edges,doc.graph.edges);
});
test('audit: autodetect distinguishes DOT from Mermaid with decision braces',()=>{
  assert.equal(detectFormat('graph G { a -- b; }'),'dot'); assert.equal(importAny('graph G { a -- b; }').graph.edges.length,1);
  assert.equal(detectFormat('graph TD\nA{Ready?} --> B[Yes]'),'mermaid');assert.equal(importAny('graph TD\nA{Ready?} --> B[Yes]').graph.nodes.length,2);
});

test('cyclic layouts keep entry before the cycle and downstream stages after it', () => {
  const d = createDocument({ nodes: ['start','rule','retry','work','done'].map(id=>({id,type:'process',title:id})), edges: [['start','rule'],['rule','retry'],['retry','rule'],['rule','work'],['work','done']].map(([source,target],i)=>({id:`e${i}`,source,target})) });
  for (const direction of ['TB','LR','BT','RL'] as const) {
    const boxes=autoLayout(d,{direction}).layout.nodes, axis=direction==='LR'||direction==='RL'?'x':'y', sign=direction==='BT'||direction==='RL'?-1:1;
    assert.ok(sign*(boxes.rule[axis]-boxes.start[axis])>0);
    assert.ok(sign*(boxes.work[axis]-boxes.rule[axis])>0);
    assert.ok(sign*(boxes.done[axis]-boxes.work[axis])>0);
    assert.equal(boxes.rule[axis],boxes.retry[axis]);
  }
});

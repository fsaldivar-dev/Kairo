import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createDraftStore, createDraftRecovery, type DraftClock, type DraftRecord, type DraftStorage, type DraftStatus } from '../packages/diagram/src/recovery.ts';
import { createDocument } from '../packages/diagram/src/document.ts';

class Storage implements DraftStorage {
  data = new Map<string, string>(); fail = false;
  get length() { return this.data.size; }
  key(i: number) { return [...this.data.keys()][i] ?? null; }
  getItem(k: string) { return this.data.get(k) ?? null; }
  setItem(k: string, v: string) { if (this.fail) throw new Error('QuotaExceededError'); this.data.set(k, v); }
  removeItem(k: string) { this.data.delete(k); }
}
function record(id = 'window-a', revision = 1): DraftRecord {
  return { version: 1, id, revision, updatedAt: 100, title: 'Diagrama 日本語 👩🏽‍💻', document: createDocument({ nodes: [{id:'a',type:'generic',title:'Inicio'}], edges: [] }) };
}
class Clock implements DraftClock {
  time = 0; next = 0; timers = new Map<number, { at: number; fn: () => void }>();
  now() { return this.time; }
  setTimeout(fn: () => void, delay: number) { const id = ++this.next; this.timers.set(id, { at: this.time + delay, fn }); return id; }
  clearTimeout(id: unknown) { this.timers.delete(id as number); }
  advance(ms: number) {
    const end = this.time + ms;
    for (;;) {
      const due = [...this.timers].filter(([, t]) => t.at <= end).sort((a,b) => a[1].at - b[1].at)[0];
      if (!due) break;
      this.time = due[1].at; this.timers.delete(due[0]); due[1].fn();
    }
    this.time = end;
  }
}
function setup() {
  const storage = new Storage(), clock = new Clock(), statuses: DraftStatus[] = [];
  const store = createDraftStore({ storage: () => storage });
  const controller = createDraftRecovery({ store, id:'window-a', clock, onStatus:s => statuses.push(s) });
  const schedule = (revision: number) => controller.schedule(record().document, { revision, title:'Prueba' });
  return { storage, store, clock, controller, statuses, schedule };
}

test('drafts round trip validated documents and Unicode without touching explicit saves', () => {
  const {store, storage} = setup(); storage.setItem('codaru-diagram-example', 'explicit');
  const r = record(); store.write(r); r.document.graph.nodes[0].title = 'Changed outside';
  assert.equal(store.read(r.id)!.document.graph.nodes[0].title, 'Inicio');
  assert.equal(store.read(r.id)!.title, r.title);
  store.write(record('window-b', 2)); store.remove('window-a');
  assert.equal(store.read('window-a'), null); assert.equal(store.read('window-b')!.revision, 2);
  assert.equal(storage.getItem('codaru-diagram-example'), 'explicit');
});
test('bad versions, malformed data, mismatched IDs and oversized entries are visible but never restored', () => {
  const {store, storage} = setup();
  storage.setItem('kairo-draft-v1:future', JSON.stringify({...record('future'),version:2}));
  storage.setItem('kairo-draft-v1:broken', '{');
  storage.setItem('kairo-draft-v1:wrong', JSON.stringify(record('another')));
  storage.setItem('kairo-draft-v1:large', 'x'.repeat(1024 * 1024 + 1));
  assert.equal(store.list().filter(e => e.error).length, 4);
  assert.throws(() => store.read('future'), /version/);
  assert.throws(() => store.write({...record(), revision:NaN}), /revision/);
  assert.throws(() => store.write({...record(),title:'x'.repeat(201)}), /title/);
  assert.throws(() => store.remove('../saved'), /ID/);
});
test('quota and admission limits preserve all earlier records; updates do not consume new slots', () => {
  const storage = new Storage(), store = createDraftStore({storage:() => storage, maxRecords:1});
  store.write(record()); assert.throws(() => store.write(record('other')), /full/);
  store.write(record('window-a', 2)); storage.fail = true;
  assert.throws(() => store.write(record('window-a', 3)), /Quota/);
  assert.equal(store.read('window-a')!.revision, 2);
  const bytes = new TextEncoder().encode(JSON.stringify(record())).length;
  const limited = createDraftStore({storage:() => storage, maxBytes:bytes - 1});
  assert.throws(() => limited.write(record()), /byte limit/);
  assert.equal(store.read('window-a')!.revision, 2);
});
test('storage access stays lazy and errors propagate without clearing data', () => {
  const store = createDraftStore({storage:() => {throw new Error('SecurityError');}});
  assert.throws(() => store.list(), /SecurityError/);
  const c = createDraftRecovery({store,id:'local'});
  c.schedule(record().document,{revision:1}); assert.equal(c.flush(), false); c.destroy();
});
test('debounce writes only the latest immutable snapshot and maximum wait prevents starvation', () => {
  const {controller,clock,store,schedule} = setup();
  const doc = record().document; controller.schedule(doc, {revision:1}); doc.graph.nodes[0].title='outside';
  clock.advance(499); assert.equal(store.read('window-a'), null);
  clock.advance(1); assert.equal(store.read('window-a')!.document.graph.nodes[0].title,'Inicio');
  schedule(2); clock.advance(400); schedule(3); clock.advance(400); schedule(4);
  clock.advance(400); schedule(5); clock.advance(400); schedule(6);
  clock.advance(399); assert.equal(store.read('window-a')!.revision,1);
  clock.advance(1); assert.equal(store.read('window-a')!.revision,6);
  assert.equal(clock.timers.size,0); controller.destroy();
});
test('a save finishing late preserves newer pending and already stored revisions', () => {
  const {controller,store,schedule,clock} = setup();
  schedule(1); controller.flush(); schedule(2);
  controller.markSaved(1); assert.equal(store.read('window-a'), null);
  clock.advance(500); assert.equal(store.read('window-a')!.revision,2);
  controller.markSaved(1); assert.equal(store.read('window-a')!.revision,2);
  controller.markSaved(2); assert.equal(store.read('window-a'),null);
  schedule(2); clock.advance(500); assert.equal(store.read('window-a'),null);
  controller.destroy();
});
test('failed flush can retry, discard cancels pending writes and destroy preserves stored copies', () => {
  const {controller,store,storage,schedule,clock,statuses} = setup();
  schedule(1); controller.flush(); schedule(2); storage.fail=true;
  clock.advance(500); assert.equal(statuses.at(-1)!.state,'error'); assert.equal(store.read('window-a')!.revision,1);
  storage.fail=false; assert.equal(controller.flush(),true); assert.equal(store.read('window-a')!.revision,2);
  schedule(3); controller.discard(); clock.advance(2000); assert.equal(store.read('window-a'),null);
  schedule(4); controller.flush(); schedule(5); controller.destroy(); controller.destroy(); clock.advance(2000);
  assert.equal(store.read('window-a')!.revision,4); assert.equal(controller.flush(),false); assert.equal(clock.timers.size,0);
});

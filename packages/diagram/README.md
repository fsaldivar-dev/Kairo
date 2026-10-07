# @fsaldivar.dev/diagram

A lightweight, framework-free diagram editor and toolkit. The core is **< 20 KiB gzip** with **zero runtime dependencies**; everything else (interop, layouts, exports, analysis, framework wrappers) lives in opt-in subpaths that tree-shake away when unused.

```sh
npm install @fsaldivar.dev/diagram
```

## Quick start

```ts
import { createDiagram, createDocument } from '@fsaldivar.dev/diagram';
import '@fsaldivar.dev/diagram/style.css'; // required once

const doc = createDocument({
  nodes: [
    { id: 'a', type: 'start', title: 'Inicio' },
    { id: 'b', type: 'decision', title: '¿Autorizado?' },
    { id: 'c', type: 'end', title: 'Fin' },
  ],
  edges: [
    { id: 'ab', source: 'a', target: 'b' },
    { id: 'bc', source: 'b', target: 'c', label: 'sí' },
  ],
}); // auto-layout with per-type shapes (decision → diamond, start/end → pill)

const editor = createDiagram(document.getElementById('app')!, {
  document: doc,
  autoFit: true,
  onChange: next => console.log('changed', next),
});
```

The document model is **semantic (graph) and presentational (layout) kept apart**: the graph holds nodes/edges/labels/tags/groups; the layout holds positions, shapes and ports. No colors or SVG paths are stored in the graph.

For embedded hosts, `@fsaldivar.dev/diagram/element` registers `<kairo-diagram>`. Its `src` attribute loads a v2 JSON document. On the development branch after 0.1.0, changing `src` while detached takes effect on reconnect; a load interrupted by disconnection is retried, while an explicit `element.document = ...` assignment takes precedence. The opt-in boolean `auto-fit` attribute re-fits the diagram when that element changes size; removing it preserves the current viewport until the host or user changes it. Each component observes only its own container. The host can observe `documentload` and `documenterror` events. Try the lifecycle controls in the [embedded example](https://github.com/fsaldivar-dev/Kairo/blob/main/examples/tauri/element.html).

`DiagramDocument.profile` records the notation family. Flow importers use `flow`; mindmaps use `mindmap`; OPML, nested JSON, parent lists and indented outlines use `hierarchy`. A host can select its own connection policy and diagnostics by profile without inferring intent from the nodes' visual types.

## Entry points (subpaths)

Import only what you use — each subpath is a separate bundle.

| Subpath | What it gives you |
| --- | --- |
| `@fsaldivar.dev/diagram` | Core editor: `createDiagram`, `createDocument`, selection, multi-select, clipboard (copy/cut/paste/duplicate), align/distribute, resize, groups, undo/redo, keyboard shortcuts. |
| `@fsaldivar.dev/diagram/style.css` | The editor stylesheet (import once). |
| `@fsaldivar.dev/diagram/io` | Import/export: Mermaid, DOT (Graphviz), PlantUML, D2, JSON Canvas, Cytoscape, GraphML, GEXF, draw.io, Excalidraw, CSV/TSV, Markdown, React Flow, adjacency matrix, share links, plus `convertText`/`detectFormat`/`importAny`. |
| `@fsaldivar.dev/diagram/convert` | Format conversion surface on its own: `parseAny`, `importAny`, `convertText`, `detectFormat`, `serializeAs`, and the throw-safe `tryParse`. |
| `@fsaldivar.dev/diagram/markdown` | Markdown import/export (`fromMarkdown`/`toMarkdown`/`toMarkdownTables`/`toReadme`) plus the synchronous `mermaidToSvg` one-call and `enhanceMarkdown` (replaces `<pre><code class="language-mermaid\|dot\|d2…">` blocks with inline SVG; `theme: 'currentColor'` to inherit light/dark). |
| `@fsaldivar.dev/diagram/export` | `toSVG` (animated, build-reveal, wrapped labels, per-node colors, grid/dots background, pagination), `toPNG`, `toThumbnail`, `toHtml`, `toLegend`, `toTikz`, `toAscii`, `toSvgDataUri`, `toSvgPages`. |
| `@fsaldivar.dev/diagram/layout` | `autoLayout` (layered, crossing-reduced), `organicLayout`, `radialLayout`, `treeLayout`, `circularLayout`, `gridLayout`, `fitNodeSizes`, `snapToGrid`, `subgraph`, `ego`, `collapseGroups`, `mergeDocuments`, `resolveOverlaps`. |
| `@fsaldivar.dev/diagram/analysis` | `validateFlow`, `lintDocument`, `toReport`, and graph algorithms: shortest/longest/all paths, SCC, topological order & generations, degree hubs, articulation points & bridges (SPOF), betweenness brokers, communities (Louvain), PageRank, distance stats, graph coloring, cycle detection, transitive closure. |
| `@fsaldivar.dev/diagram/themes` | Theme presets, `themeFrom` (derive from a brand color), WCAG `contrastRatio`/`auditTheme`. |
| `@fsaldivar.dev/diagram/templates` | Starter documents: empty flow, decision, architecture, mindmap, swimlane, microservices, CI/CD pipeline, auth flow, state machine. |
| `@fsaldivar.dev/diagram/react` · `@fsaldivar.dev/diagram/vue` · `@fsaldivar.dev/diagram/svelte` | Framework wrappers (peer deps external). |
| `@fsaldivar.dev/diagram/element` | `<kairo-diagram>` web component — works from plain HTML via a `document` property, inline `<script type="application/json">`, or a `src` URL; supports `theme` and `readonly` attributes plus load/error events. |
| `@fsaldivar.dev/diagram/global` | Standalone IIFE build exposing `window.Kairo` (no bundler needed). |
| `@fsaldivar.dev/diagram/player` | Step-through path playback. |
| `@fsaldivar.dev/diagram/minimap` | Minimap with click/drag navigation and an optional disclosure control. |
| `@fsaldivar.dev/diagram/recovery` | Autosave draft store and crash recovery (`createDraftStore`, `createDraftRecovery`) over Web Storage. |

## Interop example

```ts
import { parseMermaid } from '@fsaldivar.dev/diagram/io';
import { toSVG } from '@fsaldivar.dev/diagram/export';
import { convertText } from '@fsaldivar.dev/diagram/io';

const svg = toSVG(parseMermaid(mermaidText));
const dot = convertText(mermaidText, 'mermaid', 'dot');
```

## Markdown / rendered-HTML embedding

Turn fenced diagram code into inline SVG, synchronously, with no Mermaid runtime and no network:

```ts
import { mermaidToSvg, enhanceMarkdown } from '@fsaldivar.dev/diagram/markdown';
import { tryParse } from '@fsaldivar.dev/diagram/convert';

// One call, throw-safe: valid code → SVG; bad syntax → a small error SVG (never throws).
el.innerHTML = mermaidToSvg('graph TD;A-->B', { theme: 'currentColor' });

// In-place: replace every <pre><code class="language-mermaid|dot|d2|plantuml…"> with inline SVG.
// theme: 'currentColor' makes the SVG inherit the container's light/dark; CSS vars work too.
enhanceMarkdown(document.querySelector('article')!, { theme: 'currentColor' });

// Non-throwing parse for any format:
const doc = tryParse(someMermaid, 'mermaid'); // DiagramDocument | null
```

## React

```tsx
import { KairoDiagram } from '@fsaldivar.dev/diagram/react';
import '@fsaldivar.dev/diagram/style.css';

<KairoDiagram document={doc} onChange={setDoc} />;
```

## Web component

```html
<link rel="stylesheet" href="…/style.css" />
<script type="module">import { defineKairoElement } from '…/element'; defineKairoElement();</script>

<kairo-diagram readonly>
  <script type="application/json">{ "version": 2, "graph": { … }, "layout": { … } }</script>
</kairo-diagram>
```

For a live host integration, set `src` to a JSON v2 document URL and listen for `documentload` and `documenterror`:

```ts
import { defineKairoElement, type KairoDiagramHost } from '@fsaldivar.dev/diagram/element';
import '@fsaldivar.dev/diagram/style.css';

defineKairoElement();
const diagram = document.querySelector<KairoDiagramHost>('kairo-diagram')!;
diagram.addEventListener('documentload', event => {
  const { src, document } = (event as CustomEvent).detail;
  console.log('Loaded', src, document.graph.nodes.length);
});
diagram.addEventListener('documenterror', event => {
  const { src, error } = (event as CustomEvent).detail;
  console.error('Could not load', src, error);
});
diagram.setAttribute('src', '/flow.json');
// Refetch after the resource changes on the server, even when src stays the same:
await diagram.reload();
```

Both events bubble and carry `{ src, document }` or `{ src, error }` in `detail`. `reload()` resolves after the fetch settles; errors are reported through `documenterror`. An HTTP error or invalid JSON keeps the last valid diagram visible. Replacing `src`, setting `diagram.document`, editing through `diagram.editor`, or removing the element cancels any pending load; an obsolete response cannot overwrite newer work. Assigning `diagram.document = undefined` explicitly empties the view and keeps it empty across remounts. A new `src` value or `reload()` restores data. Otherwise, reattaching the element restores its last document. See the runnable [embedded example](https://github.com/fsaldivar-dev/Kairo/blob/v0.1.0/examples/tauri/element.html) (`npm run dev -w @fsaldivar.dev/diagram-example`, then `/element.html`). The page also works in the packaged Tauri example.

## Development

Run from the repository root:

```sh
npm ci
npm run check     # typecheck
npm test          # unit tests
npm run test:ui   # Playwright tests on the built example (Chromium/WebKit)
npm run build
npm run size      # bundle-size budget (<20 KiB gzip core)
```

See [docs/FEATURES.md](https://github.com/fsaldivar-dev/Kairo/blob/v0.1.0/docs/FEATURES.md) for the full, per-change feature log.

## License

BSD-3-Clause. The copyright notice credits [fsaldivar-dev and the Kairo repository](LICENSE); retain it when redistributing source or binaries.

## Optional multiline labels

```ts
import { wrapNodeLabels } from '@fsaldivar.dev/diagram/labels';
const editor = createDiagram(container, { document, onNodeRender: wrapNodeLabels });
```

The callback wraps node titles while editing and resizing, without changing the graph or node size. Use `toSVG(document, { wrapLabels: true })` from `@fsaldivar.dev/diagram/export` for matching SVG lines. Titles retain explicit newlines and complete Unicode graphemes; overflow is ellipsised within the available height. The full title remains accessible. Up to three lines fit rectangles, two compact shapes and one triangles. Width is a conservative font-independent estimate at 13 px; custom fonts may need more space. Requires `Intl.Segmenter` in the host browser/WebView.

The subpath also exports pure `wrapLabel(text, width, maxLines?)` and `layoutNodeLabel(node, layout)`. `onNodeRender` receives `(node, layer, layout)`, including during live resize. Existing two-argument callbacks remain compatible. To combine labels with badges, call `wrapNodeLabels` before appending custom SVG to `layer`.

## Collapsible minimap

```ts
import { createMinimap } from '@fsaldivar.dev/diagram/minimap';
const map = createMinimap(editor, host, {
  collapsible: true, collapsed: false,
  showLabel: 'Show minimap', hideLabel: 'Hide minimap',
  onCollapsedChange: value => { /* host-owned view preference */ },
});
map.update(); // call after document/viewport changes; skips work while collapsed
map.setCollapsed(true);
map.isCollapsed();
map.destroy();
```

The optional native button supports Enter/Space and exposes `aria-expanded`/`aria-controls`. Without `collapsible`, mounting still adds only the SVG; hosts can use `setCollapsed` with their own control. Reopening renders the latest document and viewport. The callback fires only on actual changes, not mount. Collapsing never edits the document, selection, history or viewport. Hosts own persistence and styles (`.cd-minimap-toggle`, `.cd-minimap`); the core bundle is unchanged. Also available as `Kairo.createMinimap` in the global build.

## Recoverable local drafts

```ts
import { createDraftStore, createDraftRecovery } from '@fsaldivar.dev/diagram/recovery';
const store = createDraftStore({ storage: () => localStorage });
const recovery = createDraftRecovery({
  store, id: crypto.randomUUID(), // a new, unique ID for each editor mount
  onStatus: status => console.log(status.state),
});
let revision = 0;
// Connect to createDiagram's onChange callback, not viewport/selection events:
function changed(document: DiagramDocument) {
  recovery.schedule(document, { revision: ++revision, title: 'My diagram' });
}
async function save() {
  const savedRevision = revision;
  await saveExplicitly(editor.getDocument()); // your normal save operation
  recovery.markSaved(savedRevision); // keeps edits made while saving
}
const entries = store.list(); // { id, record } or { id, error } for invalid copies
const candidate = store.read(entries[0].id);
// Only after the user chooses to restore:
if (candidate) editor.replaceDocument(candidate.document); // one undo step
// On visibilitychange(hidden) or pagehide, attempt to write pending changes:
recovery.flush();
// At unmount (does not delete saved copies):
recovery.destroy();
```

The store validates its versioned envelope and the diagram, preserving graph/layout/profile independently of theme and viewport. `write(record)` and `remove(id)` affect only that ID. Errors from storage, invalid records or limits are thrown; the controller catches persistence failures and reports `error`. A failed flush keeps the pending snapshot for retry, without deleting the previous stored copy. Use `discard()` to explicitly remove this controller's copy and cancel its pending write. `destroy()` only cancels timers; flush first if desired. Both factories are also exposed on the full global build.

Defaults: namespace `kairo-draft-v1:`, 1 MiB UTF-8 per record, 20 records, 500 ms debounce and 2 s maximum wait. The count limit is advisory under concurrent writers; there is no shared index, lock or automatic eviction. Browser quota may be smaller. IDs must be unique among active writers. `clock` is injectable for deterministic scheduling tests. The optional module has no import-time storage access, DOM listeners or core-bundle cost.

The example's **Borradores** button lists local copies, allows explicit restore/export/removal and preserves the normal browser or Tauri save separately. Loading a draft never overwrites the explicit save. Restoring is disabled in read-only mode; viewing/exporting copies remains available. Each page mount has its own copy; originals remain after restoring into another session. Storage is local to the browser/WebView origin and may be cleared by the host. Recovery is best effort, not a durability guarantee or cross-device backup.

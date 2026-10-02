# @fsaldivar.dev/plugin

Optional Tauri 2 bridge for Kairo document persistence. Editing and rendering remain in `@fsaldivar.dev/diagram`; this package only invokes explicit native save, load, list and delete operations.

Install this package alongside `@fsaldivar.dev/diagram` in a Tauri application. Add `tauri-plugin-kairo` from the [Kairo Git tag](https://github.com/fsaldivar-dev/Kairo/tree/v0.1.0/crates/tauri-plugin-kairo) to your `Cargo.toml`, register `tauri_plugin_kairo::init()` in the Tauri builder, and add `kairo:default` to the window capability.

```ts
import { saveDocument, loadDocument } from '@fsaldivar.dev/plugin';

await saveDocument('my-diagram', editor.getDocument());
const saved = await loadDocument('my-diagram');
if (saved) editor.setDocument(saved);
```

Documents are stored under the application's data directory, in `diagrams/<id>.json`. IDs accept 1–80 ASCII letters, digits, underscores and hyphens. Each document has an 8 MiB limit. The bridge requires a Tauri host; web-only consumers can use `@fsaldivar.dev/diagram` without it. See the [workspace integration guide](https://github.com/fsaldivar-dev/Kairo/blob/v0.1.0/README.md#añadir-el-plugin-nativo-a-otra-aplicación-tauri).

Licensed under BSD-3-Clause. Preserve the [author and repository credit](LICENSE) when redistributing.

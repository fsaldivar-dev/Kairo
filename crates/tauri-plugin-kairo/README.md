# tauri-plugin-kairo

Optional Tauri 2 persistence plugin for the [Kairo diagram editor](https://github.com/fsaldivar-dev/Kairo). It saves, loads, lists, and deletes versioned diagram JSON files in the application's data directory. Rendering and editing remain in the frontend.

Add the Rust plugin to a Tauri application and register it:

```toml
[dependencies]
tauri-plugin-kairo = { git = "https://github.com/fsaldivar-dev/Kairo", tag = "v0.1.0" }
```

```rust
tauri::Builder::default()
    .plugin(tauri_plugin_kairo::init())
    // .run(...) for your application
```

Add `"kairo:default"` to the window capability that needs storage access. In the frontend, install `@fsaldivar.dev/diagram` and `@fsaldivar.dev/plugin`, then call `saveDocument`, `loadDocument`, `listDocuments`, or `deleteDocument` from the latter.

IDs are 1–80 ASCII letters, digits, underscores, or hyphens. Each JSON document is limited to 8 MiB. This crate is available in the [Kairo repository](https://github.com/fsaldivar-dev/Kairo); a crates.io publication has not yet been verified. The Git dependency above requires the `v0.1.0` tag.

Licensed under BSD-3-Clause. Copyright (c) 2026 fsaldivar-dev; retain the [license and project credit](LICENSE) when redistributing.

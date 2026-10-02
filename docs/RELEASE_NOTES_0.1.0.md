# Kairo 0.1.0

First public release of the lightweight TypeScript/SVG diagram editor and its Tauri 2 example. The editor supports twelve node shapes, labelled connections, tags, grouping, undo/redo, search, optional layouts and format conversion. It can be embedded through a plain DOM host, a Web Component, or React/Vue/Svelte bindings.

Install the editor with `npm install @fsaldivar.dev/diagram@0.1.0` and import `@fsaldivar.dev/diagram/style.css` once. For optional Tauri persistence, also install `@fsaldivar.dev/plugin@0.1.0` and add the Rust crate from this repository's `v0.1.0` Git tag. The [README](https://github.com/fsaldivar-dev/Kairo#readme) has a minimal embedding example and the required Tauri capability.

The core plus CSS is 19.99 KiB gzip with zero runtime dependencies. TypeScript checks, 856 unit tests, seven Rust tests, and 562 Chromium/WebKit UI tests passed for this release candidate. A separate consumer installed the package tarballs, passed typecheck and Vite build, and rendered two nodes and one connection. Native Tauri integration was exercised on macOS; the user's destination application, Windows, and Linux have not yet been verified. The Rust crate is available from the versioned Git repository; crates.io publication is separate.

Kairo is free software under [BSD-3-Clause](https://github.com/fsaldivar-dev/Kairo/blob/v0.1.0/LICENSE). Redistributions must retain the copyright notice crediting **fsaldivar-dev** and the [Kairo repository](https://github.com/fsaldivar-dev/Kairo).

# Changelog

## Unreleased

- The embedded Web Component now loads a `src` changed while detached and retries a request interrupted by disconnection. An explicit `document` assignment still takes precedence.

## 0.1.0 — 2026-10-02

First public release of Kairo's TypeScript/SVG diagram editor and Tauri example.

- Create and edit semantic graphs with twelve node shapes, labelled connections, ports, tags, groups, undo/redo, search, and optional layouts.
- Import and export the supported subsets of Markdown/Mermaid, PlantUML, DOT, and other formats through the optional I/O module. The JSON v2 document preserves graph, layout, and profile independently.
- Embed the editor in a plain HTML element or use the optional Web Component, React, Vue, and Svelte bindings. The Web Component supports URL loading, reload, explicit clearing, and load/error events.
- Add an optional Tauri 2 plugin for explicit local save, load, list, and delete operations, plus a desktop example for exploring the editor.

The core plus CSS is under 20 KiB gzip with no runtime dependencies. This version does not provide real-time collaboration, automatic obstacle-avoiding edge routing, or full fidelity for every external diagram format. Native integration has been exercised on macOS; Windows and Linux remain unverified.

import { createDiagram, type DiagramEditor } from './editor';
import { parseDocument } from './document';
import { lightTheme, darkTheme } from './theme';
import type { DiagramDocument } from './types';

/** Public host interface for a registered <kairo-diagram> element. */
export interface KairoDiagramHost extends HTMLElement {
  document: DiagramDocument | undefined;
  readonly editor: DiagramEditor | undefined;
  /** Refetches the current src even if its attribute value is unchanged; results arrive through documentload/documenterror. */
  reload(): Promise<void>;
}

/** Registers a framework-agnostic <kairo-diagram> custom element (React/Vue/Svelte/plain HTML). Idempotent. The host page must include the Kairo stylesheet. */
export function defineKairoElement(tag = 'kairo-diagram'): void {
  if (typeof customElements === 'undefined' || customElements.get(tag)) return;
  class KairoDiagramElement extends HTMLElement implements KairoDiagramHost {
    private view?: DiagramEditor;
    private current?: DiagramDocument;
    private loadVersion = 0;
    private loadController?: AbortController;
    private applyingLoad = false;
    private clearedByHost = false;
    private everConnected = false;
    private srcPending = false;
    private fitObserver?: ResizeObserver;
    static get observedAttributes(): string[] { return ['theme', 'readonly', 'src', 'auto-fit']; }
    /** The diagram document. Reading returns a live copy; writing replaces it. */
    get document(): DiagramDocument | undefined { return this.view ? this.view.getDocument() : this.current && parseDocument(this.current); }
    set document(value: DiagramDocument | undefined) {
      const next = value && parseDocument(value);
      this.cancelLoad();
      this.srcPending = false;
      this.current = next;
      this.clearedByHost = !next;
      if (!next) { this.fitObserver?.disconnect(); this.fitObserver = undefined; this.view?.destroy(); this.view = undefined; }
      else if (this.view) this.view.setDocument(next);
      else if (this.isConnected) this.mount();
    }
    /** The underlying editor instance, once mounted. */
    get editor(): DiagramEditor | undefined { return this.view; }
    /** Refetch the same src (for example after the host has updated the resource). A detached element does nothing. */
    async reload(): Promise<void> { if (this.isConnected) { this.clearedByHost = false; await this.loadSrc(); } }
    private theme(): typeof lightTheme { return this.getAttribute('theme') === 'dark' ? darkTheme : lightTheme; }
    private isReadOnly(): boolean { return this.hasAttribute('readonly'); }
    attributeChangedCallback(name: string): void {
      if (name === 'readonly') this.view?.setReadOnly(this.isReadOnly());
      else if (name === 'auto-fit') this.observeAutoFit();
      else if (name === 'src') {
        this.clearedByHost = false;
        if (this.isConnected || this.everConnected) this.srcPending = !!this.getAttribute('src');
        // During upgrade, connectedCallback will start the initial request once.
        if (this.isConnected && this.everConnected) void this.loadSrc();
      } else this.view?.setTheme(this.theme());
    }
    private observeAutoFit(): void {
      this.fitObserver?.disconnect();
      this.fitObserver = undefined;
      if (!this.isConnected || !this.view || !this.hasAttribute('auto-fit')) return;
      this.fitObserver = new ResizeObserver(() => { if (this.isConnected) this.view?.fit(); });
      this.fitObserver.observe(this);
    }
    private cancelLoad(): void { this.loadVersion++; this.loadController?.abort(); this.loadController = undefined; }
    /** Fetches a v2 document from `src`; only the latest connected request may replace the current document. */
    private async loadSrc(): Promise<void> {
      this.cancelLoad();
      const src = this.getAttribute('src');
      this.srcPending = !!src;
      if (!src) return;
      const version = this.loadVersion, controller = new AbortController();
      this.loadController = controller;
      try {
        const response = await fetch(src, { signal: controller.signal });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const doc = parseDocument(await response.text());
        if (version !== this.loadVersion || !this.isConnected) return;
        this.current = doc;
        this.applyingLoad = true;
        try { if (this.view) this.view.setDocument(doc); else this.mount(); }
        finally { this.applyingLoad = false; }
        if (version !== this.loadVersion || !this.isConnected) return;
        this.srcPending = false;
        this.dispatchEvent(new CustomEvent('documentload', { detail: { src, document: this.document }, bubbles: true }));
      } catch (error) {
        if (version === this.loadVersion && this.isConnected && !controller.signal.aborted) {
          this.srcPending = false;
          this.dispatchEvent(new CustomEvent('documenterror', { detail: { src, error: String(error) }, bubbles: true }));
        }
      } finally {
        if (this.loadController === controller) this.loadController = undefined;
      }
    }
    connectedCallback(): void {
      if (!this.isConnected) return;
      this.everConnected = true;
      if (this.clearedByHost) return;
      if (!this.current) {
        // Declarative no-JS usage: read an inline <script type="application/json"> document.
        const inline = this.querySelector('script[type="application/json"]');
        if (inline?.textContent && inline.textContent.trim()) { try { this.current = parseDocument(inline.textContent); inline.remove(); } catch { /* ignore an invalid inline document */ } }
      }
      if (!this.view && this.current) this.mount();
      if (this.getAttribute('src') && (!this.current || this.srcPending)) void this.loadSrc();
    }
    disconnectedCallback(): void { this.cancelLoad(); this.fitObserver?.disconnect(); this.fitObserver = undefined; if (this.view) this.current = this.view.getDocument(); this.view?.destroy(); this.view = undefined; }
    private mount(): void {
      if (!this.current) return;
      this.fitObserver?.disconnect(); this.fitObserver = undefined;
      this.view?.destroy();
      if (!this.style.display) this.style.display = 'block';
      this.view = createDiagram(this, {
        document: parseDocument(this.current),
        theme: this.theme(),
        onChange: doc => {
          this.current = parseDocument(doc);
          // A local edit (including an editor API call) supersedes an in-flight src refresh.
          if (!this.applyingLoad && this.loadController) this.cancelLoad();
          this.dispatchEvent(new CustomEvent('change', { detail: doc }));
        },
        onSelectionChange: sel => this.dispatchEvent(new CustomEvent('selectionchange', { detail: sel })),
      });
      if (this.isReadOnly()) this.view.setReadOnly(true);
      this.view.fit();
      this.observeAutoFit();
    }
  }
  customElements.define(tag, KairoDiagramElement);
}

import './style.css';
// The standalone IIFE exposes the full toolkit on window.Kairo (core + interop + layout + export + analysis
// + themes + templates + the web component), so the offline artifact can import, lay out, analyse and export.
export * from './index';
export * from './io';
export * from './layout';
export * from './export';
export * from './analysis';
export * from './themes';
export * from './templates';
export { defineKairoElement } from './element';
export * from './labels';
export * from './minimap';
export * from './recovery';

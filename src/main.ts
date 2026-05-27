// Figma plugin main-thread entry. ES2017 target (Figma's QuickJS sandbox rejects
// ES2020+ syntax — optional chaining, nullish coalescing, replaceAll). The UI HTML
// is injected at build time via Vite's `define.__html__`, which reads the finalized
// `dist/ui.html` produced by the UI build pass — see vite.config.ts.

figma.showUI(__html__, { width: 420, height: 520 });

figma.ui.onmessage = (_message: unknown) => {
  // Sprint 2 (WO-006 — IO subsystem) wires in the ops-protocol message handler.
  // Sprint 1 ships a scaffold-only UI; no plugin-side message handling yet.
};

/// <reference types="@figma/plugin-typings" />

/**
 * Build-time global injected by the main-thread Vite config (`define.__HTML_B64__`).
 * Base64 encoding of `dist/ui.html` — avoids literal `import(` in `code.js` (QuickJS).
 * Decoded in main via `decodeBase64Utf8` before `figma.showUI`.
 */
declare const __HTML_B64__: string;

/// <reference types="@figma/plugin-typings" />

/**
 * Build-time global injected by the main-thread Vite config (`define.__html__`).
 * Resolves to the JSON-stringified contents of `dist/ui.html` at build time.
 * Pass to `figma.showUI(__html__, …)` so the UI iframe loads our bundled HTML.
 * Reference: https://developers.figma.com/docs/plugins/api/global-objects#html
 */
declare const __html__: string;
